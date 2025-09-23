// app/main/page.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MainClient from "./MainClient";

export default async function MainPage() {
  const session = await getServerSession(authOptions);

  // Not logged in? or wrong role? → bounce to /login
  if (!session) redirect("/login");
  if (!["PURCHASER", "ADMIN"].includes(session.role)) redirect("/login");

  // Passed the guard → render client UI
  return <MainClient />;
}
