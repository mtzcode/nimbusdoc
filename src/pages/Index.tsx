import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Users, FolderOpen } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <FileText className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-4">
              NymbusDOC
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema profissional de organização de arquivos fiscais com controle de acesso
            </p>
          </div>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            Acessar Sistema
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Seguro e Confiável</h3>
            <p className="text-muted-foreground">
              Sistema com autenticação robusta e controle de permissões por perfil
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <FolderOpen className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Organização Eficiente</h3>
            <p className="text-muted-foreground">
              Gerencie arquivos fiscais por cliente e pasta de forma intuitiva
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <Users className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Acesso Controlado</h3>
            <p className="text-muted-foreground">
              Vincule contabilidades aos clientes e gerencie acessos facilmente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
