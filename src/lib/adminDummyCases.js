/** Admin-only sample dashboard / available-request cases (demo content). */

export const DUMMY_ID_MIN = 9_000_000;
export const DUMMY_ID_MAX = 9_099_999;

export const DUMMY_IDS = {
  AVAIL_B2B: 9_000_101,
  AVAIL_PRIVACY: 9_000_102,
  AVAIL_EMP: 9_000_103,

  PEND_B2B: 9_001_001,
  PEND_EMP: 9_001_002,
  PEND_DPA: 9_001_003,

  OFFER_OULU_REQ: 9_001_101,
  OFFER_HQ_REQ: 9_001_102,

  AWAIT_BETA: 9_002_001,
  AWAIT_OFFER_1: 9_002_101,
  AWAIT_OFFER_2: 9_002_102,
  AWAIT_OFFER_3: 9_002_103,
  AWAIT_OFFER_4: 9_002_104,
  AWAIT_OFFER_5: 9_002_105,

  EXP_SUPPLIER: 9_003_001,
  EXP_NDA: 9_003_002,
  EXP_EMP: 9_003_003,

  CON_NDA: 9_004_001,
  CON_EMP: 9_004_002,

  POFFER_OULU: 9_008_001,
  POFFER_HQ: 9_008_002,

  EOFFER_BETA: 9_003_101,
  EOFFER_NDA: 9_003_102,

  INVITE_PENDING: 9_005_001,
  INVITE_JOINED: 9_005_002,

  RATED_VIRTANEN: 9_006_001,
  RATED_IURIS: 9_006_002,
  RATED_WEXA: 9_006_003,
};

const PURCHASER = {
  companyName: "SilverProperties Oy",
  businessId: "1234567-8",
  companyCountry: "Finland",
};

const PROVIDER_LEXIFY = {
  companyName: "Lexify Legal Services",
  businessId: "7654321-0",
  companyCountry: "Finland",
};

export function isAdminRole(role) {
  return String(role || "").toUpperCase() === "ADMIN";
}

export function isDummyId(id) {
  if (id == null || id === "") return false;
  const n = typeof id === "bigint" ? Number(id) : Number(String(id));
  return Number.isFinite(n) && n >= DUMMY_ID_MIN && n <= DUMMY_ID_MAX;
}

