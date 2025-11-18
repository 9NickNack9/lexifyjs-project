import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyPurchaserAdditionalQuestion } from "@/lib/mailer";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params || {};
    if (!id) {
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const questionRaw = body?.question;
    const question = typeof questionRaw === "string" ? questionRaw.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Load existing request with metadata we need for email
    const existing = await prisma.request.findUnique({
      where: { requestId: BigInt(id) },
      select: {
        requestId: true,
        title: true,
        clientId: true,
        primaryContactPerson: true,
        details: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const currentDetails = existing.details || {};
    let additionalQuestions = currentDetails.additionalQuestions;

    if (
      !additionalQuestions ||
      typeof additionalQuestions !== "object" ||
      Array.isArray(additionalQuestions)
    ) {
      additionalQuestions = {};
    }

    // Add question if not already present
    if (!Object.prototype.hasOwnProperty.call(additionalQuestions, question)) {
      additionalQuestions[question] = "";
    }

    const newDetails = {
      ...currentDetails,
      additionalQuestions,
    };

    await prisma.request.update({
      where: { requestId: BigInt(id) },
      data: { details: newDetails },
    });

    // ----------------- Send notification email to purchaser -----------------
    try {
      if (existing.clientId) {
        const client = await prisma.appUser.findUnique({
          where: { userId: existing.clientId },
          select: { companyContactPersons: true },
        });

        const contacts = Array.isArray(client?.companyContactPersons)
          ? client.companyContactPersons
          : [];

        if (contacts.length > 0) {
          const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const normalizeName = (s) =>
            (s || "").toString().trim().replace(/\s+/g, " ").toLowerCase();

          const primaryName = normalizeName(
            existing.primaryContactPerson ||
              existing.details?.primaryContactPerson ||
              ""
          );

          const recipientsSet = new Set();

          for (const person of contacts) {
            const fullName = normalizeName(
              [person?.firstName, person?.lastName].filter(Boolean).join(" ")
            );
            const email = (person?.email || "").trim();

            if (!EMAIL_RE.test(email)) continue;

            // Primary contact person's email, matched by name
            if (primaryName && fullName && fullName === primaryName) {
              recipientsSet.add(email);
            }

            // All contacts with allNotifications = true
            if (person?.allNotifications === true) {
              recipientsSet.add(email);
            }
          }

          const recipients = Array.from(recipientsSet);

          if (recipients.length > 0) {
            await notifyPurchaserAdditionalQuestion({
              to: recipients,
              requestTitle:
                existing.title ||
                existing.details?.requestTitle ||
                "LEXIFY Request",
            });
          }
        }
      }
    } catch (mailErr) {
      // Don't fail the API just because email sending failed
      console.error(
        "Failed to send additional question notification email:",
        mailErr
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/requests/[id]/additional-question failed:", e);
    return NextResponse.json(
      { error: "Server error while saving additional question" },
      { status: 500 }
    );
  }
}
