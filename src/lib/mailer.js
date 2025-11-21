import sg from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "support@lexify.online";
/**
 * Send a contract email with optional PDF (Buffer) attachment.
 *
 * - attachments: existing SendGrid-style attachments (base64 string content)
 * - pdfBuffer: Node Buffer (e.g. from React-PDF's pdf(...).toBuffer())
 * - pdfFilename: name of the attached PDF, default "LEXIFY-Contract.pdf"
 */
export async function sendContractEmail({
  to,
  cc = [],
  bcc = [],
  subject,
  html,
  attachments = [],
}) {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("SENDGRID_API_KEY or EMAIL_FROM missing");
  }

  await sg.send({
    to,
    cc,
    bcc,
    from: process.env.EMAIL_FROM,
    subject,
    html,
    attachments, // [{ filename, content(base64), type?, disposition? }]
  });
}

/**
 * Generic dynamic-template sender
 */
export async function sendDynamicTemplateEmail({
  to,
  templateId,
  dynamicTemplateData = {},
  cc = [],
  bcc = [],
  attachments = [],
}) {
  if (!process.env.SENDGRID_API_KEY || !FROM_EMAIL) {
    throw new Error("SENDGRID_API_KEY or EMAIL_FROM missing");
  }
  if (!templateId) {
    throw new Error("Missing templateId for dynamic template email");
  }

  await sg.send({
    to,
    cc,
    bcc,
    from: FROM_EMAIL,
    templateId,
    dynamic_template_data: dynamicTemplateData,
    attachments, // [{ filename, content(base64), type?, disposition? }]
  });
}

/**
 * Convenience helper for “New Registration” notification to Support
 * Expects env var: SENDGRID_TEMPLATE_NEW_REGISTRATION (dynamic template ID)
 */
export async function notifySupportNewRegistration({ role, companyName }) {
  const templateId = "d-2f4f2e996bdc44059aabd7f7d1e1cdb7";
  await sendDynamicTemplateEmail({
    to: "support@lexify.online",
    templateId,
    dynamicTemplateData: { role, companyName },
  });
}

/** Provider "New Available Request" convenience helper */
export async function notifyProvidersNewAvailableRequest({
  to,
  requestCategory,
}) {
  const templateId =
    process.env.SENDGRID_TEMPLATE_NEW_AVAILABLE_REQUEST ||
    "d-17a045e0c243403eb84ac7a0d0136674";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

  // Normalize: allow string or array, validate & dedupe
  const list = Array.isArray(to)
    ? Array.from(new Set(to.filter(isEmail).map((e) => e.trim())))
    : isEmail(to)
    ? [to.trim()]
    : [];

  // If nobody valid, still notify Support so the event is tracked
  if (list.length === 0) {
    await sendDynamicTemplateEmail({
      to: "support@lexify.online",
      templateId,
      dynamicTemplateData: { requestCategory },
    });
    return;
  }

  // Send ONE email per recipient (parallel, tolerate partial failures)
  const sends = list.map((email) =>
    sendDynamicTemplateEmail({
      to: email,
      templateId,
      dynamicTemplateData: { requestCategory },
    })
  );
  await Promise.allSettled(sends);
}

/** Providers — Request Cancelled convenience helper */
export async function notifyProvidersRequestCancelled({ to }) {
  const templateId = "d-11ffd9181c6f498c90b05adb65701ef2";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
  const list = Array.isArray(to)
    ? Array.from(new Set(to.filter(isEmail)))
    : isEmail(to)
    ? [to]
    : [];

  if (list.length === 0) {
    await sendDynamicTemplateEmail({
      to: "support@lexify.online",
      templateId,
      dynamicTemplateData: {},
    });
    return;
  }

  const [primary, ...cc] = list;
  await sendDynamicTemplateEmail({
    to: primary, // personal to primary
    cc, // CC other allNotification contacts
    templateId,
    dynamicTemplateData: {},
  });
}

// Send a dynamic-template email to the purchaser when a PENDING request expires with no offers
export async function notifyPurchaserPendingExpiredNoOffers({
  to,
  requestTitle,
}) {
  if (!to) return; // allow string or array, skip if falsy

  const templateId =
    process.env.SENDGRID_TEMPLATE_PENDING_NO_OFFERS ||
    "d-35f91a31f99849e1a113949b80c02f54";

  await sendDynamicTemplateEmail({
    to,
    templateId,
    dynamicTemplateData: { requestTitle }, // only field you asked to pass
  });
}

