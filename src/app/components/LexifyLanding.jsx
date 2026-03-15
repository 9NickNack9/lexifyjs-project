"use client";
import React, { useEffect, useState } from "react";

const LexifyLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    userType: "",
    turnover: "",
    website: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const orgLabel = formData.userType === "provider" ? "Law Firm" : "Company";
  const availability = orgLabel === "Law Firm" ? "law firm's" : "companies";

  const trustedLogos = [
    { name: "Olvi", src: "/logos/olvi-logo.png" },
    { name: "Sitowise", src: "/logos/sitowise-logo.png" },
    { name: "Technopolis", src: "/logos/technopolis-logo.png" },
  ];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "userType" && value === "provider") {
      setFormData({ ...formData, userType: value, turnover: "" });
    } else if (name === "userType" && value === "purchaser") {
      setFormData({ ...formData, userType: value, website: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit demo request");
      }

      setFormSubmitted(true);
    } catch (err) {
      console.error("Demo request submission failed:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const sectionIds = ["how-it-works", "for-companies", "for-firms"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-120px 0px -45% 0px",
        threshold: [0.2, 0.35, 0.5, 0.65],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        .font-headline { font-family: 'Outfit', sans-serif; }
        html { scroll-behavior: smooth; }
      `}</style>
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{ backgroundColor: "#11999e" }}
      >
        <div className="absolute top-3 right-6 flex items-center gap-4">
          <button
            onClick={() => setDemoModalOpen(true)}
            className="font-semibold text-white border-2 border-white px-4 py-2 rounded-lg hover:bg-white hover:text-[#11999e] transition-colors text-sm whitespace-nowrap cursor-pointer"
          >
            Ask for a demo
          </button>
          <a
            href="/register"
            className="font-semibold text-white border-2 border-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white hover:text-[#11999e] transition-colors text-sm whitespace-nowrap"
          >
            Join LEXIFY
          </a>
          <a
            href="/login"
            className="font-semibold bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-white/90 transition-colors text-sm whitespace-nowrap"
          >
            Sign in
          </a>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex justify-center mb-4">
            <div className="h-28 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 300 140"
                className="h-full w-auto"
              >
                <g transform="scale(0.8) translate(10, 10)">
                  <g transform="matrix(5.78,0,0,5.78,-7.5,-23)" fill="#ffffff">
                    <path d="M1.3 5.7 l3.18 0 l0 11.42 l2.3 0 l0.5 0.06 l0 -1.36 l2.7 -1.26 l0 5.44 l-8.68 0 l0 -14.3 z M11.98 5.7 l8.42004 0 c-0.13334 0.50666 -0.26668 0.98666 -0.40002 1.44 s-0.26668 0.92 -0.40002 1.4 l-4.4 0 c0 0.05334 0.00666 0.13 0.02 0.23 s0.02 0.17666 0.02 0.23 l0 2.1 l4.04 0 l0 2.86 l-4.04 0 l0 2.74 l-0.04 0.46 l5.28 0 l0 2.84 l-8.5 0 l0 -14.3 z M21.26 20 l4.41998 -7.58 c-0.32 -0.52 -0.65334 -1.06334 -1 -1.63 s-0.7 -1.14 -1.06 -1.72 s-0.71334 -1.15334 -1.06 -1.72 s-0.67332 -1.11 -0.97998 -1.63 l3.66 0 l2.16 3.52 l2.1 -3.52 l3.66 0 l-4.02 6.76 l4.38 7.52 l-3.44 0 l-2.58 -4.46 l-0.19 0.34 l-0.47 0.84 l-0.61 1.07 l-0.61 1.07 l-0.47 0.82 l-0.19 0.32 l-3.7 0 z M34.9 5.7 l3.26 0 l0 14.3 l-3.26 0 l0 -14.3 z M40.74 5.72 l8.42002 -0.00002 c-0.14666 0.53334 -0.28666 1.00668 -0.42 1.42002 c-0.10666 0.34666 -0.20666 0.66666 -0.3 0.96 s-0.14668 0.44 -0.16002 0.44 l-4.32 0 l0.04 0.44 l0 2.46 l4.04 0 l0 2.86 l-4.04 0 l0 5.7 l-3.26 0 l0 -14.28 z M54.1 14.84 l-0.19 -0.38 l-0.51 -1.03 l-0.72 -1.47 l-0.82 -1.68 c-0.65334 -1.33334 -1.4 -2.86 -2.24 -4.58 l3.6 0 l2.58 5.88 c0.48 -1.09334 0.90666 -2.07334 1.28 -2.94 c0.16 -0.36 0.31666 -0.71666 0.47 -1.07 s0.29 -0.67 0.41 -0.95 s0.21666 -0.50334 0.29 -0.67 l0.11 -0.25 l3.5 0 l-4.48 9.16 l0 5.16 l-3.28 0 l0 -5.18 z" />
                  </g>
                  <g transform="matrix(1.07,0,0,1.07,26,127)" fill="#ffffff">
                    <path d="M3.74 5.84 l0 12.36 l6.5 0 l0 1.8 l-8.42 0 l0 -14.16 l1.92 0 z M32.876 5.84 l6.06 14.16 l-2.24 0 l-1.42 -3.5 l-6.74 0 l-1.4 3.5 l-2.24 0 l6.24 -14.16 l1.74 0 z M29.216 14.82 l5.36 0 l-2.64 -6.5 l-0.04 0 z M61.952 8.44 l-3.42 11.56 l-2.02 0 l-4.14 -14.16 l2 0 l3.12 11.32 l0.04 0 l3.34 -11.32 l2.2 0 l3.34 11.32 l0.04 0 l3.12 -11.32 l2 0 l-4.12 14.16 l-2.02 0 l-3.44 -11.56 l-0.04 0 z M88.348 5.84 l3.86 6.22 l3.98 -6.22 l2.34 0 l-5.36 8.12 l0 6.04 l-1.92 0 l0 -6.04 l-5.36 -8.12 l2.46 0 z M123.784 5.84 l0 1.8 l-7.22 0 l0 4.22 l6.72 0 l0 1.8 l-6.72 0 l0 4.54 l7.58 0 l0 1.8 l-9.5 0 l0 -14.16 l9.14 0 z M146.44 5.84 c1.38666 0 2.47334 0.34666 3.26 1.04 s1.18 1.66668 1.18 2.92002 c0 0.94666 -0.32334 1.77332 -0.97 2.47998 s-1.47666 1.12666 -2.49 1.26 l-0.02 0 l4.02 6.46 l-2.4 0 l-3.6 -6.24 l-2.14 0 l0 6.24 l-1.92 0 l0 -14.16 l5.08 0 z M145.88002 12.08 c1 0 1.74334 -0.183359 2.23 -0.55002 s0.73 -0.94332 0.73 -1.72998 c0 -1.52 -0.98666 -2.28 -2.96 -2.28 l-2.6 0 l0 4.56 l2.6 0 z M190.052 5.84 l0 5.88 l7.34 0 l0 -5.88 l1.92 0 l0 14.16 l-1.92 0 l0 -6.48 l-7.34 0 l0 6.48 l-1.92 0 l0 -14.16 l1.92 0 z M219.108 5.84 l0 8.74 c0 1.16 0.32334 2.11334 0.97 2.86 s1.51 1.12 2.59 1.12 s1.94334 -0.37334 2.59 -1.12 s0.97 -1.7 0.97 -2.86 l0 -8.74 l1.92 0 l0 9.06 c0 0.97334 -0.23 1.88334 -0.69 2.73 s-1.11334 1.51332 -1.96 1.99998 s-1.79 0.73 -2.83 0.73 c-1.6 0 -2.91334 -0.52334 -3.94 -1.57 s-1.54 -2.34332 -1.54 -3.88998 l0 -9.06 l1.92 0 z M251.024 5.84 c1.29334 0 2.32 0.32 3.08 0.96 s1.14 1.5 1.14 2.58 c0 1.53334 -0.81334 2.57334 -2.44 3.12 l0 0.04 l0.02 0 c0.92 0.10666 1.65666 0.49 2.21 1.15 s0.83 1.45 0.83 2.37 c0 1.18666 -0.45666 2.14 -1.37 2.86 s-2.09 1.08 -3.53 1.08 l-4.94 0 l0 -14.16 l5 0 z M250.624 11.72 c0.8 0 1.43 -0.18334 1.89 -0.55 s0.69 -0.89 0.69 -1.57 c0 -0.64 -0.2 -1.14666 -0.6 -1.52 s-0.92666 -0.56 -1.58 -0.56 l-3.08 0 l0 4.2 l2.68 0 z M250.844 18.32 c0.94666 0 1.68 -0.22 2.2 -0.66 s0.78 -1.02 0.78 -1.74 c0 -0.8 -0.26334 -1.42 -0.79 -1.86 s-1.27 -0.66 -2.23 -0.66 l-2.86 0 l0 4.92 l2.9 0 z M274.08 17.48 c0.37334 0 0.68664 0.133418 0.93998 0.400078 s0.38 0.57332 0.38 0.91998 c0 0.38666 -0.13334 0.70332 -0.4 0.94998 s-0.57332 0.37 -0.91998 0.37 s-0.65332 -0.12666 -0.91998 -0.38 s-0.4 -0.56668 -0.4 -0.94002 s0.13334 -0.68668 0.4 -0.94002 s0.57332 -0.38 0.91998 -0.38 z" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#how-it-works"
                className={`font-medium transition-colors ${
                  activeSection === "how-it-works"
                    ? "text-white underline underline-offset-8"
                    : "text-white/80 hover:text-white"
                }`}
              >
                How it works
              </a>
              <a
                href="#for-companies"
                className={`font-medium transition-colors ${
                  activeSection === "for-companies"
                    ? "text-white underline underline-offset-8"
                    : "text-white/80 hover:text-white"
                }`}
              >
                For companies
              </a>
              <a
                href="#for-firms"
                className={`font-medium transition-colors ${
                  activeSection === "for-firms"
                    ? "text-white underline underline-offset-8"
                    : "text-white/80 hover:text-white"
                }`}
              >
                For law firms
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-52 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-5xl font-headline font-bold text-slate-900 leading-tight mb-6">
            The marketplace for legal services
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Where companies and premium law firms connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="#how-it-works"
              className="bg-white text-slate-700 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              See how it works
            </a>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-colors border-2 cursor-pointer"
              style={{ borderColor: "#11999e", color: "#0d7377" }}
            >
              Ask for a demo
            </button>
            <a
              href="/register"
              className="px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: "#11999e20", color: "#0d7377" }}
            >
              Join LEXIFY
            </a>
            <a
              href="/login"
              className="text-white px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: "#11999e" }}
            >
              Sign in
            </a>
          </div>
          <p className="text-slate-500 text-base">
            Built for companies and law firms looking for modern, data-driven
            legal service delivery. Currently available in Finland only.
          </p>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 px-6 bg-slate-50 border-y border-slate-100 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-slate-500 text-base font-medium mb-8 uppercase tracking-wide">
            Trusted by leading companies, including:
          </p>

          <div className="relative">
            <div className="flex justify-center items-center gap-12 md:gap-16 flex-nowrap">
              {trustedLogos.map((logo) => (
                <div
                  key={logo.name}
                  className="h-10 flex items-center justify-center"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="h-11 w-auto max-w-40 object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem: Old Way vs New Way */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Old Way */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <span className="inline-block text-sm font-semibold uppercase tracking-wide text-slate-500 bg-slate-200 px-4 py-1.5 rounded-full mb-6">
                The old way
              </span>
              <p className="text-slate-600 leading-relaxed">
                Buying legal services is slow and inefficient. Finding the right
                firm takes too long, and pricing is almost impossible to predict
                or compare.
              </p>
            </div>
            {/* New Way */}
            <div
              className="rounded-2xl p-8 border"
              style={{ backgroundColor: "#11999e10", borderColor: "#11999e30" }}
            >
              <span
                className="inline-block text-sm font-semibold uppercase tracking-wide px-4 py-1.5 rounded-full mb-6"
                style={{ backgroundColor: "#11999e20", color: "#0d7377" }}
              >
                The LEXIFY way
              </span>
              <p className="text-slate-700 leading-relaxed">
                LEXIFY makes buying legal services simple, fast, and
                transparent. Your requests are structured, proposals are
                standardized, and you compare vetted firms on expertise and
                pricing in one place before you decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-20 px-6 bg-slate-900 scroll-mt-32"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-white text-center mb-4">
            How LEXIFY works
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            A simple, structured process for both sides that brings clarity to
            legal procurement
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Company posts request",
                description:
                  "Companies describe their legal needs in a structured format. Law firms see qualified opportunities matching their expertise.",
              },
              {
                step: "2",
                title: "Law firms submit offers",
                description:
                  "Law firms submit comparable proposals in standardized format. Companies review proposals side by side.",
              },
              {
                step: "3",
                title: "Company selects",
                description:
                  "Company chooses the best fit. Work begins with scope, pricing and terms already aligned.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-6"
                  style={{ backgroundColor: "#11999e" }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for Legal Buyers */}
      <section id="for-companies" className="py-20 px-6 scroll-mt-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <span
              className="inline-block text-sm font-semibold uppercase tracking-wide px-4 py-1.5 rounded-full"
              style={{ backgroundColor: "#11999e20", color: "#0d7377" }}
            >
              For companies
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 text-center mb-4">
            Built for in-house teams and business leaders
          </h2>
          <p className="text-slate-600 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to source legal services efficiently
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                title: "Faster sourcing",
                description: (
                  <>
                    <strong>
                      Save up to 95% of your time spent on legal sourcing.
                    </strong>{" "}
                    No more chasing quotes, writing emails, and explaining the
                    same matter multiple times.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                ),
                title: "Transparent pricing",
                description: (
                  <>
                    <strong>
                      Get fixed fee offers from law firms and compare them side
                      by side before you commit.
                    </strong>{" "}
                    Hourly rates also available.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
                title: "Curated expertise",
                description: (
                  <>
                    <strong>
                      Access premium, vetted law firms with the right expertise
                      for each legal need.
                    </strong>{" "}
                    Full-service firms and sector specialists included.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                title: "Free for companies",
                description: (
                  <>
                    <strong>No fees or charges.</strong> LEXIFY is completely
                    free for companies to use.
                  </>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: "#11999e15", color: "#11999e" }}
                >
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial - Companies */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-8 md:p-10 border"
            style={{ backgroundColor: "#11999e10", borderColor: "#11999e20" }}
          >
            <svg
              className="w-10 h-10 text-slate-300 mb-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="text-lg md:text-xl text-slate-700 leading-relaxed mb-6">
              "LEXIFY's competitive procurement process is easy to use,
              efficient and transparent. We received multiple high-quality
              proposals within 24 hours, which enabled us to make a truly
              informed decision based on genuine comparison."
            </blockquote>
            <div>
              <p className="text-slate-900 font-semibold">Outi Raekivi</p>
              <p className="text-slate-500 text-sm">CLO, Technopolis</p>
            </div>
          </div>
        </div>
      </section>
      <section id="for-firms" className="py-20 px-6 bg-slate-900 scroll-mt-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <span
              className="inline-block text-sm font-semibold uppercase tracking-wide px-4 py-1.5 rounded-full"
              style={{ backgroundColor: "#11999e30", color: "#5eead4" }}
            >
              For law firms
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-white text-center mb-4">
            A new way to meet clients who are ready to engage
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Reach new clients beyond your network. Win work on expertise and
            merit.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                ),
                title: "Business growth",
                description: (
                  <>
                    <strong>
                      A direct pipeline to vetted mid and large cap companies
                      seeking legal services.
                    </strong>{" "}
                    Expand your client base and reach new market segments —
                    without traditional business development costs.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                ),
                title: "New opportunity channel",
                description: (
                  <>
                    <strong>
                      Fill capacity gaps and offset unpredictable deal flow.
                    </strong>{" "}
                    LEXIFY provides a new stream of qualified opportunities
                    alongside your existing channels.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                title: "Faster proposals",
                description: (
                  <>
                    <strong>
                      Standardized process reduces the time per proposal.
                    </strong>{" "}
                    Respond to more opportunities without adding overhead.
                  </>
                ),
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
                title: "Quality assurance",
                description: (
                  <>
                    <strong>
                      All companies on LEXIFY are vetted and pre-qualified.
                    </strong>{" "}
                    Spend less time on unsuitable prospects and more time on
                    real opportunities.
                  </>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: "#11999e25", color: "#5eead4" }}
                >
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-slate-400 mb-2">
              Monthly service fee on platform use
            </p>
            <p className="text-sm text-slate-500">
              No upfront costs. Fee applies only when you win work through the
              platform.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonial - Law Firms */}
      <section className="py-12 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800 rounded-2xl p-8 md:p-10 border border-slate-700">
            <svg
              className="w-10 h-10 mb-6"
              style={{ color: "#5eead4" }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="text-lg md:text-xl text-slate-300 leading-relaxed mb-6">
              "LEXIFY gives us access to clients we might not otherwise reach,
              and allows us to compete on the strength of our expertise. The
              platform is straightforward to use, the process is efficient, and
              it connects us with decision-makers who are ready to engage and
              value quality counsel."
            </blockquote>
            <div>
              <p className="text-white font-semibold">Antti Pulkkinen</p>
              <p className="text-slate-400 text-sm">Partner, Magnusson</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Credibility */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 mb-4">
            Built by people who understand both sides
          </h2>
          <p className="text-slate-600 mb-4 max-w-2xl mx-auto leading-relaxed">
            LEXIFY's founding team brings over 45 years of combined legal
            experience from both corporate legal departments and leading law
            firms. Our platform is designed to serve the real needs of both
            sides of the legal services market.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-10">
            Ready to see how LEXIFY could serve your company or law firm? Let's
            talk.
          </h2>
          <div className="flex justify-center">
            <button
              onClick={() => setDemoModalOpen(true)}
              className="text-white px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-colors cursor-pointer"
              style={{ backgroundColor: "#11999e" }}
            >
              Ask for a demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6" style={{ backgroundColor: "#11999e" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-10 mb-12">
            <div>
              <div className="mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 300 140"
                  className="h-16 w-auto"
                >
                  <g transform="scale(0.8) translate(10, 10)">
                    <g
                      transform="matrix(5.78,0,0,5.78,-7.5,-23)"
                      fill="#ffffff"
                    >
                      <path d="M1.3 5.7 l3.18 0 l0 11.42 l2.3 0 l0.5 0.06 l0 -1.36 l2.7 -1.26 l0 5.44 l-8.68 0 l0 -14.3 z M11.98 5.7 l8.42004 0 c-0.13334 0.50666 -0.26668 0.98666 -0.40002 1.44 s-0.26668 0.92 -0.40002 1.4 l-4.4 0 c0 0.05334 0.00666 0.13 0.02 0.23 s0.02 0.17666 0.02 0.23 l0 2.1 l4.04 0 l0 2.86 l-4.04 0 l0 2.74 l-0.04 0.46 l5.28 0 l0 2.84 l-8.5 0 l0 -14.3 z M21.26 20 l4.41998 -7.58 c-0.32 -0.52 -0.65334 -1.06334 -1 -1.63 s-0.7 -1.14 -1.06 -1.72 s-0.71334 -1.15334 -1.06 -1.72 s-0.67332 -1.11 -0.97998 -1.63 l3.66 0 l2.16 3.52 l2.1 -3.52 l3.66 0 l-4.02 6.76 l4.38 7.52 l-3.44 0 l-2.58 -4.46 l-0.19 0.34 l-0.47 0.84 l-0.61 1.07 l-0.61 1.07 l-0.47 0.82 l-0.19 0.32 l-3.7 0 z M34.9 5.7 l3.26 0 l0 14.3 l-3.26 0 l0 -14.3 z M40.74 5.72 l8.42002 -0.00002 c-0.14666 0.53334 -0.28666 1.00668 -0.42 1.42002 c-0.10666 0.34666 -0.20666 0.66666 -0.3 0.96 s-0.14668 0.44 -0.16002 0.44 l-4.32 0 l0.04 0.44 l0 2.46 l4.04 0 l0 2.86 l-4.04 0 l0 5.7 l-3.26 0 l0 -14.28 z M54.1 14.84 l-0.19 -0.38 l-0.51 -1.03 l-0.72 -1.47 l-0.82 -1.68 c-0.65334 -1.33334 -1.4 -2.86 -2.24 -4.58 l3.6 0 l2.58 5.88 c0.48 -1.09334 0.90666 -2.07334 1.28 -2.94 c0.16 -0.36 0.31666 -0.71666 0.47 -1.07 s0.29 -0.67 0.41 -0.95 s0.21666 -0.50334 0.29 -0.67 l0.11 -0.25 l3.5 0 l-4.48 9.16 l0 5.16 l-3.28 0 l0 -5.18 z" />
                    </g>
                    <g transform="matrix(1.07,0,0,1.07,26,127)" fill="#ffffff">
                      <path d="M3.74 5.84 l0 12.36 l6.5 0 l0 1.8 l-8.42 0 l0 -14.16 l1.92 0 z M32.876 5.84 l6.06 14.16 l-2.24 0 l-1.42 -3.5 l-6.74 0 l-1.4 3.5 l-2.24 0 l6.24 -14.16 l1.74 0 z M29.216 14.82 l5.36 0 l-2.64 -6.5 l-0.04 0 z M61.952 8.44 l-3.42 11.56 l-2.02 0 l-4.14 -14.16 l2 0 l3.12 11.32 l0.04 0 l3.34 -11.32 l2.2 0 l3.34 11.32 l0.04 0 l3.12 -11.32 l2 0 l-4.12 14.16 l-2.02 0 l-3.44 -11.56 l-0.04 0 z M88.348 5.84 l3.86 6.22 l3.98 -6.22 l2.34 0 l-5.36 8.12 l0 6.04 l-1.92 0 l0 -6.04 l-5.36 -8.12 l2.46 0 z M123.784 5.84 l0 1.8 l-7.22 0 l0 4.22 l6.72 0 l0 1.8 l-6.72 0 l0 4.54 l7.58 0 l0 1.8 l-9.5 0 l0 -14.16 l9.14 0 z M146.44 5.84 c1.38666 0 2.47334 0.34666 3.26 1.04 s1.18 1.66668 1.18 2.92002 c0 0.94666 -0.32334 1.77332 -0.97 2.47998 s-1.47666 1.12666 -2.49 1.26 l-0.02 0 l4.02 6.46 l-2.4 0 l-3.6 -6.24 l-2.14 0 l0 6.24 l-1.92 0 l0 -14.16 l5.08 0 z M145.88002 12.08 c1 0 1.74334 -0.183359 2.23 -0.55002 s0.73 -0.94332 0.73 -1.72998 c0 -1.52 -0.98666 -2.28 -2.96 -2.28 l-2.6 0 l0 4.56 l2.6 0 z M190.052 5.84 l0 5.88 l7.34 0 l0 -5.88 l1.92 0 l0 14.16 l-1.92 0 l0 -6.48 l-7.34 0 l0 6.48 l-1.92 0 l0 -14.16 l1.92 0 z M219.108 5.84 l0 8.74 c0 1.16 0.32334 2.11334 0.97 2.86 s1.51 1.12 2.59 1.12 s1.94334 -0.37334 2.59 -1.12 s0.97 -1.7 0.97 -2.86 l0 -8.74 l1.92 0 l0 9.06 c0 0.97334 -0.23 1.88334 -0.69 2.73 s-1.11334 1.51332 -1.96 1.99998 s-1.79 0.73 -2.83 0.73 c-1.6 0 -2.91334 -0.52334 -3.94 -1.57 s-1.54 -2.34332 -1.54 -3.88998 l0 -9.06 l1.92 0 z M251.024 5.84 c1.29334 0 2.32 0.32 3.08 0.96 s1.14 1.5 1.14 2.58 c0 1.53334 -0.81334 2.57334 -2.44 3.12 l0 0.04 l0.02 0 c0.92 0.10666 1.65666 0.49 2.21 1.15 s0.83 1.45 0.83 2.37 c0 1.18666 -0.45666 2.14 -1.37 2.86 s-2.09 1.08 -3.53 1.08 l-4.94 0 l0 -14.16 l5 0 z M250.624 11.72 c0.8 0 1.43 -0.18334 1.89 -0.55 s0.69 -0.89 0.69 -1.57 c0 -0.64 -0.2 -1.14666 -0.6 -1.52 s-0.92666 -0.56 -1.58 -0.56 l-3.08 0 l0 4.2 l2.68 0 z M250.844 18.32 c0.94666 0 1.68 -0.22 2.2 -0.66 s0.78 -1.02 0.78 -1.74 c0 -0.8 -0.26334 -1.42 -0.79 -1.86 s-1.27 -0.66 -2.23 -0.66 l-2.86 0 l0 4.92 l2.9 0 z M274.08 17.48 c0.37334 0 0.68664 0.133418 0.93998 0.400078 s0.38 0.57332 0.38 0.91998 c0 0.38666 -0.13334 0.70332 -0.4 0.94998 s-0.57332 0.37 -0.91998 0.37 s-0.65332 -0.12666 -0.91998 -0.38 s-0.4 -0.56668 -0.4 -0.94002 s0.13334 -0.68668 0.4 -0.94002 s0.57332 -0.38 0.91998 -0.38 z" />
                    </g>
                  </g>
                </svg>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-white transition-colors"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#for-companies"
                    className="hover:text-white transition-colors"
                  >
                    For companies
                  </a>
                </li>
                <li>
                  <a
                    href="#for-firms"
                    className="hover:text-white transition-colors"
                  >
                    For law firms
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>
                  <a
                    href="/docs/lexify-general-privacy-statement.pdf"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/lexify-tos.pdf"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              © 2026 Lexify Oy. All rights reserved.
            </p>
            <p className="text-white/60 text-sm">Helsinki, Finland</p>
          </div>
          <div className="flex justify-center mt-6">
            <a
              href="https://www.linkedin.com/company/lexify-online/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="text-sm">Follow us on LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-slate-900">
                    Request a demo
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Tell us a bit about yourself
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDemoModalOpen(false);
                    setFormSubmitted(false);
                    setSubmitError("");
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {!formSubmitted ? (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                        placeholder="john@company.fi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Company or law firm name *
                      </label>
                      <input
                        type="text"
                        name="company"
                        required
                        value={formData.company}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                        placeholder="Company Oy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Job title *
                      </label>
                      <input
                        type="text"
                        name="role"
                        required
                        value={formData.role}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                        placeholder="e.g. CLO, Partner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      Phone number{" "}
                      <span className="text-slate-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                      placeholder="+358 40 123 4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      I represent *
                    </label>
                    <select
                      name="userType"
                      required
                      value={formData.userType}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-white text-slate-900"
                    >
                      <option value="">Select one</option>
                      <option value="purchaser">
                        A company buying legal services
                      </option>
                      <option value="provider">A law firm</option>
                    </select>
                  </div>

                  {formData.userType === "purchaser" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Company turnover *
                      </label>
                      <select
                        name="turnover"
                        required
                        value={formData.turnover}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-white text-slate-900"
                      >
                        <option value="">Select turnover range</option>
                        <option value="10-50M">€10-50 million</option>
                        <option value="50-100M">€50-100 million</option>
                        <option value="100-500M">€100-500 million</option>
                        <option value="500M-1B">
                          €500 million - €1 billion
                        </option>
                        <option value="1B+">€1 billion+</option>
                      </select>
                    </div>
                  )}

                  {formData.userType === "provider" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-1">
                        Law firm website *
                      </label>
                      <input
                        type="url"
                        name="website"
                        required
                        value={formData.website}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-slate-900"
                        placeholder="https://www.lawfirm.fi"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      {orgLabel} domicile
                    </label>
                    <input
                      type="text"
                      value="Finland"
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      LEXIFY is currently available for Finnish {availability}{" "}
                      only
                    </p>
                  </div>
                  {submitError && (
                    <p className="text-sm text-red-600">{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#11999e" }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit demo request"}
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    We'll review your request and get back to you within 1-2
                    business days. To ensure our reply reaches you, please add
                    support@lexify.online to your contacts or ask your IT team
                    to whitelist it.
                  </p>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "#11999e20" }}
                  >
                    <svg
                      className="w-8 h-8"
                      style={{ color: "#11999e" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Thank you!
                  </h3>
                  <p className="text-slate-600 mb-6">
                    We'll review your request and get back to you within 1-2
                    business days.
                  </p>
                  <button
                    onClick={() => {
                      setDemoModalOpen(false);
                      setFormSubmitted(false);
                      setSubmitError("");
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        company: "",
                        role: "",
                        userType: "",
                        turnover: "",
                        website: "",
                      });
                    }}
                    className="font-medium hover:opacity-80 transition-colors cursor-pointer"
                    style={{ color: "#11999e" }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LexifyLanding;
