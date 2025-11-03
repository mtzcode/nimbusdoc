import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clientSchema, type ClientInput } from "@/schemas/client";
import { createClient } from "@/features/clients/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface ClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ClientForm = ({ onSuccess, onCancel }: ClientFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ClientInput>({
    name: "",
    cnpj: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const parsed = clientSchema.safeParse(formData);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        notifyError("create", "cliente", first?.message ?? "Dados inválidos");
        setLoading(false);
        return;
      }

      const { name, cnpj } = parsed.data;

      const response = await createClient({
        name,
        cnpj,
        created_by: user.id,
      });

      if (!response.success) {
        throw new Error(response.error || "Erro ao cadastrar cliente");
      }

      notifySuccess("create", "cliente", name);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      notifyError("create", "cliente", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo Cliente</CardTitle>
          <CardDescription>Cadastre um novo cliente fiscal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input
                id="name"
                placeholder="Nome da empresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
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
                  "Cadastrar Cliente"
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

export default ClientForm;
