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

    // Check if Vercel API is configured
    if (!process.env.VERCEL_API_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Vercel API not configured. Please add VERCEL_API_TOKEN environment variable.",
        },
        { status: 503 }
      );
    }

    const vercel = new VercelAPI();

    // Add domain to Vercel
    const vercelDomain = await vercel.addDomain({
      name: domain,
      projectId: projectId || process.env.VERCEL_PROJECT_ID,
    });

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
        vercelDomainId: domain,
      },
    });

    // Update panel with Vercel project ID
    if (projectId) {
      await prisma.panel.update({
        where: { id: panelId },
        data: { vercelProjectId: projectId },
      });
    }

    return NextResponse.json(
      {
        success: true,
        domain: vercelDomain,
        message: vercelDomain.verified
          ? "Domain verified successfully"
          : "Domain added, verification pending",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error adding domain to Vercel:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add domain to Vercel",
      },
      { status: 500 }
    );
  }
}
