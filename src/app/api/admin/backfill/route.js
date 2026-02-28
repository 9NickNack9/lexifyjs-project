import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyRole } from "@prisma/client";

export const runtime = "nodejs";

const ADMIN_COMPANY_NAME = "LEXIFY OY";
const ADMIN_COMPANY_ROLE = CompanyRole.PURCHASER;
const FALLBACK_STR = "-";

function asString(v, fallback = FALLBACK_STR) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function safeJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  return v;
}

function companyRoleForAppUser(appUser) {
  if (String(appUser.role).toUpperCase() === "PROVIDER")
    return CompanyRole.PROVIDER;
  return CompanyRole.PURCHASER; // ADMIN → PURCHASER company role
}

async function ensureAdminCompany(appUsers) {
  const existing = await prisma.company.findUnique({
    where: { companyName: ADMIN_COMPANY_NAME },
    select: { companyPkId: true },
  });
  if (existing) return existing;

  const adminSource =
    appUsers.find((u) => String(u.role).toUpperCase() === "ADMIN") || null;

  // Must be unique.
  const businessId = "LEXIFY-ADMIN";

  return prisma.company.create({
    data: {
      role: ADMIN_COMPANY_ROLE,
      registerStatus: adminSource?.registerStatus ?? "pending",
      companyName: ADMIN_COMPANY_NAME,
      businessId,
      companyAddress: asString(adminSource?.companyAddress),
      companyPostalCode: asString(adminSource?.companyPostalCode),
      companyCity: asString(adminSource?.companyCity),
      companyCountry: asString(adminSource?.companyCountry),
      companyWebsite: asString(adminSource?.companyWebsite),
      companyProfessionals: adminSource?.companyProfessionals ?? null,
      companyFoundingYear: adminSource?.companyFoundingYear ?? null,
      companyAge: adminSource?.companyAge ?? 0,
      providerType: adminSource?.providerType ?? "",

      providerTotalRating: adminSource?.providerTotalRating ?? null,
      providerQualityRating: adminSource?.providerQualityRating ?? null,
      providerCommunicationRating:
        adminSource?.providerCommunicationRating ?? null,
      providerBillingRating: adminSource?.providerBillingRating ?? null,
      providerIndividualRating: safeJson(
        adminSource?.providerIndividualRating,
        [],
      ),
      providerPracticalRatings: safeJson(
        adminSource?.providerPracticalRatings,
        [],
      ),

      invoiceFee: adminSource?.invoiceFee ?? 0,
      companyInvoiceContactPersons: safeJson(
        adminSource?.companyInvoiceContactPersons,
        [],
      ),
    },
    select: { companyPkId: true },
  });
}

async function upsertCompanyFromAppUser(appUser) {
  const businessId = asString(appUser.companyId);

  return prisma.company.upsert({
    where: { businessId },
    create: {
      role: companyRoleForAppUser(appUser),
      registerStatus: appUser.registerStatus ?? "pending",

      companyName: asString(appUser.companyName),
      businessId,
      companyAddress: asString(appUser.companyAddress),
      companyPostalCode: asString(appUser.companyPostalCode),
      companyCity: asString(appUser.companyCity),
      companyCountry: asString(appUser.companyCountry),
      companyWebsite: asString(appUser.companyWebsite),
      companyProfessionals: appUser.companyProfessionals ?? null,
      companyFoundingYear: appUser.companyFoundingYear ?? null,
      companyAge: appUser.companyAge ?? 0,
      providerType: appUser.providerType ?? "",

      providerTotalRating: appUser.providerTotalRating ?? null,
      providerQualityRating: appUser.providerQualityRating ?? null,
      providerCommunicationRating: appUser.providerCommunicationRating ?? null,
      providerBillingRating: appUser.providerBillingRating ?? null,
      providerIndividualRating: safeJson(appUser.providerIndividualRating, []),
      providerPracticalRatings: safeJson(appUser.providerPracticalRatings, []),

      invoiceFee: appUser.invoiceFee ?? 0,
      companyInvoiceContactPersons: safeJson(
        appUser.companyInvoiceContactPersons,
        [],
      ),
    },
    update: {
      role: companyRoleForAppUser(appUser),
      registerStatus: appUser.registerStatus ?? "pending",

      companyName: asString(appUser.companyName),
      companyAddress: asString(appUser.companyAddress),
      companyPostalCode: asString(appUser.companyPostalCode),
      companyCity: asString(appUser.companyCity),
      companyCountry: asString(appUser.companyCountry),
      companyWebsite: asString(appUser.companyWebsite),
      companyProfessionals: appUser.companyProfessionals ?? null,
      companyFoundingYear: appUser.companyFoundingYear ?? null,
      companyAge: appUser.companyAge ?? 0,
      providerType: appUser.providerType ?? "",

      providerTotalRating: appUser.providerTotalRating ?? null,
      providerQualityRating: appUser.providerQualityRating ?? null,
      providerCommunicationRating: appUser.providerCommunicationRating ?? null,
      providerBillingRating: appUser.providerBillingRating ?? null,
      providerIndividualRating: safeJson(appUser.providerIndividualRating, []),
      providerPracticalRatings: safeJson(appUser.providerPracticalRatings, []),

      invoiceFee: appUser.invoiceFee ?? 0,
      companyInvoiceContactPersons: safeJson(
        appUser.companyInvoiceContactPersons,
        [],
      ),
    },
    select: { companyPkId: true },
  });
}

