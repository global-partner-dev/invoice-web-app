import { User, Users, LogOut, Menu } from "lucide-react";
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
import { logout } from "@/lib/api";

interface AppSidebarProps {
  userRole: "admin" | "user";
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const userItems = [
    { title: "Profile", url: "/dashboard/profile", icon: User },
  ];

  const adminItems = [
    { title: "User Management", url: "/admin/users", icon: Users },
  ];

  const items = userRole === "admin" ? adminItems : userItems;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <div className="p-4 flex items-center justify-between border-b">
        {open && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Invoice App
          </h2>
        )}
        <SidebarTrigger>
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{userRole === "admin" ? "Admin" : "Dashboard"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {open && <span>Logout</span>}
        </Button>
      </div>
    </Sidebar>
  );
}
