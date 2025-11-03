import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import AccountantForm from "./AccountantForm";
import AccountantEditForm from "./AccountantEditForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listAccountants, type Accountant } from "@/features/accountants/api";
import { queryKeys } from "@/lib/queryKeys";
import AccountantsList from "./AccountantsList";

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
    queryKey: queryKeys.accountants(),
    queryFn: async () => {
      const response = await listAccountants();
      if (!response.success) {
        throw new Error(response.error || "Erro ao carregar contadores");
      }
      return response.data || [];
    },
    enabled: !!canView,
  });

  if (showForm) {
    return (
      <AccountantForm
        onSuccess={() => {
          setShowForm(false);
          void queryClient.invalidateQueries({ queryKey: queryKeys.accountants() });
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
          void queryClient.invalidateQueries({ queryKey: queryKeys.accountants() });
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
            <AccountantsList
              accountants={accountants}
              loading={isLoading}
              canEdit={canEdit}
              onEditAccountant={(a) => setEditingAccountant(a)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantsView;
