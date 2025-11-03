import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { Loader2 } from "lucide-react";
import { accountantCreateSchema, type AccountantCreateInput } from "@/schemas/accountant";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface AccountantFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountantForm = ({ onSuccess, onCancel }: AccountantFormProps) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AccountantCreateInput>({
    email: "",
    password: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const parsed = accountantCreateSchema.safeParse(formData);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        notifyError("create", "contabilidade", first?.message ?? "Dados inválidos");
        setLoading(false);
        return;
      }

      const { email, password, fullName } = parsed.data;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "accountant",
        });

        if (roleError) throw roleError;
      }

      notifySuccess("create", "contabilidade", formData.fullName);
      await queryClient.invalidateQueries({ queryKey: queryKeys.accountants() });
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      notifyError("create", "contabilidade", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Nova Contabilidade</CardTitle>
          <CardDescription>Cadastre uma nova contabilidade no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha Inicial</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...
                  </>
                ) : (
                  "Cadastrar Contabilidade"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantForm;
