import { useState, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Eye,
  Plus,
  BookOpenCheck,
  Languages,
  RotateCcw,
  Trash2,
  Check,
  Archive,
  BookMarked,
} from "lucide-react";
import { Word, ReadingArticle, SavedPractice } from "../types";

interface ReadingSectionProps {
  selectedWords: Word[];
  existingWords: Word[];
  savedPractices: SavedPractice[];
  onSavePractice: (practice: SavedPractice) => void;
  onDeletePractice: (id: string) => void;
  onAddWord: (wordData: Omit<Word, "id" | "addedAt">) => void;
  onOpenLookupModal: (word: string) => void;
}

export default function ReadingSection({
  selectedWords,
  existingWords,
  savedPractices,
  onSavePractice,
  onDeletePractice,
  onAddWord,
  onOpenLookupModal,
}: ReadingSectionProps) {
  const [difficulty, setDifficulty] = useState<"easy" | "intermediate" | "advanced">("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedArticle, setGeneratedArticle] = useState<ReadingArticle | null>(null);

  // Archive state
  const [isSaved, setIsSaved] = useState(false);

  // Answering states
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Dynamic selected text helper
  const [selectedTextWord, setSelectedTextWord] = useState<string>("");
  const articleContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (selectedWords.length === 0) return;
    setLoading(true);
    setError(null);
    setGeneratedArticle(null);
    setSubmitted(false);
    setUserAnswers({});
    setScore(null);
    setSelectedTextWord("");
    setIsSaved(false);

    const wordsList = selectedWords.map((w) => w.word);

    try {
      const response = await fetch("/api/reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: wordsList, difficulty }),
      });

      if (!response.ok) {
        let errorMsg = "生成失败，可能您的生词过多或包含非韩语字符，请减少选择或重试。";
        try {
          const errBody = await response.json();
          if (errBody && errBody.error) {
            errorMsg = `生成失败: ${errBody.error}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const articleData: ReadingArticle = await response.json();
      setGeneratedArticle(articleData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成文章失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qId: string, optIndex: number) => {
    if (submitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optIndex,
    }));
  };

  const handleSubmit = () => {
    if (!generatedArticle) return;

    let correctCount = 0;
    generatedArticle.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setSubmitted(true);
  };

  const handleReset = () => {
    setGeneratedArticle(null);
    setSubmitted(false);
    setUserAnswers({});
    setScore(null);
    setSelectedTextWord("");
    setIsSaved(false);
  };

  const handleSaveToHistory = () => {
    if (!generatedArticle || score === null) return;
    const practiceData: SavedPractice = {
      id: "practice-" + Math.random().toString(36).substr(2, 9),
      title: generatedArticle.title,
      titleZh: generatedArticle.titleZh,
      article: generatedArticle.article,
      translation: generatedArticle.translation,
      difficulty: generatedArticle.difficulty,
      questions: generatedArticle.questions,
      userAnswers,
      score,
      savedAt: new Date().toISOString(),
      selectedWordList: selectedWords.length > 0 ? selectedWords.map((w) => w.word) : ["自选生词"],
    };
    onSavePractice(practiceData);
    setIsSaved(true);
  };

  const handleLoadPractice = (practice: SavedPractice) => {
    setGeneratedArticle({
      title: practice.title,
      titleZh: practice.titleZh,
      article: practice.article,
      translation: practice.translation,
      questions: practice.questions,
      difficulty: practice.difficulty,
    });
    setUserAnswers(practice.userAnswers);
    setSubmitted(true);
    setScore(practice.score);
    setIsSaved(true);
    setSelectedTextWord("");
  };

  // Text selection listener for long-press / mouse drag
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      // Regex check: only trigger overlay if it is or contains Hangeul characters
      const hasKorean = /[\uac00-\ud7af]/g.test(text);
      if (text && hasKorean && text.length < 20) {
        setSelectedTextWord(text);
      }
    }
  };

  // Keyword highlighting and parsing
  const parseArticleText = (articleStr: string) => {
    if (!articleStr) return null;
    const parts = articleStr.split(/(<\/word>|<word>)/g);
    let isInsideWord = false;

    return parts
      .map((part, index) => {
        if (part === "<word>") {
          isInsideWord = true;
          return null;
        }
        if (part === "</word>") {
          isInsideWord = false;
          return null;
        }
        if (isInsideWord) {
          return (
            <span
              key={index}
              onClick={() => onOpenLookupModal(part)}
              className="interactive-word mx-0.5 font-semibold text-[#DF9B92]"
              title="点击查词本句含义"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })
      .filter(Boolean);
  };

  return (
    <div className="space-y-6 text-[#4E4744]">
      {!generatedArticle ? (
        <div className="space-y-6">
          {/* Configuration Panel */}
          <div className="card-gradient-mock p-6 md:p-8 rounded-[30px] border border-[#FBF1EF]/80 shadow-md shadow-[#9E948A]/5 space-y-6">
            <div>
              <h2 className="font-sans font-medium text-lg text-[#2C2725] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E3B373]" />
                AI 智能专属阅读理解生成器
              </h2>
              <p className="text-xs text-[#9E948A] mt-1.5 leading-relaxed">
                根据您的韩语单词库，利用 LLM 大模型为您量身定做一篇富含生词、逻辑通顺的韩国故事，并自动设计针对单词与句型的小测试，自动批改答案！
              </p>
            </div>

            {/* Words feedback */}
            <div>
              <span className="text-xs font-bold text-[#9E948A] uppercase tracking-wider block mb-2">已选中准备融入文章的生词 ({selectedWords.length}):</span>
              {selectedWords.length === 0 ? (
                <div className="p-4 bg-[#FAF2E6]/30 rounded-xl border border-dashed border-[#E3B373]/30 text-center text-xs text-[#9E948A]">
                  请先在 **“Notebook 核心词库”** 中勾选您想要融会贯通的生词！
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-[#FAFAF4] border border-[#FAF2E6] rounded-xl max-h-36 overflow-y-auto w-full shadow-inner">
                  {selectedWords.map((w) => (
                    <span
                      key={w.id}
                      className="text-xs px-2.5 py-1 bg-white border border-[#FAF2E6] rounded-full font-semibold text-[#4E4744] hover:text-[#DF9B92] hover:border-[#DF9B92]/40 cursor-help transition-all"
                    >
                      {w.word}{" "}
                      <span className="text-[9px] text-[#9A948F] font-normal">({w.definition})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#9A948F] uppercase tracking-wider block">选择您期望的阅读训练难度:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: "easy", label: "初级 (Easy)", desc: "句式短小直白，生词率极低，温馨小短篇" },
                  { key: "intermediate", label: "中级 (Medium)", desc: "标配级别，生活场景复合句/精读" },
                  { key: "advanced", label: "高级 (Hard)", desc: "论述科普复杂时态修饰，高级词汇" },
                ].map((item) => (
                  <button
                    key={item.key}
                    disabled={loading}
                    onClick={() => setDifficulty(item.key as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      difficulty === item.key
                        ? "border-[#DF9B92] bg-[#FBF1EF] text-[#DF9B92] font-bold shadow-xs"
                        : "border-[#FAF2E6] hover:border-gray-300 bg-white text-[#4E4744] hover:bg-[#FAFAF4]"
                    }`}
                  >
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-[#9A948F] mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || selectedWords.length === 0}
              className="w-full py-3.5 bg-[#DF9B92] hover:bg-[#d08b82] disabled:bg-[#FAFAF4] text-white disabled:text-[#9E948A] text-xs font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#9E948A]/5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  AI 老师备课中... 精心编写极简趣味故事大约需要 10s
                </>
              ) : (
                <>
                  <BookOpenCheck className="w-4 h-4" />
                  一键生成专属阅读练习 ({selectedWords.length} 词)
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-[#FBF1EF] text-[#F24E4E] text-xs rounded-xl text-center leading-relaxed border border-[#FBF1EF]">
                {error}
              </div>
            )}
          </div>

          {/* Practice Archives History Log Grid */}
          {savedPractices.length > 0 && (
            <div className="bg-[#FAF2E6]/30 p-6 rounded-2xl border border-[#FAF2E6] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#FAF2E6]">
                <h3 className="font-display font-medium text-sm text-[#5A5550] flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-[#DF9B92]" />
                  我的精读练习本 📔 ({savedPractices.length} 篇存档记录)
                </h3>
                <span className="text-[10px] text-[#9E948A] uppercase tracking-wider font-mono">
                  Saved Notes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedPractices.map((practice) => (
                  <div
                    key={practice.id}
                    className="p-4 rounded-xl border border-[#FAF2E6] hover:border-[#DF9B92]/40 bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          practice.difficulty === "easy"
                            ? "bg-green-100/80 text-green-700"
                            : practice.difficulty === "intermediate"
                              ? "bg-[#FDF9F0] text-[#DEAC5D]"
                              : "bg-red-100/70 text-red-700"
                        }`}>
                          {practice.difficulty === "easy" && "初级"}
                          {practice.difficulty === "intermediate" && "中级"}
                          {practice.difficulty === "advanced" && "高级"}
                        </span>
                        <span className="text-[10px] text-[#9A948F]">
                          {new Date(practice.savedAt).toLocaleDateString()} {new Date(practice.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-display font-semibold text-sm text-[#4E4744] line-clamp-1 pt-1">
                        {practice.title}
                      </h4>
                      <p className="text-xs text-[#9E948A] line-clamp-1">
                        {practice.titleZh}
                      </p>
                    </div>

                    <div className="text-[10px] text-[#4E4744] bg-[#FAFAF4] p-2.5 rounded-lg border border-[#FAF2E6]/60">
                      <span className="text-[#9E948A] block font-semibold mb-0.5">测试中所融生词:</span>
                      <p className="font-sans line-clamp-2 leading-relaxed text-[#DF9B92]">
                        {practice.selectedWordList?.join(", ") || "自选生词"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#FAF2E6]/45">
                      <span className="text-xs font-semibold text-[#DF9B92]">
                        测验得分: <span className="font-bold text-sm">{practice.score}</span> / 3 题
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoadPractice(practice)}
                          className="py-1 px-3 bg-[#DF9B92] hover:bg-[#d08b82] text-white rounded-full text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          温戏回顾
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("确定要删除这篇阅读理解的练习存档吗？")) {
                              onDeletePractice(practice.id);
                            }
                          }}
                          className="p-1 px-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="删除练习归档"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Reading & Quiz Stage */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[10px] font-bold bg-[#FBF1EF] text-[#DF9B92] rounded-full border border-[#FAF2E6]">
                {difficulty === "easy" ? "初级" : difficulty === "intermediate" ? "中级" : "高级"}
              </span>
              <span className="text-xs text-[#9E948A]">
                包含生词：{selectedWords.map((w) => w.word).join(", ")}
              </span>
            </div>

            <button
              onClick={handleReset}
              className="text-xs flex items-center gap-1 text-[#9E948A] hover:text-[#DF9B92] bg-white py-1.5 px-3 border border-[#FAF2E6] rounded-full transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              重新配置
            </button>
          </div>

          {/* Quick Selection Guide Alert */}
          <div className="p-3 bg-white border border-[#FAF2E6] rounded-xl flex items-center gap-2 text-xs text-[#9E948A]">
            <span className="font-semibold shrink-0 font-sans text-[#DF9B92]">💡 探索提示:</span>
            <span>
              双击或长按文章中的任意单词，即可唤醒 AI 翻译。文中加粗下划线词汇为您的生词，可以直接点击它们！
            </span>
            {selectedTextWord && (
              <button
                onClick={() => onOpenLookupModal(selectedTextWord)}
                className="ml-auto py-1 px-3 bg-[#DF9B92] hover:bg-[#d08b82] text-white rounded-full text-[10px] font-semibold transition-all"
              >
                翻译选词: 「{selectedTextWord}」
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Article Reading */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#FAFAF4] shadow-md shadow-[#9E948A]/5 space-y-6">
              <div className="space-y-1">
                <h1 className="font-display font-medium text-[#5A5550] text-2xl tracking-tight leading-relaxed">
                  {generatedArticle.title}
                </h1>
                <p className="text-sm text-[#9E948A] italic">
                  韩风奶色语感大阅读：请细品文章，遇到新词请进行交互。
                </p>
              </div>

              {/* Korean Article Content Box */}
              <div
                ref={articleContainerRef}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                className="p-5 bg-[#FAFAF4] border border-[#FAF2E6]/60 rounded-xl text-[#4E4744] text-base leading-8 font-sans font-medium whitespace-pre-wrap select-text selection:bg-[#FAFAF4] text-justify"
              >
                {parseArticleText(generatedArticle.article)}
              </div>

              {/* Translation revealed below ONLY after submission */}
              {submitted ? (
                <div className="p-5 bg-[#FAF2E6]/30 border border-[#E3B373]/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 text-[#4E4744]">
                  <div className="flex items-center gap-1.5 text-[#DF9B92]">
                    <Languages className="w-4 h-4 font-semibold" />
                    <span className="text-xs font-semibold font-display">汉译对照 (译文隐藏已解除):</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#5A5550] mt-1">
                    {generatedArticle.titleZh}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-justify">
                    {generatedArticle.translation}
                  </p>
                </div>
              ) : (
                <div className="py-4 border border-dashed border-[#FAF2E6] rounded-xl flex flex-col items-center justify-center text-center text-xs text-[#9E948A] bg-[#FAFAF4]">
                  <Eye className="w-4 h-4 mb-2 text-[#9E948A]/40" />
                  <span>提交测验答案后，此处将自动唤醒展示全文翻译对照</span>
                </div>
              )}
            </div>

            {/* Right Side: Quiz Questions */}
            <div className="lg:col-span-5 space-y-5">
              {/* Score Display Card */}
              {submitted && score !== null && (
                <div className="p-4 bg-[#FAFAF4] border border-[#E3B373]/20 rounded-xl text-center space-y-3 shadow-sm shadow-[#9E948A]/5">
                  <div className="space-y-1">
                    <span className="text-xs text-[#DF9B92] font-bold uppercase tracking-wider">
                      批改分析报告
                    </span>
                    <p className="text-2xl font-display font-medium text-[#5A5550]">
                      得 分 : {score} <span className="text-base text-[#9A948F]">/ 3 题</span>
                    </p>
                    <p className="text-xs text-[#9A948A] font-sans">
                      {score === 3 ? "🏆 满分！全部理解无误，太厉害了！" : "✏️ 做得好！看看下方的错误批注，及时查漏补缺。"}
                    </p>
                  </div>

                  {/* Saving Action */}
                  <div className="pt-2 border-t border-[#FAF2E6] flex justify-center">
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#DF9B92] bg-[#FAF2E6]/40 border border-[#E3B373]/30 py-1.5 px-3.5 rounded-full font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        已保存至精读练习本存档 ☘️
                      </span>
                    ) : (
                      <button
                        onClick={handleSaveToHistory}
                        className="inline-flex items-center gap-1 bg-[#DF9B92] hover:bg-[#d08b82] text-white py-1.5 px-4 rounded-full text-xs font-bold shadow-sm transition-all"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        保存到练习本(归档记录)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Questions Loops */}
              <div className="space-y-4">
                {generatedArticle.questions.map((q, qIdx) => {
                  const selectedOption = userAnswers[q.id];
                  const isCorrect = selectedOption === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border bg-white shadow-md shadow-[#9E948A]/3 space-y-3 transition-all ${
                        submitted
                          ? isCorrect
                            ? "border-[#B5D6B5] bg-green-55/5"
                            : "border-red-200 bg-red-50/5"
                          : "border-[#FAFAF4]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 bg-[#FBF1EF] text-[#DF9B92] rounded">
                          Q{qIdx + 1}
                        </span>
                        <p className="text-xs font-semibold text-[#5A5550] leading-relaxed font-sans">
                          {q.questionText}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOption === optIdx;
                          const isOptionCorrect = q.correctIndex === optIdx;

                          let optionClass = "border-[#FAF2E6] bg-white text-[#4E4744] hover:bg-[#FAFAF4]";

                          if (isOptionSelected) {
                            optionClass = "border-[#DF9B92] bg-[#FBF1EF] text-[#DF9B92] font-semibold";
                          }

                          if (submitted) {
                            if (isOptionCorrect) {
                              // Always paint correct answer green
                              optionClass = "border-[#B5D6B5] bg-[#EFF8EF] text-green-700 font-semibold";
                            } else if (isOptionSelected) {
                              // If user selected incorrect, paint red
                              optionClass = "border-red-400 bg-[#FBF1EF] text-red-600 font-semibold";
                            } else {
                              optionClass = "border-[#FAFAF4] bg-white text-[#9E948A] cursor-default opacity-60";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={submitted}
                              onClick={() => handleOptionSelect(q.id, optIdx)}
                              className={`w-full text-left p-2.5 rounded-lg border text-xs leading-relaxed transition-all flex items-center gap-2 ${optionClass} ${
                                !submitted ? "cursor-pointer" : "cursor-default"
                              }`}
                            >
                              <span className="font-mono text-[10px] w-4 shrink-0 font-bold">
                                {["A", "B", "C", "D"][optIdx]}.
                              </span>
                              <span>{opt}</span>

                              {/* Correct check on submit */}
                              {submitted && isOptionCorrect && (
                                <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-auto shrink-0" />
                              )}
                              {submitted && isOptionSelected && !isOptionCorrect && (
                                <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Incorrect red / correct green text marker */}
                      {submitted && (
                        <div className="pt-2 border-t border-[#FAF2E6] text-[11px] leading-relaxed text-[#9E948A]">
                          <div className="flex items-center gap-1 font-semibold mb-1">
                            <HelpCircle className="w-3 h-3 text-[#DF9B92]" />
                            <span className="text-[#DF9B92]">答案详解:</span>
                          </div>
                          <p className="whitespace-pre-line text-xs font-sans text-justify text-[#4E4744]">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Buttons */}
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(userAnswers).length < generatedArticle.questions.length}
                  className="w-full py-3.5 bg-[#DF9B92] hover:bg-[#d08b82] disabled:bg-gray-150 text-white disabled:text-[#9E948A] text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider shadow-md shadow-[#9E948A]/5"
                >
                  <Eye className="w-4 h-4" />
                  提交验评解答 (自动校正绿-红指示)
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="w-full py-3.5 bg-[#E3B373] hover:bg-[#dca358] text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider shadow-md shadow-[#9E948A]/5"
                >
                  <Sparkles className="w-4 h-4" />
                  重新生成练习案例
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
