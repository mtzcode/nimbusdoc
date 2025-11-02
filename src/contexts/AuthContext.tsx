import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AppPermissions = {
  id?: number;
  user_can_view_clients: boolean;
  user_can_edit_clients: boolean;
  user_can_manage_folders: boolean;
  user_can_delete_files: boolean;
  admin_can_manage_users: boolean;
  admin_can_manage_permissions: boolean;
  // Novas permissões para contabilidades
  user_can_view_accountants?: boolean;
  user_can_edit_accountants?: boolean;
};

type UserRole = "admin" | "accountant" | "user" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  loading: boolean;
  appPermissions: AppPermissions | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [appPermissions, setAppPermissions] = useState<AppPermissions | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      // Carrega permissões do app (globais)
      await fetchAppPermissions();
      setLoading(false);
    };
    void init();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
        return;
      }

      const rows = (data ?? []) as Array<{ role: "admin" | "accountant" | "user" }>
      const roles: Array<"admin" | "accountant" | "user"> = rows.map((r) => r.role);
      let effective: UserRole = null;
      if (roles.includes("admin")) effective = "admin";
      else if (roles.includes("user")) effective = "user";
      else if (roles.includes("accountant")) effective = "accountant";

      setUserRole(effective);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  };

  const fetchAppPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("app_permissions")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching app permissions:", error);
        return;
      }

      if (data) {
        const perms = data as AppPermissions;
        setAppPermissions({
          ...perms,
          user_can_view_accountants: perms.user_can_view_accountants ?? false,
          user_can_edit_accountants: perms.user_can_edit_accountants ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching app permissions:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login";
      toast.error(message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast.success("Cadastro realizado com sucesso!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar conta";
      toast.error(message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      setUserRole(null);
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao sair";
      toast.error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        appPermissions,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
