interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using configured email service
 * In production, integrate with Resend, SendGrid, or similar
 */
export async function sendEmail(
  payload: EmailPayload
): Promise<{ id: string; status: string }> {
  try {
    // Example: Using Resend (uncomment when configured)
    // const response = await resend.emails.send({
    //   from: 'noreply@ibomtechweek.com',
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: payload.html,
    // });
    // return { id: response.id, status: 'sent' };

    // For now, log and simulate
    console.log("[v0] Email would be sent to:", payload.to);
    console.log("[v0] Subject:", payload.subject);

    return {
      id: `email_${Date.now()}`,
      status: "sent",
    };
  } catch (error) {
    console.error("[v0] Email service error:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send ticket confirmation email
 */
export async function sendTicketConfirmation(
  email: string,
  name: string,
  transactionId: string,
  tickets: Array<{ ticketType: string; quantity: number; price: number }>,
  totalAmount: number
) {
  const ticketsList = tickets
    .map((t) => `${t.ticketType}: ${t.quantity} × ₦${t.price.toLocaleString()}`)
    .join("\n");

  const html = `
    <h2>Ticket Confirmation - Akwa Ibom Tech Week 2025</h2>
    <p>Dear ${name},</p>
    <p>Your tickets have been confirmed!</p>
    <p><strong>Transaction ID:</strong> ${transactionId}</p>
    <p><strong>Tickets:</strong></p>
    <pre>${ticketsList}</pre>
    <p><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
  `;

  return sendEmail({
    to: email,
    subject: "Your Akwa Ibom Tech Week 2025 Tickets - Confirmation",
    html,
  });
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(
  email: string,
  name: string,
  eventDate: string,
  location: string
) {
  const html = `
    <h2>Event Reminder - Akwa Ibom Tech Week 2025</h2>
    <p>Hi ${name},</p>
    <p>This is a reminder that Akwa Ibom Tech Week 2025 is happening on ${eventDate} at ${location}.</p>
    <p>See you there!</p>
  `;

  return sendEmail({
    to: email,
    subject: "Reminder: Akwa Ibom Tech Week 2025 is Coming Soon",
    html,
  });
}
