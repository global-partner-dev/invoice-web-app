import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth-token",
};

const allowedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const maxFileSize = 10 * 1024 * 1024;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    rfc: { type: ["string", "null"] },
    tax_regime: { type: ["string", "null"] },
    first_name: { type: ["string", "null"] },
    first_surname: { type: ["string", "null"] },
    second_surname: { type: ["string", "null"] },
    postal_code: { type: ["string", "null"] },
    curp: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
  },
  required: [
    "rfc",
    "tax_regime",
    "first_name",
    "first_surname",
    "second_surname",
    "postal_code",
    "curp",
    "email",
    "phone",
    "address",
  ],
};

const extractionPrompt = `You are an assistant that extracts Mexican taxpayer information from documents such as RFC certificates, invoices, or official forms. Use the attached document to populate the following fields: rfc, tax_regime, first_name, first_surname, second_surname, postal_code, curp, email, phone, address. Return JSON only. If a field is not present, return null for that field. Ensure text uses uppercase for identifiers like RFC and CURP when available, otherwise preserve casing.`;

const normalizePayload = (input: Record<string, unknown>) => {
  const normalizeValue = (value: unknown) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value === null ? null : null;
  };

  return {
    rfc: normalizeValue(input.rfc),
    tax_regime: normalizeValue(input.tax_regime),
    first_name: normalizeValue(input.first_name),
    first_surname: normalizeValue(input.first_surname),
    second_surname: normalizeValue(input.second_surname),
    postal_code: normalizeValue(input.postal_code),
    curp: normalizeValue(input.curp),
    email: normalizeValue(input.email),
    phone: normalizeValue(input.phone),
    address: normalizeValue(input.address),
  } as Record<string, string | null>;
};

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

  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAiApiKey) {
    return errorResponse(500, "OpenAI configuration is missing");
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse(400, "A PDF or image file is required");
    }

    if (file.size === 0) {
      return errorResponse(400, "The uploaded file is empty");
    }

    if (file.size > maxFileSize) {
      return errorResponse(413, "File size exceeds the 10MB limit");
    }

    const fileType = (file.type || "").toLowerCase();
    const fileName = (file.name || "").toLowerCase();
    const isAllowedType =
      allowedMimeTypes.includes(fileType) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg");

    if (!isAllowedType) {
      return errorResponse(400, "Unsupported file type");
    }

    const uploadFormData = new FormData();
    uploadFormData.append("purpose", "assistants");
    uploadFormData.append("file", file, file.name);

    const uploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      return errorResponse(502, `Failed to upload file to OpenAI: ${errorBody}`);
    }

    const uploaded = await uploadResponse.json() as { id?: string };
    const fileId = uploaded.id;

    if (!fileId) {
      return errorResponse(502, "OpenAI did not return a file identifier");
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: extractionPrompt },
              { type: "input_file", file_id: fileId },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tax_profile_extraction",
            schema: responseSchema,
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      return errorResponse(502, `Failed to process document: ${errorBody}`);
    }

    const aiResult = await aiResponse.json();

    let extracted: Record<string, unknown> | null = null;

    const outputs = Array.isArray(aiResult.output) ? aiResult.output : [];
    for (const output of outputs) {
      const contents = Array.isArray(output?.content) ? output.content : [];
      for (const entry of contents) {
        if (entry?.type === "output_json" && entry?.json) {
          extracted = entry.json as Record<string, unknown>;
          break;
        }
        if (entry?.type === "output_text" && typeof entry?.text === "string") {
          try {
            extracted = JSON.parse(entry.text);
            break;
          } catch (_) {
            continue;
          }
        }
      }
      if (extracted) {
        break;
      }
    }

    if (!extracted) {
      return errorResponse(502, "Failed to extract structured data from the document");
    }

    try {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
        },
      });
    } catch (cleanupError) {
      console.warn("Failed to delete temporary OpenAI file", cleanupError);
    }

    const normalized = normalizePayload(extracted);

    return new Response(
      JSON.stringify({
        data: normalized,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
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
    console.error("extract-tax-profile error", error);
    return errorResponse(500, message);
  }
});