async function upsertUserAccountFromAppUser(appUser, companyPkId) {
  const email = asString(appUser.contactEmail, "no-email@example.invalid");
  const username = asString(appUser.username, `user-${appUser.userId}`);

  return prisma.userAccount.upsert({
    where: { username },
    create: {
      companyId: companyPkId,
      role: appUser.role,
      username,
      email,
      passwordHash: asString(appUser.passwordHash),

      firstName: asString(appUser.contactFirstName),
      lastName: asString(appUser.contactLastName),
      telephone: (appUser.contactTelephone ?? "").toString().trim() || null,
      position: (appUser.contactPosition ?? "").toString().trim() || null,

      isCompanyAdmin: true,

      notificationPreferences: safeJson(appUser.notificationPreferences, []),
      blockedServiceProviders: safeJson(appUser.blockedServiceProviders, []),
      preferredLegalServiceProviders: safeJson(
        appUser.preferredLegalServiceProviders,
        [],
      ),
      legalPanelServiceProviders: safeJson(
        appUser.legalPanelServiceProviders,
        [],
      ),
      winningOfferSelection: asString(appUser.winningOfferSelection, "manual"),
    },
    update: {
      companyId: companyPkId,
      role: appUser.role,
      email,
      passwordHash: asString(appUser.passwordHash),

      firstName: asString(appUser.contactFirstName),
      lastName: asString(appUser.contactLastName),
      telephone: (appUser.contactTelephone ?? "").toString().trim() || null,
      position: (appUser.contactPosition ?? "").toString().trim() || null,

      isCompanyAdmin: true,

      notificationPreferences: safeJson(appUser.notificationPreferences, []),
      blockedServiceProviders: safeJson(appUser.blockedServiceProviders, []),
      preferredLegalServiceProviders: safeJson(
        appUser.preferredLegalServiceProviders,
        [],
      ),
      legalPanelServiceProviders: safeJson(
        appUser.legalPanelServiceProviders,
        [],
      ),
      winningOfferSelection: asString(appUser.winningOfferSelection, "manual"),
    },
    select: { userPkId: true },
  });
}

async function backfillRequests(mapping) {
  const batchSize = 500;
  let updated = 0;

  while (true) {
    const rows = await prisma.request.findMany({
      where: { OR: [{ clientCompanyId: null }, { createdByUserId: null }] },
      select: { requestId: true, clientId: true },
      take: batchSize,
    });
    if (rows.length === 0) break;

    const tx = [];
    for (const r of rows) {
      const m = mapping.get(String(r.clientId));
      if (!m) continue;

      tx.push(
        prisma.request.update({
          where: { requestId: r.requestId },
          data: {
            clientCompanyId: m.companyPkId,
            createdByUserId: m.userPkId,
          },
        }),
      );
    }

    if (tx.length) {
      await prisma.$transaction(tx);
      updated += tx.length;
    }
  }

  return updated;
}

