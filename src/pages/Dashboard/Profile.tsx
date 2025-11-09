import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Save, AlertCircle, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { verifyAndUpdateSubscription } from "@/lib/api";

const Profile = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error" | null>(null);
  const [profileData, setProfileData] = useState({
    issuer_id: "",
    issuer_rfc: "",
    issuer_first_name: "",
    issuer_last_name: "",
    issuer_second_last_name: "",
    issuer_email: "",
    issuer_tax_regime: "",
    issuer_postal_code: "",
    issuer_password: "",
    issuer_csf_status: "",
  });

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) return;

      setIsVerifying(true);
      setVerificationStatus("pending");

      try {
        const email = localStorage.getItem("checkout_email");
        if (!email) {
          throw new Error("Email not found. Please complete checkout again.");
        }

        const result = await verifyAndUpdateSubscription(sessionId, email);

        setVerificationStatus("success");
        toast({
          title: "Subscription activated!",
          description: `You are now subscribed to the ${result.subscription.plan} plan.`,
        });

        localStorage.removeItem("checkout_email");
        setSearchParams({}, { replace: true });

        setTimeout(() => {
          setVerificationStatus(null);
        }, 3000);
      } catch (error) {
        console.error("Payment verification error:", error);
        setVerificationStatus("error");
        toast({
          title: "Verification failed",
          description: error instanceof Error ? error.message : "Failed to verify your subscription",
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, setSearchParams, toast]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate save
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Profile saved",
        description: "Your profile information has been updated successfully.",
      });
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
      // Handle file upload logic here
    }
  };

  return (
    <DashboardLayout userRole="user">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Profile Management</h1>

        {isVerifying && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p className="text-blue-700">Verifying your subscription payment...</p>
            </CardContent>
          </Card>
        )}

        {verificationStatus === "success" && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700">Your subscription has been activated successfully!</p>
            </CardContent>
          </Card>
        )}

        {verificationStatus === "error" && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">Failed to verify subscription. Please contact support if the issue persists.</p>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Profile Details</TabsTrigger>
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Issuer Information</CardTitle>
                <CardDescription>
                  Complete your profile to start generating invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issuer_id">Issuer ID</Label>
                      <Input
                        id="issuer_id"
                        value={profileData.issuer_id}
                        onChange={(e) => handleInputChange("issuer_id", e.target.value)}
                        placeholder="Enter issuer ID"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_rfc">RFC</Label>
                      <Input
                        id="issuer_rfc"
                        value={profileData.issuer_rfc}
                        onChange={(e) => handleInputChange("issuer_rfc", e.target.value)}
                        placeholder="Enter RFC"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_first_name">First Name</Label>
                      <Input
                        id="issuer_first_name"
                        value={profileData.issuer_first_name}
                        onChange={(e) => handleInputChange("issuer_first_name", e.target.value)}
                        placeholder="Enter first name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_last_name">Last Name</Label>
                      <Input
                        id="issuer_last_name"
                        value={profileData.issuer_last_name}
                        onChange={(e) => handleInputChange("issuer_last_name", e.target.value)}
                        placeholder="Enter last name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_second_last_name">Second Last Name</Label>
                      <Input
                        id="issuer_second_last_name"
                        value={profileData.issuer_second_last_name}
                        onChange={(e) => handleInputChange("issuer_second_last_name", e.target.value)}
                        placeholder="Enter second last name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_email">Email</Label>
                      <Input
                        id="issuer_email"
                        type="email"
                        value={profileData.issuer_email}
                        onChange={(e) => handleInputChange("issuer_email", e.target.value)}
                        placeholder="Enter email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_tax_regime">Tax Regime</Label>
                      <Input
                        id="issuer_tax_regime"
                        value={profileData.issuer_tax_regime}
                        onChange={(e) => handleInputChange("issuer_tax_regime", e.target.value)}
                        placeholder="Enter tax regime"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_postal_code">Postal Code</Label>
                      <Input
                        id="issuer_postal_code"
                        value={profileData.issuer_postal_code}
                        onChange={(e) => handleInputChange("issuer_postal_code", e.target.value)}
                        placeholder="Enter postal code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_password">Password</Label>
                      <Input
                        id="issuer_password"
                        type="password"
                        value={profileData.issuer_password}
                        onChange={(e) => handleInputChange("issuer_password", e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuer_csf_status">CSF Status</Label>
                      <Input
                        id="issuer_csf_status"
                        value={profileData.issuer_csf_status}
                        onChange={(e) => handleInputChange("issuer_csf_status", e.target.value)}
                        placeholder="Enter CSF status"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload images or PDFs to auto-fill invoice information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary font-medium">Click to upload</span>
                    {" "}or drag and drop
                  </Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    PDF, PNG, JPG up to 10MB
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Supported Documents</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Tax receipts and invoices</li>
                    <li>• Business registration documents</li>
                    <li>• Expense reports</li>
                    <li>• Product catalogs</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
