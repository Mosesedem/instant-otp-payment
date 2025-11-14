import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type AuthSession = Awaited<ReturnType<typeof auth>>;

function getSessionUserId(session: AuthSession): string | null {
  const id = (session?.user as { id?: unknown } | undefined)?.id;
  return typeof id === "string" ? id : null;
}

export async function GET(_request: Request) {
  try {
    const session = await auth();

    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const panels = await prisma.panel.findMany({
      where: {
        userId,
      },
      include: {
        domains: {
          select: {
            id: true,
            domain: true,
            verificationStatus: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            reference: true,
            type: true,
            checkoutUrl: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ panels }, { status: 200 });
  } catch (error) {
    console.error("[v0] Error fetching panels:", error);
    return NextResponse.json(
      { error: "Failed to fetch panels" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    console.log(
      "[v0] Session in POST /api/panels:",
      JSON.stringify(session, null, 2)
    );

    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - No user ID in session" },
        { status: 401 }
      );
    }

    const { name, subdomain, customDomain, ownerEmail, ownerPhone } =
      await request.json();

    // Validate required fields
    if (!name || !subdomain || !ownerEmail || !ownerPhone || !customDomain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: "Invalid subdomain format" },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingPanel = await prisma.panel.findUnique({
      where: { subdomain },
    });

    if (existingPanel) {
      return NextResponse.json(
        { error: "Subdomain already exists" },
        { status: 409 }
      );
    }

    const panel = await prisma.panel.create({
      data: {
        name,
        subdomain,
        customDomain: customDomain || null,
        ownerEmail,
        ownerPhone,
        status: "active",
        userId,
        domains: customDomain
          ? {
              create: {
                domain: customDomain,
                verificationStatus: "pending",
              },
            }
          : undefined,
      },
      include: {
        domains: true,
      },
    });

    return NextResponse.json({ panel }, { status: 201 });
  } catch (error) {
    console.error("[v0] Error creating panel:", error);
    return NextResponse.json(
      { error: "Failed to create panel" },
      { status: 500 }
    );
  }
}
