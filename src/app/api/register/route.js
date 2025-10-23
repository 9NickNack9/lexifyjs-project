// src/app/api/register/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

/** Helpers */
const trim = (s) => (typeof s === "string" ? s.trim() : s);
const stripNonDigits = (s) =>
  typeof s === "string" ? s.replace(/[^\d]/g, "") : s;
const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const ensureHttps = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};
const calcCompanyAge = (foundingYear) => {
  const y = toIntOrNull(foundingYear);
  if (!y) return null;
  const nowY = new Date().getFullYear();
  const age = nowY - y;
  return age < 0 ? 0 : age;
};

/** Base shape (strings, then we refine/transform) */
const BaseSchema = z.object({
  role: z.string(), // "provider" | "purchaser"
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name is required"),
  companyID: z.string().min(2, "Company ID is required"),
  companyAddress: z.string().min(2, "Address is required"),
  companyPostalCode: z.string().min(1, "Postal code is required"),
  companyCity: z.string().min(1, "City is required"),
  companyCountry: z.string().min(1, "Country is required"),
  companyWebsite: z.string().optional().nullable(),

  // Provider-only inputs (can arrive as strings; we gate them later)
  companyProfessionals: z.union([z.string(), z.number(), z.null()]).optional(),
  companyFoundingYear: z.union([z.string(), z.number(), z.null()]).optional(),
  providerType: z.string().optional(),

  contactFirstName: z.string().min(1, "First name is required"),
  contactLastName: z.string().min(1, "Last name is required"),
  contactEmail: z.string().email("A valid email is required"),
  contactPosition: z.string().min(1, "Position is required"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().min(3, "Phone is required"),
});

/** Final schema with normalization + conditional requirements */
const RegisterSchema = BaseSchema.transform((raw) => {
  // Trim everything
  const s = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, trim(v)])
  );

  // Normalize role
  const role = (s.role || "").toLowerCase();
  if (role !== "provider" && role !== "purchaser") {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Role must be provider or purchaser",
        path: ["role"],
      },
    ]);
  }

  // Normalize website (optional)
  const website = s.companyWebsite ? ensureHttps(s.companyWebsite) : "";

  // Normalize phone parts
  const cc = s.countryCode ? `+${stripNonDigits(s.countryCode)}` : "";
  const phoneDigits = stripNonDigits(s.phone || "");
  if (!cc || cc.length < 2) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Invalid country code",
        path: ["countryCode"],
      },
    ]);
  }
  if (!phoneDigits || phoneDigits.length < 3) {
    throw new z.ZodError([
      { code: "custom", message: "Invalid phone number", path: ["phone"] },
    ]);
  }
  const contactTelephone = `${cc}${phoneDigits}`;

  // Professionals (required only for provider)
  let professionals = toIntOrNull(s.companyProfessionals);
  if (role === "provider") {
    if (professionals === null || professionals < 0) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Number of legal professionals is required",
          path: ["companyProfessionals"],
        },
      ]);
    }
  } else {
    professionals = null;
  }

  // Provider-only: founding year & providerType
  let providerType = null;
  let companyFoundingYear = null;
  let companyAge = null;

  if (role === "provider") {
    // providerType required
    providerType = (s.providerType || "").trim();
    if (!providerType) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Provider type is required",
          path: ["providerType"],
        },
      ]);
    }

    // founding year required & plausible
    companyFoundingYear = toIntOrNull(s.companyFoundingYear);
    const nowY = new Date().getFullYear();
    if (
      companyFoundingYear === null ||
      companyFoundingYear < 1800 ||
      companyFoundingYear > nowY
    ) {
      throw new z.ZodError([
        {
          code: "custom",
          message: `Founding year must be between 1800 and ${nowY}`,
          path: ["companyFoundingYear"],
        },
      ]);
    }

    // compute companyAge
    companyAge = calcCompanyAge(companyFoundingYear);
  }

  return {
    role,
    username: s.username,
    password: s.password,

    companyName: s.companyName,
    companyId: s.companyID,
    companyAddress: s.companyAddress,
    companyPostalCode: s.companyPostalCode,
    companyCity: s.companyCity,
    companyCountry: s.companyCountry,
    companyWebsite: website || null,

    // provider-only persisted fields
    companyProfessionals: professionals,
    providerType,
    companyFoundingYear,
    companyAge,

    contactFirstName: s.contactFirstName,
    contactLastName: s.contactLastName,
    contactEmail: s.contactEmail,
    contactPosition: s.contactPosition,
    contactTelephone,
  };
});

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate & normalize
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          error: "Invalid input",
          fields: flat.fieldErrors,
          form: flat.formErrors,
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Uniqueness checks
    const [userTaken, companyTaken] = await Promise.all([
      prisma.appUser.findFirst({
        where: { username: data.username },
        select: { userId: true },
      }),
      prisma.appUser.findFirst({
        where: { companyId: data.companyId },
        select: { userId: true },
      }),
    ]);
    if (userTaken) {
      return NextResponse.json(
        { error: "This username is already taken.", field: "username" },
        { status: 409 }
      );
    }
    if (companyTaken) {
      return NextResponse.json(
        { error: "This company ID is already registered.", field: "companyID" },
        { status: 409 }
      );
    }

    // Hash password
    const hashed = await bcrypt.hash(data.password, 10);

    // Build provider-only fields (nulls for purchasers)
    const providerOnly =
      data.role === "provider"
        ? {
            companyProfessionals: data.companyProfessionals,
            providerType: data.providerType,
            companyFoundingYear: data.companyFoundingYear,
            companyAge: data.companyAge,
          }
        : {
            companyProfessionals: null,
            providerType: null,
            companyFoundingYear: null,
            companyAge: null,
          };

    // Create user
    const created = await prisma.appUser.create({
      data: {
        username: data.username,
        passwordHash: hashed,
        role: data.role === "provider" ? "PROVIDER" : "PURCHASER",
        registerStatus: "pending",

        companyName: data.companyName,
        companyId: data.companyId,
        companyAddress: data.companyAddress,
        companyPostalCode: data.companyPostalCode,
        companyCity: data.companyCity,
        companyCountry: data.companyCountry,
        companyWebsite: data.companyWebsite,

        ...providerOnly,

        contactFirstName: data.contactFirstName,
        contactLastName: data.contactLastName,
        contactEmail: data.contactEmail,
        contactPosition: data.contactPosition,
        contactTelephone: data.contactTelephone,

        companyContactPersons: [
          {
            firstName: data.contactFirstName,
            lastName: data.contactLastName,
            email: data.contactEmail,
            telephone: data.contactTelephone,
            position: data.contactPosition,
          },
        ],

        companyInvoiceContactPersons:
          data.role === "provider" || data.role === "admin"
            ? [
                {
                  firstName: data.contactFirstName,
                  lastName: data.contactLastName,
                  email: data.contactEmail,
                  telephone: data.contactTelephone,
                  position: data.contactPosition,
                },
              ]
            : [],

        // sensible defaults used elsewhere in your app
        winningOfferSelection: "Manual",
        blockedServiceProviders: [],
        preferredLegalServiceProviders: [],
        legalPanelServiceProviders: [],
        providerTotalRating: "5",
        providerIndividualRating: [],
        invoiceFee: "0",
      },
      select: { userId: true },
    });

    return NextResponse.json(
      { ok: true, userId: String(created.userId) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/register failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
