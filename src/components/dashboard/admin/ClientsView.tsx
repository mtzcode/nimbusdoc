import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ClientForm from "./ClientForm";
import ClientsList from "./ClientsList";
import ClientDetails from "./ClientDetails";
import ClientEditForm from "./ClientEditForm";
import { useAuth } from "@/contexts/AuthContext";

interface Client {
  id: string;
  name: string;
  cnpj: string;
  created_at: string;
}

const ClientsView = () => {
  const { userRole, appPermissions } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit =
    userRole === "admin" || (userRole === "user" && (appPermissions?.user_can_edit_clients ?? false));

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const canLoad = userRole === "admin" || userRole === "user";
    if (canLoad) {
      void fetchClients();
    } else {
      setLoading(false);
    }
  }, [userRole]);

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
          void fetchClients();
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
          void fetchClients();
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
      <ClientsList
        clients={clients}
        loading={loading}
        onSelectClient={setSelectedClient}
        onEditClient={setEditingClient}
        canEdit={canEdit}
      />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsView;
