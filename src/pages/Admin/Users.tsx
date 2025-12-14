import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Edit, Trash2, AlertCircle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAllUsers, updateUserAsAdmin, deleteUserAsAdmin, getAllSubscriptionsWithUsers } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  phone_number: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

interface SubscriptionInfo {
  plan_name: string | null;
  status: string | null;
}

const Users = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["admin-subscriptions-users"],
    queryFn: getAllSubscriptionsWithUsers,
  });

  const subscriptionMap = new Map<string, SubscriptionInfo>();
  subscriptions.forEach((sub: any) => {
    if (sub.user_id) {
      subscriptionMap.set(sub.user_id, {
        plan_name: sub.subscription_plan?.name || null,
        status: sub.status,
      });
    }
  });

  const isLoading = usersLoading || subscriptionsLoading;

  const updateUserMutation = useMutation({
    mutationFn: (data: typeof editFormData) =>
      updateUserAsAdmin(selectedUser!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpenEditDialog(false);
      setSelectedUser(null);
      setEditFormData({ full_name: "", email: "", phone_number: "" });
      toast({ title: t("common.success"), description: t("users.updateSuccess") });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("users.updateFailed"),
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUserAsAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: t("common.success"), description: t("users.deleteSuccess") });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("users.deleteFailed"),
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (user.phone_number?.includes(searchQuery) || false)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
    });
    setOpenEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editFormData.full_name || !editFormData.email || !editFormData.phone_number) {
      toast({ title: t("common.error"), description: t("users.allFieldsRequired"), variant: "destructive" });
      return;
    }
    updateUserMutation.mutate(editFormData);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm(t("users.confirmDelete"))) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div>
            <h1 className="text-4xl font-bold">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("users.subtitle")}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("users.allUsers")}</CardTitle>
            <CardDescription>
              {t("users.allUsersDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700">{t("users.failedLoadUsers")}</p>
                </div>
                <p className="text-red-600 text-sm font-mono">{error instanceof Error ? error.message : String(error)}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("users.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("users.columnName")}</TableHead>
                    <TableHead>{t("users.columnEmail")}</TableHead>
                    <TableHead>{t("users.columnPhone")}</TableHead>
                    <TableHead>{t("users.columnPlan")}</TableHead>
                    <TableHead>{t("users.columnCreated")}</TableHead>
                    <TableHead className="text-right">{t("users.columnActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground">{t("users.loadingUsers")}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const subInfo = subscriptionMap.get(user.id);
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>{user.phone_number || "—"}</TableCell>
                          <TableCell>
                            {subInfo?.plan_name ? (
                              <Badge variant="outline">{subInfo.plan_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t("users.noPlan")}</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditClick(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? t("users.noMatchSearch") : t("users.noUsers")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("users.editUserTitle")}</DialogTitle>
              <DialogDescription>
                {t("users.editUserDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("users.labelFullName")}</label>
                <Input
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder={t("users.placeholderFullName")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("users.labelEmail")}</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder={t("users.placeholderEmail")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("users.labelPhone")}</label>
                <Input
                  value={editFormData.phone_number}
                  onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                  placeholder={t("users.placeholderPhone")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenEditDialog(false)}
              >
                {t("users.buttonCancel")}
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? t("users.buttonUpdating") : t("users.buttonUpdate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Users;
