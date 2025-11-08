import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, ArrowLeft } from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { useToast } from "@/hooks/use-toast";

const Subscription = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get("number") || "");
  const [isPhoneConfirmed, setIsPhoneConfirmed] = useState(false);
  const { toast } = useToast();

  const handleConfirmPhone = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsPhoneConfirmed(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>

        {!isPhoneConfirmed ? (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold text-center">Subscribe to a Plan</CardTitle>
              <CardDescription className="text-center">
                Enter your phone number to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmPhone} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+52 722 101 5653"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Continue to Plans
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold text-center">Choose Your Plan</CardTitle>
              <CardDescription className="text-center">
                Phone: {phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <SubscriptionPlans phoneNumber={phoneNumber} />

              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPhoneConfirmed(false);
                    setPhoneNumber("");
                  }}
                >
                  Change Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Subscription;
