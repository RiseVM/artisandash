// Notification scheduler for automatic email reminders
import { storage } from "./storage";
import { sendSampleReminder, type NotificationType } from "./emailService";
import { format, differenceInDays, parseISO } from "date-fns";

export async function checkAndSendNotifications(): Promise<{
  sent: number;
  errors: number;
  details: string[];
}> {
  const results = {
    sent: 0,
    errors: 0,
    details: [] as string[]
  };

  try {
    const checkoutViews = await storage.getCheckoutViews();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const checkout of checkoutViews) {
      if (checkout.status === 'returned') {
        continue;
      }

      const dueDate = parseISO(checkout.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = differenceInDays(dueDate, today);

      let notificationType: NotificationType | null = null;

      if (daysUntilDue < 0) {
        notificationType = 'overdue';
        if (checkout.status !== 'overdue') {
          await storage.updateCheckout(checkout.id, { status: 'overdue' });
        }
      } else if (daysUntilDue === 1) {
        notificationType = '1_day_reminder';
      } else if (daysUntilDue === 7) {
        notificationType = '7_day_reminder';
      }

      if (notificationType) {
        const alreadySent = await storage.hasNotificationBeenSent(checkout.id, notificationType);
        
        if (!alreadySent) {
          const success = await sendSampleReminder(
            checkout.customer.email,
            checkout.customer.name,
            checkout.item.name,
            format(dueDate, 'MMMM d, yyyy'),
            notificationType
          );

          if (success) {
            await storage.createNotification({
              checkout_id: checkout.id,
              notification_type: notificationType
            });
            results.sent++;
            results.details.push(`Sent ${notificationType} to ${checkout.customer.email} for ${checkout.item.name}`);
          } else {
            results.errors++;
            results.details.push(`Failed to send ${notificationType} to ${checkout.customer.email}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in notification scheduler:', error);
    results.errors++;
    results.details.push(`Scheduler error: ${error}`);
  }

  return results;
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(intervalMinutes: number = 60) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`Starting notification scheduler (checking every ${intervalMinutes} minutes)`);
  
  checkAndSendNotifications().then(results => {
    console.log(`Initial notification check: ${results.sent} sent, ${results.errors} errors`);
  });

  schedulerInterval = setInterval(async () => {
    console.log('Running scheduled notification check...');
    const results = await checkAndSendNotifications();
    console.log(`Notification check complete: ${results.sent} sent, ${results.errors} errors`);
  }, intervalMinutes * 60 * 1000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Notification scheduler stopped');
  }
}
