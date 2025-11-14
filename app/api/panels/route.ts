import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
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
    const {
      name,
      subdomain,
      customDomain,
      ownerEmail,
      ownerPhone,
      ownerName,
      userId,
    } = await request.json();

    // Validate required fields
    if (!name || !subdomain || !ownerEmail || !ownerPhone) {
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

    // Note: We allow duplicate subdomains for unpaid panels
    // Uniqueness is enforced only for completed payments

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          phone: ownerPhone,
        },
      });
    }

    const panel = await prisma.panel.create({
      data: {
        name,
        subdomain,
        customDomain: customDomain || null,
        ownerEmail,
        ownerPhone,
        ownerName,
        status: "active",
        userId: user.id,
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
