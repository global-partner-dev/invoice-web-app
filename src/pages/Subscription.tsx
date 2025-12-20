import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, User, ArrowLeft, Mail } from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import { signupWithEmail, validatePassword, loginWithEmail } from "@/lib/api";
import { normalizePhoneNumber } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Subscription = () => {
  const { t } = useTranslation();
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
        title: t("signup.errorWaitSeconds"),
        description: t("signup.errorTryAgainSeconds", { seconds: cooldownSeconds }),
        variant: "destructive",
      });
      return;
    }

    if (!email || !fullName || !password || !confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("signup.errorFillFields"),
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast({
        title: t("signup.errorPasswordError"),
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("signup.errorPasswordNoMatch"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Normalize phone number to format: 5217221015653
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      await signupWithEmail(email, password, fullName, normalizedPhone);
      
      try {
        await loginWithEmail(email, password);
      } catch (loginError) {
        console.error("Auto-login failed after signup:", loginError);
      }
      
      setStep(2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      
      if (errorMessage.includes("only request this after")) {
        const match = errorMessage.match(/after (\d+) seconds/);
        const seconds = match ? parseInt(match[1]) : 60;
        setCooldownSeconds(seconds);
        toast({
          title: t("signup.errorTooManyAttempts"),
          description: t("signup.errorTryAgain", { seconds }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("signup.errorSignupFailed"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-3 sm:px-4 py-6 sm:py-8 flex items-center justify-center relative">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto w-full max-w-4xl px-0 sm:px-4">
        <Button
          variant="ghost"
          className="mb-4 sm:mb-6 gap-2 px-2 sm:px-3"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t("signup.backToLogin")}</span>
          <span className="sm:hidden">{t("signup.back")}</span>
        </Button>

        {step === 1 ? (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-center">{t("signup.title")}</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                {t("signup.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm sm:text-base">{t("signup.labelFullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t("signup.placeholderFullName")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">{t("signup.labelEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("signup.placeholderEmail")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">{t("signup.labelPhone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t("signup.placeholderPhone")}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("signup.phoneFormat")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">{t("signup.labelPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("signup.placeholderPassword")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t("signup.passwordRequirements")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base">{t("signup.labelConfirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("signup.placeholderConfirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base" disabled={isLoading || cooldownSeconds > 0}>
                  {isLoading ? t("signup.buttonCreating") : cooldownSeconds > 0 ? t("signup.buttonWait", { seconds: cooldownSeconds }) : t("signup.buttonContinue")}
                </Button>

                <div className="text-center text-xs sm:text-sm text-muted-foreground">
                  {t("signup.haveAccount")}{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    {t("signup.loginLink")}
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full shadow-elegant">
            <CardHeader className="space-y-1 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-center">{t("signup.planTitle")}</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                {t("signup.planSubtitle", { name: fullName })}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
              <SubscriptionPlans email={email} />

              <div className="mt-6 sm:mt-8 text-center">
                <Button
                  variant="outline"
                  className="h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() => {
                    setStep(1);
                    setPhoneNumber("");
                    setFullName("");
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                >
                  {t("signup.buttonBack")}
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
