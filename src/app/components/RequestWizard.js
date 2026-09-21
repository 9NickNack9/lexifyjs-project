"use client";

import { HubShell } from "@/app/components/HubPage";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";

export default function RequestWizard({
  title = "Create your LEXIFY Request",
  subtitle = "Provide a few details so we can connect you with the right legal experts.",
  categoryLabel,
  steps,
  currentStep,
  onStepClick,
  onNext,
  onBack,
  onCancel,
  nextLabel = "Next",
  nextDisabled = false,
  headerAction,
  error,
  children,
}) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <HubShell>
      <div className="overflow-hidden rounded-2xl bg-white text-gray-900 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-6 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 3.75h7.5L19.5 8.75V20.25A1.5 1.5 0 0 1 18 21.75H7A1.5 1.5 0 0 1 5.5 20.25V5.25A1.5 1.5 0 0 1 7 3.75Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.5 3.75V8.75H19.5M8.5 12.75h7M8.5 16.25h7"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              {categoryLabel ? (
                <p className="mt-1 text-sm font-medium text-[#11999e]">
                  {categoryLabel}
                </p>
              ) : null}
            </div>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>

        <div className="flex flex-col md:flex-row">
          <aside className="border-b border-gray-100 bg-[#f8fbfb] px-6 py-6 md:w-64 md:shrink-0 md:overflow-x-visible md:border-b-0 md:border-r lg:w-72">
            <ol className="flex gap-3 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible">
              {steps.map((item, index) => {
                const active = index === currentStep;
                const complete = index < currentStep;
                const clickable = typeof onStepClick === "function";

                return (
                  <li key={item.id} className="relative flex md:block">
                    {index < steps.length - 1 ? (
                      <span
                        className="pointer-events-none absolute left-4 top-8 hidden h-[calc(100%-0.5rem)] w-px border-l border-dashed border-gray-300 md:block"
                        aria-hidden="true"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => clickable && onStepClick(index)}
                      disabled={!clickable}
                      className={`relative z-10 flex items-center gap-3 rounded-lg px-1 py-2 text-left md:w-full ${
                        clickable ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          active
                            ? "bg-[#0f7f84] text-white"
                            : complete
                              ? "bg-[#11999e] text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {complete ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 5.29a.75.75 0 0 1 .006 1.06l-7.25 7.333a.75.75 0 0 1-1.072-.006L3.29 8.54a.75.75 0 1 1 1.06-1.061l4.04 4.04 6.714-6.79a.75.75 0 0 1 1.06-.006Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`whitespace-nowrap text-sm ${
                          active
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-400"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
            {step?.title ? (
              <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-gray-900">
                <span>
                  {currentStep + 1}. {step.title}
                </span>
                {step.tooltip ? (
                  <QuestionMarkTooltip tooltipText={step.tooltip} />
                ) : null}
              </h2>
            ) : null}

            <div className="min-h-[280px]">{children}</div>

            {error ? (
              <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
            ) : null}

            <div className="mt-8 flex items-center justify-end gap-4 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#11999e] hover:text-[#0d7e82]"
              >
                Leave without saving
              </button>
              {!isFirstStep ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#11999e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d7e82] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nextLabel}
                {!isLastStep ? <span aria-hidden="true">→</span> : null}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-[#11999e]"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 1.75a4.75 4.75 0 0 0-4.75 4.75v1.094c-1.34.312-2.25 1.56-2.25 3.031v4.25c0 1.657 1.343 3 3 3h8c1.657 0 3-1.343 3-3v-4.25c0-1.47-.91-2.72-2.25-3.03V6.5A4.75 4.75 0 0 0 10 1.75Zm3.25 4.75V6.5a3.25 3.25 0 1 0-6.5 0v.094h6.5Z"
            clipRule="evenodd"
          />
        </svg>
        Your information is secure and your completed LEXIFY Request will only
        be shared with legal service providers eligible to submit offers.
      </p>
    </HubShell>
  );
}
