import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.userId;

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, sharedUsers } = await req.json();

  if (!requestId || !Array.isArray(sharedUsers)) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { requestId },
  });

  if (!request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const currentDetails = request.details || {};

  await prisma.request.update({
    where: { requestId },
    data: {
      details: {
        ...currentDetails,
        sharedAccounts: sharedUsers,
      },
    },
  });

  return Response.json({ success: true });
}
