"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  EyeOff,
  Globe,
  IdCard,
  Lock,
  Mail,
  Mailbox,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import NarrowTooltip from "../components/QuestionmarkTooltip";
import { HubShell } from "@/app/components/HubPage";
import { getPasswordRequirementResults } from "@/lib/password";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

const selectClass = `${inputClass} appearance-none`;

const iconClass =
  "pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400";

const errorInputClass =
  "!border-red-500 focus:!border-red-600 focus:!ring-red-500/30";

const API_TO_FORM_FIELD = {
  companyId: "companyID",
  email: "contactEmail",
};

function firstErrorMessage(value) {
  if (Array.isArray(value)) return value.find(Boolean) || "";
  if (typeof value === "string") return value;
  return "";
}

function parseRegisterErrors(data) {
  const fieldErrors = {};
  const fields =
    data?.fields && typeof data.fields === "object" ? data.fields : {};

  for (const [key, value] of Object.entries(fields)) {
    const formKey = API_TO_FORM_FIELD[key] || key;
    const message = firstErrorMessage(value);
    if (message) fieldErrors[formKey] = message;
  }

  if (data?.field && data?.error) {
    const formKey = API_TO_FORM_FIELD[data.field] || data.field;
    fieldErrors[formKey] = data.error;
  }

  const formError =
    firstErrorMessage(data?.error) ||
    Object.values(fieldErrors)[0] ||
    firstErrorMessage(data?.form) ||
    "Registration failed. Please check the form and try again.";

  return { formError, fieldErrors };
}

function scrollToRegisterError(fieldErrors) {
  const firstField = Object.keys(fieldErrors || {})[0];
  const targetId = firstField || "register-form-error";
  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

const COUNTRIES = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
];

const PHONE_CODES = [
  { code: "+358", iso: "fi", name: "Finland" },
  { code: "+43", iso: "at", name: "Austria" },
  { code: "+32", iso: "be", name: "Belgium" },
  { code: "+359", iso: "bg", name: "Bulgaria" },
  { code: "+385", iso: "hr", name: "Croatia" },
  { code: "+357", iso: "cy", name: "Cyprus" },
  { code: "+420", iso: "cz", name: "Czechia" },
  { code: "+45", iso: "dk", name: "Denmark" },
  { code: "+372", iso: "ee", name: "Estonia" },
  { code: "+33", iso: "fr", name: "France" },
  { code: "+49", iso: "de", name: "Germany" },
  { code: "+30", iso: "gr", name: "Greece" },
  { code: "+36", iso: "hu", name: "Hungary" },
  { code: "+353", iso: "ie", name: "Ireland" },
  { code: "+39", iso: "it", name: "Italy" },
  { code: "+371", iso: "lv", name: "Latvia" },
  { code: "+370", iso: "lt", name: "Lithuania" },
  { code: "+352", iso: "lu", name: "Luxembourg" },
  { code: "+356", iso: "mt", name: "Malta" },
  { code: "+31", iso: "nl", name: "Netherlands" },
  { code: "+48", iso: "pl", name: "Poland" },
  { code: "+351", iso: "pt", name: "Portugal" },
  { code: "+40", iso: "ro", name: "Romania" },
  { code: "+421", iso: "sk", name: "Slovakia" },
  { code: "+386", iso: "si", name: "Slovenia" },
  { code: "+34", iso: "es", name: "Spain" },
  { code: "+46", iso: "se", name: "Sweden" },
];

