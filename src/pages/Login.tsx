import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { loginWithEmail, checkIfAdmin } from "@/lib/api";
import ForgotPassword from "@/components/ForgotPassword";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t("common.error"),
        description: t("login.errorBothFields"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      toast({
        title: t("login.successLogin"),
        description: t("login.successMessage"),
      });
      
      const isAdmin = await checkIfAdmin(email);
      if (isAdmin) {
        navigate("/admin/users");
      } else {
        navigate("/dashboard/profile");
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("login.errorLoginFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 px-4 py-8 md:py-12">
      <Card className="w-full max-w-sm md:max-w-md shadow-elegant">
        <CardHeader className="space-y-3 md:space-y-1">
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">{t("login.title")}</CardTitle>
          <CardDescription className="text-sm md:text-base text-center">
            {t("login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm md:text-base">{t("login.labelEmail")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("login.placeholderEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 text-sm md:text-base"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm md:text-base">{t("login.labelPassword")}</Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs md:text-sm text-primary hover:underline font-medium"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t("login.labelPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 text-sm md:text-base"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-sm md:text-base py-2 md:py-2.5"
              disabled={isLoading}
            >
              {isLoading ? t("login.buttonLoggingIn") : t("login.buttonLogin")}
            </Button>

            <div className="text-center text-xs md:text-sm text-muted-foreground">
              {t("login.noAccount")}{" "}
              <a href="/subscribe" className="text-primary hover:underline font-medium">
                {t("login.signupLink")}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
      <ForgotPassword open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </div>
  );
};

export default Login;
