import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  createLegalPanelGroupId,
  findLegalPanelGroup,
  normalizeLegalPanelGroups,
  uniqueProviderNames,
} from "@/lib/legalPanel";

async function loadGroups(userPkId) {
  const me = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: { legalPanelServiceProviders: true },
  });
  return normalizeLegalPanelGroups(me?.legalPanelServiceProviders);
}

async function saveGroups(userPkId, groups) {
  const next = normalizeLegalPanelGroups(groups);
  await prisma.userAccount.update({
    where: { userPkId },
    data: { legalPanelServiceProviders: next },
  });
  return next;
}

function jsonOk(groups) {
  return NextResponse.json({
    ok: true,
    legalPanelGroups: groups,
    legalPanelServiceProviders: groups,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await loadGroups(BigInt(session.userId));
  return jsonOk(groups);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const userPkId = BigInt(session.userId);
  const groups = await loadGroups(userPkId);
  const nameKey = name.toLowerCase();
  if (groups.some((group) => group.name.toLowerCase() === nameKey)) {
    return NextResponse.json(
      { error: "A legal panel group with this name already exists." },
      { status: 400 },
    );
  }

  const providers = uniqueProviderNames(body?.providers);
  const next = [
    ...groups,
    {
      id: createLegalPanelGroupId(),
      name,
      providers,
    },
  ];

  return jsonOk(await saveGroups(userPkId, next));
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = (body?.id || "").trim();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const userPkId = BigInt(session.userId);
  const groups = await loadGroups(userPkId);
  const current = findLegalPanelGroup(groups, id);
  if (!current) {
    return NextResponse.json(
      { error: "Legal panel group not found." },
      { status: 404 },
    );
  }

  const nextName =
    typeof body?.name === "string" ? body.name.trim() : current.name;
  if (!nextName)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const nameKey = nextName.toLowerCase();
  if (
    groups.some(
      (group) => group.id !== current.id && group.name.toLowerCase() === nameKey,
    )
  ) {
    return NextResponse.json(
      { error: "A legal panel group with this name already exists." },
      { status: 400 },
    );
  }

  let nextProviders = current.providers;
  if (Array.isArray(body?.companyNames)) {
    const incoming = uniqueProviderNames(body.companyNames);
    if (incoming.length === 0) {
      return NextResponse.json(
        { error: "Select at least one provider." },
        { status: 400 },
      );
    }
    nextProviders = uniqueProviderNames([...current.providers, ...incoming]);
  } else if (Array.isArray(body?.providers)) {
    nextProviders = uniqueProviderNames(body.providers);
  } else if (typeof body?.companyName === "string" && body.companyName.trim()) {
    const companyName = body.companyName.trim();
    if (
      current.providers.some(
        (name) => name.toLowerCase() === companyName.toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: "Provider is already in this legal panel group." },
        { status: 400 },
      );
    }
    nextProviders = uniqueProviderNames([...current.providers, companyName]);
  }

  const next = groups.map((group) =>
    group.id === current.id
      ? { ...group, name: nextName, providers: nextProviders }
      : group,
  );

  return jsonOk(await saveGroups(userPkId, next));
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  const companyName = (searchParams.get("companyName") || "").trim();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const userPkId = BigInt(session.userId);
  const groups = await loadGroups(userPkId);
  const current = findLegalPanelGroup(groups, id);
  if (!current) {
    return NextResponse.json(
      { error: "Legal panel group not found." },
      { status: 404 },
    );
  }

  let next;
  if (companyName) {
    next = groups.map((group) =>
      group.id === current.id
        ? {
            ...group,
            providers: group.providers.filter(
              (name) => name.toLowerCase() !== companyName.toLowerCase(),
            ),
          }
        : group,
    );
  } else {
    next = groups.filter((group) => group.id !== current.id);
  }

  return jsonOk(await saveGroups(userPkId, next));
}
