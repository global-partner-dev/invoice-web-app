import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  extractTaxProfileFromDocument,
  getUserTaxProfile,
  upsertUserTaxProfile,
  verifyAndUpdateSubscription,
  type TaxProfileExtractionResult,
} from "@/lib/api";

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

// Extracted to top level to preserve component identity between renders.
const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    <Label className="text-sm">{label}</Label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? ""}
      className="h-9"
      disabled={disabled}
    />
  </div>
);

const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const allowedUploadMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

const Profile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSendingDocument, setIsSendingDocument] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<ProfileData | null>(null);

  const toFieldValue = (value: string | null | undefined) => {
    if (typeof value === "string") {
      return value.trim();
    }
    return "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const mapExtractionToProfile = (extracted: TaxProfileExtractionResult): ProfileData => ({
    required: {
      rfc: toFieldValue(extracted.rfc),
      nombre: toFieldValue(extracted.first_name),
      primerApellido: toFieldValue(extracted.first_surname),
      segundoApellido: toFieldValue(extracted.second_surname),
      regimen: toFieldValue(extracted.tax_regime),
      codigoPostal: toFieldValue(extracted.postal_code),
    },
    optional: {
      curp: toFieldValue(extracted.curp),
      email: toFieldValue(extracted.email),
      phone: toFieldValue(extracted.phone),
      address: toFieldValue(extracted.address),
    },
  });

  const extractedPreviewEntries = extractedProfile
    ? [
        { label: "RFC", value: extractedProfile.required.rfc },
        { label: "Tax Regime", value: extractedProfile.required.regimen },
        { label: "Name", value: extractedProfile.required.nombre },
        { label: "First Surname", value: extractedProfile.required.primerApellido },
        { label: "Second Surname", value: extractedProfile.required.segundoApellido },
        { label: "Postal Code", value: extractedProfile.required.codigoPostal },
        { label: "CURP", value: extractedProfile.optional.curp },
        { label: "Email", value: extractedProfile.optional.email },
        { label: "Phone", value: extractedProfile.optional.phone },
        { label: "Address", value: extractedProfile.optional.address },
      ]
    : [];

  const applyWithFallback = (incoming: string, current: string) => {
    const trimmed = incoming.trim();
    return trimmed.length > 0 ? trimmed : current;
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "An unexpected error occurred.";

  // Handle subscription verification after Stripe payment
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || isVerifyingSubscription) {
      return;
    }

    const verifySubscription = async () => {
      // Get email from user object or localStorage
      const email = user?.email || localStorage.getItem("checkout_email");
      
      if (!email) {
        toast({
          title: "Verification failed",
          description: "Unable to verify subscription: email not found",
          variant: "destructive",
        });
        // Clean up URL
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });
        return;
      }

      setIsVerifyingSubscription(true);

      try {
        const result = await verifyAndUpdateSubscription(sessionId, email);
        
        // Clean up localStorage and URL
        localStorage.removeItem("checkout_email");
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });

        toast({
          title: "Subscription activated!",
          description: `Your ${result.subscription?.plan || "subscription"} is now active.`,
        });
      } catch (error) {
        toast({
          title: "Subscription verification failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
        // Still clean up URL even on error
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });
      } finally {
        setIsVerifyingSubscription(false);
      }
    };

    verifySubscription();
  }, [searchParams, user?.email, isVerifyingSubscription, toast, setSearchParams]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        if (active) {
          setIsFetching(false);
        }
        return;
      }

      setIsFetching(true);
      try {
        const data = await getUserTaxProfile(user.id);
        if (data && active) {
          setProfileData({
            required: {
              rfc: data.rfc ?? "",
              nombre: data.first_name ?? "",
              primerApellido: data.first_surname ?? "",
              segundoApellido: data.second_surname ?? "",
              regimen: data.tax_regime ?? "",
              codigoPostal: data.postal_code ?? "",
            },
            optional: {
              curp: data.curp ?? "",
              email: data.email ?? "",
              phone: data.phone ?? "",
              address: data.address ?? "",
            },
          });
        }
      } catch (error) {
        if (active) {
          toast({
            title: "Failed to load profile",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        }
      } finally {
        if (active) {
          setIsFetching(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user?.id, toast]);

  const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

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
    if (!user?.id) {
      toast({
        title: "Failed to save profile",
        description: "You must be signed in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    const trimmedData: ProfileData = {
      required: {
        rfc: profileData.required.rfc.trim(),
        nombre: profileData.required.nombre.trim(),
        primerApellido: profileData.required.primerApellido.trim(),
        segundoApellido: profileData.required.segundoApellido.trim(),
        regimen: profileData.required.regimen.trim(),
        codigoPostal: profileData.required.codigoPostal.trim(),
      },
      optional: {
        curp: profileData.optional.curp.trim(),
        email: profileData.optional.email.trim(),
        phone: profileData.optional.phone.trim(),
        address: profileData.optional.address.trim(),
      },
    };

    setProfileData(trimmedData);
    setIsLoading(true);

    try {
      await upsertUserTaxProfile(user.id, {
        rfc: toNullable(trimmedData.required.rfc),
        tax_regime: toNullable(trimmedData.required.regimen),
        first_name: toNullable(trimmedData.required.nombre),
        first_surname: toNullable(trimmedData.required.primerApellido),
        second_surname: toNullable(trimmedData.required.segundoApellido),
        postal_code: toNullable(trimmedData.required.codigoPostal),
        curp: toNullable(trimmedData.optional.curp),
        email: toNullable(trimmedData.optional.email),
        phone: toNullable(trimmedData.optional.phone),
        address: toNullable(trimmedData.optional.address),
      });

      toast({
        title: "Profile saved",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to save profile",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const isFormDisabled = isLoading || isFetching;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    e.target.value = "";

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    const isAllowed =
      allowedUploadMimeTypes.has(fileType) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg");

    if (!isAllowed) {
      toast({
        title: "Unsupported file",
        description: "Please upload a PDF, PNG, or JPG file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please choose a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setExtractedProfile(null);

    toast({
      title: "Document ready",
      description: `${file.name} selected. Click Send to process with OCR.`,
    });
  };

  const handleSendDocument = async () => {
    if (!selectedFile) {
      toast({
        title: "No document selected",
        description: "Please choose a file before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingDocument(true);

    try {
      const extracted = await extractTaxProfileFromDocument(selectedFile);
      const normalized = mapExtractionToProfile(extracted);
      setExtractedProfile(normalized);
      toast({
        title: "Extraction complete",
        description: "Review the extracted information before applying.",
      });
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSendingDocument(false);
    }
  };

  const handleApplyExtracted = () => {
    if (!extractedProfile) {
      toast({
        title: "No extracted data",
        description: "Send a document to extract information first.",
        variant: "destructive",
      });
      return;
    }

    setProfileData(prev => ({
      required: {
        rfc: applyWithFallback(extractedProfile.required.rfc, prev.required.rfc),
        nombre: applyWithFallback(extractedProfile.required.nombre, prev.required.nombre),
        primerApellido: applyWithFallback(extractedProfile.required.primerApellido, prev.required.primerApellido),
        segundoApellido: applyWithFallback(extractedProfile.required.segundoApellido, prev.required.segundoApellido),
        regimen: applyWithFallback(extractedProfile.required.regimen, prev.required.regimen),
        codigoPostal: applyWithFallback(extractedProfile.required.codigoPostal, prev.required.codigoPostal),
      },
      optional: {
        curp: applyWithFallback(extractedProfile.optional.curp, prev.optional.curp),
        email: applyWithFallback(extractedProfile.optional.email, prev.optional.email),
        phone: applyWithFallback(extractedProfile.optional.phone, prev.optional.phone),
        address: applyWithFallback(extractedProfile.optional.address, prev.optional.address),
      },
    }));

    toast({
      title: "Fields updated",
      description: "Extracted values have been applied. Review and save your profile.",
    });
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
                      placeholder={placeholders.rfc}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Tax Regime"
                      value={profileData.required.regimen}
                      onChange={(value) => handleInputChange("required.regimen", value)}
                      placeholder={placeholders.regimen}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Name"
                      value={profileData.required.nombre}
                      onChange={(value) => handleInputChange("required.nombre", value)}
                      placeholder={placeholders.nombre}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="First Surname"
                      value={profileData.required.primerApellido}
                      onChange={(value) => handleInputChange("required.primerApellido", value)}
                      placeholder={placeholders.primerApellido}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Second Surname"
                      value={profileData.required.segundoApellido}
                      onChange={(value) => handleInputChange("required.segundoApellido", value)}
                      placeholder={placeholders.segundoApellido}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Postal Code"
                      value={profileData.required.codigoPostal}
                      onChange={(value) => handleInputChange("required.codigoPostal", value)}
                      placeholder={placeholders.codigoPostal}
                      disabled={isFormDisabled}
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
                      placeholder={placeholders.curp}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Email"
                      value={profileData.optional.email}
                      onChange={(value) => handleInputChange("optional.email", value)}
                      placeholder={placeholders.email}
                      disabled={isFormDisabled}
                    />
                    <InputField
                      label="Phone"
                      value={profileData.optional.phone}
                      onChange={(value) => handleInputChange("optional.phone", value)}
                      placeholder={placeholders.phone}
                      disabled={isFormDisabled}
                    />
                    <div className="sm:col-span-2">
                      <InputField
                        label="Full Address"
                        value={profileData.optional.address}
                        onChange={(value) => handleInputChange("optional.address", value)}
                        placeholder={placeholders.address}
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full sm:w-auto" disabled={isFormDisabled}>
                <Save className="mr-2 h-4 w-4" />
                {isFetching ? "Loading..." : isLoading ? "Saving..." : "Save Profile"}
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

                {selectedFile && (
                  <div className="space-y-4 rounded-lg border border-border/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium leading-tight">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.type || "Unknown type").toUpperCase()} • {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={handleSendDocument} disabled={isSendingDocument}>
                          {isSendingDocument ? "Sending..." : "Send"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleApplyExtracted}
                          disabled={!extractedProfile || isSendingDocument}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    {extractedPreviewEntries.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                            Extracted Values
                          </p>
                          <span className="text-xs text-muted-foreground">Review before applying</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {extractedPreviewEntries.map((item) => (
                            <div key={item.label} className="rounded-md border border-border/70 p-3">
                              <p className="text-xs uppercase text-muted-foreground tracking-wide">{item.label}</p>
                              <p className="mt-1 text-sm font-medium break-words">{item.value || "—"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
