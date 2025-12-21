import { User, Users, LogOut, Menu, CreditCard, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/api";

interface AppSidebarProps {
  userRole: "admin" | "user";
  isLinkedUser?: boolean;
}

export function AppSidebar({ userRole, isLinkedUser = false }: AppSidebarProps) {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userItems = [
    { title: t("sidebar.profile"), url: "/dashboard/profile", icon: User },
    { title: t("sidebar.subscriptions"), url: "/dashboard/subscriptions", icon: CreditCard },
  ];

  const adminItems = [
    { title: t("sidebar.userManagement"), url: "/admin/users", icon: Users },
    { title: t("sidebar.subscriptions"), url: "/admin/subscriptions", icon: BarChart3 },
  ];

  let items = userRole === "admin" ? adminItems : userItems;
  
  // Hide Subscriptions item for linked users
  if (isLinkedUser && userRole === "user") {
    items = items.filter((item) => item.title !== t("sidebar.subscriptions"));
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: t("common.logout"),
        description: t("sidebar.logoutSuccess"),
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: t("sidebar.logoutError"),
        description: error instanceof Error ? error.message : t("common.error"),
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
          <Link to="/" className="text-base sm:text-lg font-semibold text-sidebar-foreground truncate hover:opacity-80 transition-opacity">
            {t("common.invoiceApp")}
          </Link>
        )}
        <SidebarTrigger className="h-8 w-8 sm:h-10 sm:w-10">
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </SidebarTrigger>
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs sm:text-sm px-2 sm:px-4">
            {userRole === "admin" ? t("dashboard.adminNavigation") : t("dashboard.navigation")}
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

      <div className="mt-auto p-2 sm:p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className={`w-full ${open ? 'justify-start px-2 sm:px-4' : 'justify-center px-0'} text-sm sm:text-base h-9 sm:h-10`}
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className={`h-4 w-4 sm:h-5 sm:w-5 ${open ? 'mr-2' : 'mr-0'} flex-shrink-0`} />
          {open && (
            <span className="ml-2">
              {isLoggingOut ? t("sidebar.loggingOut") : t("common.logout")}
            </span>
          )}
        </Button>
      </div>
    </Sidebar>
  );
}
