import { supabase, executeWithRetry, executeListWithRetry, type ApiResponse, type ApiListResponse } from '@/lib/supabase-client';
import { clientSchema, type ClientInput } from '@/schemas/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Tipos para Client
export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;
export type ClientUpdate = TablesUpdate<'clients'>;

// Interface para criação de cliente (usando schema de validação)
export interface CreateClientData extends ClientInput {
  created_by?: string; // Opcional, será preenchido automaticamente se não fornecido
}

// Interface para atualização de cliente
export interface UpdateClientData {
  name?: string;
  cnpj?: string;
}

/**
 * Lista todos os clientes
 */
export async function listClients(): Promise<ApiListResponse<Client>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code }, count: count ?? undefined };
    }
    return { data: data || [], error: null, count: count ?? undefined };
  });
}

/**
 * Busca um cliente por ID
 */
export async function getClient(id: string): Promise<ApiResponse<Client>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data, error: null };
  });
}

/**
 * Busca um cliente por CNPJ
 */
export async function getClientByCnpj(cnpj: string): Promise<ApiResponse<Client>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('cnpj', cnpj)
      .single();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data, error: null };
  });
}

/**
 * Cria um novo cliente
 */
export async function createClient(clientData: CreateClientData): Promise<ApiResponse<Client>> {
  // Validar dados de entrada
  const validation = clientSchema.safeParse(clientData);
  if (!validation.success) {
    return {
      data: null,
      error: validation.error.errors.map(e => e.message).join(', '),
      success: false
    };
  }

  return executeWithRetry(async () => {
    // Obter usuário atual se created_by não foi fornecido
    const { data: { user } } = await supabase.auth.getUser();
    
    const insertData: ClientInsert = {
      name: validation.data.name,
      cnpj: validation.data.cnpj,
      created_by: clientData.created_by || user?.id || ''
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(insertData)
      .select()
      .single();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data, error: null };
  });
}

/**
 * Atualiza um cliente existente
 */
export async function updateClient(id: string, updates: UpdateClientData): Promise<ApiResponse<Client>> {
  // Validar dados se fornecidos
  if (updates.name || updates.cnpj) {
    const validation = clientSchema.partial().safeParse(updates);
    if (!validation.success) {
      return {
        data: null,
        error: validation.error.errors.map(e => e.message).join(', '),
        success: false
      };
    }
  }

  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data, error: null };
  });
}

/**
 * Remove um cliente
 */
export async function removeClient(id: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  });
}

/**
 * Lista clientes atribuídos a um contabilista
 */
export async function listAccountantClients(accountantId: string): Promise<ApiListResponse<Client>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('clients')
      .select(`
        *,
        accountant_clients!inner(accountant_id)
      `, { count: 'exact' })
      .eq('accountant_clients.accountant_id', accountantId)
      .order('created_at', { ascending: false });
    if (error) {
      return { data: null, error: { message: error.message, code: error.code }, count: count ?? undefined };
    }
    return { data: data || [], error: null, count: count ?? undefined };
  });
}

/**
 * Verifica se um CNPJ já existe (útil para validação)
 */
export async function checkCnpjExists(cnpj: string, excludeId?: string): Promise<ApiResponse<boolean>> {
  return executeWithRetry(async () => {
    let query = supabase
      .from('clients')
      .select('id')
      .eq('cnpj', cnpj);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    // Se não encontrou nenhum registro, CNPJ não existe
    if (error && error.code === 'PGRST116') {
      return { data: false, error: null };
    }

    // Se encontrou um registro, CNPJ existe
    if (data) {
      return { data: true, error: null };
    }

    // Outros erros
    return { data: null, error: error ? { message: error.message, code: error.code } : null };
  });
}