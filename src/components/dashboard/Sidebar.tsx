import { FileText, Users, Building2, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface SidebarProps {
  userRole: "admin" | "accountant" | "user";
  currentView?: "clients" | "accountants" | "settings_users" | "settings_permissions";
  onViewChange?: (view: "clients" | "accountants" | "settings_users" | "settings_permissions") => void;
}

export function Sidebar({ userRole, currentView, onViewChange }: SidebarProps) {
  const { signOut, appPermissions } = useAuth();

  const adminMenuItems = [
    { title: "Clientes", icon: Building2, view: "clients" as const },
    { title: "Contabilidades", icon: Users, view: "accountants" as const },
  ];

  const accountantMenuItems = [
    { title: "Meus Clientes", icon: Building2, view: "clients" as const },
  ];

  const userMenuItems = [
    { title: "Clientes", icon: Building2, view: "clients" as const },
    // Adiciona Contabilidades somente se o usuário tiver permissão de visualizar
    ...(appPermissions?.user_can_view_accountants
      ? [{ title: "Contabilidades", icon: Users, view: "accountants" as const }]
      : []),
  ];

  const menuItems = userRole === "admin" ? adminMenuItems : userRole === "accountant" ? accountantMenuItems : userMenuItems;

  return (
    <SidebarUI className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">NymbusDOC</h2>
            <p className="text-xs text-sidebar-foreground/70">
              {userRole === "admin" ? "Administrador" : userRole === "accountant" ? "Contabilidade" : "Usuário"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onViewChange?.(item.view)}
                    isActive={currentView === item.view}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Configurações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onViewChange?.("settings_users")}
                    isActive={currentView === "settings_users"}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Usuários</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onViewChange?.("settings_permissions")}
                    isActive={currentView === "settings_permissions"}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Permissões</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="w-full text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  );
}
