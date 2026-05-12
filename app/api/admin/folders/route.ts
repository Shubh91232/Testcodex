import { createPublishedFolder } from "@/lib/db";
import { saveFolderSchema } from "@/lib/questionSchema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = saveFolderSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: "Folder could not be saved.", issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const folderId = createPublishedFolder(result.data);
  return Response.json({ folderId });
}
