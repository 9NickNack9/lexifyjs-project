"use client";

function displayValue(value, fallback) {
  const trimmed = (value ?? "").toString().trim();
  return trimmed || fallback;
}

export default function InviteEmailPreviewModal({
  open,
  onClose,
  firmName,
  personalMessage,
  inviterCompanyName,
  inviterFirstName,
  inviterLastName,
  inviterCompanyRole,
}) {
  if (!open) return null;

  const firmDisplayName = displayValue(firmName, "[Firm name]");
  const companyDisplayName = displayValue(inviterCompanyName, "[Your company]");
  const firstName = displayValue(inviterFirstName, "[First name]");
  const lastName = displayValue(inviterLastName, "[Last name]");
  const role = (inviterCompanyRole ?? "").toString().trim();
  const message = (personalMessage ?? "").toString().trim();
  const hasPersonalMessage = Boolean(message);

  const inviterIntro = role
    ? `${firstName} ${lastName}, ${role} at ${companyDisplayName}`
    : `${firstName} ${lastName} at ${companyDisplayName}`;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Invite email preview"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-[#e8eaed] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-black">Preview Invite</h2>
            <p className="text-sm text-black/60 mt-1">
              Preview of the email your contact person(s) will receive.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm bg-black/5 hover:bg-black/10 transition cursor-pointer text-black"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="invite-email-preview">
            <div className="email-container">
              <div className="header">
                <div className="wordmark flex justify-center bg-[#11999e] pb-4">
                  <img
                    src="https://lexify.online/lexify_wide.png"
                    alt="LEXIFY"
                    width={300}
                    style={{ display: "block", marginTop: 12, border: 0 }}
                  />
                </div>
                <div className="invite-eyebrow">AN INVITATION ON BEHALF OF</div>
                <div className="invite-company">{companyDisplayName}</div>
              </div>

              <p className="salutation">Dear {firmDisplayName} team,</p>

              <p>
                {inviterIntro}, has invited {firmDisplayName} to join LEXIFY —
                the platform {companyDisplayName} uses to source legal services
                from premium law firms.
              </p>

              {hasPersonalMessage ? (
                <div className="custom-message">
                  {message}
                  <span className="attribution">
                    - {firstName} {lastName}
                  </span>
                </div>
              ) : null}

              <h2>About LEXIFY</h2>
              <p>
                LEXIFY is a legal services marketplace used by mid- and
                large-cap Finnish companies to source legal work through a
                structured, transparent process. Companies post RFPs describing
                their legal needs; law firms review and submit offers; the
                company selects the firm best suited to the matter.
              </p>

              <h2>An invitation benefit for {firmDisplayName}</h2>
              <p>
                As {firmDisplayName} has been invited to join LEXIFY by a LEXIFY
                member company, your firm is eligible for a fee-free start on
                the platform. The standard LEXIFY monthly service fee of 7.5%
                (applicable only when you win work on the platform) will not be
                charged on your firm's first won assignment on LEXIFY, nor on
                any further assignment won within three months of that first
                win. This applies for the full duration of each such assignment,
                including where the assignment continues beyond the three-month
                period.
              </p>
              <p>
                There are no subscriptions or commitments, and your firm is free
                to leave LEXIFY at any time.
              </p>

              <h2>What this invitation means for {firmDisplayName}</h2>
              <p>
                By accepting this invitation, your firm gains access to RFPs
                posted from time to time by {companyDisplayName} and other
                LEXIFY member companies on the platform, across your areas of
                practice. You can review open RFPs at any time and submit an
                offer to any that interest you. There is no obligation to
                respond to any RFP — you remain entirely free to choose which
                opportunities suit your firm, and when.
              </p>

              <h2>
                Click below to accept the invitation from {companyDisplayName}
              </h2>
              <div className="cta-wrapper">
                <span className="cta-button">Accept Invitation</span>
              </div>
              <p className="cta-helper">
                This link is unique to your invitation and will take you to a
                registration page to set up your firm's profile on LEXIFY.
                Joining LEXIFY is subject to clearance of our standard vetting
                process.
              </p>

              <p className="secondary-cta pt-4">
                If you have any questions about the terms or how the platform
                works before accepting, simply reply to this email.
              </p>

              <div className="signature">
                <div className="regards">Kind regards,</div>
                <div className="signature-name">Kimmo Kantele</div>
                <div className="signature-role">CEO, Co-founder</div>
                <div className="signature-company">LEXIFY</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .invite-email-preview {
          font-family: "Outfit", "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .invite-email-preview .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #e8f5f5;
          padding: 40px 48px 36px;
          border-radius: 6px;
          border: 1px solid #d4d6da;
        }

        .invite-email-preview .header {
          text-align: center;
          padding-bottom: 28px;
          border-bottom: 1px solid #11999e;
          margin-bottom: 32px;
        }

        .invite-email-preview .wordmark {
          font-size: 52px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #11999e;
          margin-bottom: 28px;
        }

        .invite-email-preview .invite-eyebrow {
          font-size: 16px;
          color: #666666;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .invite-email-preview .invite-company {
          font-size: 26px;
          color: #1a1a1a;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .invite-email-preview .salutation {
          font-size: 15px;
          color: #1a1a1a;
          margin: 0 0 16px;
        }

        .invite-email-preview p {
          font-size: 15px;
          line-height: 1.55;
          color: #333333;
          margin: 0 0 16px;
        }

        .invite-email-preview h2 {
          font-family: "Outfit", "Helvetica Neue", Arial, sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 28px 0 10px;
          letter-spacing: -0.01em;
        }

        .invite-email-preview .custom-message {
          background-color: #ffffff;
          border-left: 4px solid #11999e;
          padding: 16px 18px;
          margin: 20px 0 24px;
          font-style: italic;
          color: #333333;
          font-size: 15px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .invite-email-preview .custom-message .attribution {
          display: block;
          margin-top: 12px;
          font-style: normal;
          font-size: 13px;
          color: #666666;
          text-align: right;
        }

        .invite-email-preview .cta-wrapper {
          margin: 20px 0 10px;
        }

        .invite-email-preview .cta-button {
          display: inline-block;
          background-color: #11999e;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 4px;
          letter-spacing: 0.01em;
        }

        .invite-email-preview .cta-helper {
          font-size: 13px;
          color: #666666;
          margin-top: 12px;
        }

        .invite-email-preview .secondary-cta {
          color: #333333;
        }

        .invite-email-preview .secondary-link {
          color: #11999e;
          text-decoration: underline;
          font-weight: 500;
        }

        .invite-email-preview .signature {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #11999e;
        }

        .invite-email-preview .signature .regards {
          font-size: 15px;
          color: #1a1a1a;
          margin-bottom: 12px;
        }

        .invite-email-preview .signature .signature-name {
          font-size: 15px;
          color: #1a1a1a;
          font-weight: 600;
          line-height: 1.4;
        }

        .invite-email-preview .signature .signature-role,
        .invite-email-preview .signature .signature-company {
          font-size: 13px;
          color: #666666;
          line-height: 1.4;
        }

        .invite-email-preview .footer-disclosure {
          max-width: 600px;
          margin: 16px auto 0;
          text-align: center;
          font-size: 11px;
          color: #888888;
          line-height: 1.5;
          padding: 0 20px;
        }

        @media (max-width: 640px) {
          .invite-email-preview .email-container {
            padding: 28px 24px 24px;
            border-radius: 0;
          }

          .invite-email-preview h2 {
            font-size: 16px;
          }

          .invite-email-preview p,
          .invite-email-preview .salutation,
          .invite-email-preview .custom-message {
            font-size: 15px;
          }

          .invite-email-preview .cta-button {
            padding: 12px 24px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
