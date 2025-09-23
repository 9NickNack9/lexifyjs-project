// src/app/(purchaser)/archive/utils/format.js

export function formatTimeUntil(expiryISO) {
  const now = new Date();
  const expiry = new Date(expiryISO);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"}`;
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

export function fmtMoney(num, currencyLabel) {
  if (typeof num !== "number") return "N/A";
  return `${num.toLocaleString()} ${currencyPrefix(currencyLabel)}`;
}
