export const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => (password || "").length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password || ""),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password || ""),
  },
  {
    id: "special",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9\s]/.test(password || ""),
  },
];

export function getPasswordRequirementResults(password) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}

export function validateNewPassword(password) {
  const unmet = getPasswordRequirementResults(password).filter(
    (requirement) => !requirement.met,
  );
  if (unmet.length === 0) return null;
  return `New password must include: ${unmet
    .map((requirement) => requirement.label.toLowerCase())
    .join(", ")}`;
}
