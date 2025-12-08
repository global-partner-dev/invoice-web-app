import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth-token",
};

const allowedCertFileTypes = new Set(["application/x-pkcs12", "application/pkcs12", "application/x-x509-ca-cert", "text/plain"]);
const maxFileSize = 5 * 1024 * 1024;

const errorResponse = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return errorResponse(401, "Authorization header is required");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return errorResponse(500, "Supabase configuration is missing");
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return errorResponse(401, "Unauthorized");
    }

    const userId = user.id;
    const formData = await req.formData();
    const certificateFile = formData.get("certificate") as File | null;
    const keyFile = formData.get("key") as File | null;
    const passphrase = (formData.get("passphrase") as string) || "";

    if (!certificateFile || !keyFile) {
      return errorResponse(400, "Both certificate (.cer) and key (.key) files are required");
    }

    if (certificateFile.size === 0 || keyFile.size === 0) {
      return errorResponse(400, "Uploaded files cannot be empty");
    }

    if (certificateFile.size > maxFileSize || keyFile.size > maxFileSize) {
      return errorResponse(413, "File size exceeds the 5MB limit per file");
    }

    const certFileName = certificateFile.name.toLowerCase();
    const keyFileName = keyFile.name.toLowerCase();

    if (!certFileName.endsWith(".cer") && !certFileName.endsWith(".pem")) {
      return errorResponse(400, "Certificate file must be .cer or .pem format");
    }

    if (!keyFileName.endsWith(".key") && !keyFileName.endsWith(".pem")) {
      return errorResponse(400, "Key file must be .key or .pem format");
    }

    const bucketName = "certificates";

    const certPath = `${userId}/${Date.now()}.cer`;
    const keyPath = `${userId}/${Date.now()}.key`;

    const certBuffer = await certificateFile.arrayBuffer();
    const keyBuffer = await keyFile.arrayBuffer();

    const { error: certUploadError } = await supabase.storage
      .from(bucketName)
      .upload(certPath, new Uint8Array(certBuffer), {
        upsert: false,
        contentType: "application/x-x509-ca-cert",
      });

    if (certUploadError) {
      return errorResponse(500, `Failed to upload certificate: ${certUploadError.message}`);
    }

    const { error: keyUploadError } = await supabase.storage
      .from(bucketName)
      .upload(keyPath, new Uint8Array(keyBuffer), {
        upsert: false,
        contentType: "application/pkcs8",
      });

    if (keyUploadError) {
      await supabase.storage.from(bucketName).remove([certPath]);
      return errorResponse(500, `Failed to upload key file: ${keyUploadError.message}`);
    }

    const { error: updateError } = await supabase
      .from("tax_profiles")
      .update({
        certificate_path: certPath,
        certificate_key_path: keyPath,
        certificate_passphrase: passphrase || null,
        certificate_uploaded_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      await supabase.storage.from(bucketName).remove([certPath, keyPath]);
      return errorResponse(500, `Failed to update tax profile: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Certificate and key uploaded successfully",
        data: {
          certificatePath: certPath,
          keyPath: keyPath,
          uploadedAt: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("upload-certificate error", error);
    return errorResponse(500, message);
  }
});
