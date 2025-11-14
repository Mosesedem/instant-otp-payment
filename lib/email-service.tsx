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
    //   from: 'noreply@instantotp.com',
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
 * Send panel registration confirmation email
 */
export async function sendPanelConfirmation(
  email: string,
  name: string,
  transactionId: string,
  panels: Array<{ panelName: string; subdomain: string; price: number }>,
  totalAmount: number
) {
  const panelsList = panels
    .map(
      (p) =>
        `${p.panelName}: ${
          p.subdomain
        }.instantotp.com - ₦${p.price.toLocaleString()}`
    )
    .join("\n");

  const html = `
    <h2>Panel Registration Confirmation - InstantOTP</h2>
    <p>Dear ${name},</p>
    <p>Your child panel has been successfully registered!</p>
    <p><strong>Transaction ID:</strong> ${transactionId}</p>
    <p><strong>Panels:</strong></p>
    <pre>${panelsList}</pre>
    <p><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
    <p>You can now access your panel dashboard and start configuring your SMS verification services.</p>
  `;

  return sendEmail({
    to: email,
    subject: "Your InstantOTP Child Panel - Registration Confirmed",
    html,
  });
}

/**
 * Send panel activation reminder email
 */
export async function sendPanelActivationReminder(
  email: string,
  name: string,
  panelName: string,
  subdomain: string
) {
  const html = `
    <h2>Panel Activation Reminder - InstantOTP</h2>
    <p>Hi ${name},</p>
    <p>This is a reminder that your panel "${panelName}" (${subdomain}.instantotp.com) is ready for activation.</p>
    <p>Please complete the payment process to start earning from your SMS verification services.</p>
    <p>Access your dashboard at: https://${subdomain}.instantotp.com</p>
  `;

  return sendEmail({
    to: email,
    subject: "Reminder: Activate Your InstantOTP Child Panel",
    html,
  });
}
