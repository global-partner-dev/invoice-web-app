import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  required: {
    rfc: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string;
    regimen: string;
    codigoPostal: string;
  };
  optional: {
    curp: string;
    email: string;
    phone: string;
    address: string;
  };
}

const Profile = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    required: {
      rfc: "",
      nombre: "",
      primerApellido: "",
      segundoApellido: "",
      regimen: "",
      codigoPostal: "",
    },
    optional: {
      curp: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const handleInputChange = (path: string, value: string) => {
    const keys = path.split(".");
    setProfileData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Profile saved",
        description: "Your profile information has been updated successfully.",
      });
    }, 1000);
  };

  const placeholders: Record<string, string> = {
    rfc: "e.g. AAPU790804II9",
    nombre: "e.g. Ulises",
    primerApellido: "e.g. Alcántara",
    segundoApellido: "e.g. Pérez",
    regimen: "e.g. Régimen de Personas Físicas con Actividades Empresariales",
    codigoPostal: "e.g. 07400",
    curp: "e.g. AAPU790804HDFLRL03",
    email: "e.g. odysseusre@yahoo.com.mx",
    phone: "e.g. 55-57578026",
    address: "e.g. Calle Norte 72-B #7812, Colonia Salvador Díaz Mirón...",
  };

  const InputField = ({ label, value, onChange, placeholderKey }: { label: string; value: string; onChange: (value: string) => void; placeholderKey?: string }) => (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderKey ? placeholders[placeholderKey] : ""}
        className="h-9"
      />
    </div>
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded. Processing with OCR...`,
      });
    }
  };

  return (
    <DashboardLayout userRole="user">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">Taxpayer Profile</h1>

        <Tabs defaultValue="details" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2">
            <TabsTrigger value="details" className="text-xs sm:text-sm">Profile Details</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSave} className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Required Information *</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField
                      label="RFC"
                      value={profileData.required.rfc}
                      onChange={(value) => handleInputChange("required.rfc", value)}
                      placeholderKey="rfc"
                    />
                    <InputField
                      label="Tax Regime"
                      value={profileData.required.regimen}
                      onChange={(value) => handleInputChange("required.regimen", value)}
                      placeholderKey="regimen"
                    />
                    <InputField
                      label="Name"
                      value={profileData.required.nombre}
                      onChange={(value) => handleInputChange("required.nombre", value)}
                      placeholderKey="nombre"
                    />
                    <InputField
                      label="First Surname"
                      value={profileData.required.primerApellido}
                      onChange={(value) => handleInputChange("required.primerApellido", value)}
                      placeholderKey="primerApellido"
                    />
                    <InputField
                      label="Second Surname"
                      value={profileData.required.segundoApellido}
                      onChange={(value) => handleInputChange("required.segundoApellido", value)}
                      placeholderKey="segundoApellido"
                    />
                    <InputField
                      label="Postal Code"
                      value={profileData.required.codigoPostal}
                      onChange={(value) => handleInputChange("required.codigoPostal", value)}
                      placeholderKey="codigoPostal"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Optional Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField
                      label="CURP"
                      value={profileData.optional.curp}
                      onChange={(value) => handleInputChange("optional.curp", value)}
                      placeholderKey="curp"
                    />
                    <InputField
                      label="Email"
                      value={profileData.optional.email}
                      onChange={(value) => handleInputChange("optional.email", value)}
                      placeholderKey="email"
                    />
                    <InputField
                      label="Phone"
                      value={profileData.optional.phone}
                      onChange={(value) => handleInputChange("optional.phone", value)}
                      placeholderKey="phone"
                    />
                    <div className="sm:col-span-2">
                      <InputField
                        label="Full Address"
                        value={profileData.optional.address}
                        onChange={(value) => handleInputChange("optional.address", value)}
                        placeholderKey="address"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload images or PDFs to auto-fill invoice information with OCR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 lg:p-12 text-center hover:border-primary transition-colors">
                  <Upload className="h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <Label htmlFor="file-upload" className="cursor-pointer block">
                    <span className="text-primary font-medium text-sm sm:text-base">Click to upload</span>
                    <span className="text-xs sm:text-sm"> or drag and drop</span>
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
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

                <div className="space-y-2 sm:space-y-3">
                  <h3 className="font-medium text-sm sm:text-base">Supported Documents</h3>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• Tax receipts and invoices</li>
                    <li>• Business registration documents</li>
                    <li>• RFC certificates</li>
                    <li>• Address proofs</li>
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
