import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import AccountantForm from "./AccountantForm";
import AccountantEditForm from "./AccountantEditForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

interface Accountant {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const AccountantsView = () => {
  const { userRole, appPermissions } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingAccountant, setEditingAccountant] = useState<{
    id: string;
    email: string;
    full_name: string | null;
  } | null>(null);
  const queryClient = useQueryClient();

  const canView = userRole === "admin" || (userRole === "user" && (appPermissions?.user_can_view_accountants ?? false));
  const canEdit = userRole === "admin" || (userRole === "user" && (appPermissions?.user_can_edit_accountants ?? false));

  const { data: accountants = [], isLoading } = useQuery<Accountant[]>({
    queryKey: ["accountants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(id, email, full_name, created_at)")
        .eq("role", "accountant");
      if (error) throw error;
      type UserRoleWithProfile = { user_id: string; profiles: Tables<"profiles"> | null };
      const rows = (data ?? []) as UserRoleWithProfile[];
      return rows
        .map((row) => row.profiles)
        .filter((p): p is Tables<"profiles"> => p !== null)
        .map((p) => ({ id: p.id, email: p.email, full_name: p.full_name, created_at: p.created_at }));
    },
    enabled: !!canView,
  });

  if (showForm) {
    return (
      <AccountantForm
        onSuccess={() => {
          setShowForm(false);
          void queryClient.invalidateQueries({ queryKey: ["accountants"] });
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (editingAccountant) {
    return (
      <AccountantEditForm
        accountant={editingAccountant}
        onSuccess={() => {
          setEditingAccountant(null);
          void queryClient.invalidateQueries({ queryKey: ["accountants"] });
        }}
        onCancel={() => setEditingAccountant(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contabilidades</h1>
          <p className="text-muted-foreground">Gerencie as contabilidades cadastradas</p>
        </div>
        {canEdit && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Contabilidade
        </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contabilidades</CardTitle>
          <CardDescription>
            Total de {accountants.length} contabilidade{accountants.length !== 1 ? "s" : ""} cadastrada{accountants.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accountants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma contabilidade cadastrada ainda
            </div>
          ) : (
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
                    <TableCell>
                      {new Date(accountant.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingAccountant({ id: accountant.id, email: accountant.email, full_name: accountant.full_name })}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantsView;
