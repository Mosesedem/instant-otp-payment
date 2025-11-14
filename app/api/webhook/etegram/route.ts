import { NextResponse } from "next/server";
import { PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

// Debug logging function
async function logToDebugEndpoint(data: unknown, type: string) {
  try {
    const debugPayload = {
      source: "etegram-webhook",
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    const response = await fetch(
      process.env.DEBUG_WEBHOOK_ENDPOINT ??
        "https://seller.rest/debug/debug.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(debugPayload),
      }
    );

    if (!response.ok) {
      console.error("Debug logging failed", await response.text());
    }
  } catch (error) {
    console.error("Error in debug logging:", error);
  }
}

interface EtegramWebhookPayload {
  id: string;
  reference: string;
  status: string;
  amount: number;
  fees?: number;
  phone?: string;
  email?: string;
  fullname?: string;
  channel?: string;
  createdAt?: string;
  updatedAt?: string;
  projectID?: string;
  metadata?: unknown;
  virtualAccount?: {
    accountNumber?: string;
    bankName?: string;
    currencyCode?: string;
  };
}

const statusMap: Record<string, PaymentStatus> = {
  successful: PaymentStatus.COMPLETED,
  success: PaymentStatus.COMPLETED,
  pending: PaymentStatus.PENDING,
  initiated: PaymentStatus.PENDING,
  processing: PaymentStatus.PENDING,
  failed: PaymentStatus.FAILED,
  cancelled: PaymentStatus.CANCELLED,
  reversed: PaymentStatus.REFUNDED,
  refunded: PaymentStatus.REFUNDED,
};

function mapEtegramStatus(status?: string): PaymentStatus | null {
  if (!status) {
    return null;
  }

  return statusMap[status.toLowerCase()] ?? null;
}

function ensureJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Prisma.JsonObject;
  }

  return {} as Prisma.JsonObject;
}

export async function POST(request: Request) {
  let rawBody = "";

  try {
    rawBody = await request.text();
    await logToDebugEndpoint(
      { rawBodyPreview: rawBody.slice(0, 500) },
      "raw_body"
    );

    if (!rawBody) {
      await logToDebugEndpoint({ message: "Empty request body" }, "error");
      return NextResponse.json(
        { success: false, message: "Empty request body" },
        { status: 400 }
      );
    }

    let payload: EtegramWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as EtegramWebhookPayload;
    } catch (error) {
      await logToDebugEndpoint(
        {
          message: "Invalid JSON payload",
          error: error instanceof Error ? error.message : String(error),
        },
        "parse_error"
      );

      return NextResponse.json(
        { success: false, message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    await logToDebugEndpoint(payload, "payload_parsed");

    if (!payload.reference) {
      await logToDebugEndpoint(
        { message: "Webhook missing reference", payload },
        "missing_reference"
      );
      return NextResponse.json(
        { success: false, message: "Missing payment reference" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { reference: payload.reference },
      include: { panel: true },
    });

    if (!payment) {
      await logToDebugEndpoint(
        {
          message: `No payment found for reference ${payload.reference}`,
          payload,
        },
        "payment_not_found"
      );

      return NextResponse.json(
        {
          success: true,
          message: "Payment reference not recognised, acknowledged",
        },
        { status: 200 }
      );
    }

    const mappedStatus = mapEtegramStatus(payload.status);

    if (!mappedStatus) {
      await logToDebugEndpoint(
        { message: `Unknown status received: ${payload.status}` },
        "unknown_status"
      );

      return NextResponse.json(
        {
          success: true,
          message: `Status ${payload.status} ignored`,
        },
        { status: 200 }
      );
    }

    const metadataBase = ensureJsonObject(payment.metadata);
    const existingEtegram = ensureJsonObject(
      metadataBase["etegram"] as Prisma.JsonValue | undefined
    );

    // Convert payload to a JSON-serializable object
    const payloadJson: Prisma.JsonObject = {
      id: payload.id ?? null,
      reference: payload.reference ?? null,
      status: payload.status ?? null,
      amount: payload.amount ?? null,
      fees: payload.fees ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      fullname: payload.fullname ?? null,
      channel: payload.channel ?? null,
      createdAt: payload.createdAt ?? null,
      updatedAt: payload.updatedAt ?? null,
      projectID: payload.projectID ?? null,
      metadata: payload.metadata ?? null,
      virtualAccount: payload.virtualAccount ?? null,
    };

    const mergedMetadata: Prisma.JsonObject = {
      ...metadataBase,
      etegram: {
        ...existingEtegram,
        lastPayload: payloadJson,
        lastWebhookAt: new Date().toISOString(),
      } as Prisma.JsonObject,
    };

    const paidAt =
      mappedStatus === PaymentStatus.COMPLETED
        ? payload.updatedAt
          ? new Date(payload.updatedAt)
          : new Date()
        : payment.paidAt;

    const amountToPersist = Number.isFinite(payload.amount)
      ? payload.amount
      : payment.amount;

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: mappedStatus,
          amount: amountToPersist,
          externalId: payload.id ?? payment.externalId ?? undefined,
          paymentMethod: payload.channel ?? payment.paymentMethod ?? undefined,
          paidAt,
          metadata: mergedMetadata,
          provider: "etegram",
        },
      });

      let updatedPanel = payment.panel;
      if (payment.panelId) {
        updatedPanel = await tx.panel.update({
          where: { id: payment.panelId },
          data: {
            paymentStatus: mappedStatus,
            setupPaid:
              mappedStatus === PaymentStatus.COMPLETED
                ? true
                : payment.panel?.setupPaid ?? false,
          },
        });
      }

      return { updatedPayment, updatedPanel };
    });

    await logToDebugEndpoint(
      {
        paymentId: result.updatedPayment.id,
        panelId: result.updatedPanel?.id ?? null,
        status: result.updatedPayment.status,
      },
      "payment_processed"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed",
        data: {
          paymentId: result.updatedPayment.id,
          panelId: result.updatedPanel?.id ?? null,
          status: result.updatedPayment.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logToDebugEndpoint(
      {
        message: "Webhook processing error",
        error: message,
        rawBodyPreview: rawBody.slice(0, 200),
      },
      "processing_error"
    );

    return NextResponse.json(
      {
        success: false,
        message: "Webhook processing error",
        error: message,
      },
      { status: 500 }
    );
  }
}
