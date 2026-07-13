import admin from 'firebase-admin';
import { config } from '../config';

let initialized = false;

function initFcm(): boolean {
  if (initialized) return true;

  try {
    if (config.fcm.serviceAccountPath) {
      admin.initializeApp({
        credential: admin.credential.cert(config.fcm.serviceAccountPath),
      });
    } else if (config.fcm.projectId && config.fcm.clientEmail && config.fcm.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.fcm.projectId,
          clientEmail: config.fcm.clientEmail,
          privateKey: config.fcm.privateKey,
        }),
      });
    } else {
      return false;
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
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!initFcm()) {
    console.log(`[fcm] Stub push to topic "${topic}": ${title}`);
    return { success: true, messageId: 'stub-' + Date.now() };
  }

  try {
    const messageId = await admin.messaging().send({
      topic,
      notification: { title, body },
      data: data ?? {},
    });
    return { success: true, messageId };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function resolveTopic(topic: string): string {
  if (topic.startsWith(config.fcm.topicPrefix)) return topic;
  return `${config.fcm.topicPrefix}_${topic}`;
}
