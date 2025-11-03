import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

type Row = { id: string } & Record<string, unknown>;

export function useRealtimeClientsSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("realtime:public:clients")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Row; old: Row }) => {
          queryClient.setQueryData<Row[]>(queryKeys.clients(), (prev = []) => {
            const byId = new Map(prev.map((r) => [String(r.id), r]));

            if (payload.eventType === "INSERT") {
              const row = payload.new;
              if (!byId.has(String(row.id))) {
                return [row, ...prev];
              }
              return prev.map((r) => (String(r.id) === String(row.id) ? row : r));
            }

            if (payload.eventType === "UPDATE") {
              const row = payload.new;
              return prev.map((r) => (String(r.id) === String(row.id) ? row : r));
            }

            if (payload.eventType === "DELETE") {
              const row = payload.old;
              return prev.filter((r) => String(r.id) !== String(row.id));
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}