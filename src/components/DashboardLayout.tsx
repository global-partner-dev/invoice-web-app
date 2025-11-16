import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "user";
}

const MobileHeader = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="sm:hidden sticky top-0 z-40 bg-white border-b">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <h1 className="text-base font-semibold text-foreground">Invoice App</h1>
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-muted rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children, userRole = "user" }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col sm:flex-row">
        <AppSidebar userRole={userRole} />
        <div className="flex-1 flex flex-col w-full">
          <MobileHeader />
          <main className="flex-1 p-3 sm:p-6 md:p-8 bg-muted/30 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
