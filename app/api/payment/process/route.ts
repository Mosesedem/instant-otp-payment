import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, PaymentType } from "@prisma/client";

interface PanelPaymentRequest {
  userId: string;
  panelName: string;
  subdomain: string;
  customDomain?: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: "monthly" | "annual";
  method: "etegram" | "paystack";
  callbackUrl?: string;
}

// Generate unique payment reference
const generateReference = (method: "etegram" | "paystack") => {
  const prefix = method === "etegram" ? "ETG" : "PSK";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export async function POST(request: NextRequest) {
  try {
    const body: PanelPaymentRequest = await request.json();

    // Validate payment request
    if (
      !body.userId ||
      !body.panelName ||
      !body.subdomain ||
      !body.ownerEmail ||
      !body.ownerPhone ||
      !body.plan ||
      !body.method
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(body.subdomain)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subdomain format",
        },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingPanel = await prisma.panel.findFirst({
      where: { subdomain: body.subdomain },
    });

    if (existingPanel) {
      return NextResponse.json(
        {
          success: false,
          error: "Subdomain already exists",
        },
        { status: 409 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: body.ownerEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: body.ownerEmail,
          name: body.panelName,
          phone: body.ownerPhone,
        },
      });
    }

    // Create panel
    const panel = await prisma.panel.create({
      data: {
        name: body.panelName,
        subdomain: body.subdomain,
        customDomain: body.customDomain || null,
        ownerEmail: body.ownerEmail,
        ownerPhone: body.ownerPhone,
        ownerName: body.panelName,
        status: "pending",
        userId: user.id,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // Calculate payment amount
    const setupFee = 15000;
    const serviceFee = body.plan === "annual" ? 60000 : 5000;
    const totalAmount = setupFee + serviceFee;

    // Generate unique reference
    const reference = generateReference(body.method);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        panelId: panel.id,
        amount: totalAmount,
        currency: "NGN",
        type:
          body.plan === "annual"
            ? PaymentType.ANNUAL_SUBSCRIPTION
            : PaymentType.MONTHLY_SUBSCRIPTION,
        status: PaymentStatus.PENDING,
        reference,
        paymentMethod: body.method,
        provider: body.method,
        externalId: reference,
        metadata: {
          plan: body.plan,
          setupFee,
          serviceFee,
          userAgent: request.headers.get("user-agent"),
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip"),
        },
      },
    });

    const paymentResult = {
      method: body.method,
      amount: totalAmount,
      panelId: panel.id,
      paymentId: payment.id,
    };

    if (body.method === "paystack") {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment system configuration error. Please contact support.",
          },
          { status: 500 }
        );
      }

      const initBody = {
        email: body.ownerEmail,
        amount: totalAmount * 100, // Convert to kobo
        reference,
        callback_url: body.callbackUrl || `${request.nextUrl.origin}/verify`,
        metadata: {
          panelId: panel.id,
          paymentId: payment.id,
          plan: body.plan,
          subdomain: body.subdomain,
        },
      };

      const initializeResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(initBody),
        }
      );

      if (!initializeResponse.ok) {
        throw new Error(
          `Paystack initialization failed: ${initializeResponse.status}`
        );
      }

      const initData = await initializeResponse.json();

      if (!initData.status) {
        throw new Error(initData.message || "Payment initialization failed");
      }

      console.log("[Panel Payment] Initialized:", {
        panelId: panel.id,
        paymentId: payment.id,
        method: body.method,
        reference,
        amount: totalAmount,
        email: body.ownerEmail,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        reference,
        authorization_url: initData.data.authorization_url,
        ...paymentResult,
      });
    } else if (body.method === "etegram") {
      // For Etegram, create checkout URL
      const checkoutUrl = `${request.nextUrl.origin}/payment/etegram/checkout?ref=${reference}`;

      // Update payment with checkout URL
      await prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl },
      });

      console.log("[Panel Payment] Initialized:", {
        panelId: panel.id,
        paymentId: payment.id,
        method: body.method,
        reference,
        amount: totalAmount,
        email: body.ownerEmail,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        reference,
        checkoutUrl,
        ...paymentResult,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported payment method",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Panel Payment] Initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
      { status: 500 }
    );
  }
}
