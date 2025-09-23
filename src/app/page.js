// src/app/page.js
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Not logged in -> /login
  if (!session) {
    redirect("/login");
  }

  // Logged in -> route by role
  if (session.role === "PROVIDER") {
    redirect("/provider");
  }

  // Purchaser or Admin
  redirect("/main");
}
