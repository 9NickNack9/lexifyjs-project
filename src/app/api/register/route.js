// src/app/api/register/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { notifySupportNewRegistration } from "@/lib/mailer";

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

const roleToUserRole = (role) =>
  role === "provider" ? "PROVIDER" : "PURCHASER";
const roleToCompanyRole = (role) =>
  role === "provider" ? "PROVIDER" : "PURCHASER";

/** Incoming payload schema (matches your register page payload) */
const BaseSchema = z.object({
  role: z.string(), // "provider" | "purchaser"
  companyJoinType: z.enum(["new_company", "existing_company"]),

  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  companyName: z.string().min(2, "Company name is required"),
  companyId: z.string().min(2, "Business ID is required"),

  // OPTIONAL (conditionally required later)
  companyAddress: z.string().optional(),
  companyPostalCode: z.string().optional(),
  companyCity: z.string().optional(),
  companyCountry: z.string().optional(),
  companyWebsite: z.string().optional(),

  // Provider-only inputs remain optional here
  companyProfessionals: z.union([z.string(), z.number(), z.null()]).optional(),
  companyFoundingYear: z.union([z.string(), z.number(), z.null()]).optional(),
  providerType: z.string().optional(),

  contactFirstName: z.string().min(1, "First name is required"),
  contactLastName: z.string().min(1, "Last name is required"),
  contactEmail: z.email("A valid email is required"),
  contactPosition: z.string().min(1, "Position is required"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().min(3, "Phone is required"),
});

/** Normalization + conditional validation */
const RegisterSchema = BaseSchema.transform((raw) => {
  const s = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, trim(v)]),
  );

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

  const companyJoinType = s.companyJoinType;

  if (companyJoinType === "new_company") {
    const requiredCompanyFields = [
      ["companyAddress", "Address is required"],
      ["companyPostalCode", "Postal code is required"],
      ["companyCity", "City is required"],
      ["companyCountry", "Country is required"],
      ["companyWebsite", "Website is required"],
    ];

    for (const [key, msg] of requiredCompanyFields) {
      if (!s[key] || !String(s[key]).trim()) {
        throw new z.ZodError([{ code: "custom", message: msg, path: [key] }]);
      }
    }
  }

  const companyWebsite =
    companyJoinType === "new_company" ? ensureHttps(s.companyWebsite) : "";

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
  const telephone = `${cc}${phoneDigits}`;

  // Provider-only fields
  let companyProfessionals = toIntOrNull(s.companyProfessionals);
  let providerType = null;
  let companyFoundingYear = null;
  let companyAge = null;

  if (role === "provider") {
    if (companyProfessionals === null || companyProfessionals < 0) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Number of legal professionals is required",
          path: ["companyProfessionals"],
        },
      ]);
    }

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
    companyAge = calcCompanyAge(companyFoundingYear);
  } else {
    companyProfessionals = null;
  }

  return {
    role,
    companyJoinType,
    username: s.username,
    password: s.password,

    companyName: s.companyName,
    businessId: s.companyId, // map frontend companyId -> Company.businessId

    companyAddress: companyJoinType === "new_company" ? s.companyAddress : "",
    companyPostalCode:
      companyJoinType === "new_company" ? s.companyPostalCode : "",
    companyCity: companyJoinType === "new_company" ? s.companyCity : "",
    companyCountry: companyJoinType === "new_company" ? s.companyCountry : "",
    companyWebsite,

    companyProfessionals: role === "provider" ? companyProfessionals : null,
    providerType: role === "provider" ? providerType : "",
    companyFoundingYear: role === "provider" ? companyFoundingYear : null,
    companyAge: role === "provider" ? companyAge : null,

    firstName: s.contactFirstName,
    lastName: s.contactLastName,
    email: s.contactEmail,
    position: s.contactPosition,
    telephone,
  };
});

export async function POST(req) {
  try {
    const body = await req.json();

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          error: "Invalid input",
          fields: flat.fieldErrors,
          form: flat.formErrors,
        },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Uniqueness checks on UserAccount
    const [usernameTaken, emailTaken] = await Promise.all([
      prisma.userAccount.findUnique({
        where: { username: data.username },
        select: { userPkId: true },
      }),
      prisma.userAccount.findUnique({
        where: { email: data.email },
        select: { userPkId: true },
      }),
    ]);

    if (usernameTaken) {
      return NextResponse.json(
        { error: "This username is already taken.", field: "username" },
        { status: 409 },
      );
    }
    if (emailTaken) {
      return NextResponse.json(
        { error: "This email is already registered.", field: "contactEmail" },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Find existing company by companyName OR businessId
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { companyName: data.companyName },
          { businessId: data.businessId },
        ],
      },
      select: { companyPkId: true, role: true },
    });

    if (data.companyJoinType === "existing_company" && !existingCompany) {
      return NextResponse.json(
        {
          error:
            "No existing company found with this name or Business ID. Please choose 'Unregistered Company' instead.",
          field: "companyId",
        },
        { status: 404 },
      );
    }

    const companyRole = roleToCompanyRole(data.role);

    // Optional safety: if company exists but role differs, block
    if (existingCompany && existingCompany.role !== companyRole) {
      return NextResponse.json(
        {
          error:
            "A company with this name or Business ID already exists with a different role.",
          field: "companyName",
        },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let company = existingCompany;

      // Create company if not exists
      if (!company) {
        company = await tx.company.create({
          data: {
            role: companyRole,
            companyName: data.companyName,
            businessId: data.businessId,
            companyAddress: data.companyAddress,
            companyPostalCode: data.companyPostalCode,
            companyCity: data.companyCity,
            companyCountry: data.companyCountry,
            companyWebsite: data.companyWebsite,

            // provider-only fields (safe for purchaser too)
            companyProfessionals:
              data.role === "provider" ? data.companyProfessionals : null,
            providerType: data.role === "provider" ? data.providerType : "",
            companyFoundingYear:
              data.role === "provider" ? data.companyFoundingYear : null,
            companyAge: data.role === "provider" ? data.companyAge : null,

            // required Json field on Company
            companyInvoiceContactPersons: [
              {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                telephone: data.telephone,
                position: data.position,
              },
            ],
          },
          select: { companyPkId: true },
        });
      }

      // Create user and connect to company (adds to Company.members)
      const user = await tx.userAccount.create({
        data: {
          role: roleToUserRole(data.role),
          username: data.username,
          email: data.email,
          passwordHash,

          firstName: data.firstName,
          lastName: data.lastName,
          telephone: data.telephone,
          position: data.position,

          // first registrant becomes company admin by default
          isCompanyAdmin: data.companyJoinType === "new_company",

          company: { connect: { companyPkId: company.companyPkId } },
        },
        select: { userPkId: true, companyId: true },
      });

      return { companyPkId: company.companyPkId, userPkId: user.userPkId };
    });

    // Support notification (don’t fail registration if email fails)
    try {
      await notifySupportNewRegistration({
        role: data.role, // "provider" | "purchaser"
        companyName: data.companyName,
      });
    } catch (e) {
      console.error("New registration support email failed:", e);
    }

    return NextResponse.json(
      {
        ok: true,
        companyId: String(result.companyPkId),
        userId: String(result.userPkId),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/register failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
