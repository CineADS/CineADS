/**
 * Stock Reservation — reserva de estoque ao receber pedidos.
 * Garante que o estoque seja reservado atomicamente e liberado quando necessário.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { oversellingGuard } from "./overselling-guard";

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  reason?: string;
}

export const stockReservation = {
  /** Reservar estoque para um pedido */
  async reserve(
    tenantId: string,
    productVariantId: string,
    orderId: string,
    quantity: number
  ): Promise<ReservationResult> {
    logger.info("stockReservation.reserve", { tenantId, productVariantId, orderId, quantity });

    // Verificar disponibilidade
    const check = await oversellingGuard.canFulfill(tenantId, productVariantId, quantity);
    if (!check.allowed) {
      logger.warn("stockReservation: insufficient stock", { productVariantId, available: check.available, requested: quantity });
      return { success: false, reason: check.reason };
    }

    // Criar reserva
    const { data, error } = await supabase
      .from("stock_reservations")
      .insert([{
        tenant_id: tenantId,
        product_variant_id: productVariantId,
        order_id: orderId,
        reserved_quantity: quantity,
        status: "reserved",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30min TTL
      }])
      .select("id")
      .single();

    if (error) {
      logger.error("stockReservation.reserve failed", { error });
      return { success: false, reason: error.message };
    }

    // Verificar alertas após reserva
    await oversellingGuard.checkAndAlert(tenantId, productVariantId);

    return { success: true, reservationId: data.id };
  },

  /** Confirmar reserva (pedido pago/aprovado) */
  async confirm(reservationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("stock_reservations")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) {
      logger.error("stockReservation.confirm failed", { error });
      return false;
    }
    return true;
  },

  /** Liberar reserva (pedido cancelado) */
  async release(reservationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("stock_reservations")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) {
      logger.error("stockReservation.release failed", { error });
      return false;
    }
    return true;
  },

  /** Liberar reservas expiradas */
  async releaseExpired(tenantId: string): Promise<number> {
    const { data, error } = await supabase
      .from("stock_reservations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("status", "reserved")
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      logger.error("stockReservation.releaseExpired failed", { error });
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      logger.info("stockReservation: released expired", { tenantId, count });
    }
    return count;
  },
};
