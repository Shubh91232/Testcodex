"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type QuestionDraft = {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
};

type AnalyzeResult = {
  folderName: string;
  sourceFileName: string;
  folderTitleSuggestion?: string;
  questions: QuestionDraft[];
};

function normalizeQuestions(questions: QuestionDraft[]) {
  return questions.map((question) => ({
    ...question,
    options: [...question.options, "", "", "", ""].slice(0, 4),
    correctOptionIndex: Number(question.correctOptionIndex)
  }));
}

export default function AdminPage() {
  const [folderName, setFolderName] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canPublish = useMemo(
    () => folderName.trim().length > 0 && sourceFileName.length > 0 && questions.length > 0 && !busy,
    [busy, folderName, questions.length, sourceFileName]
  );

  async function analyzePdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!pdf) {
        throw new Error("Choose a PDF before analyzing.");
      }

      const formData = new FormData();
      formData.append("folderName", folderName);
      formData.append("pdf", pdf);

      const response = await fetch("/api/admin/analyze-pdf", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as AnalyzeResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "PDF analysis failed.");
      }

      setFolderName(data.folderTitleSuggestion || data.folderName);
      setSourceFileName(data.sourceFileName);
      setQuestions(normalizeQuestions(data.questions));
      setMessage(`Extracted ${data.questions.length} questions. Review and publish when ready.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      })
    );
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index));
  }

  async function publishFolder() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          sourceFileName,
          questions
        })
      });
      const data = (await response.json()) as { folderId?: number; error?: string };

      if (!response.ok || !data.folderId) {
        throw new Error(data.error || "Folder could not be saved.");
      }

      setMessage(`Folder published. Open it at /folders/${data.folderId}.`);
      setQuestions([]);
      setSourceFileName("");
      setPdf(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Folder could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Admin Panel</h1>
          <p>Upload a PDF, review extracted questions, then publish a folder.</p>
        </div>
        <nav className="nav">
          <Link href="/">User app</Link>
        </nav>
      </header>

      <form className="panel stack" onSubmit={analyzePdf}>
        <div className="grid">
          <div className="field">
            <label htmlFor="folderName">Folder name</label>
            <input
              id="folderName"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Maths Chapter 1"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pdf">PDF file</label>
            <input
              id="pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
              required
            />
          </div>
        </div>
        <div>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "Working..." : "Analyze PDF"}
          </button>
        </div>
      </form>

      {error ? <div className="status error">{error}</div> : null}
      {message ? <div className="status success">{message}</div> : null}

      {questions.length > 0 ? (
        <section className="stack" style={{ marginTop: 18 }}>
          <div className="topbar">
            <div className="brand">
              <h1>Review Questions</h1>
              <p>{sourceFileName}</p>
            </div>
            <button className="button primary" disabled={!canPublish} onClick={publishFolder} type="button">
              Publish folder
            </button>
          </div>

          {questions.map((question, questionIndex) => (
            <article className="question-editor" key={questionIndex}>
              <div className="topbar" style={{ marginBottom: 0 }}>
                <strong>Question {questionIndex + 1}</strong>
                <button className="button" onClick={() => removeQuestion(questionIndex)} type="button">
                  Remove
                </button>
              </div>
              <div className="field">
                <label>Question text</label>
                <textarea
                  value={question.questionText}
                  onChange={(event) => updateQuestion(questionIndex, { questionText: event.target.value })}
                />
              </div>
              <div className="stack">
                {question.options.map((option, optionIndex) => (
                  <div className="option-row" key={optionIndex}>
                    <div className="field">
                      <label>Option {optionIndex + 1}</label>
                      <input
                        value={option}
                        onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Correct answer</label>
                      <select
                        value={question.correctOptionIndex}
                        onChange={(event) =>
                          updateQuestion(questionIndex, { correctOptionIndex: Number(event.target.value) })
                        }
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <option key={index} value={index}>
                            {index === optionIndex ? "This option" : `Option ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="field">
                <label>Explanation</label>
                <textarea
                  value={question.explanation}
                  onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })}
                />
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
