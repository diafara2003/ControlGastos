import webpush from "web-push";
import { createServiceClient } from "@/src/shared/api/supabase/service";

// Configure VAPID keys on first use
let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:noreply@miscuentas.app";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured");
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  actions?: { action: string; title: string }[];
}

/**
 * Send a push notification to a specific user.
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  ensureConfigured();

  const supabase = createServiceClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // If subscription expired/invalid (410 Gone or 404), remove it
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
    }
  }

  return { sent, failed };
}
