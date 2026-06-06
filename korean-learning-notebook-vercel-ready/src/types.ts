/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  id: string;
  word: string;
  pos: string;
  pronunciation: string;
  definition: string;
  exampleKorean: string;
  exampleTranslation: string;
  level: string;
  addedAt: string;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  addedAt: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ReadingArticle {
  title: string;
  titleZh: string;
  article: string;
  translation: string;
  questions: Question[];
  difficulty: "easy" | "intermediate" | "advanced";
}

export interface SavedPractice {
  id: string;
  title: string;
  titleZh: string;
  article: string;
  translation: string;
  difficulty: "easy" | "intermediate" | "advanced";
  questions: Question[];
  userAnswers: { [qId: string]: number };
  score: number;
  savedAt: string;
  selectedWordList: string[];
}

