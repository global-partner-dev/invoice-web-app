import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, User, ArrowLeft, Mail } from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import { signupWithPhoneAndPassword, validatePassword } from "@/lib/api";

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownSeconds > 0) {
      toast({
        title: "Please wait",
        description: `Try again in ${cooldownSeconds} seconds`,
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || !fullName || !email || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast({
        title: "Password Error",
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signupWithPhoneAndPassword(phoneNumber, password, fullName, email);
      setStep(2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      
      if (errorMessage.includes("only request this after")) {
        const match = errorMessage.match(/after (\d+) seconds/);
        const seconds = match ? parseInt(match[1]) : 60;
        setCooldownSeconds(seconds);
        toast({
          title: "Too many attempts",
          description: `Please wait ${seconds} seconds before trying again`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
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

        {step === 1 ? (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold text-center">Create Account</CardTitle>
              <CardDescription className="text-center">
                Sign up to subscribe to a plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

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
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 8 chars, uppercase letter, number, special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || cooldownSeconds > 0}>
                  {isLoading ? "Creating Account..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Continue to Plans"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Login here
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold text-center">Choose Your Plan</CardTitle>
              <CardDescription className="text-center">
                Welcome {fullName}! Select a subscription plan to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <SubscriptionPlans phoneNumber={phoneNumber} />

              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setPhoneNumber("");
                    setFullName("");
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Back
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
