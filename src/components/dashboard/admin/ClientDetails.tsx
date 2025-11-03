import { useState } from "react";
// Supabase removido: usar APIs centralizadas
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Folder as FolderIcon, Users, Trash2, Loader2, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import FolderDetails from "./FolderDetails";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listFolders, createFolder, type Folder } from "@/features/folders/api";
import { listAccountants, getClientAccountants, assignClientToAccountant, unassignClientFromAccountant, type Accountant } from "@/features/accountants/api";

interface Client {
  id: string;
  name: string;
  cnpj: string;
}

interface FolderType {
  id: string;
  name: string;
  created_at: string;
}

const ClientDetails = ({ client, onBack }: { client: Client; onBack: () => void }) => {
  const { user, userRole } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading: foldersLoading } = useQuery<FolderType[]>({
    queryKey: ["folders", client.id],
    queryFn: async () => {
      const response = await listFolders(client.id);
      if (!response.success) throw new Error(response.error || "Erro ao carregar pastas");
      return (response.data || []) as FolderType[];
    },
  });

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createFolderMutation.mutate({ name: folderName });
  };

  const createFolderMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await createFolder({
        client_id: client.id,
        name,
        created_by: user!.id,
      });
      if (!response.success) throw new Error(response.error || "Erro ao criar pasta");
    },
    onSuccess: () => {
      toast.success("Pasta criada com sucesso!");
      setShowFolderDialog(false);
      setFolderName("");
      void queryClient.invalidateQueries({ queryKey: ["folders", client.id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao criar pasta";
      toast.error(message);
    },
  });

  // Tipos para contabilistas e vínculos
  // Accountant tipado via API centralizada

  interface Assignment {
    id: string;
    accountant_id: string;
    accountant?: Accountant;
  }

  const { data: accountants = [], isLoading: accountantsLoading } = useQuery<Accountant[]>({
    queryKey: ["accountants"],
    queryFn: async () => {
      const response = await listAccountants();
      if (!response.success) throw new Error(response.error || "Erro ao carregar contabilidades");
      return response.data || [];
    },
    enabled: userRole === "admin",
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["client-accountants", client.id],
    queryFn: async () => {
      const response = await getClientAccountants(client.id);
      if (!response.success) throw new Error(response.error || "Erro ao carregar vínculos");
      return response.data || [];
    },
    enabled: userRole === "admin",
  });

  const [selectedAccountantId, setSelectedAccountantId] = useState<string>("");

  const linkMutation = useMutation({
    mutationFn: async (accountantId: string) => {
      const response = await assignClientToAccountant(accountantId, client.id);
      if (!response.success) throw new Error(response.error || "Erro ao vincular contabilidade");
    },
    onSuccess: () => {
      toast.success("Vínculo criado com sucesso!");
      setSelectedAccountantId("");
      void queryClient.invalidateQueries({ queryKey: ["client-accountants", client.id] });
    },
    onError: (error: unknown) => {
      let msg = "Erro ao vincular contabilidade";
      if (error instanceof Error) {
        msg = error.message;
      }
      toast.error(msg.includes("duplicate") ? "Contabilidade já vinculada" : msg);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const target = assignments.find((a) => a.id === assignmentId);
      if (!target) throw new Error("Vínculo não encontrado");
      const response = await unassignClientFromAccountant(target.accountant_id, client.id);
      if (!response.success) throw new Error(response.error || "Erro ao remover vínculo");
    },
    onSuccess: () => {
      toast.success("Vínculo removido!");
      void queryClient.invalidateQueries({ queryKey: ["client-accountants", client.id] });
    },
    onError: () => toast.error("Erro ao remover vínculo"),
  });

  if (selectedFolder) {
    return (
      <FolderDetails
        folder={selectedFolder}
        clientName={client.name}
        onBack={() => setSelectedFolder(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
          <p className="text-muted-foreground">CNPJ: {client.cnpj}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pastas</CardTitle>
            <CardDescription>
              {foldersLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</span>
              ) : (
                <>
                  {folders.length} pasta{folders.length !== 1 ? "s" : ""} criada{folders.length !== 1 ? "s" : ""}
                </>
              )}
            </CardDescription>
          </div>
          {userRole === "admin" && (
            <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Pasta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Pasta</DialogTitle>
                  <DialogDescription>
                    Crie uma pasta para organizar os arquivos fiscais
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">Nome da Pasta</Label>
                    <Input
                      id="folderName"
                      placeholder="Ex: Mês 01-2025"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={createFolderMutation.isPending}>
                    {createFolderMutation.isPending ? "Criando..." : "Criar Pasta"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {folders.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4 inline-flex">
                <FolderIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma pasta criada</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Organize os documentos fiscais criando pastas por período ou categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedFolder(folder)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <FolderIcon className="h-12 w-12 text-primary" />
                      <h3 className="font-semibold">{folder.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(folder.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {userRole === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Vínculos de Contabilidade</CardTitle>
              <CardDescription>
                Vincule ou remova contabilidades associadas ao cliente
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">Selecionar contabilidade</span>
                </div>
                <Select value={selectedAccountantId} onValueChange={setSelectedAccountantId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder={accountantsLoading ? "Carregando..." : "Escolha uma contabilidade"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(accountants || []).map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.full_name || acc.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="gap-2"
                  disabled={!selectedAccountantId || linkMutation.isPending}
                  onClick={() => selectedAccountantId && linkMutation.mutate(selectedAccountantId)}
                >
                  <LinkIcon className="h-4 w-4" /> Vincular
                </Button>
              </div>

              <div>
                {assignmentsLoading ? (
                  <div className="text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando vínculos...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-muted-foreground">Nenhuma contabilidade vinculada</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assignments.map((as) => (
                      <div key={as.id} className="flex items-center justify-between p-3 rounded border">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <div className="text-sm">
                            <div className="font-medium">{as.accountant?.full_name || as.accountant?.email}</div>
                            <div className="text-muted-foreground">{as.accountant?.email}</div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={unlinkMutation.isPending}
                          onClick={() => unlinkMutation.mutate(as.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDetails;
