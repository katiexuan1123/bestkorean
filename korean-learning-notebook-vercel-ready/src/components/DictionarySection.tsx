import React, { useState } from "react";
import { Search, Plus, Sparkles, BookOpen, Loader2, Check, ArrowRight } from "lucide-react";
import { Word } from "../types";
import { SurprisedGreyMascot } from "./Mascots";

interface DictionarySectionProps {
  onAddWord: (wordData: Omit<Word, "id" | "addedAt">) => void;
  existingWords: Word[];
}

const COMMON_SUGGESTIONS = [
  { word: "사랑", definition: "爱，爱情" },
  { word: "행복", definition: "幸福" },
  { word: "하늘", definition: "天空" },
  { word: "커피", definition: "咖啡" },
  { word: "여행", definition: "旅行" },
  { word: "인연", definition: "姻缘，因缘" },
  { word: "가을", definition: "秋天" },
  { word: "기억하다", definition: "记忆，记住" },
];

export default function DictionarySection({ onAddWord, existingWords }: DictionarySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [added, setAdded] = useState(false);

  const handleSearch = async (queryToSearch?: string) => {
    const targetQuery = queryToSearch || searchQuery;
    if (!targetQuery.trim()) return;

    if (queryToSearch) {
      setSearchQuery(queryToSearch);
    }

    setLoading(true);
    setError(null);
    setAdded(false);
    setResult(null);

    try {
      const response = await fetch("/api/dictionary/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: targetQuery.trim() }),
      });

      if (!response.ok) {
        throw new Error("查询失败，AI词典服务暂时无法连接");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "请求出错，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const isWordSaved = result
    ? existingWords.some(
        (w) => w.word.toLowerCase().trim() === result.word.toLowerCase().trim()
      )
    : false;

  const handleAdd = () => {
    if (!result) return;
    onAddWord({
      word: result.word,
      pos: result.pos,
      pronunciation: result.pronunciation,
      definition: result.definition,
      exampleKorean: result.exampleKorean,
      exampleTranslation: result.exampleTranslation,
      level: result.level,
    });
    setAdded(true);
  };

  return (
    <div className="space-y-6 text-[#4E4744]">
      {/* Search Input Card is overflow-visible to let the mascot merge seamlessly between inside and outside */}
      <div className="relative">
        <div className="card-gradient-mock p-6 md:p-10 rounded-[30px] border border-[#FBF1EF]/80 shadow-md shadow-[#9E948A]/5 relative overflow-visible">
          <h2 className="font-sans font-medium text-2xl text-[#2C2725] tracking-tight mb-6">
            词典Dictionary
          </h2>
        
        {/* Dynamic description toggler to keep things elegant but informative */}
        <p className="text-[11px] text-[#9E948A] mb-5 leading-relaxed font-sans max-w-xl">
          依托 Gemini AI，为您提供近乎全新全覆盖的韩语生词检索。不仅支持单词原形查询、也能智能纠正词尾变型，顺便为您生成地道例句、词性和发音罗马音。
        </p>

        <div className="relative flex items-center max-w-3xl z-20">
          <div className="absolute left-4 text-[#AC8558]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#DF9B92]" /> : <Search className="w-5 h-5 opacity-70" />}
          </div>
          <input
            type="text"
            placeholder="请输入要查找的韩语单词，例：나, 공부하다, 행복..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
            className="w-full pl-12 pr-28 py-4 bg-white/95 hover:bg-white border border-[#E3B373]/20 focus:border-[#E3B373]/50 focus:shadow-sm rounded-full text-sm placeholder-[#9E948A] outline-none transition-all font-sans text-[#4E4744]"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !searchQuery.trim()}
            className="absolute right-2 py-2 px-6 bg-[#FCEDC6] hover:bg-[#F9DEC0] active:bg-[#EDCDA4] disabled:bg-gray-100 disabled:text-gray-400 text-[#865E25] text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs border border-[#E3B373]/10"
          >
            查询
          </button>
        </div>

        {/* Suggestion tags */}
        <div className="mt-6 flex flex-wrap items-center gap-2 max-w-2xl z-20 relative">
          <span className="text-[11px] font-bold text-[#9E948A] mr-1 uppercase tracking-wider">热门推荐:</span>
          {COMMON_SUGGESTIONS.map((s) => (
            <button
               key={s.word}
               onClick={() => handleSearch(s.word)}
               disabled={loading}
               className="text-xs px-3.5 py-1.5 bg-white/80 hover:bg-[#FDF1EE] hover:text-[#DF9B92] hover:border-[#DF9B92]/50 text-[#4E4744] border border-[#FAF2E6] rounded-full transition-all duration-150 cursor-pointer text-left font-sans font-medium hover:shadow-xs"
            >
              <span className="font-semibold">{s.word}</span>{" "}
              <span className="text-[10px] text-[#9E948A] font-normal">({s.definition})</span>
            </button>
          ))}
        </div>
        </div>

        {/* Absolute positioned cute grey surprised mascot merging nicely between inside & outside */}
        <div className="absolute bottom-[-32px] right-3 md:right-8 pointer-events-none select-none z-30 hidden sm:block">
          <SurprisedGreyMascot className="w-28 h-28 md:w-36 md:h-36 drop-shadow-md hover:scale-105 transition-transform duration-200" />
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white p-6 rounded-2xl border border-[#FAFAF4] shadow-md shadow-[#9E948A]/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#FAF2E6]">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-medium text-3xl text-[#5A5550]">{result.word}</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FBF1EF] text-[#DF9B92]">
                  {result.pos}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F6F3EC] text-[#9E948A]">
                  {result.level || "常规"}
                </span>
              </div>
              <p className="text-xs text-[#E3B373] font-semibold tracking-wide font-mono mt-1">
                发音/Romanization: {result.pronunciation}
              </p>
            </div>

            <button
              onClick={handleAdd}
              disabled={isWordSaved || added}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                isWordSaved || added
                  ? "bg-[#F6F3EC] text-[#9E948A] border border-[#FAF2E6] cursor-default"
                  : "bg-[#DF9B92] hover:bg-[#d08b82] text-white shadow-xs"
              }`}
            >
              {isWordSaved || added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已添加至单词本
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  保存到 Notebook
                </>
              )}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-sans font-bold text-[#9E948A] tracking-widest uppercase">
                直观释义
              </h4>
              <div className="p-4 bg-[#FAFAF4] rounded-xl border border-[#FAF2E6] text-sm font-medium text-[#4E4744] leading-relaxed min-h-[80px]">
                {result.definition}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-sans font-bold text-[#9E948A] tracking-widest uppercase">
                地道例句 (AI 辅助生成)
              </h4>
              <div className="p-4 bg-[#F6F3EC]/60 border border-[#FAF2E6] rounded-xl min-h-[80px]">
                <p className="text-[#4E4744] font-semibold text-sm leading-relaxed mb-1 font-mono">
                  {result.exampleKorean}
                </p>
                <p className="text-[#9E948A] text-xs tracking-wide">
                  {result.exampleTranslation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-[#FBF1EF] border border-[#FBF1EF] rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
          <div className="p-2 bg-red-100/50 text-[#F24E4E] rounded-xl">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-800">查询失败</h4>
            <p className="text-xs text-[#F24E4E] mt-1 leading-relaxed">
              原因：{error}。部分冷启动或网络波动情况下容易连接超时，请尝试重新点击查询。
            </p>
          </div>
        </div>
      )}

      {/* Intro empty state */}
      {!result && !loading && !error && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FBF1EF] flex items-center justify-center text-[#DF9B92] shadow-xs mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-display font-medium text-[#5A5550]">
            韩式奶风 AI 词库
          </h3>
          <p className="text-xs text-[#9E948A] max-w-sm leading-relaxed mt-2">
            上方输入框中输出您遇到的任何 Hangeul 韩国字，或点击热门推荐，享受一站式全能词语拆析。
          </p>
        </div>
      )}
    </div>
  );
}
