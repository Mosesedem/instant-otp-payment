// lib/email.ts
import * as brevo from "@getbrevo/brevo";

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

interface Ticket {
  ticketId: string;
  ticketType: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  attendeeCompany: string | null;
  attendeeJobTitle: string | null;
  purchaseReference: string;
  amount: number;
  purchaseDate: Date;
}

interface EmailParams {
  to: string;
  attendeeName: string;
  tickets: Ticket[];
  totalAmount: number;
  reference: string;
  isAdmin?: boolean;
  customerEmail?: string;
}

function generateTicketEmailHtml(params: EmailParams): string {
  const {
    attendeeName,
    tickets,
    totalAmount,
    reference,
    isAdmin,
    customerEmail,
  } = params;

  const ticketRows = tickets
    .map(
      (ticket, index) => `
    <tr style="border-bottom: 1px solid #FFE5D9;">
      <td style="padding: 15px; font-size: 14px; color: #333;">
        <strong style="color: #FF6B35;">${ticket.ticketId}</strong>
      </td>
      <td style="padding: 15px; font-size: 14px; color: #333;">
        ${ticket.ticketType}
      </td>
      <td style="padding: 15px; font-size: 14px; color: #333;">
        ₦${ticket.amount.toLocaleString()}
      </td>
    </tr>
  `
    )
    .join("");

  const adminSection = isAdmin
    ? `
    <div style="background-color: #FFF5F0; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <h3 style="color: #FF6B35; margin: 0 0 10px 0; font-size: 16px;">Customer Information</h3>
      <p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Name:</strong> ${
        tickets[0].attendeeName
      }</p>
      <p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
      ${
        tickets[0].attendeePhone
          ? `<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Phone:</strong> ${tickets[0].attendeePhone}</p>`
          : ""
      }
      ${
        tickets[0].attendeeCompany
          ? `<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Company:</strong> ${tickets[0].attendeeCompany}</p>`
          : ""
      }
      ${
        tickets[0].attendeeJobTitle
          ? `<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Job Title:</strong> ${tickets[0].attendeeJobTitle}</p>`
          : ""
      }
    </div>
  `
    : `
    <div style="background-color: #FFF5F0; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #FF6B35; margin: 0; font-size: 14px;">
        <strong>📱 Important:</strong> Save this email! You'll need your ticket ID(s) for event entry.
      </p>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${
    isAdmin ? "New Ticket Purchase" : "Your Akwa Ibom Tech Week Ticket"
  }</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F5F5F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F5F5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: bold;">
                ${
                  isAdmin
                    ? "🎫 New Ticket Purchase"
                    : "🎉 Your Tickets Are Ready!"
                }
              </h1>
              <p style="color: #FFFFFF; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                Akwa Ibom Tech Week 2025
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 22px;">
                Hello ${attendeeName}! 👋
              </h2>
              <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.6;">
                ${
                  isAdmin
                    ? `A new ticket purchase has been completed. Here are the details:`
                    : `Thank you for purchasing your ticket(s) for Akwa Ibom Tech Week! We're excited to have you join us.`
                }
              </p>
            </td>
          </tr>

          ${adminSection}

          <!-- Ticket Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="color: #FF6B35; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #FF6B35; padding-bottom: 10px;">
                Ticket Details
              </h3>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #FFE5D9; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #FF6B35;">
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Ticket ID</th>
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Type</th>
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                </tbody>
              </table>

              <!-- Summary -->
              <div style="background-color: #FFF5F0; border: 1px solid #FF6B35; border-radius: 4px; padding: 20px; margin-top: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Total Tickets:</td>
                    <td style="padding: 5px 0; text-align: right; color: #333; font-size: 14px; font-weight: 600;">${
                      tickets.length
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Total Amount:</td>
                    <td style="padding: 5px 0; text-align: right; color: #FF6B35; font-size: 18px; font-weight: bold;">₦${totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Reference:</td>
                    <td style="padding: 5px 0; text-align: right; color: #333; font-size: 14px; font-family: monospace;">${reference}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          ${
            !isAdmin
              ? `
          <!-- Event Information -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #F8F9FA; border-radius: 4px; padding: 20px;">
                <h3 style="color: #FF6B35; margin: 0 0 15px 0; font-size: 18px;">Event Information</h3>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">📅 Date:</strong> Nov 3-8, 2025
                </p>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">⏰ Time:</strong> 10:00 AM 
                </p>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">📍 Venue:</strong> CEEDAPEG hotels, Chief Odiong Street, Uyo, Nigeria
                </p>
              </div>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); border-radius: 4px; padding: 20px; color: #FFFFFF;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px;">What's Next? 🚀</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  <li>Keep this email safe - you'll need your ticket ID at the venue</li>
                  <li>Arrive early to avoid queues</li>
                  <li>Bring a valid ID for verification</li>
                  <li>Join our community for updates and networking</li>
                </ul>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #F8F9FA; text-align: center; border-top: 1px solid #E0E0E0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Questions? Contact us at <a href="mailto:sales@akwaibomtechweek.com" style="color: #FF6B35; text-decoration: none;">sales@akwaibomtechweek.com</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                © 2025 Akwa Ibom Tech Week. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                Powered by Etegram Group
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendTicketEmail(params: EmailParams): Promise<void> {
  const { to, isAdmin } = params;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: "Akwa Ibom Tech Week",
    email: "noreply@etegram.com",
  };
  sendSmtpEmail.to = [{ email: to, name: params.attendeeName }];
  sendSmtpEmail.subject = isAdmin
    ? `New Ticket Purchase - ${params.reference}`
    : `Your Akwa Ibom Tech Week Ticket - ${params.tickets.length} Ticket${
        params.tickets.length > 1 ? "s" : ""
      }`;
  sendSmtpEmail.htmlContent = generateTicketEmailHtml(params);

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}
