import { type NextRequest, NextResponse } from "next/server";

interface EmailRequest {
  attendeeEmail: string;
  attendeeName: string;
  transactionId: string;
  tickets: Array<{
    ticketType: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  eventDate: string;
  eventLocation: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();

    // Validate email request
    if (!body.attendeeEmail || !body.attendeeName || !body.transactionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(body);

    console.log("[v0] Confirmation email sent to:", body.attendeeEmail);

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent successfully",
      emailId: emailResult.id,
    });
  } catch (error) {
    console.error("[v0] Email sending error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(data: EmailRequest) {
  // In production, use Resend, SendGrid, or similar service
  // For now, simulate email sending
  const emailContent = generateEmailHTML(data);

  console.log("[v0] Email content generated for:", data.attendeeEmail);
  console.log("[v0] Transaction ID:", data.transactionId);

  // Simulate API call
  return {
    id: `email_${Date.now()}`,
    status: "sent",
  };
}

function generateEmailHTML(data: EmailRequest): string {
  const ticketsList = data.tickets
    .map(
      (ticket) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${formatTicketType(ticket.ticketType)}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${ticket.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ₦${(ticket.price * ticket.quantity).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .ticket-table th { background: #e5e7eb; padding: 12px; text-align: left; font-weight: bold; }
          .total-row { background: #f3f4f6; font-weight: bold; font-size: 18px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Akwa Ibom Tech Week 2025</h1>
            <p>Ticket Confirmation</p>
          </div>
          <div class="content">
            <p>Dear ${data.attendeeName},</p>
            <p>Thank you for purchasing tickets to Akwa Ibom Tech Week 2025! Your payment has been confirmed.</p>
            
            <h3>Booking Details</h3>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Event Date:</strong> ${data.eventDate}</p>
            <p><strong>Location:</strong> ${data.eventLocation}</p>
            
            <h3>Tickets</h3>
            <table class="ticket-table">
              <thead>
                <tr>
                  <th>Ticket Type</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${ticketsList}
                <tr class="total-row">
                  <td colspan="2">Total</td>
                  <td style="text-align: right;">₦${data.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            
            <p>Your tickets have been sent to this email address. Please keep this confirmation for your records.</p>
            
            <a href="https://ibomtechweek.com/my-tickets" class="button">View My Tickets</a>
            
            <div class="footer">
              <p>If you have any questions, please contact us at support@ibomtechweek.com</p>
              <p>&copy; 2025 Akwa Ibom Tech Week. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function formatTicketType(type: string): string {
  const typeMap: Record<string, string> = {
    "early-bird": "Early Bird",
    regular: "Regular",
    vip: "VIP",
  };
  return typeMap[type] || type;
}
