export function isProviderSidePath(pathname) {
  if (!pathname) return false;
  return (
    pathname === "/provider" ||
    pathname.startsWith("/provider/") ||
    pathname.startsWith("/provider-") ||
    pathname.startsWith("/make-offer")
  );
}
