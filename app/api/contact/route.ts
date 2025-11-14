import { NextResponse } from "next/server";
import * as brevo from "@getbrevo/brevo";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

const contactRecipient = process.env.CONTACT_EMAIL || "support@instantotp.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Save contact form submission to database
    await prisma.contact.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        message: trimmedMessage,
      },
    });

    // Send email using Brevo
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: "InstantOTP Contact",
      email: "noreply@instantotp.com",
    };
    sendSmtpEmail.to = [{ email: contactRecipient }];
    sendSmtpEmail.replyTo = { email: trimmedEmail, name: trimmedName };
    sendSmtpEmail.subject = `InstantOTP contact form from ${trimmedName}`;
    sendSmtpEmail.htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
      ${
        trimmedPhone
          ? `<p><strong>Phone:</strong> ${escapeHtml(trimmedPhone)}</p>`
          : ""
      }
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br/>")}</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return NextResponse.json(
      { message: "Message sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[contact] send error", error);
    return NextResponse.json(
      { error: "Unable to send message right now" },
      { status: 500 }
    );
  }
}
