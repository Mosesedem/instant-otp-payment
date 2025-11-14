import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const contactRecipient = process.env.CONTACT_EMAIL;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function assertEmailConfig() {
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !contactRecipient) {
    throw new Error(
      "Contact email configuration is missing. Check SMTP_* and CONTACT_EMAIL env vars."
    );
  }
}

export async function POST(request: Request) {
  try {
    assertEmailConfig();

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

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number.parseInt(smtpPort!, 10),
      secure: Number.parseInt(smtpPort!, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `${trimmedName} <${trimmedEmail}>`,
      to: contactRecipient,
      replyTo: trimmedEmail,
      subject: `InstantOTP contact form from ${trimmedName}`,
      text: trimmedMessage,
      html: `<p><strong>Name:</strong> ${escapeHtml(
        trimmedName
      )}</p><p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>${
        trimmedPhone
          ? `<p><strong>Phone:</strong> ${escapeHtml(trimmedPhone)}</p>`
          : ""
      }<p><strong>Message:</strong></p><p>${escapeHtml(trimmedMessage).replace(
        /\n/g,
        "<br/>"
      )}</p>`,
    });

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
