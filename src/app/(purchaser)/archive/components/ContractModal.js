"use client";

export default function ContractModal({
  open,
  onClose,
  contract,
  companyName,
}) {
  if (!open || !contract) return null;

  const Section = ({ title, children }) => (
    <div>
      <div className="bg-[#11999e] p-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white w-11/12 max-w-3xl shadow-lg overflow-y-auto max-h-[90vh] animate-fadeInScale relative border border-black">
        <div className="bg-[#11999e] w-full p-2 flex flex-col items-center">
          <img
            src="/lexify.png"
            alt="LEXIFY Logo"
            className="h-16 mb-2 w-64 h-32"
          />
          <h2 className="text-2xl font-bold text-white">LEXIFY Contract</h2>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
        >
          &times;
        </button>

        <div className="p-4 text-black space-y-3 text-md">
          <p>
            <strong>Contract Date:</strong>{" "}
            <u>{new Date(contract.contractDate).toLocaleDateString()}</u>
          </p>

          <br />
          <h3 className="font-semibold text-lg">LEGAL SERVICE PROVIDER</h3>
          <p>
            <strong>Company Name:</strong>{" "}
            <u>{contract.provider?.companyName || "—"}</u>
          </p>
          <p>
            <strong>Business ID:</strong>{" "}
            <u>{contract.provider?.businessId || "—"}</u>
          </p>
          <p>
            <strong>Representative Name:</strong>{" "}
            <u>{contract.provider?.contactName || "—"}</u>
          </p>
          <p>
            <strong>Email:</strong> <u>{contract.provider?.email || "—"}</u>
          </p>
          <p>
            <strong>Telephone:</strong> <u>{contract.provider?.phone || "—"}</u>
          </p>

          <hr />

          <h3 className="font-semibold text-lg">LEGAL SERVICE PURCHASER</h3>
          <p>
            <strong>Company Name:</strong> <u>{companyName || "—"}</u>
          </p>
          <p>
            <strong>Business ID:</strong> <u>—</u>
          </p>
          <p>
            <strong>Representative Name:</strong> <u>—</u>
          </p>
          <p>
            <strong>Email:</strong> <u>—</u>
          </p>
          <p>
            <strong>Telephone:</strong> <u>—</u>
          </p>

          <p className="italic text-sm">
            The Legal Service Purchaser may also be referred to as
            &quot;Client&quot; in this contract.
          </p>

          <hr />

          <p>
            <strong>Contract Price (VAT 0%):</strong>{" "}
            <u>
              {contract.contractPrice?.toLocaleString() || "—"}{" "}
              {contract.contractPriceCurrency || ""}
            </u>
          </p>
          <p>
            <strong>Contract Price Currency:</strong>{" "}
            <u>{contract.contractPriceCurrency || "—"}</u>
          </p>
          <p>
            <strong>Contract Price Type:</strong>{" "}
            <u>{contract.contractPriceType || "—"}</u>
          </p>

          <hr />

          <h3 className="font-semibold text-lg">PURPOSE OF THE AGREEMENT</h3>
          <p>
            This agreement for the provision of legal services (the &quot;LEXIFY
            Contract&quot;) is entered into on the date specified above between
            the Legal Service Provider and Legal Service Purchaser.
          </p>

          <hr />
          <h3 className="font-semibold text-lg">CONTRACT DOCUMENTS</h3>
          <ol className="list-decimal list-inside space-y-1 pl-6">
            <li>This LEXIFY Contract Cover Page</li>
            <li>
              The LEXIFY Request submitted by the Legal Service Purchaser on the
              LEXIFY platform (attached)
            </li>
            <li>
              General Terms and Conditions for LEXIFY Contracts (attached)
            </li>
            <li>
              Supplier Code of Conduct and/or other procurement requirements
              (attached, if applicable)
            </li>
          </ol>

          <p className="italic text-sm">
            This cover page forms an integral part of the LEXIFY Contract.
          </p>
          <hr className="text-[#3a3a3c]" />
        </div>

        {/* Section 2: The LEXIFY Request (from request fields we fetched into contract.request) */}
        <h3 className="font-semibold text-lg text-black pt-8 pl-8">
          2. The LEXIFY Request
        </h3>
        <div id="lexify-preview" className="space-y-6 text-black p-8">
          <Section title="Scope of Work">
            <p className="text-md mt-2">
              {contract.request?.scopeOfWork || "—"}
            </p>
          </Section>
          <Section title="Contract Price Type and Currency">
            <p className="text-md mt-2">{contract.contractPriceType || "—"}</p>
            <p className="text-md mt-2">
              Currency: {contract.contractPriceCurrency || "—"}
            </p>
          </Section>
          <Section title="Description of Client's Line of Business">
            <p className="text-md mt-2">
              {contract.request?.description || "—"}
            </p>
          </Section>
          <Section title="Invoicing">
            <p className="text-md mt-2">
              The Legal Service Provider shall invoice the Client as follows:
            </p>
            <p className="text-md mt-2">
              {contract.request?.invoiceType || "—"}
            </p>
          </Section>
          <Section title="Languages Required for the Performance of the Work">
            <p className="text-md mt-2">{contract.request?.language || "—"}</p>
          </Section>
        </div>

        <h3 className="font-semibold text-lg text-black pt-8 pl-4">
          3. General Terms and Conditions for LEXIFY Contracts
        </h3>
        <div className="p-4 text-black space-y-3 text-md">
          <hr className="text-[#11999e]" />
          <h3 className="text-lg">
            General Terms and Conditions for LEXIFY Contracts
          </h3>
          <p>Last Updated: January 2025</p>
          <hr className="text-[#11999e]" />
          <p>
            These General Terms and Conditions for LEXIFY Contracts (the “LEXIFY
            Contract GTCs”) are applied to all contracts regarding the provision
            of legal services (each such contract “LEXIFY Contract”) entered
            into between a legal service provider (“LSP”) and a Legal Service
            User (“LSU”) on the LEXIFY platform. These LEXIFY GTCs form an
            integral part of all LEXIFY Contracts. Unless otherwise specifically
            stated herein, the defined terms used in these LEXIFY Contract GTCs
            have the same meaning as set forth in the LEXIFY Terms of Service,
            as amended from time to time.
          </p>
          <p>
            <strong>1. Scope of Services</strong>
          </p>
          <p>
            The legal services provided by the LSP to the LSU under the LEXIFY
            Contract are set out in the corresponding LEXIFY Request, as
            included as appendix to the LEXIFY Contract. Any legal advice
            provided by the LSP under the LEXIFY Contract may not, unless
            otherwise indicated by the LSU, be relied on in any other engagement
            or used for any purpose other than that for which it was given under
            the LEXIFY Contract. Personnel of the LSP participating in providing
            the legal services under the LEXIFY Contract are qualified to give
            advice on the legal position in the jurisdiction in which they are
            authorized to practice law and do not provide advice on the legal
            position in any other jurisdiction, unless such has been
            specifically requested in the relevant LEXIFY Request. The advice
            provided by the LSP under a LEXIFY Contract is based on the facts
            and the legal position at the time it is given. The LSP confirms
            that it has not been subjected to bankruptcy proceedings, corporate
            restructuring or any other insolvency proceedings which might
            restrict or limit its competence or capability to provide the legal
            services as described in the LEXIFY Contract.
          </p>
          <p>
            <strong>2. LSP CONTACT PERSON & TEAM</strong>
          </p>
          <p>
            A partner or other contact person will be designated to be
            responsible for the work to be conducted by the LSP under the LEXIFY
            Contract and to act as the point of contact toward the LSU. The LSP
            is responsible for assigning a team suitable and competent to
            provide the resources and expertise required for the service under
            the LEXIFY Contract. The LSP is entitled to make changes to the
            composition of the team during the assignment, if necessary. The
            LEXIFY Contract is entered into by the LSU with the LSP and not with
            any individual associated with or employed by the LSP.
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
            The LSP is liable to compensate the LSU for any and all damage
            suffered by the LSU as a result of the LSP submitting an Offer or
            entering into a LEXIFY Contract in breach of a conflict of interest
            which the LSP has identified, or should have identified, prior to
            making such Offer or entering into such LEXIFY Contract. The LSP may
            be required by applicable law to verify the LSU and/or its
            representatives&apos; identity and the LSU&apos;s ownership
            structure, as well as obtain information about the nature and
            purpose of the legal services covered by the LEXIFY Contract. In
            some cases, the LSP may also be required to verify the origin of the
            LSU&apos;s funds or other assets. The LSP may therefore request, if
            required by applicable law, evidence of the LSU and its
            representatives&apos; identity, of the identity of another person
            involved on the LSU&apos;s behalf, and of persons who are the
            LSU&apos;s beneficial owners, as well as information and
            documentation evidencing the origin of the LSU&apos;s funds and
            other assets. The LSP may also be under an obligation to verify such
            information from external sources. The LSP may be required by law to
            report suspicions of money laundering or financing of terrorism to
            the relevant government authorities. In such situations, the LSP may
            be prevented by law from informing the LSU of such suspicions or
            that a report has been, or will be, made. Neither the LSP nor LEXIFY
            is liable for any loss or damage caused to the LSU as a consequence
            of the LSP&apos;s compliance with the aforementioned obligations
            applicable to the LSP as a legal service provider under applicable
            law.
          </p>
          <p>
            <strong>4. COMMUNICATION BETWEEN LSP AND LSU; COOPERATION</strong>
          </p>
          <p>
            The LSP may communicate with the LSU in a variety of ways, including
            via telephone, the Internet and email. The LSP and the LSU must each
            always exercise due care and have in place adequate data security
            measures in accordance with prevailing industry standards to ensure
            secure communications. The LSP and the LSU may separately agree on
            additional data security measures, such as specific email encryption
            options. The LSP and the LSU acknowledge that customary data
            security measures such as spam filters and anti-virus programs may
            sometimes block or reject legitimate emails and therefore undertake
            to use reasonable efforts to confirm the delivery of any important
            emails, for example, by ensuring receipt of a response, or by other
            means of communication. To enable the LSP to provide the LSU with
            the highest quality service under the LEXIFY Contract, the LSU
            undertakes to:
            <br />- provide the LSU, as appropriate in connection with the
            LEXIFY Request and thereafter, with adequate background information
            and documents necessary for the due performance of the LSP&apos;s
            service;
            <br />- respond without delay to the LSP&apos;s reasonable requests
            for additional information and instructions;
            <br />- provide the LSP with comprehensive, exact and accurate
            information regarding the matter during the performance of the
            LSP&apos;s services under the LEXIFY Contract; and
            <br />- inform the LSP without delay of any changes in circumstances
            relevant to the scope of services provided by the LSP under the
            LEXIFY Contract, or the matter at hand otherwise.
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
            Regardless of whether the LSP&apos;s involvement in the assignment
            for the LSU has become publicly known (due to reasons not
            attributable to the LSP), The LSP may not disclose acting on behalf
            of the LSU and the LSP&apos;s involvement in such matter in any
            manner without the LSU&apos;s prior written consent, save to the
            extent as may be required by applicable mandatory law.
          </p>
          <p>
            <strong>6. FEES AND EXPENSES</strong>
          </p>
          <p>
            The fee charged by the LSP for the services set out in the LEXIFY
            Contract shall not exceed the amount set forth in the respective
            Offer submitted by the LSP, and the LSU shall not be obligated to
            pay any fee exceeding the amount set out in the Offer. Where the
            Offer has been provided by the LSP in the form of a lump sum fixed
            fee, The LSP acknowledges that as an experienced legal professional
            it has carefully considered the facts and specifications of the
            LEXIFY Request and provided its Offer with due consideration of the
            customary duration and requirements of such assignments, and with
            the understanding and acceptance that the amount of actual work
            required in such assignments may vary due to variables customary to
            such assignments, and that this does not entitle the LSP to revise
            its Offer later during the course of the assignment. The parties
            acknowledge and accept that the LSP shall not be entitled to
            invoice, in addition to the fee set out in the Offer, additional
            charges or costs (such as postage, copying, telephone and similar
            expenses). The LSP shall be entitled to separately invoice solely
            the following cost items (if applicable):
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
            the LSU later requests specific documentation to be translated by
            such service providers). The LSP shall add value added tax or other
            applicable taxes to its fee and charge such taxes where appropriate
            in accordance with applicable laws and regulations.
          </p>
          <p>
            <strong>7. INVOICING AND PAYMENT</strong>
          </p>
          <p>
            The LSP shall invoice for its services in accordance with the terms
            and conditions of the LEXIFY Contract. Payment of invoices is due
            within 30 days of the date of the invoice, unless otherwise
            separately agreed between the LSP and the LSU in writing. Interest
            is payable on overdue invoices in accordance with applicable law
            from the due date until the date of payment. If the LSP&apos;s
            invoice(s) remain unpaid after the due date, the LSP is also
            entitled to suspend all services to the LSU until the outstanding
            payment has been made in full.
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
            products that the LSP generates for the LSU vests in the LSP,
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
            contact details relating to the LSU&apos;s representatives (names,
            telephone numbers, email addresses, work-related addresses and other
            identification data) for identity verification and relationship
            management purposes. The LSP may also process other types of
            personal data relating to the LSU and its counterparties&apos; (if
            any) representatives that is necessary to enable the LSP to perform
            the work and to fulfill the LSP&apos;s obligations under the LEXIFY
            Contract and applicable anti-money laundering and other laws. The
            LSU may consult the LSP directly for further information on the
            LSP&apos;s data protection practices.
          </p>
          <p>
            <strong>11. COMPLAINTS BY LSU</strong>
          </p>
          <p>
            If, for any reason, the LSU is dissatisfied or has a complaint
            regarding the service by the LSP, the LSU shall notify the
            LSP&apos;s responsible partner or other contact person in charge of
            the specific matter. Such notice must be given within a reasonable
            time, and in any event no later than 180 days after the date the LSU
            became aware, or should have become aware upon reasonable
            investigation, of the grounds for the complaint. The LSP will
            investigate any complaint received promptly and inform the LSU of
            planned corrective measures without undue delay. If the LSU brings a
            claim against the LSP based on a claim made against the LSU by a
            third party or any public authority, the LSP will be entitled to
            defend and settle such claim on the LSU&apos;s behalf, provided{" "}
            <br />
            i) the LSP keeps the LSU continuously informed of such claim
            proceedings and seeks the LSU&apos;s prior written approval for any
            material decision (for example, the key terms of a settlement)
            regarding such claim proceedings and <br />
            ii) the LSU is indemnified in full by the LSP. If the LSU is to be
            reimbursed by the LSP for any claim, such reimbursement will only be
            made if the LSU transfers the right of recourse against third
            parties by way of subrogation or assignment to the LSP or to its
            insurers.
          </p>
          <p>
            <strong>12. LIMITATION OF LIABILITY</strong>
          </p>
          <p>
            The LSP&apos;s liability under the LEXIFY Contract is limited to
            pure economic loss caused to the LSU as consequence of an error or
            negligence on the LSP&apos;s part in performing its work and is also
            limited in amount to five times the fee charged during the course of
            the engagement under the LEXIFY Contract or 500.000
            (fivehundredthousand) euros, whichever is higher. If loss suffered
            by the LSU is attributable to the willful misconduct or gross
            negligence of the LSP, no limitations of liability shall apply. The
            LSP assumes no liability to any third party through the use by the
            LSU of documents or other advice produced or provided by the LSP.
            Notwithstanding the above, if at the LSU&apos;s request the LSP in
            its sole discretion agrees that a third party may rely on a document
            produced by the LSP or on advice provided by the LSP, this will not
            increase or otherwise affect the LSP&apos;s liability, and the LSP
            will only be liable to such third party to the extent the LSP would
            be liable to the LSU. Any amount paid to a third party as a result
            of such liability will reduce the LSP&apos;s liability to the LSU
            correspondingly and vice versa. If the LSP agrees that a third party
            may rely on a document produced by the LSP or on advice provided by
            the LSP, no attorney-client relationship will arise between the LSP
            and such third party. The LSP assumes no liability for any delay in
            service where due to events beyond the LSP&apos;s control, the LSP
            is unable to start or continue work on an engagement for the LSU.
            Neither party shall be liable for any delay or failure to perform
            its obligations under the LEXIFY Contract if such delay or failure
            results from circumstances beyond its reasonable control, including
            but not limited to acts of God, natural disasters, pandemic,
            epidemic, war, terrorism, riots, civil unrest, government actions,
            strikes, power failures, or telecommunications disruptions
            (&quot;Force Majeure Event&quot;). The affected party shall notify
            the other party of such Force Majeure Event as soon as reasonably
            possible. If a Force Majeure Event continues for more than 90
            consecutive days, either party may terminate the LEXIFY Contract
            with written notice to the other Party without penalty. The LSP
            shall at all times maintain liability insurance policies in
            accordance with industry standards issued by reputable insurance
            companies. The LSP and the LSU specifically acknowledge that LEXIFY
            is not a contractual party to the LEXIFY Contract, and neither the
            LSP nor the LSU as parties to the LEXIFY Contract shall make any
            claim of whatsoever kind against LEXIFY in relation to the
            performance of the other party in connection with the LEXIFY
            Contract or otherwise.
          </p>
          <p>
            <strong>13. WORK OF OTHER ADVISORS</strong>
          </p>
          <p>
            The LSP may, upon request of the LSU, identify and instruct other
            advisors for a particular engagement on the LSU&apos;s behalf. If
            the LSP instructs, engages and/or works together with other
            advisors, any such advisors will be considered independent of the
            LSP and the LSP assumes no responsibility or liability for
            recommending them to the LSU or for the advice given by them. The
            LSP does not assume responsibility for any quotes, estimates or fees
            charged by such advisors, and such fees are not included in the
            price set out in the Offer. Any authority to instruct advisors on
            the LSU&apos;s behalf includes authority to accept a reasonable
            limitation of liability on the LSU&apos;s behalf.
          </p>
          <p>
            <strong>14. TERMINATION OF LEXIFY CONTRACT</strong>
          </p>
          <p>
            The engagement under the LEXIFY Contract will end when the LSP has
            carried out the work described in the LEXIFY Contract. The LEXIFY
            Contract and the engagement may also be terminated at any time by
            written request of the LSU, asking the LSP to cease further work in
            the matter. In such case, the LSU shall be responsible for i) any
            fees for services provided by the LSP under the LEXIFY Contract
            prior to the date of termination and ii) fees paid by the LSP to
            LEXIFY pro rated for the part of the assignment not yet completed on
            the date of termination. In certain situations, applicable mandatory
            law or applicable bar rules may set out circumstances that require
            the LSP to discontinue acting for the LSU. Where an engagement is
            terminated, unless prevented by applicable law, the LSP shall take
            reasonable measures to preserve the LSU&apos;s interests when
            discontinuing the engagement (this may include, for example,
            reimbursement of fees already paid by the LSU for services not yet
            rendered by the LSP). A party to the LEXIFY Contract may terminate
            the LEXIFY Contract at any time due to a material breach of the
            LEXIFY Contract by the other party. Prior to any such termination
            the non-breaching party shall always provide the breaching party
            with a reasonable opportunity to remedy the breach.
          </p>
          <p>
            <strong>15. AMENDMENTS; NO WAIVER</strong>
          </p>
          <p>
            The terms and conditions of the LEXIFY Contract cannot be revised or
            amended by the LSP or the LSU. No consent to, or waiver of, a breach
            (whether express or implied) of the LEXIFY Contract by either the
            LSP or the LSU, as applicable, will constitute a consent to, waiver
            of, or relief of liability from any other, separate, or subsequent
            breach by either the LSP or the LSU of the LEXIFY Contract, as
            applicable.
          </p>
          <p>
            <strong>16. GOVERNING LAWS AND REGULATIONS; DISPUTES</strong>
          </p>
          <p>
            The LSU acknowledges and accepts that the LSP may be required by law
            to adhere to the code of conduct and/or other applicable regulations
            of a competent bar association or corresponding professional
            associations (e.g. the Finnish Bar Association) when providing
            services to the LSU pursuant to a LEXIFY Contract. The LEXIFY
            Contract is governed by and construed in accordance with the laws of
            the country of domicile of the LSU (excluding its choice of law
            rules). Any dispute, controversy or claim that may arise out of or
            in connection with the LEXIFY Contract or the breach, termination or
            invalidity thereof and which is not resolved within a reasonable
            time in amicable negotiations between the parties, will be finally
            settled in arbitration by a reputable arbitration tribunal of the
            country of domicile of the LSU. Arbitral proceedings and all
            information disclosed in the course of such proceedings, as well as
            any decision or award made or declared during the proceedings, shall
            be kept confidential and may not, in any form, be disclosed to a
            third party (except LEXIFY) without the express consent of both
            parties to the LEXIFY Contract. However, neither the LSU nor the LSP
            shall be prevented from disclosing such information to preserve its
            rights against the other or an insurance policy underwriter or if
            the LSU or the LSP is required to disclose information pursuant to
            mandatory law or stock exchange rules and regulations or similar.
            Notwithstanding the above, the LSP is entitled to commence
            proceedings to recover any amount due to it in any court with
            jurisdiction over the LSU or any of the LSU&apos;s assets. If the
            country of domicile of the LSU is Finland, arbitration shall always
            take place in accordance with the Arbitration Rules of the Finland
            Chamber of Commerce.
          </p>

          <hr className="text-[#3a3a3c]" />
        </div>

        <div className="m-4">
          <button
            onClick={onClose}
            className="text-white bg-[#3a3a3c] rounded px-4 py-2 hover:bg-red-600 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
