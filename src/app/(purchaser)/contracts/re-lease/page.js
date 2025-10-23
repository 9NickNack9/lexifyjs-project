"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";

export default function ReLease() {
  const router = useRouter();

  const initialFormState = {
    contactPerson: "",
    agreementType: "",
    confidential: "",
    confboxes: [],
    customerType: "",
    description: "",
    rentRange: "",
    supportType: "",
    background: "",
    backgroundFiles: [],
    offerer: "",
    providerCountry: "",
    lawyerCount: "",
    firmAge: "",
    firmRating: "",
    currency: "",
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
            const n = [p.firstName || "", p.lastName || ""]
              .filter(Boolean)
              .join(" ")
              .trim();
            return n ? { label: n, value: n } : null;
          })
          .filter(Boolean);
        setContactOptions(opts);
      } catch {}
    })();
  }, []);

  const handleBackgroundFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      backgroundFiles: [...s.backgroundFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleSupplierFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      supplierFiles: [...s.supplierFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleDeleteBackgroundFile = (i) => {
    const arr = [...formData.backgroundFiles];
    arr.splice(i, 1);
    setFormData({ ...formData, backgroundFiles: arr });
  };
  const handleDeleteSupplierFile = (i) => {
    const arr = [...formData.supplierFiles];
    arr.splice(i, 1);
    setFormData({ ...formData, supplierFiles: arr });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "agree") setFormData({ ...formData, agree: checked });
      else if (name === "confboxes") {
        setFormData({
          ...formData,
          confboxes: checked
            ? [...formData.confboxes, value]
            : formData.confboxes.filter((v) => v !== value),
        });
      } else {
        setFormData({
          ...formData,
          checkboxes: checked
            ? [...formData.checkboxes, value]
            : formData.checkboxes.filter((v) => v !== value),
        });
      }
    } else if (type === "radio") {
      setFormData({ ...formData, supportType: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const isHourly = formData.supportType.startsWith("Occasional legal support");

  const validate = () => {
    if (!formData.contactPerson)
      return "Please select a primary contact person.";
    if (!formData.supportType) return "Please select what you need.";
    if (!formData.description) return "Please provide a brief description.";
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
      formData.otherLang || "",
    ].filter(Boolean);
    if (langs.length === 0)
      return "Please select at least one language (or type another).";
    if (!formData.date) return "Please pick an offers deadline.";
    if (!formData.requestTitle)
      return "Please give a title for your LEXIFY Request.";
    if (!formData.agree) return "You must confirm you're ready to submit.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const paymentRate = isHourly
        ? "Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid until the lease agreement has been signed or abandoned, whichever comes first."
        : "Lump sum fixed price";
      const languageCSV = [
        ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
        formData.otherLang || null,
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "Real Estate and Construction",
        assignmentType:
          "Lease of Business Premises, Residential Premises or Land",
        primaryContactPerson: formData.contactPerson,
        scopeOfWork: formData.supportType,
        description: formData.description,
        additionalBackgroundInfo: formData.background || "",
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
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          agreementType: formData.agreementType || "",
          customerType: formData.customerType || "",
          confidential: formData.confboxes.includes(
            "Disclosed to Winning Bidder Only"
          )
            ? "Yes"
            : "No",
          winnerBidderOnlyStatus: (formData.confidential || "").trim(),
          rentRange: formData.rentRange || "",
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
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok)
        throw new Error(
          (json && json.error) || text || "Failed to create request."
        );

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
    document.querySelectorAll("input, textarea, select").forEach((el) => {
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
      <h2 className="text-2xl font-semibold mb-6">Help with Lease Agreement</h2>

      <div className="w-full max-w-7xl p-6 rounded shadow-2xl text-black bg-white">
        {/* Form Section */}
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
          <h4 className="text-md font-medium mb-1 font-semibold">
            What do you need?
          </h4>
          <div className="space-y-2">
            {[
              "Comprehensive legal support throughout the lease agreement negotiation process, including but not limited to drafting/commenting of the lease agreement and related legal documents and required negotiations with the counterparty.",
              "Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of lease agreement documentation or legal advice during different stages of the process).",
              "A lease agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
            ].map((option, index) => (
              <div key={index}>
                <label className="block">
                  <input
                    type="radio"
                    name="supportType"
                    value={option}
                    checked={formData.supportType === option}
                    onChange={handleChange}
                  />
                  {option ===
                    "Comprehensive legal support throughout the lease agreement negotiation process, including but not limited to drafting/commenting of the lease agreement and related legal documents and required negotiations with the counterparty." &&
                    " Comprehensive legal support throughout the lease agreement negotiation process (including but not limited to drafting of the lease agreement and related legal documents and required negotiations with the counterparty)"}
                  {option ===
                    "Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of lease agreement documentation or legal advice during different stages of the process)." &&
                    " Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of agreement documentation or legal advice during different stages of the process)"}
                  {option ===
                    "A lease agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included." && (
                    <>
                      {
                        " A lease agreement (including revisions based on client feedback)"
                      }{" "}
                      <QuestionMarkTooltip tooltipText="Any offers you receive will include the preparation of the first version of the document(s) and necessary revisions on the basis of your feedback to the legal service provider. Other work (for example, legal review of comments from your counterparty) is not included." />
                    </>
                  )}
                </label>
                <p className="text-xs pb-2">
                  <strong>NOTE: </strong>
                  <em>
                    {option ===
                    "Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of lease agreement documentation or legal advice during different stages of the process)."
                      ? "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the lease agreement has been signed or abandoned, whichever comes first."
                      : "Any offers you receive will be for a lump sum fixed price."}
                  </em>
                </p>
              </div>
            ))}
          </div>
          <br />
          <hr />
          <br />
          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              What type of lease agreement do you need?
            </h4>
            <select
              name="agreementType"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="Lease of business premises">
                Lease of business premises
              </option>
              <option value="Lease of residential premises">
                Lease of residential premises
              </option>
              <option value="Lease of plot or parcel of land">
                Lease of plot or parcel of land
              </option>
            </select>
          </div>
          <br />
          <hr />
          <br />
          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Please provide the name, business identity code and country of
              domicile of your counterparty in the lease agreement. If you do
              not want the name of the counterparty to be visible to all legal
              service providers qualified to make you an offer, please also
              check the box &quot;Disclosed to Winning Bidder Only&quot;.{" "}
              <QuestionMarkTooltip tooltipText="If “Disclosed to Winning Bidder Only” is checked, the identity of your counterparty will be disclosed only to the legal service provider submitting the winning offer to enable that service provider to complete its statutory conflict checks. If an existing conflict is then notified by the legal service provider to LEXIFY, the winning offer will automatically be disqualified and the second-best offer (if any) will replace it as the winning offer." />
            </h4>
            <textarea
              name="confidential"
              className="w-full border p-2"
              onChange={handleChange}
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
          </div>
          <br />
          <hr />
          <br />
          <div></div>
          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              Are you the lessor or the lessee in the lease agreement?
            </h4>
            <select
              name="customerType"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="Lessor (landlord)">Lessor (landlord)</option>
              <option value="Lessee (tenant)">Lessee (tenant)</option>
            </select>
          </div>
          <br />
          <hr />
          <br />
          <h4 className="text-md font-medium mb-1 font-semibold">
            Please describe the property to be leased briefly{" "}
            <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
          </h4>
          <textarea
            name="description"
            className="w-full border p-2"
            onChange={handleChange}
          ></textarea>
          <br />
          <br />
          <hr />
          <br />
          <div>
            <h4 className="text-md font-medium mb-1 font-semibold">
              What is the range of the expected monthly rent (VAT 0%)?{" "}
              <QuestionMarkTooltip tooltipText="This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
            </h4>
            <select
              name="rentRange"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="0-1 kEUR">0-1 kEUR</option>
              <option value="1-10 kEUR">1-10 kEUR</option>
              <option value="10-50 kEUR">10-50 kEUR</option>
              <option value="50+ kEUR">50+ kEUR</option>
              <option value="To be confirmed later">
                To be confirmed later
              </option>
            </select>
          </div>
          <br />
          <hr />
          <br />
          <h4 className="text-md font-medium mb-1 font-semibold">
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
          {/* Display background files */}
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
            >
              <option value="">Select</option>
              <option value="Any size">
                No, the legal service provider can be of any size
              </option>
              <option value="5">
                Yes, the legal service provider must employ at least 5 lawyers
              </option>
              <option value="15">
                Yes, the legal service provider must employ at least 15 lawyers
              </option>
              <option value="40">
                Yes, the legal service provider must employ at least 40 lawyers
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
            >
              <option value="">Select</option>
              <option value="Any age">
                No, the legal service provider can be of any age
              </option>
              <option value="At least 5 years of operation">
                Yes, the legal service provider has been in operation for at
                least 5 years
              </option>
              <option value="At least 10 years of operation">
                Yes, the legal service provider has been in operation for at
                least 10 years
              </option>
              <option value="At least 25 years of operation">
                Yes, the legal service provider has been in operation for at
                least 25 years
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
              "Comprehensive legal support throughout the lease agreement negotiation process, including but not limited to drafting/commenting of the lease agreement and related legal documents and required negotiations with the counterparty. ",
              "A lease agreement. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.",
            ].includes(formData.supportType) && (
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
                    const onlyNumbers = e.target.value.replace(/[^0-9]/g, "");
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
            >
              <option value="">Select</option>
              <option value="Monthly invoice">
                On a monthly basis, invoice sent at end of each calendar month
              </option>
              <option value="Quarter year invoice">
                On a quarterly basis, invoice sent at end of each quarter
              </option>
              <option value="One time invoice">
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
          {/* Display supplier files */}
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
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>
              If you have selected &quot;Disclosed to Winning Bidder Only&quot;
              earlier in the LEXIFY Request to ensure your name and the name of
              your counterparty are disclosed only to the legal service provider
              submitting the winning offer, please make sure that any
              procurement appendices you may upload do not disclose the name of
              your company.
            </em>
          </p>
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
            value={formData.textInput}
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
              LEXIFY Request. If my Winning Offer Selection Method in the
              &quot;My Account&quot; menu has been set to &quot;Manual&quot;,
              any automatic generation of a LEXIFY Contract will also require
              that I actively select the winning service provider. The LEXIFY
              Contract will consist of i) the service description, other
              specifications and my Procurement Appendices (if applicable) as I
              have designated in the LEXIFY Request and ii) the General Terms
              and Conditions for LEXIFY Contracts. The LEXIFY Contract will not
              be generated if i) no qualifying offers have been received prior
              to the expiration of my LEXIFY Request, ii) I as representative of
              the legal service purchaser cancel the LEXIFY Request or iii) if
              my Winning Offer Selection Method in the &quot;My Account&quot;
              menu has been set to &quot;Manual&quot; and I do not actively
              select any winning service provider within 7 days of the
              expiration of the LEXIFY Request.
            </em>
          </p>
          <br />
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="p-2 bg-[#11999e] text-white rounded disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit LEXIFY Request"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 bg-gray-300 text-black rounded"
            >
              Clear
            </button>
          </div>
        </form>
        {showPreview && (
          <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
            <div className="bg-white w-11/12 max-w-4xl shadow-lg overflow-y-auto max-h-[90vh] animate-fadeInScale relative">
              {/* Header */}
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

              {/* Close Button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
              >
                &times;
              </button>

              {/* Download Button */}
              {/*}
              <button
                onClick={handleDownloadPdf}
                className="absolute top-4 left-4 text-white bg-[#3a3a3c] rounded flex items-center justify-center text-xl hover:bg-[#11999e] transition cursor-pointer p-1"
                title="Save as PDF"
              >
                Save as PDF
              </button> 
              */}

              {/* Content */}
              <div id="lexify-preview" className="space-y-6 text-black p-8">
                {/* Client Name */}
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

                {/* Scope of Work */}
                <Section title="Scope of Work">
                  {formData.supportType || "-"}
                </Section>

                {/* Contract Price and Currency */}
                <Section title="Contract Price (Lump Sum Fixed Fee or Flat Hourly Rate) and Currency">
                  {formData.supportType.includes(
                    "Occasional legal support with the lease agreement negotiation process when needed (for example, commenting of lease agreement documentation or legal advice during different stages of the process)."
                  ) ? (
                    <>
                      {`Flat Hourly Rate ${
                        formData.currency ? `(${formData.currency})` : ""
                      }`}
                      <p className="text-md mt-2">
                        The total price of the service will be calculated by
                        multiplying the hourly rate with the number of hours of
                        legal support provided by the Legal Service Provider.
                        The offered hourly rate will be valid until the lease
                        agreement has been signed or abandoned, whichever comes
                        first.
                      </p>
                    </>
                  ) : (
                    `Lump Sum Fixed Fee ${
                      formData.currency ? `(${formData.currency})` : ""
                    }`
                  )}
                  <p className="text-md mt-2">
                    The Legal Service Provider shall submit all invoices to the
                    Client in the contract price currency, unless otherwise
                    instructed in writing by the Client.
                  </p>
                </Section>

                {/* Type of Lease Agreement Being Negotiated */}
                <Section title="Type of Lease Agreement Being Negotiated">
                  <p>{formData.agreementType || "-"}</p>
                </Section>

                {/* Counterparty */}

                <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Lease Agreement">
                  {formData.confboxes.includes(
                    "Disclosed to Winning Bidder Only"
                  )
                    ? "Disclosed to Winning Bidder Only"
                    : formData.confidential || "-"}
                  <p className="text-xs mt-2 italic">
                    <strong>NOTE:</strong> If the above states &quot;Disclosed
                    to Winning Bidder Only&quot;, the relevant identity or
                    identities will be disclosed only to the legal service
                    provider submitting the winning offer to enable that service
                    provider to complete its mandatory conflict checks. If an
                    existing conflict is then notified by the legal service
                    provider to LEXIFY, the winning offer will automatically be
                    disqualified and the second-best offer (if any) will replace
                    it as the winning offer.
                  </p>
                </Section>

                {/* Is the Client the Lessor or the Lessee in the Lease Agreement? */}
                <Section title="Is the Client the Lessor or the Lessee in the Lease Agreement?">
                  <p>{formData.customerType || "-"}</p>
                </Section>

                {/* Description of the Property to be Leased with the Lease Agreement */}
                <Section title="Description of the Property to be Leased with the Lease Agreement">
                  <p>{formData.description || "-"}</p>
                </Section>

                {/* Range of Expected Monthly Rent (VAT 0%) */}
                <Section title="Range of Expected Monthly Rent (VAT 0%)">
                  <p>{formData.rentRange || "-"}</p>
                </Section>

                {/* Additional Background */}
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

                {/* Advance Retainer Fee */}
                <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
                  {formData.retainerFee || "-"}
                  <p className="text-xs mt-2 italic">
                    <strong>NOTE:</strong> An advance retainer fee is an amount
                    payable by the client to the legal service provider
                    submitting the winning offer within 14 days of the date of
                    the LEXIFY Contract between the client and the legal service
                    provider. The advance retainer fee forms a part of the total
                    price of the legal service as offered by the legal service
                    provider. For legal service based on an hourly rate, the
                    legal service provider shall refund the client for any
                    unused amount of the advance retainer fee if the total price
                    of the legal service when completed amounts to less than the
                    amount of the advance retainer fee. Such refund shall be
                    paid within 14 days of the completion of the legal service.
                  </p>
                </Section>

                {/* Invoicing */}
                <Section title="Invoicing">
                  <p className="text-md mt-2">
                    The Legal Service Provider shall invoice the Client in the
                    following manner:
                  </p>
                  {formData.paymentTerms || "-"}
                  <p className="text-md mt-2">
                    Further details, such as contact person for invoices and
                    method of invoicing (for example, email, e-invoicing or
                    other), related to invoicing shall be agreed separately
                    between the client and the legal service provider.
                  </p>
                </Section>

                {/* Languages */}
                <Section title="Languages Required for the Performance of the Work">
                  {[
                    ...(formData.checkboxes || []).filter(
                      (lang) => lang !== "Other:"
                    ),
                    formData.otherLang,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                  <p className="text-md mt-2">
                    The legal service provider confirms that its representatives
                    involved in the performance of the work have appropriate
                    advanced proficiency in all the languages listed above.
                  </p>
                </Section>

                {/* Supplier Code of Conduct */}
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
              {/* Close Button */}
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
