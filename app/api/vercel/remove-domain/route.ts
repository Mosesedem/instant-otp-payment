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

    // Remove domain from Vercel
    await vercel.removeDomain(
      domain,
      projectId || process.env.VERCEL_PROJECT_ID || ""
    );

    // Delete domain record from database
    await prisma.domain.delete({
      where: {
        panelId_domain: {
          panelId,
          domain,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Domain removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error removing domain from Vercel:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove domain from Vercel",
      },
      { status: 500 }
    );
  }
}
