import sg from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "support@lexify.online";

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
  const templateId = "d-17a045e0c243403eb84ac7a0d0136674";

  // normalize arrays and dedupe
  const bcc = Array.isArray(to) ? Array.from(new Set(to)) : [];
  if (bcc.length === 0) {
    // still notify support even if nobody to bcc
    await sendDynamicTemplateEmail({
      to: "support@lexify.online",
      templateId,
      dynamicTemplateData: { requestCategory },
    });
    return;
  }

  await sendDynamicTemplateEmail({
    to: "support@lexify.online", // <-- visible recipient
    bcc, // <-- everyone else hidden
    templateId,
    dynamicTemplateData: { requestCategory },
  });
}

/** Providers — Request Cancelled convenience helper */
export async function notifyProvidersRequestCancelled({ to }) {
  const templateId = "d-11ffd9181c6f498c90b05adb65701ef2";

  const bcc = Array.isArray(to) ? Array.from(new Set(to)) : [];
  if (bcc.length === 0) {
    await sendDynamicTemplateEmail({
      to: "support@lexify.online",
      templateId,
      dynamicTemplateData: {},
    });
    return;
  }

  await sendDynamicTemplateEmail({
    to: "support@lexify.online", // <-- visible recipient
    bcc, // <-- hidden recipients
    templateId,
    dynamicTemplateData: {}, // no values needed
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
