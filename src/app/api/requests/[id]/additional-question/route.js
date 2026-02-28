// src/app/api/requests/[id]/additional-question/route.js
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
    if (!id)
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 },
      );

    const body = await req.json().catch(() => null);
    const questionRaw = body?.question;
    const question = typeof questionRaw === "string" ? questionRaw.trim() : "";
    if (!question)
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 },
      );

    const existing = await prisma.request.findUnique({
      where: { requestId: BigInt(String(id)) },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        details: true,
        clientCompanyId: true, // NEW
        // legacy fallback (if still present)
        clientId: true,
      },
    });

    if (!existing)
      return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Update details.additionalQuestions
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

    // Email purchaser contacts (best-effort; do not fail API)
    try {
      // Prefer new system
      if (existing.clientCompanyId) {
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

        // Primary contact by name match
        if (primaryName) {
          for (const m of members) {
            const mName = norm(fullName(m));
            const em = (m?.email || "").trim();
            if (mName && mName === primaryName && isEmail(em))
              recipientsSet.add(em);
          }
        }

        // Also notify anyone opted into purchaser additional-question notifications
        for (const m of members) {
          const em = (m?.email || "").trim();
          if (!isEmail(em)) continue;
          const prefs = toStringArray(m?.notificationPreferences);
          if (prefs.includes("additional-question")) recipientsSet.add(em);
        }

        const recipients = Array.from(recipientsSet);
        if (recipients.length) {
          await notifyPurchaserAdditionalQuestion({
            to: recipients,
            requestTitle:
              existing.title ||
              existing.details?.requestTitle ||
              "LEXIFY Request",
          });
        }
      } else if (existing.clientId) {
        // Legacy fallback (kept so mixed data continues working)
        const client = await prisma.appUser.findUnique({
          where: { userId: existing.clientId },
          select: { companyContactPersons: true },
        });

        const contacts = Array.isArray(client?.companyContactPersons)
          ? client.companyContactPersons
          : [];

        const primaryName = norm(
          existing.primaryContactPerson ||
            existing.details?.primaryContactPerson ||
            "",
        );

        const recipientsSet = new Set();
        for (const person of contacts) {
          const personName = norm(
            [person?.firstName, person?.lastName].filter(Boolean).join(" "),
          );
          const email = (person?.email || "").trim();
          if (!isEmail(email)) continue;

          if (primaryName && personName === primaryName)
            recipientsSet.add(email);
          if (person?.allNotifications === true) recipientsSet.add(email);
        }

        const recipients = Array.from(recipientsSet);
        if (recipients.length) {
          await notifyPurchaserAdditionalQuestion({
            to: recipients,
            requestTitle:
              existing.title ||
              existing.details?.requestTitle ||
              "LEXIFY Request",
          });
        }
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
