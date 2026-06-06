import { useState, useEffect } from "react";
import { X, Plus, BookOpen, Volume2, Sparkles, Loader2, Check } from "lucide-react";
import { Word } from "../types";

interface WordLookupModalProps {
  wordToLookup: string;
  context?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (wordData: Omit<Word, "id" | "addedAt">) => void;
  existingWords: Word[];
}

export default function WordLookupModal({
  wordToLookup,
  context,
  isOpen,
  onClose,
  onAddWord,
  existingWords,
}: WordLookupModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (isOpen && wordToLookup) {
      fetchDefinition();
      setAdded(false);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, wordToLookup]);

  const fetchDefinition = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reading/translate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: wordToLookup, context }),
      });
      if (!response.ok) {
        throw new Error("伺服器查询字典失败");
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "无法即时翻译此单词，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isWordSaved = data
    ? existingWords.some(
        (w) => w.word.toLowerCase().trim() === data.word.toLowerCase().trim()
      )
    : false;

  const handleSave = () => {
    if (!data) return;
    onAddWord({
      word: data.word,
      pos: data.pos,
      pronunciation: data.pronunciation,
      definition: data.definition,
      exampleKorean: data.exampleKorean,
      exampleTranslation: data.exampleTranslation,
      level: data.baseForm ? `原形: ${data.baseForm}` : "生词",
    });
    setAdded(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#FAF2E6] shadow-xl shadow-[#9E948A]/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#FAFAF4] border-b border-[#FAF2E6]">
          <div className="flex items-center gap-2 text-[#DF9B92]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="font-display font-medium text-sm tracking-wide">AI 实时词典查词</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E948A] hover:text-[#DF9B92] rounded-lg transition-colors hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#DF9B92] mb-3" />
              <p className="text-sm">正在调用 AI 解析韩语单词...</p>
              <p className="text-xs text-[#9E948A] mt-1">「{wordToLookup}」</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#FBF1EF] text-red-600 rounded-xl text-center border border-[#FBF1EF]">
              <p className="text-sm font-medium mb-2">{error}</p>
              <button
                onClick={fetchDefinition}
                className="text-xs font-semibold underline hover:text-[#DF9B92]"
              >
                重试一下
              </button>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-semibold text-2xl text-[#4E4744]">
                    {data.word}
                  </h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-[#FBF1EF] text-[#DF9B92] font-semibold">
                    {data.pos}
                  </span>
                </div>
                <p className="text-xs text-[#DF9B92] font-mono tracking-wide mt-1">
                  发音: {data.pronunciation}
                </p>
                {data.baseForm && data.baseForm !== data.word && (
                  <p className="text-xs text-[#9E948A] mt-0.5">
                    原形: <span className="font-medium text-[#4E4744]">{data.baseForm}</span>
                  </p>
                )}
              </div>

              <div className="p-4 bg-[#FAFAF4] rounded-xl border border-[#FAF2E6]/60">
                <span className="text-xs font-display font-medium text-[#9E948A] block mb-1">
                  中文释义
                </span>
                <p className="text-[#4E4744] text-sm leading-relaxed font-semibold">
                  {data.definition}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-display font-medium text-[#9E948A] block">
                  AI 生成连贯例句
                </span>
                <div className="p-4 bg-[#FAF2E6]/30 border border-[#FAF2E6] rounded-xl space-y-1.5">
                  <p className="text-[#4E4744] font-medium text-sm leading-relaxed decoration-wavy">
                    {data.exampleKorean}
                  </p>
                  <p className="text-[#9E948A] text-xs tracking-wide">
                    {data.exampleTranslation}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-[#FAF2E6] flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 rounded-xl border border-[#FAF2E6] text-[#4E4744] text-sm hover:bg-[#FAFAF4] transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={handleSave}
                  disabled={isWordSaved || added}
                  className={`flex items-center justify-center gap-1.5 flex-2 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    isWordSaved || added
                      ? "bg-[#FAF2E6]/50 text-[#DF9B92]/80 border border-[#FAF2E6] cursor-default"
                      : "bg-[#DF9B92] hover:bg-[#d08b82] text-white shadow-md shadow-[#9E948A]/5"
                  }`}
                >
                  {isWordSaved || added ? (
                    <>
                      <Check className="w-4 h-4" />
                      已在 Notebook 中
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      加入 Notebook
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#9E948A]">无单词数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
