import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { accountantUpdateSchema, type AccountantUpdateInput } from "@/schemas/accountant";

interface Accountant {
  id: string;
  email: string;
  full_name: string | null;
}

interface AccountantEditFormProps {
  accountant: Accountant;
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountantEditForm = ({ accountant, onSuccess, onCancel }: AccountantEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AccountantUpdateInput>({
    fullName: accountant.full_name ?? "",
    email: accountant.email,
    newPassword: "",
  });
  const [sendingReset, setSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = accountantUpdateSchema.safeParse(formData);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        toast.error(first?.message ?? "Dados inválidos");
        setLoading(false);
        return;
      }

      const { fullName, email, newPassword } = parsed.data;
      // 1) Atualizar credenciais (email/senha) via Edge Function (admin)
      const shouldUpdateCredentials = email !== accountant.email || (newPassword ?? "").trim().length > 0;
      let credentialsFailed = false;
      if (shouldUpdateCredentials) {
        const { data, error } = await supabase.functions.invoke("update-accountant-auth", {
          body: {
            user_id: accountant.id,
            email: email !== accountant.email ? email : undefined,
            password: (newPassword && newPassword.trim().length > 0) ? newPassword : undefined,
            redirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error || data?.error) {
          credentialsFailed = true;
          const message = error?.message ?? data?.error ?? "Erro ao atualizar credenciais (Auth)";
          toast.warning(message);
        } else if (data?.confirmation_sent) {
          toast.success("E-mail de confirmação enviado para o novo endereço!");
        }
      }

      // 2) Atualizar dados do profile (nome)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", accountant.id);
      if (profileError) throw profileError;

      toast.success("Contabilidade atualizada com sucesso!");
      if (shouldUpdateCredentials) {
        if (credentialsFailed) {
          toast.info("Nome atualizado; e-mail/senha não foram alterados");
        } else {
          toast.success("Credenciais atualizadas com sucesso!");
        }
      }
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || "Erro ao atualizar contabilidade");
    } finally {
      setLoading(false);
    }
  };

  const sendResetPassword = async () => {
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(accountant.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("E-mail de redefinição de senha enviado!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || "Erro ao enviar redefinição de senha");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Editar Contabilidade</CardTitle>
          <CardDescription>Atualize os dados da contabilidade</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                placeholder="Nome da contabilidade"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha (opcional)</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Definir nova senha"
                value={formData.newPassword ?? ""}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="button" variant="secondary" onClick={sendResetPassword} disabled={sendingReset}>
                {sendingReset ? "Enviando..." : "Enviar Redefinição de Senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantEditForm;