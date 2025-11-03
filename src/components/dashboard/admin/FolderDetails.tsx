import { useState, useEffect, useCallback } from "react";
// Supabase removido: usar APIs centralizadas de folders/files
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { useAuth } from "@/contexts/AuthContext";
import { listFiles, uploadFile, createFile, downloadStorageFile, removeStorageFile, removeFile, type FileRecord } from "@/features/folders/api";

interface FolderType {
  id: string;
  name: string;
}

interface FileType {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

const FolderDetails = ({
  folder,
  clientName,
  onBack,
}: {
  folder: FolderType;
  clientName: string;
  onBack: () => void;
}) => {
  const { user, userRole, appPermissions } = useAuth();
  const [files, setFiles] = useState<FileType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null);

  const canUpload = userRole === "admin" || !!appPermissions?.user_can_manage_folders;
  const canDelete = userRole === "admin" || !!appPermissions?.user_can_delete_files;

  const fetchFiles = useCallback(async () => {
    try {
      const response = await listFiles(folder.id);
      if (!response.success) throw new Error(response.error || "Erro ao carregar arquivos");
      setFiles((response.data || []) as FileType[]);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filePath = `${folder.id}/${Date.now()}_${file.name}`;
      const uploadResp = await uploadFile(file, filePath);
      if (!uploadResp.success) throw new Error(uploadResp.error || "Falha no upload");

      const createResp = await createFile({
        folder_id: folder.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      });
      if (!createResp.success) throw new Error(createResp.error || "Falha ao registrar arquivo");

      notifySuccess("upload", "arquivo", file.name);
      void fetchFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao enviar arquivo";
      notifyError("upload", "arquivo", message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (file: FileType) => {
    setDownloadingId(file.id);
    try {
      const resp = await downloadStorageFile(file.file_path);
      if (!resp.success || !resp.data) throw new Error(resp.error || "Falha ao baixar");

      const url = window.URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao baixar arquivo";
      notifyError("download", "arquivo", message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file: FileType) => {
    setDeletingId(file.id);
    try {
      const storageResp = await removeStorageFile(file.file_path);
      if (!storageResp.success) throw new Error(storageResp.error || "Falha ao excluir do storage");

      const dbResp = await removeFile(file.id);
      if (!dbResp.success) throw new Error(dbResp.error || "Falha ao excluir do banco");

      notifySuccess("delete", "arquivo", file.name);
      void fetchFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir arquivo";
      notifyError("delete", "arquivo", message);
    } finally {
      setDeletingId(null);
      setFileToDelete(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{folder.name}</h1>
          <p className="text-muted-foreground">{clientName}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Arquivos</CardTitle>
            <CardDescription>
              {files.length} arquivo{files.length !== 1 ? "s" : ""} nesta pasta
            </CardDescription>
          </div>
          <div>
            {canUpload && (
              <>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild disabled={uploading} className="gap-2">
                  <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploading ? "Enviando..." : "Enviar Arquivo"}
                  </label>
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4 inline-flex">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum arquivo enviado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Faça upload dos documentos fiscais e contábeis para esta pasta.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data de Upload</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell>{formatFileSize(file.file_size)}</TableCell>
                    <TableCell>
                      {new Date(file.uploaded_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                        >
                          {downloadingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setFileToDelete(file)}
                                disabled={deletingId === file.id}
                              >
                                {deletingId === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {`Você está prestes a excluir o arquivo "${file.name}". Esta ação é irreversível.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(file)}
                                  disabled={deletingId === file.id}
                                >
                                  {deletingId === file.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Excluir"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FolderDetails;
