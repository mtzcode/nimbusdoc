import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Permissions = {
  id: number;
  user_can_view_clients: boolean;
  user_can_edit_clients: boolean;
  user_can_manage_folders: boolean;
  user_can_delete_files: boolean;
  admin_can_manage_users: boolean;
  admin_can_manage_permissions: boolean;
  // Novas permissões para contabilidades
  user_can_view_accountants?: boolean;
  user_can_edit_accountants?: boolean;
};

const SettingsPermissions = () => {
  const [loading, setLoading] = useState(false);
  const [perm, setPerm] = useState<Permissions | null>(null);
  const [supportsAccountants, setSupportsAccountants] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("app_permissions")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        notifyError("download", "permissões", error.message);
        return;
      }
      if (data) {
        const p = data as Permissions;
        const d = data as Record<string, unknown>;
        const supports = "user_can_view_accountants" in d && "user_can_edit_accountants" in d;
        setSupportsAccountants(supports);
        setPerm({
          ...p,
          user_can_view_accountants: p.user_can_view_accountants ?? false,
          user_can_edit_accountants: p.user_can_edit_accountants ?? false,
        });
      }
    };
    void load();
  }, []);

  const handleToggle = (key: keyof Omit<Permissions, "id">) => {
    if (!perm) return;
    setPerm({ ...perm, [key]: !perm[key] } as Permissions);
  };

  const handleSave = async () => {
    if (!perm) return;
    setLoading(true);
    const basePayload = {
      user_can_view_clients: perm.user_can_view_clients,
      user_can_edit_clients: perm.user_can_edit_clients,
      user_can_manage_folders: perm.user_can_manage_folders,
      user_can_delete_files: perm.user_can_delete_files,
      admin_can_manage_users: perm.admin_can_manage_users,
      admin_can_manage_permissions: perm.admin_can_manage_permissions,
    };
    const payload = supportsAccountants
      ? {
          ...basePayload,
          user_can_view_accountants: perm.user_can_view_accountants ?? false,
          user_can_edit_accountants: perm.user_can_edit_accountants ?? false,
        }
      : basePayload;

    const { data, error } = await supabase
      .from("app_permissions")
      .update(payload)
      .eq("id", perm.id)
      .select("*")
      .maybeSingle();

    setLoading(false);
    if (error) {
      notifyError("update", "permissões", error.message);
      return;
    }

    if (!data) {
      notifyError("update", "permissões", "Nenhuma permissão atualizada (verifique se é admin)");
      return;
    }

    const d = data as Record<string, unknown>;
    const supports = "user_can_view_accountants" in d && "user_can_edit_accountants" in d;
    setSupportsAccountants(supports);
    const p = data as Permissions;
    setPerm({
      ...p,
      user_can_view_accountants: p.user_can_view_accountants ?? false,
      user_can_edit_accountants: p.user_can_edit_accountants ?? false,
    });

    notifySuccess("update", "permissões");
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
          <CardDescription>Defina o que Admin e Usuário podem fazer.</CardDescription>
        </CardHeader>
        <CardContent>
          {!perm ? (
            <div>Carregando...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_view_clients}
                      onChange={() => handleToggle("user_can_view_clients")}
                    />
                    Pode visualizar clientes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_edit_clients}
                      onChange={() => handleToggle("user_can_edit_clients")}
                    />
                    Pode editar clientes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_view_accountants ?? false}
                      onChange={() => handleToggle("user_can_view_accountants")}
                    />
                    Pode visualizar contabilidades
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_edit_accountants ?? false}
                      onChange={() => handleToggle("user_can_edit_accountants")}
                    />
                    Pode editar contabilidades
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_manage_folders}
                      onChange={() => handleToggle("user_can_manage_folders")}
                    />
                    Pode gerenciar pastas/arquivos
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.user_can_delete_files}
                      onChange={() => handleToggle("user_can_delete_files")}
                    />
                    Pode excluir arquivos
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Administrador</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.admin_can_manage_users}
                      onChange={() => handleToggle("admin_can_manage_users")}
                    />
                    Pode gerenciar usuários
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={perm.admin_can_manage_permissions}
                      onChange={() => handleToggle("admin_can_manage_permissions")}
                    />
                    Pode gerenciar permissões
                  </label>
                </div>
              </div>

              <div>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPermissions;