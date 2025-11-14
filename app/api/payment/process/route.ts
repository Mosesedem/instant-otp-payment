import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface PaymentRequest {
  sessionId: string;
  method: "etegram" | "paystack";
  amount: number;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
  attendeeCompany?: string;
  attendeeJobTitle?: string;
  tickets: Array<{
    ticketType: string;
    quantity: number;
    price?: number;
  }>;
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
    const body: PaymentRequest = await request.json();

    // Validate payment request
    if (
      !body.sessionId ||
      !body.method ||
      !body.amount ||
      !body.attendeeEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment amount",
        },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = generateReference(body.method);

    // Save attempted purchase to database
    try {
      await prisma.purchase.create({
        data: {
          sessionId: body.sessionId,
          reference,
          status: "attempted",
          paymentMethod: body.method,
          amount: body.amount,
          attendeeEmail: body.attendeeEmail,
          attendeeName: body.attendeeName,
          attendeePhone: body.attendeePhone,
          attendeeCompany: body.attendeeCompany,
          attendeeJobTitle: body.attendeeJobTitle,
          tickets: body.tickets,
          metadata: {
            userAgent: request.headers.get("user-agent"),
            ip:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip"),
          },
        },
      });
    } catch (dbError) {
      console.error("[Payment] Database save error:", dbError);
      // Continue with payment initialization even if DB save fails
    }

    const paymentResult = {
      method: body.method,
      amount: body.amount,
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
        email: body.attendeeEmail,
        amount: body.amount * 100,
        reference,
        callback_url: body.callbackUrl || `${request.nextUrl.origin}/verify`,
        metadata: {
          sessionId: body.sessionId,
          attendee_name: body.attendeeName,
          attendee_phone: body.attendeePhone,
          tickets: body.tickets,
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

      console.log("[Payment] Initialized:", {
        sessionId: body.sessionId,
        method: body.method,
        reference,
        amount: body.amount,
        email: body.attendeeEmail,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        reference,
        authorization_url: initData.data.authorization_url,
        ...paymentResult,
      });
    } else {
      // Handle other methods (e.g., etegram) as before
      console.log("[Payment] Initialized:", {
        sessionId: body.sessionId,
        method: body.method,
        reference,
        amount: body.amount,
        email: body.attendeeEmail,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, reference, ...paymentResult });
    }
  } catch (error) {
    console.error("[Payment] Initialization error:", error);
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

// SDK-only mode: provider initialization helpers removed
