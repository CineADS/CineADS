/**
 * Stream Consumer — consome eventos de streams com processamento paralelo.
 * Suporta consumer groups para distribuição de carga.
 */
import { logger } from "@/lib/logger";
import { streamPublisher, type StreamMessage } from "./stream-publisher";

export type StreamHandler = (message: StreamMessage) => Promise<void>;

interface ConsumerConfig {
  streamName: string;
  groupName: string;
  handler: StreamHandler;
  batchSize: number;
  pollIntervalMs: number;
  maxConcurrency: number;
}

interface ActiveConsumer {
  config: ConsumerConfig;
  intervalId: ReturnType<typeof setInterval>;
  processing: boolean;
  processedCount: number;
  errorCount: number;
}

const consumers = new Map<string, ActiveConsumer>();

export const streamConsumer = {
  /** Register and start a consumer */
  start(config: ConsumerConfig): string {
    const consumerId = `${config.groupName}:${config.streamName}:${Date.now()}`;

    const intervalId = setInterval(async () => {
      const consumer = consumers.get(consumerId);
      if (!consumer || consumer.processing) return;

      consumer.processing = true;
      try {
        const messages = streamPublisher.getPending(config.streamName, config.batchSize);
        if (messages.length === 0) {
          consumer.processing = false;
          return;
        }

        // Process in batches respecting maxConcurrency
        for (let i = 0; i < messages.length; i += config.maxConcurrency) {
          const batch = messages.slice(i, i + config.maxConcurrency);
          const results = await Promise.allSettled(
            batch.map(async (msg) => {
              await config.handler(msg);
              streamPublisher.acknowledge(config.streamName, msg.id);
            })
          );

          for (const r of results) {
            if (r.status === "fulfilled") consumer.processedCount++;
            else {
              consumer.errorCount++;
              logger.error("streamConsumer: handler error", {
                consumerId,
                error: r.reason instanceof Error ? r.reason.message : String(r.reason),
              });
            }
          }
        }
      } catch (err) {
        logger.error("streamConsumer: poll error", { consumerId, error: err });
      } finally {
        consumer.processing = false;
      }
    }, config.pollIntervalMs);

    consumers.set(consumerId, {
      config,
      intervalId,
      processing: false,
      processedCount: 0,
      errorCount: 0,
    });

    logger.info("streamConsumer.start", { consumerId, streamName: config.streamName });
    return consumerId;
  },

  /** Stop a consumer */
  stop(consumerId: string): void {
    const consumer = consumers.get(consumerId);
    if (!consumer) return;
    clearInterval(consumer.intervalId);
    consumers.delete(consumerId);
    logger.info("streamConsumer.stop", { consumerId });
  },

  /** Stop all consumers */
  stopAll(): void {
    for (const [id, consumer] of consumers.entries()) {
      clearInterval(consumer.intervalId);
      consumers.delete(id);
    }
    logger.info("streamConsumer.stopAll");
  },

  /** Get consumer stats */
  getStats(): Record<string, { processed: number; errors: number; stream: string }> {
    const stats: Record<string, { processed: number; errors: number; stream: string }> = {};
    for (const [id, consumer] of consumers.entries()) {
      stats[id] = {
        processed: consumer.processedCount,
        errors: consumer.errorCount,
        stream: consumer.config.streamName,
      };
    }
    return stats;
  },
};
