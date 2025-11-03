import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/feedback";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/queryKeys";

const SettingsUsers = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "user" });
  const queryClient = useQueryClient();

  type UserRoleRow = {
    id: string;
    user_id: string;
    role: "admin" | "user";
    profiles: Tables<"profiles"> | null;
  };

  const { data: roleRows = [], isLoading: listLoading } = useQuery<UserRoleRow[]>({
    queryKey: queryKeys.siteUsers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, profiles(id, email, full_name, created_at)")
        .in("role", ["admin", "user"]) // apenas usuários do site
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UserRoleRow[];
    },
    enabled: userRole === "admin",
  });

  // Deduplicar por usuário (se houver mais de um papel admin/user, priorizar admin)
  const users = useMemo(() => {
    const map = new Map<string, UserRoleRow>();
    for (const row of roleRows) {
      if (!row.profiles) continue;
      const existing = map.get(row.user_id);
      if (!existing) {
        map.set(row.user_id, row);
      } else {
        // Se algum for admin, manter admin
        const priority = (r: UserRoleRow) => (r.role === "admin" ? 2 : 1);
        if (priority(row) > priority(existing)) {
          map.set(row.user_id, row);
        }
      }
    }
    return Array.from(map.values());
  }, [roleRows]);

  const [editing, setEditing] = useState<null | {
    row_id: string;
    user_id: string;
    full_name: string;
    email: string;
    role: "admin" | "user";
    password?: string;
  }>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error || data?.error) {
        const message = error?.message ?? data?.error ?? "Erro ao criar usuário";
        notifyError("create", "usuário", message);
        return;
      }
      notifySuccess("create", "usuário", form.full_name);
      if (data?.confirmation_sent) {
        notifyInfo("E-mail de confirmação enviado ao novo usuário.");
      }
      setForm({ full_name: "", email: "", password: "", role: "user" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError("create", "usuário", message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (row: UserRoleRow) => {
    if (!row.profiles) return;
    setEditing({
      row_id: row.id,
      user_id: row.user_id,
      full_name: row.profiles.full_name ?? "",
      email: row.profiles.email,
      role: row.role,
      password: "",
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    const { row_id, user_id, full_name, email, role, password } = editing;
    setSavingEdit(true);
    try {
      // Atualizar nome
      const { error: nameErr } = await supabase
        .from("profiles")
        .update({ full_name })
        .eq("id", user_id);
      if (nameErr) throw new Error(nameErr.message);

      // Atualizar papel (na linha atual) e remover outros papéis admin/user do mesmo usuário
      const { error: roleErr } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", row_id);
      if (roleErr) throw new Error(roleErr.message);

      // Remover possíveis duplicatas admin/user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .in("role", ["admin", "user"]) // manter só a linha atual
        .neq("id", row_id);

      // Atualizar e-mail/senha via Edge Function (se alterado)
      const original = roleRows.find((r) => r.user_id === user_id && r.id === row_id);
      const emailChanged = original?.profiles?.email !== email;
      const passwordProvided = !!password && password.length > 0;
      if (emailChanged || passwordProvided) {
        const { data, error } = await supabase.functions.invoke("update-accountant-auth", {
          body: {
            user_id,
            email: emailChanged ? email : undefined,
            password: passwordProvided ? password : undefined,
            redirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error || data?.error) {
          const message = error?.message ?? data?.error ?? "Erro ao atualizar credenciais";
          throw new Error(message);
        }
        if (emailChanged && data?.confirmation_sent) {
          notifyInfo("E-mail de confirmação enviado ao usuário.");
        }
      }

      notifySuccess("update", "usuário", full_name);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.siteUsers(), exact: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError("update", "usuário", message);
    }
    finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>Gerencie acesso ao painel administrativo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                placeholder="Nome do usuário"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Criando...
                  </>
                ) : (
                  "Criar Usuário"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>Lista de usuários do site (apenas Admin/Usuário)</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="w-56">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {editing?.user_id === row.user_id ? (
                          <Input
                            value={editing.full_name}
                            onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                          />
                        ) : (
                          row.profiles?.full_name || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {editing?.user_id === row.user_id ? (
                          <div className="space-y-2">
                            <Input
                              type="email"
                              value={editing.email}
                              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                            />
                            <Input
                              type="password"
                              placeholder="Nova senha (opcional)"
                              value={editing.password}
                              onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                            />
                          </div>
                        ) : (
                          row.profiles?.email
                        )}
                      </TableCell>
                      <TableCell>
                        {editing?.user_id === row.user_id ? (
                          <Select
                            value={editing.role}
                            onValueChange={(val) => setEditing({ ...editing, role: val as "admin" | "user" })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="user">Usuário</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          row.role === "admin" ? "Administrador" : "Usuário"
                        )}
                      </TableCell>
                      <TableCell>
                        {editing?.user_id === row.user_id ? (
                          <div className="flex gap-2">
                            <Button variant="default" onClick={saveEdit} disabled={savingEdit}>
                              {savingEdit ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button variant="secondary" onClick={cancelEdit} disabled={savingEdit}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => startEdit(row)}>
                              Editar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsUsers;