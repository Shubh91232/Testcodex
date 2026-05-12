import { getPublishedFolder } from "@/lib/db";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const folderId = Number(id);

  if (!Number.isInteger(folderId) || folderId < 1) {
    return Response.json({ error: "Invalid folder id." }, { status: 400 });
  }

  const folder = getPublishedFolder(folderId);

  if (!folder) {
    return Response.json({ error: "Folder not found." }, { status: 404 });
  }

  return Response.json({ folder });
}
