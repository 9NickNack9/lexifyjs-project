import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const safeJson = (data, status = 200) =>
  new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) return safeJson({ error: "Unauthorized" }, 401);

  const userPkId = BigInt(session.userId);

  let body = {};
  try {
    body = await req.json();
  } catch {
    return safeJson({ error: "Invalid JSON body" }, 400);
  }

  const firstName = (body.firstName ?? "").toString().trim();
  const lastName = (body.lastName ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim();
  const telephone = (body.telephone ?? "").toString().trim();

  // Basic validation (keep it minimal; adjust if you want stricter rules)
  if (!firstName || !lastName || !email) {
    return safeJson(
      { error: "firstName, lastName and email are required." },
      400,
    );
  }

  const updated = await prisma.userAccount.update({
    where: { userPkId },
    data: { firstName, lastName, email, telephone },
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
      email: true,
      telephone: true,
    },
  });

  return safeJson({ userAccount: updated }, 200);
}
