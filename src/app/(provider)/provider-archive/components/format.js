export function isHourlyRate(paymentRate) {
  return String(paymentRate || "")
    .toLowerCase()
    .includes("hourly");
}

export function fmtMoney(num, suffix = "€") {
  if (typeof num !== "number") return "—";
  return `${num.toLocaleString("fi-FI").replace(/\s/g, " ")} ${suffix}`;
}

export function formatTimeUntilForOffer(offer) {
  if (!offer) return "";

  const state = (offer.requestState || offer.requestStatus || "")
    .toString()
    .trim()
    .toUpperCase();

  const selectedOfferId =
    offer.selectedOfferId == null ? null : Number(offer.selectedOfferId);
  const offerId = offer.offerId == null ? null : Number(offer.offerId);
  const isSelectedInConflictCheck =
    state === "CONFLICT_CHECK" &&
    selectedOfferId != null &&
    offerId != null &&
    selectedOfferId === offerId;

  if (isSelectedInConflictCheck) {
    return "Expired. Awaiting Conflict Check.";
  }

  if (state === "ON HOLD" || state === "CONFLICT_CHECK") {
    return "Expired. Awaiting Winning Offer Selection.";
  }

  if (!offer.dateExpired) return "";

  const end = new Date(offer.dateExpired).getTime();
  if (Number.isNaN(end)) return "";

  const diffMs = end - Date.now();
  if (diffMs <= 0) return "Expired. Awaiting Winning Offer Selection.";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0 && hours > 0)
    return `${days} day${days !== 1 ? "s" : ""} ${hours} hour${
      hours !== 1 ? "s" : ""
    }`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export function sortGeneric(arr, key, dir) {
  const copy = [...arr];
  copy.sort((a, b) => {
    let va = a[key],
      vb = b[key];

    if (key === "offerSubmissionDate" || key === "contractDate") {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else if (key === "offeredPrice" || key === "contractPrice") {
      va = typeof va === "number" ? va : -Infinity;
      vb = typeof vb === "number" ? vb : -Infinity;
    } else if (key === "deadline") {
      const deadlineValue = (row) => {
        const state = (row.requestState || row.requestStatus || "")
          .toString()
          .trim()
          .toUpperCase();

        if (state === "CONFLICT_CHECK") {
          return row.selectedOfferId === row.offerId ? -2 : -1;
        }

        if (state === "ON HOLD") {
          return -1;
        }

        return row.dateExpired
          ? new Date(row.dateExpired).getTime() - Date.now()
          : -Infinity;
      };

      va = deadlineValue(a);
      vb = deadlineValue(b);
    } else {
      va = (va ?? "").toString().toLowerCase();
      vb = (vb ?? "").toString().toLowerCase();
    }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}
