import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { subdomain } = await request.json();

    if (!subdomain) {
      return NextResponse.json(
        { valid: false, message: "Subdomain is required" },
        { status: 400 }
      );
    }

    // Basic validation
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json({
        valid: false,
        message:
          "Subdomain can only contain lowercase letters, numbers, and hyphens",
      });
    }

    if (subdomain.length < 3) {
      return NextResponse.json({
        valid: false,
        message: "Subdomain must be at least 3 characters long",
      });
    }

    if (subdomain.length > 63) {
      return NextResponse.json({
        valid: false,
        message: "Subdomain must be less than 63 characters",
      });
    }

    // Check if subdomain exists in database (only for completed payments)
    const existingPanel = await prisma.panel.findFirst({
      where: {
        subdomain,
        paymentStatus: "COMPLETED",
      },
    });

    if (existingPanel) {
      return NextResponse.json({
        valid: false,
        message: "This subdomain is already taken",
      });
    }

    return NextResponse.json({
      valid: true,
      message: "Subdomain is available",
    });
  } catch (error) {
    console.error("Error checking subdomain:", error);
    return NextResponse.json(
      { valid: false, message: "Failed to check subdomain availability" },
      { status: 500 }
    );
  }
}
