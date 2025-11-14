import { NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { valid: false, message: "Domain is required" },
        { status: 400 }
      );
    }

    // Basic domain format validation
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { valid: false, message: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Check if domain already exists in database (only for completed payments)
    const existingPanelWithDomain = await prisma.panel.findFirst({
      where: {
        OR: [{ customDomain: domain }, { domain: domain }],
        paymentStatus: PaymentStatus.COMPLETED,
      },
    });

    if (existingPanelWithDomain) {
      return NextResponse.json(
        {
          valid: false,
          message: "This domain is already in use by another panel",
        },
        { status: 200 }
      );
    }

    // Check if domain resolves (has DNS records)
    let hasRecords = false;
    let recordType = "";

    try {
      // Try A record
      const aRecords = await resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        hasRecords = true;
        recordType = "A";
      }
    } catch (err) {
      // A record not found, try CNAME
      try {
        const cnameRecords = await resolveCname(domain);
        if (cnameRecords && cnameRecords.length > 0) {
          hasRecords = true;
          recordType = "CNAME";
        }
      } catch (cnameErr) {
        // No records found
      }
    }

    if (!hasRecords) {
      return NextResponse.json(
        {
          valid: true,
          message: "Domain is a valid format but has no DNS records",
        },
        { status: 200 }
      );
    }

    // Domain is valid and has DNS records
    return NextResponse.json(
      {
        valid: true,
        message: `Domain is valid and already in use. (${recordType} record found)`,
        recordType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Domain verification error:", error);
    return NextResponse.json(
      {
        valid: false,
        message: "Failed to verify domain",
      },
      { status: 500 }
    );
  }
}
