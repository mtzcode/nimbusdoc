import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

  const canUpload = userRole === "admin" || !!appPermissions?.user_can_manage_folders;
  const canDelete = userRole === "admin" || !!appPermissions?.user_can_delete_files;

  const fetchFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folder.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
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
      
      const { error: uploadError } = await supabase.storage
        .from("fiscal-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("files").insert({
        folder_id: folder.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      void fetchFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao enviar arquivo";
      toast.error(message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      const { data, error } = await supabase.storage
        .from("fiscal-files")
        .download(file.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleDelete = async (file: FileType) => {
    if (!confirm("Deseja realmente excluir este arquivo?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("fiscal-files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast.success("Arquivo excluído com sucesso!");
      void fetchFiles();
    } catch (error: unknown) {
      toast.error("Erro ao excluir arquivo");
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
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4" />
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
            <div className="text-center py-8 text-muted-foreground">
              Nenhum arquivo enviado ainda
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
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
