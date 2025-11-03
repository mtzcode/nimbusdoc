import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Suporta ambos nomes de variável: VITE_SUPABASE_ANON_KEY e VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY/PUBLISHABLE_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Tipos padronizados para respostas da API
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  count?: number;
}

// Classe de erro customizada
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Função para retry com backoff exponencial
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Não fazer retry em erros de autenticação ou permissão
      if (error instanceof ApiError && 
          (error.code === 'PGRST301' || error.code === 'PGRST116')) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Backoff exponencial com jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Função helper para padronizar respostas do Supabase
export function handleSupabaseResponse<T>(
  response: { data: T | null; error: { message: string; code?: string } | null }
): ApiResponse<T> {
  if (response.error) {
    const errorMessage = response.error.message || 'Erro desconhecido';
    const errorCode = response.error.code;
    
    throw new ApiError(errorMessage, errorCode, response.error);
  }

  return {
    data: response.data,
    error: null,
    success: true
  };
}

// Função helper para operações com retry
export async function executeWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
  maxRetries?: number
): Promise<ApiResponse<T>> {
  try {
    const response = await withRetry(operation, maxRetries);
    return handleSupabaseResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: null,
      error: 'Erro interno do servidor',
      success: false
    };
  }
}

// Função helper para operações de listagem
export async function executeListWithRetry<T>(
  operation: () => Promise<{ data: T[] | null; error: { message: string; code?: string } | null; count?: number }>,
  maxRetries?: number
): Promise<ApiListResponse<T>> {
  try {
    const response = await withRetry(operation, maxRetries);
    
    if (response.error) {
      throw new ApiError(response.error.message, response.error.code, response.error);
    }

    return {
      data: response.data || [],
      error: null,
      success: true,
      count: response.count
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        data: [],
        error: error.message,
        success: false
      };
    }

    return {
      data: [],
      error: 'Erro interno do servidor',
      success: false
    };
  }
}