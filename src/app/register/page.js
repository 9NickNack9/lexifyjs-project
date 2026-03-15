"use client";

import { useState } from "react";
import Link from "next/link";
import NarrowTooltip from "../components/QuestionmarkTooltip";

export default function Register() {
  const [role, setRole] = useState("");
  const [companyJoinType, setCompanyJoinType] = useState(""); // "new_company" | "existing_company"
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGeneral, setAcceptedGeneral] = useState(false);

  const isExistingCompany = companyJoinType === "existing_company";
  const showRoleSelect = !!companyJoinType;
  const showRemainingFields = !!companyJoinType && !!role;

  const [formData, setFormData] = useState({
    role: "",
    username: "",
    contactName: "",
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
    countryCode: "+358", // default EU country (e.g., Finland)
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const orgLabel = role === "provider" ? "Law Firm" : "Company";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      alert("Password has to be at least 8 characters long!");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (!(acceptedTerms && acceptedPrivacy && acceptedGeneral)) {
      alert("Please accept the required terms to continue.");
      return;
    }

    const payload = {
      role, // "provider" | "purchaser"
      companyJoinType, // "new_company" | "existing_company"

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

    if (companyJoinType === "new_company") {
      Object.assign(payload, {
        companyAddress: formData.companyAddress.trim(),
        companyPostalCode: formData.companyPostalCode.trim(),
        companyCity: formData.companyCity.trim(),
        companyCountry: formData.companyCountry,
        companyWebsite: formData.companyWebsite.trim(),

        // provider-only fields (backend will only validate if role === "provider")
        companyFoundingYear: formData.companyFoundingYear.trim(),
        providerType: formData.providerType.trim(),
        companyProfessionals: formData.companyProfessionals,
      });
    }

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
        alert(data?.error || "Registration failed.");
        return;
      }

      // Success → go to screening
      window.location.href = "/register-screening";
    } catch (err) {
      alert("Network error registering your account.");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Business Logo" className="mb-4 w-96" />
      <h1 className="text-3xl font-bold mb-4">Create a LEXIFY Account</h1>
      <div className="w-full max-w-4xl p-3 rounded shadow-2xl bg-white text-black text-center">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full space-y-2"
        >
          <div className="flex flex-col items-start">
            <label className="text-md font-medium mb-1">
              Is your organization already using LEXIFY?{" "}
              <NarrowTooltip tooltipText="If your organization is not yet registered with LEXIFY, please select 'My company or law firm is not yet on LEXIFY'. If your organization is already registered with LEXIFY and you are adding yourself as a new user, please select 'My company or law firm already uses LEXIFY'." />
            </label>
            <select
              value={companyJoinType}
              onChange={(e) => {
                const value = e.target.value;
                setCompanyJoinType(value);
                setRole("");
              }}
              className="p-2 border w-full"
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
            </select>
          </div>
          {showRoleSelect && (
            <>
              <br />
              <div className="flex flex-col items-start">
                <label className="text-md font-medium mb-1">
                  My organization is a:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="p-2 border w-full"
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
                </select>
              </div>
            </>
          )}
          {showRemainingFields && (
            <>
              <br />
              <input
                type="text"
                name="companyName"
                placeholder={`${orgLabel} Name`}
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <input
                type="text"
                name="companyID"
                placeholder={`${orgLabel} Business ID Number`}
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              {!isExistingCompany && (
                <>
                  <input
                    type="text"
                    name="companyAddress"
                    placeholder={`${orgLabel} Street Address`}
                    className="p-2 border"
                    onChange={handleChange}
                    required={!isExistingCompany}
                  />
                  <br />
                  <input
                    type="text"
                    name="companyPostalCode"
                    placeholder={`${orgLabel} Postal Code`}
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  />
                  <br />
                  <input
                    type="text"
                    name="companyCity"
                    placeholder={`${orgLabel} City`}
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  />
                  <br />
                  <select
                    name="companyCountry"
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  >
                    <option value="">{orgLabel} Country of Domicile</option>
                    <option value="Austria">Austria</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Bulgaria">Bulgaria</option>
                    <option value="Croatia">Croatia</option>
                    <option value="Cyprus">Cyprus</option>
                    <option value="Czechia">Czechia</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Estonia">Estonia</option>
                    <option value="Finland">Finland</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Greece">Greece</option>
                    <option value="Hungary">Hungary</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Italy">Italy</option>
                    <option value="Latvia">Latvia</option>
                    <option value="Lithuania">Lithuania</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Malta">Malta</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Romania">Romania</option>
                    <option value="Slovakia">Slovakia</option>
                    <option value="Slovenia">Slovenia</option>
                    <option value="Spain">Spain</option>
                    <option value="Sweden">Sweden</option>
                  </select>
                  <br />
                  <input
                    type="text"
                    name="companyWebsite"
                    placeholder={`${orgLabel}'s Website`}
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  />
                  <br />
                </>
              )}
              {role === "provider" && !isExistingCompany && (
                <>
                  <input
                    type="number"
                    name="companyFoundingYear"
                    placeholder="Year Established"
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs pb-2 text-justify">
                    <strong>NOTE: </strong>
                    <em>
                      Enter the year your firm started providing legal services.
                    </em>
                  </p>
                  <br />
                  <select
                    name="providerType"
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  >
                    <option value="">Professional Regulation Category </option>
                    <option value="Attorneys-at-law">
                      Bar-admitted law firm - attorneys regulated by bar
                      association or law society
                    </option>
                    <option value="Law Firm">
                      Licensed legal service provider - licensed by
                      government/regulatory authority, not bar-regulated
                    </option>
                  </select>
                  <br />
                  <input
                    type="number"
                    name="companyProfessionals"
                    placeholder={`Number of Legal Professionals Employed by ${orgLabel}`}
                    className="p-2 border"
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs pb-2 text-justify">
                    <strong>NOTE: </strong>
                    <em>
                      A legal professional refers to an individual who has
                      obtained a formal law degree (such as a Master of Laws,
                      Juris Doctor, Bachelor of Laws, or equivalent) from an
                      accredited university or comparable institution and is
                      authorized to practice law within the jurisdiction of your
                      firm. When reporting the number of legal professionals
                      employed by your firm, please include only those
                      individuals who (i) meet the criteria above, (ii) have
                      professional profiles displayed on your firm's website,
                      and (iii) provide client services (excluding
                      administrative or support roles).
                    </em>
                  </p>
                  <br />
                </>
              )}
              <input
                type="text"
                name="contactFirstName"
                placeholder="First Name"
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <input
                type="text"
                name="contactLastName"
                placeholder="Last Name"
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <input
                type="email"
                name="contactEmail"
                placeholder="Email"
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <input
                type="text"
                name="contactPosition"
                placeholder={`Title/Position in ${orgLabel}`}
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <div className="flex gap-2 items-center">
                <select
                  name="countryCode"
                  className="p-2 border w-55"
                  onChange={handleChange}
                  required
                >
                  <option value="+358">🇫🇮 +358 (Finland)</option>
                  <option value="+43">🇦🇹 +43 (Austria)</option>
                  <option value="+32">🇧🇪 +32 (Belgium)</option>
                  <option value="+359">🇧🇬 +359 (Bulgaria)</option>
                  <option value="+385">🇭🇷 +385 (Croatia)</option>
                  <option value="+357">🇨🇾 +357 (Cyprus)</option>
                  <option value="+420">🇨🇿 +420 (Czechia)</option>
                  <option value="+45">🇩🇰 +45 (Denmark)</option>
                  <option value="+372">🇪🇪 +372 (Estonia)</option>
                  <option value="+33">🇫🇷 +33 (France)</option>
                  <option value="+49">🇩🇪 +49 (Germany)</option>
                  <option value="+30">🇬🇷 +30 (Greece)</option>
                  <option value="+36">🇭🇺 +36 (Hungary)</option>
                  <option value="+353">🇮🇪 +353 (Ireland)</option>
                  <option value="+39">🇮🇹 +39 (Italy)</option>
                  <option value="+371">🇱🇻 +371 (Latvia)</option>
                  <option value="+370">🇱🇹 +370 (Lithuania)</option>
                  <option value="+352">🇱🇺 +352 (Luxembourg)</option>
                  <option value="+356">🇲🇹 +356 (Malta)</option>
                  <option value="+31">🇳🇱 +31 (Netherlands)</option>
                  <option value="+48">🇵🇱 +48 (Poland)</option>
                  <option value="+351">🇵🇹 +351 (Portugal)</option>
                  <option value="+40">🇷🇴 +40 (Romania)</option>
                  <option value="+421">🇸🇰 +421 (Slovakia)</option>
                  <option value="+386">🇸🇮 +386 (Slovenia)</option>
                  <option value="+34">🇪🇸 +34 (Spain)</option>
                  <option value="+46">🇸🇪 +46 (Sweden)</option>
                </select>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Telephone"
                  className="p-2 border flex-1"
                  onChange={handleChange}
                  required
                />
              </div>
              <br />
              <input
                type="text"
                name="username"
                placeholder="Username"
                className="p-2 border"
                onChange={handleChange}
                required
              />
              <br />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  className="p-2 border w-full"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <br />
              <div className="relative">
                <input
                  type={showRePassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter Password"
                  className="p-2 border w-full"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 cursor-pointer"
                  onClick={() => setShowRePassword(!showRePassword)}
                >
                  {showRePassword ? "Hide" : "Show"}
                </button>
              </div>
              <br />
              <p className="text-xs pb-2 text-justify">
                <strong>
                  By registering an account with LEXIFY, you confirm that you
                  have carefully reviewed the following documents and commit to
                  complying with the terms and conditions therein when using our
                  services:
                </strong>
              </p>
              <div className="flex flex-col items-start space-y-2 mt-2 mb-4 text-sm text-left">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <Link
                    href="/docs/lexify-tos.pdf"
                    className="text-blue-500 underline"
                    target="_blank"
                    rel="noopener"
                  >
                    LEXIFY Terms of Service
                  </Link>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  />
                  <Link
                    href="/docs/lexify-privacy-statement.pdf"
                    className="text-blue-500 underline"
                    target="_blank"
                    rel="noopener"
                  >
                    Privacy Statement for LEXIFY Platform
                  </Link>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={acceptedGeneral}
                    onChange={(e) => setAcceptedGeneral(e.target.checked)}
                  />
                  <Link
                    href="/docs/lexify-gtcs.pdf"
                    className="text-blue-500 underline"
                    target="_blank"
                    rel="noopener"
                  >
                    General Terms and Conditions for LEXIFY Contracts
                  </Link>
                </label>
              </div>

              <br />
              <button
                href="/register-screening"
                type="submit"
                disabled={
                  !(acceptedTerms && acceptedPrivacy && acceptedGeneral)
                }
                className={`p-2 text-white ${
                  acceptedTerms && acceptedPrivacy && acceptedGeneral
                    ? "bg-[#11999e] cursor-pointer"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Register Account
              </button>
            </>
          )}
        </form>
        <div className="mt-4 flex flex-col items-center justify-center">
          <p>Already have an account?</p>
          <Link href="/login">
            <button className="text-[#11999e] mt-1 cursor-pointer">
              Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
