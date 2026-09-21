"use client";

export default function CheckboxOptionCards({
  options,
  selected = [],
  onToggle,
  field = "areaboxes",
  otherValue,
  onOtherChange,
  otherName = "otherArea",
}) {
  return (
    <div className="space-y-3" data-field={field}>
      {options.map((option) => {
        const value = typeof option === "string" ? option : option.value;
        const label = typeof option === "string" ? option : option.title;
        const checked = selected.includes(value);
        return (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
              checked
                ? "border-[#11999e] bg-[#f3fbfb]"
                : "border-gray-200 hover:border-[#11999e]/40"
            }`}
          >
            <input
              type="checkbox"
              value={value}
              checked={checked}
              onChange={() => onToggle(value)}
              className="mt-1 accent-[#11999e]"
            />
            <span className="font-semibold text-gray-900">{label}</span>
          </label>
        );
      })}
      {selected.includes("Other") || selected.includes("Other:") ? (
        <input
          type="text"
          name={otherName}
          placeholder="Please specify"
          className="w-full rounded-lg border border-gray-200 p-3 text-gray-900"
          value={otherValue || ""}
          onChange={onOtherChange}
        />
      ) : null}
    </div>
  );
}
