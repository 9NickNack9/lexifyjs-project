/**
 * Exact option values for RFP content fields used by Lexi draft generation.
 * Provider/commercial defaults are applied separately in lexiDraft.js.
 */

const ICT_TEMPLATE_BOXES = [
  "SaaS",
  "Licensing",
  "Software Development",
  "Application Management Services",
  "Application Terms of Use or EULA",
  "Data Processing Agreement for Personal Data",
  "Data Sharing Agreement for Product Data",
  "Proof of Concept or Piloting",
  "Other:",
];

const ICT_PRICE_RANGE = [
  "0-100 kEUR",
  "100-500 kEUR",
  "500 kEUR-1 mEUR",
  "1-5 mEUR",
  "5+ mEUR",
  "To be confirmed later",
];

const MA_PRICE_RANGE = [
  "0-100 kEUR",
  "100 kEUR- 1 mEUR",
  "1-10 mEUR",
  "10-50 mEUR",
  "50+ mEUR",
  "To be confirmed later",
];

const CONSTRUCTION_PRICE_RANGE = [
  "0-50 kEUR",
  "50-100 kEUR",
  "100 kEUR-1 mEUR",
  "1 mEUR-10 mEUR",
  "10+ mEUR",
  "To be confirmed later",
];

const SALE_OBJECT = [
  "Plot/Parcel of Land",
  "Shares in a Real Estate Company",
  "Shares in a Housing Association",
  "Other",
];

const BUYER_SELLER = ["I am the buyer", "I am the seller"];

const DUE_DILIGENCE = [
  "'Red flag' report - report outlines significant legal concerns only",
  "Long form report - report provides a comprehensive review of all legal matters related to the target",
  "Legal Due Diligence inspection not needed",
];

const REFINANCE_TYPE = ["I am the lender", "I am the borrower"];
const FINANCE_ACT = [
  "On my own behalf only",
  "On my own behalf and for other lenders",
];

const YES_NO = ["Yes", "No"];

