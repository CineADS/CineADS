import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";

/**
 * Subscribes to Supabase Realtime on the notifications table for the given tenant.
 * On INSERT → shows a toast + invalidates bell/page queries.
 * On UPDATE → invalidates queries silently (e.g. read-status changes).
 *
 * Call this once in a always-mounted component (NotificationsBell / Topbar).
 * The NotificationsPage benefits automatically via shared query key invalidation.
 *
 * Requires: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
 */
export function useNotificationsRealtime(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`notifications-rt:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message?: string };
          toast(n.title, {
            description: n.message,
            icon:        "🔔",
            duration:    5000,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["all-notifications", tenantId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "notifications",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications-unread", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["all-notifications", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}