async function backfillOffers(mapping) {
  const batchSize = 500;
  let updated = 0;

  while (true) {
    const rows = await prisma.offer.findMany({
      where: { OR: [{ providerCompanyId: null }, { createdByUserId: null }] },
      select: { offerId: true, providerId: true },
      take: batchSize,
    });
    if (rows.length === 0) break;

    const tx = [];
    for (const o of rows) {
      const m = mapping.get(String(o.providerId));
      if (!m) continue;

      tx.push(
        prisma.offer.update({
          where: { offerId: o.offerId },
          data: {
            providerCompanyId: m.companyPkId,
            createdByUserId: m.userPkId,
          },
        }),
      );
    }

    if (tx.length) {
      await prisma.$transaction(tx);
      updated += tx.length;
    }
  }

  return updated;
}

async function backfillContracts(mapping) {
  const batchSize = 500;
  let updated = 0;

  while (true) {
    const rows = await prisma.contract.findMany({
      where: { OR: [{ clientCompanyId: null }, { providerCompanyId: null }] },
      select: { contractId: true, clientId: true, providerId: true },
      take: batchSize,
    });
    if (rows.length === 0) break;

    const tx = [];
    for (const c of rows) {
      const cm = mapping.get(String(c.clientId));
      const pm = mapping.get(String(c.providerId));
      if (!cm && !pm) continue;

      tx.push(
        prisma.contract.update({
          where: { contractId: c.contractId },
          data: {
            clientCompanyId: cm?.companyPkId ?? undefined,
            providerCompanyId: pm?.companyPkId ?? undefined,
          },
        }),
      );
    }

    if (tx.length) {
      await prisma.$transaction(tx);
      updated += tx.length;
    }
  }

  return updated;
}

export async function POST() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const appUsers = await prisma.appUser.findMany({
      select: {
        userId: true,
        role: true,
        registerStatus: true,
        username: true,
        companyName: true,
        companyId: true,
        companyAddress: true,
        companyPostalCode: true,
        companyCity: true,
        companyCountry: true,
        companyWebsite: true,
        companyProfessionals: true,
        contactFirstName: true,
        contactLastName: true,
        contactEmail: true,
        contactTelephone: true,
        contactPosition: true,
        passwordHash: true,
        companyFoundingYear: true,
        companyAge: true,
        providerType: true,
        notificationPreferences: true,
        winningOfferSelection: true,
        blockedServiceProviders: true,
        preferredLegalServiceProviders: true,
        legalPanelServiceProviders: true,
        providerTotalRating: true,
        providerQualityRating: true,
        providerCommunicationRating: true,
        providerBillingRating: true,
        providerIndividualRating: true,
        providerPracticalRatings: true,
        invoiceFee: true,
        companyInvoiceContactPersons: true,
      },
    });

    const adminCompany = await ensureAdminCompany(appUsers);

    // Map old AppUser.userId -> { companyPkId, userPkId }
    const mapping = new Map();

    // Create/upsert Company + UserAccount
    let upsertedCompanies = 0;
    let upsertedUsers = 0;

    for (const u of appUsers) {
      const isAdmin = String(u.role).toUpperCase() === "ADMIN";

      const company = isAdmin
        ? adminCompany
        : await upsertCompanyFromAppUser(u);
      if (!isAdmin) upsertedCompanies += 1;

      const userAcc = await upsertUserAccountFromAppUser(
        u,
        company.companyPkId,
      );
      upsertedUsers += 1;

      mapping.set(String(u.userId), {
        companyPkId: company.companyPkId,
        userPkId: userAcc.userPkId,
      });
    }

    const reqUpdated = await backfillRequests(mapping);
    const offUpdated = await backfillOffers(mapping);
    const conUpdated = await backfillContracts(mapping);

    return NextResponse.json({
      ok: true,
      stats: {
        appUsersFound: appUsers.length,
        adminCompanyPkId: String(adminCompany.companyPkId),
        upsertedCompanies,
        upsertedUsers,
        requestsUpdated: reqUpdated,
        offersUpdated: offUpdated,
        contractsUpdated: conUpdated,
      },
    });
  } catch (e) {
    console.error("Backfill failed:", e);
    return NextResponse.json(
      { ok: false, error: "Backfill failed", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
