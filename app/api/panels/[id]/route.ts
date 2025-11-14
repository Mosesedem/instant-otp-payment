import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const panel = await prisma.panel.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        domains: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    return NextResponse.json({ panel }, { status: 200 });
  } catch (error) {
    console.error("[v0] Error fetching panel:", error);
    return NextResponse.json(
      { error: "Failed to fetch panel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await prisma.panel.delete({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[v0] Error deleting panel:", error);
    return NextResponse.json(
      { error: "Failed to delete panel" },
      { status: 500 }
    );
  }
}
