// app/api/webhooks/etegram/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPanelEmail } from "@/lib/email";
import { PaymentStatus } from "@prisma/client";

const ETEGRAM_SECRET_KEY = process.env.ETEGRAM_SECRET_KEY!;

// Verify Etegram signature (if they provide one, otherwise validate by API)
function verifyEtegramSignature(body: string, signature?: string): boolean {
  if (!signature) return true; // Skip if no signature provided

  const hash = crypto
    .createHmac("sha256", ETEGRAM_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body
    const body = await req.text();
    const signature = req.headers.get("x-etegram-signature");

    // Verify signature if provided (re-enabled for security)
    if (signature && !verifyEtegramSignature(body, signature)) {
      console.error("Invalid Etegram signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Etegram webhook event received");

    // Extract transaction data
    const {
      status,
      reference,
      amount,
      fees,
      email,
      fullname,
      phone,
      accessCode,
      channel,
      virtualAccount,
    } = event;

    // Only process successful transactions
    if (status !== "successful") {
      console.log(`Transaction not successful. Status: ${status}`);
      return NextResponse.json({
        received: true,
        message: "Transaction not successful",
      });
    }

    console.log("Processing Etegram payment for reference:", reference);

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        reference: reference,
      },
      include: {
        panel: true,
        user: true,
      },
    });

    if (!payment) {
      console.error("Payment not found for reference:", reference);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!payment.user.email) {
      console.error("User email not found for payment:", reference);
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (payment.status === PaymentStatus.COMPLETED) {
      console.log("Payment already processed:", reference);
      return NextResponse.json({
        received: true,
        message: "Already processed",
      });
    }

    // Verify amount matches
    const expectedAmount = payment.amount;
    const receivedAmount = amount;

    if (Math.abs(receivedAmount - expectedAmount) > 1) {
      console.error(
        `Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Update payment and panel status
    await prisma.$transaction(async (tx: any) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          metadata: {
            ...((payment.metadata as any) || {}),
            etegramData: {
              transactionId: event.id,
              reference: reference,
              accessCode: accessCode,
              amount: amount,
              fees: fees,
              channel: channel,
              virtualAccount: virtualAccount,
              fullname: fullname,
              email: email,
              phone: phone,
            },
          },
        },
      });

      // Update panel payment status
      await tx.panel.update({
        where: { id: payment.panelId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });
    });

    console.log(`Payment processed successfully for reference:`, reference);

    // Send emails
    try {
      const panelData = {
        panelId: payment.panel!.id,
        panelName: payment.panel!.name || "Untitled Panel",
        subdomain: payment.panel!.subdomain,
        customDomain: payment.panel!.customDomain || undefined,
        ownerName: payment.user.name || payment.panel!.name || "Panel Owner",
        ownerEmail: payment.user.email!,
        ownerPhone: null, // Could be added to user/panel schema
        paymentReference: reference,
        amount: payment.amount,
        paymentDate: new Date(),
        paymentStatus: PaymentStatus.COMPLETED,
      };

      // 1. Send email to panel owner
      await sendPanelEmail({
        to: payment.user.email!,
        ownerName: panelData.ownerName,
        panels: [panelData],
        totalAmount: payment.amount,
        reference: reference,
      });

      // 2. Send email to admin
      await sendPanelEmail({
        to: "admin@instantotp.com",
        ownerName: "Admin",
        panels: [panelData],
        totalAmount: payment.amount,
        reference: reference,
        isAdmin: true,
        customerEmail: payment.user.email!,
      });

      console.log("All emails sent successfully for reference:", reference);
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      // Don't fail the webhook if email fails
    }

    return NextResponse.json({
      received: true,
      message: "Payment processed successfully",
    });
  } catch (error) {
    console.error("Etegram webhook error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Etegram webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
