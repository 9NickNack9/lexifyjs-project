"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BadgeEuro, ClipboardPlus, Handshake } from "lucide-react";

const FOUNDERS = [
  {
    name: "Kimmo Kantele",
    role: "Co-founder & CEO",
    photo: "/founders/kimmo.jfif",
    linkedin: "https://www.linkedin.com/in/kimmo-kantele-b159317",
  },
  {
    name: "Anna-Sofia Kivi",
    role: "Co-founder",
    photo: "/founders/anna-sofia.jfif",
    linkedin: "https://www.linkedin.com/in/anna-sofia-kivi-7a6b79b1",
  },
  {
    name: "Aleksi Airas",
    role: "Co-founder",
    photo: "/founders/aleksi.jfif",
    linkedin: "https://www.linkedin.com/in/aleksi-airas-a9177a4",
  },
  {
    name: "Niklas Kantele",
    role: "Co-founder",
    photo: "/founders/niklas.jfif",
    linkedin: "https://www.linkedin.com/in/niklas-k-a3401a120",
  },
];

const LOGOS = {
  lexifyNav: "/lexify_wide.png",
  olvi: "/logos/Olvi-logo.png",
  sitowise: "/logos/sitowise-logo.png",
  technopolis: "/logos/technopolis-logo.png",
};

const wrap =
  "mx-auto w-[calc(100%-40px)] max-w-[1248px] md:w-[calc(100%-112px)]";
const eyebrow =
  "mb-5 text-md font-semibold uppercase leading-[1.6] tracking-[0.16em] text-[#11999e] md:mb-6";
const muted = "text-[#5b6e75]";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  userType: "",
  turnover: "",
  website: "",
};

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-[opacity,transform] duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function WaveField({ className = "" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute -right-24 top-0 h-full w-[70%] opacity-40"
        viewBox="0 0 800 400"
        fill="none"
        preserveAspectRatio="xMaxYMid slice"
      >
        <path
          d="M80 40c120 40 180 120 280 110s170-90 280-40 140 150 200 140"
          stroke="#11999e"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <path
          d="M40 120c140 30 200 100 310 90s190-70 290-20 150 120 220 110"
          stroke="#11999e"
          strokeWidth="1.2"
          opacity="0.25"
        />
        <path
          d="M0 200c160 20 220 90 340 80s200-60 310-10 160 100 230 90"
          stroke="#7fd3d6"
          strokeWidth="1.2"
          opacity="0.2"
        />
        <circle cx="620" cy="90" r="2.5" fill="#7fd3d6" />
        <circle cx="480" cy="210" r="2" fill="#11999e" />
        <circle cx="700" cy="260" r="1.5" fill="#7fd3d6" />
      </svg>
    </div>
  );
}

