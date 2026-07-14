import admin from 'firebase-admin';
import { config } from '../config';

let initialized = false;

export function isFcmConfigured(): boolean {
  return Boolean(
    config.fcm.serviceAccountPath ||
      (config.fcm.projectId && config.fcm.clientEmail && config.fcm.privateKey),
  );
}

function initFcm(): boolean {
  if (initialized) return true;
  if (!isFcmConfigured()) return false;

  try {
    if (config.fcm.serviceAccountPath) {
      admin.initializeApp({
        credential: admin.credential.cert(config.fcm.serviceAccountPath),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.fcm.projectId!,
          clientEmail: config.fcm.clientEmail!,
          privateKey: config.fcm.privateKey!,
        }),
      });
    }
    initialized = true;
    return true;
  } catch (err) {
    console.warn('[fcm] Failed to initialize:', (err as Error).message);
    return false;
  }
}

export async function sendTopicPush(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; messageId?: string; error?: string; configured: boolean }> {
  if (!initFcm()) {
    console.warn(`[fcm] Not configured — refusing stub push to "${topic}": ${title}`);
    return {
      success: false,
      configured: false,
      error: 'FCM is not configured on this server',
    };
  }

  try {
    const messageId = await admin.messaging().send({
      topic,
      notification: { title, body },
      data: data ?? {},
    });
    return { success: true, configured: true, messageId };
  } catch (err) {
    return { success: false, configured: true, error: (err as Error).message };
  }
}

export function resolveTopic(topic: string): string {
  if (topic.startsWith(config.fcm.topicPrefix)) return topic;
  return `${config.fcm.topicPrefix}_${topic}`;
}
