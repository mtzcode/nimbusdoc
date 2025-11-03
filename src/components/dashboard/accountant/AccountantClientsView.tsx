import { useState, useEffect, useCallback } from "react";
// Supabase removido: usar API centralizada de clientes
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ClientDetails from "../admin/ClientDetails";
import { listAccountantClients, type Client } from "@/features/clients/api";


const AccountantClientsView = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) return;

    try {
      const response = await listAccountantClients(user.id);
      if (!response.success) throw new Error(response.error || "Erro ao carregar clientes");
      setClients(response.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error fetching clients:", message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  if (selectedClient) {
    return (
      <ClientDetails
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Clientes</h1>
        <p className="text-muted-foreground">Clientes vinculados à sua contabilidade</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Total de {clients.length} cliente{clients.length !== 1 ? "s" : ""} vinculado{clients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4 inline-flex">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente vinculado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Aguarde o administrador vincular clientes à sua contabilidade para acessar os documentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Building2 className="h-12 w-12 text-primary" />
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {client.cnpj}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantClientsView;
