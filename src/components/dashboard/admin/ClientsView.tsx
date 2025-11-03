import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ClientForm from "./ClientForm";
import ClientsList from "./ClientsList";
import VirtualizedClientsList from "./VirtualizedClientsList";
import ClientDetails from "./ClientDetails";
import ClientEditForm from "./ClientEditForm";
import { useAuth } from "@/contexts/AuthContext";
import { listClients, type Client } from "@/features/clients/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useRealtimeClientsSync } from "@/lib/realtimeSync";
import { VIRTUAL_LIST_THRESHOLD } from "@/lib/config";

const ClientsView = () => {
  const { userRole, appPermissions } = useAuth();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  const canEdit =
    userRole === "admin" || (userRole === "user" && (appPermissions?.user_can_edit_clients ?? false));

  const canLoad = userRole === "admin" || userRole === "user";

  const { data: clients = [], isLoading: loading } = useQuery<Client[]>({
    queryKey: queryKeys.clients(),
    queryFn: async () => {
      const response = await listClients();
      if (!response.success) {
        throw new Error(response.error || "Erro ao carregar clientes");
      }
      return response.data || [];
    },
    enabled: canLoad,
  });

  // Realtime cache reconciliation for clients
  useRealtimeClientsSync(canLoad);

  if (selectedClient) {
    return (
      <ClientDetails
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  if (showForm) {
    return (
      <ClientForm
        onSuccess={() => {
          setShowForm(false);
          void queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (editingClient) {
    return (
      <ClientEditForm
        client={editingClient}
        onSuccess={() => {
          setEditingClient(null);
          void queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
        }}
        onCancel={() => setEditingClient(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes fiscais</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Total de {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
      {clients.length > VIRTUAL_LIST_THRESHOLD ? (
        <VirtualizedClientsList
          clients={clients}
          onSelectClient={setSelectedClient}
          onEditClient={setEditingClient}
          canEdit={canEdit}
        />
      ) : (
        <ClientsList
          clients={clients}
          loading={loading}
          onSelectClient={setSelectedClient}
          onEditClient={setEditingClient}
          canEdit={canEdit}
        />
      )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsView;
