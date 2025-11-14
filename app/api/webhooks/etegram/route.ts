// app/api/webhooks/etegram/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTicketEmail } from "@/lib/email";

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

// Generate unique ticket ID
function generateTicketId(): string {
  const prefix = "AKTW-2025";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Helper: Derive individual ticket price if missing (pro-rate total amount across tickets)
function deriveTicketPrice(
  totalAmount: number,
  tickets: Array<{ ticketType: string; quantity: number; price?: number }>
): Array<{ ticketType: string; quantity: number; price: number }> {
  let totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
  let totalKnownPrice = 0;
  let knownQuantity = 0;

  // Calculate sum of known prices and their quantities
  tickets.forEach((t) => {
    if (t.price && t.price > 0) {
      totalKnownPrice += t.price * t.quantity;
      knownQuantity += t.quantity;
    }
  });

  // If all prices known, return as-is
  if (knownQuantity === totalQuantity) {
    return tickets.map((t) => ({ ...t, price: t.price! })); // Assert non-null
  }

  // Pro-rate: Use totalAmount for missing portions
  const avgPrice = totalAmount / totalQuantity;
  const missingQuantity = totalQuantity - knownQuantity;
  const missingTotal = avgPrice * missingQuantity;

  // For simplicity, assign avgPrice to missing tickets (improve with per-type pricing if needed)
  return tickets.map((t) => {
    if (t.price && t.price > 0) {
      return { ...t, price: t.price };
    }
    return { ...t, price: avgPrice };
  });
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

    // Find the purchase record using accessCode or reference
    const purchase = await prisma.purchase.findFirst({
      where: {
        OR: [{ reference: reference }, { reference: accessCode }],
      },
    });

    if (!purchase) {
      console.error("Purchase not found for reference:", reference);
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (purchase.status === "successful") {
      console.log("Payment already processed:", reference);
      return NextResponse.json({
        received: true,
        message: "Already processed",
      });
    }

    // Verify amount matches (amount is already in Naira, no conversion needed)
    const expectedAmount = purchase.amount;
    const receivedAmount = amount; // Etegram returns amount after fees

    if (Math.abs(receivedAmount - expectedAmount) > 1) {
      console.error(
        `Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Extract purchase metadata
    const sessionId = purchase.sessionId;
    // Fix: Parse JSON safely and derive prices if missing
    let tickets;
    try {
      tickets =
        typeof purchase.tickets === "string"
          ? JSON.parse(purchase.tickets)
          : purchase.tickets;
    } catch (parseError) {
      console.error("Invalid tickets JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid purchase data" },
        { status: 400 }
      );
    }
    const typedTickets = tickets as Array<{
      ticketType: string;
      quantity: number;
      price?: number; // Allow optional for safety
    }>;

    // Derive prices if any are missing (new helper)
    const ticketsWithPrices = deriveTicketPrice(expectedAmount, typedTickets);
    console.log("Tickets with derived prices:", ticketsWithPrices);

    // Generate ticket IDs for each individual ticket
    const generatedTickets: Array<{
      ticketId: string;
      ticketType: string;
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone: string | null;
      attendeeCompany: string | null;
      attendeeJobTitle: string | null;
      purchaseReference: string;
      amount: number;
      purchaseDate: Date;
    }> = [];

    // Generate ticket IDs based on quantity
    for (const ticket of ticketsWithPrices) {
      // Use ticketsWithPrices
      for (let i = 0; i < ticket.quantity; i++) {
        generatedTickets.push({
          ticketId: generateTicketId(),
          ticketType: ticket.ticketType,
          attendeeName: purchase.attendeeName,
          attendeeEmail: purchase.attendeeEmail,
          attendeePhone: purchase.attendeePhone,
          attendeeCompany: purchase.attendeeCompany,
          attendeeJobTitle: purchase.attendeeJobTitle,
          purchaseReference: reference,
          amount: ticket.price!, // Now guaranteed non-null
          purchaseDate: new Date(),
        });
      }
    }

    // Validate generated tickets have prices
    const ticketsWithoutPrice = generatedTickets.filter(
      (t) => !t.amount || t.amount <= 0
    );
    if (ticketsWithoutPrice.length > 0) {
      console.error("Generated tickets missing prices:", ticketsWithoutPrice);
      return NextResponse.json(
        { error: "Invalid ticket prices" },
        { status: 400 }
      );
    }

    // Create tickets in database (using transaction)
    await prisma.$transaction(async (tx: any) => {
      // Update purchase status
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "successful",
          completedAt: new Date(),
          metadata: {
            ...((purchase.metadata as any) || {}),
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
            ticketIds: generatedTickets.map((t) => t.ticketId),
          },
        },
      });

      // Create ticket records
      await tx.ticket.createMany({
        data: generatedTickets.map((ticket) => ({
          ticketId: ticket.ticketId,
          purchaseId: purchase.id,
          reference: reference,
          ticketType: ticket.ticketType,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
          attendeePhone: ticket.attendeePhone,
          attendeeCompany: ticket.attendeeCompany,
          attendeeJobTitle: ticket.attendeeJobTitle,
          price: ticket.amount, // Now safe
          status: "active",
        })),
      });
    });

    console.log(
      `Created ${generatedTickets.length} tickets for reference:`,
      reference
    );

    // Send emails
    try {
      // 1. Send email to customer with all their tickets
      await sendTicketEmail({
        to: purchase.attendeeEmail,
        attendeeName: purchase.attendeeName,
        tickets: generatedTickets,
        totalAmount: purchase.amount,
        reference: reference,
      });

      // 2. Send email to Moniecheap admin
      await sendTicketEmail({
        to: "ceo@etegramgroup.com",
        attendeeName: "Emem Edem ",
        tickets: generatedTickets,
        totalAmount: purchase.amount,
        reference: reference,
        isAdmin: true,
        customerEmail: purchase.attendeeEmail,
      });

      // 3. Send email to sales team
      await sendTicketEmail({
        to: "president@ibominnovation.org",
        attendeeName: "Mr. President",
        tickets: generatedTickets,
        totalAmount: purchase.amount,
        reference: reference,
        isAdmin: true,
        customerEmail: purchase.attendeeEmail,
      });

      console.log("All emails sent successfully for reference:", reference);
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      // Don't fail the webhook if email fails
    }

    return NextResponse.json({
      received: true,
      message: "Payment processed successfully",
      ticketCount: generatedTickets.length,
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
