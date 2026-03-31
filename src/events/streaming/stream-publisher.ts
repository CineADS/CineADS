/**
 * Stream Publisher — publica eventos em streams para processamento escalável.
 * Implementação in-memory preparada para migração a Kafka/Redis Streams.
 */
import { logger } from "@/lib/logger";
import type { DomainEvent, DomainEventType } from "../event-types";

export interface StreamMessage {
  id: string;
  streamName: string;
  event: DomainEvent;
  publishedAt: number;
  acknowledged: boolean;
}

const streams = new Map<string, StreamMessage[]>();
let messageCounter = 0;

export const streamPublisher = {
  /** Publish event to a named stream */
  publish(streamName: string, event: DomainEvent): string {
    messageCounter++;
    const msgId = `msg_${Date.now()}_${messageCounter}`;
    const message: StreamMessage = {
      id: msgId,
      streamName,
      event,
      publishedAt: Date.now(),
      acknowledged: false,
    };

    const stream = streams.get(streamName) || [];
    stream.push(message);
    streams.set(streamName, stream);

    logger.debug("streamPublisher.publish", { streamName, eventType: event.type, msgId });
    return msgId;
  },

  /** Publish to stream based on event type automatically */
  publishAuto(event: DomainEvent): string {
    const streamName = this.getStreamForEventType(event.type);
    return this.publish(streamName, event);
  },

  /** Map event types to streams */
  getStreamForEventType(type: DomainEventType): string {
    if (type.startsWith("ORDER_")) return "stream:orders";
    if (type.startsWith("PRODUCT_")) return "stream:products";
    if (type.startsWith("STOCK_")) return "stream:inventory";
    if (type.startsWith("PRICE_")) return "stream:prices";
    if (type.startsWith("SYNC_")) return "stream:sync";
    if (type.startsWith("AUTOMATION_")) return "stream:automation";
    return "stream:default";
  },

  /** Get pending messages from a stream */
  getPending(streamName: string, limit = 100): StreamMessage[] {
    const stream = streams.get(streamName) || [];
    return stream.filter((m) => !m.acknowledged).slice(0, limit);
  },

  /** Acknowledge a message */
  acknowledge(streamName: string, messageId: string): boolean {
    const stream = streams.get(streamName);
    if (!stream) return false;
    const msg = stream.find((m) => m.id === messageId);
    if (!msg) return false;
    msg.acknowledged = true;
    return true;
  },

  /** Get stream stats */
  getStats(): Record<string, { total: number; pending: number; acknowledged: number }> {
    const stats: Record<string, { total: number; pending: number; acknowledged: number }> = {};
    for (const [name, messages] of streams.entries()) {
      const pending = messages.filter((m) => !m.acknowledged).length;
      stats[name] = { total: messages.length, pending, acknowledged: messages.length - pending };
    }
    return stats;
  },

  /** Trim acknowledged messages older than maxAge (ms) */
  trim(maxAgeMs = 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let trimmed = 0;
    for (const [name, messages] of streams.entries()) {
      const before = messages.length;
      const filtered = messages.filter((m) => !m.acknowledged || m.publishedAt > cutoff);
      streams.set(name, filtered);
      trimmed += before - filtered.length;
    }
    return trimmed;
  },

  /** Clear all streams (for tests) */
  clear(): void {
    streams.clear();
    messageCounter = 0;
  },
};
