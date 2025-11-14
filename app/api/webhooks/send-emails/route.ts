import { type NextRequest, NextResponse } from "next/server";

interface WebhookPayload {
  event: "payment_completed" | "event_reminder";
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json();

    console.log("[v0] Email webhook received:", body.event);

    if (body.event === "payment_completed") {
      // Send confirmation email after successful payment
      const paymentData = body.data as {
        attendeeEmail: string;
        attendeeName: string;
        transactionId: string;
        tickets: Array<{ ticketType: string; quantity: number; price: number }>;
        totalAmount: number;
      };

      await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/email/send-confirmation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendeeEmail: paymentData.attendeeEmail,
            attendeeName: paymentData.attendeeName,
            transactionId: paymentData.transactionId,
            tickets: paymentData.tickets,
            totalAmount: paymentData.totalAmount,
            eventDate: "Nov 3-8, 2025",
            eventLocation: "CEEDAPEG Hotels, Uyo",
          }),
        }
      );
    } else if (body.event === "event_reminder") {
      // Send reminder email
      const reminderData = body.data as {
        attendeeEmail: string;
        attendeeName: string;
        eventDate: string;
        eventLocation: string;
        ticketCount: number;
      };

      await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/email/send-reminder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reminderData),
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email webhook processed",
    });
  } catch (error) {
    console.error("[v0] Email webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
