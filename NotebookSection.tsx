import React, { useState, useRef } from "react";
import mammoth from "mammoth";
import {
  BookOpen,
  Trash2,
  FileCheck,
  Upload,
  Clipboard,
  Sparkles,
  Loader2,
  Plus,
  BookMarked,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  FolderPlus,
  FolderOpen,
  Folder,
  Archive,
  Move,
  ChevronDown,
} from "lucide-react";
import { Word, Folder as FolderType } from "../types";

interface NotebookSectionProps {
  words: Word[];
  folders: FolderType[];
  selectedWordIds: string[];
  onToggleWordSelection: (id: string) => void;
  onSelectAllWords: () => void;
  onDeselectAllWords: () => void;
  onDeleteWord: (id: string) => void;
  onAddParsedWords: (newWords: Omit<Word, "id" | "addedAt">[], folderId?: string) => void;
  onGoToReading: () => void;
  onCreateFolder: (name: string) => FolderType;
  onDeleteFolder: (id: string, deleteWords?: boolean) => void;
  onMoveWordsToFolder: (wordIds: string[], folderId: string | undefined) => void;
}

export default function NotebookSection({
  words,
  folders,
  selectedWordIds,
  onToggleWordSelection,
  onSelectAllWords,
  onDeselectAllWords,
  onDeleteWord,
  onAddParsedWords,
  onGoToReading,
  onCreateFolder,
  onDeleteFolder,
  onMoveWordsToFolder,
}: NotebookSectionProps) {
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterFolderId, setFilterFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Paste / Upload logic state
  const [pasteText, setPasteText] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parsedSuggestions, setParsedSuggestions] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Foler import & management states
  const [importFolderId, setImportFolderId] = useState<string>(""); // "" = No folder, "new" = create on the fly, others = folder ID
  const [newImportFolderName, setNewImportFolderName] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [folderInputName, setFolderInputName] = useState<string>("");
  const [showMovePopover, setShowMovePopover] = useState<boolean>(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("");
  const [newMoveFolderName, setNewMoveFolderName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter words
  const filteredWords = words.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definition.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = filterLevel === "all" ? true : w.level === filterLevel;
    
    const matchesFolder =
      filterFolderId === "all"
        ? true
        : filterFolderId === "uncategorized"
        ? !w.folderId
        : w.folderId === filterFolderId;

    return matchesSearch && matchesLevel && matchesFolder;
  });

  // Unique levels
  const levels = Array.from(new Set(words.map((w) => w.level))).filter(Boolean);

  // File parsing helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadError(null);
    setUploadSuccessMessage(null);

    // TXT, Markdown or CSV files
    if (
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".json")
    ) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          setUploadError("文件内容为空，请重新选择。");
          return;
        }
        await parseWithAI({ text }, file.name);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      // Send base64 PDF directly to Gemini
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result as string;
          const base64Data = resultString.split(",")[1];
          await parseWithAI({ fileData: base64Data, mimeType: "application/pdf" }, file.name);
        } catch (err: any) {
          console.error(err);
          setUploadError("PDF 文件读取失败，建议您复制文字手动进行粘贴。");
        }
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".docx")) {
      // Decode Word documents locally with Mammoth
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const mammothResult = await mammoth.extractRawText({ arrayBuffer });
          const text = mammothResult.value;
          if (!text || !text.trim()) {
            setUploadError("Word 文档内容读取为空，请在右侧文本框手动粘贴文字。");
            return;
          }
          await parseWithAI({ text }, file.name);
        } catch (err: any) {
          console.error(err);
          setUploadError("Word 文档解析失败。请在右侧文本框手动粘贴文字。");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".doc")) {
      setUploadError("暂不支持旧版 .doc 格式，请另存为现代的 .docx / PDF 格式后上传，或直接在右侧复制粘贴。");
    } else {
      setUploadError("仅支持文本文件（.txt、.md、.csv、.json、.pdf、.docx）或进行下方文字粘贴。");
    }
  };

  const parseWithAI = async (
    payload: { text?: string; fileData?: string; mimeType?: string },
    sourceName?: string
  ) => {
    setUploadLoading(true);
    setUploadError(null);
    setParsedSuggestions([]);

    try {
      const response = await fetch("/api/notebook/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("AI 解析失败，请重试");
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error("AI 未能在该文档或文本中检索到韩语单词");
      }

      setParsedSuggestions(results);
      setUploadSuccessMessage(
        `成功从 ${sourceName || "您提供的内容"} 中利用 AI 提炼出 ${results.length} 个韩语核心词汇！请在下方确认导入。`
      );
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "解析时出错，请重试");
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    parseWithAI({ text: pasteText }, "粘贴的书本/词库文本");
  };

  const handleImportAllSuggestions = () => {
    if (parsedSuggestions.length === 0) return;

    let targetFolderIdToUse: string | undefined = undefined;
    let targetFolderName = "";

    if (importFolderId === "new") {
      if (newImportFolderName.trim()) {
        const created = onCreateFolder(newImportFolderName);
        targetFolderIdToUse = created.id;
        targetFolderName = created.name;
      }
    } else if (importFolderId) {
      targetFolderIdToUse = importFolderId;
      targetFolderName = folders.find((f) => f.id === importFolderId)?.name || "";
    }

    onAddParsedWords(parsedSuggestions, targetFolderIdToUse);
    setParsedSuggestions([]);
    setUploadSuccessMessage(
      targetFolderIdToUse
        ? `生词词库已成功提炼并全量同步归档至文件夹「${targetFolderName}」中！☘️`
        : "生词词库已全量同步到您的 Notebook 中！"
    );
    setPasteText("");
    setImportFolderId("");
    setNewImportFolderName("");
  };

  const handleRemoveSuggestion = (index: number) => {
    setParsedSuggestions(parsedSuggestions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 text-[#4E4744]">
      {/* Upload Vocabulary Box */}
      <div className="card-gradient-mock p-6 md:p-8 rounded-[30px] border border-[#FBF1EF]/80 shadow-md shadow-[#9E948A]/5 space-y-6">
        <div>
          <h2 className="font-sans font-medium text-lg text-[#2C2725] flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#DF9B92]" />
            高级生词本批量导入 & 文档提取
          </h2>
          <p className="text-xs text-[#9E948A] mt-1 leading-relaxed">
            完美融合桌面文档导入！拖入包含单词的 TXT/Markdown 文件，或直接复制粘贴一段教材短文、韩剧台词。AI 将在后台自动通读，把生词全部过滤整理出来，一键加入你的单词口袋。
          </p>
        </div>

        {/* File Dropzone & Paste Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* File input drag and drop */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-[#E3B373] bg-[#FAF2E6]/60 animate-pulse"
                : "border-[#FAF2E6] hover:border-[#E3B373] bg-[#FAF2E6]/30 hover:bg-white"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-[#FAF2E6] text-[#E3B373] flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#5A5550]">拖拽或点击上传本地词库文档</p>
            <p className="text-[10px] text-[#9E948A] mt-1 max-w-[200px]">
              支持 TXT、MD、CSV、PDF、Word (.docx) 文件，直接拖入自动解析提词！
            </p>
          </div>

          {/* Paste Clipboard Box */}
          <div className="flex flex-col gap-2">
            <textarea
              placeholder="在这里直接粘贴韩语课文，或者您在别处收集的生词清单（例如: 학교, 사과, 맛있다）..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              disabled={uploadLoading}
              rows={4}
              className="w-full p-3 bg-[#F6F3EC] hover:bg-[#FAF2E6] border border-transparent focus:border-[#DF9B92]/30 focus:bg-white rounded-xl text-xs placeholder-[#9E948A] outline-none resize-none transition-all text-[#4E4744]"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={uploadLoading || !pasteText.trim()}
              className="py-2.5 px-5 bg-[#DF9B92] hover:bg-[#d08b82] disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Clipboard className="w-3.5 h-3.5" />
              AI 智能提取粘贴板词库
            </button>
          </div>
        </div>

        {/* Target Folder Config Selector */}
        <div className="bg-[#FAF2E6]/10 p-4 rounded-xl border border-[#FAF2E6] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 rounded-md bg-[#FAF2E6] text-[10px] font-semibold text-[#E3B373] tracking-wide">
                📁 归档配置
              </span>
              <span className="text-xs font-semibold text-[#5A5550]">
                选择以上导入生词的目标归档文件夹：
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={importFolderId}
                onChange={(e) => setImportFolderId(e.target.value)}
                className="py-1.5 px-3 bg-white text-xs border border-[#FAF2E6] rounded-lg outline-none cursor-pointer focus:border-[#E3B373]/40 text-[#4E4744] font-semibold"
              >
                <option value="">📁 不归档 (放进外侧零散词库)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
                <option value="new">➕ 新建专属文件夹并导入...</option>
              </select>

              {importFolderId === "new" && (
                <input
                  type="text"
                  placeholder="新文件夹名字..."
                  value={newImportFolderName}
                  onChange={(e) => setNewImportFolderName(e.target.value)}
                  className="py-1.5 px-3 bg-white border border-[#E3B373]/50 rounded-lg text-xs outline-none w-40 text-[#4E4744]"
                />
              )}
            </div>
          </div>
        </div>

        {/* Loading overlay for parser */}
        {uploadLoading && (
          <div className="p-8 border border-[#FAFAF4] bg-[#FAF2E6]/40 rounded-xl flex flex-col items-center justify-center space-y-2 text-center animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin text-[#DF9B92]" />
            <p className="text-xs font-display font-medium text-[#5A5550]">
              AI 正在深入透析词库中，大约需要 5 - 10 秒...
            </p>
            <p className="text-[11px] text-[#9E948A]">正在生成词性释义，分析最佳搭配例句等</p>
          </div>
        )}

        {/* Errors & Success */}
        {uploadError && (
          <div className="p-3.5 bg-[#FBF1EF] border border-[#FBF1EF] rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#F24E4E] mt-0.5 shrink-0" />
            <span className="text-xs text-red-700 leading-relaxed">{uploadError}</span>
          </div>
        )}

        {uploadSuccessMessage && !uploadLoading && (
          <div className="p-3.5 bg-[#EFF8EF] border border-[#D5EED5] rounded-xl flex items-start gap-2.5">
            <Check className="w-4 h-4 text-[#DF9B92] mt-0.5 shrink-0" />
            <span className="text-xs text-green-800 font-medium leading-relaxed">
              {uploadSuccessMessage}
            </span>
          </div>
        )}

        {/* Suggestion List confirmed draft */}
        {parsedSuggestions.length > 0 && (
          <div className="border border-[#FAFAF4] rounded-xl p-4 bg-[#FAF2E6]/60 space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-[#FAF2E6]">
              <span className="text-xs font-semibold text-[#5A5550] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#E3B373] animate-pulse" />
                提取完成：生词草稿清单
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setParsedSuggestions([])}
                  className="text-[11px] px-3 py-1 rounded-full border border-[#FAF2E6] bg-white text-[#9E948A] hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  放弃草稿
                </button>
                <button
                  onClick={handleImportAllSuggestions}
                  className="text-[11px] px-4 py-1 bg-[#DF9B92] hover:bg-[#d08b82] text-white rounded-full font-semibold hover:brightness-95 transition-all cursor-pointer shadow-xs"
                >
                  一键导入单词本
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {parsedSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-[#FAFAF4] hover:border-[#E3B373] rounded-xl flex items-start justify-between gap-2 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-[#4E4744] font-sans">
                        {s.word}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#FBF1EF] text-[#DF9B92] rounded font-medium">
                        {s.pos}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5550] font-medium">释义: {s.definition}</p>
                    <p className="text-[10px] text-[#9E948A] font-mono italic">
                      发音: {s.pronunciation}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveSuggestion(idx)}
                    className="p-1 text-gray-350 hover:text-[#F24E4E] rounded transition-colors"
                    title="忽略"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing Vocabulary Notebook Grid */}
      <div className="card-gradient-mock p-6 md:p-8 rounded-[30px] border border-[#FBF1EF]/80 shadow-md shadow-[#9E948A]/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-sans font-medium text-lg text-[#2C2725] flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-[#DF9B92]" />
              生词本 Notebook ({words.length} 词)
            </h2>
            <p className="text-xs text-[#9E948A] mt-1 leading-relaxed">
              您的专属韩语笔记本。支持自定义文件夹归档整理。勾选左上角复选框，即可进入 AI 文章高精度阅读学习！
            </p>
          </div>

          {/* Redirection button if words are selected */}
          {selectedWordIds.length > 0 && (
            <button
              onClick={onGoToReading}
              className="py-1.5 px-4 bg-[#FBF1EF] text-[#DF9B92] font-semibold text-xs border border-[#FACAC6] hover:bg-[#FBF1EF]/82 rounded-full shadow-md flex items-center justify-center gap-1 animate-bounce cursor-pointer"
            >
              生成以选生词构成的文章 ({selectedWordIds.length} 词)
              <Plus className="w-3.5 h-3.5 rotate-45 text-[#DF9B92]" />
            </button>
          )}
        </div>

        {/* folders layout block */}
        <div className="bg-[#FAF2E6]/25 p-4 rounded-xl border border-[#FAF2E6]/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FAF2E6]/60 pb-2">
            <span className="text-xs font-bold text-[#5A5550] flex items-center gap-1.5 font-sans">
              <FolderOpen className="w-4 h-4 text-[#E3B373]" />
              📁 我的文件夹归类与整理
            </span>
            <div className="flex items-center gap-2">
              {!isCreatingFolder ? (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="py-1 px-2.5 rounded-lg border border-[#FAF2E6] hover:border-[#E3B373]/30 bg-white text-[10px] font-semibold text-[#DF9B92] flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3" />
                  新建文件夹 / 分类
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="输入文件夹名..."
                    value={folderInputName}
                    onChange={(e) => setFolderInputName(e.target.value)}
                    className="py-1 px-2 bg-white border border-[#E3B373]/60 rounded-md text-[10px] outline-none text-[#4E4744] w-28 focus:border-[#DF9B92]"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (folderInputName.trim()) {
                        onCreateFolder(folderInputName);
                        setFolderInputName("");
                        setIsCreatingFolder(false);
                      }
                    }}
                    className="py-1 px-2.5 bg-[#DFDFD5] hover:bg-[#c8c8bd] text-neutral-800 rounded-md text-[10px] font-bold cursor-pointer"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setFolderInputName("");
                      setIsCreatingFolder(false);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded bg-white border border-gray-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Folder tab: All */}
            <button
              onClick={() => setFilterFolderId("all")}
              className={`p-3 py-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                filterFolderId === "all"
                  ? "bg-white border-[#E3B373] shadow-xs text-[#E3B373] font-bold"
                  : "bg-white/80 border-[#FAF2E6] hover:border-[#E3B373]/30 text-[#9E948A]"
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <div className="leading-tight">
                <p className="text-[11px] font-semibold">📁 全部生词</p>
                <p className="text-[9px] text-gray-400 mt-0.5 font-medium">{words.length} 个词</p>
              </div>
            </button>

            {/* Folder tab: Uncategorized */}
            <button
              onClick={() => setFilterFolderId("uncategorized")}
              className={`p-3 py-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                filterFolderId === "uncategorized"
                  ? "bg-white border-[#E3B373] shadow-xs text-[#E3B373] font-bold"
                  : "bg-white/80 border-[#FAF2E6] hover:border-[#E3B373]/30 text-[#9E948A]"
              }`}
            >
              <Folder className="w-3.5 h-3.5 opacity-70" />
              <div className="leading-tight">
                <p className="text-[11px] font-semibold">📂 外侧零碎生词</p>
                <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                  {words.filter((w) => !w.folderId).length} 个词
                </p>
              </div>
            </button>

            {/* User Custom Folders list */}
            {folders.map((folder) => {
              const count = words.filter((w) => w.folderId === folder.id).length;
              const isActive = filterFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  onClick={() => setFilterFolderId(folder.id)}
                  className={`p-3 py-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 group relative ${
                    isActive
                      ? "bg-white border-[#DF9B92] shadow-xs text-[#DF9B92] font-bold"
                      : "bg-white/80 border-[#FAF2E6] hover:border-[#DF9B92]/35 text-[#4E4744]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-left leading-tight">
                    <FolderOpen className={`w-3.5 h-3.5 ${isActive ? "text-[#DF9B92]" : "text-[#E3B373]"}`} />
                    <div>
                      <p className="text-[11px] max-w-[80px] font-semibold truncate">{folder.name}</p>
                      <p className="text-[9px] text-[#9E948A] mt-0.5 font-medium">{count} 个词</p>
                    </div>
                  </div>

                  {/* Delete folder trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要解散文件夹「${folder.name}」吗？\n文件夹中的生词仍会保留在生词集中。`)) {
                        onDeleteFolder(folder.id, false);
                        if (filterFolderId === folder.id) {
                          setFilterFolderId("all");
                        }
                      }
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                    title="仅解散文件夹（保留单词）"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toolbar Filter & Quick Selection */}
        {words.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border-t border-b border-[#FAF2E6] py-4">
            <div className="flex flex-wrap gap-x-3 gap-y-2 items-center">
              <div className="flex gap-2">
                <button
                  onClick={onSelectAllWords}
                  className="text-[11px] font-semibold text-[#DF9B92] hover:underline cursor-pointer"
                >
                  全选范围
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={onDeselectAllWords}
                  className="text-[11px] font-semibold text-[#9E948A] hover:underline cursor-pointer"
                >
                  取消已选
                </button>
              </div>

              {/* Bulk Folder Archiver Dropdown inside selected toolbar block */}
              {selectedWordIds.length > 0 && (
                <div className="bg-[#FAF2E6]/50 p-1 px-2.5 rounded-lg border border-[#E3B373]/20 flex items-center gap-1.5 animate-in fade-in duration-200">
                  <span className="text-[10px] font-bold text-[#E3B373] flex items-center gap-0.5 whitespace-nowrap">
                    🎯 已选 {selectedWordIds.length} 词：
                  </span>
                  
                  <select
                    value={moveTargetFolderId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoveTargetFolderId(val);
                      if (val && val !== "new_move") {
                        onMoveWordsToFolder(selectedWordIds, val === "uncategorized" ? undefined : val || undefined);
                        onDeselectAllWords();
                        setMoveTargetFolderId("");
                      }
                    }}
                    className="p-1 px-2 bg-white border border-[#E3B373]/20 hover:border-[#E3B373]/45 rounded-md text-[10px] outline-none text-[#4E4744] font-medium cursor-pointer"
                  >
                    <option value="">📁 归档到文件夹...</option>
                    <option value="uncategorized">📂 移动到「未分类零碎自留地」</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                    <option value="new_move">➕ 新建文件夹并全归档...</option>
                  </select>

                  {moveTargetFolderId === "new_move" && (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="新分类名字..."
                        value={newMoveFolderName}
                        onChange={(e) => setNewMoveFolderName(e.target.value)}
                        className="py-0.5 px-2 bg-white border border-[#E3B373]/50 rounded text-[9px] outline-none text-[#4E4744] w-24"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (newMoveFolderName.trim()) {
                            const created = onCreateFolder(newMoveFolderName);
                            onMoveWordsToFolder(selectedWordIds, created.id);
                            onDeselectAllWords();
                            setNewMoveFolderName("");
                            setMoveTargetFolderId("");
                          }
                        }}
                        className="py-0.5 px-2 bg-[#DF9B92] hover:bg-[#d08b82] text-white rounded text-[9px] font-bold cursor-pointer"
                      >
                        移动
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="搜索已存生词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-1.5 px-3 bg-[#F6F3EC] hover:bg-white border border-transparent focus:border-[#E3B373]/40 rounded-lg text-xs placeholder-[#9E948A] outline-none w-full md:w-44 text-[#4E4744]"
              />

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="py-1.5 px-2 bg-[#F6F3EC] text-xs border border-transparent rounded-lg outline-none cursor-pointer focus:border-[#E3B373]/40 text-[#4E4744]"
              >
                <option value="all">所有难度等级</option>
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                     {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Word Grid */}
        {words.length === 0 ? (
          <div className="py-12 text-center text-[#9E948A] space-y-3">
            <div className="w-12 h-12 bg-[#F6F3EC] rounded-full flex items-center justify-center text-[#9E948A] mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-xs">
              笔记本空空如也。请先通过上面的 **“AI查词”** 或者 **“生词批量导入”** 保存您的韩语单词。
            </p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="p-8 text-center text-[#9E948A] text-xs">没有匹配到相关的单词。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWords.map((w) => {
              const checked = selectedWordIds.includes(w.id);
              return (
                <div
                  key={w.id}
                  onClick={() => onToggleWordSelection(w.id)}
                  className={`p-4 rounded-xl border relative transition-all group flex flex-col justify-between cursor-pointer ${
                    checked
                      ? "bg-white border-[#E3B373] shadow-md shadow-[#9E948A]/10 ring-1 ring-[#E3B373]/10"
                      : "bg-[#FAFAF4]/40 border-[#FAF2E6] hover:border-[#E3B373]/50 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}} // Blocked; full card click is registered
                          className="w-3.5 h-3.5 accent-[#DF9B92] cursor-pointer rounded"
                        />
                        <span className="font-display font-semibold text-[#5A5550] text-base font-sans">
                          {w.word}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#FBF1EF] text-[#DF9B92] rounded font-medium">
                          {w.pos}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWord(w.id);
                          }}
                          className="p-1 text-gray-300 hover:text-[#F24E4E] rounded transition-colors duration-150"
                          title="删除单词"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#E3B373] font-semibold tracking-wide font-mono mt-0.5">
                      发音: {w.pronunciation}
                    </p>

                    {/* Definition */}
                    <p className="text-xs text-[#4E4744] font-medium leading-relaxed pt-1.5 border-t border-[#FAF2E6]">
                      释义: {w.definition}
                    </p>

                    {/* Example Container */}
                    <div className="bg-[#FAF9F5]/70 p-2.5 rounded-lg border border-[#FAF2E6] text-[11px] leading-relaxed mt-2 group-hover:bg-white transition-colors">
                      <p className="text-[#4E4744] font-semibold mb-0.5 font-mono">
                        {w.exampleKorean}
                      </p>
                      <p className="text-[#9E948A] font-normal">{w.exampleTranslation}</p>
                    </div>
                  </div>

                  <div 
                    className="mt-3 pt-2 border-t border-[#FAF2E6]/60 flex justify-between items-center text-[9px] text-[#9E948A] font-mono gap-1"
                    onClick={(e) => e.stopPropagation()} // Stop checkbox state bubbling on card
                  >
                    <div className="flex items-center gap-1 flex-wrap">
                      <span>{w.level || "常规"}</span>
                      <span className="text-gray-200">|</span>
                      <select
                        value={w.folderId || ""}
                        onChange={(e) => {
                          onMoveWordsToFolder([w.id], e.target.value || undefined);
                        }}
                        className="py-0.5 px-1 bg-[#FAF2E6]/50 hover:bg-[#FAF2E6] text-[9px] text-[#9E948A] border-0 rounded font-sans outline-none cursor-pointer max-w-[85px] truncate font-medium"
                      >
                        <option value="">📂 未归档</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span>已存: {new Date(w.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
