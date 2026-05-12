"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Folder = {
  id: number;
  name: string;
  sourceFileName: string;
  createdAt: string;
  questionCount: number;
};

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/folders")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load folders.");
        }
        return response.json();
      })
      .then((data) => setFolders(data.folders))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Question Folders</h1>
          <p>Open a published folder and review each question.</p>
        </div>
        <nav className="nav">
          <Link href="/admin">Admin panel</Link>
        </nav>
      </header>

      {loading ? <div className="status">Loading folders...</div> : null}
      {error ? <div className="status error">{error}</div> : null}

      {!loading && !error && folders.length === 0 ? (
        <div className="panel stack">
          <h2>No folders yet</h2>
          <p className="muted">Upload and publish a PDF from the admin panel to create the first folder.</p>
          <div>
            <Link className="button primary" href="/admin">
              Go to admin
            </Link>
          </div>
        </div>
      ) : null}

      <section className="folder-list">
        {folders.map((folder) => (
          <Link className="folder-card" href={`/folders/${folder.id}`} key={folder.id}>
            <div>
              <h2>{folder.name}</h2>
              <p className="muted">
                {folder.questionCount} questions · Source: {folder.sourceFileName}
              </p>
            </div>
            <span className="button">Open</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
