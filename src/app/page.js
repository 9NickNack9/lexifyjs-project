// src/app/page.js
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Import your landing page component (client component is fine to render from a server component)
import LexifyLanding from "@/app/components/LexifyLanding";
// ^ adjust this import path to where the landing component lives

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Not logged in -> show landing page at "/"
  if (!session) {
    return <LexifyLanding />;
  }

  // Logged in -> route by role
  if (session.role === "PROVIDER") {
    redirect("/provider");
  }

  // Purchaser or Admin
  redirect("/main");
}
