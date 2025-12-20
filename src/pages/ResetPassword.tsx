import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { updatePasswordAfterReset, validatePassword } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setIsValidSession(false);
      } else {
        setIsValidSession(true);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("resetPassword.errorBothPasswords"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("resetPassword.errorPasswordsNoMatch"),
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      toast({
        title: t("common.error"),
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await updatePasswordAfterReset(newPassword);
      setIsSuccess(true);
      toast({
        title: t("common.success"),
        description: t("resetPassword.successResetPassword"),
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("resetPassword.errorFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-4 py-8 relative">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-sm shadow-elegant">
          <CardContent className="pt-6">
            <div className="text-center">{t("resetPassword.loading")}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-4 py-8 relative">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-sm shadow-elegant">
          <CardHeader className="space-y-3">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
            <CardTitle className="text-center">{t("resetPassword.invalidTitle")}</CardTitle>
            <CardDescription className="text-center">
              {t("resetPassword.invalidDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")} className="w-full">
              {t("resetPassword.backToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-4 py-8 relative">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm shadow-elegant">
        {isSuccess ? (
          <CardHeader className="space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <CardTitle className="text-center">{t("resetPassword.successTitle")}</CardTitle>
            <CardDescription className="text-center">
              {t("resetPassword.successDesc")}
            </CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-bold text-center">{t("resetPassword.title")}</CardTitle>
              <CardDescription className="text-center">
                {t("resetPassword.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("resetPassword.labelNewPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder={t("resetPassword.placeholderNewPassword")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("resetPassword.passwordRequirements")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("resetPassword.labelConfirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder={t("resetPassword.placeholderConfirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? t("resetPassword.buttonResetting") : t("resetPassword.buttonReset")}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
