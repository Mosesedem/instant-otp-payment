import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PaymentStatus, PaymentType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const SETUP_FEE = 15000;
const MONTHLY_SERVICE_FEE = 5000;
const ANNUAL_SERVICE_FEE = 60000;

type PaymentPlan = "monthly" | "annual";

function resolvePlan(plan: unknown): PaymentPlan {
  return plan === "annual" ? "annual" : "monthly";
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

function buildReference(plan: PaymentPlan) {
  return `PSTK-${plan.toUpperCase()}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = resolvePlan(body?.plan);
    const panelId = typeof body?.panelId === "string" ? body.panelId : null;

    if (!panelId) {
      return NextResponse.json(
        { error: "panelId is required" },
        { status: 400 }
      );
    }

    const panel = await prisma.panel.findUnique({
      where: {
        id: panelId,
      },
      include: {
        user: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    const userId = panel.userId;

    const serviceFee =
      plan === "annual" ? ANNUAL_SERVICE_FEE : MONTHLY_SERVICE_FEE;
    const totalAmount = SETUP_FEE + serviceFee;

    const reference = buildReference(plan);
    const paymentType =
      plan === "annual"
        ? PaymentType.ANNUAL_SUBSCRIPTION
        : PaymentType.MONTHLY_SUBSCRIPTION;

    const metadata: Prisma.JsonObject = {
      plan,
      setupFee: SETUP_FEE,
      serviceFee,
      totalAmount,
    };

    const existingPayment = await prisma.payment.findFirst({
      where: {
        panelId: panel.id,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.FAILED],
        },
      },
    });

    let payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: totalAmount,
            currency: "NGN",
            type: paymentType,
            status: PaymentStatus.PENDING,
            reference,
            paymentMethod: "online",
            provider: "paystack",
            externalId: reference,
            checkoutUrl: null,
            metadata,
          },
        })
      : await prisma.payment.create({
          data: {
            userId,
            panelId: panel.id,
            amount: totalAmount,
            currency: "NGN",
            type: paymentType,
            status: PaymentStatus.PENDING,
            reference,
            paymentMethod: "online",
            provider: "paystack",
            externalId: reference,
            metadata,
          },
        });

    // Initialize Paystack payment
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalAmount * 100, // Paystack expects amount in kobo
          email: panel.user.email,
          reference,
          callback_url: `${getBaseUrl()}/verify&reference=${reference}`,
          metadata: {
            panel_id: panel.id,
            user_id: userId,
            plan,
            custom_fields: [
              {
                display_name: "Panel Name",
                variable_name: "panel_name",
                value: panel.name || "Untitled Panel",
              },
              {
                display_name: "Subdomain",
                variable_name: "subdomain",
                value: panel.subdomain,
              },
            ],
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error("Paystack initialization failed:", paystackData);
      return NextResponse.json(
        { error: "Failed to initialize Paystack payment" },
        { status: 500 }
      );
    }

    const checkoutUrl = paystackData.data.authorization_url;

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl,
        externalId: paystackData.data.reference,
      },
    });

    await prisma.panel.update({
      where: { id: panel.id },
      data: {
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Paystack payment initiated",
        reference,
        checkoutUrl,
        provider: "paystack",
        payment,
        pricing: {
          setupFee: SETUP_FEE,
          serviceFee,
          total: totalAmount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[payments:initiate/paystack] Failed to initiate payment",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to initiate payment",
      },
      { status: 500 }
    );
  }
}
