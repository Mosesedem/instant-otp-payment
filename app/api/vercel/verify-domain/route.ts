import { NextResponse } from "next/server";
import { VercelAPI } from "@/lib/vercel";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { panelId, domain, projectId } = await request.json();

    if (!panelId || !domain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!process.env.VERCEL_API_TOKEN) {
      return NextResponse.json(
        { error: "Vercel API not configured" },
        { status: 503 }
      );
    }

    const vercel = new VercelAPI();

    // Verify domain with Vercel
    const vercelDomain = await vercel.verifyDomain(
      domain,
      projectId || process.env.VERCEL_PROJECT_ID || ""
    );

    // Update domain record in database
    await prisma.domain.update({
      where: {
        panelId_domain: {
          panelId,
          domain,
        },
      },
      data: {
        verificationStatus: vercelDomain.verified ? "verified" : "pending",
        dnsRecords: vercelDomain.verification || [],
      },
    });

    return NextResponse.json(
      {
        success: true,
        verified: vercelDomain.verified,
        domain: vercelDomain,
        message: vercelDomain.verified
          ? "Domain verified successfully"
          : "Domain verification pending",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error verifying domain with Vercel:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify domain with Vercel",
      },
      { status: 500 }
    );
  }
}
