import { supabase, executeWithRetry, executeListWithRetry, type ApiResponse, type ApiListResponse } from '@/lib/supabase-client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Tipos para Folder e File (registro de banco)
export type Folder = Tables<'folders'>;
export type FileRecord = Tables<'files'>;
export type FolderInsert = TablesInsert<'folders'>;
export type FolderUpdate = TablesUpdate<'folders'>;
export type FileInsert = TablesInsert<'files'>;
export type FileUpdate = TablesUpdate<'files'>;

// Interfaces para criação
export interface CreateFolderData {
  name: string;
  client_id: string;
  created_by?: string; // Opcional, será preenchido automaticamente se não fornecido
}

export interface CreateFileData {
  name: string;
  folder_id: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  uploaded_by?: string; // Opcional, será preenchido automaticamente se não fornecido
}

// Interfaces para atualização
export interface UpdateFolderData {
  name?: string;
}

export interface UpdateFileData {
  name?: string;
  file_size?: number;
  file_type?: string;
}

// Interface para folder com arquivos
export interface FolderWithFiles extends Folder {
  files?: FileRecord[];
  fileCount?: number;
}

// ===== FOLDERS API =====

/**
 * Lista todas as pastas de um cliente
 */
export async function listFolders(clientId: string): Promise<ApiListResponse<Folder>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('folders')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code }, count: undefined };
    }

    return { data: data || [], error: null, count: count ?? undefined };
  });
}

/**
 * Lista pastas com contagem de arquivos
 */
export async function listFoldersWithFileCount(clientId: string): Promise<ApiListResponse<FolderWithFiles>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('folders')
      .select(`
        *,
        files(count)
      `, { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code }, count: undefined };
    }

    // Transformar dados para incluir contagem de arquivos
    type FolderRowWithCount = Folder & { files: Array<{ count: number }> | null };
    const foldersWithCount = (data || []).map((folder: FolderRowWithCount) => ({
      ...folder,
      files: undefined, // Remove the files array since we only need the count
      fileCount: folder.files?.[0]?.count || 0
    }));

    return { data: foldersWithCount, error: null, count: count ?? undefined };
  });
}

/**
 * Busca uma pasta por ID
 */
export async function getFolder(id: string): Promise<ApiResponse<Folder>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('folders')
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
 * Busca uma pasta com seus arquivos
 */
