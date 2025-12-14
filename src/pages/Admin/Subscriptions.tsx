import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAllSubscriptionsWithUsers } from "@/lib/api";

interface SubscriptionData {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    related_account: string | null;
  };
  subscription_plan: {
    id: string;
    name: string;
    stripe_product_id: string;
  };
  status: string;
  current_period_end: string | null;
  invoice_limit: number | null;
  available_invoices: number | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

const Subscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: subscriptions = [], isLoading, error } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: getAllSubscriptionsWithUsers,
  });

  const filteredSubscriptions = subscriptions.filter(
    (sub: SubscriptionData) =>
      (sub.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (sub.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (sub.user.phone_number?.includes(searchQuery) || false) ||
      (sub.subscription_plan.name.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInvoiceUsage = (available: number | null, limit: number | null) => {
    if (limit === null || limit === 0) return "—";
    const used = Math.max(0, (limit || 0) - (available || 0));
    return `${used} / ${limit}`;
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div>
            <h1 className="text-4xl font-bold">Subscription Management</h1>
            <p className="text-muted-foreground mt-2">
              View and monitor all user subscriptions, plans, and invoice usage
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-2">Total Subscriptions</p>
            <p className="text-3xl font-bold text-blue-900">{subscriptions.length}</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium mb-2">Active</p>
            <p className="text-3xl font-bold text-green-900">
              {subscriptions.filter((s: SubscriptionData) => s.status === "active").length}
            </p>
          </div>
          <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium mb-2">Canceled</p>
            <p className="text-3xl font-bold text-red-900">
              {subscriptions.filter((s: SubscriptionData) => s.status === "canceled").length}
            </p>
          </div>
          <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-600 font-medium mb-2">Other</p>
            <p className="text-3xl font-bold text-amber-900">
              {subscriptions.filter((s: SubscriptionData) => !["active", "canceled"].includes(s.status)).length}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>
              Monitor subscription status, plans, and invoice limits for all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700">Failed to load subscriptions. Please try again later.</p>
                </div>
                <p className="text-red-600 text-sm font-mono">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground">Loading subscriptions...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSubscriptions.length > 0 ? (
                    filteredSubscriptions.map((sub: SubscriptionData) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.user.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{sub.user.email || "—"}</TableCell>
                        <TableCell className="text-sm">{sub.user.phone_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.subscription_plan.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(sub.status)}>
                            {sub.status}
                            {sub.cancel_at_period_end && " (will cancel)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getInvoiceUsage(sub.available_invoices, sub.invoice_limit)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(sub.current_period_end)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.user.related_account ? (
                            <Badge variant="secondary">Linked</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(sub.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No subscriptions match your search" : "No subscriptions found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Subscriptions;
