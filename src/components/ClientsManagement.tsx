import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLinkedUsers, createAndLinkUser, unlinkUser, type LinkedUser } from "@/lib/api";

interface ClientsManagementProps {
  userId: string;
}

export function ClientsManagement({ userId }: ClientsManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clients, setClients] = useState<LinkedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
  });

  useEffect(() => {
    fetchClients();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await getLinkedUsers(userId);
      setClients(data);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("clients.failedAdd"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast({
        title: t("common.error"),
        description: t("clients.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: t("common.error"),
        description: t("clients.emailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: t("common.error"),
        description: t("clients.phoneRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const newClient = await createAndLinkUser(userId, {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      });

      setClients([newClient, ...clients]);
      setFormData({ fullName: "", email: "", phoneNumber: "" });
      setIsDialogOpen(false);

      toast({
        title: t("common.success"),
        description: t("clients.addedSuccess"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("clients.failedAdd"),
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsDeletingId(clientId);
    try {
      await unlinkUser(clientId);
      setClients(clients.filter((c) => c.id !== clientId));

      toast({
        title: t("common.success"),
        description: t("clients.removedSuccess"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("clients.failedRemove"),
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t("clients.title")}</CardTitle>
              <CardDescription>
                {t("clients.subtitle")}
              </CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("clients.addButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("clients.addTitle")}</DialogTitle>
                <DialogDescription>
                  {t("clients.addDescription")}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">{t("clients.fullName")} {t("clients.required")}</Label>
                  <Input
                    id="client-name"
                    placeholder={t("clients.placeholderName")}
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    disabled={isAdding}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email">{t("clients.email")} {t("clients.required")}</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder={t("clients.placeholderEmail")}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isAdding}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone">{t("clients.phone")} {t("clients.required")}</Label>
                  <Input
                    id="client-phone"
                    placeholder={t("clients.placeholderPhone")}
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    disabled={isAdding}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isAdding}>
                  {isAdding ? t("clients.creating") : t("clients.createAndLink")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">{t("clients.loading")}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t("clients.noClients")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("clients.noClientsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{client.full_name || t("clients.unnamed")}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {client.phone_number && (
                      <span>📱 {client.phone_number}</span>
                    )}
                    {client.email && (
                      <span>📧 {client.email}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClient(client.id)}
                  disabled={isDeletingId === client.id}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
