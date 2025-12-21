import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Zap, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import heroBackground from "@/assets/hero-background.jpg";
import { useAuth } from "@/hooks/useAuth";

const Home = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 md:py-32 px-4 sm:px-6 min-h-[500px] sm:min-h-[600px] flex items-center">
        {/* Background Image with Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary/40 to-accent/50" />
        
        {/* Animated Background Elements */}
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-40 sm:w-72 h-40 sm:h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-48 sm:w-96 h-48 sm:h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-700" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
              {t("home.heroTitle")}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 mb-6 sm:mb-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500 fill-mode-both">
              {!loading && user ? (
                <Button asChild size="lg" variant="secondary" className="shadow-elegant hover:shadow-hover hover:scale-105 transition-all duration-300 text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6">
                  <Link to="/dashboard/profile">{t("common.goToDashboard")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" variant="secondary" className="shadow-elegant hover:shadow-hover hover:scale-105 transition-all duration-300 text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6">
                    <Link to="/login">{t("common.getStarted")}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm hover:scale-105 transition-all duration-300 text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6">
                    <Link to="/login">{t("common.login")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            {t("home.featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
              <Zap className="w-10 sm:w-12 h-10 sm:h-12 text-primary mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("home.lightningFast")}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t("home.lightningFastDesc")}
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
              <Shield className="w-10 sm:w-12 h-10 sm:h-12 text-secondary mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("home.secureCompliant")}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t("home.secureCompliantDesc")}
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
              <FileText className="w-10 sm:w-12 h-10 sm:h-12 text-accent mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("home.smartUpload")}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t("home.smartUploadDesc")}
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
              <Clock className="w-10 sm:w-12 h-10 sm:h-12 text-primary mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("home.saveTime")}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t("home.saveTimeDesc")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            {t("home.howItWorks")}
          </h2>
          <div className="space-y-6 sm:space-y-8">
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg sm:text-xl">
                1
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{t("home.step1Title")}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t("home.step1Desc")}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-lg sm:text-xl">
                2
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{t("home.step2Title")}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t("home.step2Desc")}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg sm:text-xl">
                3
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{t("home.step3Title")}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t("home.step3Desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            {t("home.readyToAutomate")}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
            {t("home.readyToAutomateDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button asChild size="lg" className="shadow-elegant text-sm sm:text-base">
              <Link to="/subscribe">{t("common.subscribeNow")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="shadow-elegant text-sm sm:text-base">
              <Link to="/login">{t("common.login")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
