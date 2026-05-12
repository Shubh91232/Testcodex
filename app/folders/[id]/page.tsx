"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Question = {
  id: number;
  orderIndex: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
};

type Folder = {
  id: number;
  name: string;
  sourceFileName: string;
  questionCount: number;
  questions: Question[];
};

export default function FolderPage() {
  const params = useParams<{ id: string }>();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/folders/${params.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not load folder.");
        }
        return data;
      })
      .then((data) => setFolder(data.folder))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const question = useMemo(() => folder?.questions[index], [folder, index]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>{folder?.name || "Question Folder"}</h1>
          <p>{folder ? `${folder.questionCount} questions · ${folder.sourceFileName}` : "Loading..."}</p>
        </div>
        <nav className="nav">
          <Link href="/">All folders</Link>
          <Link href="/admin">Admin panel</Link>
        </nav>
      </header>

      {loading ? <div className="status">Loading folder...</div> : null}
      {error ? <div className="status error">{error}</div> : null}

      {question ? (
        <article className="question-card">
          <p className="muted">
            Question {index + 1} of {folder?.questions.length}
          </p>
          <h2>{question.questionText}</h2>

          <div className="options">
            {question.options.map((option, optionIndex) => (
              <div className={`option ${optionIndex === question.correctOptionIndex ? "correct" : ""}`} key={optionIndex}>
                {String.fromCharCode(65 + optionIndex)}. {option}
              </div>
            ))}
          </div>

          <div className="explanation">
            <strong>Explanation</strong>
            <p>{question.explanation}</p>
          </div>

          <div className="pager">
            <button
              className="button"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              Previous
            </button>
            <span className="muted">
              {index + 1} / {folder?.questions.length}
            </span>
            <button
              className="button primary"
              disabled={!folder || index >= folder.questions.length - 1}
              onClick={() =>
                setIndex((current) => (folder ? Math.min(folder.questions.length - 1, current + 1) : current))
              }
              type="button"
            >
              Next
            </button>
          </div>
        </article>
      ) : null}
    </main>
  );
}
