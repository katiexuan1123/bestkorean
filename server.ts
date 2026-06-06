import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Settings > Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Robust wrapper to handle transient 503 (model overloaded) and 429 (rate limit) errors with exponential backoff
async function generateContentWithRetry(params: any, retries = 3, delayMs = 1500) {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ai = getAi();
      return await ai.models.generateContent(params);
    } catch (error: any) {
      lastError = error;
      const errorMsgString = error.message || String(error);
      const statusCode = error.status || error.statusCode || (error.error && error.error.code);
      
      const isTransient = 
        statusCode === "UNAVAILABLE" || 
        statusCode === 503 ||
        statusCode === 429 ||
        statusCode === "RESOURCE_EXHAUSTED" ||
        errorMsgString.includes("503") ||
        errorMsgString.includes("UNAVAILABLE") ||
        errorMsgString.includes("high demand") ||
        errorMsgString.includes("temporary") ||
        errorMsgString.includes("429");
      
      if (isTransient && attempt < retries) {
        const nextDelay = delayMs * attempt;
        console.warn(`Gemini API transient error (attempt ${attempt}/${retries}). Retrying in ${nextDelay}ms... Error:`, errorMsgString);
        await new Promise((resolve) => setTimeout(resolve, nextDelay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// User-friendly error translator for Gemini API issues
function formatGeminiError(error: any, defaultMessage: string): string {
  const errorMsgString = error.message || String(error);
  const statusCode = error.status || error.statusCode || (error.error && error.error.code);
  
  const isHighDemand = 
    statusCode === "UNAVAILABLE" || 
    statusCode === 503 ||
    errorMsgString.includes("503") ||
    errorMsgString.includes("UNAVAILABLE") ||
    errorMsgString.includes("high demand") ||
    errorMsgString.includes("temporary");

  const isRateLimit =
    statusCode === 429 ||
    statusCode === "RESOURCE_EXHAUSTED" ||
    errorMsgString.includes("429") ||
    errorMsgString.includes("RESOURCE_EXHAUSTED");

  if (isHighDemand) {
    return "谷歌大模型服务器当前正处于高负载/高需求状态 (503 Service Unavailable)，这通常是暂时的。我们已为您尝试自动重试，但目前官方接口负载极高。请您稍微等待 3-5 秒，然后再次点击生成，通常即可顺利恢复！";
  }
  if (isRateLimit) {
    return "已达到模型接口的请求频率限制 (429 Rate Limit)。请稍耐心地等待几秒钟再试，模型系统会自动释放额度。";
  }
  return errorMsgString || defaultMessage;
}

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: "15mb" }));

  // API 1: Dictionary Lookup
  app.post("/api/dictionary/lookup", async (req, res) => {
    try {
      const { word } = req.body;
      if (!word || typeof word !== "string" || !word.trim()) {
        return res.status(400).json({ error: "Word parameter is required" });
      }

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: `Please search for the Korean word: "${word.trim()}". Return its dictionary definition.`,
        config: {
          systemInstruction: `You are an expert Korean-Chinese dictionary server.
Find the queried Korean word (or base verb form if user inputs conjugated form) and return accurate grammatical details.
Ensure pos is Chinese (e.g. 名词, 动词, 形容词, 副词, 代词, 接尾词, 惯用语 etc.).
Provide correct pronunciation in both Hangeul syllables and standard romanization (e.g., "annyeonghaseyo").
Provide clear Chinese translation definition.
Construct a highly practical Korean example sentence using this word and provide its accurate Chinese translation.
Evaluate vocabulary TOPIK level or usage frequency level (e.g. 初级, 中级, 高级).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The normalized Korean word (e.g., dictionary form like 가다 instead of 갔어요)." },
              pos: { type: Type.STRING, description: "Part of speech in Chinese. E.g. 动词, 名词, 形容词." },
              pronunciation: { type: Type.STRING, description: "Pronunciation romanization and standard sound hacks. E.g. [가다 / gada]" },
              definition: { type: Type.STRING, description: "Clear and precise Chinese meaning." },
              exampleKorean: { type: Type.STRING, description: "Complete practical example sentence in Korean." },
              exampleTranslation: { type: Type.STRING, description: "Chinese translation of the example sentence." },
              level: { type: Type.STRING, description: "Difficulty level, e.g., 初级, 中级, 高级 or TOPIK I / TOPIK II." },
            },
            required: ["word", "pos", "pronunciation", "definition", "exampleKorean", "exampleTranslation", "level"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from dictionary server.");
      }
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error: any) {
      console.error("Dictionary lookup error:", error);
      res.status(500).json({ error: formatGeminiError(error, "Failed to search the dictionary.") });
    }
  });

  // API 2: Parse Upload Content/Pasted Notebook Vocab
  app.post("/api/notebook/parse", async (req, res) => {
    try {
      const { text, fileData, mimeType } = req.body;

      let contents: any;
      if (fileData && mimeType === "application/pdf") {
        contents = [
          {
            inlineData: {
              data: fileData,
              mimeType: "application/pdf",
            },
          },
          "Carefully analyze this PDF document. Extract ALL useful Korean vocabulary words and terms (meaningful nouns, verbs, adjectives). Try to extract as many words as possible (up to 120 words) if the document contains many, do not limit it arbitrarily. Produce a comprehensive list of vocabulary items.",
        ];
      } else {
        if (!text || typeof text !== "string" || !text.trim()) {
          return res.status(400).json({ error: "Text content or PDF/Word document data is required for parsing" });
        }
        contents = `Extract all Korean vocabulary words and terms from the following text/notes. Try to extract as many words as possible (up to 120 words) if the text is long and has many terms, do not limit it arbitrarily to 20 words.
---
${text.substring(0, 45000)}
---`;
      }

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: `You are an expert Korean vocabulary extractor.
Analyze the user's uploaded paper, copy-pasted text, study notes, or document, and extract Korean words (Hangeul) that represent meaningful vocabulary.
For each extracted word, normalize it to its dictionary base form (e.g., write '하다' instead of conjugations like '해요', '했다' unless it's a specific expression).
Generate correct part of speech (pos) in Chinese, pronunciation, Chinese definition, one simple example sentence in Korean, and its Chinese translation.
Only extract valid Korean words. Ignore English/Chinese noise. Search and extract all vocabulary terms present in the text (up to 120 items if the text contains that many) without any artificial restriction. Do NOT arbitrarily limit to 20 words.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "Dictionary base form of the Korean word." },
                pos: { type: Type.STRING, description: "Part of speech (e.g. 名词, 动词, 形容词)." },
                pronunciation: { type: Type.STRING, description: "Romanized pronunciation." },
                definition: { type: Type.STRING, description: "Chinese definition." },
                exampleKorean: { type: Type.STRING, description: "Simple context example in Korean." },
                exampleTranslation: { type: Type.STRING, description: "Translation of the example in Chinese." },
                level: { type: Type.STRING, description: "Level (e.g. 初级, 中级, 高级)." },
              },
              required: ["word", "pos", "pronunciation", "definition", "exampleKorean", "exampleTranslation", "level"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Failed to parse words.");
      }
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error: any) {
      console.error("Vocabulary parsing error:", error);
      res.status(500).json({ error: formatGeminiError(error, "Failed to parse vocabulary.") });
    }
  });

  // API 3: Generate Reading Comprehension
  app.post("/api/reading/generate", async (req, res) => {
    try {
      const { words, difficulty } = req.body;
      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ error: "Please select at least one word from your notebook." });
      }

      let diffSpec = "";
      if (difficulty === "easy") {
        diffSpec = `
- VERY EASY / BEGINNER (适合初级入门, TOPIK I Level 1 对齐):
- 语法限制 (Grammar constraints): 只能使用极基础的韩语语法和时态，如句尾 '-아요/어요', '-습니다/ㅂ니다', 以及极基础的过去时 '-았어요/었어요'。
- 句子结构 (Sentence structure): 句子必须极其短小、直白，最好是主谓宾结构 (例如: "나는 친구가 있습니다. 친구를 사랑합니다.")。避免使用复杂的从句修饰、避免长条件句 (如 -(으)면)、避免包含复杂的因果、假设连接词。
- 词汇限制 (Outside Vocabulary constraints): 尽量多、反复使用选择的 notebook里的单词 [${words.join(", ")}]。对于其他伴生词汇，**必须极其简单**，严格限制于最基础生活必备词汇 (如: 친구, 집, 学校, 사람, 오늘, 날씨, 좋다, 먹다, 마시다, 가다, 만나다, 기쁘다, 재미있다, 책, 커피)。**绝对禁止引入任何复杂的、不常用的二级以上高级词汇或汉字生词**，让初学者能轻松、毫无压力地看懂其核心大意，像在看儿童双语画册。
- 故事类型 (Tone): 保留一个连贯有趣的简单温馨日常小故事，保持韩系温暖日常风格。
`;
      } else if (difficulty === "intermediate") {
        diffSpec = `
- INTERMEDIATE (适合中大语篇, TOPIK II Level 3-4 对齐):
- 语法中等，包含丰富的复合连接句尾 (如 -(으)면, -(으)니까, -지만, -기 때문에)。
- 句子长度适中，描述标准的日常生活事务、韩国传统习俗、趣味科技或旅游情景。
- 允许自然的外部中高频词汇。
`;
      } else {
        diffSpec = `
- ADVANCED (适合深度学习, TOPIK II Level 5-6 对齐):
- 使用长难句、学术性或新闻性语篇结构。
- 包含丰富的抽象概念、惯用语、间接引语和高级汉字词汇。
- 高级的句型连接词 (如 -(으)로써, -기 마련이다, -(으)ㄹ 뿐만 아니라)。
`;
      }

      const prompt = `Please compose a cohesive, continuous Korean article that integrates a selection of vocabulary words from this key list: [${words.join(", ")}].
Difficulty target specification:
${diffSpec}

CRITICAL RULES:
1. If the key list has 10 or fewer words, try to integrate all of them. If the key list has more than 10 words (e.g., up to 20 or more), select a cohesive, logical subset of 8-12 words that best fit together to make a natural, well-written story. Do not force completely unrelated/incompatible words if it ruins the flow or violates the difficulty level.
2. Inside the article text string, you MUST wrap every instance/conjugation of the target words with '<word>TargetWord</word>' tag so the client can parse them into interactive, clickable words. E.g., if target word is "학교", write "<word>학교</word>". If target word is "공부하다" and you write "공부합니다", write "<word>공부합니다</word>".
3. Provide a complete, detailed Chinese translation of the article.
4. Generate 3 multiple-choice reading comprehension questions. Questions should test overall comprehension, plus understanding of these target words in context.
5. Provide 4 option strings for each question (marked as options array).
6. Provide correctIndex (0 for first option, 1 for second option, etc.).
7. Provide a detailed explanation in Chinese.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite Korean language educator. You create beautiful, contextual articles and professional reading comprehension tests that exactly integrate specific word sets.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Korean title of the article." },
              titleZh: { type: Type.STRING, description: "Chinese translation of the title." },
              article: { type: Type.STRING, description: "The full Hangeul reading article. Crucial: Selected vocabulary terms MUST be wrapped in <word>...</word> tags!" },
              translation: { type: Type.STRING, description: "The continuous full Chinese translation of the article." },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique question index (e.g., 'q1', 'q2')." },
                    questionText: { type: Type.STRING, description: "The question text, in both Korean and Chinese explanation. E.g., '이 글의 제목으로 알맞은 것은 무엇입니까? (根据文章，最适合的标题是什么？)'" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 options, containing the option label and meaning. E.g., '① 공부 (学习)' or 'A. ...'"
                    },
                    correctIndex: { type: Type.INTEGER, description: "0-based index of the correct option (0 to 3)." },
                    explanation: { type: Type.STRING, description: "Detailed explanation in Chinese about the options, translating why this is correct." },
                  },
                  required: ["id", "questionText", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["title", "titleZh", "article", "translation", "questions"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Failed to generate reading material.");
      }
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error: any) {
      console.error("Reading generation error:", error);
      res.status(500).json({ error: formatGeminiError(error, "Failed to generate reading article.") });
    }
  });

  // API 4: Instant Word Translate (For long-press or click in reading text)
  app.post("/api/reading/translate-word", async (req, res) => {
    try {
      const { word, context } = req.body;
      if (!word || typeof word !== "string" || !word.trim()) {
        return res.status(400).json({ error: "Word is required for instant translation." });
      }

      const prompt = `Please quickly define this selected word: "${word.trim()}". ${context ? `It appeared in this reading context: "${context}"` : ""}`;
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `Explain the vocabulary word briefly and cleanly in Chinese.
Return POS (名词, 动词, 形容词, etc.), standard romanized pronunciation, precise definition, base form (原形) if it is conjugated, and a very short practical Korean example with Chinese translation.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The word itself." },
              baseForm: { type: Type.STRING, description: "The base form / dictionary form of the word (e.g. 가达 instead of 갔어요)." },
              pos: { type: Type.STRING, description: "Part of speech (e.g. 动词, 名词)." },
              pronunciation: { type: Type.STRING, description: "Romanized pronunciation." },
              definition: { type: Type.STRING, description: "Precise Chinese definition." },
              exampleKorean: { type: Type.STRING, description: "Very short Korean example." },
              exampleTranslation: { type: Type.STRING, description: "Chinese translation of the example." },
            },
            required: ["word", "baseForm", "pos", "pronunciation", "definition", "exampleKorean", "exampleTranslation"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No translation returned.");
      }
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error: any) {
      console.error("Word translation error:", error);
      res.status(500).json({ error: formatGeminiError(error, "Failed to translate word.") });
    }
  });

  return app;
}

export async function startServer() {
  const app = createApiApp();
  const PORT = 3000;

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing successfully on http://localhost:${PORT}`);
  });
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entrypointPath === fileURLToPath(import.meta.url)) {
  startServer();
}
