import { useState, useEffect } from "react";
import { BookMarked, BookOpen, GraduationCap, Search, Sparkles } from "lucide-react";
import { Word, SavedPractice, Folder } from "./types";
import DictionarySection from "./components/DictionarySection";
import NotebookSection from "./components/NotebookSection";
import ReadingSection from "./components/ReadingSection";
import WordLookupModal from "./components/WordLookupModal";
import { ConfusedBlobMascot } from "./components/Mascots";


const INITIAL_WORDS: Word[] = [
  {
    id: "init-1",
    word: "공부하다",
    pos: "动词",
    pronunciation: "[공부하다 / gongbuhada]",
    definition: "学习、研究（指努力掌握知识书本内容或技巧的动作）。",
    exampleKorean: "오늘 저녁에 도서관에서 친구와 한국어를 공부합니다.",
    exampleTranslation: "今天晚上在图书馆和朋友学习韩语。",
    level: "初级",
    addedAt: new Date().toISOString(),
  },
  {
    id: "init-2",
    word: "학교",
    pos: "名词",
    pronunciation: "[학꾜 / hakgyo]",
    definition: "学校（进行教育教育研究的学术机构）。",
    exampleKorean: "저는 매일 아침 여덟 시에 학교에 갑니다.",
    exampleTranslation: "我每天早上八点钟去学校。",
    level: "初级",
    addedAt: new Date().toISOString(),
  },
  {
    id: "init-3",
    word: "친구",
    pos: "名词",
    pronunciation: "[친구 / chin-gu]",
    definition: "朋友、同伴、伙伴（年龄相仿或志趣相投的人）。",
    exampleKorean: "진우는 저의 가장 가깝고 소중한 친구입니다.",
    exampleTranslation: "真宇是我最亲密和珍贵的朋友。",
    level: "初级",
    addedAt: new Date().toISOString(),
  },
  {
    id: "init-4",
    word: "맛있다",
    pos: "形容词",
    pronunciation: "[마딛따 / mas-itda]",
    definition: "美味的、好吃的、有滋味的。",
    exampleKorean: "이 김치찌개는 정말 맛있고 매콤합니다.",
    exampleTranslation: "这道泡菜汤真的非常好吃且辣感十足。",
    level: "初级",
    addedAt: new Date().toISOString(),
  },
  {
    id: "init-5",
    word: "인연",
    pos: "名词",
    pronunciation: "[이년 / in-yeon]",
    definition: "因缘、姻缘、人与人之间奇妙的连结关系。",
    exampleKorean: "우리가 여기에 만난 것은 특별한 인연입니다.",
    exampleTranslation: "我们在这里相遇是一种特别的缘分。",
    level: "中级",
    addedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [savedPractices, setSavedPractices] = useState<SavedPractice[]>([]);
  const [activeTab, setActiveTab] = useState<"dictionary" | "notebook" | "reading">("dictionary");

  // Floating Instant Lookup modal state
  const [lookupWord, setLookupWord] = useState<string>("");
  const [lookupContext, setLookupContext] = useState<string>("");
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Load words, folders & practice archives from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("korean_notebook_words");
    if (saved) {
      try {
        setWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse standard local storage vocabulary.", e);
        setWords(INITIAL_WORDS);
      }
    } else {
      setWords(INITIAL_WORDS);
      localStorage.setItem("korean_notebook_words", JSON.stringify(INITIAL_WORDS));
    }

    const savedFolders = localStorage.getItem("korean_notebook_folders");
    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {
        console.error("Failed to parse folders", e);
      }
    }

    const savedArc = localStorage.getItem("korean_practice_archive");
    if (savedArc) {
      try {
        setSavedPractices(JSON.parse(savedArc));
      } catch (e) {
        console.error("Failed to parse practice archives", e);
      }
    }
  }, []);

  const handleSavePractice = (newPractice: SavedPractice) => {
    const updated = [newPractice, ...savedPractices];
    setSavedPractices(updated);
    localStorage.setItem("korean_practice_archive", JSON.stringify(updated));
  };

  const handleDeletePractice = (id: string) => {
    const updated = savedPractices.filter((p) => p.id !== id);
    setSavedPractices(updated);
    localStorage.setItem("korean_practice_archive", JSON.stringify(updated));
  };

  // Save words to localStorage helper
  const saveWords = (updatedWords: Word[]) => {
    setWords(updatedWords);
    localStorage.setItem("korean_notebook_words", JSON.stringify(updatedWords));
  };

  // Folder helper methods
  const handleCreateFolder = (name: string): Folder => {
    const trimmed = name.trim();
    const newFolder: Folder = {
      id: "folder-" + Math.random().toString(36).substr(2, 9),
      name: trimmed,
      addedAt: new Date().toISOString(),
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem("korean_notebook_folders", JSON.stringify(updated));
    return newFolder;
  };

  const handleDeleteFolder = (id: string, deleteWords = false) => {
    const updatedFolders = folders.filter((f) => f.id !== id);
    setFolders(updatedFolders);
    localStorage.setItem("korean_notebook_folders", JSON.stringify(updatedFolders));

    if (deleteWords) {
      // delete all words mapped to this folder
      const updatedWords = words.filter((w) => w.folderId !== id);
      saveWords(updatedWords);
      // remove from selected ids
      const deletedIds = words.filter((w) => w.folderId === id).map((w) => w.id);
      setSelectedWordIds((prev) => prev.filter((prevId) => !deletedIds.includes(prevId)));
    } else {
      // dissolve folder configuration, keeping the words uncategorized
      const updatedWords = words.map((w) =>
        w.folderId === id ? { ...w, folderId: undefined } : w
      );
      saveWords(updatedWords);
    }
  };

  const handleMoveWordsToFolder = (wordIds: string[], folderId: string | undefined) => {
    const updatedWords = words.map((w) =>
      wordIds.includes(w.id) ? { ...w, folderId } : w
    );
    saveWords(updatedWords);
  };

  // Add a single word safely
  const handleAddWord = (wordData: Omit<Word, "id" | "addedAt">, folderId?: string) => {
    const exists = words.find(
      (w) => w.word.toLowerCase().trim() === wordData.word.toLowerCase().trim()
    );
    if (exists) {
      if (folderId && exists.folderId !== folderId) {
        const updated = words.map((w) =>
          w.id === exists.id ? { ...w, folderId } : w
        );
        saveWords(updated);
      }
      return;
    }

    const newWord: Word = {
      ...wordData,
      id: "word-" + Math.random().toString(36).substr(2, 9),
      addedAt: new Date().toISOString(),
      folderId,
    };

    saveWords([newWord, ...words]);
  };

  // Bulk add imported words
  const handleBulkAddWords = (newWords: Omit<Word, "id" | "addedAt">[], folderId?: string) => {
    const addedList: Word[] = [];

    newWords.forEach((item) => {
      const exists = words.find(
        (w) => w.word.toLowerCase().trim() === item.word.toLowerCase().trim()
      );
      if (!exists) {
        addedList.push({
          ...item,
          id: "bulk-" + Math.random().toString(36).substr(2, 9),
          addedAt: new Date().toISOString(),
          folderId,
        });
      } else {
        if (folderId && exists.folderId !== folderId) {
          exists.folderId = folderId; // Assign folder to existing if bulk-added to folder
        }
      }
    });

    if (addedList.length > 0) {
      saveWords([...addedList, ...words]);
    } else {
      saveWords([...words]);
    }
  };

  // Delete a word
  const handleDeleteWord = (id: string) => {
    const updated = words.filter((w) => w.id !== id);
    saveWords(updated);

    // Also remove from selected words if it was chosen
    setSelectedWordIds((prev) => prev.filter((prevId) => prevId !== id));
  };

  // Selected words coordinators
  const handleToggleWordSelection = (id: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  const handleSelectAllWords = () => {
    const allIds = words.map((w) => w.id);
    setSelectedWordIds(allIds);
  };

  const handleDeselectAllWords = () => {
    setSelectedWordIds([]);
  };

  // Floating word lookup modal triggering API
  const triggerInstantLookup = (word: string, contextString?: string) => {
    setLookupWord(word);
    setLookupContext(contextString || "");
    setIsLookupOpen(true);
  };

  const selectedWordsList = words.filter((w) => selectedWordIds.includes(w.id));

  return (
    <div className="min-h-screen bg-cream selection:bg-[#E3B373]/20 text-[#4E4744]">
      {/* Container wrapper */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8">
        
        {/* Simple visual design Header with zero margin clutter */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-[#FAF2E6]">
          <div className="flex items-center gap-3">
            <ConfusedBlobMascot className="w-14 h-14 shrink-0" />
            <div>
              <h1 className="font-sans font-bold text-[#2C2725] text-lg md:text-xl tracking-tight leading-tight">
                한국어, 같이 배워요!
              </h1>
              <p className="text-[10px] text-[#9E948A] font-semibold mt-0.5 tracking-wider uppercase">
                Annyeong Korean Study Studio
              </p>
            </div>
          </div>

          {/* Minimal low-saturation Tab Switcher */}
          <nav className="flex bg-[#FAF2E6]/50 p-1.5 rounded-full border border-[#FAF2E6]/80 shadow-inner">
            <button
              onClick={() => setActiveTab("dictionary")}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "dictionary"
                  ? "bg-white text-[#DF9B92] shadow-sm border border-[#FDF1EE]"
                  : "text-[#9E948A] hover:text-[#DF9B92]"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-current" />
              AI 词典查询
            </button>
            <button
              onClick={() => setActiveTab("notebook")}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "notebook"
                  ? "bg-white text-[#E3B373] shadow-sm border border-[#FAF2E6]"
                  : "text-[#9E948A] hover:text-[#E3B373]"
              }`}
            >
              <BookMarked className="w-3.5 h-3.5 text-current" />
              My Notebook ({words.length})
            </button>
            <button
              onClick={() => setActiveTab("reading")}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "reading"
                  ? "bg-white text-[#DF9B92] shadow-sm border border-[#FDF1EE]"
                  : "text-[#9E948A] hover:text-[#DF9B92]"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-current" />
              精读阅读题库
              {selectedWordIds.length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[#E3B373] text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
                  {selectedWordIds.length}
                </span>
              )}
            </button>
          </nav>
        </header>

        {/* Core Content Switching Frame */}
        <main className="min-h-[400px]">
          {activeTab === "dictionary" && (
            <div className="animate-in fade-in duration-200">
              <DictionarySection onAddWord={handleAddWord} existingWords={words} />
            </div>
          )}

          {activeTab === "notebook" && (
            <div className="animate-in fade-in duration-200">
              <NotebookSection
                words={words}
                folders={folders}
                selectedWordIds={selectedWordIds}
                onToggleWordSelection={handleToggleWordSelection}
                onSelectAllWords={handleSelectAllWords}
                onDeselectAllWords={handleDeselectAllWords}
                onDeleteWord={handleDeleteWord}
                onAddParsedWords={handleBulkAddWords}
                onGoToReading={() => setActiveTab("reading")}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onMoveWordsToFolder={handleMoveWordsToFolder}
              />
            </div>
          )}

          {activeTab === "reading" && (
            <div className="animate-in fade-in duration-200">
              <ReadingSection
                selectedWords={selectedWordsList}
                existingWords={words}
                savedPractices={savedPractices}
                onSavePractice={handleSavePractice}
                onDeletePractice={handleDeletePractice}
                onAddWord={handleAddWord}
                onOpenLookupModal={(w) => triggerInstantLookup(w)}
              />
            </div>
          )}
        </main>

        {/* Aesthetic footer */}
        <footer className="pt-8 border-t border-[#EBEADF] text-center text-[11px] text-gray-400 space-y-1">
          <p>© 2026 Korean Learning Notebook. 奶风低饱和韩系语感工坊.</p>
          <div className="flex justify-center gap-3">
            <span>已保存词库 {words.length} 词</span>
            <span>已勾选练习 {selectedWordIds.length} 词</span>
          </div>
        </footer>

        {/* Global Instant Lookup Modal triggered anywhere inside the application (especially reading section) */}
        <WordLookupModal
          wordToLookup={lookupWord}
          context={lookupContext}
          isOpen={isLookupOpen}
          onClose={() => {
            setIsLookupOpen(false);
            setLookupWord("");
          }}
          onAddWord={handleAddWord}
          existingWords={words}
        />
      </div>
    </div>
  );
}
