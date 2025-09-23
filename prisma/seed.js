// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // First admin
  const admin1Username = "admin";
  const admin1Password = "admin123"; // replace at first run
  const admin1Hash = await bcrypt.hash(admin1Password, 12);

  await prisma.appUser.upsert({
    where: { username: admin1Username },
    update: { role: "ADMIN" },
    create: {
      role: "ADMIN",
      registerStatus: "pending",
      username: admin1Username,
      companyName: "Lexify",
      companyId: "ADMIN-000",
      companyAddress: "Admin Way 1",
      companyPostalCode: "00000",
      companyCity: "Helsinki",
      companyCountry: "Finland",
      companyWebsite: "https://lexify.online",
      companyProfessionals: null,
      contactFirstName: "Site",
      contactLastName: "Admin",
      contactEmail: "admin@example.com",
      contactTelephone: "+358000000000",
      contactPosition: "Administrator",
      passwordHash: admin1Hash,
      companyContactPersons: [
        {
          firstName: "Site",
          lastName: "Admin",
          title: "Administrator",
          telephone: "+358000000000",
          email: "admin@example.com",
        },
      ],
      notificationPreferences: [
        "no_offers",
        "over_max_price",
        "pending_offer_selection",
      ],
      winningOfferSelection: "automatic",
      blockedServiceProviders: [],
      preferredLegalServiceProviders: null,
      legalPanelServiceProviders: [],
      providerTotalRating: null,
      providerIndividualRating: [],
      invoiceFee: 0,
      companyInvoiceContactPersons: [
        {
          firstName: "Site",
          lastName: "Admin",
          title: "Administrator",
          telephone: "+358000000000",
          email: "admin@example.com",
        },
      ],
    },
  });

  // Second admin
  const admin2Username = "admin2";
  const admin2Password = "admin321"; // replace at first run
  const admin2Hash = await bcrypt.hash(admin2Password, 12);

  await prisma.appUser.upsert({
    where: { username: admin2Username },
    update: { role: "ADMIN" },
    create: {
      role: "ADMIN",
      registerStatus: "pending",
      username: admin2Username,
      companyName: "Lexify Secondary",
      companyId: "ADMIN-001",
      companyAddress: "Admin Way 2",
      companyPostalCode: "00001",
      companyCity: "Tampere",
      companyCountry: "Finland",
      companyWebsite: "https://lexify.online",
      companyProfessionals: null,
      contactFirstName: "Second",
      contactLastName: "Admin",
      contactEmail: "admin2@example.com",
      contactTelephone: "+358000000001",
      contactPosition: "Administrator",
      passwordHash: admin2Hash,
      companyContactPersons: [
        {
          firstName: "Second",
          lastName: "Admin",
          title: "Administrator",
          telephone: "+358000000001",
          email: "admin2@example.com",
        },
      ],
      notificationPreferences: [
        "no_offers",
        "over_max_price",
        "pending_offer_selection",
      ],
      winningOfferSelection: "automatic",
      blockedServiceProviders: [],
      preferredLegalServiceProviders: null,
      legalPanelServiceProviders: [],
      providerTotalRating: null,
      providerIndividualRating: [],
      invoiceFee: 0,
      companyInvoiceContactPersons: [
        {
          firstName: "Second",
          lastName: "Admin",
          title: "Administrator",
          telephone: "+358000000001",
          email: "admin2@example.com",
        },
      ],
    },
  });

  console.log(
    "✔ Admins ready: username=admin & username=admin2 (update passwords!)"
  );
}

main().finally(() => prisma.$disconnect());
