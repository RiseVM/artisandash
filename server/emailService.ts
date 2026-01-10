// Resend integration for email notifications
import { Resend } from 'resend';

// Use environment variable directly for API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'showroom@artisantilect.com';

export async function getUncachableResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return {
    client: new Resend(RESEND_API_KEY),
    fromEmail: FROM_EMAIL
  };
}

export type NotificationType = '7_day_reminder' | '1_day_reminder' | 'overdue';

export async function sendSampleReminder(
  customerEmail: string,
  customerName: string,
  sampleName: string,
  dueDate: string,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    let subject: string;
    let bodyHtml: string;
    
    switch (notificationType) {
      case '7_day_reminder':
        subject = `Reminder: Your sample is due in 7 days`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Sample Return Reminder</h2>
            <p>Dear ${customerName},</p>
            <p>This is a friendly reminder that your sample <strong>${sampleName}</strong> is due for return in 7 days on <strong>${dueDate}</strong>.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath before the due date to avoid any late fees.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>
        `;
        break;
      case '1_day_reminder':
        subject = `Urgent: Your sample is due tomorrow`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Sample Return - Due Tomorrow</h2>
            <p>Dear ${customerName},</p>
            <p>This is a reminder that your sample <strong>${sampleName}</strong> is due for return <strong>tomorrow (${dueDate})</strong>.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath to avoid any late fees.</p>
            <p>If you need an extension, please contact us as soon as possible.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>
        `;
        break;
      case 'overdue':
        subject = `Action Required: Your sample is overdue`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c0392b;">Sample Overdue Notice</h2>
            <p>Dear ${customerName},</p>
            <p>Your sample <strong>${sampleName}</strong> was due on <strong>${dueDate}</strong> and is now overdue.</p>
            <p>Please return the sample to Artisan Tile Kitchen & Bath immediately to avoid additional charges.</p>
            <p>If you have already returned the sample or need to discuss this, please contact us right away.</p>
            <p>Thank you,<br/>Artisan Tile Kitchen & Bath</p>
          </div>
        `;
        break;
    }

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Email sent to ${customerEmail}: ${notificationType}`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendInstallerFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  projectType: string | null,
  startDate: string | null,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const subject = `Installer Follow Up - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Installer Follow Up</h2>
        <p>A customer has indicated they need an installer. Here are the details:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Customer Name:</td>
            <td style="padding: 10px;">${customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Email:</td>
            <td style="padding: 10px;">${customerEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Phone:</td>
            <td style="padding: 10px;">${customerPhone || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Project Type:</td>
            <td style="padding: 10px;">${projectType || 'Not specified'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Start Date:</td>
            <td style="padding: 10px;">${startDate || 'Not specified'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Sample:</td>
            <td style="padding: 10px;">${sampleName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Checkout Date:</td>
            <td style="padding: 10px;">${checkoutDate}</td>
          </tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td>
            <td style="padding: 10px; white-space: pre-wrap;">${notes}</td>
          </tr>` : ''}
        </table>
        <p>Please follow up with this customer regarding their installation needs.</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: ['showroom@artisantilect.com', 'claudia@artisantilect.com', 'michele@artisantilect.com'],
      subject,
      html: bodyHtml,
    });

    console.log(`Installer follow-up email sent for ${customerName}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send installer follow-up email:`, error);
    return false;
  }
}

