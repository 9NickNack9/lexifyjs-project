export function buildReferralRegisterUrl(referralToken) {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.lexify.online";

  return `${baseUrl.replace(/\/$/, "")}/register?ref=${encodeURIComponent(referralToken)}`;
}
