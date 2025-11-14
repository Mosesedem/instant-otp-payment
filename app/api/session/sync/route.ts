import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/session/sync
// Body: {
//   sessionId: string,
//   cart?: any,
//   attendee?: any,
//   payment?: any,
//   status?: string,
//   lastStep?: string,
//   draft?: any
// }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, cart, attendee, payment, status, lastStep, draft } =
      body || {};

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid sessionId" },
        { status: 400 }
      );
    }

    // Build conditional update object with only provided fields
    const dataUpdate: Record<string, any> = {};
    if (typeof cart !== "undefined") dataUpdate.cart = cart;
    if (typeof attendee !== "undefined") dataUpdate.attendee = attendee;
    if (typeof payment !== "undefined") dataUpdate.payment = payment;
    if (typeof status !== "undefined") dataUpdate.status = status;
    if (typeof lastStep !== "undefined") dataUpdate.lastStep = lastStep;
    if (typeof draft !== "undefined") dataUpdate.draft = draft;

    // Require at least one field to update or create
    if (Object.keys(dataUpdate).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const result = await prisma.sessionDraft.upsert({
      where: { sessionId },
      update: dataUpdate,
      create: {
        sessionId,
        cart: cart ?? [],
        attendee: attendee ?? null,
        payment: payment ?? null,
        status: status ?? "in_progress",
        lastStep: lastStep ?? null,
        draft: draft ?? null,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("/api/session/sync error", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// Optional: GET /api/session/sync?sessionId=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const draft = await prisma.sessionDraft.findUnique({
      where: { sessionId },
    });

    return NextResponse.json({ success: true, data: draft });
  } catch (error: any) {
    console.error("/api/session/sync GET error", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
