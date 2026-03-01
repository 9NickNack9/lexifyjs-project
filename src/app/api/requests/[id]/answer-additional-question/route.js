import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProvidersAdditionalQuestionAnswered } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const auto = (v) => {
  const n = norm(v);
  return n.startsWith("all") || n.startsWith("any");
};

export async function POST(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Both question and answer are required" },
        { status: 400 },
      );
    }

    const userPkId = BigInt(String(session.userId));

    // Load current user (for authorization + companyId)
    const me = await prisma.userAccount.findUnique({
      where: { userPkId },
      select: { userPkId: true, role: true, companyId: true },
    });

    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load request
    const requestRecord = await prisma.request.findUnique({
      where: { requestId: BigInt(String(id)) },
      select: {
        requestId: true,
        clientCompanyId: true,
        clientUserId: true,
        details: true,

        requestCategory: true,
        requestSubcategory: true,
        assignmentType: true,

        serviceProviderType: true,
        providerSize: true,
        providerCompanyAge: true,
        providerMinimumRating: true,
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // ---- Authorization (new system) ----
    const sameCompany =
      requestRecord.clientCompanyId != null &&
      String(requestRecord.clientCompanyId) === String(me.companyId);

    const isClientUser =
      requestRecord.clientUserId != null &&
      String(requestRecord.clientUserId) === String(me.userPkId);

    const allowedByRole =
      me.role === "ADMIN" || (me.role === "PURCHASER" && sameCompany);

    if (!isClientUser && !allowedByRole) {
      return NextResponse.json(
        { error: "Not allowed to answer questions for this request" },
        { status: 403 },
      );
    }

    // ---- Update details.additionalQuestions ----
    const currentDetails = requestRecord.details || {};
    let additionalQuestions = currentDetails.additionalQuestions;

    if (
      !additionalQuestions ||
      typeof additionalQuestions !== "object" ||
      Array.isArray(additionalQuestions)
    ) {
      additionalQuestions = {};
    }

    additionalQuestions[question] = answer;

    await prisma.request.update({
      where: { requestId: BigInt(String(id)) },
      data: {
        details: {
          ...currentDetails,
          additionalQuestions,
        },
      },
    });

    // --------- EMAIL NOTIFICATION TO PROVIDERS (new system) ---------
    try {
      const reqAge = requestRecord.providerCompanyAge ?? null;
      const reqSize = requestRecord.providerSize ?? null;
      const reqType = requestRecord.serviceProviderType ?? null;
      const reqRating = requestRecord.providerMinimumRating ?? null;

      // Provider users (email recipients) + their company gates + company all-notifications members
      const providerUsers = await prisma.userAccount.findMany({
        where: {
          role: "PROVIDER",
          OR: [
            {
              notificationPreferences: {
                array_contains: ["additional-question-answered"],
              },
            },
            {
              notificationPreferences: {
                array_contains: ["new-available-request"],
              },
            },
          ],
        },
        select: {
          email: true,
          company: {
            select: {
              companyAge: true,
              companyProfessionals: true,
              providerType: true,
              providerTotalRating: true,
              members: {
                where: {
                  notificationPreferences: {
                    array_contains: ["all-notifications"],
                  },
                },
                select: { email: true },
              },
            },
          },
        },
      });

      for (const u of providerUsers) {
        const co = u.company;
        if (!co) continue;

        // Apply the same 4 gates (company-level)
        let ok = true;

        // Company age
        if (!auto(reqAge)) {
          const numReqAge = Number(reqAge);
          const numAge = Number(co.companyAge);
          if (
            !Number.isFinite(numReqAge) ||
            !Number.isFinite(numAge) ||
            numAge < numReqAge
          ) {
            ok = false;
          }
        }

        // Company professionals
        if (!auto(reqSize)) {
          const numReqSize = Number(reqSize);
          const numSize = Number(co.companyProfessionals);
          if (
            !Number.isFinite(numReqSize) ||
            !Number.isFinite(numSize) ||
            numSize < numReqSize
          ) {
            ok = false;
          }
        }

        // Provider type
        if (!auto(reqType)) {
          if (norm(co.providerType) !== norm(reqType)) ok = false;
        }

        // Minimum rating (overall company rating)
        if (!auto(reqRating)) {
          const numReqRating = Number(reqRating);
          const numRating = Number(co.providerTotalRating);
          if (
            !Number.isFinite(numReqRating) ||
            !Number.isFinite(numRating) ||
            numRating < numReqRating
          ) {
            ok = false;
          }
        }

        if (!ok) continue;

        // Recipients: provider user + company members with all-notifications
        const recipientsSet = new Set();

        const primaryEmail = (u?.email || "").trim();
        if (isEmail(primaryEmail)) recipientsSet.add(primaryEmail);

        for (const m of co.members ?? []) {
          const em = (m?.email || "").trim();
          if (isEmail(em)) recipientsSet.add(em);
        }

        let sentAtLeastOne = false;

        for (const email of recipientsSet) {
          try {
            await notifyProvidersAdditionalQuestionAnswered({
              to: [email],
              requestCategory: requestRecord.requestCategory,
              requestSubcategory: requestRecord.requestSubcategory,
              assignmentType: requestRecord.assignmentType,
            });
            sentAtLeastOne = true;
          } catch (e) {
            console.error(
              "Provider additional-question-answered email failed for",
              email,
              e,
            );
          }
        }

        // Always send exactly ONE support email (independent of provider count)
        try {
          await notifyProvidersAdditionalQuestionAnswered({
            to: "support@lexify.online",
            requestCategory: requestRecord.requestCategory,
            requestSubcategory: requestRecord.requestSubcategory,
            assignmentType: requestRecord.assignmentType,
          });
        } catch (e) {
          console.error(
            "Support provider additional-question-answered failed:",
            e,
          );
        }
      }
    } catch (emailErr) {
      console.error(
        "Failed to send provider additional-question-answered email:",
        emailErr,
      );
    }
    // ---------------------------------------------------------------

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "POST /api/requests/[id]/answer-additional-question failed:",
      e,
    );
    return NextResponse.json(
      { error: "Server error while saving answer" },
      { status: 500 },
    );
  }
}
