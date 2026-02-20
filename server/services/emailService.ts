/**
 * Resend-based email service.
 * All outbound emails for the application go through here.
 */
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "showroom@artisantilect.com";

export async function getResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return { client: new Resend(RESEND_API_KEY), fromEmail: FROM_EMAIL };
}

export type NotificationType = "7_day_reminder" | "1_day_reminder" | "overdue";

// ── Sample reminders ────────────────────────────

export async function sendSampleReminder(
  customerEmail: string,
  customerName: string,
  sampleName: string,
  dueDate: string,
  notificationType: NotificationType,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    let subject: string;
    let bodyHtml: string;

    switch (notificationType) {
      case "7_day_reminder":
        subject = "Reminder: Your sample is due in 7 days";
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Sample Return Reminder</h2>
            <p>Dear ${customerName},</p>
            <p>This is a friendly reminder that your sample <strong>${sampleName}</strong> is due for return in 7 days on <strong>${dueDate}</strong>.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath before the due date to avoid any late fees.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>`;
        break;
      case "1_day_reminder":
        subject = "Urgent: Your sample is due tomorrow";
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Sample Return - Due Tomorrow</h2>
            <p>Dear ${customerName},</p>
            <p>This is a reminder that your sample <strong>${sampleName}</strong> is due for return <strong>tomorrow (${dueDate})</strong>.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath to avoid any late fees.</p>
            <p>If you need an extension, please contact us as soon as possible.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>`;
        break;
      case "overdue":
        subject = "Action Required: Your sample is overdue";
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c0392b;">Sample Overdue Notice</h2>
            <p>Dear ${customerName},</p>
            <p>Your sample <strong>${sampleName}</strong> was due on <strong>${dueDate}</strong> and is now overdue.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath immediately to avoid additional charges.</p>
            <p>If you have already returned the sample or need to discuss this, please contact us right away.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>`;
        break;
    }

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: customerEmail,
      subject,
      html: bodyHtml,
    });
    console.log(`Email sent to ${customerEmail}: ${notificationType}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${customerEmail}:`, error);
    return false;
  }
}

// ── Checkout confirmation ───────────────────────

export async function sendCheckoutConfirmation(
  customerEmail: string,
  customerName: string,
  sampleName: string,
  sampleColor: string | null,
  sampleVendor: string | null,
  checkoutDate: string,
  dueDate: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    const subject = `Sample Checkout Confirmation - ${sampleName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Sample Checkout Confirmation</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for visiting Artisan Tile Kitchen & Bath! This email confirms that you have checked out the following sample:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold; width: 120px;">Sample:</td><td style="padding: 8px 0;">${sampleName}</td></tr>
            ${sampleColor ? `<tr><td style="padding: 8px 0; font-weight: bold;">Color:</td><td style="padding: 8px 0;">${sampleColor}</td></tr>` : ""}
            ${sampleVendor ? `<tr><td style="padding: 8px 0; font-weight: bold;">Vendor:</td><td style="padding: 8px 0;">${sampleVendor}</td></tr>` : ""}
            <tr><td style="padding: 8px 0; font-weight: bold;">Checkout Date:</td><td style="padding: 8px 0;">${checkoutDate}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Due Date:</td><td style="padding: 8px 0;"><strong style="color: #e74c3c;">${dueDate}</strong></td></tr>
          </table>
        </div>
        <p>Please return the sample by the due date to avoid any late fees.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0;">Thank you for choosing us,</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">Artisan Tile Kitchen & Bath</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">1200 Boston Post Road, Guilford, CT 06437</p>
        </div>
      </div>`;

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: customerEmail,
      subject,
      html: bodyHtml,
    });
    console.log(`Checkout confirmation sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send checkout confirmation to ${customerEmail}:`, error);
    return false;
  }
}

// ── Installer follow-up ─────────────────────────

export async function sendInstallerFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  projectType: string | null,
  startDate: string | null,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = `Installer Follow Up - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Installer Follow Up</h2>
        <p>A customer has indicated they need an installer. Here are the details:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Customer Name:</td><td style="padding: 10px;">${customerName}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Email:</td><td style="padding: 10px;">${customerEmail}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Phone:</td><td style="padding: 10px;">${customerPhone || "Not provided"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Project Type:</td><td style="padding: 10px;">${projectType || "Not specified"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Start Date:</td><td style="padding: 10px;">${startDate || "Not specified"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Sample:</td><td style="padding: 10px;">${sampleName || "N/A"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Checkout Date:</td><td style="padding: 10px;">${checkoutDate}</td></tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 10px; white-space: pre-wrap;">${notes}</td></tr>` : ""}
        </table>
        <p>Please follow up with this customer regarding their installation needs.</p>
      </div>`;

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: ["showroom@artisantilect.com", "claudia@artisantilect.com", "michele@artisantilect.com"],
      subject,
      html: bodyHtml,
    });
    return true;
  } catch (error) {
    console.error("Failed to send installer follow-up email:", error);
    return false;
  }
}

// ── Designer follow-up ──────────────────────────

export async function sendDesignerFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  projectType: string | null,
  startDate: string | null,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = `Designer Consultation Request - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Designer Consultation Request</h2>
        <p>A customer has indicated they are interested in working with a designer. Here are the details:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Customer Name:</td><td style="padding: 10px;">${customerName}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Email:</td><td style="padding: 10px;">${customerEmail}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Phone:</td><td style="padding: 10px;">${customerPhone || "Not provided"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Project Type:</td><td style="padding: 10px;">${projectType || "Not specified"}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Start Date:</td><td style="padding: 10px;">${startDate || "Not specified"}</td></tr>
          ${sampleName ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Sample:</td><td style="padding: 10px;">${sampleName}</td></tr>` : ""}
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Date:</td><td style="padding: 10px;">${checkoutDate}</td></tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 10px; white-space: pre-wrap;">${notes}</td></tr>` : ""}
        </table>
        <p>Please follow up with this customer regarding their design consultation needs.</p>
      </div>`;

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: ["claudia@artisantilect.com", "michele@artisantilect.com"],
      subject,
      html: bodyHtml,
    });
    return true;
  } catch (error) {
    console.error("Failed to send designer follow-up email:", error);
    return false;
  }
}

// ── Special request follow-up ───────────────────

export async function sendSpecialRequestFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  specialRequest: string,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = `Sample Special Request - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Sample Special Request</h2>
        <p>A customer has submitted a special request for their sample checkout:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Customer Name:</td><td style="padding: 10px;">${customerName}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Email:</td><td style="padding: 10px;">${customerEmail}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Phone:</td><td style="padding: 10px;">${customerPhone || "Not provided"}</td></tr>
          ${sampleName ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Sample:</td><td style="padding: 10px;">${sampleName}</td></tr>` : ""}
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Date:</td><td style="padding: 10px;">${checkoutDate}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold; vertical-align: top;">Special Request:</td><td style="padding: 10px; white-space: pre-wrap;">${specialRequest}</td></tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 10px; white-space: pre-wrap;">${notes}</td></tr>` : ""}
        </table>
        <p>Please follow up with this customer regarding their special request.</p>
      </div>`;

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: "showroom@artisantilect.com",
      subject,
      html: bodyHtml,
    });
    return true;
  } catch (error) {
    console.error("Failed to send special request follow-up email:", error);
    return false;
  }
}

// ── Contract email ──────────────────────────────

export async function sendContractEmail(
  customerEmail: string,
  customerName: string,
  contractType: string,
  pdfBuffer: Buffer,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const contractTypeName =
      contractType === "custom_cabinetry"
        ? "Cabinet Design and Layout Agreement"
        : "Home Improvement Contract";

    const subject = `Your ${contractTypeName} from Artisan Tile`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${contractTypeName}</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for choosing Artisan Tile Kitchen & Bath. Please find your signed ${contractTypeName.toLowerCase()} attached to this email.</p>
        <p>If you have any questions about your contract, please don't hesitate to contact us.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath<br/>1200 Boston Post Road<br/>Guilford, CT 06437</p>
      </div>`;

    await client.emails.send({
      from: fromEmail || "noreply@artisantile.com",
      to: customerEmail,
      subject,
      html: bodyHtml,
      attachments: [
        {
          filename: `${contractTypeName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error(`Failed to send contract email to ${customerEmail}:`, error);
    return false;
  }
}

// ── Portal emails ───────────────────────────────

const PORTAL_BASE_URL =
  process.env.PORTAL_BASE_URL || "https://artisantileshowroom.com/portal";

export async function sendPortalInvite(
  customerEmail: string,
  customerName: string,
  projectName: string,
  tempPassword: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = "You've been invited to the Artisan Tile Client Portal";
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Your Project Portal</h2>
        <p>Dear ${customerName},</p>
        <p>You've been invited to access the Artisan Tile client portal to track the progress of your project: <strong>${projectName}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
          <p style="margin: 0;">Email: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${customerEmail}</code></p>
          <p style="margin: 10px 0 0 0;">Temporary Password: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
        </div>
        <p><a href="${PORTAL_BASE_URL}/login" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Portal</a></p>
        <p style="color: #666; font-size: 14px;">For security, we recommend changing your password after your first login.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>`;

    await client.emails.send({ from: fromEmail || "noreply@artisantile.com", to: customerEmail, subject, html: bodyHtml });
    return true;
  } catch (error) {
    console.error(`Failed to send portal invite to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendPortalPasswordReset(
  customerEmail: string,
  customerName: string,
  newPassword: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = "Your Artisan Tile Portal Password Has Been Reset";
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset</h2>
        <p>Dear ${customerName},</p>
        <p>Your client portal password has been reset.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Your New Credentials:</strong></p>
          <p style="margin: 0;">Email: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${customerEmail}</code></p>
          <p style="margin: 10px 0 0 0;">New Password: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${newPassword}</code></p>
        </div>
        <p><a href="${PORTAL_BASE_URL}/login" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Login to Portal</a></p>
        <p style="color: #666; font-size: 14px;">If you did not request this password reset, please contact us immediately.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>`;

    await client.emails.send({ from: fromEmail || "noreply@artisantile.com", to: customerEmail, subject, html: bodyHtml });
    return true;
  } catch (error) {
    console.error(`Failed to send password reset to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendNewMessageNotification(
  customerEmail: string,
  customerName: string,
  projectName: string,
  messagePreview: string,
  senderName: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = `New Message on Your Project: ${projectName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">You Have a New Message</h2>
        <p>Dear ${customerName},</p>
        <p>You have received a new message regarding your project <strong>${projectName}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c3e50;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">From: ${senderName}</p>
          <p style="margin: 0; white-space: pre-wrap;">${messagePreview.length > 200 ? messagePreview.substring(0, 200) + "..." : messagePreview}</p>
        </div>
        <p><a href="${PORTAL_BASE_URL}" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message & Reply</a></p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>`;

    await client.emails.send({ from: fromEmail || "noreply@artisantile.com", to: customerEmail, subject, html: bodyHtml });
    return true;
  } catch (error) {
    console.error(`Failed to send message notification to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendBugReportNotification(
  reporterName: string | null,
  reporterEmail: string | null,
  title: string,
  description: string,
  pageUrl: string | null,
  errorMessage: string | null,
  errorStack: string | null,
  browserInfo: string | null,
  reportId: number,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const isAutoReport = !!errorMessage;
    const subject = isAutoReport
      ? `[Auto] Bug Report #${reportId}: ${title}`
      : `Bug Report #${reportId}: ${title}`;

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">${isAutoReport ? "Automatic Error Report" : "Bug Report"}</h2>
        <p>A new bug report has been submitted.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Report ID:</td><td style="padding: 10px;">#${reportId}</td></tr>
          ${reporterName ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Reporter:</td><td style="padding: 10px;">${reporterName}</td></tr>` : ""}
          ${reporterEmail ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Email:</td><td style="padding: 10px;">${reporterEmail}</td></tr>` : ""}
          ${pageUrl ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Page URL:</td><td style="padding: 10px;">${pageUrl}</td></tr>` : ""}
          ${browserInfo ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Browser:</td><td style="padding: 10px;">${browserInfo}</td></tr>` : ""}
        </table>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Title:</p>
          <p style="margin: 0 0 16px 0;">${title}</p>
          <p style="margin: 0 0 8px 0; font-weight: bold;">Description:</p>
          <p style="margin: 0; white-space: pre-wrap;">${description}</p>
        </div>
        ${errorMessage ? `<div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;"><p style="margin: 0 0 8px 0; font-weight: bold; color: #991b1b;">Error Message:</p><p style="margin: 0; font-family: monospace; font-size: 13px; color: #991b1b;">${errorMessage}</p>${errorStack ? `<pre style="margin: 16px 0 0 0; font-family: monospace; font-size: 11px; color: #991b1b; overflow-x: auto; white-space: pre-wrap;">${errorStack}</pre>` : ""}</div>` : ""}
      </div>`;

    await client.emails.send({ from: fromEmail || "noreply@artisantile.com", to: "ed@risevm.com", subject, html: bodyHtml });
    return true;
  } catch (error) {
    console.error("Failed to send bug report notification:", error);
    return false;
  }
}
