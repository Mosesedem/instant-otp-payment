// lib/email.ts
import * as brevo from "@getbrevo/brevo";

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

interface Panel {
  panelId: string;
  panelName: string;
  subdomain: string;
  customDomain?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  paymentReference: string;
  amount: number;
  paymentDate: Date;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";
}

interface EmailParams {
  to: string;
  ownerName: string;
  panels: Panel[];
  totalAmount: number;
  reference: string;
  isAdmin?: boolean;
  customerEmail?: string;
}

function generatePanelEmailHtml(params: EmailParams): string {
  const { ownerName, panels, totalAmount, reference, isAdmin, customerEmail } =
    params;

  const panelRows = panels
    .map(
      (panel, index) => `
    <tr style="border-bottom: 1px solid #FFE5D9;">
      <td style="padding: 15px; font-size: 14px; color: #333;">
        <strong style="color: #FF6B35;">${panel.panelId}</strong>
      </td>
      <td style="padding: 15px; font-size: 14px; color: #333;">
        ${panel.panelName}
      </td>
      <td style="padding: 15px; font-size: 14px; color: #333;">
        ${panel.subdomain}.instantotp.com
      </td>
      <td style="padding: 15px; font-size: 14px; color: #333;">
        ₦${panel.amount.toLocaleString()}
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
        panels[0].ownerName
      }</p>
      <p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
      ${
        panels[0].ownerPhone
          ? `<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Phone:</strong> ${panels[0].ownerPhone}</p>`
          : ""
      }
    </div>
  `
    : `
    <div style="background-color: #FFF5F0; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #FF6B35; margin: 0; font-size: 14px;">
        <strong>📱 Important:</strong> Save this email! Your panel details and access information are included below.
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
    isAdmin ? "New Panel Registration" : "Your InstantOTP Child Panel"
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
                    ? "� New Panel Registration"
                    : "🎉 Your Panel Is Ready!"
                }
              </h1>
              <p style="color: #FFFFFF; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                InstantOTP Child Panel Services
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 22px;">
                Hello ${ownerName}! 👋
              </h2>
              <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.6;">
                ${
                  isAdmin
                    ? `A new panel has been registered. Here are the details:`
                    : `Thank you for registering your child panel with InstantOTP! Your panel is now active and ready to start generating revenue.`
                }
              </p>
            </td>
          </tr>

          ${adminSection}

          <!-- Panel Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="color: #FF6B35; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #FF6B35; padding-bottom: 10px;">
                Panel Details
              </h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #FFE5D9; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #FF6B35;">
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Panel ID</th>
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Name</th>
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Domain</th>
                    <th style="padding: 12px; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${panelRows}
                </tbody>
              </table>

              <!-- Summary -->
              <div style="background-color: #FFF5F0; border: 1px solid #FF6B35; border-radius: 4px; padding: 20px; margin-top: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Total Panels:</td>
                    <td style="padding: 5px 0; text-align: right; color: #333; font-size: 14px; font-weight: 600;">${
                      panels.length
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
          <!-- Panel Information -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #F8F9FA; border-radius: 4px; padding: 20px;">
                <h3 style="color: #FF6B35; margin: 0 0 15px 0; font-size: 18px;">Panel Access Information</h3>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">🌐 Domain:</strong> ${
                    panels[0].subdomain
                  }.instantotp.com
                </p>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">📊 Status:</strong> Active
                </p>
                <p style="margin: 8px 0; color: #333; font-size: 14px;">
                  <strong style="color: #FF6B35;">� Plan:</strong> ${
                    panels[0].paymentStatus === "COMPLETED"
                      ? "Paid"
                      : "Pending Payment"
                  }
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
                  <li>Access your panel dashboard at the domain provided above</li>
                  <li>Configure your panel settings and branding</li>
                  <li>Start integrating SMS verification services</li>
                  <li>Monitor your revenue and analytics</li>
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
                Questions? Contact us at <a href="mailto:support@instantotp.com" style="color: #FF6B35; text-decoration: none;">support@instantotp.com</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                © 2025 InstantOTP. All rights reserved.
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

export async function sendPanelEmail(params: EmailParams): Promise<void> {
  const { to, isAdmin } = params;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: "InstantOTP",
    email: "noreply@etegram.com",
  };
  sendSmtpEmail.to = [{ email: to, name: params.ownerName }];
  sendSmtpEmail.subject = isAdmin
    ? `New Panel Registration - ${params.reference}`
    : `Your InstantOTP Child Panel - ${params.panels.length} Panel${
        params.panels.length > 1 ? "s" : ""
      }`;
  sendSmtpEmail.htmlContent = generatePanelEmailHtml(params);

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}
