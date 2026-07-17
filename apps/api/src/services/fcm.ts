import admin from 'firebase-admin';
import { config } from '../config';
import { getDevicesByTopic, recordDeviceDeliveryResults } from '../store';

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

/** Firebase error codes that mean the token is permanently dead — safe to deactivate immediately rather than waiting for repeated failures. */
const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export interface SendTopicPushResult {
  success: boolean;
  configured: boolean;
  successCount: number;
  failureCount: number;
  firebaseMessageIds: string[];
  errors: string[];
  recipientCount: number;
}

const MULTICAST_CHUNK_SIZE = 500; // FCM's hard limit per sendEachForMulticast call

/**
 * Sends to every device registered for `topic` (our own devices collection,
 * not Firebase's native topic broadcast) via sendEachForMulticast. This is
 * the only FCM API that returns per-token success/failure, which is what
 * lets us report real delivery counts and deactivate dead tokens — a native
 * topic broadcast (`send({ topic })`) reports neither.
 */
export async function sendTopicPush(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string,
): Promise<SendTopicPushResult> {
  if (!initFcm()) {
    console.warn(`[fcm] Not configured — refusing stub push to "${topic}": ${title}`);
    return {
      success: false,
      configured: false,
      successCount: 0,
      failureCount: 0,
      firebaseMessageIds: [],
      errors: ['FCM is not configured on this server'],
      recipientCount: 0,
    };
  }

  const devices = await getDevicesByTopic(topic);
  if (devices.length === 0) {
    return {
      success: true,
      configured: true,
      successCount: 0,
      failureCount: 0,
      firebaseMessageIds: [],
      errors: [],
      recipientCount: 0,
    };
  }

  const firebaseMessageIds: string[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  const deliveryResults: Array<{ token: string; success: boolean; invalid: boolean; previousFailureCount: number }> = [];

  try {
    for (let i = 0; i < devices.length; i += MULTICAST_CHUNK_SIZE) {
      const chunk = devices.slice(i, i + MULTICAST_CHUNK_SIZE);
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk.map((d) => d.token),
        notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
        data: data ?? {},
      });

      response.responses.forEach((r, idx) => {
        const device = chunk[idx];
        if (r.success) {
          successCount += 1;
          if (r.messageId) firebaseMessageIds.push(r.messageId);
          deliveryResults.push({
            token: device.token,
            success: true,
            invalid: false,
            previousFailureCount: device.failureCount,
          });
        } else {
          failureCount += 1;
          const code = (r.error as { code?: string } | undefined)?.code ?? 'unknown';
          errors.push(`${device.token.slice(0, 12)}…: ${code}`);
          deliveryResults.push({
            token: device.token,
            success: false,
            invalid: INVALID_TOKEN_ERROR_CODES.has(code),
            previousFailureCount: device.failureCount,
          });
        }
      });
    }

    await recordDeviceDeliveryResults(deliveryResults);

    return {
      success: true,
      configured: true,
      successCount,
      failureCount,
      firebaseMessageIds,
      errors,
      recipientCount: devices.length,
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      successCount,
      failureCount,
      firebaseMessageIds,
      errors: [...errors, (err as Error).message],
      recipientCount: devices.length,
    };
  }
}

export function resolveTopic(topic: string): string {
  if (topic.startsWith(config.fcm.topicPrefix)) return topic;
  return `${config.fcm.topicPrefix}_${topic}`;
}
