import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, username, phone, image } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof username === "string" ? { username } : {}),
      ...(typeof phone === "string" ? { phone } : {}),
      ...(typeof image === "string" ? { image } : {}),
    };

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        image: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { user, message: "Profile updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with that email, username, or phone already exists" },
        { status: 409 }
      );
    }

    console.error("[profile] Update error", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
