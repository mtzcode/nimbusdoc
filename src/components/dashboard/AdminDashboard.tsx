import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import ClientsView from "./admin/ClientsView";
import AccountantsView from "./admin/AccountantsView";
import SettingsUsers from "./admin/SettingsUsers";
import SettingsPermissions from "./admin/SettingsPermissions";
import { useAuth } from "@/contexts/AuthContext";
import PermissionGate from "@/components/security/PermissionGate";

const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState<"clients" | "accountants" | "settings_users" | "settings_permissions">("clients");
  const { userRole } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar userRole={(userRole === "user" ? "user" : "admin")} currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 p-6">
          {currentView === "clients" && (
            <PermissionGate allow={["admin", "user"]}>
              <ClientsView />
            </PermissionGate>
          )}
          {currentView === "accountants" && (
            <PermissionGate allow={["admin", "user"]}>
              <AccountantsView />
            </PermissionGate>
          )}
          {currentView === "settings_users" && (
            <PermissionGate allow={["admin"]}>
              <SettingsUsers />
            </PermissionGate>
          )}
          {currentView === "settings_permissions" && (
            <PermissionGate allow={["admin"]}>
              <SettingsPermissions />
            </PermissionGate>
          )}
      </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
