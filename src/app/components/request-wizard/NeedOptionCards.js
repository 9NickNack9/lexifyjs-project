"use client";

import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";

export function NeedIcon({ type }) {
  const className = "h-5 w-5";
  if (type === "review") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5 4.75 6.75v5.4c0 4.05 2.95 7.85 7.25 8.85 4.3-1 7.25-4.8 7.25-8.85v-5.4L12 3.5Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (type === "search") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.2 16.2 5.3 5.3"
        />
      </svg>
    );
  }
  if (type === "kyc") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.25 8.25h13.25A1.5 1.5 0 0 1 18 9.75v9A1.5 1.5 0 0 1 16.5 20.25H3.25A1.5 1.5 0 0 1 1.75 18.75v-9A1.5 1.5 0 0 1 3.25 8.25Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.15 11.35a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.7 18.15c.35-1.85 1.25-2.85 2.45-2.85s2.1 1 2.45 2.85"
        />
        <path strokeLinecap="round" d="M12.15 12.7h3.7M12.15 15.5h2.7" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.6 3.4 21.15 5.3v4c0 2.45-1.7 4.7-4.55 5.35-2.85-.65-4.55-2.9-4.55-5.35v-4L16.6 3.4Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m14.55 9.15 1.45 1.45 2.7-2.7"
        />
      </svg>
    );
  }
  if (type === "comments") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 18.5 4.5 21V7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 18H7.5Z"
        />
        <path strokeLinecap="round" d="M8.5 10h7M8.5 13.5h4.5" />
      </svg>
    );
  }
  if (type === "empty") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
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
          d="M14.5 3.75V8.75H19.5"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
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
        d="M14.5 3.75V8.75H19.5M8.5 12.75h7M8.5 16.25h5"
      />
    </svg>
  );
}

export default function NeedOptionCards({
  options,
  name = "need",
  value,
  onChange,
  field = "need",
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="space-y-3" data-field={field}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
              selected
                ? "border-[#11999e] bg-[#f3fbfb]"
                : "border-gray-200 hover:border-[#11999e]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={onChange}
              className="mt-1 accent-[#11999e]"
            />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f5f5] text-[#11999e]">
              <NeedIcon type={option.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{option.title}</p>
              {option.pricing ? (
                <p className="mt-0.5 text-sm text-gray-500">{option.pricing}</p>
              ) : null}
            </div>
            {option.tooltip ? (
              <QuestionMarkTooltip tooltipText={option.tooltip} />
            ) : null}
          </label>
        );
      })}
      {selectedOption?.note ? (
        <div className="mt-4 flex gap-3 rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
          <p>
            <strong>NOTE: </strong>
            {selectedOption.note}
          </p>
        </div>
      ) : null}
    </div>
  );
}