export function withAdminDummyRows(role, dummyRows, realRows) {
  if (!isAdminRole(role)) return realRows || [];
  return [...(dummyRows || []), ...(realRows || [])];
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function clientFields(company = PURCHASER) {
  return {
    companyName: company.companyName,
    businessId: company.businessId,
    companyCountry: company.companyCountry,
    clientCompanyName: company.companyName,
    client: {
      companyName: company.companyName,
      companyId: company.businessId,
      companyCountry: company.companyCountry,
    },
    clientCompany: {
      companyName: company.companyName,
      businessId: company.businessId,
      companyCountry: company.companyCountry,
    },
  };
}

function makeRequest({
  requestId,
  title,
  requestCategory,
  requestSubcategory = null,
  assignmentType = null,
  primaryContactPerson,
  scopeOfWork,
  description,
  additionalBackgroundInfo = "No additional background information.",
  currency = "EUR",
  paymentRate = "Lump sum fixed fee",
  advanceRetainerFee = "No",
  invoiceType = "On a monthly basis, invoice sent at end of each calendar month",
  language = "English",
  offersDeadlineHours = 48,
  dateCreatedDaysAgo = 2,
  requestState = "PENDING",
  confidential = "no",
  maximumPrice = null,
  additionalQuestions = {},
  providerReferences = "No",
  company = PURCHASER,
  extraDetails = {},
}) {
  const offersDeadline = hoursFromNow(offersDeadlineHours);
  const dateCreated = daysAgo(dateCreatedDaysAgo);
  const confidentialYes =
    String(confidential).trim().toLowerCase() === "yes" ||
    confidential === true;

  return {
    requestId,
    requestState,
    title,
    requestCategory,
    requestSubcategory,
    assignmentType,
    primaryContactPerson,
    scopeOfWork,
    description,
    additionalBackgroundInfo,
    backgroundInfoFiles: [],
    supplierCodeOfConductFiles: [],
    currency,
    paymentRate,
    advanceRetainerFee,
    invoiceType,
    language,
    providerReferences,
    dateCreated,
    dateExpired: offersDeadline,
    offersDeadline,
    maximumPrice,
    confidential: confidentialYes ? "yes" : "no",
    winnerBidderOnlyStatus: confidentialYes
      ? "Disclosed to Winning Bidder Only"
      : "",
    ...clientFields(company),
    details: {
      confidential: confidentialYes ? "yes" : "no",
      winnerBidderOnlyStatus: confidentialYes
        ? "Disclosed to Winning Bidder Only"
        : "",
      additionalQuestions,
      maximumPrice,
      offersDeadline,
      assignmentType,
      ...extraDetails,
    },
  };
}

function requestByIdMap() {
  const ouluCompany = {
    companyName: "SilverProperties Oy",
    businessId: "1234567-8",
    companyCountry: "Finland",
  };
  const atlas = {
    companyName: "Atlas Oy",
    businessId: "2468101-2",
    companyCountry: "Finland",
  };
  const odyssey = {
    companyName: "Odyssey Industries Oy",
    businessId: "3141592-6",
    companyCountry: "Finland",
  };
  const tampere = {
    companyName: "Tampere Robotics Ltd",
    businessId: "2718281-8",
    companyCountry: "Finland",
  };
  const rows = [
    makeRequest({
      requestId: DUMMY_IDS.AVAIL_B2B,
      title: "B2B Sales Contract Template",
      requestCategory: "Help with Contracts",
      requestSubcategory: "B2B Sales",
      primaryContactPerson: "John Doe",
      scopeOfWork:
        "A sales contract template for the client's B2B business. The work includes preparation of the template documentation, necessary revisisions based on client feedback and all related attorney-client communication.",
      description:
        "We sell annual SaaS subscriptions to customers in Finland. Need standard terms + negotiation fallback positions.",
      offersDeadlineHours: 26,
      company: odyssey,
    }),
    makeRequest({
      requestId: DUMMY_IDS.AVAIL_PRIVACY,
      title: "Data Privacy Documentation Pack",
      requestCategory: "Help with Personal Data Protection",
      requestSubcategory: "Data Privacy Documentation",
      primaryContactPerson: "Anna Korhonen",
      scopeOfWork:
        "Prepare privacy notices, records of processing, and related GDPR documentation.",
      description:
        "A growth-stage software company needs an up-to-date data privacy documentation set for EU operations.",
      offersDeadlineHours: 5.3,
      confidential: "yes",
      company: {
        companyName: "Disclosed to Winning Bidder Only",
        businessId: "",
        companyCountry: "",
      },
    }),
    makeRequest({
      requestId: DUMMY_IDS.AVAIL_EMP,
      title: "Employment Negotiation Support",
      requestCategory: "Help with Employment related Documents",
      requestSubcategory: "Negotiation Support",
      primaryContactPerson: "Pekka Nieminen",
      scopeOfWork:
        "Support management in negotiating an employment agreement for a senior hire.",
      description:
        "Robotics company hiring a Head of Engineering. Need negotiation support on restrictive covenants and incentive terms.",
      paymentRate: "Blended hourly rate",
      offersDeadlineHours: 1.5,
      company: tampere,
    }),
    makeRequest({
      requestId: DUMMY_IDS.PEND_B2B,
      title: "B2B SaaS Sales Agreement Template",
      requestCategory: "Help with Contracts",
      requestSubcategory: "B2B Sales",
      primaryContactPerson: "Aino Virtanen",
      scopeOfWork:
        "Prepare a B2B sales agreement template for a SaaS subscription business.",
      description:
        "We sell annual SaaS subscriptions to EU customers. Need standard terms + negotiation fallback positions.",
      maximumPrice: 2500,
      offersDeadlineHours: 26,
      dateCreatedDaysAgo: 2,
      additionalQuestions: {
        "Do you need GDPR DPA as appendix?": "",
      },
    }),
    makeRequest({
      requestId: DUMMY_IDS.PEND_EMP,
      title: "Employment Contract Review (Manager)",
      requestCategory: "Help with Employment related Documents",
      requestSubcategory: "Employment Contract Template",
      primaryContactPerson: "Mika Laine",
      scopeOfWork:
        "Review and comment on a draft employment contract for a new manager.",
      description:
        "Finnish company hiring a commercial manager. Need a practical review of the draft contract and mark-up.",
      paymentRate: "Blended hourly rate",
      maximumPrice: null,
      offersDeadlineHours: 3,
      dateCreatedDaysAgo: 5,
      requestState: "ON HOLD",
    }),
    makeRequest({
      requestId: DUMMY_IDS.PEND_DPA,
      title: "Data Processing Agreement (DPA) Draft",
      requestCategory: "Help with Personal Data Protection",
      requestSubcategory: "Data Privacy Documentation",
      primaryContactPerson: "John Doe",
      scopeOfWork: "Draft a GDPR-compliant data processing agreement.",
      description:
        "Need a DPA template that can be attached to customer and vendor contracts.",
      maximumPrice: 1200,
      offersDeadlineHours: 168,
      dateCreatedDaysAgo: 1,
    }),
    makeRequest({
      requestId: DUMMY_IDS.OFFER_OULU_REQ,
      title: "Oulu Logistics Property Sale",
      requestCategory: "Help with Contracts",
      requestSubcategory: "Real Estate and Construction",
      assignmentType: "Sale and Purchase of Real Estate",
      primaryContactPerson: "Laura Virtanen",
      scopeOfWork:
        "Prepare and negotiate the sale and purchase agreement for a logistics property in Oulu.",
      description:
        "Property company disposing of a warehouse and logistics site. Need SPA drafting and negotiation support.",
      offersDeadlineHours: 18,
      dateCreatedDaysAgo: 1,
      company: ouluCompany,
    }),
    makeRequest({
      requestId: DUMMY_IDS.OFFER_HQ_REQ,
      title: "New HQ Lease Negotiations",
      requestCategory: "Help with Contracts",
      requestSubcategory: "Real Estate and Construction",
      assignmentType:
        "Lease of Business Premises, Residential Premises or Land",
      primaryContactPerson: "Mikko Laine",
      scopeOfWork:
        "Support lease negotiations for new headquarters premises, including mark-up of the landlord draft.",
      description:
        "Growing technology company taking a long-term lease of office premises.",
      paymentRate: "Blended hourly rate",
      offersDeadlineHours: 4,
      dateCreatedDaysAgo: 2,
      confidential: "yes",
      company: atlas,
    }),
    makeRequest({
      requestId: DUMMY_IDS.AWAIT_BETA,
      title: "Project Beta",
      requestCategory: "Help with Mergers & Acquisitions",
      primaryContactPerson: "John Doe",
      scopeOfWork:
        "Legal review of a contemplated share acquisition, including key SPA issues and due diligence findings.",
      description:
        "Mid-market acquisition of a Finnish target in the industrial sector.",
      maximumPrice: 15000,
      offersDeadlineHours: -24,
      dateCreatedDaysAgo: 10,
      requestState: "ON HOLD",
      extraDetails: {},
    }),
    makeRequest({
      requestId: DUMMY_IDS.EXP_SUPPLIER,
      title: "Supplier Code of Conduct Alignment",
      requestCategory: "Help with Contracts",
      requestSubcategory: "Sourcing",
      assignmentType: "Legal review of sourcing agreement",
      primaryContactPerson: "Aino Virtanen",
      scopeOfWork:
        "Review supplier code of conduct requirements and align them with the company's sourcing templates.",
      description:
        "International manufacturing group updating supplier compliance documents.",
      maximumPrice: 4000,
      offersDeadlineHours: -55 * 24,
      dateCreatedDaysAgo: 60,
      requestState: "EXPIRED",
    }),
    makeRequest({
      requestId: DUMMY_IDS.EXP_NDA,
      title: "NDA Template for Partners",
      requestCategory: "Help with Contracts",
      requestSubcategory: "B2B Sales",
      primaryContactPerson: "John Doe",
      scopeOfWork:
        "Prepare a mutual NDA template for use with commercial partners.",
      description:
        "Property and investment company needs a practical NDA for recurring partner discussions.",
      maximumPrice: 900,
      offersDeadlineHours: -38 * 24,
      dateCreatedDaysAgo: 40,
      requestState: "EXPIRED",
      invoiceType: "On a quarterly basis, invoice sent at end of each quarter",
    }),
    makeRequest({
      requestId: DUMMY_IDS.EXP_EMP,
      title: "Employment Policy Update",
      requestCategory: "Help with Employment related Documents",
      requestSubcategory: "Employment related Document Templates",
      primaryContactPerson: "Mika Laine",
      scopeOfWork:
        "Update employment policies and related workplace documentation.",
      description:
        "Growing employer refreshing remote-work, disciplinary and leave policies.",
      paymentRate: "Hourly rate",
      maximumPrice: 180,
      offersDeadlineHours: -22 * 24,
      dateCreatedDaysAgo: 25,
      requestState: "EXPIRED",
    }),
  ];

  const byId = new Map();
  for (const row of rows) {
    byId.set(Number(row.requestId), row);
  }
  return byId;
}

export function getDummyRequestById(id) {
  if (!isDummyId(id)) return null;
  const row = requestByIdMap().get(Number(id));
  if (!row) return null;
  return {
    ...row,
    requestId: String(row.requestId),
  };
}

function practical(total, extras = {}) {
  return {
    total,
    ratingCount: extras.ratingCount ?? 10,
    billing: extras.billing ?? total,
    quality: extras.quality ?? total,
    communication: extras.communication ?? total,
  };
}

function awaitingOffer({
  offerId,
  offeredPrice,
  providerCompanyName,
  offerLawyer,
  total,
  quality,
  communication,
  billing,
  ratingCount,
  additionalInfo,
  practicalTotal,
}) {
  return {
    offerId: String(offerId),
    providerId: String(offerId),
    offeredPrice,
    offerExpectedPrice: null,
    offerLawyer,
    providerAdditionalInfo: additionalInfo,
    providerCompanyName,
    providerCompanyWebsite: "https://example.com",
    providerWebsite: "https://example.com",
    providerHasRatings: true,
    providerRatingCount: ratingCount,
    providerTotalRating: total,
    providerQualityRating: quality,
    providerCommunicationRating: communication,
    providerBillingRating: billing,
    providerPracticalRatings: {
      "M&A": practical(practicalTotal ?? total, {
        ratingCount: Math.min(ratingCount, 10),
        billing,
        quality,
        communication,
      }),
    },
    providerReferenceFiles: [],
  };
}

export function getDummyPendingRequests() {
  const b2b = getDummyRequestById(DUMMY_IDS.PEND_B2B);
  const emp = getDummyRequestById(DUMMY_IDS.PEND_EMP);
  const dpa = getDummyRequestById(DUMMY_IDS.PEND_DPA);

  return [
    {
      ...b2b,
      requestId: DUMMY_IDS.PEND_B2B,
      offersReceived: 3,
      bestOffer: 1800,
      maximumPrice: 2500,
      permission: "owner",
      isOwner: true,
      createdByUserId: null,
    },
    {
      ...emp,
      requestId: DUMMY_IDS.PEND_EMP,
      offersReceived: 5,
      bestOffer: 180,
      maximumPrice: null,
      permission: "owner",
      isOwner: true,
      createdByUserId: null,
    },
    {
      ...dpa,
      requestId: DUMMY_IDS.PEND_DPA,
      offersReceived: 0,
      bestOffer: 0,
      maximumPrice: 1200,
      permission: "owner",
      isOwner: true,
      createdByUserId: null,
    },
  ];
}

export function getDummyAwaitingRequests() {
  const req = getDummyRequestById(DUMMY_IDS.AWAIT_BETA);
  const topOffers = [
    awaitingOffer({
      offerId: DUMMY_IDS.AWAIT_OFFER_1,
      offeredPrice: 8750,
      providerCompanyName: "Virtanen Law Ltd",
      offerLawyer: "Partner A. Virtanen",
      total: 4.2,
      quality: 4.3,
      communication: 4.0,
      billing: 4.1,
      ratingCount: 12,
      additionalInfo: "N/A",
      practicalTotal: 4.2,
    }),
    awaitingOffer({
      offerId: DUMMY_IDS.AWAIT_OFFER_2,
      offeredPrice: 10500,
      providerCompanyName: "Iuris Attorneys Ltd",
      offerLawyer: "Partner J. Iuris",
      total: 4.5,
      quality: 4.6,
      communication: 4.4,
      billing: 4.5,
      ratingCount: 30,
      additionalInfo:
        "Strong M&A track record in Finland. Fixed-fee includes one call.",
    }),
    awaitingOffer({
      offerId: DUMMY_IDS.AWAIT_OFFER_3,
      offeredPrice: 12200,
      providerCompanyName: "Nordia Legal Oy",
      offerLawyer: "Partner J. Iuris",
      total: 4.1,
      quality: 3.6,
      communication: 4.2,
      billing: 4.5,
      ratingCount: 30,
      additionalInfo:
        "Strong M&A track record in Finland. Fixed-fee includes one call.",
    }),
    awaitingOffer({
      offerId: DUMMY_IDS.AWAIT_OFFER_4,
      offeredPrice: 13500,
      providerCompanyName: "Saaristo & Co",
      offerLawyer: "Partner J. Iuris",
      total: 3.8,
      quality: 3.5,
      communication: 3.8,
      billing: 4.1,
      ratingCount: 30,
      additionalInfo:
        "Strong M&A track record in Finland. Fixed-fee includes one call.",
    }),
    awaitingOffer({
      offerId: DUMMY_IDS.AWAIT_OFFER_5,
      offeredPrice: 14500,
      providerCompanyName: "Wexa Attorneys",
      offerLawyer: "Partner J. Iuris",
      total: 4.7,
      quality: 4.7,
      communication: 4.4,
      billing: 5.0,
      ratingCount: 30,
      additionalInfo:
        "Strong M&A track record in Finland. Fixed-fee includes one call.",
    }),
  ];

  return [
    {
      requestId: String(DUMMY_IDS.AWAIT_BETA),
      createdByUserId: null,
      requestTitle: req.title,
      dateCreated: daysAgo(10),
      dateExpired: daysAgo(1),
      acceptDeadline: hoursFromNow(24),
      paymentRate: req.paymentRate,
      currency: req.currency,
      primaryContactPerson: req.primaryContactPerson,
      maxPrice: 15000,
      offers: topOffers,
      topOffers,
      offerCount: topOffers.length,
      requestState: "ON HOLD",
      selectedOfferId: null,
      pausedRemainingMs: null,
      canExtend: true,
      extendedOnce: false,
      requestCategory: req.requestCategory,
      requestSubcategory: req.requestSubcategory,
      details: req.details,
      permission: "owner",
      isOwner: true,
    },
  ];
}

export function getDummyExpiredRequests() {
  return [
    {
      requestId: String(DUMMY_IDS.EXP_SUPPLIER),
      requestTitle: "Supplier Code of Conduct Alignment",
      dateCreated: daysAgo(60),
      dateExpired: daysAgo(55),
      contractResult: "No",
      currency: "EUR",
      paymentRate: "Lump sum fixed fee",
      maxPrice: 4000,
      createdBy: "Aino Virtanen",
      bestOffer: {
        offeredPrice: 4500,
        providerCompanyName: "Aurora IP & Tech Law",
      },
      runnerUps: [
        { offeredPrice: 5200, providerCompanyName: "Suomi Attorneys Ltd" },
        {
          offeredPrice: 6100,
          providerCompanyName: "Helsinki Legal Partners",
        },
      ],
    },
    {
      requestId: String(DUMMY_IDS.EXP_NDA),
      requestTitle: "NDA Template for Partners",
      dateCreated: daysAgo(40),
      dateExpired: daysAgo(38),
      contractResult: "Yes",
      currency: "EUR",
      paymentRate: "Lump sum fixed fee",
      maxPrice: 900,
      createdBy: "John Doe",
      bestOffer: {
        offeredPrice: 750,
        providerCompanyName: "Iuris Attorneys Ltd",
      },
      runnerUps: [
        { offeredPrice: 820, providerCompanyName: "Virtanen Law Ltd" },
      ],
    },
    {
      requestId: String(DUMMY_IDS.EXP_EMP),
      requestTitle: "Employment Policy Update",
      dateCreated: daysAgo(25),
      dateExpired: daysAgo(22),
      contractResult: "Yes",
      currency: "EUR",
      paymentRate: "Hourly rate",
      maxPrice: 180,
      createdBy: "Mika Laine",
      bestOffer: {
        offeredPrice: 165,
        providerCompanyName: "Tampere Business Law Ltd",
      },
      runnerUps: [
        { offeredPrice: 175, providerCompanyName: "Nordic Counsel Oy" },
        { offeredPrice: 185, providerCompanyName: "Helsinki Legal Partners" },
      ],
    },
  ];
}

function contractRequest(sourceId, overrides = {}) {
  const req = getDummyRequestById(sourceId);
  return {
    id: req.requestId,
    requestId: req.requestId,
    requestCategory: req.requestCategory,
    requestSubcategory: req.requestSubcategory,
    assignmentType: req.assignmentType,
    title: req.title,
    scopeOfWork: req.scopeOfWork,
    description: req.description,
    invoiceType: req.invoiceType,
    language: req.language,
    advanceRetainerFee: req.advanceRetainerFee,
    currency: req.currency,
    paymentRate: req.paymentRate,
    maximumPrice: req.maximumPrice,
    additionalBackgroundInfo: req.additionalBackgroundInfo,
    backgroundInfoFiles: [],
    supplierCodeOfConductFiles: [],
    primaryContactPerson: req.primaryContactPerson,
    details: req.details,
    client: req.client,
    ...overrides,
  };
}

export function getDummyPurchaserContracts() {
  const ndaReq = contractRequest(DUMMY_IDS.EXP_NDA, {
    title: "NDA Template for Partners",
    invoiceType: "On a quarterly basis, invoice sent at end of each quarter",
  });
  const empReq = contractRequest(DUMMY_IDS.EXP_EMP, {
    title: "Employment Policy Update",
  });

  return [
    {
      contractId: DUMMY_IDS.CON_NDA,
      contractDate: daysAgo(15),
      contractPrice: 750,
      contractPriceCurrency: "EUR",
      contractPriceType: "Lump sum fixed fee",
      contractPdfFile: null,
      createdBy: "John Doe",
      provider: {
        companyName: "Iuris Attorneys Ltd",
        businessId: "5566778-9",
        contactName: "Partner J. Iuris",
        email: "j.iuris@example.com",
        phone: "+358 40 000 0001",
        providerTotalRating: 4.5,
        providerQualityRating: 4.6,
        providerCommunicationRating: 4.4,
        providerBillingRating: 4.5,
      },
      purchaser: {
        companyName: PURCHASER.companyName,
        businessId: PURCHASER.businessId,
        contactName: "John Doe",
        email: "john.doe@example.com",
        phone: "+358 40 000 0002",
      },
      offer: {
        offerLawyer: "Partner J. Iuris",
        offerStatus: "WON",
        offerTitle: "NDA Template for Partners",
        offerExpectedPrice: null,
      },
      request: ndaReq,
      providerRating: {
        total: 4.5,
        quality: 4.6,
        communication: 4.4,
        billing: 4.5,
      },
      providerHasRatings: true,
      myHasRating: true,
      myRating: {
        total: 4.0,
        quality: 4.0,
        communication: 4.0,
        billing: 4.0,
      },
    },
    {
      contractId: DUMMY_IDS.CON_EMP,
      contractDate: daysAgo(30),
      contractPrice: 165,
      contractPriceCurrency: "EUR",
      contractPriceType: "Hourly rate",
      contractPdfFile: null,
      createdBy: "Mika Laine",
      provider: {
        companyName: "Tampere Business Law Ltd",
        businessId: "9988776-5",
        contactName: "Partner M. Laine",
        email: "m.laine@example.com",
        phone: "+358 40 000 0003",
        providerTotalRating: 4.1,
        providerQualityRating: 4.0,
        providerCommunicationRating: 4.2,
        providerBillingRating: 4.1,
      },
      purchaser: {
        companyName: PURCHASER.companyName,
        businessId: PURCHASER.businessId,
        contactName: "Mika Laine",
        email: "mika.laine@example.com",
        phone: "+358 40 000 0004",
      },
      offer: {
        offerLawyer: "Partner M. Laine",
        offerStatus: "WON",
        offerTitle: "Employment Policy Update",
        offerExpectedPrice: null,
      },
      request: empReq,
      providerRating: {
        total: 4.1,
        quality: 4.0,
        communication: 4.2,
        billing: 4.1,
      },
      providerHasRatings: true,
      myHasRating: true,
      myRating: null,
    },
  ];
}

export function getDummyProviderPendingOffers() {
  const oulu = getDummyRequestById(DUMMY_IDS.OFFER_OULU_REQ);
  const hq = getDummyRequestById(DUMMY_IDS.OFFER_HQ_REQ);

  const previewFrom = (req, clientName) => ({
    scopeOfWork: req.scopeOfWork,
    currency: req.currency,
    paymentRate: req.paymentRate,
    description: req.description,
    invoiceType: req.invoiceType,
    language: req.language,
    advanceRetainerFee: req.advanceRetainerFee,
    additionalBackgroundInfo: req.additionalBackgroundInfo,
    supplierCodeOfConductFiles: [],
    primaryContactPerson: req.primaryContactPerson,
    clientName,
    clientBusinessId: req.businessId || "—",
    clientCountry: req.companyCountry || "—",
  });

  return [
    {
      offerId: DUMMY_IDS.POFFER_OULU,
      requestId: DUMMY_IDS.OFFER_OULU_REQ,
      title: "Oulu Logistics Property Sale",
      clientName: "SilverProperties Oy",
      confidential: "no",
      offerSubmittedBy: "Laura Virtanen",
      offerSubmissionDate: hoursAgo(6),
      offeredPrice: 12000,
      paymentRate: oulu.paymentRate,
      dateExpired: hoursFromNow(18),
      requestState: "PENDING",
      requestStatus: "PENDING",
      selectedOfferId: null,
      preview: previewFrom(oulu, "SilverProperties Oy"),
    },
    {
      offerId: DUMMY_IDS.POFFER_HQ,
      requestId: DUMMY_IDS.OFFER_HQ_REQ,
      title: "New HQ Lease Negotiations",
      clientName: "Atlas Oy",
      confidential: "yes",
      offerSubmittedBy: "Mikko Laine",
      offerSubmissionDate: hoursAgo(28),
      offeredPrice: 300,
      paymentRate: hq.paymentRate,
      dateExpired: hoursFromNow(4),
      requestState: "PENDING",
      requestStatus: "PENDING",
      selectedOfferId: null,
      preview: previewFrom(hq, "Atlas Oy"),
    },
  ];
}

export function getDummyProviderExpiredOffers() {
  return [
    {
      offerId: DUMMY_IDS.EOFFER_BETA,
      requestId: DUMMY_IDS.AWAIT_BETA,
      title: "Project Beta",
      clientName: "GrowFast Ventures",
      offerSubmittedBy: "Mikko Laine",
      offerSubmissionDate: daysAgo(9),
      offeredPrice: 25000,
      paymentRate: "Lump sum fixed fee",
      offerStatus: "Lost",
      selectReason: "Law Firm's LEXIFY Rating",
    },
    {
      offerId: DUMMY_IDS.EOFFER_NDA,
      requestId: DUMMY_IDS.EXP_NDA,
      title: "NDA Template for Partners",
      clientName: "SilverProperties Oy",
      offerSubmittedBy: "Laura Virtanen",
      offerSubmissionDate: daysAgo(45),
      offeredPrice: 1000,
      paymentRate: "Lump sum fixed fee",
      offerStatus: "Won",
      selectReason: "Law Firm's Expertise and Experience in Similar Matters",
    },
  ];
}

export function getDummyProviderContracts() {
  const ndaReq = contractRequest(DUMMY_IDS.EXP_NDA, {
    title: "NDA Template for Partners",
  });
  const contractDate = daysAgo(40);
  const purchaser = {
    companyName: PURCHASER.companyName,
    businessId: PURCHASER.businessId,
    contactName: "John Doe",
    email: "john.doe@example.com",
    phone: "+358 40 000 0002",
  };
  const provider = {
    companyName: PROVIDER_LEXIFY.companyName,
    businessId: PROVIDER_LEXIFY.businessId,
    contactName: "Mikko Laine",
    email: "mikko.laine@example.com",
    phone: "+358 40 000 0005",
  };

  const nested = {
    contractId: DUMMY_IDS.CON_NDA,
    contractDate,
    contractPrice: 1000,
    contractPriceCurrency: "EUR",
    contractPriceType: "Lump sum fixed fee",
    contractPdfFile: null,
    provider,
    purchaser,
    offer: {
      offerLawyer: "Mikko Laine",
      offerTitle: "NDA Template for Partners",
      offerExpectedPrice: null,
    },
    client: ndaReq.client,
    request: ndaReq,
  };

  return [
    {
      contractId: DUMMY_IDS.CON_NDA,
      contractDate,
      contractPrice: 1000,
      contractPriceType: "Lump sum fixed fee",
      title: "NDA Template for Partners",
      clientName: PURCHASER.companyName,
      contractOwner: "Mikko Laine",
      contractPdfFile: null,
      contract: nested,
    },
  ];
}

export function getDummyAvailableRequests({
  category = "",
  subcategory = "",
  assignment = "",
} = {}) {
  const rows = [
    {
      requestId: String(DUMMY_IDS.AVAIL_B2B),
      category: "Help with Contracts",
      subcategory: "B2B Sales",
      assignmentType: "—",
      clientCompanyName: "Odyssey Industries Oy",
      confidential: "no",
      offersDeadline: hoursFromNow(26),
    },
    {
      requestId: String(DUMMY_IDS.AVAIL_PRIVACY),
      category: "Help with Personal Data Protection",
      subcategory: "Data Privacy Documentation",
      assignmentType: "—",
      clientCompanyName: "Disclosed to Winning Bidder Only",
      confidential: "yes",
      offersDeadline: hoursFromNow(5.3),
    },
    {
      requestId: String(DUMMY_IDS.AVAIL_EMP),
      category: "Help with Employment related Documents",
      subcategory: "Negotiation Support",
      assignmentType: "—",
      clientCompanyName: "Tampere Robotics Ltd",
      confidential: "no",
      offersDeadline: hoursFromNow(1.5),
    },
  ];

  return rows.filter((r) => {
    if (category && r.category !== category) return false;
    if (subcategory && r.subcategory !== subcategory) return false;
    if (assignment && assignment !== "All" && r.assignmentType !== assignment) {
      return false;
    }
    return true;
  });
}

export function getDummyContractById(id) {
  if (!isDummyId(id)) return null;
  const n = Number(id);
  const purchaser = getDummyPurchaserContracts().find(
    (c) => Number(c.contractId) === n,
  );
  if (purchaser) return purchaser;
  const provider = getDummyProviderContracts().find(
    (c) => Number(c.contractId) === n,
  );
  return provider || null;
}

export function getDummyLegalPanelGroups() {
  return [
    {
      id: "dummy-legal-panel-dispute",
      name: "Dispute resolution panel",
      providers: ["Virtanen Law Ltd", "Iuris Attorneys Ltd", "Nordia Legal Oy"],
    },
    {
      id: "dummy-legal-panel-employment",
      name: "Employment panel",
      providers: ["Tampere Business Law Ltd", "Nordic Counsel Oy"],
    },
    {
      id: "dummy-legal-panel-ma",
      name: "M&A panel",
      providers: ["Wexa Attorneys", "Saaristo & Co", "Helsinki Legal Partners"],
    },
  ];
}

function formatDummyInviteDate(iso) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDummyInvites() {
  return [
    {
      id: String(DUMMY_IDS.INVITE_PENDING),
      companyName: "Saaristo & Co",
      contactPersons: "Janne Saaristo",
      inviteDate: formatDummyInviteDate(daysAgo(4)),
      status: "Pending",
    },
    {
      id: String(DUMMY_IDS.INVITE_JOINED),
      companyName: "Tampere Business Law Ltd",
      contactPersons: "Mika Laine",
      inviteDate: formatDummyInviteDate(daysAgo(21)),
      status: "Joined",
    },
  ];
}

function dummyRatedProvider({
  companyId,
  companyName,
  total,
  quality,
  communication,
  billing,
  count,
  practical,
}) {
  return {
    companyId: String(companyId),
    companyName,
    companyWebsite: "https://example.com",
    providerTotalRating: total,
    providerQualityRating: quality,
    providerCommunicationRating: communication,
    providerBillingRating: billing,
    providerIndividualRating: Array.from({ length: count }, () => ({
      quality,
      communication,
      billing,
    })),
    providerPracticalRatings: practical,
  };
}

export function getDummyRatedProviders() {
  return [
    dummyRatedProvider({
      companyId: DUMMY_IDS.RATED_VIRTANEN,
      companyName: "Virtanen Law Ltd",
      total: 4.2,
      quality: 4.3,
      communication: 4.0,
      billing: 4.1,
      count: 12,
      practical: {
        "M&A": {
          total: 4.2,
          quality: 4.3,
          communication: 4.0,
          billing: 4.1,
          ratingCount: 6,
        },
        "Dispute Resolution": {
          total: 4.1,
          quality: 4.2,
          communication: 4.0,
          billing: 4.0,
          ratingCount: 6,
        },
      },
    }),
    dummyRatedProvider({
      companyId: DUMMY_IDS.RATED_IURIS,
      companyName: "Iuris Attorneys Ltd",
      total: 4.5,
      quality: 4.6,
      communication: 4.4,
      billing: 4.5,
      count: 30,
      practical: {
        "M&A": {
          total: 4.5,
          quality: 4.6,
          communication: 4.4,
          billing: 4.5,
          ratingCount: 10,
        },
        Contracts: {
          total: 4.4,
          quality: 4.5,
          communication: 4.3,
          billing: 4.4,
          ratingCount: 20,
        },
      },
    }),
    dummyRatedProvider({
      companyId: DUMMY_IDS.RATED_WEXA,
      companyName: "Wexa Attorneys",
      total: 4.7,
      quality: 4.7,
      communication: 4.4,
      billing: 5.0,
      count: 30,
      practical: {
        "M&A": {
          total: 4.7,
          quality: 4.7,
          communication: 4.4,
          billing: 5.0,
          ratingCount: 18,
        },
        Employment: {
          total: 4.6,
          quality: 4.6,
          communication: 4.5,
          billing: 4.8,
          ratingCount: 12,
        },
      },
    }),
  ];
}
