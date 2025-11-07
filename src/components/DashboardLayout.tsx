import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "user";
}

const DashboardLayout = ({ children, userRole = "user" }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-8 bg-muted/30">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
