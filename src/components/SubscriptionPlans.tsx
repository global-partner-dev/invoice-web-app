import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getSubscriptionPlans, createCheckoutSession } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

interface Plan {
  id: string;
  name: string;
  stripe_product_id: string;
  description: string;
  features: string[];
}

interface SubscriptionPlansProps {
  phoneNumber?: string;
  onClose?: () => void;
}

export function SubscriptionPlans({ phoneNumber, onClose }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getSubscriptionPlans();
        setPlans(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter your phone number first",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlan(plan.id);
    setIsCheckingOut(true);

    try {
      const { sessionId, url } = await createCheckoutSession(
        phoneNumber,
        plan.id,
        plan.stripe_product_id
      );

      if (url) {
        localStorage.setItem("checkout_phone_number", phoneNumber);
        window.location.href = url;
      } else {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <p className="text-sm sm:text-base text-muted-foreground">Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`flex flex-col h-full transition-all duration-300 ${
            selectedPlan === plan.id ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader className="px-4 sm:px-6 py-4">
            <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">Features</h4>
              <ul className="space-y-2">
                {(plan.features || []).map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
              onClick={() => handleSelectPlan(plan)}
              disabled={isCheckingOut && selectedPlan === plan.id}
            >
              {isCheckingOut && selectedPlan === plan.id ? "Processing..." : "Subscribe"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
