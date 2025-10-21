export function fmtMoney(value, currency = "EUR") {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

export function formatTimeUntil(deadline) {
  const end = parseDeadline(deadline);
  if (!end) return "";

  const now = new Date();
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return "";

  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`; // never empty for future times
}

export function currencyPrefix(label) {
  if (!label) return "";
  const l = label.toLowerCase();
  if (l.includes("euro")) return "€";
  if (l.includes("krona") || l.includes("krone")) return "kr";
  if (l.includes("forint")) return "Ft";
  if (l.includes("złoty")) return "zł";
  if (l.includes("koruna")) return "Kč";
  if (l.includes("leu")) return "Leu";
  if (l.includes("lev")) return "лв";
  return label;
}

export function parseDeadline(input) {
  if (!input) return null;

  // Already a Date
  if (input instanceof Date) return isNaN(input) ? null : input;

  // Milliseconds timestamp
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d) ? null : d;
  }

  // Strings
  if (typeof input === "string") {
    let s = input.trim();
    // Handle "YYYY-MM-DD HH:mm" -> "YYYY-MM-DDTHH:mm"
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      s = s.replace(" ", "T");
    }
    // Try native parse (handles "…Z" perfectly)
    let d = new Date(s);
    if (!isNaN(d)) return d;

    // If missing timezone, try assuming UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      d = new Date(s + "Z");
      if (!isNaN(d)) return d;
    }
  }

  return null;
}
