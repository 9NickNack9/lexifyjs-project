import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const idStr = session?.userId;
  const role = session?.role;
  if (!idStr || !role) return null;
  return { userId: BigInt(idStr), role };
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return null; // not admin
  }
  return session;
}
