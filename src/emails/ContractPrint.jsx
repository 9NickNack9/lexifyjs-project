// src/emails/ContractPrint.jsx
/* eslint-disable react/no-danger */
export default function ContractPrint({ contract, companyName, previewDef }) {
  // --- tiny helpers copied from ContractModal (no hooks, same output) ---
  const deepGet = (obj, dotted) => {
    try {
      return dotted
        .split(".")
        .reduce((o, k) => (o == null ? undefined : o[k]), obj);
    } catch {
      return undefined;
    }
  };
  const formatLocal = (d) => {
    const date = new Date(d);
    return isNaN(date) ? "—" : date.toLocaleDateString();
  };
  const buildClientLine = (row, companyNameArg) => {
    const name = companyNameArg || row?.client?.companyName || null;
    const id = row?.client?.companyId || null;
    const country = row?.client?.companyCountry || null;
    const parts = [name, id, country].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };
  const renderValue = (v, pathHint) => {
    if ((pathHint || "").toLowerCase().includes("primarycontactperson")) {
      const p = v || {};
      const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
      return name || "—";
    }
    if (
      pathHint === "backgroundInfoFiles" ||
      pathHint === "supplierCodeOfConductFiles"
    ) {
      if (Array.isArray(v) && v.length) {
        return `<ul style="margin:6px 0;padding-left:18px;">${v
          .map(
            (f) =>
              `<li><a href="${
                f.url
              }" target="_blank" rel="noreferrer noopener">${
                f.name || "file"
              }</a></li>`
          )
          .join("")}</ul>`;
      }
      return "—";
    }
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    if (v === null || v === undefined || v === "") return "—";
    const hint = (pathHint || "").toLowerCase();
    if (
      hint.includes("date") ||
      hint.includes("deadline") ||
      hint.includes("expire")
    ) {
      const dd = new Date(v);
      return isNaN(dd) ? String(v) : dd.toLocaleString();
    }
    return String(v);
  };
  const resolvePath = (row, path) => {
    if (!path) return "—";
    if (path === "__clientLine__" || path === "__clientLineOrDisclosed__")
      return buildClientLine(row, companyName);
    return deepGet(row, path) ?? "—";
  };
  const shouldHideField = (field) => {
    const HIDE_PATHS = new Set([
      "serviceProviderType",
      "domesticOffers",
      "providerSize",
      "providerCompanyAge",
      "providerMinimumRating",
      "details.serviceProviderType",
      "details.domesticOffers",
      "details.providerSize",
      "details.providerCompanyAge",
      "details.providerMinimumRating",
      "offersDeadline",
      "details.offersDeadline",
      "dateExpired",
      "details.dateExpired",
      "title",
      "requestTitle",
      "requestState",
      "maximumPrice",
      "details.maximumPrice",
    ]);
    const path = String(field?.path || "");
    if (HIDE_PATHS.has(path)) return true;
    const label = String(field?.label || "").toLowerCase();
    if (
      label === "service provider type" ||
      label === "domestic offers" ||
      label.includes("provider size") ||
      label.includes("company age") ||
      label === "minimum rating" ||
      label === "offers deadline" ||
      label === "request title" ||
      label === "request state" ||
      label === "maximum price"
    )
      return true;
    return false;
  };

  // --- HTML (simple, email/PDF-friendly) ---
  return `<!doctype html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>LEXIFY Contract</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111; }
      .h1 { font-size: 22px; font-weight: 700; margin: 8px 0; }
      .h2 { font-size: 18px; font-weight: 600; margin: 8px 0; }
      .card { border: 1px solid #000; border-radius: 8px; margin: 8px 0; }
      .hdr { background:#11999e; color:#fff; padding:8px 12px; border-radius:8px 8px 0 0; font-weight:600; }
      .row { padding: 8px 12px; }
      table { width:100%; border-collapse: collapse; }
      td { border-top: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      .muted { color: #555; font-style: italic; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="hdr">LEXIFY Contract</div>
      <div class="row">
        <div><strong>Contract Date:</strong> <u>${formatLocal(
          contract.contractDate
        )}</u></div>

        <h3 class="h2">LEGAL SERVICE PROVIDER</h3>
        <div><strong>Company Name:</strong> <u>${
          contract.provider?.companyName || "—"
        }</u></div>
        <div><strong>Business ID:</strong> <u>${
          contract.provider?.businessId || "—"
        }</u></div>
        <div><strong>Representative Name:</strong> <u>${
          contract.provider?.contactName || "—"
        }</u></div>
        <div><strong>Email:</strong> <u>${
          contract.provider?.email || "—"
        }</u></div>
        <div><strong>Telephone:</strong> <u>${
          contract.provider?.phone || "—"
        }</u></div>

        <hr/>

        <h3 class="h2">LEGAL SERVICE PURCHASER</h3>
        <div><strong>Company Name:</strong> <u>${
          contract.purchaser?.companyName || companyName || "—"
        }</u></div>
        <div><strong>Business ID:</strong> <u>${
          contract.purchaser?.businessId || "—"
        }</u></div>
        <div><strong>Representative Name:</strong> <u>${
          contract.purchaser?.contactName || "—"
        }</u></div>
        <div><strong>Email:</strong> <u>${
          contract.purchaser?.email || "—"
        }</u></div>
        <div><strong>Telephone:</strong> <u>${
          contract.purchaser?.phone || "—"
        }</u></div>

        <p class="muted">The Legal Service Purchaser may also be referred to as "Client" in this contract.</p>

        <div><strong>Contract Price (VAT 0%):</strong> <u>${
          contract.contractPrice ?? "—"
        } ${contract.contractPriceCurrency || ""}</u></div>
        <div><strong>Contract Price Currency:</strong> <u>${
          contract.contractPriceCurrency || "—"
        }</u></div>
        <div><strong>Contract Price Type:</strong> <u>${
          contract.contractPriceType || "—"
        }</u></div>
        <hr />
          <h3 className="font-semibold text-lg">PURPOSE OF THE AGREEMENT</h3>
            <p>
              This agreement for the provision of legal services (the
              &quot;LEXIFY Contract&quot;) is entered into on the date
              specified above between the Legal Service Provider and Legal
              Service Purchaser (collectively, the &quot;Parties&quot;).
            </p>
            <p>
              The Legal Service Provider agrees to provide legal services to
              the Legal Service Purchaser as detailed in this LEXIFY
              Contract, and the Legal Service Purchaser agrees to compensate
              the Legal Service Provider accordingly.
            </p>
          <hr />
          <h3 className="font-semibold text-lg">CONTRACT DOCUMENTS</h3>
            <p>
              The following documents form the entire LEXIFY Contract
              (listed in order of precedence, with 1 having the highest
              priority in case of conflicts):
            </p>
          <ol className="list-decimal list-inside space-y-1 pl-6">
            <li>This LEXIFY Contract Cover Page</li>
            <li>
              The LEXIFY Request submitted by the Legal Service Purchaser on the
              LEXIFY platform (attached hereto)
            </li>
            <li>
              General Terms and Conditions for LEXIFY Contracts (attached hereto)
            </li>
            <li>
              The Supplier Code of Conduct and/or other procurement
              related requirements of the Legal Service Purchaser
              (attached to contract email, if applicable)
            </li>
          </ol>
            <p>
              By having submitted the attached LEXIFY Request (Legal Service
              Purchaser) and by responding thereto with a binding offer
              (Legal Service Provider) on the LEXIFY platform, the Parties
              acknowledge that they have read, understood, and agreed to be
              bound by the terms and conditions contained in this LEXIFY
              Contract (including all its attachments).
            </p>
          <p className="italic text-sm">
            This cover page forms an integral part of the LEXIFY Contract.
          </p>
          <hr className="text-[#3a3a3c]" />
      </div>
    </div>

    <h3 class="h2">2. The LEXIFY Request</h3>
    ${
      !previewDef
        ? `<div class="row card"><div class="row">No matching preview definition found.</div></div>`
        : `<div class="row">
            ${(previewDef.preview?.sections || [])
              .filter(
                (section) =>
                  !String(section?.title || "")
                    .toLowerCase()
                    .includes("provider requirement")
              )
              .map((section) => {
                const fields = Array.isArray(section.fields)
                  ? section.fields.filter((f) => !shouldHideField(f))
                  : null;
                if (Array.isArray(section.fields) && fields.length === 0)
                  return "";
                if (fields) {
                  const rows = fields
                    .map((f) => {
                      const label = f.label || "—";
                      let raw = resolvePath(contract.request, f.path);
                      let display = renderValue(raw, f.path);
                      // minimal label fallback (currency/invoice style like in modal)
                      if (
                        display === "—" &&
                        /primary contact person/i.test(label)
                      ) {
                        const pc =
                          contract.request?.primaryContactPerson ||
                          contract.request?.details?.primaryContactPerson ||
                          null;
                        if (pc)
                          display = renderValue(pc, "primaryContactPerson");
                      }
                      return `<tr><td><strong>${label}</strong></td><td>${display}</td></tr>`;
                    })
                    .join("");
                  return `<div class="card"><div class="hdr">${section.title}</div><div class="row"><table>${rows}</table></div></div>`;
                }
                if (section.value) {
                  const v = resolvePath(contract.request, section.value);
                  const rendered = renderValue(v, section.value);
                  return `<div class="card"><div class="hdr">${section.title}</div><div class="row">${rendered}</div></div>`;
                }
                return "";
              })
              .join("")}
          </div>`
    }
            <h3 class="h2">3. General Terms and Conditions for LEXIFY Contracts</h3>
            <div class="card">
            <div class="hdr">General Terms and Conditions for LEXIFY Contracts</div>
            <div class="row">
                <div className="p-4 text-black space-y-3 text-md">
                  <hr className="text-[#11999e]" />
                  <h3 className="text-lg">
                    General Terms and Conditions for LEXIFY Contracts
                  </h3>
                  <p>Last Updated: October 2025</p>
                  <hr className="text-[#11999e]" />
                  <p>
                    These General Terms and Conditions for LEXIFY Contracts (the “LEXIFY
                    Contract GTCs”) are applied to all contracts regarding the provision
                    of legal services (each such contract “LEXIFY Contract”) entered
                    into between a legal service provider (“LSP”) and a legal service
                    user (“LSU”) on the LEXIFY platform. These LEXIFY Contract GTCs form
                    an integral part of all LEXIFY Contracts. Unless otherwise
                    specifically stated herein, the defined terms used in these LEXIFY
                    Contract GTCs have the same meaning as set forth in the LEXIFY Terms
                    of Service, as amended from time to time.
                  </p>
                  <p>
                    <strong>1. Scope of Services</strong>
                  </p>
                  <p>
                    The legal services to be provided by the LSP to the LSU under the
                    LEXIFY Contract are set out in the corresponding LEXIFY Request,
                    included as appendix to the LEXIFY Contract.
                    <br />
                    Any legal advice provided by the LSP under the LEXIFY Contract may
                    not, unless otherwise indicated by the LSP, be relied on in any
                    other engagement or used for any purpose other than that for which
                    it was given under the LEXIFY Contract. Personnel of the LSP
                    providing the legal services under the LEXIFY Contract are qualified
                    to give advice for the jurisdiction in which they are authorized to
                    practice law and do not provide advice for any other jurisdiction,
                    unless such advice has specifically been requested in the relevant
                    LEXIFY Request. The legal advice provided by the LSP under the
                    LEXIFY Contract is based on the facts and the legal position at the
                    time it is given.
                    <br />
                    The LSP warrants that it has the requisite professional expertise
                    and experience in all areas of law relevant to the performance of
                    the legal work as required in the LEXIFY Request. The LSP further
                    warrants that it has not been subjected to bankruptcy proceedings,
                    corporate restructuring or any other insolvency proceedings which
                    might restrict or limit its competence or capability to provide the
                    legal services as described in the LEXIFY Contract.
                  </p>
                  <p>
                    <strong>2. LSP CONTACT PERSON & TEAM</strong>
                  </p>
                  <p>
                    A partner or other contact person is designated by the LSP to be
                    responsible for the work to be conducted by the LSP under the LEXIFY
                    Contract and to act as the point of contact toward the LSU. The LSP
                    is responsible for assigning a team suitable and competent to
                    provide the resources and expertise required for the legal service
                    under the LEXIFY Contract. The LSP is entitled to make changes to
                    the composition of the team during the assignment, if necessary. The
                    LEXIFY Contract is entered into by the LSU with the LSP and not with
                    any individual associated with or employed by the LSP
                  </p>
                  <p>
                    <strong>
                      3. CLIENT IDENTIFICATION AND ANTI-MONEY LAUNDERING REQUIREMENTS
                    </strong>
                  </p>
                  <p>
                    The LSP has carried out a customary conflict check in accordance
                    with applicable bar rules or other applicable professional rules (if
                    any) prior to submitting its Offer. By entering into the LEXIFY
                    Contract the LSP warrants that no conflict of interest preventing it
                    from performing the work described in the LEXIFY Contract exists.
                    The LSP shall reimburse the LSU for any and all damage suffered by
                    the LSU as a result of the LSP submitting an Offer or entering into
                    a LEXIFY Contract in breach of a conflict of interest which the LSP
                    has identified, or should have identified, prior to making such
                    Offer or entering into such LEXIFY Contract.
                    <br />
                    The LSP may be required by applicable law to verify the LSU and/or
                    its representatives’ identity and/or the LSU’s ownership structure,
                    as well as obtain information about the nature and purpose of the
                    legal services covered by the LEXIFY Contract. In some cases, the
                    LSP may also be required to verify the origin of the LSU’s funds or
                    other assets. The LSP may therefore request, if required by
                    applicable General Terms and Conditions for LEXIFY Contracts Last
                    Updated: October 2025 2 laws or regulations, evidence of the LSU and
                    its representatives’ identity, of the identity of any person
                    involved on the LSU’s behalf, and of persons who are the LSU’s
                    beneficial owners, as well as information and documentation
                    evidencing the origin of the LSU’s funds and other assets. The LSP
                    may also be under obligation to verify such information from
                    external sources. The LSU agrees to provide to the LSP any
                    information referred to above and requested by the LSP without undue
                    delay.
                    <br />
                    The LSP may be required by law to report suspicions of money
                    laundering or financing of terrorism to the relevant government
                    authorities. In such situations, the LSP may be prevented by law
                    from informing the LSU of such suspicions or that a report has been,
                    or will be, made.
                    <br />
                    Neither the LSP nor LEXIFY is liable for any loss or damage caused
                    to the LSU as a consequence of the LSP’s compliance with the
                    aforementioned obligations applicable to the LSP as a legal service
                    provider under applicable law.
                  </p>
                  <p>
                    <strong>4. COMMUNICATION BETWEEN LSP AND LSU; COOPERATION</strong>
                  </p>
                  <p>
                    After entering into the LEXIFY Contract, the LSP and the LSU may
                    communicate in a variety of ways, including via telephone and email.
                    The LSP and the LSU must each always exercise due care and have in
                    place adequate data security measures in accordance with prevailing
                    industry standards to ensure secure communications. The LSP and the
                    LSU may separately agree on additional data security measures, such
                    as specific email encryption options. The LSP and the LSU
                    acknowledge that customary data security measures such as spam
                    filters and anti-virus programs may sometimes block or reject
                    legitimate emails and therefore undertake to use reasonable efforts
                    to confirm the delivery of any important emails, for example, by
                    ensuring receipt of a response, or by other means of communication.
                    <br />
                    To enable the LSP to provide the LSU with the highest quality
                    service under the LEXIFY Contract, the LSU undertakes to:
                    <br />- provide the LSP, as appropriate in connection with the
                    LEXIFY Request and thereafter, with adequate background information
                    and documents necessary for the due performance of the legal work;
                    <br />- respond without delay to the LSP’s reasonable requests for
                    additional information and instructions;
                    <br />- provide the LSP with comprehensive, exact and accurate
                    information regarding the matter during the performance of the LSP’s
                    legal work under the LEXIFY Contract; and
                    <br />- inform the LSP without delay of any changes in circumstances
                    relevant to the scope of legal services provided by the LSP under
                    the LEXIFY Contract, or the matter at hand otherwise.
                  </p>
                  <p>
                    <strong>5. CONFIDENTIALITY</strong>
                  </p>
                  <p>
                    The LSP and the LSU shall at all times keep their communications
                    related to the LEXIFY Contract confidential. The LSP protects
                    confidential information disclosed to the LSP in an appropriate
                    manner and in accordance with statutory confidentiality obligations,
                    applicable bar rules (if any) and customary industry practice.
                    Regardless of whether the LSP’s involvement in the assignment for
                    the LSU has become publicly known (due to reasons not attributable
                    to the LSP), The LSP may not disclose acting on behalf of the LSU
                    and the LSP’s involvement in such matter in any manner without the
                    LSU’s prior written consent, save to the extent as may be required
                    by applicable mandatory law.
                  </p>
                  <p>
                    <strong>6. FEES AND EXPENSES</strong>
                  </p>
                  <p>
                    The fee charged by the LSP for the services set out in the
                    LEXIFYContract shall not exceed the amount set forth in the
                    respective Offer submitted by the LSP, and the LSU shall not be
                    obligated to pay any fee exceeding the amount set out in the Offer.
                    Where the Offer has been provided by the LSP in the form of a lump
                    sum fixed fee, The LSP acknowledges that as an experienced legal
                    professional it has carefully considered the facts and
                    specifications of the LEXIFY Request and provided its Offer with due
                    consideration of the customary duration and requirements of such
                    assignments, and with the understanding and acceptance that the
                    amount of actual work required in such assignments may vary due to
                    variables customary to such assignments, and that this does not
                    entitle the LSP to revise its Offer later during the course of the
                    assignment. 3 The parties acknowledge and accept that the LSP shall
                    not be entitled to invoice, in addition to the fee set out in the
                    Offer, additional charges or costs (such as postage, copying,
                    telephone and similar expenses). The LSP shall be entitled to
                    separately invoice solely the following cost items (if applicable):
                    <br />
                    i) travel time and travel expenses for any travel specifically
                    requested by the LSU and not explicitly mentioned in the LEXIFY
                    Request;
                    <br />
                    ii) applicable fees or charges levied by competent authorities in
                    connection with the assignment (for example, registration fees
                    related to filings with a competent business register where such
                    filings are part of the assignment described in the relevant LEXIFY
                    Request); and
                    <br />
                    iii) costs resulting from additional services explicitly requested
                    by the LSU in writing and not originally included in the LEXIFY
                    Request (for example fees charged by professional translators where
                    the LSU later requests specific documentation to be translated).
                  </p>
                  <p>
                    The LSP shall add value added tax and other applicable taxes (if
                    any) to its fee and charge such taxes where appropriate in
                    accordance with applicable laws and regulations. For the avoidance
                    of doubt, it is acknowledged that the Offer submitted by the LSP is
                    exclusive of value added tax and other applicable tax (if any).
                  </p>
                  <p>
                    <strong>7. INVOICING AND PAYMENT</strong>
                  </p>
                  <p>
                    The LSP shall invoice for its services in accordance with the terms
                    and conditions of the LEXIFY Contract.
                    <br />
                    Payment of invoices is due within 30 days of the date of the
                    invoice, unless otherwise separately agreed between the LSP and the
                    LSU in writing. Interest is payable on overdue invoices in
                    accordance with applicable law from the due date until the date of
                    payment. If the LSP’s invoice(s) remain unpaid after the due date,
                    the LSP is also entitled to suspend all services to the LSU until
                    the outstanding payment has been made in full.
                  </p>
                  <p>
                    <strong>8. DOCUMENT RETENTION</strong>
                  </p>
                  <p>
                    Unless otherwise agreed between the LSP and the LSU or required by
                    law, the LSP will keep (or store with a third party) relevant
                    engagement-related material on file for ten years following the
                    completion of an engagement (or termination of an engagement), after
                    which the LSP may discard the material without separate
                    notification. Expenses for copying costs and related administrative
                    work may be charged by the LSP if copies are requested by the LSU at
                    a later date after the assignment.
                  </p>
                  <p>
                    <strong>9. INTELLECTUAL PROPERTY RIGHTS</strong>
                  </p>
                  <p>
                    The copyright and any other intellectual property rights in all work
                    products that the LSP generates for the LSU vest in the LSP,
                    although the LSU has the right to use such work products for the
                    purpose for which they were provided.
                  </p>
                  <p>
                    <strong>10. DATA PROTECTION</strong>
                  </p>
                  <p>
                    During the course of performing services for the LSU, the LSP will
                    process certain personal data as a &quot;controller&quot; (as
                    defined in the EU General Data Protection Regulation), such as
                    contact details relating to the LSU’s representatives (names,
                    telephone numbers, email addresses, work-related addresses and/or
                    other identification data) for identity verification and
                    relationship management purposes. The LSP may also process other
                    types of personal data relating to the LSU and its
                    counterparties&apos; (if any) representatives that is necessary to
                    enable the LSP to perform the legal work and to fulfill the LSP’s
                    obligations under the LEXIFY Contract and applicable anti-money
                    laundering and other laws. The LSU may consult the LSP directly for
                    further information on the LSP’s data protection practices.
                  </p>
                  <p>
                    <strong>11. COMPLAINTS BY LSU</strong>
                  </p>
                  <p>
                    If, for any reason, the LSU is dissatisfied or has a complaint
                    regarding the service by the LSP, the LSU shall notify the LSP’s
                    responsible partner or other contact person in charge of the
                    specific matter. Such notice must be given within a reasonable time,
                    and in any event no later than 30 days after the date the LSU became
                    aware, or should have become aware upon reasonable investigation, of
                    the grounds for the complaint. The LSP will investigate any
                    complaint received promptly and inform the LSU of planned corrective
                    measures without undue delay. 4 If the LSU brings a claim against
                    the LSP based on a claim made against the LSU by a third party or
                    any public authority, the LSP will be entitled to defend and settle
                    such claim on the LSU’s behalf, provided i) the LSP keeps the LSU
                    continuously informed of such claim proceedings and seeks the LSU’s
                    prior written approval for any material decision (for example, the
                    key terms of a settlement) regarding such claim proceedings and ii)
                    the LSU is indemnified in full by the LSP. If the LSU is to be
                    reimbursed by the LSP for any such claim, the reimbursement will
                    only be made if the LSU transfers the right of recourse against
                    third parties by way of subrogation or assignment to the LSP or to
                    its insurers.
                  </p>
                  <p>
                    <strong>12. LIMITATION OF LIABILITY</strong>
                  </p>
                  <p>
                    Save as may be required by mandatory provisions of applicable law,
                    the LSP’s liability to the LSU under the LEXIFY Contract is limited
                    to pure economic loss caused to the LSU as consequence of an error
                    or negligence on the LSP’s part in performing its work and is also
                    limited in amount to three times the fee charged during the course
                    of the engagement under the LEXIFY Contract or 200.000 (two hundred
                    thousand) euros, whichever is higher. If loss suffered by the LSU is
                    attributable to the willful misconduct or gross negligence of the
                    LSP, no limitations of liability shall apply.
                    <br />
                    The LSP assumes no liability to any third party through the use by
                    the LSU of documents or other advice produced or provided by the
                    LSP. Notwithstanding the above, if at the LSU’s request the LSP in
                    its sole discretion agrees that a third party may rely on a document
                    produced by the LSP or on advice provided by the LSP, this will not
                    increase or otherwise affect the LSP’s liability, and the LSP will
                    only be liable to such third party to the extent the LSP would be
                    liable to the LSU. Any amount paid to a third party as a result of
                    such liability will reduce the LSP’s liability to the LSU
                    correspondingly and vice versa. If the LSP agrees that a third party
                    may rely on a document produced by the LSP or on advice provided by
                    the LSP, no attorney-client relationship will arise between the LSP
                    and such third party.
                    <br />
                    The LSP assumes no liability for any delay in service where such
                    delay is attributable to the LSU or any party acting on behalf of
                    the LSU.
                    <br />
                    Neither the LSP nor the LSU shall be liable for any delay or failure
                    to perform its obligations under the LEXIFY Contract if such delay
                    or failure results from circumstances beyond the non-performing
                    party’s reasonable control, including but not limited to acts of
                    God, natural disasters, pandemic, epidemic, war, terrorism, riots,
                    civil unrest, government actions, strikes, power failures, or
                    telecommunications disruptions (&quot;Force Majeure Event&quot;).
                    The affected party shall notify the other party of such Force
                    Majeure Event as soon as reasonably possible. If a Force Majeure
                    Event continues for more than 90 consecutive days, either party may
                    terminate the LEXIFY Contract with written notice to the other Party
                    without penalty.
                    <br />
                    The LSP shall at all times maintain a liability insurance in
                    accordance with industry standards and issued by a reputable
                    insurance company.
                    <br />
                    The LSP and the LSU acknowledge that LEXIFY is not a contractual
                    party to the LEXIFY Contract. The LSP and the LSU undertake to
                    refrain from making any claims of whatsoever kind against LEXIFY in
                    relation to the performance of the other party under the LEXIFY
                    Contract.
                  </p>
                  <p>
                    <strong>13. WORK OF OTHER ADVISORS</strong>
                  </p>
                  <p>
                    The LSP may, upon request of the LSU, identify and instruct other
                    advisors for a particular engagement on the LSU’s behalf. If the LSP
                    instructs, engages and/or works together with other advisors, any
                    such advisors will be considered independent of the LSP and the LSP
                    assumes no responsibility or liability for recommending them to the
                    LSU or for the advice given by them. The LSP does not assume
                    responsibility for any quotes, estimates or fees charged by such
                    advisors, and such fees are not included in the price set out in the
                    Offer. Any authority to instruct advisors on the LSU’s behalf
                    includes authority to accept a reasonable limitation of liability on
                    the LSU’s behalf.
                  </p>
                  <p>
                    <strong>14. TERMINATION OF LEXIFY CONTRACT</strong>
                  </p>
                  <p>
                    The engagement under the LEXIFY Contract ends when the LSP has
                    carried out the work described in the LEXIFY Contract. In the event
                    of material changes in circumstances related to the assignment set
                    out in the LEXIFY Contract (e.g. where an acquisition of a company
                    is not completed due to unsuccessful negotiations between the seller
                    and the buyer), the LEXIFY Contract and the engagement may be
                    terminated at any time by written notice of the LSU, asking the LSP
                    to cease further work in the matter. In such 5 case, the LSU shall
                    compensate the LSP for services provided by the LSP under the LEXIFY
                    Contract up to and including the date of the written notice. Where
                    the Offer has been provided by the LSP in the form of a lump sum
                    fixed fee, the fee payable by the LSU shall be a prorated part of
                    the fixed fee, corresponding to the amount of work already performed
                    by the LSP and remaining unpaid on the date of the written notice.
                    Where the Offer has been provided by the LSP in the form of an
                    hourly rate, the payment made by the LSU shall be an amount
                    corresponding to the relevant hourly rate multiplied by the number
                    of hours of work already performed by the LSP and remaining unpaid
                    on the date of the written notice.
                    <br />
                    In the event the LSU refuses to disclose to the LSP information
                    requested by the LSP in accordance with Section “Client
                    Identification and Anti-Money Laundering Requirements” above, the
                    LSP shall be entitled to terminate the LEXIFY Contract with
                    immediate effect by written notice to the LSU. In the event of such
                    termination, the LSU shall compensate the LSP for all reasonable
                    costs incurred by the LSP as a result of the premature termination
                    of the assignment.
                    <br />
                    In certain situations, applicable mandatory law or bar rules may set
                    out circumstances that require the LSP to discontinue acting for the
                    LSU. Where an engagement is terminated in this manner, unless
                    prevented by applicable law, the LSP shall take reasonable measures
                    to preserve the LSU’s interests when discontinuing the engagement
                    (this may include, for example, reimbursement of fees already paid
                    by the LSU for services not yet rendered by the LSP).
                    <br />
                    Either party to the LEXIFY Contract may terminate the LEXIFY
                    Contract at any time due to a material breach of the LEXIFY Contract
                    by the other party. Prior to any such termination the non-breaching
                    party shall always provide the breaching party with a reasonable
                    opportunity to remedy the breach.
                  </p>
                  <p>
                    <strong>15. AMENDMENTS; NO WAIVER</strong>
                  </p>
                  <p>
                    Any amendments to the LEXIFY Contract must be agreed in writing by
                    the LSP and the LSU, and notified by the LSU by email to LEXIFY
                    (support@lexify.online) within 48 hours of agreement. For the
                    avoidance of doubt, it is acknowledged that any such amendment to
                    the LEXIFY Contract shall not reduce any service fees payable to
                    LEXIFY.
                    <br />
                    No consent to, or waiver of, a breach (whether express or implied)
                    of the LEXIFY Contract by either the LSP or the LSU, as applicable,
                    will constitute a consent to, waiver of, or relief of liability from
                    any other, separate, or subsequent breach by either the LSP or the
                    LSU of the LEXIFY Contract, as applicable.
                  </p>
                  <p>
                    <strong>16. GOVERNING LAWS AND REGULATIONS; DISPUTES</strong>
                  </p>
                  <p>
                    The LSU acknowledges and accepts that the LSP may be required by law
                    to adhere to the code of conduct and/or other applicable regulations
                    of a competent bar association or corresponding professional
                    associations (e.g. the Finnish Bar Association) when providing
                    services to the LSU pursuant to a LEXIFY Contract.
                    <br />
                    The LEXIFY Contract is governed by and construed in accordance with
                    the laws of the country of domicile of the LSU (excluding its choice
                    of law rules). Any dispute, controversy or claim that may arise out
                    of or in connection with the LEXIFY Contract or the breach,
                    termination or invalidity thereof and which is not resolved within a
                    reasonable time in amicable negotiations between the LSP and the
                    LSU, will be finally settled in arbitration by a reputable
                    arbitration tribunal of the country of domicile of the LSU. Arbitral
                    proceedings and all information disclosed in the course of such
                    proceedings, as well as any decision or award made or declared
                    during the proceedings, shall be kept confidential and may not, in
                    any form, be disclosed to a third party (except LEXIFY) without the
                    express consent of both parties to the LEXIFY Contract.
                    Notwithstanding the above, neither the LSU nor the LSP shall be
                    prevented from disclosing such information to preserve its rights
                    against the other or an insurance policy underwriter or if the LSU
                    or the LSP is required to disclose information pursuant to mandatory
                    law or stock exchange rules and regulations or similar. In addition
                    and notwithstanding the above, the LSP is entitled to commence
                    proceedings to recover any amount due to it in any court with
                    jurisdiction over the LSU or any of the LSU’s assets.
                    <br />
                    If the country of domicile of the LSU is Finland, any arbitration
                    shall always take place in accordance with the Arbitration Rules of
                    the Finland Chamber of Commerce.
                  </p>

                  <hr className="text-[#3a3a3c]" />
                </div>
                <!-- END GTCs -->
            </div>
            </div>
  </body>
</html>`;
}