function Field({ label, htmlFor, tooltip, hint, error, children }) {
  return (
    <div className="text-left">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800"
        >
          {label}
          {tooltip}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function IconInput({ icon: Icon, className = "", ...props }) {
  return (
    <div className="relative">
      <Icon className={iconClass} aria-hidden="true" />
      <input className={`${inputClass} pl-10 ${className}`} {...props} />
    </div>
  );
}

function SelectField({ icon: Icon, className = "", children, ...props }) {
  return (
    <div className="relative">
      {Icon ? <Icon className={iconClass} aria-hidden="true" /> : null}
      <select
        className={`${selectClass} pr-10 ${Icon ? "pl-10" : "pl-3"} ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
    </div>
  );
}

function CountryFlag({ iso, name, className = "" }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      alt=""
      title={name}
      className={`h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 ${className}`}
    />
  );
}

function PhoneCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected =
    PHONE_CODES.find((item) => item.code === value) || PHONE_CODES[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeIfOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-[7.75rem] shrink-0">
      <button
        type="button"
        className={`${inputClass} flex items-center gap-2 py-2.5 pr-9 pl-3 text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code ${selected.code}, ${selected.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <CountryFlag iso={selected.iso} name={selected.name} />
        <span>{selected.code}</span>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-[0_16px_44px_rgba(17,153,158,0.18)] ring-1 ring-black/5"
        >
          {PHONE_CODES.map((item) => {
            const isSelected = item.code === selected.code;
            return (
              <li key={item.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                    isSelected
                      ? "bg-[#e7f6f7] font-medium text-gray-900"
                      : "text-gray-800 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <CountryFlag iso={item.iso} name={item.name} />
                  <span>{item.code}</span>
                  <span className="truncate text-gray-500">{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function Register() {
  const [role, setRole] = useState("");
  const [companyJoinType, setCompanyJoinType] = useState("");
  const [referralToken, setReferralToken] = useState("");
  const [referralChecked, setReferralChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGeneral, setAcceptedGeneral] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const isExistingCompany = companyJoinType === "existing_company";
  const showRoleSelect = !!companyJoinType;
  const showRemainingFields = !!companyJoinType && !!role;

  const [formData, setFormData] = useState({
    role: "",
    username: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactPosition: "",
    companyName: "",
    companyID: "",
    companyAddress: "",
    companyPostalCode: "",
    companyCity: "",
    companyCountry: "",
    companyWebsite: "",
    companyFoundingYear: "",
    providerType: "",
    companyProfessionals: "",
    countryCode: "+358",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const orgLabel = role === "provider" ? "Law Firm" : "Company";
  const requirements = getPasswordRequirementResults(formData.password);
  const confirmMismatched =
    Boolean(formData.confirmPassword) &&
    formData.password !== formData.confirmPassword;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) {
      setReferralChecked(true);
      return;
    }

    fetch(`/api/invite/referral/${encodeURIComponent(ref)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valid) {
          window.location.href = "/referral-link-used";
          return;
        }

        setReferralToken(ref);
        setCompanyJoinType("new_company");
        setRole("provider");
        if (data.firmName) {
          setFormData((prev) => ({ ...prev, companyName: data.firmName }));
        }
        setReferralChecked(true);
      })
      .catch(() => {
        window.location.href = "/referral-link-used";
      });
  }, []);

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    clearFieldError(name);
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    if (requirements.some((requirement) => !requirement.met)) {
      const nextFieldErrors = {
        password:
          "Password must be at least 8 characters and include one uppercase letter, one number, and one special character.",
      };
      setFieldErrors(nextFieldErrors);
      setFormError(nextFieldErrors.password);
      scrollToRegisterError(nextFieldErrors);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      const nextFieldErrors = { confirmPassword: "Passwords do not match." };
      setFieldErrors(nextFieldErrors);
      setFormError("Passwords do not match.");
      scrollToRegisterError(nextFieldErrors);
      return;
    }
    if (!(acceptedTerms && acceptedPrivacy && acceptedGeneral)) {
      setFormError("Please accept the required terms to continue.");
      scrollToRegisterError({});
      return;
    }

    const payload = {
      role,
      companyJoinType,
      username: formData.username.trim(),
      password: formData.password,
      companyName: formData.companyName.trim(),
      companyId: formData.companyID.trim(),
      contactFirstName: formData.contactFirstName.trim(),
      contactLastName: formData.contactLastName.trim(),
      contactEmail: formData.contactEmail.trim(),
      contactPosition: formData.contactPosition.trim(),
      countryCode: formData.countryCode,
      phone: String(formData.phone).trim(),
    };

    if (referralToken) {
      payload.referralToken = referralToken;
    }

    if (companyJoinType === "new_company") {
      Object.assign(payload, {
        companyAddress: formData.companyAddress.trim(),
        companyPostalCode: formData.companyPostalCode.trim(),
        companyCity: formData.companyCity.trim(),
        companyCountry: formData.companyCountry,
        companyWebsite: formData.companyWebsite.trim(),
        companyFoundingYear: formData.companyFoundingYear.trim(),
        providerType: formData.providerType.trim(),
        companyProfessionals: formData.companyProfessionals,
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        const parsed = parseRegisterErrors(data);
        setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError);
        scrollToRegisterError(parsed.fieldErrors);
        return;
      }

      window.location.href = "/register-screening";
    } catch {
      setFormError(
        "Network error. Please check your connection and try again.",
      );
      scrollToRegisterError({});
    } finally {
      setSubmitting(false);
    }
  };

  const passwordToneClass =
    confirmMismatched || fieldErrors.confirmPassword
      ? "border-red-500 focus:border-red-600 focus:ring-red-500/30"
      : "border-gray-300 focus:border-[#11999e] focus:ring-[#11999e]/30";
  const invalidClass = (name) => (fieldErrors[name] ? errorInputClass : "");

  return (
    <HubShell contentClassName="flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col items-center justify-center">
      <img
        src="/lexify_teal.png"
        alt="LEXIFY"
        className="mb-4 h-32 w-auto object-contain sm:h-40"
      />

      <div className="w-full rounded-2xl bg-white px-6 pt-4 pb-6 text-gray-900 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="mb-6 text-center">
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#11999e] text-white">
            <UserPlus
              className="h-7 w-7"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Create a LEXIFY account
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Register your organization and start using LEXIFY.
          </p>
        </div>

        {!referralChecked ? (
          <p className="mb-4 text-center text-sm text-gray-500">
            Loading registration…
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Is your organization already using LEXIFY?"
            htmlFor="companyJoinType"
            error={fieldErrors.companyJoinType}
            tooltip={
              <NarrowTooltip tooltipText="If your organization is not yet registered with LEXIFY, please select 'My company or law firm is not yet on LEXIFY'. If your organization is already registered with LEXIFY and you are adding yourself as a new user, please select 'My company or law firm already uses LEXIFY'." />
            }
          >
            <SelectField
              id="companyJoinType"
              icon={Building2}
              className={invalidClass("companyJoinType")}
              value={companyJoinType}
              onChange={(e) => {
                setCompanyJoinType(e.target.value);
                setRole("");
                clearFieldError("companyJoinType");
                clearFieldError("role");
                if (formError) setFormError("");
              }}
              required
            >
              <option value="" disabled>
                Select
              </option>
              <option value="new_company">
                My company or law firm is not yet on LEXIFY
              </option>
              <option value="existing_company">
                My company or law firm already uses LEXIFY
              </option>
            </SelectField>
          </Field>

          {showRoleSelect ? (
            <Field
              label="My organization is a:"
              htmlFor="role"
              error={fieldErrors.role}
            >
              <SelectField
                id="role"
                icon={Scale}
                className={invalidClass("role")}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  clearFieldError("role");
                  if (formError) setFormError("");
                }}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="provider">
                  Provider of legal services (law firm)
                </option>
                <option value="purchaser">
                  Legal services purchaser (company)
                </option>
              </SelectField>
            </Field>
          ) : null}

          {showRemainingFields ? (
            <>
              <Field
                label={`${orgLabel} name`}
                htmlFor="companyName"
                error={fieldErrors.companyName}
              >
                <IconInput
                  icon={Building2}
                  id="companyName"
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  placeholder={`${orgLabel} name`}
                  onChange={handleChange}
                  className={invalidClass("companyName")}
                  aria-invalid={Boolean(fieldErrors.companyName)}
                  required
                />
              </Field>
              <Field
                label={`${orgLabel} business ID number`}
                htmlFor="companyID"
                error={fieldErrors.companyID}
              >
                <IconInput
                  icon={IdCard}
                  id="companyID"
                  type="text"
                  name="companyID"
                  placeholder={`${orgLabel} business ID number`}
                  onChange={handleChange}
                  className={invalidClass("companyID")}
                  aria-invalid={Boolean(fieldErrors.companyID)}
                  required
                />
              </Field>

              {!isExistingCompany ? (
                <>
                  <Field
                    label={`${orgLabel} street address`}
                    htmlFor="companyAddress"
                    error={fieldErrors.companyAddress}
                  >
                    <IconInput
                      icon={MapPin}
                      id="companyAddress"
                      type="text"
                      name="companyAddress"
                      placeholder={`${orgLabel} street address`}
                      onChange={handleChange}
                      className={invalidClass("companyAddress")}
                      aria-invalid={Boolean(fieldErrors.companyAddress)}
                      required={!isExistingCompany}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label={`${orgLabel} postal code`}
                      htmlFor="companyPostalCode"
                      error={fieldErrors.companyPostalCode}
                    >
                      <IconInput
                        icon={Mailbox}
                        id="companyPostalCode"
                        type="text"
                        name="companyPostalCode"
                        placeholder="Postal code"
                        onChange={handleChange}
                        className={invalidClass("companyPostalCode")}
                        aria-invalid={Boolean(fieldErrors.companyPostalCode)}
                        required
                      />
                    </Field>
                    <Field
                      label={`${orgLabel} city`}
                      htmlFor="companyCity"
                      error={fieldErrors.companyCity}
                    >
                      <IconInput
                        icon={Building2}
                        id="companyCity"
                        type="text"
                        name="companyCity"
                        placeholder="City"
                        onChange={handleChange}
                        className={invalidClass("companyCity")}
                        aria-invalid={Boolean(fieldErrors.companyCity)}
                        required
                      />
                    </Field>
                  </div>
                  <Field
                    label={`${orgLabel} country of domicile`}
                    htmlFor="companyCountry"
                    error={fieldErrors.companyCountry}
                  >
                    <SelectField
                      id="companyCountry"
                      name="companyCountry"
                      icon={Globe}
                      onChange={handleChange}
                      className={invalidClass("companyCountry")}
                      required
                      defaultValue=""
                    >
                      <option value="">{orgLabel} country of domicile</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </SelectField>
                  </Field>
                  <Field
                    label={`${orgLabel}'s website`}
                    htmlFor="companyWebsite"
                    error={fieldErrors.companyWebsite}
                  >
                    <IconInput
                      icon={Globe}
                      id="companyWebsite"
                      type="text"
                      name="companyWebsite"
                      placeholder={`${orgLabel}'s website`}
                      onChange={handleChange}
                      className={invalidClass("companyWebsite")}
                      aria-invalid={Boolean(fieldErrors.companyWebsite)}
                      required
                    />
                  </Field>
                </>
              ) : null}

              {role === "provider" && !isExistingCompany ? (
                <>
                  <Field
                    label="Year established"
                    htmlFor="companyFoundingYear"
                    hint="Enter the year your firm started providing legal services."
                    error={fieldErrors.companyFoundingYear}
                  >
                    <IconInput
                      icon={Calendar}
                      id="companyFoundingYear"
                      type="number"
                      name="companyFoundingYear"
                      placeholder="Year established"
                      onChange={handleChange}
                      className={invalidClass("companyFoundingYear")}
                      aria-invalid={Boolean(fieldErrors.companyFoundingYear)}
                      required
                    />
                  </Field>
                  <Field
                    label="Professional regulation category"
                    htmlFor="providerType"
                    error={fieldErrors.providerType}
                  >
                    <SelectField
                      id="providerType"
                      name="providerType"
                      icon={BadgeCheck}
                      onChange={handleChange}
                      className={invalidClass("providerType")}
                      required
                      defaultValue=""
                    >
                      <option value="">Professional regulation category</option>
                      <option value="Attorneys-at-law">
                        Bar-admitted law firm - attorneys regulated by bar
                        association or law society
                      </option>
                      <option value="Law Firm">
                        Licensed legal service provider - licensed by
                        government/regulatory authority, not bar-regulated
                      </option>
                    </SelectField>
                  </Field>
                  <Field
                    label={`Number of legal professionals employed by ${orgLabel}`}
                    htmlFor="companyProfessionals"
                    hint="Include only individuals with a formal law degree who are authorized to practice law, have profiles on your firm's website, and provide client services (excluding administrative or support roles)."
                    error={fieldErrors.companyProfessionals}
                  >
                    <IconInput
                      icon={Users}
                      id="companyProfessionals"
                      type="number"
                      name="companyProfessionals"
                      placeholder="Number of legal professionals"
                      onChange={handleChange}
                      className={invalidClass("companyProfessionals")}
                      aria-invalid={Boolean(fieldErrors.companyProfessionals)}
                      required
                    />
                  </Field>
                </>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  htmlFor="contactFirstName"
                  error={fieldErrors.contactFirstName}
                >
                  <IconInput
                    icon={User}
                    id="contactFirstName"
                    type="text"
                    name="contactFirstName"
                    placeholder="First name"
                    onChange={handleChange}
                    className={invalidClass("contactFirstName")}
                    aria-invalid={Boolean(fieldErrors.contactFirstName)}
                    required
                  />
                </Field>
                <Field
                  label="Last name"
                  htmlFor="contactLastName"
                  error={fieldErrors.contactLastName}
                >
                  <IconInput
                    icon={User}
                    id="contactLastName"
                    type="text"
                    name="contactLastName"
                    placeholder="Last name"
                    onChange={handleChange}
                    className={invalidClass("contactLastName")}
                    aria-invalid={Boolean(fieldErrors.contactLastName)}
                    required
                  />
                </Field>
              </div>
              <Field
                label="Email"
                htmlFor="contactEmail"
                error={fieldErrors.contactEmail}
              >
                <IconInput
                  icon={Mail}
                  id="contactEmail"
                  type="email"
                  name="contactEmail"
                  placeholder="Email"
                  onChange={handleChange}
                  className={invalidClass("contactEmail")}
                  aria-invalid={Boolean(fieldErrors.contactEmail)}
                  required
                />
              </Field>
              <Field
                label={`Title/position in ${orgLabel}`}
                htmlFor="contactPosition"
                error={fieldErrors.contactPosition}
              >
                <IconInput
                  icon={Briefcase}
                  id="contactPosition"
                  type="text"
                  name="contactPosition"
                  placeholder={`Title/position in ${orgLabel}`}
                  onChange={handleChange}
                  className={invalidClass("contactPosition")}
                  aria-invalid={Boolean(fieldErrors.contactPosition)}
                  required
                />
              </Field>
              <Field
                label="Telephone"
                htmlFor="phone"
                error={fieldErrors.phone || fieldErrors.countryCode}
              >
                <div className="flex gap-2">
                  <PhoneCodeSelect
                    value={formData.countryCode}
                    onChange={(code) => {
                      setFormData((prev) => ({ ...prev, countryCode: code }));
                      clearFieldError("countryCode");
                      if (formError) setFormError("");
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <IconInput
                      icon={Phone}
                      id="phone"
                      type="tel"
                      name="phone"
                      placeholder="Telephone"
                      onChange={handleChange}
                      className={invalidClass("phone")}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      required
                    />
                  </div>
                </div>
              </Field>
              <Field
                label="Username"
                htmlFor="username"
                error={fieldErrors.username}
              >
                <IconInput
                  icon={User}
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Username"
                  onChange={handleChange}
                  className={invalidClass("username")}
                  aria-invalid={Boolean(fieldErrors.username)}
                  required
                />
              </Field>
              <Field
                label="Password"
                htmlFor="password"
                error={fieldErrors.password}
              >
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    className={`${inputClass} pr-11 pl-10 ${invalidClass("password")}`}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.password)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </Field>
              <Field
                label="Confirm password"
                htmlFor="confirmPassword"
                error={
                  confirmMismatched ? undefined : fieldErrors.confirmPassword
                }
              >
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    id="confirmPassword"
                    type={showRePassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={`w-full rounded-lg border bg-white py-2.5 pr-11 pl-10 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-1 ${passwordToneClass}`}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowRePassword((v) => !v)}
                    aria-label={
                      showRePassword ? "Hide password" : "Show password"
                    }
                  >
                    {showRePassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {confirmMismatched ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                    <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Passwords do not match
                  </p>
                ) : null}
              </Field>

              <div className="rounded-xl border border-[#11999e]/25 bg-[#e7f6f7] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheck
                    className="h-4 w-4 text-[#11999e]"
                    aria-hidden="true"
                  />
                  Password Requirements
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {requirements.map((requirement) => (
                    <li
                      key={`${requirement.id}-${requirement.met ? "met" : "unmet"}`}
                      className={`flex items-center gap-2 text-sm ${
                        requirement.met
                          ? "font-medium text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {requirement.met ? (
                        <CheckCircle2
                          className="h-5 w-5 shrink-0 text-green-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="h-5 w-5 shrink-0 text-gray-300"
                          aria-hidden="true"
                        />
                      )}
                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 text-left">
                <p className="mb-3 text-sm font-semibold text-gray-800">
                  By registering an account with LEXIFY, you confirm that you
                  have carefully reviewed the following documents and commit to
                  complying with the terms and conditions therein when using our
                  services:
                </p>
                <div className="space-y-2 text-sm">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (formError) setFormError("");
                      }}
                      className="mt-0.5 h-4 w-4 accent-[#11999e]"
                    />
                    <Link
                      href="/docs/lexify-tos-september-2026.pdf"
                      className="text-[#11999e] underline hover:text-[#0e8488]"
                      target="_blank"
                      rel="noopener"
                    >
                      LEXIFY Terms of Service
                    </Link>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => {
                        setAcceptedPrivacy(e.target.checked);
                        if (formError) setFormError("");
                      }}
                      className="mt-0.5 h-4 w-4 accent-[#11999e]"
                    />
                    <Link
                      href="/docs/lexify-privacy-statement.pdf"
                      className="text-[#11999e] underline hover:text-[#0e8488]"
                      target="_blank"
                      rel="noopener"
                    >
                      Privacy Statement for LEXIFY Platform
                    </Link>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={acceptedGeneral}
                      onChange={(e) => {
                        setAcceptedGeneral(e.target.checked);
                        if (formError) setFormError("");
                      }}
                      className="mt-0.5 h-4 w-4 accent-[#11999e]"
                    />
                    <Link
                      href="/docs/lexify-gtcs.pdf"
                      className="text-[#11999e] underline hover:text-[#0e8488]"
                      target="_blank"
                      rel="noopener"
                    >
                      General Terms and Conditions for LEXIFY Contracts
                    </Link>
                  </label>
                </div>
              </div>

              {formError ? (
                <p
                  id="register-form-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {formError}
                </p>
              ) : (
                <div id="register-form-error" />
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !(acceptedTerms && acceptedPrivacy && acceptedGeneral)
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors ${
                  acceptedTerms && acceptedPrivacy && acceptedGeneral
                    ? "cursor-pointer bg-[#11999e] hover:bg-[#0e8488]"
                    : "cursor-not-allowed bg-gray-400"
                } disabled:opacity-60`}
              >
                {submitting ? "Registering…" : "Register account"}
                {!submitting &&
                acceptedTerms &&
                acceptedPrivacy &&
                acceptedGeneral ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </button>
            </>
          ) : null}
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#11999e] hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-gray-700">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Your data is encrypted and secure.
      </p>
    </HubShell>
  );
}
