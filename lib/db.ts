import Database from "better-sqlite3";
import path from "node:path";
import { SaveFolderInput } from "./questionSchema";

export type FolderSummary = {
  id: number;
  name: string;
  sourceFileName: string;
  createdAt: string;
  questionCount: number;
};

export type FolderQuestion = {
  id: number;
  orderIndex: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
};

export type FolderDetail = FolderSummary & {
  questions: FolderQuestion[];
};

type FolderRow = {
  id: number;
  name: string;
  sourceFileName: string;
  createdAt: string;
  questionCount: number;
};

type QuestionRow = {
  id: number;
  orderIndex: number;
  questionText: string;
  optionsJson: string;
  correctOptionIndex: number;
  explanation: string;
};

const dbPath = path.join(process.cwd(), "question-bank.sqlite");
const globalForDb = globalThis as typeof globalThis & { questionBankDb?: Database.Database };

export function getDb() {
  if (!globalForDb.questionBankDb) {
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        sourceFileName TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folderId INTEGER NOT NULL,
        orderIndex INTEGER NOT NULL,
        questionText TEXT NOT NULL,
        optionsJson TEXT NOT NULL,
        correctOptionIndex INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_questions_folder_order
        ON questions(folderId, orderIndex);
    `);
    globalForDb.questionBankDb = db;
  }

  return globalForDb.questionBankDb;
}

export function createPublishedFolder(input: SaveFolderInput) {
  const db = getDb();
  const insertFolder = db.prepare(`
    INSERT INTO folders (name, status, sourceFileName, createdAt, updatedAt)
    VALUES (?, 'published', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertQuestion = db.prepare(`
    INSERT INTO questions (
      folderId, orderIndex, questionText, optionsJson, correctOptionIndex, explanation
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const folderResult = insertFolder.run(input.name, input.sourceFileName);
    const folderId = Number(folderResult.lastInsertRowid);

    input.questions.forEach((question, index) => {
      insertQuestion.run(
        folderId,
        index,
        question.questionText,
        JSON.stringify(question.options),
        question.correctOptionIndex,
        question.explanation
      );
    });

    return folderId;
  });

  return transaction();
}

export function listPublishedFolders(): FolderSummary[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        f.id,
        f.name,
        f.sourceFileName,
        f.createdAt,
        COUNT(q.id) AS questionCount
      FROM folders f
      LEFT JOIN questions q ON q.folderId = f.id
      WHERE f.status = 'published'
      GROUP BY f.id
      ORDER BY f.createdAt DESC, f.id DESC
    `
    )
    .all() as FolderRow[];

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

export function getPublishedFolder(folderId: number): FolderDetail | null {
  const folder = getDb()
    .prepare(
      `
      SELECT
        f.id,
        f.name,
        f.sourceFileName,
        f.createdAt,
        COUNT(q.id) AS questionCount
      FROM folders f
      LEFT JOIN questions q ON q.folderId = f.id
      WHERE f.status = 'published' AND f.id = ?
      GROUP BY f.id
    `
    )
    .get(folderId) as FolderRow | undefined;

  if (!folder) {
    return null;
  }

  const questions = getDb()
    .prepare(
      `
      SELECT id, orderIndex, questionText, optionsJson, correctOptionIndex, explanation
      FROM questions
      WHERE folderId = ?
      ORDER BY orderIndex ASC
    `
    )
    .all(folderId) as QuestionRow[];

  return {
    ...folder,
    questionCount: Number(folder.questionCount),
    questions: questions.map((question) => ({
      ...question,
      options: JSON.parse(question.optionsJson) as string[]
    }))
  };
}
