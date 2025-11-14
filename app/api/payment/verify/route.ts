import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface VerifyRequest {
  reference: string;
  method?: "etegram" | "paystack";
  accessCode?: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();

    if (!body.reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing payment reference",
        },
        { status: 400 }
      );
    }

    // Determine payment method from reference prefix
    const method =
      body.method ||
      (body.reference.startsWith("ETG") ? "etegram" : "paystack");

    // Verify payment based on method
    let verificationResult;
    if (method === "etegram") {
      verificationResult = await verifyEtegramPayment(
        body.reference,
        body.accessCode,
        body.projectId
      );
    } else if (method === "paystack") {
      verificationResult = await verifyPaystackPayment(body.reference);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment method",
        },
        { status: 400 }
      );
    }

    // Update purchase status in database
    if (verificationResult.success) {
      try {
        await prisma.purchase.update({
          where: { reference: body.reference },
          data: {
            status:
              verificationResult.status === "success" ? "verified" : "failed",
            completedAt: new Date(),
            metadata: {
              ...verificationResult.metadata,
              paidAt: verificationResult.paidAt,
              channel: verificationResult.channel,
            },
          },
        });
      } catch (dbError) {
        console.error("[Payment] Database update error:", dbError);
        // Continue even if DB update fails
      }

      console.log("[Payment] Verified:", {
        reference: body.reference,
        method,
        amount: verificationResult.amount,
        status: verificationResult.status,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Update as failed
      try {
        await prisma.purchase.update({
          where: { reference: body.reference },
          data: {
            status: "failed",
            completedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error("[Payment] Database update error:", dbError);
      }
    }

    return NextResponse.json({
      success: verificationResult.success,
      data: verificationResult,
    });
  } catch (error) {
    console.error("[Payment] Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for Paystack callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get("reference");

  if (!reference) {
    return redirect("/?payment=failed");
  }

  try {
    const verificationResult = await verifyPaystackPayment(reference);

    // Update database
    if (verificationResult.success) {
      try {
        await prisma.purchase.update({
          where: { reference },
          data: {
            status:
              verificationResult.status === "success" ? "verified" : "failed",
            completedAt: new Date(),
            metadata: {
              ...verificationResult.metadata,
              paidAt: verificationResult.paidAt,
              channel: verificationResult.channel,
            },
          },
        });
      } catch (dbError) {
        console.error("[Payment] Database update error:", dbError);
      }
    } else {
      try {
        await prisma.purchase.update({
          where: { reference },
          data: {
            status: "failed",
            completedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error("[Payment] Database update error:", dbError);
      }
    }

    if (verificationResult.success && verificationResult.status === "success") {
      return redirect(`/?payment=success&reference=${reference}`);
    } else {
      return redirect(`/?payment=failed&reference=${reference}`);
    }
  } catch (error) {
    console.error("[Payment] Callback verification error:", error);
    return redirect("/?payment=failed");
  }
}

async function verifyEtegramPayment(
  reference: string,
  accessCode?: string,
  projectId?: string
) {
  try {
    // Prefer official verify endpoint using projectId and accessCode
    const proj = projectId || process.env.ETEGRAM_PROJECT_ID || "";
    if (accessCode && proj) {
      const url = `https://api-checkout.etegram.com/api/transaction/verify-payment/${proj}/${accessCode}`;
      const response = await fetch(url, { method: "PATCH", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Etegram verification failed");
      }
      return {
        success: result?.status === true || result?.status === "success",
        status: result?.data?.status || (result?.status ? "success" : "failed"),
        amount: Number(result?.data?.amount) || 0,
        reference: result?.data?.reference || reference,
        paidAt: result?.data?.paid_at,
        channel: result?.data?.channel,
        metadata: result?.data?.metadata,
      };
    }

    // Fallback: old endpoint by reference (may be deprecated)
    const fallbackKey = process.env.ETEGRAM_SECRET_KEY;
    if (!fallbackKey) throw new Error("Etegram configuration missing");
    const response = await fetch(
      `https://api.etegram.com/api/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${fallbackKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || "Etegram verification failed");
    }
    return {
      success: result.status === "success" || result.status === true,
      status: result.status,
      amount: Number(result.amount) / 100 || 0,
      reference: result.reference,
      paidAt: result.paid_at,
      channel: result.channel,
      metadata: result.metadata,
    };
  } catch (error) {
    console.error("[Etegram] Verification error:", error);
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

async function verifyPaystackPayment(reference: string) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      throw new Error("Paystack configuration missing");
    }

    // Verify with Paystack API
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (!result.status || !result.data) {
      throw new Error(result.message || "Paystack verification failed");
    }

    return {
      success: result.data.status === "success",
      status: result.data.status,
      amount: result.data.amount / 100, // Convert from kobo to naira
      reference: result.data.reference,
      paidAt: result.data.paid_at,
      channel: result.data.channel,
      customer: result.data.customer,
      metadata: result.data.metadata,
    };
  } catch (error) {
    console.error("[Paystack] Verification error:", error);
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}
