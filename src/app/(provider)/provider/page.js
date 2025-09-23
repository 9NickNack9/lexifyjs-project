// app/main/page.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ProviderClient from "./ProviderClient";

export default async function ProviderPage() {
  const session = await getServerSession(authOptions);

  // Not logged in? or wrong role? → bounce to /login
  if (!session) redirect("/login");
  if (!["PROVIDER", "ADMIN"].includes(session.role)) redirect("/login");

  // Passed the guard → render client UI
  return <ProviderClient />;
}
