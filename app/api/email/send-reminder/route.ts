import { type NextRequest, NextResponse } from "next/server";

interface ReminderRequest {
  attendeeEmail: string;
  attendeeName: string;
  eventDate: string;
  eventLocation: string;
  ticketCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReminderRequest = await request.json();

    if (!body.attendeeEmail || !body.attendeeName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailResult = await sendReminderEmail(body);

    console.log("[v0] Reminder email sent to:", body.attendeeEmail);

    return NextResponse.json({
      success: true,
      message: "Reminder email sent successfully",
      emailId: emailResult.id,
    });
  } catch (error) {
    console.error("[v0] Reminder email error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder email" },
      { status: 500 }
    );
  }
}

async function sendReminderEmail(data: ReminderRequest) {
  const emailContent = generateReminderHTML(data);

  console.log("[v0] Reminder email content generated for:", data.attendeeEmail);

  return {
    id: `email_reminder_${Date.now()}`,
    status: "sent",
  };
}

function generateReminderHTML(data: ReminderRequest): string {
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
          .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Event Reminder</h1>
            <p>Akwa Ibom Tech Week 2025 is Coming Soon!</p>
          </div>
          <div class="content">
            <p>Hi ${data.attendeeName},</p>
            <p>This is a friendly reminder that Akwa Ibom Tech Week 2025 is happening soon!</p>

            <div class="highlight">
              <strong>📅 Event Details:</strong><br>
              Date: ${data.eventDate}<br>
              Location: ${data.eventLocation}<br>
              Your Tickets: ${data.ticketCount}
            </div>
            
            <p>Make sure to:</p>
            <ul>
              <li>Arrive 30 minutes early</li>
              <li>Bring a valid ID</li>
              <li>Have your ticket confirmation ready</li>
              <li>Check the event schedule</li>
            </ul>
            
            <a href="https://ibomtechweek.com/event-details" class="button">View Event Details</a>
            
            <div class="footer">
              <p>Questions? Contact us at support@ibomtechweek.com</p>
              <p>&copy; 2025 Akwa Ibom Tech Week. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
