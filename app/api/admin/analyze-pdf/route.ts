import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { extractionSchema, openAiExtractionJsonSchema } from "@/lib/questionSchema";

export const runtime = "nodejs";

const maxPdfSizeBytes = 50 * 1024 * 1024;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const folderName = String(formData.get("folderName") ?? "").trim();
  const file = formData.get("pdf");

  if (!folderName) {
    return Response.json({ error: "Folder name is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  if (file.size > maxPdfSizeBytes) {
    return Response.json({ error: "PDF must be smaller than 50 MB." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await client.files.create({
    file: await toFile(buffer, file.name, { type: "application/pdf" }),
    purpose: "user_data"
  });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: upload.id
          },
          {
            type: "input_text",
            text: [
              `Analyze this PDF for the folder "${folderName}".`,
              "Extract multiple-choice questions from the PDF into the requested JSON schema.",
              "Use only questions that are present or clearly implied by the PDF.",
              "Preserve math notation as readable plain text.",
              "Each question must have exactly four options, a zero-based correct option index, and an explanation.",
              "Skip unreadable or ambiguous items instead of inventing missing content."
            ].join("\n")
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "pdf_question_extraction",
        strict: true,
        schema: openAiExtractionJsonSchema
      }
    }
  });

  const parsedJson = JSON.parse(response.output_text);
  const parsed = extractionSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return Response.json(
      { error: "The PDF analysis did not produce valid questions.", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  if (parsed.data.questions.length === 0) {
    return Response.json({ error: "No readable questions were found in this PDF." }, { status: 422 });
  }

  return Response.json({
    folderName,
    sourceFileName: file.name,
    folderTitleSuggestion: parsed.data.folderTitleSuggestion,
    questions: parsed.data.questions
  });
}
