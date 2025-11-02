import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import AccountantClientsView from "./accountant/AccountantClientsView";

const AccountantDashboard = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar userRole="accountant" />
        <main className="flex-1 p-6">
          <AccountantClientsView />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AccountantDashboard;
