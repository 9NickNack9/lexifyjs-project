export default function SummaryRow({ label, value }) {
  const items = Array.isArray(value)
    ? value
        .flat(Infinity)
        .map((item) => (item == null ? "" : String(item).trim()))
        .filter(Boolean)
    : null;

  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-gray-500">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap text-gray-900">
        {items ? (
          items.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {items.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            "—"
          )
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}
