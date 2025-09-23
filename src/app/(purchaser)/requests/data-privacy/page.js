"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DataPrivacy() {
  const router = useRouter();
  const initialFormState = {
    offerType: "",
    review: "",
    reviewTime: "",
    description: "",
    employeeCount: "",
    background: "",
    offerer: "",
    lawyerCount: "",
    firmAge: "",
    firmRating: "",
    paymentTerms: "",
    checkboxes: [],
    date: "",
    requestTitle: "",
    agree: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "agree") {
        setFormData({ ...formData, agree: checked });
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check if any dropdown is unselected
    if (
      !formData.offerer ||
      !formData.lawyerCount ||
      !formData.firmAge ||
      !formData.firmRating ||
      !formData.paymentTerms
    ) {
      alert("Please select an option for all dropdowns before submitting.");
      return;
    }

    // Check if contract type is unselected
    if (!formData.need) {
      alert("Please select an option for contract type before submitting.");
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
      }
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Create a Lexify Request</h1>
      <h2 className="text-2xl font-semibold mb-6">
        Help with Data Privacy Needs
      </h2>

      <div className="flex w-full max-w-6xl gap-8">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="w-1/2 space-y-4">
          <div>
            <h4 className="text-md font-medium mb-1">
              Please specify the nature of the support needed (see description
              of alternatives below)
            </h4>
            <select
              name="offerType"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Nature of Support</option>
              <option value="Holistic review">a) Holistic review</option>
              <option value="Holistic review + performance of corrective actions">
                b) Holistic review + performance of corrective actions
              </option>
            </select>
          </div>
          <h4 className="text-md font-medium mb-1">
            <strong>(a) Holistic review</strong> of my company’s current level
            of compliance with data privacy legislation applicable in Finland,
            including written report of findings
          </h4>
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>Any offers you receive will be for a lump sum fixed price</em>
          </p>
          <h4 className="text-md font-medium mb-1">
            <strong>(b) Occasional legal support</strong> of my company’s
            current level of compliance with data privacy legislation applicable
            in Finland, including written report of findings.{" "}
            <strong>Performance of corrective actions</strong> needed to remedy
            any deficiencies identified in the review (e.g. preparation of data
            privacy statement(s) and/or other necessary documentation, if
            missing)
          </h4>
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>Any offers you receive will be for a lump sum fixed price</em>
          </p>

          <div>
            <h4 className="text-md font-medium mb-1">
              Have your company&apos;s current practices been reviewed
              previously by a data privacy specialist?:
            </h4>
            <select
              name="review"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Yes/No</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <h3 className="text-md font-medium mb-1">
              <strong>If you answered &apos;yes&apos;</strong>
            </h3>
            <h4 className="text-md font-medium mb-1">
              Did the previous review take place before or after May 2016 (i.e.
              before or after the entry into force of GDPR)?:
            </h4>
            <select
              name="reviewTime"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Review Time</option>
              <option value="Before May 2016">Before May 2016</option>
              <option value="After May 2016">After May 2016</option>
              <option value="I don't know">I don&apos;t know</option>
            </select>
          </div>

          <h3 className="text-lg font-semibold">
            Please provide a brief description of your company&apos;s line of
            business.
          </h3>
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>Please do not include any personal data in the description</em>
          </p>
          <textarea
            name="description"
            className="w-full border p-2"
            onChange={handleChange}
          ></textarea>

          <div>
            <h4 className="text-md font-medium mb-1">
              How many employees does your company have?:
            </h4>
            <select
              name="employeeCount"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Employee Amount</option>
              <option value="0-10 employees">0-10 employees</option>
              <option value="10-25 employees">10-25 employees</option>
              <option value="25-100 employees">25-100 employees</option>
              <option value="100-1000 employees">100-1000 employees</option>
              <option value="1000+ employees">1000+ employees</option>
            </select>
          </div>

          <h3 className="text-lg font-semibold">
            Please provide additional background information, if any, you wish
            to share with legal service providers in your Lexify Request.
          </h3>
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>Please do not include any personal data in the description</em>
          </p>
          <textarea
            name="background"
            className="w-full border p-2"
            onChange={handleChange}
          ></textarea>

          <div>
            <h4 className="text-md font-medium mb-1">
              Who can make you an offer?
            </h4>
            <select
              name="offerer"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Provider Type</option>
              <option value="Attorneys-at-law">
                Attorneys-at-law (FI: asianajotoimistot)
              </option>
              <option value="Law firms">
                Law firms (FI: lakiasiaintoimistot)
              </option>
              <option value="Both attorneys-at-law & law firms">
                Both attorneys-at-law & law firms
              </option>
            </select>
          </div>
          <div>
            <h4 className="text-md font-medium mb-1">
              Do you wish your legal service provider employs at least a certain
              number of lawyers?
            </h4>
            <select
              name="lawyerCount"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Lawyer Count</option>
              <option value="any size">
                No, the legal service provider can be of any size
              </option>
              <option value="atleast 5 lawyers">
                Yes, the legal service provider must employ at least 5 lawyers
              </option>
              <option value="atleast 15 lawyers">
                Yes, the legal service provider must employ at least 15 lawyers
              </option>
            </select>
          </div>
          <div>
            <h4 className="text-md font-medium mb-1">
              Do you wish your legal service provider has been in operation for
              a minimum period of time?
            </h4>
            <select
              name="firmAge"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Service Provider Age</option>
              <option value="Any age">
                No, the legal service provider can be of any age
              </option>
              <option value="At least 5 years of operation">
                Yes, the legal service provider has been in operation for at
                least 5 years
              </option>
              <option value="At least 20 years of operation">
                Yes, the legal service provider has been in operation for at
                least 20 years
              </option>
            </select>
          </div>
          <div>
            <h4 className="text-md font-medium mb-1">
              Do tendering legal service providers need to have a minimum Lexify
              customer feedback rating? This rating is based on feedback a legal
              service provider has received previously from other Lexify users.
            </h4>
            <select
              name="firmRating"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Service Provider Rating</option>
              <option value="Any rating">
                No, all legal service providers can tender
              </option>
              <option value="At least a rating of 3 stars">
                Yes, at least 3 stars
              </option>
              <option value="At least a rating of 4 stars">
                Yes, at least 4 stars
              </option>
            </select>
          </div>
          <div>
            <h4 className="text-md font-medium mb-1">
              How do you want to be invoiced?
            </h4>
            <select
              name="paymentTerms"
              className="w-full border p-2"
              onChange={handleChange}
            >
              <option value="">Select Payment Type</option>
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

          <h3 className="text-lg font-semibold">
            What languages are needed for the performance of the work?
          </h3>
          {["English", "Finnish", "Swedish", "German", "French"].map(
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

          <h3 className="text-lg font-semibold">
            By when do you need offers from interested legal service providers?
          </h3>
          <input
            type="date"
            name="date"
            className="w-full border p-2"
            value={formData.date}
            onChange={handleChange}
          />

          <h3 className="text-lg font-semibold">
            Give a title for your Lexify Request
          </h3>
          <input
            type="text"
            name="requestTitle"
            className="w-full border p-2"
            value={formData.textInput}
            onChange={handleChange}
          />
          <p className="text-xs">
            <strong>NOTE:</strong>{" "}
            <em>
              This title will not be shown to any legal service providers and
              will only be used in your personal Lexify Request archive (see My
              Archive in the Lexify main menu).
            </em>
          </p>

          <label className="block">
            <input
              type="checkbox"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
            />{" "}
            I have carefully reviewed my Lexify Request and I&apos;m ready to
            submit it.
          </label>
          <p className="text-xs">
            <em>
              By submitting my Lexify Request I accept that Lexify will
              automatically generate a binding Lexify Contract between my
              company as the legal service purchaser and the legal service
              provider submitting the best offer subject to the parameters in my
              Lexify Request. Such Lexify Contract will not be generated if i)
              no qualifying offers have been received prior to the expiration of
              the relevant Lexify Offer or ii) I as representative of the legal
              service purchaser cancel the relevant Lexify Request before any
              qualifying offers have been received.
            </em>
          </p>

          <div className="flex gap-4">
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded cursor-pointer"
            >
              Submit Form
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 bg-gray-500 text-white rounded cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </form>

        {/* Live Preview */}
        <div className="w-1/2 border p-4 rounded shadow-lg">
          <h3 className="text-lg font-semibold">Request Preview</h3>
          <br />
          <p>
            <strong>Type of offer wanted:</strong> {formData.offerType}
          </p>
          <br />
          <p>
            <strong>
              Company&apos;s current practices been reviewed previously by a
              data privacy specialist?:
            </strong>{" "}
            {formData.review}
          </p>
          <br />
          <p>
            <strong>
              Did the previous review take place before or after May 2016?:
            </strong>{" "}
            {formData.reviewTime}
          </p>
          <br />
          <p>
            <strong>Description of my line of business:</strong>{" "}
            {formData.description}
          </p>
          <br />
          <p>
            <strong>Amount of employees in my company:</strong>{" "}
            {formData.employeeCount}
          </p>
          <br />
          <p>
            <strong>Other information:</strong> {formData.background}
          </p>
          <br />
          <p>
            <strong>Who can offer me:</strong> {formData.offerer}
          </p>
          <br />
          <p>
            <strong>How many lawyers must the service provider have?:</strong>{" "}
            {formData.lawyerCount}
          </p>
          <br />
          <p>
            <strong>How old should the service provider firm be?:</strong>{" "}
            {formData.firmAge}
          </p>
          <br />
          <p>
            <strong>
              What Lexify rating should the service provider have?:
            </strong>{" "}
            {formData.firmRating}
          </p>
          <br />
          <p>
            <strong>How I wish to be invoiced?:</strong> {formData.paymentTerms}
          </p>
          <br />
          <p>
            <strong>Languages needed for the performance of the work:</strong>{" "}
            {formData.checkboxes.join(", ")}
          </p>
          <br />
          <p>
            <strong>Deadline for making offers (yyyy/mm/dd):</strong>{" "}
            {formData.date}
          </p>
          <br />
          <p>
            <strong>Request title:</strong> {formData.requestTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