export async function getFolderWithFiles(id: string): Promise<ApiResponse<FolderWithFiles>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('folders')
      .select(`
        *,
        files(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const folderWithFiles: FolderWithFiles = {
      ...data,
      files: data.files || [],
      fileCount: data.files?.length || 0
    };

    return { data: folderWithFiles, error: null };
  });
}

/**
 * Cria uma nova pasta
 */
export async function createFolder(folderData: CreateFolderData): Promise<ApiResponse<Folder>> {
  // Validação básica
  if (!folderData.name || folderData.name.trim().length === 0) {
    return {
      data: null,
      error: 'Nome da pasta é obrigatório',
      success: false
    };
  }

  if (!folderData.client_id) {
    return {
      data: null,
      error: 'ID do cliente é obrigatório',
      success: false
    };
  }

  return executeWithRetry(async () => {
    // Obter usuário atual se created_by não foi fornecido
    const { data: { user } } = await supabase.auth.getUser();
    
    const insertData: FolderInsert = {
      name: folderData.name.trim(),
      client_id: folderData.client_id,
      created_by: folderData.created_by || user?.id || ''
    };

    const { data, error } = await supabase
      .from('folders')
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
 * Atualiza uma pasta existente
 */
export async function updateFolder(id: string, updates: UpdateFolderData): Promise<ApiResponse<Folder>> {
  // Validação básica
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    return {
      data: null,
      error: 'Nome da pasta não pode estar vazio',
      success: false
    };
  }

  return executeWithRetry(async () => {
    const updateData: FolderUpdate = {};
    
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }

    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
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
 * Remove uma pasta (e todos os seus arquivos)
 */
export async function removeFolder(id: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    // Os arquivos serão removidos automaticamente via CASCADE
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  });
}

// ===== FILES API =====

/**
 * Lista todos os arquivos de uma pasta
 */
export async function listFiles(folderId: string): Promise<ApiListResponse<FileRecord>> {
  return executeListWithRetry(async () => {
    const { data, error, count } = await supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('folder_id', folderId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code }, count: undefined };
    }

    return { data: data || [], error: null, count: count ?? undefined };
  });
}

/**
 * Busca um arquivo por ID
 */
export async function getFile(id: string): Promise<ApiResponse<FileRecord>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase
      .from('files')
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
 * Cria um novo arquivo
 */
export async function createFile(fileData: CreateFileData): Promise<ApiResponse<FileRecord>> {
  // Validação básica
  if (!fileData.name || fileData.name.trim().length === 0) {
    return {
      data: null,
      error: 'Nome do arquivo é obrigatório',
      success: false
    };
  }

  if (!fileData.folder_id) {
    return {
      data: null,
      error: 'ID da pasta é obrigatório',
      success: false
    };
  }

  if (!fileData.file_path) {
    return {
      data: null,
      error: 'Caminho do arquivo é obrigatório',
      success: false
    };
  }

  return executeWithRetry(async () => {
    // Obter usuário atual se uploaded_by não foi fornecido
    const { data: { user } } = await supabase.auth.getUser();
    
    const insertData: FileInsert = {
      name: fileData.name.trim(),
      folder_id: fileData.folder_id,
      file_path: fileData.file_path,
      file_size: fileData.file_size,
      file_type: fileData.file_type,
      uploaded_by: fileData.uploaded_by || user?.id || ''
    };

    const { data, error } = await supabase
      .from('files')
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
 * Atualiza um arquivo existente
 */
export async function updateFile(id: string, updates: UpdateFileData): Promise<ApiResponse<FileRecord>> {
  // Validação básica
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    return {
      data: null,
      error: 'Nome do arquivo não pode estar vazio',
      success: false
    };
  }

  return executeWithRetry(async () => {
    const updateData: FileUpdate = {};
    
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.file_size !== undefined) {
      updateData.file_size = updates.file_size;
    }
    if (updates.file_type !== undefined) {
      updateData.file_type = updates.file_type;
    }

    const { data, error } = await supabase
      .from('files')
      .update(updateData)
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
 * Remove um arquivo
 */
export async function removeFile(id: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  });
}

// ===== STORAGE API =====

/**
 * Faz upload de um arquivo para o storage
 */
export async function uploadFile(
  file: File, 
  path: string, 
  options?: { 
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  }
): Promise<ApiResponse<{ path: string; fullPath: string }>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase.storage
      .from('fiscal-files')
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false
      });

    if (error) {
      return { data: null, error };
    }

    return { 
      data: { 
        path: data.path,
        fullPath: data.fullPath 
      }, 
      error: null 
    };
  });
}

/**
 * Remove um arquivo do storage
 */
export async function removeStorageFile(path: string): Promise<ApiResponse<null>> {
  return executeWithRetry(async () => {
    const { error } = await supabase.storage
      .from('fiscal-files')
      .remove([path]);

    if (error) {
      return { data: null, error: { message: error.message, code: error.name } };
    }

    return { data: null, error: null };
  });
}

/**
 * Gera URL pública para um arquivo
 */
export async function getPublicUrl(path: string): Promise<ApiResponse<{ publicUrl: string }>> {
  return executeWithRetry(async () => {
    const { data } = supabase.storage
      .from('fiscal-files')
      .getPublicUrl(path);

    return { 
      data: { publicUrl: data.publicUrl }, 
      error: null 
    };
  });
}

/**
 * Gera URL assinada para um arquivo (com expiração)
 */
export async function getSignedUrl(
  path: string, 
  expiresIn: number = 3600
): Promise<ApiResponse<{ signedUrl: string }>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase.storage
      .from('fiscal-files')
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { data: null, error };
    }

    return { 
      data: { signedUrl: data.signedUrl }, 
      error: null 
    };
  });
}
/**
 * Faz download de um arquivo do storage e retorna Blob
 */
export async function downloadStorageFile(path: string): Promise<ApiResponse<Blob>> {
  return executeWithRetry(async () => {
    const { data, error } = await supabase.storage
      .from('fiscal-files')
      .download(path);

    return { data, error };
  });
}