export async function sendSpecialRequestFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  specialRequest: string,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const subject = `Sample Special Request - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Sample Special Request</h2>
        <p>A customer has submitted a special request for their sample checkout:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Customer Name:</td>
            <td style="padding: 10px;">${customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Email:</td>
            <td style="padding: 10px;">${customerEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Phone:</td>
            <td style="padding: 10px;">${customerPhone || 'Not provided'}</td>
          </tr>
          ${sampleName ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Sample:</td>
            <td style="padding: 10px;">${sampleName}</td>
          </tr>` : ''}
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Date:</td>
            <td style="padding: 10px;">${checkoutDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; vertical-align: top;">Special Request:</td>
            <td style="padding: 10px; white-space: pre-wrap;">${specialRequest}</td>
          </tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td>
            <td style="padding: 10px; white-space: pre-wrap;">${notes}</td>
          </tr>` : ''}
        </table>
        <p>Please follow up with this customer regarding their special request.</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: 'showroom@artisantilect.com',
      subject,
      html: bodyHtml,
    });

    console.log(`Special request follow-up email sent for ${customerName}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send special request follow-up email:`, error);
    return false;
  }
}

export async function sendDesignerFollowUp(
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  projectType: string | null,
  startDate: string | null,
  sampleName: string | null,
  checkoutDate: string,
  notes: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const subject = `Designer Consultation Request - ${customerName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Designer Consultation Request</h2>
        <p>A customer has indicated they are interested in working with a designer. Here are the details:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Customer Name:</td>
            <td style="padding: 10px;">${customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Email:</td>
            <td style="padding: 10px;">${customerEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Phone:</td>
            <td style="padding: 10px;">${customerPhone || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Project Type:</td>
            <td style="padding: 10px;">${projectType || 'Not specified'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Start Date:</td>
            <td style="padding: 10px;">${startDate || 'Not specified'}</td>
          </tr>
          ${sampleName ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Sample:</td>
            <td style="padding: 10px;">${sampleName}</td>
          </tr>` : ''}
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Date:</td>
            <td style="padding: 10px;">${checkoutDate}</td>
          </tr>
          ${notes ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; vertical-align: top;">Notes:</td>
            <td style="padding: 10px; white-space: pre-wrap;">${notes}</td>
          </tr>` : ''}
        </table>
        <p>Please follow up with this customer regarding their design consultation needs.</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: ['claudia@artisantilect.com', 'michele@artisantilect.com'],
      subject,
      html: bodyHtml,
    });

    console.log(`Designer follow-up email sent for ${customerName}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send designer follow-up email:`, error);
    return false;
  }
}

export async function sendContractEmail(
  customerEmail: string,
  customerName: string,
  contractType: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const contractTypeName = contractType === 'custom_cabinetry'
      ? 'Cabinet Design and Layout Agreement'
      : 'Home Improvement Contract';

    const subject = `Your ${contractTypeName} from Artisan Tile`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${contractTypeName}</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for choosing Artisan Tile Kitchen & Bath. Please find your signed ${contractTypeName.toLowerCase()} attached to this email.</p>
        <p>If you have any questions about your contract, please don't hesitate to contact us.</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath<br/>1200 Boston Post Road<br/>Guilford, CT 06437</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
      attachments: [
        {
          filename: `${contractTypeName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer.toString('base64'),
        }
      ],
    });

    console.log(`Contract email sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send contract email to ${customerEmail}:`, error);
    return false;
  }
}

// ============================================
// CLIENT PORTAL NOTIFICATION EMAILS
// ============================================

// Portal URL - use environment variable or default to production domain
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'https://artisantileshowroom.com/portal';

export async function sendPortalInvite(
  customerEmail: string,
  customerName: string,
  projectName: string,
  tempPassword: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const subject = `You've been invited to the Artisan Tile Client Portal`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Your Project Portal</h2>
        <p>Dear ${customerName},</p>
        <p>You've been invited to access the Artisan Tile client portal to track the progress of your project: <strong>${projectName}</strong>.</p>
        <p>Through the portal, you can:</p>
        <ul>
          <li>View project progress and phase updates</li>
          <li>Approve change orders</li>
          <li>View project photos and documents</li>
          <li>Communicate directly with our team</li>
        </ul>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
          <p style="margin: 0;">Email: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${customerEmail}</code></p>
          <p style="margin: 10px 0 0 0;">Temporary Password: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
        </div>
        <p>
          <a href="${PORTAL_BASE_URL}/login" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Access Your Portal
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">For security, we recommend changing your password after your first login.</p>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Portal invite sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send portal invite to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendPortalPasswordReset(
  customerEmail: string,
  customerName: string,
  newPassword: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const subject = `Your Artisan Tile Portal Password Has Been Reset`;
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
        <p>
          <a href="${PORTAL_BASE_URL}/login" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Login to Portal
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you did not request this password reset, please contact us immediately.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Password reset email sent to ${customerEmail}:`, result);
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
  senderName: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const subject = `New Message on Your Project: ${projectName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">You Have a New Message</h2>
        <p>Dear ${customerName},</p>
        <p>You have received a new message regarding your project <strong>${projectName}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c3e50;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">From: ${senderName}</p>
          <p style="margin: 0; white-space: pre-wrap;">${messagePreview.length > 200 ? messagePreview.substring(0, 200) + '...' : messagePreview}</p>
        </div>
        <p>
          <a href="${PORTAL_BASE_URL}" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Message & Reply
          </a>
        </p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Message notification sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send message notification to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendChangeOrderApprovalNeeded(
  customerEmail: string,
  customerName: string,
  projectName: string,
  coNumber: number,
  coTitle: string,
  costImpact: string | null,
  description: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const subject = `Action Required: Change Order Approval for ${projectName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e67e22;">Change Order Requires Your Approval</h2>
        <p>Dear ${customerName},</p>
        <p>A change order for your project <strong>${projectName}</strong> requires your approval.</p>
        <div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e67e22;">
          <p style="margin: 0 0 8px 0;"><strong>Change Order #${coNumber}: ${coTitle}</strong></p>
          ${costImpact ? `<p style="margin: 0 0 8px 0;">Cost Impact: <strong>${costImpact}</strong></p>` : ''}
          ${description ? `<p style="margin: 0; color: #666;">${description.length > 200 ? description.substring(0, 200) + '...' : description}</p>` : ''}
        </div>
        <p>
          <a href="${PORTAL_BASE_URL}" style="display: inline-block; background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review & Approve
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Please log in to your portal to review the full details and provide your approval.</p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Change order approval notification sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send change order notification to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendPhaseCompletedNotification(
  customerEmail: string,
  customerName: string,
  projectName: string,
  phaseName: string,
  nextPhaseName: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const subject = `Project Update: ${phaseName} Completed - ${projectName}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Phase Completed!</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! The <strong>${phaseName}</strong> phase of your project <strong>${projectName}</strong> has been completed.</p>
        ${nextPhaseName ? `
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <p style="margin: 0;"><strong>Next Phase:</strong> ${nextPhaseName}</p>
        </div>
        ` : `
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <p style="margin: 0;"><strong>Congratulations!</strong> This was the final phase of your project.</p>
        </div>
        `}
        <p>
          <a href="${PORTAL_BASE_URL}" style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Project Progress
          </a>
        </p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Phase completed notification sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send phase completed notification to ${customerEmail}:`, error);
    return false;
  }
}

export async function sendDeliveryUpdateNotification(
  customerEmail: string,
  customerName: string,
  projectName: string,
  deliveryDescription: string,
  newStatus: string,
  expectedDate: string | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const statusLabels: Record<string, string> = {
      ordered: 'Ordered',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      delayed: 'Delayed',
    };

    const statusColors: Record<string, string> = {
      ordered: '#3498db',
      shipped: '#9b59b6',
      in_transit: '#f39c12',
      delivered: '#27ae60',
      delayed: '#e74c3c',
    };

    const statusLabel = statusLabels[newStatus] || newStatus;
    const statusColor = statusColors[newStatus] || '#2c3e50';

    const subject = `Delivery Update: ${deliveryDescription} - ${statusLabel}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor};">Delivery Status Update</h2>
        <p>Dear ${customerName},</p>
        <p>There's an update on a delivery for your project <strong>${projectName}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <p style="margin: 0 0 8px 0;"><strong>${deliveryDescription}</strong></p>
          <p style="margin: 0 0 8px 0;">Status: <span style="color: ${statusColor}; font-weight: bold;">${statusLabel}</span></p>
          ${expectedDate ? `<p style="margin: 0; color: #666;">Expected: ${expectedDate}</p>` : ''}
        </div>
        <p>
          <a href="${PORTAL_BASE_URL}" style="display: inline-block; background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View All Deliveries
          </a>
        </p>
        <p>Best regards,<br/>Artisan Tile Kitchen & Bath</p>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail || 'noreply@artisantile.com',
      to: customerEmail,
      subject,
      html: bodyHtml,
    });

    console.log(`Delivery update notification sent to ${customerEmail}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send delivery update notification to ${customerEmail}:`, error);
    return false;
  }
}
