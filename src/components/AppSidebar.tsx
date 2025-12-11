import { User, Users, LogOut, Menu, CreditCard } from "lucide-react";
import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/api";

interface AppSidebarProps {
  userRole: "admin" | "user";
  isLinkedUser?: boolean;
}

export function AppSidebar({ userRole, isLinkedUser = false }: AppSidebarProps) {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userItems = [
    { title: "Profile", url: "/dashboard/profile", icon: User },
    { title: "Subscriptions", url: "/dashboard/subscriptions", icon: CreditCard },
  ];

  const adminItems = [
    { title: "User Management", url: "/admin/users", icon: Users },
  ];

  let items = userRole === "admin" ? adminItems : userItems;
  
  // Hide Subscriptions item for linked users
  if (isLinkedUser && userRole === "user") {
    items = items.filter((item) => item.title !== "Subscriptions");
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout error",
        description: error instanceof Error ? error.message : "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r hidden sm:flex">
      <div className="p-2 sm:p-4 flex items-center justify-between border-b gap-2">
        {open && (
          <h2 className="text-base sm:text-lg font-semibold text-sidebar-foreground truncate">
            Invoice App
          </h2>
        )}
        <SidebarTrigger className="h-8 w-8 sm:h-10 sm:w-10">
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </SidebarTrigger>
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs sm:text-sm px-2 sm:px-4">
            {userRole === "admin" ? "Admin" : "Dashboard"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-sm sm:text-base">
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-2 sm:p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm sm:text-base h-9 sm:h-10 px-2 sm:px-4"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-0 sm:mr-2 flex-shrink-0" />
          {open && (
            <span className="hidden sm:inline ml-2">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          )}
        </Button>
      </div>
    </Sidebar>
  );
}
