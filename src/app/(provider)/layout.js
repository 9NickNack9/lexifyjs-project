// app/(provider)/layout.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function ProviderLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["PROVIDER", "ADMIN"].includes(session.role)) redirect("/login");
  return <>{children}</>;
}