function LexiGreeting({ className = "", bubbleClassName = "", children }) {
  const rowRef = useRef(null);
  const bubbleRef = useRef(null);
  const [size, setSize] = useState(48);

  useEffect(() => {
    const row = rowRef.current;
    const bubble = bubbleRef.current;
    if (!row || !bubble) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      const bubbleH = Math.round(bubble.getBoundingClientRect().height);
      const next = Math.min(bubbleH || 48, mq.matches ? 67 : bubbleH || 48);
      if (next > 0) setSize((prev) => (prev === next ? prev : next));
    };
    update();
    mq.addEventListener("change", update);
    if (typeof ResizeObserver === "undefined") {
      return () => mq.removeEventListener("change", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(row);
    observer.observe(bubble);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={rowRef} className={`flex max-w-full items-center gap-2 ${className}`}>
      <div
        className="font-headline flex shrink-0 items-center justify-center rounded-full bg-[#11999e] font-bold leading-none text-white shadow-sm"
        style={{
          width: size,
          height: size,
          fontWeight: 700,
          containerType: "size",
        }}
      >
        <span className="leading-none" style={{ fontSize: "38.5cqmin" }}>
          Lexi
        </span>
      </div>
      <p
        ref={bubbleRef}
        className={`min-w-0 rounded-2xl rounded-bl-sm border border-[#b7d9dc] bg-[#e7f6f6] text-gray-800 ${
          bubbleClassName ||
          "px-[14px] py-[11px] text-sm leading-[1.55] md:px-5 md:py-[13px] md:text-base md:leading-[1.65]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function DemoButton({
  className = "",
  children = "Ask for a demo",
  onClick,
  variant = "primary",
}) {
  const colors =
    variant === "light"
      ? "bg-white text-[#0b2744] hover:bg-[#11999e] hover:text-white"
      : variant === "outline"
        ? "border-2 border-[#11999e] bg-white text-[#11999e] hover:bg-[#11999e] hover:text-white"
        : "bg-[#11999e] text-white hover:bg-[#0d7478]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${colors} ${className}`}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#d7e4e5] px-4 py-2.5 text-[#0b2744] outline-none transition-colors focus:border-[#11999e] focus:ring-2 focus:ring-[#11999e]/30";

function DemoModal({
  formData,
  formSubmitted,
  isSubmitting,
  submitError,
  orgLabel,
  availability,
  onChange,
  onSubmit,
  onClose,
}) {
  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07192d]/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              {!formSubmitted && (
                <>
                  <h2 className="font-headline text-2xl font-semibold text-[#0b2744]">
                    Request a demo
                  </h2>
                  <p className="mt-1 text-[#5b6e75]">
                    Tell us a bit about yourself
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer text-[#5b6e75] transition-colors hover:text-[#0b2744]"
              aria-label="Close demo request"
            >
              <svg
                className="h-6 w-6"
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
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="john@company.fi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Company or law firm name *
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    value={formData.company}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="Company Oy"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Job title *
                  </label>
                  <input
                    type="text"
                    name="role"
                    required
                    value={formData.role}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="e.g. CLO, Partner"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                  Phone number{" "}
                  <span className="font-normal text-[#5b6e75]">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  className={inputClass}
                  placeholder="+358 40 123 4567"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                  I represent *
                </label>
                <select
                  name="userType"
                  required
                  value={formData.userType}
                  onChange={onChange}
                  className={`${inputClass} bg-white`}
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
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Company turnover *
                  </label>
                  <select
                    name="turnover"
                    required
                    value={formData.turnover}
                    onChange={onChange}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">Select turnover range</option>
                    <option value="10-50M">€10-50 million</option>
                    <option value="50-100M">€50-100 million</option>
                    <option value="100-500M">€100-500 million</option>
                    <option value="500M-1B">€500 million - €1 billion</option>
                    <option value="1B+">€1 billion+</option>
                  </select>
                </div>
              )}

              {formData.userType === "provider" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                    Law firm website *
                  </label>
                  <input
                    type="url"
                    name="website"
                    required
                    value={formData.website}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="https://www.lawfirm.fi"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-[#0b2744]">
                  {orgLabel} domicile
                </label>
                <input
                  type="text"
                  value="Finland"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-[#e6eeee] bg-[#f4f8f8] px-4 py-2.5 text-[#5b6e75]"
                />
                <p className="mt-1 text-xs text-[#5b6e75]">
                  LEXIFY is currently available for Finnish {availability} only
                </p>
              </div>

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-full bg-[#11999e] py-3 font-semibold text-white transition-colors hover:bg-[#0d7478] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit demo request"}
              </button>

              <p className="text-center text-xs text-[#5b6e75]">
                We&apos;ll review your request and get back to you within 1-2
                business days. To ensure our reply reaches you, please add
                support@lexify.online to your contacts or ask your IT team to
                whitelist it.
              </p>
            </form>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#11999e]/15">
                <svg
                  className="h-8 w-8 text-[#11999e]"
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
              <h3 className="mb-2 text-xl font-semibold text-[#0b2744]">
                Thank you!
              </h3>
              <p className="mb-6 text-[#5b6e75]">
                We&apos;ll review your request and get back to you within 1-2
                business days.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer font-medium text-[#11999e] transition-colors hover:text-[#0d7478]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

const LexifyLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(7);
  const rootRef = useRef(null);
  const navRef = useRef(null);

  const orgLabel = formData.userType === "provider" ? "Law Firm" : "Company";
  const availability = orgLabel === "Law Firm" ? "law firm's" : "companies";

  const openDemo = () => {
    setMobileMenuOpen(false);
    setDemoModalOpen(true);
  };

  const closeDemo = () => {
    setDemoModalOpen(false);
    setFormSubmitted(false);
    setSubmitError("");
    setFormData(emptyForm);
  };

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
        headers: { "Content-Type": "application/json" },
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
    document.body.style.overflow =
      demoModalOpen || mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [demoModalOpen, mobileMenuOpen]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const setNavHeight = () => {
      document.documentElement.style.setProperty(
        "--lexify-nav-h",
        `${nav.getBoundingClientRect().height}px`,
      );
    };

    setNavHeight();
    const observer = new ResizeObserver(setNavHeight);
    observer.observe(nav);
    window.addEventListener("resize", setNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", setNavHeight);
      document.documentElement.style.removeProperty("--lexify-nav-h");
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollToSection = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const navH = navRef.current?.getBoundingClientRect().height ?? 0;
      const top = window.scrollY + el.getBoundingClientRect().top - navH;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };

    const onClick = (event) => {
      const link = event.target.closest("a[href^='#']");
      if (!link || !root.contains(link)) return;
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const id = decodeURIComponent(href.slice(1));
      if (!document.getElementById(id)) return;
      event.preventDefault();
      setMobileMenuOpen(false);
      scrollToSection(id);
      window.history.replaceState(null, "", href);
    };

    const hashId = window.location.hash.slice(1);
    if (hashId) {
      requestAnimationFrame(() => scrollToSection(hashId));
    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const conversation = root.querySelector("[data-lexi-conversation]");
    if (!conversation || !("IntersectionObserver" in window)) return;

    setVisibleCount(0);
    let started = false;
    let complete = false;
    const timers = [];
    let observer;

    const finish = () => {
      if (complete) return;
      complete = true;
      timers.forEach(clearTimeout);
      setVisibleCount(8);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const start = () => {
      if (started || complete) return;
      started = true;
      [0, 800, 2050, 2980, 3640, 4090, 4380].forEach((delay, index) => {
        timers.push(setTimeout(() => setVisibleCount(index + 1), delay));
      });
      timers.push(setTimeout(finish, 5200));
    };
    const onScroll = () => {
      const bounds = conversation.getBoundingClientRect();
      if (bounds.bottom < 0 || (started && bounds.top > window.innerHeight)) {
        finish();
      }
    };
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else if (started || entry.boundingClientRect.bottom < 0) finish();
        });
      },
      { threshold: 0.08 },
    );
    observer.observe(conversation);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const bubbleClass = (index) =>
    `max-w-[92%] self-end rounded-2xl rounded-br-sm border border-gray-300 bg-white px-[14px] py-[11px] text-sm leading-[1.55] text-gray-800 shadow-sm transition-[opacity,transform] duration-300 motion-reduce:transform-none motion-reduce:duration-100 md:max-w-[80%] md:px-5 md:py-[13px] md:text-base md:leading-[1.65] ${
      visibleCount > index
        ? "translate-y-0 opacity-100"
        : "translate-y-2 opacity-0"
    }`;

  const navLinks = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#for-companies", label: "For companies" },
    { href: "#for-firms", label: "For law firms" },
  ];

  return (
    <div
      ref={rootRef}
      className="min-h-screen w-full bg-[linear-gradient(45deg,#11999e_0%,#cfecee_30%,#cfecee_70%,#11999e_100%)] bg-fixed font-['Inter',Arial,sans-serif] text-base leading-[1.65] text-[#0b2744] [&_h1]:font-headline [&_h2]:font-headline [&_h3]:font-headline [&_h1]:font-bold [&_h2]:font-normal [&_h3]:font-normal [&_h1]:leading-[1.09] [&_h2]:leading-[1.09] [&_h3]:leading-[1.09] [&_h1]:whitespace-nowrap [&_h1]:text-[clamp(13px,calc((100vw-80px)/23),56px)] [&_h2]:text-[40px] md:[&_h2]:text-[52px] [&_h3]:text-[25px] md:[&_h3]:text-[26px] [&_h1]:tracking-[-0.035em] [&_h2]:tracking-[-0.035em] [&_h3]:tracking-[-0.025em] [&_h2]:max-w-[710px] [&_a]:no-underline [&_blockquote]:m-0 [&_blockquote]:max-w-[875px] [&_blockquote]:font-headline [&_blockquote]:text-[25px] md:[&_blockquote]:text-[30px] [&_blockquote]:leading-[1.5] [&_blockquote]:tracking-[-0.02em]"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-headline { font-family: 'Outfit', sans-serif; }
        html { scroll-behavior: smooth; scroll-padding-top: var(--lexify-nav-h, 5.5rem); }
        section { scroll-margin-top: var(--lexify-nav-h, 5.5rem); }
      `}</style>

      <header className="fixed top-0 right-0 left-0 z-50 bg-[#11999e]">
        <nav
          ref={navRef}
          className={`${wrap} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-1 md:py-1.5`}
          aria-label="Main navigation"
        >
          <a
            href="#"
            className="flex shrink-0 items-center"
            aria-label="LEXIFY home"
          >
            <img
              src={LOGOS.lexifyNav}
              alt="LEXIFY"
              className="h-16 w-auto object-contain object-left md:h-20"
            />
          </a>

          <div className="hidden items-center gap-8 text-md text-white md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white/80"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="ml-auto hidden items-center gap-3 text-sm md:flex lg:gap-4">
            <Link
              href="/login"
              className="rounded-full border-2 border-white bg-white px-4 py-2 font-semibold text-black transition-colors hover:bg-white/90"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full border-2 border-white px-4 py-2 font-semibold text-white transition-colors hover:bg-white hover:text-[#11999e]"
            >
              Join LEXIFY
            </Link>
          </div>

          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/70 text-white md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <svg
                className="h-5 w-5"
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
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="border-t border-white/20 bg-[#11999e] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4 text-sm">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 font-medium text-white"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="rounded-full border-2 border-white bg-white px-4 py-2.5 text-center font-semibold text-black transition-colors hover:bg-white/90"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full border-2 border-white px-4 py-2.5 text-center font-semibold text-white transition-colors hover:bg-white hover:text-[#11999e]"
              >
                Join LEXIFY
              </Link>
            </div>
          </div>
        )}
      </header>

      <main
        className="overflow-x-hidden"
        style={{ paddingTop: "var(--lexify-nav-h, 5.5rem)" }}
      >
        <section
          className="relative pb-7 pt-[58px] md:pb-8 md:pt-[94px]"
          aria-labelledby="hero-title"
        >
          <div
            className={`${wrap} relative flex flex-col items-center gap-6 text-center md:gap-7`}
          >
            <Reveal>
              <h1 id="hero-title" className="text-[#0b2744]">
                The marketplace for legal services
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="font-headline text-[25px] leading-[1.3] tracking-[-0.02em] text-[#11999e] md:text-[28px]">
                Where companies and premium law firms connect.
              </p>
              <div className="mt-[26px] flex flex-wrap items-center justify-center gap-5 md:mt-[30px]">
                <DemoButton onClick={openDemo} />
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[#11999e] bg-white px-5 py-2.5 text-sm font-semibold text-[#11999e] transition-colors hover:bg-[#11999e] hover:text-white"
                >
                  See how it works <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className={`mt-4 text-base leading-[1.75] md:mt-5 ${muted}`}>
                Built for companies and law firms looking for modern,
                data-driven legal service delivery. Currently available in
                Finland only.
              </p>
            </Reveal>
          </div>
        </section>

        <section
          className={`${wrap} py-3 md:py-4`}
          aria-label="Trusted companies"
        >
          <div className="grid grid-cols-1 items-center rounded-2xl bg-white/45 px-6 py-6 md:min-h-[148px] md:grid-cols-[1fr_2.3fr] md:px-10 md:py-0">
            <Reveal className="flex h-full items-center">
              <p className="text-md font-semibold uppercase leading-[1.6] tracking-[0.16em] text-[#11999e]">
                Trusted by leading
                <br className="hidden md:block" /> companies, including:
              </p>
            </Reveal>
            <Reveal className="flex h-full w-full items-center" delay={100}>
              <div className="mt-4 grid grid-cols-3 items-center md:mt-0 [&_div]:flex [&_div]:justify-center [&_div]:border-l [&_div]:border-[#d7e4e5] [&_div]:px-4 [&_div:first-child]:border-0 [&_div:first-child]:pl-0 [&_div:last-child]:pr-0 md:[&_div]:px-6 md:[&_div]:py-3 md:[&_div:first-child]:border-l md:[&_div:first-child]:pl-6 md:[&_div:last-child]:pr-6">
                {[
                  {
                    name: "Olvi",
                    src: LOGOS.olvi,
                    className:
                      "h-10 w-auto object-contain mix-blend-multiply md:h-12",
                  },
                  {
                    name: "Sitowise",
                    src: LOGOS.sitowise,
                    className:
                      "h-6 w-auto object-contain mix-blend-multiply md:h-8",
                  },
                  {
                    name: "Technopolis",
                    src: LOGOS.technopolis,
                    className:
                      "h-6 w-auto object-contain mix-blend-multiply md:h-8",
                  },
                ].map((logo) => (
                  <div key={logo.name}>
                    <img
                      src={logo.src}
                      alt={logo.name}
                      className={logo.className}
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section
          className={`${wrap} grid grid-cols-1 gap-5 pt-8 pb-[60px] md:grid-cols-2 md:gap-6 md:pt-12 md:pb-24`}
          aria-label="The old way and the LEXIFY way"
        >
          <Reveal className="h-full">
            <article className="flex h-full flex-col rounded-[28px] border border-[#ababab] bg-[#ffffff] p-8 md:p-9">
              <p className="mb-5 text-md font-semibold uppercase tracking-[0.16em] text-gray-700">
                The old way
              </p>
              <p className="mb-3 font-headline text-[22px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#0b2744] md:text-[25px]">
                Buying legal services by email and phone — inefficient, slow,
                opaque
              </p>
              <p className="text-[15px] leading-[1.7] text-[#5b6e75] md:text-base">
                Finding the right firm for each legal need takes too long, so
                the choice often rests on familiarity rather than evidence of
                best fit. Each candidate firm has to be briefed separately, and
                each responds in its own format. Pricing is almost impossible to
                predict or compare.
              </p>
            </article>
          </Reveal>
          <Reveal className="h-full" delay={120}>
            <article className="flex h-full flex-col rounded-[28px] border border-[#11999e] bg-[#e7f6f6] p-8 md:p-9">
              <p className="mb-5 text-md font-semibold uppercase tracking-[0.16em] text-[#11999e]">
                The LEXIFY way
              </p>
              <p className="mb-3 font-headline text-[22px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#0b2744] md:text-[25px]">
                AI-assisted legal procurement — fast, transparent, effective.
              </p>
              <p className="text-[15px] leading-[1.7] text-[#5b6e75] md:text-base">
                Describe your legal need in your own words and Lexi AI turns it
                into a structured RFP for you to review and submit. Firms with
                the right expertise respond with offers in a standardised
                format. You compare expertise and pricing side by side and
                choose the best fit.
              </p>
            </article>
          </Reveal>
        </section>

        <section
          id="how-it-works"
          className="relative overflow-hidden bg-[#07192d] py-[60px] text-white md:py-20"
        >
          <WaveField />
          <div className={`relative ${wrap}`}>
            <Reveal>
              <div className="mb-12 text-center md:mb-16">
                <p className="mb-3 text-md font-semibold uppercase tracking-[0.18em] text-[#7fd3d6]">
                  How it works
                </p>
                <h2 className="mx-auto !max-w-none text-center text-white">
                  Three simple steps
                </h2>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 gap-12 pt-6 md:grid-cols-3 md:gap-16 md:pt-8">
              {[
                {
                  step: "1",
                  title: "Company posts an RFP",
                  description:
                    "Describe the legal need in your own words. Lexi AI turns it into a structured RFP, which you review before it goes out to firms with matching expertise.",
                  icon: ClipboardPlus,
                },
                {
                  step: "2",
                  title: "Law firms submit offers",
                  description:
                    "Firms with matching expertise respond with offers in a standardised format.",
                  icon: BadgeEuro,
                },
                {
                  step: "3",
                  title: "Company selects",
                  description:
                    "Compare the offers side by side and choose the best fit. Work begins with scope, pricing, and terms already aligned.",
                  icon: Handshake,
                },
              ].map((item, i) => (
                <Reveal
                  key={item.step}
                  className="relative h-full"
                  delay={i * 120}
                >
                  {i < 2 ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-[calc(100%+0.75rem)] z-0 hidden w-10 -translate-y-1/2 border-t border-dashed border-white/40 md:block"
                    />
                  ) : null}
                  <article className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.07] px-7 pb-8 pt-11 backdrop-blur-[2px]">
                    <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#11999e] text-sm font-semibold text-white">
                      {item.step}
                    </span>
                    <item.icon
                      className="mb-4 h-10 w-10 text-white/80"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                    <p className="mb-2 font-headline text-[17px] font-semibold leading-snug text-white">
                      {item.title}
                    </p>
                    <p className="text-sm leading-[1.7] text-[#b7c9d4]">
                      {item.description}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="meet-lexi"
          className="pb-11 pt-[60px] md:pb-[78px] md:pt-[100px]"
          aria-labelledby="lexi-title"
        >
          <div className={wrap}>
            <Reveal>
              <div className="max-w-[720px]">
                <h2 id="lexi-title">Meet Lexi — your AI assistant</h2>
                <p className={`mt-[21px] text-[17px] md:text-[19px] ${muted}`}>
                  Legal needs arrive in many shapes. Lexi knows how to help you
                  with all of them.
                </p>
              </div>
            </Reveal>
            <div
              className="mx-auto mt-8 max-w-[1056px] md:mt-[46px]"
              data-lexi-conversation
              aria-label="Example conversation with Lexi"
            >
              <div className="flex flex-col gap-2 md:gap-2.5">
                <LexiGreeting
                  className={`max-w-[92%] self-start transition-[opacity,transform] duration-300 motion-reduce:transform-none motion-reduce:duration-100 md:max-w-[80%] ${
                    visibleCount > 0
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  Hi! I&apos;m Lexi. What kind of legal help do you need?
                </LexiGreeting>
                <p className={bubbleClass(1)}>
                  Acquiring a business, need support from DD to closing
                </p>
                <p className={bubbleClass(2)}>
                  Contract dispute heading to district court
                </p>
                <p className={bubbleClass(3)}>
                  Refinancing our facility, need new loan documentation
                </p>
                <p className={bubbleClass(4)}>
                  Board wants a data protection audit
                </p>
                <p className={bubbleClass(5)}>
                  Planning a sale and leaseback on our logistics site
                </p>
                <p className={bubbleClass(6)}>
                  Change negotiations coming up, need counsel lined up
                </p>
              </div>
              <LexiGreeting
                className={`mt-[26px] max-w-[92%] self-start transition-[opacity,transform] duration-300 motion-reduce:transform-none motion-reduce:duration-100 md:mt-[35px] md:max-w-none ${
                  visibleCount > 7
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
                bubbleClassName="px-[14px] py-[11px] text-sm leading-[1.55] md:w-[510px] md:max-w-[510px] md:flex-none md:px-5 md:py-3 md:pl-[20px] md:pr-[20px] md:text-[22px] md:leading-[1.4] md:tracking-[-0.02em]"
              >
                I can help with all of these and more. Answer a few questions
                about the background and you&apos;ll have an RFP ready to review
                and post to vetted firms with the right expertise.
              </LexiGreeting>
            </div>
          </div>
        </section>

        <section
          id="for-companies"
          className="relative overflow-hidden bg-[#07192d] py-[60px] text-white md:py-24"
          aria-labelledby="company-title"
        >
          <WaveField />
          <div
            className={`relative ${wrap} grid grid-cols-1 gap-[38px] md:grid-cols-2 md:gap-[100px]`}
          >
            <Reveal>
              <p className="mb-5 text-md font-semibold uppercase tracking-[0.16em] text-[#7fd3d6] md:mb-6">
                For companies
              </p>
              <h2 id="company-title" className="max-w-[525px] text-white">
                Built for in-house teams and business leaders
              </h2>
              <p className="mt-6 max-w-[370px] text-[#b7c9d4] md:mt-[26px]">
                Everything you need to source legal services efficiently
              </p>
            </Reveal>
            <div>
              {[
                {
                  title: "Faster sourcing",
                  delay: 0,
                  body: (
                    <>
                      No more chasing quotes, writing emails, and explaining the
                      same matter to firm after firm. Describe the need once and
                      let the offers come to you.
                    </>
                  ),
                },
                {
                  title: "Predictable and transparent pricing",
                  delay: 80,
                  body: (
                    <>
                      Fixed-fee offers you can compare side by side, so you see
                      what the work will cost before you agree to it. Hourly
                      rates also available.
                    </>
                  ),
                },
                {
                  title: "Curated expertise",
                  delay: 160,
                  body: (
                    <>
                      Access premium, vetted law firms with the right expertise
                      for each legal need. Full-service firms and sector
                      specialists included.
                    </>
                  ),
                },
                {
                  title: "Free for companies",
                  delay: 240,
                  body: (
                    <>
                      No fees or charges. LEXIFY is completely free for
                      companies to use.
                    </>
                  ),
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={item.delay}>
                  <article
                    className={`border-t border-white/30 pt-[22px] md:pt-6 ${
                      i === 0 ? "mt-0" : "mt-[26px] md:mt-[29px]"
                    }`}
                  >
                    <h3 className="mb-[15px] text-[25px] text-white">
                      {item.title}
                    </h3>
                    <p className="text-[#b7c9d4]">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          className="relative overflow-hidden bg-[#07192d] pb-[42px] pt-0 text-white md:pb-[70px]"
          aria-label="Testimonial from Outi Raekivi"
        >
          <Reveal>
            <div
              className={`${wrap} grid grid-cols-1 gap-[27px] border-t border-white/30 pt-9 md:grid-cols-[1fr_2.3fr] md:gap-12 md:pt-[55px]`}
            >
              <div>
                <p className="text-base font-medium text-white">Outi Raekivi</p>
                <p className="mt-[3px] text-sm text-[#b7c9d4]">
                  CLO, Technopolis
                </p>
              </div>
              <blockquote className="text-white">
                &quot;LEXIFY&apos;s competitive procurement process is easy to
                use, efficient and transparent. We received multiple
                high-quality proposals within 24 hours, which enabled us to make
                a truly informed decision based on genuine comparison.&quot;
              </blockquote>
            </div>
          </Reveal>
        </section>

        <section
          id="for-firms"
          className={`${wrap} grid grid-cols-1 gap-[38px] py-[60px] md:grid-cols-2 md:gap-[100px] md:py-24`}
          aria-labelledby="firm-title"
        >
          <Reveal>
            <p className={eyebrow}>For law firms</p>
            <h2 id="firm-title" className="max-w-[525px]">
              A new way to meet clients who are ready to engage
            </h2>
            <p className={`mt-6 max-w-[370px] md:mt-[26px] ${muted}`}>
              Reach new clients beyond your network. Win work on expertise and
              merit.
            </p>
          </Reveal>
          <div>
            {[
              {
                title: "Business growth",
                body: "Direct access to vetted mid and large cap companies seeking legal services. Expand your client base and reach new market segments — without traditional business development costs.",
              },
              {
                title: "New opportunity channel",
                body: "Find qualified opportunities alongside your existing channels — a route to work you would not otherwise see.",
              },
              {
                title: "Faster proposals",
                body: "No bespoke proposal formats, no negotiating each client's own terms. Standardized process, common engagement terms, less time spent before the work starts.",
              },
              {
                title: "Pre-qualified clients",
                body: "Every company is vetted by LEXIFY before it can join and post RFPs. Only real clients with real matters.",
              },
              {
                title: "No upfront costs",
                body: "Monthly service fee applies only when you win work through the platform.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <article
                  className={`border-t border-[#b7c9d4] pt-[22px] md:pt-6 ${
                    i === 0 ? "mt-0" : "mt-[26px] md:mt-[29px]"
                  }`}
                >
                  <h3 className="mb-[15px] text-[25px]">{item.title}</h3>
                  <p className={muted}>{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section
          className="pb-[42px] pt-0 md:pb-[70px]"
          aria-label="Testimonial from Antti Pulkkinen"
        >
          <Reveal>
            <div
              className={`${wrap} grid grid-cols-1 gap-[27px] border-t border-[#b7c9d4] pt-9 md:grid-cols-[1fr_2.3fr] md:gap-12 md:pt-[55px]`}
            >
              <div>
                <p className="text-base font-medium text-[#0b2744]">
                  Antti Pulkkinen
                </p>
                <p className={`mt-[3px] text-sm ${muted}`}>
                  Partner, Magnusson
                </p>
              </div>
              <blockquote className="text-[#0b2744]">
                &quot;LEXIFY gives us access to clients we might not otherwise
                reach, and allows us to compete on the strength of our
                expertise. The platform is straightforward to use, the process
                is efficient, and it connects us with decision-makers who are
                ready to engage and value quality counsel.&quot;
              </blockquote>
            </div>
          </Reveal>
        </section>

        <section
          id="about"
          className="relative overflow-hidden bg-[#07192d] py-[60px] text-white md:py-24"
          aria-labelledby="about-title"
        >
          <WaveField />
          <div className={`relative ${wrap}`}>
            <div className="grid grid-cols-1 items-start gap-[38px] md:grid-cols-2 md:gap-[100px]">
              <Reveal>
                <p className="mb-5 text-md font-semibold uppercase tracking-[0.16em] text-[#7fd3d6] md:mb-6">
                  About
                </p>
                <h2 id="about-title" className="max-w-[525px] text-white">
                  Built by people who understand both sides
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p
                  className="mb-5 hidden text-md font-semibold uppercase tracking-[0.16em] md:mb-6 md:block"
                  aria-hidden="true"
                >
                  &nbsp;
                </p>
                <p className="text-[17px] text-[#b7c9d4] md:text-lg">
                  LEXIFY's founding team brings over 45 years of combined legal
                  experience from both corporate legal departments and leading
                  law firms. Our platform is built by legal professionals to
                  serve companies and law firms equally.
                </p>
              </Reveal>
            </div>

            <div className="mt-[38px] border-t border-white/20 pt-9 md:mt-16 md:pt-[55px]">
              <div className="grid grid-cols-2 items-stretch gap-x-5 gap-y-10 md:grid-cols-4 md:gap-10">
                {FOUNDERS.map((founder, i) => (
                  <Reveal key={founder.name} delay={i * 80} className="h-full">
                    <article className="flex h-full flex-col">
                      <a
                        href={founder.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-[4/5] overflow-hidden bg-[#5c6b76]"
                        aria-label={`${founder.name} on LinkedIn`}
                      >
                        <img
                          src={founder.photo}
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                      </a>
                      <div className="mt-2.5 flex flex-1 flex-col">
                        <a
                          href={founder.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-white/80"
                        >
                          <h3 className="text-[25px] text-white md:text-[26px]">
                            {founder.name}
                          </h3>
                        </a>
                        <p className="mt-1 text-base leading-snug text-[#b7c9d4]">
                          {founder.role}
                        </p>
                        <a
                          href={founder.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#7fd3d6] hover:text-white"
                        >
                          <svg
                            className="h-4 w-4 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          LinkedIn
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`${wrap} py-[60px] md:py-24`}
          aria-labelledby="closing-title"
        >
          <Reveal>
            <div className="flex flex-col items-center gap-[38px] md:flex-row md:justify-center md:gap-40">
              <div className="flex w-fit max-w-full flex-col items-center">
                <h2 id="closing-title" className="!max-w-none">
                  Ready to get started?
                </h2>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-white bg-[#11999e] px-7 py-3 text-base font-semibold text-white transition-colors hover:border-[#11999e] hover:bg-white hover:text-[#11999e]"
                >
                  Join LEXIFY
                </Link>
              </div>
              <div className="flex w-fit max-w-full flex-col items-center">
                <h2 className="!max-w-none md:whitespace-nowrap">
                  Have questions?
                </h2>
                <DemoButton
                  className="mt-8 !min-h-[52px] !px-7 !text-base"
                  variant="outline"
                  onClick={openDemo}
                />
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="bg-[#11999e] pt-[42px] text-white md:pt-[65px]">
        <div className={wrap}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.25fr_0.8fr_0.9fr_1fr] md:gap-10">
            <div className="col-span-2 md:col-span-1">
              <a href="#" aria-label="LEXIFY home">
                <img
                  src={LOGOS.lexifyNav}
                  alt="LEXIFY"
                  className="h-16 w-auto object-contain object-left md:h-20"
                />
              </a>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase leading-[1.6] tracking-[0.16em] text-white/80 md:mb-6">
                Product
              </h4>
              <a
                href="#how-it-works"
                className="mb-[9px] block text-sm text-white hover:text-white/80"
              >
                How it works
              </a>
              <a
                href="#for-companies"
                className="mb-[9px] block text-sm text-white hover:text-white/80"
              >
                For companies
              </a>
              <a
                href="#for-firms"
                className="mb-[9px] block text-sm text-white hover:text-white/80"
              >
                For law firms
              </a>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase leading-[1.6] tracking-[0.16em] text-white/80 md:mb-6">
                Legal
              </h4>
              <a
                href="/docs/lexify-general-privacy-statement.pdf"
                className="mb-[9px] block text-sm text-white hover:text-white/80"
              >
                Privacy Policy
              </a>
              <a
                href="/docs/lexify-tos-september-2026.pdf"
                className="mb-[9px] block text-sm text-white hover:text-white/80"
              >
                Terms of Service
              </a>
            </div>
            <div className="col-span-2 md:col-span-1">
              <a
                href="https://www.linkedin.com/company/lexify-online/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex max-w-[260px] items-center gap-2.5 border-b border-white/30 pb-2.5 text-sm text-white hover:text-white/80"
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Follow us on LinkedIn <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="mt-[30px] flex items-center justify-between gap-4 border-t border-white/20 py-6 md:mt-[58px]">
            <p className="text-xs text-white/70">
              © 2026 Lexify Oy. All rights reserved.
            </p>
            <p className="text-xs text-white/70">Helsinki, Finland</p>
          </div>
        </div>
      </footer>

      {demoModalOpen && (
        <DemoModal
          formData={formData}
          formSubmitted={formSubmitted}
          isSubmitting={isSubmitting}
          submitError={submitError}
          orgLabel={orgLabel}
          availability={availability}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onClose={closeDemo}
        />
      )}
    </div>
  );
};

export default LexifyLanding;
