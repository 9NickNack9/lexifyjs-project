import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  const currentUserId = session?.userId;

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.userAccount.findUnique({
    where: { userPkId: Number(currentUserId) },
    select: {
      companyId: true,
      company: {
        select: {
          companyName: true,
        },
      },
    },
  });

  if (!currentUser?.companyId) {
    return Response.json([]);
  }

  const users = await prisma.userAccount.findMany({
    where: {
      companyId: currentUser.companyId,
      NOT: {
        userPkId: Number(currentUserId),
      },
    },
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
    },
  });

  return Response.json({
    users: users.map((u) => ({
      userPkId: Number(u.userPkId),
      fullName: `${u.firstName} ${u.lastName}`,
    })),
    companyName: currentUser.company?.companyName || "",
  });
}
