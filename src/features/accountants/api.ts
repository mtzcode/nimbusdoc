import { supabase, executeWithRetry, executeListWithRetry, type ApiResponse, type ApiListResponse } from '@/lib/supabase-client';
import { accountantCreateSchema, accountantUpdateSchema, type AccountantCreateInput, type AccountantUpdateInput } from '@/schemas/accountant';
import type { Tables } from '@/integrations/supabase/types';

// Tipos para Accountant (baseado em profiles + user_roles)
export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;

export interface Accountant extends Profile {
  role?: 'accountant';
}

export interface AccountantWithClients extends Accountant {
  assignedClients?: Array<{
    id: string;
    client_id: string;
    client: {
      id: string;
      name: string;
      cnpj: string;
    };
  }>;
}

/**
 * Lista todos os contabilistas
 */
export async function listAccountants(): Promise<ApiListResponse<Accountant>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(id, email, full_name, created_at)
      `, { count: 'exact' })
      .eq('role', 'accountant')
      .order('created_at', { ascending: false });

    if (error) {
      return { 
        data: null, 
        error: { message: error.message, code: error.code }, 
        count: count ?? undefined 
      };
    }

    // Transformar dados para o formato esperado
    type Row = { profiles: Profile | null };
    const accountants = (data || [])
      .map((item: Row) => item.profiles)
      .filter((profile): profile is Profile => profile !== null)
      .map((profile) => ({
        ...profile,
        role: 'accountant' as const
      }));

    return { data: accountants, error: null, count: count ?? undefined };
  });
}

/**
 * Busca um contabilista por ID
 */
export async function getAccountant(id: string): Promise<ApiResponse<Accountant>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq('id', id)
      .eq('user_roles.role', 'accountant')
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const accountant: Accountant = {
      ...data,
      role: 'accountant'
    };

    return { data: accountant, error: null };
  });
}

/**
 * Busca um contabilista por email
 */
export async function getAccountantByEmail(email: string): Promise<ApiResponse<Accountant>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq('email', email)
      .eq('user_roles.role', 'accountant')
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const accountant: Accountant = {
      ...data,
      role: 'accountant'
    };

    return { data: accountant, error: null };
  });
}

/**
 * Cria um novo contabilista
 * Nota: Esta função chama a Edge Function para criar o usuário com autenticação
 */
export async function createAccountant(accountantData: AccountantCreateInput): Promise<ApiResponse<Accountant>> {
  // Validar dados de entrada
  const validation = accountantCreateSchema.safeParse(accountantData);
  if (!validation.success) {
    return {
      data: null,
      error: validation.error.errors.map(e => e.message).join(', '),
      success: false
    };
  }

  return executeWithRetry(async () => {
    // Chamar Edge Function para criar usuário
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: validation.data.email,
        password: validation.data.password,
        full_name: validation.data.fullName,
        role: 'accountant'
      }
    });

    if (error) {
      return { data: null, error: { message: error.message, code: (error as { code?: string }).code } };
    }

    // Buscar o perfil criado diretamente com select para manter o tipo esperado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq('email', validation.data.email)
      .eq('user_roles.role', 'accountant')
      .single();

    if (profileError) {
      return { data: null, error: { message: profileError.message, code: profileError.code } };
    }

    const accountant: Accountant = { ...profile, role: 'accountant' };
    return { data: accountant, error: null };
  });
}

/**
 * Atualiza um contabilista existente
 */
export async function updateAccountant(id: string, updates: AccountantUpdateInput): Promise<ApiResponse<Accountant>> {
  // Validar dados de entrada
  const validation = accountantUpdateSchema.safeParse(updates);
  if (!validation.success) {
    return {
      data: null,
      error: validation.error.errors.map(e => e.message).join(', '),
      success: false
    };
  }

  return executeWithRetry(async () => {
    // Atualizar perfil
    const profileUpdates: Partial<Profile> = {
      full_name: validation.data.fullName,
      email: validation.data.email
    };

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      return { data: null, error: { message: profileError.message, code: profileError.code } };
    }

    // Se há nova senha, chamar Edge Function para atualizar
    if (validation.data.newPassword) {
      const { error: passwordError } = await supabase.functions.invoke('update-accountant-auth', {
        body: {
          accountantId: id,
          email: validation.data.email,
          password: validation.data.newPassword
        }
      });

      if (passwordError) {
        const msg = (passwordError as unknown as { message?: string }).message ?? 'Erro ao atualizar senha';
        return { data: null, error: { message: msg } };
      }
    }

    const accountant: Accountant = {
      ...profileData,
      role: 'accountant'
    };

    return { data: accountant, error: null };
  });
}

/**
 * Remove um contabilista
 * Nota: Remove o perfil e role, mas não remove o usuário do auth (por segurança)
 */
export async function removeAccountant(id: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    // Primeiro, remover todas as atribuições de clientes
    await supabase
      .from('accountant_clients')
      .delete()
      .eq('accountant_id', id);

    // Remover role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', id)
      .eq('role', 'accountant');

    // Remover perfil (isso também remove o usuário do auth via CASCADE)
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    return { data, error };
  });
}

/**
 * Lista contabilistas com seus clientes atribuídos
 */
export async function listAccountantsWithClients(): Promise<ApiListResponse<AccountantWithClients>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('profiles')
      .select(`
        id, email, full_name, created_at,
        user_roles!inner(role),
        accountant_clients(
          id,
          client_id,
          clients(id, name, cnpj)
        )
      `, { count: 'exact' })
      .eq('user_roles.role', 'accountant')
      .order('created_at', { ascending: false });

    if (error) {
      return { 
        data: null, 
        error: { message: error.message, code: error.code }, 
        count: count ?? undefined 
      };
    }

    // Transformar dados para o formato esperado
    type Row = {
      id: string;
      email: string;
      full_name: string | null;
      created_at: string;
      accountant_clients: Array<{
        id: string;
        client_id: string;
        clients: { id: string; name: string; cnpj: string } | null;
      }> | null;
    };

    const rows = (data || []) as unknown as Row[];
    const accountantsWithClients = rows.map((item) => ({
      id: item.id,
      email: item.email,
      full_name: item.full_name,
      created_at: item.created_at,
      role: 'accountant' as const,
      assignedClients: (item.accountant_clients ?? [])
        .filter((ac) => ac.clients !== null)
        .map((ac) => ({
          id: ac.id,
          client_id: ac.client_id,
          client: ac.clients as { id: string; name: string; cnpj: string }
        }))
    }));

    return { data: accountantsWithClients, error: null, count: count ?? undefined };
  });
}

/**
 * Atribui um cliente a um contabilista
 */
export async function assignClientToAccountant(accountantId: string, clientId: string): Promise<ApiResponse<{ id: string }>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('accountant_clients')
      .insert({
        accountant_id: accountantId,
        client_id: clientId
      })
      .select('id')
      .single();

    return { data, error };
  });
}

/**
 * Remove a atribuição de um cliente de um contabilista
 */
export async function unassignClientFromAccountant(accountantId: string, clientId: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('accountant_clients')
      .delete()
      .eq('accountant_id', accountantId)
      .eq('client_id', clientId);

    return { data, error };
  });
}

/**
 * Lista clientes atribuídos a um contabilista específico
 */
export async function getAccountantClients(accountantId: string): Promise<ApiListResponse<{
  id: string;
  client_id: string;
  clients: { id: string; name: string; cnpj: string; created_at: string } | null;
}>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('accountant_clients')
      .select(`
        id,
        client_id,
        clients(id, name, cnpj, created_at)
      `, { count: 'exact' })
      .eq('accountant_id', accountantId)
      .order('created_at', { ascending: false });

    if (error) {
      return { 
        data: null, 
        error: { message: error.message, code: error.code }, 
        count: count ?? undefined 
      };
    }

    return { data: data || [], error: null, count: count ?? undefined };
  });
}

/**
 * Lista contabilidades vinculadas a um cliente específico
 */
export async function getClientAccountants(clientId: string): Promise<ApiListResponse<{
  id: string;
  accountant_id: string;
  accountant: { id: string; email: string; full_name: string | null; created_at: string };
}>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('accountant_clients')
      .select(`
        id,
        accountant_id,
        profiles!inner(id, email, full_name, created_at)
      `, { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return { 
        data: null, 
        error: { message: error.message, code: error.code }, 
        count: count ?? undefined 
      };
    }

    type Row = {
      id: string;
      accountant_id: string;
      profiles: { id: string; email: string; full_name: string | null; created_at: string } | null;
    };
    const rows = (data || []) as Row[];
    const result = rows.map((row) => ({
      id: row.id,
      accountant_id: row.accountant_id,
      accountant: {
        id: row.profiles!.id,
        email: row.profiles!.email,
        full_name: row.profiles!.full_name,
        created_at: row.profiles!.created_at,
      },
    }));

    return { data: result, error: null, count: count ?? undefined };
  });
}

/**
 * Verifica se um email já existe (útil para validação)
 */
export async function checkEmailExists(email: string, excludeId?: string): Promise<ApiResponse<boolean>> {
  return executeWithRetry(async () => {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    // Se não encontrou nenhum registro, email não existe
    if (error && error.code === 'PGRST116') {
      return { data: false, error: null };
    }

    // Se encontrou um registro, email existe
    if (data) {
      return { data: true, error: null };
    }

    // Outros erros
    return { data: null, error: error ? { message: error.message, code: error.code } : null };
  });
}