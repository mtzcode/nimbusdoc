import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  cnpj: string;
  created_at: string;
}

interface ClientsListProps {
  clients: Client[];
  loading: boolean;
  onSelectClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  canEdit?: boolean;
}

const ClientsList = ({ clients, loading, onSelectClient, onEditClient, canEdit = false }: ClientsListProps) => {
  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente cadastrado ainda
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

export default ClientsList;
