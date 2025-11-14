import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

// Initialize Prisma Client
const prisma = new PrismaClient();

// 1. Define the specific shape of a Ticket record that includes the Purchase relation.
// This is done using Prisma's generated utility types for accurate typing.
type TicketWithPurchase = Prisma.TicketGetPayload<{
  include: { purchase: true };
}>;

// 2. Define the expected shape of the successful JSON response body.
interface PaginatedTicketsResponse {
  tickets: TicketWithPurchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 3. Define the return type of the GET function for full type safety.
// It can return either the successful paginated data or an error object.
export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedTicketsResponse | { error: string }>> {
  // Use URLSearchParams to safely access query parameters
  const searchParams = request.nextUrl.searchParams;

  // Type assertion and safe parsing for numerical parameters
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);
  const search = searchParams.get("search") ?? "";

  // Ensure page and limit are positive integers for database operations
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);

  const skip = (safePage - 1) * safeLimit;

  // 4. Type the 'where' clause using Prisma.TicketWhereInput for type checking against the schema.
  let where: Prisma.TicketWhereInput = {};

  if (search) {
    // Define the search condition structure for reuse
    const searchCondition: Prisma.StringFilter = {
      contains: search,
      mode: "insensitive", // Case-insensitive search, requires PostgreSQL/MySQL
    };

    where = {
      OR: [
        { attendeeName: searchCondition },
        { attendeeEmail: searchCondition },
        { ticketId: searchCondition },
        { attendeePhone: searchCondition },
        { attendeeCompany: searchCondition },
        { attendeeJobTitle: searchCondition },
        { ticketType: searchCondition },
      ],
    };
  }

  try {
    // Use Promise.all to fetch both data and count efficiently
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          purchase: true,
        },
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    // Return the response with the defined type structure
    return NextResponse.json({
      tickets: tickets as TicketWithPurchase[], // Casting ensures the return type matches the defined interface
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
