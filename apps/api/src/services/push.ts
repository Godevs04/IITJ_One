/**
 * Topic push dispatch — shared by the admin Push page (send + retry) and, later, AI Admin and other
 * flows that notify users. Moved unchanged out of routes/admin/push.ts: same FCM call, same push-history
 * record, same notices version bump + audit entry on success.
 */
import { sendTopicPush, resolveTopic } from './fcm';
import { addPushHistory, bumpVersion } from '../store';
import type { PushHistoryDoc } from '../types';

export interface TopicPushInput {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export type TopicPushOutcome =
  | {
      outcome: 'sent';
      topic: string;
      recipientCount: number;
      successCount: number;
      failureCount: number;
      firebaseMessageIds: string[];
      history: PushHistoryDoc;
    }
  | { outcome: 'not_configured'; error: string; history: PushHistoryDoc }
  | { outcome: 'failed'; error: string; history: PushHistoryDoc };

export async function dispatchTopicPush(input: TopicPushInput, sentBy: string, retryOf?: string): Promise<TopicPushOutcome> {
  const { topic, title, body, data, imageUrl } = input;
  const resolvedTopic = resolveTopic(topic);
  const result = await sendTopicPush(resolvedTopic, title, body, data, imageUrl);

  const historyEntry: Omit<PushHistoryDoc, '_id'> = {
    title,
    body,
    topic: resolvedTopic,
    data,
    imageUrl,
    sentBy,
    sentAt: new Date(),
    successCount: result.successCount,
    failureCount: result.failureCount,
    firebaseMessageIds: result.firebaseMessageIds,
    errors: result.errors,
    configured: result.configured,
    ...(retryOf ? { retryOf } : {}),
  };
  const saved = await addPushHistory(historyEntry);

  if (!result.configured) {
    return { outcome: 'not_configured', error: result.errors[0] ?? 'FCM is not configured', history: saved };
  }
  if (!result.success) {
    return { outcome: 'failed', error: result.errors[0] ?? 'Push failed', history: saved };
  }

  await bumpVersion('notices', 'iitj', sentBy, 'push', `Push to ${resolvedTopic}: ${title}`);
  return {
    outcome: 'sent',
    topic: resolvedTopic,
    recipientCount: result.recipientCount,
    successCount: result.successCount,
    failureCount: result.failureCount,
    firebaseMessageIds: result.firebaseMessageIds,
    history: saved,
  };
}

/** The admin API's existing HTTP contract for a dispatch outcome (status codes and body shape unchanged). */
export function topicPushHttpResponse(o: TopicPushOutcome): { status: number; payload: Record<string, unknown> } {
  switch (o.outcome) {
    case 'not_configured':
      return { status: 503, payload: { error: o.error, history: o.history } };
    case 'failed':
      return { status: 502, payload: { error: o.error, history: o.history } };
    case 'sent':
      return {
        status: 200,
        payload: {
          success: true,
          topic: o.topic,
          recipientCount: o.recipientCount,
          successCount: o.successCount,
          failureCount: o.failureCount,
          firebaseMessageIds: o.firebaseMessageIds,
          history: o.history,
        },
      };
  }
}
