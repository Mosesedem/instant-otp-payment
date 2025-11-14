import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PaymentStatus, PaymentType, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  return `ETG-${plan.toUpperCase()}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = resolvePlan(body?.plan);
    const panelId = typeof body?.panelId === "string" ? body.panelId : null;

    if (!panelId) {
      return NextResponse.json(
        { error: "panelId is required" },
        { status: 400 }
      );
    }

    const panel = await prisma.panel.findFirst({
      where: {
        id: panelId,
        userId: session.user.id,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

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
            provider: "etegram",
            externalId: reference,
            checkoutUrl: null,
            metadata,
          },
        })
      : await prisma.payment.create({
          data: {
            userId: session.user.id,
            panelId: panel.id,
            amount: totalAmount,
            currency: "NGN",
            type: paymentType,
            status: PaymentStatus.PENDING,
            reference,
            paymentMethod: "online",
            provider: "etegram",
            externalId: reference,
            metadata,
          },
        });

    const checkoutUrl = `${getBaseUrl()}/payment/etegram/checkout?ref=${reference}`;

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl,
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
        message: "Etegram payment initiated",
        reference,
        checkoutUrl,
        provider: "etegram",
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
    console.error("[payments:initiate] Failed to initiate payment", error);
    return NextResponse.json(
      {
        error: "Failed to initiate payment",
      },
      { status: 500 }
    );
  }
}
