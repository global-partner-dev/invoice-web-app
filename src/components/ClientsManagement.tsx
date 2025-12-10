import { useState, useEffect } from "react";
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
import {
  getAccountantClients,
  addAccountantClient,
  deleteAccountantClient,
} from "@/lib/api";

interface Client {
  id: string;
  client_name: string;
  client_rfc?: string;
  client_email?: string;
  client_phone?: string;
  invoice_count: number;
  created_at: string;
}

interface ClientsManagementProps {
  userId: string;
  accountantAccountNumber?: string;
}

export function ClientsManagement({
  userId,
  accountantAccountNumber,
}: ClientsManagementProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    rfc: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchClients();
  }, [userId]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await getAccountantClients(userId);
      setClients(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const newClient = await addAccountantClient(
        userId,
        formData.name,
        formData.rfc || undefined,
        formData.email || undefined,
        formData.phone || undefined
      );

      setClients([newClient, ...clients]);
      setFormData({ name: "", rfc: "", email: "", phone: "" });
      setIsDialogOpen(false);

      toast({
        title: "Success",
        description: "Client added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add client",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsDeletingId(clientId);
    try {
      await deleteAccountantClient(clientId);
      setClients(clients.filter(c => c.id !== clientId));

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete client",
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
              <CardTitle>Your Clients</CardTitle>
              <CardDescription>
                {accountantAccountNumber && `Account #${accountantAccountNumber}`}
              </CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to your accountant account.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Client Name *</Label>
                  <Input
                    id="client-name"
                    placeholder="Client Business Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isAdding}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-rfc">RFC (Tax ID)</Label>
                  <Input
                    id="client-rfc"
                    placeholder="RFC123456789ABC"
                    value={formData.rfc}
                    onChange={(e) =>
                      setFormData({ ...formData, rfc: e.target.value })
                    }
                    disabled={isAdding}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isAdding}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone">Phone</Label>
                  <Input
                    id="client-phone"
                    placeholder="52 1 222 333 4444"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={isAdding}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isAdding}>
                  {isAdding ? "Adding..." : "Add Client"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground mb-2">
              No clients yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add your first client to get started
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
                  <p className="font-medium text-sm">{client.client_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {client.client_rfc && (
                      <span>RFC: {client.client_rfc}</span>
                    )}
                    {client.client_email && (
                      <span>📧 {client.client_email}</span>
                    )}
                    <span className="ml-auto">
                      {client.invoice_count} invoice{client.invoice_count !== 1 ? "s" : ""}
                    </span>
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
