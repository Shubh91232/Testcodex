import { describe, expect, it } from "vitest";
import { extractionSchema, saveFolderSchema } from "@/lib/questionSchema";

const validQuestion = {
  questionText: "What is 2 + 2?",
  options: ["1", "2", "3", "4"],
  correctOptionIndex: 3,
  explanation: "Adding 2 and 2 gives 4."
};

describe("question schemas", () => {
  it("accepts a valid AI extraction result", () => {
    const result = extractionSchema.safeParse({
      folderTitleSuggestion: "Basic maths",
      questions: [validQuestion]
    });

    expect(result.success).toBe(true);
  });

  it("rejects questions without exactly four options", () => {
    const result = extractionSchema.safeParse({
      folderTitleSuggestion: "Broken",
      questions: [{ ...validQuestion, options: ["1", "2", "4"] }]
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid correct option index", () => {
    const result = saveFolderSchema.safeParse({
      name: "Basic maths",
      sourceFileName: "maths.pdf",
      questions: [{ ...validQuestion, correctOptionIndex: 4 }]
    });

    expect(result.success).toBe(false);
  });
});