/** @type {Record<string, { required: string[], arrays?: string[], options: Record<string, string[]>, notes?: string }>} */
export const ROUTE_FIELD_CATALOG = {
  "/contracts/sales-b2b": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "A sales contract template for the client's B2B business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.",
        "Legal review of a contract template sent by a customer of the client and possible further assistance during later negotiation rounds.",
        "Legal review of comments from a customer of the client on the client's contract template and possible further assistance during later negotiation rounds.",
      ],
    },
    notes:
      "description is ONLY a brief line of business / products or services sold — never the case story. Put why we need support, the contract or negotiation, and other case facts in background. Fill confidential when need is a review/negotiation option and counterparty details exist.",
  },

  "/contracts/sales-b2c": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.",
        "Legal review of comments from a customer of the Client on the Client's contract template and possible further assistance during later negotiation rounds.",
      ],
    },
    notes:
      "description is ONLY a brief line of business / products or services sold — never the case story. Put why we need support, the customer comments, and other case facts in background.",
  },

  "/contracts/sourcing-agreement": {
    required: ["templateType", "description", "background", "requestTitle"],
    options: {
      templateType: [
        "General in nature, applicable to buying of all or most products and services",
        "Customized for the buying of a specific product or service type",
      ],
    },
  },

  "/contracts/sourcing-comments": {
    required: [
      "description",
      "priceRange",
      "background",
      "requestTitle",
    ],
    options: { priceRange: MA_PRICE_RANGE },
    notes:
      'priceRange is required. If the expected agreement value is unknown, use exactly "To be confirmed later". description MUST briefly describe the product or service the client is buying with the agreement sent by the supplier. If the case context states the number of pages in that agreement, include the page count in description. Put why we need support and other case facts in background.',
  },

  "/contracts/sourcing-negotiation": {
    required: [
      "negotiationType",
      "description",
      "priceRange",
      "background",
      "requestTitle",
    ],
    options: {
      negotiationType: ["My contract template", "Supplier's contract template"],
      priceRange: MA_PRICE_RANGE,
    },
    notes:
      'priceRange is required. If the expected contract value is unknown, use exactly "To be confirmed later". description is ONLY the product or service — put the case/negotiation facts in background.',
  },

  "/contracts/ict-template": {
    required: ["templateboxes", "description", "background", "requestTitle"],
    arrays: ["templateboxes"],
    options: { templateboxes: ICT_TEMPLATE_BOXES },
  },

  "/contracts/ict-review": {
    required: [
      "templateboxes",
      "description",
      "priceRange",
      "background",
      "requestTitle",
    ],
    arrays: ["templateboxes"],
    options: {
      templateboxes: ICT_TEMPLATE_BOXES,
      priceRange: ICT_PRICE_RANGE,
    },
    notes:
      'description should briefly describe the product/service being bought AND, when known from context, the total number of pages requiring legal review. If page count is missing from the case context, include a Suggested Optimizations tip to add it in the brief description of the product or service section.',
  },

  "/contracts/ict-negotiation": {
    required: [
      "templateboxes",
      "negotiationType",
      "description",
      "priceRange",
      "background",
      "requestTitle",
    ],
    arrays: ["templateboxes"],
    options: {
      templateboxes: ICT_TEMPLATE_BOXES,
      negotiationType: [
        "My contract template",
        "Counterparty's contract template",
      ],
      priceRange: ICT_PRICE_RANGE,
    },
  },

  "/contracts/emp-contract": {
    required: ["areaboxes", "description", "background", "requestTitle"],
    arrays: ["areaboxes"],
    options: {
      areaboxes: [
        "Employment Contract",
        "Employment Contract (Executive)",
        "Managing Director Contract",
      ],
    },
  },

  "/contracts/emp-documents": {
    required: ["areaboxes", "background", "requestTitle"],
    arrays: ["areaboxes"],
    options: {
      areaboxes: [
        "Mutual Termination Agreement (Exit Agreement)",
        "Written Warning",
        "Termination Notice",
        "Document Templates Required to Perform Change Negotiations from Beginning to End",
        "Employment Policy (for example, a Remote Working Policy or a Company Car Policy)",
        "Other Template(s)",
      ],
    },
    notes: "If Other Template(s) selected, fill otherArea.",
  },

  "/contracts/emp-negotiation": {
    required: ["areaboxes", "description", "background", "requestTitle"],
    arrays: ["areaboxes"],
    options: {
      areaboxes: [
        "Employment Contract",
        "Managing Director Contract",
        "Mutual Termination Agreement",
        "Contract regarding Employment Benefits",
        "Settlement Agreement regarding a Dispute with Employee or Managing Director",
        "Other",
      ],
    },
    notes: "If Other selected, fill otherTopic.",
  },

  "/contracts/dispute-court": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "Full legal representation in pending court proceedings (including, for example, drafting of legal briefs, representation in court hearings and related attorney-client communications)",
        "Occasional support with pending court proceedings (including, for example, commenting on legal briefs or advising on legal strategy during different stages of the proceedings, if requested)",
      ],
    },
    notes:
      "description must cover the dispute matter and current court-proceedings status (who started, what has happened so far, any pending court response/deadline). Record the amount claimed and the nature of the claim when known. State what is alleged in outline only — do not reproduce pleadings, set out the member's counter-arguments, or characterise the strength of either side. Do not put those status facts in background.",
  },

  "/contracts/dispute-arbitration": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "Full legal representation in pending arbitration proceedings (including, for example, drafting of legal briefs, representation in arbitration hearings and related attorney-client communications)",
        "Occasional support with pending arbitration proceedings (including, for example, commenting on legal briefs or advising on legal strategy during different stages of the proceedings, if requested)",
      ],
    },
    notes:
      "description must cover the dispute matter and current arbitration status (who started, what has happened so far, any pending tribunal response/deadline). Record the amount claimed and the nature of the claim when known. State what is alleged in outline only — do not reproduce pleadings, set out the member's counter-arguments, or characterise the strength of either side. Do not put those status facts in background.",
  },

  "/contracts/dispute-settlement": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "Full legal representation in settlement negotiations (including, for example, drafting of a settlement agreement, negotiations with the counterparty and related attorney-client communications)",
        "Occasional support with settlement negotiations (including, for example, commenting on a draft settlement agreement or advising on legal strategy during different stages of the negotiations, if requested)",
      ],
    },
    notes:
      "description must cover the dispute matter and current settlement-negotiation status (what has happened so far, any pending response/deadline to the counterparty). Record the amount claimed and the nature of the claim when known. State what is alleged in outline only — do not reproduce pleadings, set out the member's counter-arguments, or characterise the strength of either side. Do not put those status facts in background.",
  },

  "/contracts/dispute-debt": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "A legal letter addressed to a debtor demanding payment of an outstanding debt. The work includes the preparation of the legal letter, necessary revisions on the basis of the Client's feedback and sending the finalized legal letter to the debtor.",
        "Occasional legal support with a debt collection process (including, for example, legal review of communications from the debtor or legal advice regarding next steps during different stages of the collection process, if requested).",
      ],
    },
    notes:
      "description must cover the receivable/claim status (amount claimed, nature of the claim, actions taken so far, grounds for non-payment as alleged). State the claim in outline only — do not reproduce pleadings, set out the member's counter-arguments, or characterise the strength of either side. Do not put those core status facts in background.",
  },

  "/requests/mergers-acquisitions": {
    required: [
      "supportType",
      "customerType",
      "objectType",
      "priceRange",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the transaction process, including but not limited to a legal due diligence inspection of the target with a written report of findings (as required by Client), drafting/commenting of a sale and purchase agreement and related legal documents, required negotiations with the counterparty and support with completion of signing/closing related legal items.",
        "Occasional legal support with the transaction process when needed (for example, commenting of transactional documents or legal advice during different stages of the transaction)",
        "A sale and purchase agreement. The work includes the preparation of the first version of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A letter of intent. The work includes the preparation of the first version of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A legal due diligence inspection of the target with a written report of findings.",
      ],
      customerType: BUYER_SELLER,
      objectType: [
        "All shares in the target company (share purchase)",
        "Majority of shares in the target company (share purchase)",
        "Minority stake in the target company (share purchase)",
        "Entire business of the target company (business purchase)",
        "Specific assets of the target company (asset purchase)",
      ],
      priceRange: MA_PRICE_RANGE,
      dueDiligence: DUE_DILIGENCE,
    },
    notes:
      "Buy-side (customerType \"I am the buyer\") share or business acquisition: if the user has not addressed due diligence, include a red flag legal DD report — it is the ordinary position and omitting it or selecting \"Legal Due Diligence inspection not needed\" mis-prices the transaction. Prefer comprehensive transaction support unless the user clearly limited the ask to LOI-only, SPA-document-only, or occasional advice. Set dueDiligence to \"'Red flag' report - report outlines significant legal concerns only\". Honour an explicit long-form or no-DD choice. Fill dueDiligence whenever supportType is comprehensive support or DD-only inspection. If the case context did not specify the DD format, always include a Suggested Optimizations tip asking the user to check/confirm it. If the briefing does not make clear whether the transaction is a share purchase or a purchase of assets / the business, ask before drafting — do not infer from how they describe the deal.",
  },

  "/contracts/re-sale": {
    required: [
      "supportType",
      "saleObject",
      "customerType",
      "priceRange",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the transaction process, including but not limited to a legal due diligence inspection of the target with a written report of findings (as required by Client), drafting/commenting of a sale and purchase agreement and related legal documents, required negotiations with the counterparty and support with completion of signing/closing related legal items.",
        "Occasional legal support with the transaction process when needed (for example, commenting of transactional documents or legal advice during different stages of the transaction).",
        "A sale and purchase agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A letter of intent. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A legal due diligence inspection of the target with a written report of findings.",
      ],
      saleObject: SALE_OBJECT,
      customerType: BUYER_SELLER,
      priceRange: MA_PRICE_RANGE,
      dueDiligence: DUE_DILIGENCE,
    },
    notes: "If saleObject is Other, fill otherObject. Fill dueDiligence when the selected support includes a DD reporting-format field (comprehensive support or DD-only). If the user has not addressed due diligence, default to a red flag report on the buy side and always include a Suggested Optimizations tip asking them to check/confirm the due diligence format. Describe the property only with facts given in the case context. If location, floor area, or building stock are unknown, omit them from description/background — do not write that they will be completed in the Request. If the briefing does not make clear whether the property is transferred directly or through shares in a property company (or housing company), ask before drafting — do not infer from a description of the building or premises.",
  },

  "/contracts/re-leaseback": {
    required: [
      "supportType",
      "saleObject",
      "customerType",
      "priceRange",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the transaction process, including but not limited to a legal due diligence inspection of the target with a written report of findings (as required by Client), drafting/commenting of a sale and purchase agreement, lease agreement and related legal documents, required negotiations with the counterparty and support with completion of signing/closing related legal items.",
        "Occasional legal support with the transaction process when needed (for example, commenting of transactional documents or legal advice during different stages of the transaction).",
        "A sale and purchase agreement and a lease agreement. The work includes the preparation of the first version of the documents and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A letter of intent. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
        "A legal due diligence inspection of the target with a written report of findings.",
      ],
      saleObject: SALE_OBJECT,
      customerType: ["I am buyer and lessor", "I am seller and lessee"],
      priceRange: MA_PRICE_RANGE,
      dueDiligence: DUE_DILIGENCE,
    },
    notes:
      "customerType is leaseback-specific: buying and leasing as lessor = \"I am buyer and lessor\"; selling and leasing as lessee = \"I am seller and lessee\". Map clear buyer/seller language from context to these exact values. If saleObject is Other, fill otherObject. Fill dueDiligence when the selected support includes a DD reporting-format field. If the user has not addressed due diligence, default to a red flag report on the buy side (buyer and lessor) and always include a Suggested Optimizations tip asking them to check/confirm the due diligence format. Describe the property only with facts given in the case context; do not write that missing location, size, or building stock will be completed in the Request. If the briefing does not make clear whether the property is transferred directly or through shares in a property company (or housing company), ask before drafting — do not infer from a description of the building or premises.",
  },

  "/contracts/re-lease": {
    required: [
      "supportType",
      "agreementType",
      "customerType",
      "rentRange",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the lease agreement negotiation process, including but not limited to drafting/commenting of the lease agreement and related legal documents and required negotiations with the counterparty.",
        "Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of lease agreement documentation or legal advice during different stages of the process).",
        "A lease agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
      ],
      agreementType: [
        "Lease of business premises",
        "Lease of residential premises",
        "Lease of plot or parcel of land",
      ],
      customerType: ["Lessor (landlord)", "Lessee (tenant)"],
      rentRange: [
        "0-1 kEUR",
        "1-10 kEUR",
        "10-50 kEUR",
        "50+ kEUR",
        "To be confirmed later",
      ],
    },
    notes:
      "If agreementType is Lease of business premises and the case context does not mention property size (e.g. m²), include a Suggested Optimizations tip asking the user to add the leased premises size.",
  },

  "/contracts/re-easement": {
    required: ["supportType", "description", "background", "requestTitle"],
    options: {
      supportType: [
        "Comprehensive legal support throughout the easement agreement negotiation process, including but not limited to drafting/commenting of the easement agreement and related documents (except for maps and other primarily technical documents), required negotiations with the counterparty and participation in related meetings (if any) with competent authorities.",
        "Occasional legal support with the easement agreement negotiation process when needed (for example, commenting of easement agreement documentation or legal advice during different stages of the process).",
        "An easement agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
      ],
    },
    notes:
      "When known from context, put property identification codes / corresponding property identifiers in confidential together with counterparty details. If those identifiers are missing from the case context, include a Suggested Optimizations tip to add them in the counterparty section.",
  },

  "/contracts/re-landuse": {
    required: ["supportType", "description", "background", "requestTitle"],
    options: {
      supportType: [
        "Comprehensive legal support throughout the land use agreement negotiation process, including but not limited to drafting/commenting of the land use agreement and related documents (except for maps and other primarily technical documents), required negotiations with the counterparty and participation in related meetings (if any) with competent authorities.",
        "Occasional legal support with the land use agreement negotiation process when needed (for example, commenting of land use agreement documentation or legal advice during different stages of the process).",
        "A land use agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
      ],
    },
    notes:
      "When known from context, put property identification codes / corresponding property identifiers in confidential together with counterparty details. If those identifiers are missing from the case context, include a Suggested Optimizations tip to add them in the counterparty section.",
  },

  "/contracts/re-construction": {
    required: [
      "supportType",
      "customerType",
      "priceRange",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the construction contract negotiation process, including but not limited to drafting/commenting of the construction contract and negotiations with the counterparty. The work does not include drafting of scope of construction work descriptions or other non-legal documents of primarily technical nature.",
        "Occasional legal support with the construction contract negotiation process when needed (for example, commenting of construction contract documentation or legal advice during different stages of the process).",
        "A construction contract. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty or preparation of non-legal documents of primarily technical nature such as technical scope of work descriptions) is not included.",
      ],
      customerType: [
        "Property owner as buyer of construction services",
        "Main contractor as buyer of construction services",
        "Subcontractor as buyer of construction services",
        "Main contractor as seller of construction services",
        "Subcontractor as seller of construction services",
      ],
      priceRange: CONSTRUCTION_PRICE_RANGE,
    },
    notes:
      "Always ask for counterparty name, business ID, and country of domicile before drafting if missing from case context; put answered details in confidential. Applies for all supportType options including the template-style construction contract. If the case context states an expected contract value, set priceRange to the matching catalog band (e.g. ~2.8 mEUR → \"1 mEUR-10 mEUR\"). Do not use \"To be confirmed later\" when a figure is given.",
  },

  "/contracts/finance-debt": {
    required: [
      "supportType",
      "refinanceType",
      "termSign",
      "agreementCoverage",
      "debtSecurance",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the refinancing process (including but not limited to drafting or commenting of a facility/facilities agreement and related legal documentation, required negotiations with the counterparty and drafting/collecting or reviewing of customary conditions precedent documents)",
        "Occasional legal support with the refinancing process when needed (for example, commenting of facility/facilities agreement documentation or specific legal advice during different stages of the process)",
      ],
      refinanceType: REFINANCE_TYPE,
      financeAct: FINANCE_ACT,
      termSign: [
        "Yes, a signed term sheet is available",
        "No, a term sheet has not yet been signed. Legal support for negotiating a term sheet shall be included in the work performed under this LEXIFY Request.",
        "No, a term sheet has not yet been signed. Legal support for negotiating a term sheet does not need to be included in the work performed under this LEXIFY Request.",
      ],
      agreementCoverage: [
        "Investment grade",
        "Leveraged",
        "Not known at this stage",
      ],
      debtSecurance: [
        "Unsecured - the debt will not be backed by any collateral",
        "Secured - the debt will be backed by specific collateral",
      ],
    },
    notes:
      "If refinanceType is lender, fill financeAct. If secured, fill assetDescription. Use counterparty (not confidential).",
  },

  "/contracts/finance-debt-terms": {
    required: [
      "supportType",
      "refinanceType",
      "debtSecurance",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Comprehensive legal support throughout the amendment process (including but not limited to drafting or commenting of an LMA-based amendment agreement (together with an amended and restated facilities agreement, if applicable) and related legal documentation, required negotiations with the counterparty and drafting/collecting or reviewing of customary conditions precedent documents)",
        "Occasional legal support with the amendment process when needed (for example, commenting of amendment agreement documentation or specific legal advice during different stages of the process)",
      ],
      refinanceType: REFINANCE_TYPE,
      financeAct: FINANCE_ACT,
      debtSecurance: [
        "Unsecured - the debt will not be backed by any collateral",
        "Secured - the debt will be backed by specific collateral",
      ],
    },
  },

  "/contracts/finance-breach-waiver": {
    required: [
      "supportType",
      "refinanceType",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      supportType: [
        "Legal support with preparing a breach waiver (including drafting and/or commenting of requisite documentation to execute a waiver of breach of specific finance documents and required correspondence with the counterparty)",
      ],
      refinanceType: REFINANCE_TYPE,
      financeAct: FINANCE_ACT,
    },
  },

  "/contracts/data-breach": {
    required: [
      "areaboxes",
      "description",
      "background",
      "requestTitle",
    ],
    arrays: ["areaboxes"],
    options: {
      areaboxes: [
        "Legal support with creating for the Client an internal process and relevant document templates for reacting to personal data breaches",
        "Legal guidance for the Client on how to react to a personal data breach that has already occurred",
        "Legal support for the Client with authority communications related to a personal data breach",
        "Legal support for the Client with court proceedings related to a personal data breach",
      ],
      involvedParties: [
        "Yes, another identified company is involved",
        "No other company is involved",
      ],
    },
    notes:
      "description is ONLY a brief description of the company's line of business — never the incident story. For reactive scopes (already occurred / authority communications / court proceedings), put the breach facts in breachStatus: what data was impacted, when the breach occurred, and what actions have been taken so far. Fill involvedParties; if another company is involved fill breachCompany. Also fill companyRevenue, employeeCount, customerCount when known.",
  },

  "/contracts/gdpr-compliance": {
    required: [
      "description",
      "appDocumentation",
      "existingData",
      "dedicatedOwners",
      "aiUsage",
      "profiling",
      "interviewLocation",
      "background",
      "requestTitle",
    ],
    options: {
      appDocumentation: YES_NO,
      existingData: YES_NO,
      dedicatedOwners: YES_NO,
      aiUsage: YES_NO,
      profiling: YES_NO,
      interviewLocation: [
        "In person at a specific location",
        "Remotely (for example, over Microsoft Teams)",
        "Both in person and remotely",
      ],
    },
    notes:
      "Fill follow-up text fields when Yes (documentDescription, dataDescription, aiDescription, profilingDescription, locationDescription). Fill org stats when known.",
  },

  "/contracts/privacy-documentation": {
    required: [
      "areaboxes",
      "documentType",
      "description",
      "background",
      "requestTitle",
    ],
    arrays: ["areaboxes", "individualBoxes"],
    options: {
      areaboxes: [
        "Privacy Statement or Notice (informing of data subjects)",
        "Data Subject Consent",
        "Record of Processing Activities (RoPa)",
        "Personal Data Protection Impact Assessment (DPIA)",
        "Balancing Test",
        "Other",
      ],
      documentType: ["Empty template(s) only", "Fully finalized document(s)"],
      documentCoverage: [
        "A single IT application, solution, product or activity (for example, online store, gaming application or employee survey)",
        "An entire process with various data usage activities and IT tools involved (for example, employee or customer data management or a product/service consisting of various individual solutions and data collection points)",
        "Other",
      ],
      individualBoxes: [
        "Employees",
        "Customers",
        "Suppliers or Other 3rd Parties",
        "Business Stakeholders",
        "Application Users",
        "Research Participants",
        "Other",
      ],
    },
    notes:
      "Fill documentCoverage and individualBoxes when known. If areaboxes includes Other, fill otherArea. If documentCoverage is Other, fill otherCoverage. If individualBoxes includes Other, fill otherIndividiual. ALWAYS fill companyRevenue, employeeCount, and customerCount when the case context states them (free-text; do not omit employee headcount if given).",
  },

  "/contracts/data-question": {
    required: ["description", "background", "requestTitle", "pricingType"],
    options: {
      pricingType: ["Hourly Rate", "Fixed Fee"],
    },
    notes:
      "Default pricingType to Hourly Rate unless the user clearly asked for a lump sum or fixed fee. Include maxPrice only when pricingType is Fixed Fee AND the user stated an exact maximum spend — otherwise leave maxPrice empty. Do not fill or mention maxPrice when pricingType is Hourly Rate.",
  },

  "/requests/kyc": {
    required: ["need", "description", "background", "requestTitle"],
    options: {
      need: [
        "Legal support with responding to a KYC (Know Your Customer) questionnaire sent to the Client by a financial institution or other supplier of products or services.",
        "Responding to a compliance related questionnaire prepared by the Client and intended for the Client's internal use.",
      ],
    },
  },

  "/requests/legal-advice": {
    required: [
      "need",
      "areaboxes",
      "description",
      "background",
      "requestTitle",
    ],
    arrays: ["areaboxes"],
    options: {
      need: [
        "Occasional day-to-day legal advice on specific areas of law, as needed from time to time.",
        "A fixed monthly number of hours of day-to-day legal support on specific areas of law, as needed from time to time.",
      ],
      hourAmount: ["5 hours", "10 hours", "15 hours", "20 hours", "Other"],
      monthAmount: [
        "One (1) calendar month",
        "Three (3) calendar months",
        "Six (6) calendar months",
        "One (1) calendar year",
      ],
      areaboxes: [
        "General Corporate Matters",
        "Sales (B2B)",
        "Sales (B2C)",
        "Employment and Labor",
        "Real Estate and Construction",
        "Sourcing",
        "Banking and Finance",
        "ICT and IT",
        "Intellectual Property Rights",
        "Data Privacy",
        "Competition/Antitrust",
        "Environment and Energy",
        "Tax and Structuring",
        "Other",
      ],
    },
    notes:
      "If fixed monthly need selected, also fill hourAmount and monthAmount.",
  },

  "/requests/legal-training": {
    required: [
      "trainDateSelect",
      "trainDuration",
      "trainLocation",
      "description",
      "background",
      "requestTitle",
    ],
    options: {
      trainDateSelect: [
        "On a specific date and time already known",
        "Date and time to be confirmed later",
      ],
      trainDuration: [
        "1 hour",
        "2 hours",
        "4 hours",
        "1 full day",
        "2 full days",
        "Other",
      ],
      trainLocation: [
        "Face to face at a specific location",
        "Remotely (for example, over Microsoft Teams)",
      ],
    },
  },

  "/requests/corporate-governance": {
    required: ["areaboxes", "description", "background", "requestTitle"],
    arrays: ["areaboxes"],
    options: {
      areaboxes: [
        "Comprehensive legal support with arranging a shareholders' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
        "Comprehensive legal support with arranging a board of directors' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
        "Comprehensive legal support with arranging an executive board meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
        "Comprehensive legal support with preparing a notification or application regarding a specific matter (for example, registration of new board members or applying for a business license) to the competent authority (including necessary attorney-client communications, preparation of needed documentation and required communications with the competent authority).",
        "Preparation of a corporate policy for a specific purpose. The work includes the preparation of the first version of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider.",
        "Comprehensive legal support throughout a shareholders' agreement negotiation process (including, but not limited to, drafting the shareholders' agreement and conducting required negotiations with the other parties to the agreement).",
        "A shareholders' agreement (including revisions based on client feedback).",
        "Other corporate governance support:",
      ],
    },
    notes:
      "Fill appDescription / policyDescription when those scopes are selected. Fill confidential for shareholders' agreement scopes when counterparty details exist. If otherSupport is filled, areaboxes MUST include exactly \"Other corporate governance support:\".",
  },
};

