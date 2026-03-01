import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyPurchaserAdditionalQuestion } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
const norm = (s) =>
  (s || "").toString().trim().replace(/\s+/g, " ").toLowerCase();
const fullName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

// normalize Json / legacy {set:[]} / string → string[]
function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (val && typeof val === "object") {
    if (Array.isArray(val.set))
      return val.set.filter((v) => typeof v === "string");
    if (Array.isArray(val.value))
      return val.value.filter((v) => typeof v === "string");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed))
        return parsed.filter((v) => typeof v === "string");
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

export async function POST(req, ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = (await ctx.params) || {};
    if (!id) {
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const questionRaw = body?.question;
    const question = typeof questionRaw === "string" ? questionRaw.trim() : "";
    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.request.findUnique({
      where: { requestId: BigInt(String(id)) },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        details: true,
        clientCompanyId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (!existing.clientCompanyId) {
      return NextResponse.json(
        { error: "Request has no clientCompanyId" },
        { status: 400 },
      );
    }

    // Update details.additionalQuestions (idempotent add)
    const currentDetails = existing.details || {};
    let additionalQuestions = currentDetails.additionalQuestions;

    if (
      !additionalQuestions ||
      typeof additionalQuestions !== "object" ||
      Array.isArray(additionalQuestions)
    ) {
      additionalQuestions = {};
    }
    if (!Object.prototype.hasOwnProperty.call(additionalQuestions, question)) {
      additionalQuestions[question] = "";
    }

    await prisma.request.update({
      where: { requestId: BigInt(String(id)) },
      data: {
        details: {
          ...currentDetails,
          additionalQuestions,
        },
      },
    });

    // Email purchaser contacts
    try {
      const company = await prisma.company.findUnique({
        where: { companyPkId: existing.clientCompanyId },
        select: {
          members: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              notificationPreferences: true,
            },
          },
        },
      });

      const members = Array.isArray(company?.members) ? company.members : [];
      const primaryName = norm(
        existing.primaryContactPerson ||
          existing.details?.primaryContactPerson ||
          "",
      );

      const recipientsSet = new Set();

      // 1) Primary contact by name match
      if (primaryName) {
        for (const m of members) {
          const em = (m?.email || "").trim();
          if (!isEmail(em)) continue;
          const mName = norm(fullName(m));
          if (mName && mName === primaryName) recipientsSet.add(em);
        }
      }

      // 2) Anyone opted into purchaser additional-question notifications
      // 3) anyone with all-notifications
      for (const m of members) {
        const em = (m?.email || "").trim();
        if (!isEmail(em)) continue;
        const prefs = toStringArray(m?.notificationPreferences);

        if (prefs.includes("additional-question")) recipientsSet.add(em);
        if (prefs.includes("all-notifications")) recipientsSet.add(em);
      }

      const recipients = Array.from(recipientsSet);

      // Send real recipients WITHOUT support BCC
      for (const email of recipients) {
        try {
          await notifyPurchaserAdditionalQuestion({
            to: [email],
            requestTitle:
              existing.title ||
              existing.details?.requestTitle ||
              "LEXIFY Request",
            bcc: [], // override default support BCC
          });
        } catch (e) {
          console.error(
            "Purchaser additional-question email failed for",
            email,
            e,
          );
        }
      }

      // Send ONE support email
      try {
        await notifyPurchaserAdditionalQuestion({
          to: "support@lexify.online",
          requestTitle:
            existing.title ||
            existing.details?.requestTitle ||
            "LEXIFY Request",
          bcc: [], // prevent recursive support BCC
        });
      } catch (e) {
        console.error("Support additional-question notification failed:", e);
      }
    } catch (mailErr) {
      console.error(
        "Failed to send purchaser additional-question email:",
        mailErr,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/requests/[id]/additional-question failed:", e);
    return NextResponse.json(
      { error: "Server error while saving additional question" },
      { status: 500 },
    );
  }
}
