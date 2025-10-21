"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";

export default function SalesB2C() {
  const router = useRouter();

  const initialFormState = {
    contactPerson: "",
    need: "",
    description: "",
    confidential: "",
    confboxes: [],
    background: "",
    backgroundFiles: [],
    offerer: "",
    providerCountry: "",
    lawyerCount: "",
    firmAge: "",
    firmRating: "",
    currency: "",
    maxPrice: "",
    retainerFee: "",
    paymentTerms: "",
    checkboxes: [],
    otherLang: "",
    date: "",
    supplierFiles: [],
    requestTitle: "",
    agree: false,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [showPreview, setShowPreview] = useState(false);
  const [contactOptions, setContactOptions] = useState([]);
  const [company, setCompany] = useState({ name: "", id: "", country: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch company + contact persons (same behavior as B2B)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const me = await res.json();

        setCompany({
          name: me?.companyName || "",
          id: me?.companyId || "",
          country: me?.companyCountry || "",
        });

        const list = Array.isArray(me.companyContactPersons)
          ? me.companyContactPersons
          : [];
        const opts = list
          .map((p) => {
            const first = (p.firstName || "").trim();
            const last = (p.lastName || "").trim();
            const full = [first, last].filter(Boolean).join(" ").trim();
            return full ? { label: full, value: full } : null;
          })
          .filter(Boolean);
        setContactOptions(opts);
      } catch {
        // no-op
      }
    })();
  }, []);

  const handleBackgroundFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      backgroundFiles: [...s.backgroundFiles, ...newFiles],
    }));
    e.target.value = "";
  };

  const handleSupplierFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      supplierFiles: [...s.supplierFiles, ...newFiles],
    }));
    e.target.value = "";
  };

  const handleDeleteBackgroundFile = (index) => {
    const updated = [...formData.backgroundFiles];
    updated.splice(index, 1);
    setFormData({ ...formData, backgroundFiles: updated });
  };

  const handleDeleteSupplierFile = (index) => {
    const updated = [...formData.supplierFiles];
    updated.splice(index, 1);
    setFormData({ ...formData, supplierFiles: updated });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "agree") {
        setFormData({ ...formData, agree: checked });
      } else if (name === "confboxes") {
        setFormData({
          ...formData,
          confboxes: checked
            ? [...formData.confboxes, value]
            : formData.confboxes.filter((item) => item !== value),
        });
      } else {
        setFormData({
          ...formData,
          checkboxes: checked
            ? [...formData.checkboxes, value]
            : formData.checkboxes.filter((item) => item !== value),
        });
      }
    } else if (type === "radio") {
      setFormData({ ...formData, need: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const isTemplateOption =
    formData.need ===
    "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.";

  const validate = () => {
    if (!formData.contactPerson)
      return "Please select a primary contact person.";
    if (!formData.need) return "Please select what you need.";
    if (!formData.description)
      return "Please provide a brief description of your company's line of business.";
    if (!formData.offerer) return "Please choose which providers can offer.";
    if (!formData.providerCountry)
      return "Please choose domestic/foreign offers.";
    if (!formData.lawyerCount) return "Please choose a minimum provider size.";
    if (!formData.firmAge) return "Please choose a minimum company age.";
    if (!formData.firmRating) return "Please choose a minimum rating.";
    if (!formData.currency) return "Please choose a currency.";
    if (!formData.retainerFee)
      return "Please choose an advance retainer option.";
    if (!formData.paymentTerms)
      return "Please choose how you want to be invoiced.";

    const langs = [
      ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
      formData.otherLang || null,
    ].filter(Boolean);
    if (langs.length === 0)
      return "Please select at least one language (or type another).";

    if (!formData.date) return "Please pick an offers deadline.";
    if (!formData.requestTitle)
      return "Please give a title for your LEXIFY Request.";
    if (isTemplateOption && !formData.maxPrice)
      return "Please set a maximum price for the template option.";
    if (!formData.agree) return "You must confirm you're ready to submit.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    setSubmitting(true);
    try {
      const paymentRate = isTemplateOption
        ? "Lump sum fixed price"
        : "Hourly Rate";
      const languageCSV = [
        ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
        formData.otherLang || null,
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "B2C Sales",
        primaryContactPerson: formData.contactPerson,
        scopeOfWork: formData.need,
        description: formData.description,
        additionalBackgroundInfo: formData.background || "",
        // files will be read server-side from form-data blobs:
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        serviceProviderType: formData.offerer,
        domesticOffers: formData.providerCountry,
        providerSize: formData.lawyerCount,
        providerCompanyAge: formData.firmAge,
        providerMinimumRating: formData.firmRating,
        currency: formData.currency,
        paymentRate,
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date, // API will set end-of-day locally
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          confidential:
            !!formData.confidential ||
            formData.confboxes.includes("Disclosed to Winning Bidder Only"),
          winnerBidderOnlyStatus: formData.confboxes.includes(
            "Disclosed to Winning Bidder Only"
          )
            ? "Disclosed to Winning Bidder Only"
            : formData.confidential || "",
          maximumPrice: isTemplateOption ? formData.maxPrice : null,
        },
      };

      const form = new FormData();
      form.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
      for (const f of formData.backgroundFiles)
        form.append("backgroundFiles", f, f.name);
      for (const f of formData.supplierFiles)
        form.append("supplierFiles", f, f.name);

      const res = await fetch("/api/requests", { method: "POST", body: form });

      // Defensive response parsing to avoid "Unexpected end of JSON input"
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore, we'll surface text below if error
      }
      if (!res.ok) {
        throw new Error(
          (json && json.error) || text || "Failed to create request."
        );
      }

      alert("LEXIFY Request submitted successfully.");
      router.push("/main");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData(initialFormState);
    const formElements = document.querySelectorAll("input, textarea, select");
    formElements.forEach((el) => {
      if (el.type === "text" || el.tagName === "TEXTAREA") el.value = "";
      else if (el.type === "checkbox" || el.type === "radio")
        el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else if (el.type === "file") el.value = [];
    });
  };

  function Section({ title, children }) {
    return (
      <div>
        <div className="bg-[#11999e] p-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">Create a LEXIFY Request</h1>
      <h2 className="text-2xl font-semibold mb-6">
        Help with B2C Sales Contracts
      </h2>

      <div className="w-full max-w-7xl p-6 rounded shadow-2xl text-black bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Who is the primary contact person for this LEXIFY Request at your
              company?{" "}
              <QuestionMarkTooltip tooltipText="All updates and notifications regarding this LEXIFY Request will be sent to the designated person. If you do not see your name listed below, you can add new contact persons on the 'My Account' page (see My Account in the LEXIFY main menu)." />
            </h4>
            <select
              name="contactPerson"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.contactPerson}
              required
            >
              <option value="">Select</option>
              {contactOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <br />
          <hr />
          <br />

          <h4 className="text-md font-medium font-semibold">
            What do you need?
          </h4>
          {[
            "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.",
            "Legal review of comments from a customer of the Client on the Client's contract template and possible further assistance during later negotiation rounds.",
          ].map((option, index) => (
            <div key={index}>
              <label className="block">
                <input
                  type="radio"
                  name="need"
                  value={option}
                  checked={formData.need === option}
                  onChange={handleChange}
                />
                {option ===
                  "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication." && (
                  <>
                    {" I need a sales contract template for my B2C business"}
                    <QuestionMarkTooltip tooltipText="Any offers you receive will include the preparation of the document(s) and necessary revisions on the basis of your feedback to the legal service provider." />
                  </>
                )}
                {option ===
                  "Legal review of comments from a customer of the Client on the Client's contract template and possible further assistance during later negotiation rounds." &&
                  " I need a legal review of a customer's comments on my own contract template and possible further assistance during later negotiation rounds"}
              </label>
              <p className="text-xs pb-2">
                <strong>NOTE: </strong>
                <em>
                  {option ===
                  "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication."
                    ? "Any offers you receive will be for a lump sum fixed price."
                    : "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the relevant customer contract has been signed or abandoned, whichever comes first."}
                </em>
              </p>
            </div>
          ))}

          <br />
          <hr />
          <br />

          <h4 className="text-md font-semibold">
            Please provide a brief description of your company&apos;s line of
            business{" "}
            <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
          </h4>
          <textarea
            name="description"
            className="w-full border p-2"
            onChange={handleChange}
            value={formData.description}
          ></textarea>

          <br />
          <br />
          <hr />
          <br />

          {!formData.need.includes(
            "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication."
          ) && (
            <div>
              <h4 className="text-md font-medium mb-1 font-semibold">
                Please provide the name, business identity code and country of
                domicile of the customer with whom you are negotiating the
                contract. If you do not want the name of the customer to be
                visible to all legal service providers qualified to make you an
                offer, please also check the box “Disclosed to Winning Bidder
                Only”.{" "}
                <QuestionMarkTooltip tooltipText="If “Disclosed to Winning Bidder Only” is checked, the identity of your customer will be disclosed only to the legal service provider submitting the winning offer to enable that service provider to complete its statutory conflict checks. If an existing conflict is then notified by the legal service provider to LEXIFY, the winning offer will automatically be disqualified and the second-best offer (if any) will replace it as the winning offer." />
              </h4>
              <textarea
                name="confidential"
                className="w-full border p-2"
                onChange={handleChange}
                value={formData.confidential}
              ></textarea>
              {["Disclosed to Winning Bidder Only"].map((option, index) => (
                <label key={index} className="block">
                  <input
                    type="checkbox"
                    name="confboxes"
                    value={option}
                    checked={formData.confboxes.includes(option)}
                    onChange={handleChange}
                  />{" "}
                  {option}{" "}
                  <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                </label>
              ))}
              <br />
              <hr />
              <br />
            </div>
          )}

          <h4 className="text-md font-semibold">
            Please provide additional background information, if any, you wish
            to share with legal service providers in your LEXIFY Request. If you
            want, you can also upload a separate file with additional background
            information by clicking “Upload Background Info”
            <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
          </h4>
          <textarea
            name="background"
            className="w-full border p-2"
            onChange={handleChange}
            value={formData.background}
          ></textarea>
          <div className="mt-2">
            <label className="inline-block px-4 py-2 bg-[#c8c8cf] text-black border border-black rounded cursor-pointer">
              Upload Background Info
              <input
                type="file"
                name="backgroundFiles"
                multiple
                className="hidden"
                onChange={handleBackgroundFileChange}
              />
            </label>
            <span className="ml-2 text-sm">
              {formData.backgroundFiles.length > 0
                ? `${formData.backgroundFiles.length} file(s) selected`
                : "No files selected"}
            </span>
          </div>
          {formData.backgroundFiles.length > 0 && (
            <div className="mt-2 p-2">
              <h5 className="font-medium mb-1">Uploaded Files:</h5>
              <ul className="list-disc pl-6">
                {formData.backgroundFiles.map((file, index) => (
                  <li key={index} className="flex items-center mb-1">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBackgroundFile(index)}
                      className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded cursor-pointer"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <br />
          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Which legal service providers can make you an offer?
            </h4>
            <select
              name="offerer"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.offerer}
            >
              <option value="">Select</option>
              <option value="Attorneys-at-law">Attorneys-at-law</option>
              <option value="Law firms">Law firms</option>
              <option value="Both attorneys-at-law & law firms">
                Both attorneys-at-law & law firms
              </option>
            </select>
          </div>
          <p className="text-xs pt-2">
            <strong>NOTE:</strong>{" "}
            <em>
              Attorneys-at-law are legal service providers who are members of
              the local bar association in their country of domicile. Law firms
              are legal service providers who are not members of the local bar
              association in their country of domicile, but who may offer legal
              services according to the law of their country of domicile.
            </em>
          </p>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Do you want offers only from legal service providers based in the
              same country as you?
            </h4>
            <select
              name="providerCountry"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.providerCountry}
            >
              <option value="">Select</option>
              <option value="Yes, I want offers from domestic legal service providers only.">
                Yes, I want offers from domestic legal service providers only.
              </option>
              <option value="No, I want offers from both domestic and foreign legal service providers.">
                No, I want offers from both domestic and foreign legal service
                providers.
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Do you want offers only from legal service providers of a specific
              minimum size?
            </h4>
            <select
              name="lawyerCount"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.lawyerCount}
            >
              <option value="">Select</option>
              <option value="Any size">
                No, the legal service provider can be of any size
              </option>
              <option value="At least 5 lawyers">
                Yes, at least 5 lawyers
              </option>
              <option value="At least 15 lawyers">
                Yes, at least 15 lawyers
              </option>
              <option value="At least 40 lawyers">
                Yes, at least 40 lawyers
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Do you want offers only from legal service providers who have been
              in operation for a specific minimum period of time?
            </h4>
            <select
              name="firmAge"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.firmAge}
            >
              <option value="">Select</option>
              <option value="Any age">
                No, the legal service provider can be of any age
              </option>
              <option value="At least 5 years of operation">
                Yes, at least 5 years
              </option>
              <option value="At least 10 years of operation">
                Yes, at least 10 years
              </option>
              <option value="At least 25 years of operation">
                Yes, at least 25 years
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Do tendering legal service providers need to have a minimum
              customer feedback rating? This rating is based on aggregated
              feedback a legal service provider has received previously from
              other legal service purchasers on LEXIFY.
            </h4>
            <select
              name="firmRating"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.firmRating}
            >
              <option value="">Select</option>
              <option value="Any rating">No</option>
              <option value="3">Yes, at least 3 stars</option>
              <option value="4">Yes, at least 4 stars</option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              In what currency do you want to buy the legal service?
            </h4>
            <select
              name="currency"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.currency}
            >
              <option value="">Select</option>
              <option value="Euro (€)">Euro (€)</option>
              <option value="Swedish krona (kr)">Swedish krona (kr)</option>
              <option value="Danish krone (kr)">Danish krone (kr)</option>
              <option value="Polish złoty (zł)">Polish złoty (zł)</option>
              <option value="Czech koruna (Kč)">Czech koruna (Kč)</option>
              <option value="Romanian leu (Leu)">Romanian leu (Leu)</option>
              <option value="Bulgarian lev (лв)">Bulgarian lev (лв)</option>
              <option value="Hungarian forint (Ft)">
                Hungarian forint (Ft)
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            {[
              "A sales contract template for the Client's B2C business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.",
            ].includes(formData.need) && (
              <div>
                <h4 className="text-md font-medium mb-1 font-semibold">
                  Please set a maximum price (VAT 0%) for the legal service you
                  are buying
                </h4>
                <input
                  type="text"
                  name="maxPrice"
                  placeholder="Set Maximum Price"
                  className="border p-2 w-full mb-2"
                  value={formData.maxPrice}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/[^0-9.]/g, "");
                    setFormData({ ...formData, maxPrice: onlyNumbers });
                  }}
                />
                <p className="text-xs">
                  <strong>NOTE:</strong>{" "}
                  <em>
                    Any maximum price set by you will not be visible to legal
                    service providers and will only be used to disqualify any
                    offer that exceeds your maximum price. If the best offer you
                    receive exceeds the maximum price, you can still choose to
                    accept such offer by confirming your acceptance within 48
                    hours of the expiration of your LEXIFY Request.
                  </em>
                </p>
                <br />
                <hr />
                <br />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Are you prepared to pay an advance retainer fee to the legal
              service provider submitting the winning offer?{" "}
              <QuestionMarkTooltip tooltipText="An advance retainer fee is an amount payable by you to the legal service provider submitting the winning offer within 14 days of the date of the LEXIFY Contract between you and the legal service provider. The advance retainer fee forms a part of the total price of the legal service as offered by the legal service provider. For legal work based on an hourly rate offer, the legal service provider will refund you for any unused amount of the advance retainer fee if the total price of the legal service when completed amounts to less than the amount of the advance retainer fee." />
            </h4>
            <select
              name="retainerFee"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.retainerFee}
            >
              <option value="">Select</option>
              <option value="No">No</option>
              <option value="Yes, 10% of the lump sum price (for lump sum offers) or the offered hourly rate multiplied by 3 (for hourly rate offers)">
                Yes, 10% of the lump sum price (for lump sum offers) or the
                offered hourly rate multiplied by 3 (for hourly rate offers)
              </option>
              <option value="Yes, 25% of the lump sum price (for lump sum offers) or the offered hourly rate multiplied by 5 (for hourly rate offers)">
                Yes, 25% of the lump sum price (for lump sum offers) or the
                offered hourly rate multiplied by 5 (for hourly rate offers)
              </option>
              <option value="Yes, 50% of the lump sum price (for lump sum offers) or the offered hourly rate multiplied by 10 (for hourly rate offers)">
                Yes, 50% of the lump sum price (for lump sum offers) or the
                offered hourly rate multiplied by 10 (for hourly rate offers)
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              How do you want to be invoiced?
            </h4>
            <select
              name="paymentTerms"
              className="w-full border p-2"
              onChange={handleChange}
              value={formData.paymentTerms}
            >
              <option value="">Select</option>
              <option value="On a monthly basis, invoice sent at end of each calendar month">
                On a monthly basis, invoice sent at end of each calendar month
              </option>
              <option value="On a quarterly basis, invoice sent at end of each quarter">
                On a quarterly basis, invoice sent at end of each quarter
              </option>
              <option value="One time invoice upon completion of the assignment">
                One time invoice upon completion of the assignment
              </option>
            </select>
          </div>

          <br />
          <hr />
          <br />

          <h4 className="text-md font-medium mb-1 font-semibold">
            What languages are needed for the performance of the work?
          </h4>
          {["English", "Finnish", "Swedish", "German", "French", "Other:"].map(
            (option, index) => (
              <label key={index} className="block">
                <input
                  type="checkbox"
                  value={option}
                  checked={formData.checkboxes.includes(option)}
                  onChange={handleChange}
                />{" "}
                {option}
              </label>
            )
          )}
          {formData.checkboxes.includes("Other:") && (
            <input
              type="text"
              name="otherLang"
              placeholder="Specify Other Language"
              className="w-full border p-2"
              value={formData.otherLang}
              onChange={handleChange}
            />
          )}

          <br />
          <hr />
          <br />

          <h4 className="text-md font-medium mb-1 font-semibold">
            By when do you need offers from interested legal service providers?
            <QuestionMarkTooltip tooltipText="Sets the deadline for offers at the end of the selected day." />
          </h4>
          <input
            type="date"
            name="date"
            className="w-1/6 border p-2"
            value={formData.date}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
          />

          <br />
          <br />
          <hr />
          <br />

          <h4 className="text-md font-medium mb-1 font-semibold">
            Do you want to include in the LEXIFY Request your Supplier Code of
            Conduct or other procurement related requirements which legal
            service providers are required to follow? If yes, please upload the
            relevant documents by clicking “Upload Procurement Appendices”
            below.{" "}
            <QuestionMarkTooltip tooltipText="Please upload only requirements mandatory to all suppliers of your company (such as your Supplier Code of Conduct or minimum standards for supplier information security). Please do not upload your general procurement contract terms and conditions. Any such general contract terms and conditions, even if uploaded, will not become a binding part of the LEXIFY Contract between you and the legal service provider submitting the winning offer. The terms and conditions applicable to all LEXIFY Contracts are set out in the General Terms and Conditions for LEXIFY Contracts." />
          </h4>
          <br />
          <label className="inline-block px-4 py-2 bg-[#c8c8cf] text-black border border-black rounded cursor-pointer">
            Upload Procurement Appendices
            <input
              type="file"
              name="supplierFiles"
              multiple
              className="hidden"
              onChange={handleSupplierFileChange}
            />
          </label>
          <span className="ml-2 text-sm">
            {formData.supplierFiles.length > 0
              ? `${formData.supplierFiles.length} file(s) selected`
              : "No files selected"}
          </span>
          {formData.supplierFiles.length > 0 && (
            <div className="mt-2 p-2">
              <h5 className="font-medium mb-1">Uploaded Files:</h5>
              <ul className="list-disc pl-6">
                {formData.supplierFiles.map((file, index) => (
                  <li key={index} className="flex items-center mb-1">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupplierFile(index)}
                      className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded cursor-pointer"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {[
            "Legal review of comments from a customer of the Client on the Client's contract template and possible further assistance during later negotiation rounds.",
          ].includes(formData.need) && (
            <p className="text-xs">
              <strong>NOTE:</strong>{" "}
              <em>
                If you have selected &quot;Disclosed to Winning Bidder
                Only&quot; earlier in the LEXIFY Request to ensure your name and
                the name of your counterparty are disclosed only to the legal
                service provider submitting the winning offer, please make sure
                that any procurement appendices you may upload do not disclose
                the name of your company.
              </em>
            </p>
          )}

          <br />
          <hr />
          <br />

          <h4 className="text-md font-medium mb-1 font-semibold">
            Give a title for your LEXIFY Request{" "}
            <QuestionMarkTooltip tooltipText="This title will not be shown to any legal service providers and will only be used in your personal LEXIFY Request archive (see My Dashboard in the LEXIFY main menu)." />
          </h4>
          <input
            type="text"
            name="requestTitle"
            className="w-full border p-2"
            value={formData.requestTitle}
            onChange={handleChange}
          />

          <br />
          <br />
          <hr />
          <br />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="p-2 bg-yellow-500 text-white rounded cursor-pointer"
            >
              Preview LEXIFY Request
            </button>
            <button
              type="button"
              onClick={() => router.push("/main")}
              className="p-2 bg-red-500 text-white rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <br />

          <label className="block">
            <input
              type="checkbox"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
            />{" "}
            I have carefully reviewed my LEXIFY Request and I am ready to submit
            it.
          </label>

          <p className="text-xs font-bold">
            <em>
              By submitting this LEXIFY Request I accept that LEXIFY will
              automatically generate a binding LEXIFY Contract between my
              company as the legal service purchaser and the legal service
              provider submitting the best offer subject to the parameters in my
              LEXIFY Request. The LEXIFY Contract will consist of i) the service
              description, other specifications and my Procurement Appendices
              (if applicable) as I have designated in the LEXIFY Request and ii)
              the General Terms and Conditions for LEXIFY Contracts. The LEXIFY
              Contract will not be generated if i) no qualifying offers have
              been received prior to the expiration of my LEXIFY Request or ii)
              I as representative of the legal service purchaser cancel the
              LEXIFY Request before any qualifying offers have been received.
            </em>
          </p>

          <br />

          <div className="flex gap-4">
            <button
              type="submit"
              disabled /*</div>={submitting}*/
              className="p-2 bg-[#11999e] text-white rounded disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit LEXIFY Request"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 bg-gray-300 text-black rounded cursor-pointer"
            >
              Clear
            </button>
          </div>
        </form>

        {showPreview && (
          <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
            <div className="bg-white w-11/12 max-w-4xl shadow-lg overflow-y-auto max-h-[90vh] animate-fadeInScale relative">
              <div className="w-full p-4 flex flex-col items-center">
                <img
                  src="/lexify.png"
                  alt="LEXIFY Logo"
                  className="h-12 mb-2 w-96 h-48"
                />
                <h2 className="text-2xl font-bold text-white">
                  LEXIFY Request Preview
                </h2>
              </div>

              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
              >
                &times;
              </button>

              <div id="lexify-preview" className="space-y-6 text-black p-8">
                <Section title="Client Name, Business Identity Code and Country of Domicile">
                  {formData.confboxes.includes(
                    "Disclosed to Winning Bidder Only"
                  )
                    ? "Disclosed to Winning Bidder Only"
                    : formData.contactPerson
                    ? [company.name, company.id, company.country]
                        .filter(Boolean)
                        .join(", ")
                    : "-"}
                </Section>

                <Section title="Scope of Work">{formData.need || "-"}</Section>

                <Section title="Contract Price and Currency">
                  {isTemplateOption ? (
                    `Lump Sum Fixed Fee ${
                      formData.currency ? `(${formData.currency})` : ""
                    }`
                  ) : (
                    <>
                      {`Flat Hourly Rate ${
                        formData.currency ? `(${formData.currency})` : ""
                      }`}
                      <p className="text-md mt-2">
                        The total price of the service will be calculated by
                        multiplying the hourly rate with the number of hours of
                        legal support provided by the legal service provider
                        submitting the winning offer. The offered hourly rate
                        will be valid until the relevant customer contract has
                        been signed or abandoned, whichever comes first.
                      </p>
                    </>
                  )}
                  <p className="text-md mt-2">
                    The Legal Service Provider shall submit all invoices to the
                    Client in the contract price currency, unless otherwise
                    instructed in writing by the Client.
                  </p>
                </Section>

                <Section title="Description of Client's Line of Business">
                  <p>{formData.description || "-"}</p>
                </Section>

                {formData.need &&
                  formData.need.includes(
                    "Legal review of comments from a customer of the Client on the Client's contract template and possible further assistance during later negotiation rounds."
                  ) && (
                    <Section title="Name of Client's Counterparty in the Matter">
                      {formData.confboxes.includes(
                        "Disclosed to Winning Bidder Only"
                      )
                        ? "Disclosed to Winning Bidder Only"
                        : formData.confidential || "-"}
                    </Section>
                  )}

                <Section title="Additional Background Information Provided by Client">
                  <p>{formData.background || "-"}</p>
                  {formData.backgroundFiles.length > 0 && (
                    <ul className="list-disc pl-6 mt-2">
                      {formData.backgroundFiles.map((file, index) => (
                        <li key={index}>
                          <a
                            href={URL.createObjectURL(file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {file.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title="Is the Legal Service Provider Required to Comply with a Supplier Code of Conduct and/or Other Procurement related Requirements of the Client?">
                  {formData.supplierFiles.length > 0 ? (
                    <>
                      <p className="mb-2">
                        Yes, please see the Supplier Code of Conduct attached:
                      </p>
                      <ul className="list-disc pl-6">
                        {formData.supplierFiles.map((file, index) => (
                          <li key={index}>
                            <a
                              href={URL.createObjectURL(file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              {file.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    "No"
                  )}
                </Section>
              </div>

              <button
                onClick={() => setShowPreview(false)}
                className="top-4 right-4 text-white bg-[#3a3a3c] rounded w-24 h-15 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