export function buildDraftFieldCatalogPrompt() {
  const lines = [
    "ROUTE-SPECIFIC FORM FIELDS (CRITICAL):",
    "After choosing the category, identify the matching Route and fill ALL listed required fields for that route.",
    "Use EXACT option strings from the lists below — never paraphrase radio/select/checkbox values.",
    "Checkbox/array fields must be JSON arrays of exact option strings.",
    "If a price/rent range is unknown, use exactly \"To be confirmed later\". If the case context states a contract value, purchase price, agreement value, rent, or similar euro amount — including an approximate figure — you MUST select the catalog option whose band contains that amount. Do not leave it as \"To be confirmed later\" when a figure has been given (e.g. approximately 2.8 million EUR belongs in the band that includes 2.8 mEUR).",
    "Do NOT include backgroundFiles, supplierFiles, or agree.",
    "Include maxPrice only when the user stated an exact maximum spend for a fixed-fee style scope — use their exact figure, no rounding.",
    "Only omit a required select/radio if the case context truly provides no basis to choose — prefer the closest reasonable option.",
    "",
  ];

  for (const [route, catalog] of Object.entries(ROUTE_FIELD_CATALOG)) {
    lines.push(`Route ${route}:`);
    lines.push(`  Required fields: ${catalog.required.join(", ")}`);
    if (catalog.arrays?.length) {
      lines.push(`  Array fields: ${catalog.arrays.join(", ")}`);
    }
    for (const [field, values] of Object.entries(catalog.options || {})) {
      lines.push(`  ${field} options:`);
      values.forEach((value, index) => {
        lines.push(`    ${index + 1}. ${value}`);
      });
    }
    if (catalog.notes) {
      lines.push(`  Notes: ${catalog.notes}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function coerceToExactOption(value, options) {
  if (!options?.length || value == null || value === "") return null;
  const raw = String(value).trim();
  if (options.includes(raw)) return raw;

  const normalized = normalizeForMatch(raw);
  const exact = options.find((option) => normalizeForMatch(option) === normalized);
  if (exact) return exact;

  const startsWith = options.find(
    (option) =>
      normalizeForMatch(option).startsWith(normalized) ||
      normalized.startsWith(normalizeForMatch(option).slice(0, 80)),
  );
  if (startsWith) return startsWith;

  const includes = options.find((option) =>
    normalizeForMatch(option).includes(normalized.slice(0, 60)),
  );
  return includes || null;
}

function parseMoneyNumber(number, unit) {
  const n = Number(String(number).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const u = String(unit || "").toLowerCase();
  if (u.startsWith("m")) return n * 1_000_000;
  if (u.startsWith("k")) return n * 1_000;
  return n;
}

function parseRangeOption(option) {
  const text = String(option || "").trim();
  if (!text || /to be confirmed later/i.test(text)) return null;

  const plus = text.match(/^(\d+(?:[.,]\d+)?)\+\s*(kEUR|mEUR)$/i);
  if (plus) {
    return {
      option: text,
      min: parseMoneyNumber(plus[1], plus[2]),
      max: Infinity,
    };
  }

  const range = text.match(
    /^(\d+(?:[.,]\d+)?)\s*(kEUR|mEUR)?\s*-\s*(\d+(?:[.,]\d+)?)\s*(kEUR|mEUR)$/i,
  );
  if (!range) return null;
  const rightUnit = range[4];
  const leftUnit = range[2] || rightUnit;
  return {
    option: text,
    min: parseMoneyNumber(range[1], leftUnit),
    max: parseMoneyNumber(range[3], rightUnit),
  };
}

function optionContainingAmount(options, amount) {
  if (!Number.isFinite(amount) || amount < 0 || !options?.length) return null;

  const parsed = options
    .map(parseRangeOption)
    .filter((item) => item && Number.isFinite(item.min))
    .sort((a, b) => a.min - b.min);

  for (let i = 0; i < parsed.length; i += 1) {
    const upper = parsed[i + 1] ? parsed[i + 1].min : parsed[i].max;
    if (amount >= parsed[i].min && amount < upper) return parsed[i].option;
    if (
      i === parsed.length - 1 &&
      amount >= parsed[i].min &&
      amount <= parsed[i].max
    ) {
      return parsed[i].option;
    }
  }

  return null;
}

function extractEuroAmounts(text) {
  const src = String(text || "");
  if (!src.trim()) return [];

  const found = [];

  const pushAmount = (rawNumber, unit, index, length) => {
    const amount = parseMoneyNumber(rawNumber, unit);
    if (!Number.isFinite(amount) || amount <= 0) return;
    found.push({
      amount,
      index,
      snippet: src.slice(Math.max(0, index - 70), index + length + 70),
    });
  };

  const millionRe =
    /(\d+(?:[.,]\d+)?)\s*(?:million|miljoona(?:a)?|miljoner|m(?:eur)?)\b(?:\s*(?:eur(?:o(?:s|a)?)?|€))?/gi;
  for (const match of src.matchAll(millionRe)) {
    pushAmount(match[1], "m", match.index ?? 0, match[0].length);
  }

  const thousandRe =
    /(\d+(?:[.,]\d+)?)\s*(?:thousand|tuhatta|tusen|k(?:eur)?)\b(?:\s*(?:eur(?:o(?:s|a)?)?|€))?/gi;
  for (const match of src.matchAll(thousandRe)) {
    pushAmount(match[1], "k", match.index ?? 0, match[0].length);
  }

  const plainEuroRe =
    /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[.,]\d+)?\s*(?:€|eur(?:o(?:s|a)?)?)\b/gi;
  for (const match of src.matchAll(plainEuroRe)) {
    const digits = match[1].replace(/[ \u00a0]/g, "");
    if (digits.length < 4 && !match[0].includes(",")) continue;
    pushAmount(digits, "", match.index ?? 0, match[0].length);
  }

  return found;
}

function scoreAmountCandidate(candidate, field) {
  const snippet = candidate.snippet.toLowerCase();
  if (
    /max(?:imum)?\s+price|enimmäishinta|legal\s+(?:fee|service)|hourly\s+rate/.test(
      snippet,
    )
  ) {
    return -100;
  }

  let score = 1;
  if (
    /contract\s+value|purchase\s+price|expected\s+(?:contract|agreement|purchase|value)|agreement\s+value|kauppahinta|urakkahinta|sopimuksen\s+arvo|köpeskilling|transaktions/.test(
      snippet,
    )
  ) {
    score += 8;
  }
  if (/rent|vuokra|hyra/.test(snippet)) {
    score += field === "rentRange" ? 8 : -4;
  }
  return score;
}

function pickStatedAmount(text, field) {
  const candidates = extractEuroAmounts(text);
  if (!candidates.length) return null;

  const unique = [];
  for (const candidate of candidates) {
    const existing = unique.find(
      (item) => Math.abs(item.amount - candidate.amount) / item.amount < 0.01,
    );
    if (existing) {
      existing.snippet += ` ${candidate.snippet}`;
    } else {
      unique.push({ ...candidate });
    }
  }

  unique.sort(
    (a, b) => scoreAmountCandidate(b, field) - scoreAmountCandidate(a, field),
  );
  const best = unique[0];
  if (!best || scoreAmountCandidate(best, field) < 0) return null;
  return best.amount;
}

export function applyStatedMonetaryRange(draftData, route, caseContextText = "") {
  const catalog = ROUTE_FIELD_CATALOG[route];
  if (!catalog || !draftData || typeof draftData !== "object") return draftData;

  const result = { ...draftData };
  const combined = [
    caseContextText,
    result.description,
    result.background,
    result.requestTitle,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");

  const applyField = (field) => {
    const options = catalog.options?.[field];
    if (!options?.length) return;
    const amount = pickStatedAmount(combined, field);
    if (!amount) return;
    const matched = optionContainingAmount(options, amount);
    if (!matched) return;

    const current = typeof result[field] === "string" ? result[field].trim() : "";
    if (
      !current ||
      /to be confirmed later/i.test(current) ||
      optionContainingAmount([current], amount) !== current
    ) {
      result[field] = matched;
    }
  };

  applyField("priceRange");
  applyField("rentRange");
  return result;
}

export function coerceDraftFieldsForRoute(route, draftData) {
  const catalog = ROUTE_FIELD_CATALOG[route];
  if (!catalog || !draftData || typeof draftData !== "object") return draftData;

  const result = { ...draftData };
  const arrayFields = new Set(catalog.arrays || []);

  // Leaseback uses different buyer/seller labels than M&A / re-sale
  if (route === "/contracts/re-leaseback" && typeof result.customerType === "string") {
    const normalized = normalizeForMatch(result.customerType);
    if (
      normalized === "i am the buyer" ||
      normalized === "i am buyer" ||
      normalized === "i am buyer and lessor" ||
      (/\bbuyer\b/.test(normalized) && /\blessor\b/.test(normalized)) ||
      (/\bbuying\b/.test(normalized) && !/\bselling\b/.test(normalized))
    ) {
      result.customerType = "I am buyer and lessor";
    } else if (
      normalized === "i am the seller" ||
      normalized === "i am seller" ||
      normalized === "i am seller and lessee" ||
      (/\bseller\b/.test(normalized) && /\blessee\b/.test(normalized)) ||
      (/\bselling\b/.test(normalized) && !/\bbuying\b/.test(normalized))
    ) {
      result.customerType = "I am seller and lessee";
    }
  }

  for (const [field, options] of Object.entries(catalog.options || {})) {
    if (!(field in result)) continue;

    if (arrayFields.has(field)) {
      const values = Array.isArray(result[field])
        ? result[field]
        : [result[field]];
      const coerced = values
        .map((value) => coerceToExactOption(value, options))
        .filter(Boolean);
      if (coerced.length) {
        result[field] = [...new Set(coerced)];
      } else {
        delete result[field];
      }
      continue;
    }

    const coerced = coerceToExactOption(result[field], options);
    if (coerced) {
      result[field] = coerced;
    } else {
      delete result[field];
    }
  }

  // Sensible fallbacks when LLM omitted known "unknown" options
  if (
    catalog.options.priceRange &&
    !result.priceRange &&
    catalog.required.includes("priceRange")
  ) {
    result.priceRange = "To be confirmed later";
  }
  if (
    catalog.options.rentRange &&
    !result.rentRange &&
    catalog.required.includes("rentRange")
  ) {
    result.rentRange = "To be confirmed later";
  }

  // Finance breach waiver has a single supportType option
  if (
    route === "/contracts/finance-breach-waiver" &&
    !result.supportType &&
    catalog.options.supportType?.[0]
  ) {
    result.supportType = catalog.options.supportType[0];
  }

  // Corporate governance: otherSupport implies the Other checkbox
  if (route === "/requests/corporate-governance") {
    const otherOption = "Other corporate governance support:";
    const hasOtherText =
      typeof result.otherSupport === "string" && result.otherSupport.trim();
    let areas = Array.isArray(result.areaboxes) ? [...result.areaboxes] : [];

    areas = areas.map((value) => {
      const normalized = normalizeForMatch(value);
      if (
        normalized === "other:" ||
        normalized === "other" ||
        normalized.includes("other corporate governance support")
      ) {
        return otherOption;
      }
      return value;
    });

    if (hasOtherText && !areas.includes(otherOption)) {
      areas.push(otherOption);
    }

    if (areas.length) {
      result.areaboxes = [...new Set(areas)];
    }
  }

  // Keep maxPrice when the model/user provided a value; strip empty
  if (
    result.maxPrice == null ||
    (typeof result.maxPrice === "string" && !result.maxPrice.trim())
  ) {
    delete result.maxPrice;
  }

  if (route === "/contracts/data-question") {
    if (!result.pricingType) {
      result.pricingType = "Hourly Rate";
    }
    if (result.pricingType !== "Fixed Fee") {
      delete result.maxPrice;
    }
  }

  delete result.backgroundFiles;
  delete result.supplierFiles;
  delete result.agree;

  return result;
}
