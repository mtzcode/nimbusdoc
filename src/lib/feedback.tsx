import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type Action = "create" | "update" | "delete" | "upload" | "download";

const successLabel: Record<Action, string> = {
  create: "Criado",
  update: "Atualizado",
  delete: "Excluído",
  upload: "Enviado",
  download: "Baixado",
};

const verbLabel: Record<Action, string> = {
  create: "criar",
  update: "atualizar",
  delete: "excluir",
  upload: "enviar",
  download: "baixar",
};

export function notifySuccess(action: Action, subject?: string, description?: string) {
  const title = `${successLabel[action]} com sucesso!`;
  const desc = description ?? subject ?? undefined;
  toast.success(title, {
    description: desc,
    icon: <CheckCircle2 className="h-5 w-5" />,
  });
}

export function notifyError(action: Action, subject?: string, error?: string) {
  const fallback = `Erro ao ${verbLabel[action]}${subject ? ` ${subject}` : ""}`;
  toast.error(error ?? fallback, {
    icon: <XCircle className="h-5 w-5" />,
    description: subject && !error ? `Item: ${subject}` : undefined,
  });
}

export function notifyWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    icon: <AlertTriangle className="h-5 w-5" />,
  });
}

export function notifyInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    icon: <Info className="h-5 w-5" />,
  });
}