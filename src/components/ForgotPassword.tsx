import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { resetPasswordForEmail } from "@/lib/api";
import { Mail, CheckCircle } from "lucide-react";

interface ForgotPasswordProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ForgotPassword = ({ open, onOpenChange }: ForgotPasswordProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: t("common.error"),
        description: t("forgotPassword.enterEmailAddress"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordForEmail(email);
      setIsSuccess(true);
      toast({
        title: t("common.success"),
        description: t("forgotPassword.checkEmail"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description:
          error instanceof Error ? error.message : t("forgotPassword.failedSendReset"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("");
      setIsSuccess(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-sm">
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-center">{t("forgotPassword.checkEmail")}</DialogTitle>
              <DialogDescription className="text-center">
                {t("forgotPassword.sentLink", { email })}
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              {t("common.done")}
            </Button>
          </div>
        ) : (
          <div className="gap-4">
            <DialogHeader className="space-y-2">
              <DialogTitle>{t("forgotPassword.resetPassword")}</DialogTitle>
              <DialogDescription>
                {t("forgotPassword.enterEmail")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t("forgotPassword.emailPlaceholder")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                {isLoading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPassword;
