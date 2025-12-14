import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, BarChart3, TrendingUp, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getSubscriptionPlans,
  createCheckoutSession,
  getTopupProducts,
  createTopupCheckoutSession,
  getActiveTopups,
} from "@/lib/api";

interface UsageStatsProps {
  userId: string;
  email: string;
  availableInvoices: number;
  invoiceLimit: number;
  planName: string;
  subscriptionId?: string;
}

interface Topup {
  id: string;
  invoice_count: number;
  used_count: number;
  expires_at: string;
}

export function UsageStats({
  userId,
  email,
  availableInvoices,
  invoiceLimit,
  planName,
  subscriptionId,
}: UsageStatsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoadingTopups, setIsLoadingTopups] = useState(true);
  const [activeTopups, setActiveTopups] = useState<Topup[]>([]);
  const [topupProducts, setTopupProducts] = useState<any[]>([]);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [isRechargingLoading, setIsRechargingLoading] = useState(false);

  useEffect(() => {
    fetchTopupData();
  }, [userId]);

  const fetchTopupData = async () => {
    try {
      setIsLoadingTopups(true);
      const [topups, products] = await Promise.all([
        getActiveTopups(userId),
        getTopupProducts(),
      ]);
      setActiveTopups(topups);
      setTopupProducts(products);
    } catch (error) {
      console.error("Failed to load topup data:", error);
    } finally {
      setIsLoadingTopups(false);
    }
  };

  const usagePercentage = invoiceLimit > 0 ? ((invoiceLimit - availableInvoices) / invoiceLimit) * 100 : 0;
  const hasReachedLimit = availableInvoices <= 0;
  const isFreeUser = planName === "Free";
  const totalTopupInvoices = activeTopups.reduce((sum, t) => sum + (t.invoice_count - t.used_count), 0);

  const handleRecharge = async () => {
    setIsRechargingLoading(true);
    try {
      const plans = await getSubscriptionPlans();

      if (planName === "Free") {
        const basicPlan = plans.find(p => p.name === "Basic");
        if (basicPlan) {
          const { url } = await createCheckoutSession(
            email,
            basicPlan.id,
            basicPlan.stripe_product_id
          );
          if (url) {
            localStorage.setItem("checkout_email", email);
            window.location.href = url;
          }
        }
      } else {
        const currentPlan = plans.find(p => p.name === planName);
        if (currentPlan) {
          const { url } = await createCheckoutSession(
            email,
            currentPlan.id,
            currentPlan.stripe_product_id
          );
          if (url) {
            localStorage.setItem("checkout_email", email);
            window.location.href = url;
          }
        }
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("usageStats.failedRecharge"),
        variant: "destructive",
      });
    } finally {
      setIsRechargingLoading(false);
    }
  };

  const handleBuyTopup = async (productId: string) => {
    setIsTopupLoading(true);
    try {
      const { url } = await createTopupCheckoutSession(email, productId);
      if (url) {
        localStorage.setItem("checkout_email", email);
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("usageStats.failedTopup"),
        variant: "destructive",
      });
    } finally {
      setIsTopupLoading(false);
    }
  };

  const relevantTopups = topupProducts.filter(p => {
    if (planName === "Premium") return p.user_type === "accountant";
    return p.user_type === "individual";
  });

  return (
    <Card className={hasReachedLimit ? "border-red-500 border-2" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t("usageStats.title")}</CardTitle>
              <CardDescription>{planName} {t("usageStats.plan")}</CardDescription>
            </div>
          </div>
          {hasReachedLimit && <AlertCircle className="h-5 w-5 text-red-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {availableInvoices} {t("usageStats.available")} ({invoiceLimit} {t("usageStats.plan")} {totalTopupInvoices > 0 ? `+ ${totalTopupInvoices} ${t("usageStats.topup")}` : ""})
          </span>
          <span className="text-sm text-muted-foreground">
            {invoiceLimit > 0 ? `${Math.round(usagePercentage)}% ${t("usageStats.used")}` : t("usageStats.notAvailable")}
          </span>
        </div>

        <Progress value={Math.min(usagePercentage, 100)} />

        {hasReachedLimit && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-900">{t("usageStats.noInvoices")}</p>
              <p className="text-xs text-red-700">{t("usageStats.noInvoicesDesc")}</p>
            </div>
          </div>
        )}

        {hasReachedLimit && (
          <Button className="w-full" onClick={handleRecharge} disabled={isRechargingLoading}>
            {isRechargingLoading ? (
              <>
                <TrendingUp className="h-4 w-4 mr-2 animate-spin" />
                {t("common.processing")}
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                {isFreeUser ? t("usageStats.upgradeBasic") : t("usageStats.upgradePlan")}
              </>
            )}
          </Button>
        )}

        {!isLoadingTopups && relevantTopups.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground">{t("usageStats.quickTopup")}</h4>
            <div className="grid grid-cols-1 gap-2">
              {relevantTopups.map(product => (
                <Button
                  key={product.id}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleBuyTopup(product.id)}
                  disabled={isTopupLoading}
                >
                  <Package className="h-3 w-3 mr-2" />
                  +{product.invoice_count} {t("usageStats.forPesos")} {product.price} pesos
                </Button>
              ))}
            </div>
          </div>
        )}

        {!hasReachedLimit && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700">
              {t("usageStats.youHaveAvailable", { count: availableInvoices, pluralized: availableInvoices !== 1 ? t("usageStats.invoices") : t("usageStats.invoice") })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
