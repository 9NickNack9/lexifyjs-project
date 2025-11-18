import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProvidersAdditionalQuestionAnswered } from "@/lib/mailer";

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
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const questionRaw = body?.question;
    const answerRaw = body?.answer;

    const question = typeof questionRaw === "string" ? questionRaw.trim() : "";
    const answer = typeof answerRaw === "string" ? answerRaw.trim() : "";

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Both question and answer are required" },
        { status: 400 }
      );
    }

    const requestRecord = await prisma.request.findUnique({
      where: { requestId: BigInt(id) },
      select: {
        clientId: true,
        details: true,
        requestCategory: true,
        requestSubcategory: true,
        assignmentType: true,
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only the client (purchaser) can answer
    if (String(requestRecord.clientId) !== String(session.userId)) {
      return NextResponse.json(
        { error: "Not allowed to answer questions for this request" },
        { status: 403 }
      );
    }

    const currentDetails = requestRecord.details || {};
    let additionalQuestions = currentDetails.additionalQuestions;

    if (
      !additionalQuestions ||
      typeof additionalQuestions !== "object" ||
      Array.isArray(additionalQuestions)
    ) {
      additionalQuestions = {};
    }

    // Set / overwrite answer for this question
    additionalQuestions[question] = answer;

    const newDetails = {
      ...currentDetails,
      additionalQuestions,
    };

    await prisma.request.update({
      where: { requestId: BigInt(id) },
      data: { details: newDetails },
    });

    // --------- EMAIL NOTIFICATION TO ALL PROVIDERS ---------
    try {
      // Get all PROVIDER appUsers (adjust "role" value if your enum differs)
      const providers = await prisma.appUser.findMany({
        where: { role: "PROVIDER" },
        select: {
          companyContactPersons: true,
        },
      });

      const emails = [];

      for (const p of providers) {
        const contacts = Array.isArray(p.companyContactPersons)
          ? p.companyContactPersons
          : [];
        for (const c of contacts) {
          if (c?.email) {
            emails.push(c.email);
          }
        }
      }

      await notifyProvidersAdditionalQuestionAnswered({
        to: emails, // will be used as BCC
        requestCategory: requestRecord.requestCategory,
        requestSubcategory: requestRecord.requestSubcategory,
        assignmentType: requestRecord.assignmentType,
      });
    } catch (emailErr) {
      // Don't block the API if email sending fails; just log it.
      console.error(
        "Failed to send provider additional-question-answered email:",
        emailErr
      );
    }
    // -------------------------------------------------------

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "POST /api/requests/[id]/answer-additional-question failed:",
      e
    );
    return NextResponse.json(
      { error: "Server error while saving answer" },
      { status: 500 }
    );
  }
}
