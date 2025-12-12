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
