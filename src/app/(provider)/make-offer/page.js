"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionMarkTooltip from "../components/QuestionmarkTooltip";

export default function MakeOffer() {
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
    offeredPrice: "",
    retainerFee: "",
    paymentTerms: "",
    checkboxes: [],
    otherLang: "",
    date: "",
    supplierFiles: [],
    offerTitle: "",
    agree: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleBackgroundFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData({
      ...formData,
      backgroundFiles: [...formData.backgroundFiles, ...newFiles],
    });
    // Reset the file input value to allow selecting the same file again
    e.target.value = "";
  };

  const handleSupplierFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData({
      ...formData,
      supplierFiles: [...formData.supplierFiles, ...newFiles],
    });
    // Reset the file input value to allow selecting the same file again
    e.target.value = "";
  };

  const handleDeleteBackgroundFile = (index) => {
    const updatedFiles = [...formData.backgroundFiles];
    updatedFiles.splice(index, 1);
    setFormData({ ...formData, backgroundFiles: updatedFiles });
  };

  const handleDeleteSupplierFile = (index) => {
    const updatedFiles = [...formData.supplierFiles];
    updatedFiles.splice(index, 1);
    setFormData({ ...formData, supplierFiles: updatedFiles });
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
    } else if (type === "text") {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    } else if (type === "radio") {
      setFormData({ ...formData, need: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check if any dropdown is unselected
    if (!formData.contactPerson) {
      alert("Please select an option for all dropdowns before submitting.");
      return;
    }

    if (!formData.agree) {
      alert("You must agree to submit the form.");
      return;
    }
    console.log("Submitted: ", formData);
    router.push("/main");
  };

  const handleClear = () => {
    setFormData(initialFormState);
    // Reset all form elements to their initial values
    const formElements = document.querySelectorAll("input, textarea, select");
    formElements.forEach((element) => {
      if (
        element.type === "text" ||
        element.type === "textarea" ||
        element.tagName === "TEXTAREA"
      ) {
        element.value = "";
      } else if (element.type === "checkbox" || element.type === "radio") {
        element.checked = false;
      } else if (element.tagName === "SELECT") {
        element.selectedIndex = 0;
      } else if (element.type === "file") {
        element.value = [];
      }
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
      <h1 className="text-3xl font-bold mb-4">
        Review LEXIFY Request and Submit Offer
      </h1>
      <div className="w-full max-w-7xl p-6 rounded shadow-2xl bg-white text-black">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div id="lexify-preview" className="space-y-6 text-black p-8">
            {/* Client Name */}
            <Section title="Client Name, Business Identity Code and Country of Domicile">
              <p className="text-md mt-2">
                SilverProperties Oy, 445566-2, Finland
              </p>
              <p className="text-xs mt-2 italic">
                <strong>NOTE:</strong> If the above states &quot;Disclosed to
                Winning Bidder Only&quot;, the relevant identity or identities
                will be disclosed only to the legal service provider submitting
                the winning offer to enable that service provider to complete
                its mandatory conflict checks. If an existing conflict is then
                notified by the legal service provider to LEXIFY, the winning
                offer will automatically be disqualified and the second-best
                offer (if any) will replace it as the winning offer.
              </p>
            </Section>

            {/* Scope of Work */}
            <Section title="Scope of Work">
              <p className="text-md mt-2">
                Comprehensive legal support throughout the transaction process,
                including but not limited to a legal due diligence inspection of
                the target with a written report of findings (as required by
                Client), drafting/commenting of a sale and purchase agreement,
                lease agreement and related legal documents, required
                negotiations with the counterparty and support with completion
                of signing/closing related legal items. Format of due diligence
                reporting: ”Red flag” report - report outlines significant legal
                concerns only.
              </p>
            </Section>

            {/* Contract Price and Currency */}
            <Section title="Contract Price (Lump Sum Fixed Fee or Flat Hourly Rate) and Currency">
              <p className="text-md mt-2">Lump sum fixed fee</p>
              <p className="text-md mt-2">
                The contract price currency is Euro (€). The Legal Service
                Provider shall submit all invoices to the Client in the contract
                price currency, unless otherwise instructed in writing by the
                Client.{" "}
              </p>
            </Section>

            {/* Object of Sale */}
            <Section title="Object of Sale">
              <p>Plot/parcel of land </p>
            </Section>

            {/* Counterparty */}

            <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Matter">
              <p className="text-md mt-2">Halkoma Oy, 545667-1, Finland</p>
              <p className="text-xs mt-2 italic">
                <strong>NOTE:</strong> If the above states &quot;Disclosed to
                Winning Bidder Only&quot;, the relevant identity or identities
                will be disclosed only to the legal service provider submitting
                the winning offer to enable that service provider to complete
                its mandatory conflict checks. If an existing conflict is then
                notified by the legal service provider to LEXIFY, the winning
                offer will automatically be disqualified and the second-best
                offer (if any) will replace it as the winning offer.
              </p>
            </Section>

            {/* Buying or Selling */}
            <Section title="Is the Client Buying (and Leasing as Lessor) or Selling (and Leasing as Lessee) in the Transaction?">
              <p className="text-md mt-2">Buying and leasing as lessor</p>
            </Section>

            {/* Description of the Target Property */}
            <Section title="Description of the Target Property">
              <p className="text-md mt-2">
                The target property is a freehold in the city of Oulu, Finland.
                The property houses a 20.000sqm logistics building built in
                2015. The owner of the freehold owns the logistics building as
                well.
              </p>
            </Section>

            {/* Range of Expected Purchase Price (Cash and Debt Free) */}
            <Section title="Range of Expected Purchase Price (Cash and Debt Free)">
              <p className="text-md mt-2">1-10 mEUR</p>
            </Section>

            {/* Additional Background */}
            <Section title="Additional Background Information Provided by Client">
              <p>
                LDD material is ready for review with 10 large A4 binders of
                documentation.
              </p>
            </Section>

            {/* Advance Retainer Fee */}
            <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
              <p className="text-md mt-2">
                Yes, 10% of the lump sum price (for lump sum offers) or the
                offered hourly rate multiplied by 3 (for hourly rate offers)
              </p>
              <p className="text-xs mt-2 italic">
                <strong>NOTE:</strong> An advance retainer fee is an amount
                payable by the client to the legal service provider submitting
                the winning offer within 14 days of the date of the LEXIFY
                Contract between the client and the legal service provider. The
                advance retainer fee forms a part of the total price of the
                legal service as offered by the legal service provider. For
                legal service based on an hourly rate, the legal service
                provider shall refund the client for any unused amount of the
                advance retainer fee if the total price of the legal service
                when completed amounts to less than the amount of the advance
                retainer fee. Such refund shall be paid within 14 days of the
                completion of the legal service.
              </p>
            </Section>

            {/* Invoicing */}
            <Section title="Invoicing">
              <p className="text-md mt-2">
                The Legal Service Provider shall invoice the Client in the
                following manner:
              </p>
              <p className="text-md mt-2">
                On a monthly basis, invoice sent at the end of each calendar
                month
              </p>
              <p className="text-md mt-2">
                Further details, such as contact person for invoices and method
                of invoicing (for example, email, e-invoicing or other), related
                to invoicing shall be agreed separately between the client and
                the legal service provider.
              </p>
            </Section>

            {/* Languages */}
            <Section title="Languages Required for the Performance of the Work">
              <p className="text-md mt-2">Finnish</p>
              <p className="text-md mt-2">
                The legal service provider confirms that its representatives
                involved in the performance of the work have appropriate
                advanced proficiency in all the languages listed above.
              </p>
            </Section>

            {/* Supplier Code of Conduct */}
            <Section title="Is the Legal Service Provider Required to Comply with a Supplier Code of Conduct and/or Other Procurement related Requirements of the Client?">
              <p className="text-md mt-2">No</p>
            </Section>
            <hr className="text-[#3a3a3c]" />
          </div>
          <br />
          <hr />
          <br />
          <h4 className="text-md font-medium mb-1 font-semibold">
            If you wish to submit an offer in response to the above LEXIFY
            Request, please provide the following information:
          </h4>
          <br />
          <div>
            <select
              name="contactPerson"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">
                Select Partner/Lawyer Responsible for the Offer
              </option>
              <option value="Anna Korhonen">Anna Korhonen</option>
              <option value="Mika Laine">Mika Laine</option>
            </select>
            <p className="text-xs pt-4">
              <strong>NOTE:</strong>{" "}
              <em>
                All updates and notifications regarding your offer will be sent
                to the designated person. The contact details of the designated
                person will also be provided by LEXIFY to the client for further
                communications. If you do not see your name listed above, you
                can add new contact persons on the &apos;My Account&apos; page
                (see My Account in the LEXIFY main menu).
              </em>
            </p>
          </div>
          <br />
          <hr />
          <br />
          <h4 className="text-md font-medium mb-1 font-semibold">
            Insert your offered price in accordance with the LEXIFY Request (VAT
            0%):
          </h4>
          <input
            type="text"
            name="offeredPrice"
            placeholder="Insert offered price"
            className="border p-2 w-full mb-2"
            value={formData.offeredPrice}
            onChange={(e) => {
              const onlyNumbers = e.target.value.replace(/[^0-9]/g, "");
              setFormData({ ...formData, offeredPrice: onlyNumbers });
            }}
          />
          <br />
          <br />
          <hr />
          <br />
          <h4 className="text-md font-medium mb-1 font-semibold">
            Give a title for your offer:
          </h4>
          <input
            type="text"
            name="offerTitle"
            className="w-full border p-2"
            placeholder="Insert title"
            value={formData.textInput}
            onChange={handleChange}
          />
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>
              This title will not be shown to the client and will only be used
              in your personal offer archive (see My Dashboard in the LEXIFY
              main menu).
            </em>
          </p>
          <br />
          <hr />
          <br />
          <label className="block">
            <input
              type="checkbox"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
            />{" "}
            I have carefully reviewed the LEXIFY Request and I am ready to
            submit my offer in response.
          </label>
          <p className="text-xs">
            <em>
              <strong>
                By submitting my offer I accept that, if my offer becomes the
                winning offer upon the expiration of the related LEXIFY Request,
                LEXIFY will automatically generate a binding LEXIFY Contract
                between my company as the legal service provider and the client
                as the legal service purchaser. Such LEXIFY Contract will
                consist of i) the service description, other specifications and
                the client&apos;s Supplier Code of Conduct and other procurement
                related requirements (if applicable) as designated by the client
                in the related LEXIFY Request and ii) the General Terms and
                Conditions for LEXIFY Contracts.
              </strong>
            </em>
          </p>
          <br />
          <div className="flex gap-4">
            <button
              type="submit"
              className="p-2 bg-[#11999e] text-white rounded cursor-pointer"
            >
              Submit Offer
            </button>
            <button
              type="button"
              onClick={() => router.push("/provider-request")}
              className="p-2 bg-red-500 text-white rounded cursor-pointer"
            >
              Exit Without Submitting an Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
