// src/app/api/requests/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const RequestPatch = z.object({
  requestState: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  maximumPrice: z.union([z.string(), z.number()]).nullable().optional(),
  offersDeadline: z.coerce.date().optional(),
  // These two come in as arrays sometimes; we’ll join them to strings below
  scopeOfWork: z.array(z.any()).optional(),
  language: z.array(z.string()).optional(),
  // leave other optional fields here if you add them later
});

function toDecimalString(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[^\d.]/g, "");
  return s === "" ? null : s;
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

// GET /api/requests/:id  -> only owner can read
export async function GET(_, { params }) {
  const session = await requireSession();
  const id = BigInt(params.id);

  const row = await prisma.request.findFirst({
    where: { requestId: id, clientId: BigInt(session.userId) },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PATCH /api/requests/:id  -> only owner can patch
export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();
    const id = BigInt(params.id);

    // Ensure the request belongs to the user
    const existing = await prisma.request.findFirst({
      where: { requestId: id, clientId: BigInt(session.userId) },
      select: { requestId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = RequestPatch.parse(body);

    // Normalize fields that don’t match the DB scalar types directly
    const data = {
      ...parsed,
      // Decimal handling
      maximumPrice:
        parsed.maximumPrice === undefined
          ? undefined
          : toDecimalString(parsed.maximumPrice),
      // Arrays → comma-separated strings (fits your Request.language / scopeOfWork as String)
      language:
        parsed.language === undefined
          ? undefined
          : (parsed.language || []).join(", "),
      scopeOfWork:
        parsed.scopeOfWork === undefined
          ? undefined
          : Array.isArray(parsed.scopeOfWork)
          ? parsed.scopeOfWork.join(", ")
          : String(parsed.scopeOfWork ?? ""),
    };

    const updated = await prisma.request.update({
      where: { requestId: id },
      data,
    });

    return NextResponse.json({ ok: true, requestId: updated.requestId });
  } catch (err) {
    // If we threw a NextResponse in requireSession, return it
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: "Invalid payload or not found" },
      { status: 400 }
    );
  }
}

// DELETE /api/requests/:id  -> only owner, and only if NOT expired
export async function DELETE(_, { params }) {
  const session = await requireSession();
  const id = BigInt(params.id);

  // Check ownership + expiry
  const row = await prisma.request.findFirst({
    where: { requestId: id, clientId: BigInt(session.userId) },
    select: { dateExpired: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  if (now >= row.dateExpired) {
    return NextResponse.json(
      { error: "Cannot cancel after deadline" },
      { status: 400 }
    );
  }

  await prisma.request.delete({ where: { requestId: id } });
  return NextResponse.json({ ok: true });
}
