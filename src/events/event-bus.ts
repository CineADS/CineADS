/**
 * Event Bus — barramento de eventos interno para comunicação desacoplada entre módulos.
 * Padrão Pub/Sub simples. Preparado para futura migração para message broker (Redis, RabbitMQ).
 */
import { logger } from "@/lib/logger";
import type { DomainEvent, DomainEventType, EventHandler } from "./event-types";

type HandlerEntry = {
  handler: EventHandler<any>;
  module: string;
};

const subscribers = new Map<DomainEventType, HandlerEntry[]>();
let eventCounter = 0;

export const eventBus = {
  /**
   * Registrar handler para um tipo de evento.
   * @param eventType Tipo do evento
   * @param handler Função assíncrona que processa o evento
   * @param module Nome do módulo que registrou (para logs)
   */
  on<T = Record<string, unknown>>(
    eventType: DomainEventType,
    handler: EventHandler<T>,
    module = "unknown"
  ): void {
    const existing = subscribers.get(eventType) || [];
    existing.push({ handler, module });
    subscribers.set(eventType, existing);
    logger.debug("eventBus.on", { eventType, module });
  },

  /**
   * Remover todos os handlers de um módulo específico.
   */
  offModule(module: string): void {
    for (const [eventType, handlers] of subscribers.entries()) {
      const filtered = handlers.filter((h) => h.module !== module);
      if (filtered.length === 0) {
        subscribers.delete(eventType);
      } else {
        subscribers.set(eventType, filtered);
      }
    }
    logger.debug("eventBus.offModule", { module });
  },

  /**
   * Emitir evento para todos os subscribers registrados.
   * Handlers são executados em paralelo, erros são isolados.
   */
  async emit<T = Record<string, unknown>>(
    type: DomainEventType,
    tenantId: string,
    payload: T,
    source: string,
    marketplace?: string
  ): Promise<void> {
    eventCounter++;
    const event: DomainEvent<T> = {
      id: `evt_${Date.now()}_${eventCounter}`,
      type,
      tenantId,
      payload,
      source,
      marketplace,
      createdAt: new Date(),
    };

    const handlers = subscribers.get(type) || [];
    if (handlers.length === 0) {
      logger.debug("eventBus.emit: no handlers", { type });
      return;
    }

    logger.info("eventBus.emit", {
      type,
      tenantId,
      source,
      handlerCount: handlers.length,
    });

    const results = await Promise.allSettled(
      handlers.map(async ({ handler, module }) => {
        try {
          await handler(event);
        } catch (err) {
          logger.error("eventBus: handler failed", {
            type,
            module,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      logger.warn("eventBus.emit: some handlers failed", { type, failed, total: handlers.length });
    }
  },

  /** Retornar quantidade de handlers registrados por tipo */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [type, handlers] of subscribers.entries()) {
      stats[type] = handlers.length;
    }
    return stats;
  },

  /** Limpar todos os handlers (para testes) */
  clear(): void {
    subscribers.clear();
    logger.debug("eventBus.clear");
  },
};