// Purchaser: PENDING expired, manual selection, offers received and some/all under max
export async function notifyPurchaserManualUnderMaxExpired({
  to,
  requestTitle,
}) {
  if (!to) return; // single recipient email

  const templateId = "d-e36e6f28a80f4a4e8c610e5b108ff2ab";

  await sendDynamicTemplateEmail({
    to, // send directly to purchaser contact (no bcc needed)
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}

export async function notifyPurchaserManualAllOverMaxExpired({
  to,
  requestTitle,
}) {
  if (!to) return;

  const templateId = "d-60588bdd772546518a859a7be3e09e39"; // or hardcode here

  await sendDynamicTemplateEmail({
    to, // send directly to purchaser contact
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}

// Purchaser notification: contract formed (auto award or awaiting select)
export async function notifyPurchaserContractFormed({ to, requestTitle }) {
  if (!to) return;
  const templateId = "d-23a819a8412e4befb43c82f22723b511";
  await sendDynamicTemplateEmail({
    to, // send directly to purchaser
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}

// Winning offer lawyer notification: contract formed
export async function notifyWinningLawyerContractFormed({ to, offerTitle }) {
  if (!to) return;
  const templateId = "d-eec22e806a934bc09103dd78bebe6951";
  await sendDynamicTemplateEmail({
    to, // send directly to the winning lawyer
    templateId,
    dynamicTemplateData: { offerTitle },
  });
}

// Losing offer lawyer notification: not selected
export async function notifyLosingLawyerNotSelected({ to, offerTitle }) {
  if (!to) return;
  const templateId = "d-a30540263fe74939a68121a7e9ed25ad";
  await sendDynamicTemplateEmail({
    to, // send directly to each losing lawyer
    templateId,
    dynamicTemplateData: { offerTitle },
  });
}

export async function notifyUserPasswordReset({ to, resetUrl }) {
  const templateId = "d-bf8354e1ef3545bd90c1bda5bc99d5f5";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const email =
    typeof to === "string" && EMAIL_RE.test(to.trim()) ? to.trim() : null;

  // Fail-safe: if no valid recipient, notify support
  const recipients = email ? [email] : ["support@lexify.online"];

  await Promise.allSettled(
    recipients.map((addr) =>
      sendDynamicTemplateEmail({
        to: addr,
        templateId,
        // Your template should include a button/link placeholder for resetUrl
        dynamicTemplateData: { resetUrl },
      })
    )
  );
}

// Losing offer lawyer notification: conflict check started for their offer
export async function notifyProviderConflictCheck({
  to,
  offerTitle,
  bcc = ["support@lexify.online"],
}) {
  if (!to) return;
  const templateId = "d-9a1376d8463645fe92b1850880a20753";
  await sendDynamicTemplateEmail({
    to, // string or array
    bcc, // ensure Support is copied
    templateId,
    dynamicTemplateData: { offerTitle },
  });
}

// Purchaser notification: provider submitted an additional question
export async function notifyPurchaserAdditionalQuestion({
  to,
  requestTitle,
  bcc = ["support@lexify.online"],
}) {
  if (!to) return;

  const templateId = "d-8afdcbe0206843e3a44d90a2643832ae";

  await sendDynamicTemplateEmail({
    to, // can be string or array
    bcc,
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}

// Providers — purchaser has answered additional question
export async function notifyProvidersAdditionalQuestionAnswered({
  to,
  requestCategory,
  requestSubcategory,
  assignmentType,
}) {
  // Use an env var so you can configure this in production
  const templateId = "d-c600106dbe9949e7a32dca2ac4be461d";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

  // Normalize + dedupe
  const list = Array.isArray(to)
    ? Array.from(new Set(to.filter(isEmail).map((e) => e.trim())))
    : isEmail(to)
    ? [to.trim()]
    : [];

  // If nobody valid, still send to Support so the event is tracked
  if (list.length === 0) {
    await sendDynamicTemplateEmail({
      to: "support@lexify.online",
      templateId,
      dynamicTemplateData: {
        requestCategory: requestCategory || null,
        requestSubcategory: requestSubcategory ?? null,
        assignmentType: assignmentType ?? null,
      },
    });
    return;
  }

  // Single email, TO = support, providers in BCC
  await sendDynamicTemplateEmail({
    to: "support@lexify.online",
    bcc: list,
    templateId,
    dynamicTemplateData: {
      requestCategory: requestCategory || null,
      requestSubcategory: requestSubcategory ?? null,
      assignmentType: assignmentType ?? null,
    },
  });
}

// Purchaser: conflict check DENIED but other offers remain
export async function notifyPurchaserConflictDeniedWithRemainingOffers({
  to,
  requestTitle,
  bcc = ["support@lexify.online"],
}) {
  if (!to) return;

  const templateId = "d-7808af811b3a49cebbfb63d2445e2b52";

  await sendDynamicTemplateEmail({
    to, // string or array
    bcc, // ensure Support is copied
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}

// Purchaser: conflict check DENIED and NO other offers left
export async function notifyPurchaserConflictDeniedNoOffers({
  to,
  requestTitle,
  bcc = ["support@lexify.online"],
}) {
  if (!to) return;

  const templateId = "d-c8d842efc66340068206587a3749fe78";

  await sendDynamicTemplateEmail({
    to,
    bcc,
    templateId,
    dynamicTemplateData: { requestTitle },
  });
}
