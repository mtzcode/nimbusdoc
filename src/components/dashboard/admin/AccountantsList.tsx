import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { memo } from "react";
import type { Accountant } from "@/features/accountants/api";

interface AccountantsListProps {
  accountants: Accountant[];
  loading: boolean;
  onEditAccountant: (accountant: { id: string; email: string; full_name: string | null }) => void;
  canEdit?: boolean;
}

const AccountantsListComponent = ({ accountants, loading, onEditAccountant, canEdit = false }: AccountantsListProps) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accountants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4 inline-flex">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma contabilidade cadastrada</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Adicione contabilidades para gerenciar o acesso aos documentos dos clientes.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Data de Cadastro</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accountants.map((accountant) => (
          <TableRow key={accountant.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {accountant.full_name || "Sem nome"}
              </div>
            </TableCell>
            <TableCell>{accountant.email}</TableCell>
            <TableCell>{new Date(accountant.created_at).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell className="text-right">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditAccountant({ id: accountant.id, email: accountant.email, full_name: accountant.full_name })}
                >
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

const areEqual = (prev: AccountantsListProps, next: AccountantsListProps) => {
  if (prev.loading !== next.loading) return false;
  if (prev.canEdit !== next.canEdit) return false;
  if (prev.onEditAccountant !== next.onEditAccountant) return false;
  if (prev.accountants.length !== next.accountants.length) return false;
  for (let i = 0; i < prev.accountants.length; i++) {
    if (prev.accountants[i].id !== next.accountants[i].id) return false;
    if (
      prev.accountants[i].email !== next.accountants[i].email ||
      prev.accountants[i].full_name !== next.accountants[i].full_name ||
      prev.accountants[i].created_at !== next.accountants[i].created_at
    ) {
      return false;
    }
  }
  return true;
};

export default memo(AccountantsListComponent, areEqual);