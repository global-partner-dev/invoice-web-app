import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getSubscriptionUsage,
  getTopupProducts,
  getActiveTopups,
  getSubscriptionPlans,
  createCheckoutSession,
  createTopupCheckoutSession,
  getUserProfile,
} from "@/lib/api";

interface TopupProduct {
  id: string;
  name: string;
  description: string;
  invoice_count: number;
  stripe_product_id: string;
  price: number;
  is_active: boolean;
}

interface ActiveTopup {
  id: string;
  invoice_count: number;
  used_count: number;
  expires_at: string;
  topup_products: {
    name: string;
    invoice_count: number;
  };
}

const Subscriptions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscriptionUsage, setSubscriptionUsage] = useState<{
    subscriptionId: string | null;
    availableInvoices: number;
    invoiceLimit: number;
    planName: string;
    status: string;
  } | null>(null);
  const [topupProducts, setTopupProducts] = useState<TopupProduct[]>([]);
  const [activeTopups, setActiveTopups] = useState<ActiveTopup[]>([]);
  const [selectedTopup, setSelectedTopup] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLinkedUser, setIsLinkedUser] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [usage, topups, activeTopupsList, profileData] = await Promise.all([
          getSubscriptionUsage(user.id),
          getTopupProducts(),
          getActiveTopups(user.id),
          getUserProfile(user.id),
        ]);
        setSubscriptionUsage(usage);
        setTopupProducts(topups);
        setActiveTopups(activeTopupsList);
        
        // Check if user is linked to an accountant
        if (profileData?.related_account) {
          setIsLinkedUser(true);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
        toast({
          title: t("common.error"),
          description: t("subscriptions.failedLoadInfo"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast, t]);

  const handleSubscribeNow = async () => {
    if (!user?.email) return;

    setIsCheckingOut(true);
    try {
      const plans = await getSubscriptionPlans();

      if (plans.length === 0) {
        toast({
          title: t("common.error"),
          description: t("subscriptions.noPlansAvailable"),
          variant: "destructive",
        });
        return;
      }

      const defaultPlan = plans[0];
      const { url } = await createCheckoutSession(user.email, defaultPlan.id, defaultPlan.stripe_product_id);

      if (url) {
        localStorage.setItem("checkout_email", user.email);
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("subscriptions.failedCheckout"),
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleBuyMore = async (topupId: string) => {
    if (!user?.email) return;

    setSelectedTopup(topupId);
    setIsCheckingOut(true);

    try {
      const { url } = await createTopupCheckoutSession(user.email, topupId);

      if (url) {
        localStorage.setItem("checkout_email", user.email);
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("subscriptions.failedTopup"),
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
      setSelectedTopup(null);
    }
  };

  const isUnsubscribed = subscriptionUsage?.status === "inactive";
  const isLimitReached =
    subscriptionUsage &&
    (subscriptionUsage.planName === "Free"
      ? subscriptionUsage.invoiceLimit - subscriptionUsage.availableInvoices <= 0
      : subscriptionUsage.availableInvoices <= 0) &&
    (subscriptionUsage.invoiceLimit > 0 || subscriptionUsage.planName === "Free");

  if (loading) {
    return (
      <DashboardLayout isLinkedUser={isLinkedUser}>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t("subscriptions.loadingInfo")}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout isLinkedUser={isLinkedUser}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("subscriptions.title")}</h1>
          <p className="text-muted-foreground">{t("subscriptions.subtitle")}</p>
        </div>

        {/* Current Subscription Status */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{t("subscriptions.currentSubscription")}</CardTitle>
                <CardDescription>{t("subscriptions.currentSubscriptionDesc")}</CardDescription>
              </div>
              <Badge variant={subscriptionUsage?.status === "active" ? "default" : "secondary"}>
                {subscriptionUsage?.status === "active" ? t("subscriptions.statusActive") : t("subscriptions.statusInactive")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan Name */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("subscriptions.plan")}</p>
                <p className="text-2xl font-bold">{subscriptionUsage?.planName || "Free"}</p>
              </div>

              {/* Invoice Limit */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("subscriptions.invoiceLimit")}</p>
                <p className="text-2xl font-bold">{subscriptionUsage?.invoiceLimit || "2"}</p>
              </div>

              {/* Available Invoices */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("subscriptions.availableInvoices")}</p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-2xl font-bold ${
                      isLimitReached ? "text-destructive" : "text-green-600"
                    }`}
                  >
                    {subscriptionUsage?.planName === "Free"
                      ? subscriptionUsage.invoiceLimit - subscriptionUsage.availableInvoices
                      : subscriptionUsage?.availableInvoices || 0}
                  </p>
                  {isLimitReached && <AlertCircle className="w-5 h-5 text-destructive" />}
                  {!isLimitReached && subscriptionUsage?.status === "active" && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Usage Progress Bar */}
            {subscriptionUsage && (subscriptionUsage.invoiceLimit > 0 || subscriptionUsage.planName === "Free") && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t("subscriptions.available")}</span>
                  <span className="text-muted-foreground">
                    {subscriptionUsage.planName === "Free"
                      ? subscriptionUsage.invoiceLimit - subscriptionUsage.availableInvoices
                      : subscriptionUsage.availableInvoices}{" "}
                    {t("subscriptions.of")} {subscriptionUsage.invoiceLimit || 2}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isLimitReached ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{
                      width: `${
                        subscriptionUsage.planName === "Free"
                          ? (subscriptionUsage.availableInvoices / (subscriptionUsage.invoiceLimit || 2)) * 100
                          : ((Math.max(0, (subscriptionUsage.invoiceLimit || 2) - subscriptionUsage.availableInvoices)) /
                              (subscriptionUsage.invoiceLimit || 2)) *
                            100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isUnsubscribed && (
                <Button
                  onClick={handleSubscribeNow}
                  disabled={isCheckingOut}
                  className="w-full md:w-fit"
                  size="lg"
                >
                  {isCheckingOut ? t("subscriptions.processing") : t("subscriptions.subscribeNow")}
                </Button>
              )}
              {isLimitReached && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm">{t("subscriptions.limitReached")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("subscriptions.limitReachedDesc")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Topups */}
        {activeTopups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptions.activeAddons")}</CardTitle>
              <CardDescription>{t("subscriptions.activeAddonsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTopups.map((topup) => (
                  <div
                    key={topup.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{topup.topup_products.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{t("subscriptions.expires")}: {new Date(topup.expires_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span>
                            {topup.invoice_count - topup.used_count} {t("subscriptions.of")} {topup.invoice_count} {t("subscriptions.invoices")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topup Products */}
        {topupProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptions.buyMoreInvoices")}</CardTitle>
              <CardDescription>{t("subscriptions.buyMoreInvoicesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topupProducts
                  .filter((product) => {
                    const planName = subscriptionUsage?.planName?.toLowerCase() || "";
                    const invoiceCount = product.invoice_count || 0;

                    if (invoiceCount === 25) {
                      return planName === "basic" || planName === "standard";
                    }
                    if (invoiceCount === 50) {
                      return planName === "premium";
                    }
                    return true;
                  })
                  .map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                    <div className="flex items-baseline gap-2 mb-4">
                      <p className="text-2xl font-bold">{product.invoice_count}</p>
                      <p className="text-muted-foreground">{t("subscriptions.invoices")}</p>
                    </div>
                    <div className="text-lg font-semibold mb-4">
                      {t("subscriptions.price")}{(product.price).toFixed(2)}
                    </div>
                    <Button
                      onClick={() => handleBuyMore(product.id)}
                      disabled={isCheckingOut && selectedTopup === product.id}
                      className="w-full mt-auto"
                    >
                      {isCheckingOut && selectedTopup === product.id ? (
                        t("subscriptions.processing")
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {t("subscriptions.buyNow")}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Subscriptions;
