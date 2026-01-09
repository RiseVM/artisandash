// Resend integration for email notifications
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
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
