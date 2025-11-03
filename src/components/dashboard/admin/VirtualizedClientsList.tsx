import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { Building2 } from "lucide-react";
import type { Client } from "@/features/clients/api";
import { VIRTUAL_LIST_HEIGHT } from "@/lib/config";

interface VirtualizedClientsListProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  canEdit?: boolean;
  height?: number;
}
const VirtualizedClientsList = ({ clients, onSelectClient, onEditClient, canEdit = false, height = VIRTUAL_LIST_HEIGHT }: VirtualizedClientsListProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const headerHeight = 48;

  const rowVirtualizer = useVirtualizer({
    count: clients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  const items = useMemo(() => clients, [clients]);

  return (
    <div className="space-y-2">
      <div ref={parentRef} style={{ height, overflow: "auto" }} className="border rounded-md">
        {/* Sticky header inside scroll container */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b bg-background sticky top-0 z-10 px-3 py-2">
          <div className="text-sm font-medium text-muted-foreground">Cliente</div>
          <div className="text-sm font-medium text-muted-foreground">CNPJ</div>
          <div className="text-sm font-medium text-muted-foreground">Data de Cadastro</div>
          <div className="text-sm font-medium text-muted-foreground text-right">Ações</div>
        </div>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", paddingTop: headerHeight }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const client = items[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b px-3 py-2"
              >
                <div className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {client.name}
                </div>
                <div>{client.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</div>
                <div>{new Date(client.created_at).toLocaleDateString("pt-BR")}</div>
                <div className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onSelectClient(client)}>
                    Ver Detalhes
                  </Button>
                  {canEdit && (
                    <Button variant="secondary" size="sm" onClick={() => onEditClient(client)}>
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedClientsList;