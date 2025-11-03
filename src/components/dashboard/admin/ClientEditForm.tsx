import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { Loader2 } from "lucide-react";
import { clientSchema, type ClientInput } from "@/schemas/client";
import { updateClient, type Client } from "@/features/clients/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface ClientEditFormProps {
  client: Client;
  onSuccess: () => void;
  onCancel: () => void;
}

const ClientEditForm = ({ client, onSuccess, onCancel }: ClientEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ClientInput>({
    name: client.name,
    cnpj: client.cnpj,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = clientSchema.safeParse(formData);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        notifyError("update", "cliente", first?.message ?? "Dados inválidos");
        setLoading(false);
        return;
      }

      const { name, cnpj } = parsed.data;

      const response = await updateClient(client.id, { name, cnpj });

      if (!response.success) {
        throw new Error(response.error || "Erro ao atualizar cliente");
      }

      notifySuccess("update", "cliente", name);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      notifyError("update", "cliente", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Editar Cliente</CardTitle>
          <CardDescription>Atualize os dados do cliente</CardDescription>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
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

export default ClientEditForm;