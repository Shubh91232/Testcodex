import { z } from "zod";

export const questionDraftSchema = z.object({
  questionText: z.string().trim().min(1, "Question text is required"),
  options: z.array(z.string().trim().min(1, "Option text is required")).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, "Explanation is required")
});

export const extractionSchema = z.object({
  folderTitleSuggestion: z.string().trim().min(1).optional(),
  questions: z.array(questionDraftSchema).min(1, "No questions were extracted")
});

export const saveFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(120),
  sourceFileName: z.string().trim().min(1).max(255),
  questions: z.array(questionDraftSchema).min(1, "At least one question is required")
});

export type QuestionDraft = z.infer<typeof questionDraftSchema>;
export type SaveFolderInput = z.infer<typeof saveFolderSchema>;

export const openAiExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["folderTitleSuggestion", "questions"],
  properties: {
    folderTitleSuggestion: {
      type: "string",
      description: "A short title for this set of questions."
    },
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["questionText", "options", "correctOptionIndex", "explanation"],
        properties: {
          questionText: {
            type: "string",
            description: "The complete question text, preserving math notation as readable text."
          },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "string"
            }
          },
          correctOptionIndex: {
            type: "integer",
            minimum: 0,
            maximum: 3,
            description: "Zero-based index of the correct option."
          },
          explanation: {
            type: "string",
            description: "A concise explanation for why the answer is correct."
          }
        }
      }
    }
  }
} as const;
