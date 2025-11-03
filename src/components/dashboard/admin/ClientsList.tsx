import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";
import { type Client } from "@/features/clients/api";
import { memo, useCallback } from "react";

interface ClientsListProps {
  clients: Client[];
  loading: boolean;
  onSelectClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  canEdit?: boolean;
}

const ClientsListComponent = ({ clients, loading, onSelectClient, onEditClient, canEdit = false }: ClientsListProps) => {
  const formatCNPJ = useCallback((cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4 inline-flex">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Comece adicionando seu primeiro cliente para gerenciar documentos fiscais e contábeis.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>CNPJ</TableHead>
          <TableHead>Data de Cadastro</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {client.name}
              </div>
            </TableCell>
            <TableCell>{formatCNPJ(client.cnpj)}</TableCell>
            <TableCell>{new Date(client.created_at).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell className="text-right space-x-2">
              <Button variant="outline" size="sm" onClick={() => onSelectClient(client)}>
                Ver Detalhes
              </Button>
              {canEdit && (
                <Button variant="secondary" size="sm" onClick={() => onEditClient(client)}>
                  Editar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const areEqual = (prev: ClientsListProps, next: ClientsListProps) => {
  if (prev.loading !== next.loading) return false;
  if (prev.canEdit !== next.canEdit) return false;
  if (prev.onSelectClient !== next.onSelectClient) return false;
  if (prev.onEditClient !== next.onEditClient) return false;
  // Compare clients array by length and stable ids
  if (prev.clients.length !== next.clients.length) return false;
  for (let i = 0; i < prev.clients.length; i++) {
    if (prev.clients[i].id !== next.clients[i].id) return false;
    if (
      prev.clients[i].name !== next.clients[i].name ||
      prev.clients[i].cnpj !== next.clients[i].cnpj ||
      prev.clients[i].created_at !== next.clients[i].created_at
    ) {
      return false;
    }
  }
  return true;
};

export default memo(ClientsListComponent, areEqual);
