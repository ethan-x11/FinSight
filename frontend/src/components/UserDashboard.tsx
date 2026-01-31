import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Bot,
  Send,
  BarChart3,
  PieChart,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  X,
  Layout,
  Plus,
  History,
  Database,
  Cloud,
  Save,
  Menu,
  Shield,
  RefreshCcw,
  LogOut,
  User,
  Lock,
  Inbox,
  FileSearch,
  Pencil,
  Check,
  Trash2,
  Search,
} from "lucide-react";
import {
  askChatQuestion,
  fetchInsights,
  fetchSession,
  fetchSessionStatus,
  fetchSessions,
  type AnalysisOutput,
  type AnalysisSession,
  type ApiUser,
  type SourceDocument,
  type ChatMessage,
  type KeyInsight,
  type RiskFactor,
  uploadDocuments,
  updateSession,
  deleteSession,
} from "../utils/dataHandlerAPI";
import { marked } from "marked";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ProfileDialog } from "./ProfileDialog";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { APP_BRAND_NAME, APP_TAGLINE } from "../config/appConfig";

type DashboardTab = "dashboard" | "chat";

type UserDashboardProps = {
  user: ApiUser;
  onLogout: () => void;
  onGoHome: () => void;
};

type SimpleMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: (string | undefined)[];
};

marked.setOptions({ breaks: true });

const WELCOME_MESSAGES: string[] = [
  "Hi there! Ask me anything about your uploaded documents.",
  "Ready to dig in. What would you like to know about this session?",
  "Hello! I can summarize, compare, or extract details from your files—what should we explore first?",
  "I'm synced with your documents. Ask a question, or request a summary to get started.",
];

const STATUS_STEPS: { key: keyof AnalysisSession["systemStatus"]["steps"]; label: string }[] = [
  { key: "docIntelligenceTriggered", label: "Document Intelligence" },
  { key: "dataExtracted", label: "Data Extracted" },
  { key: "chunksGenerated", label: "Chunks Generated" },
  { key: "embeddingsGenerated", label: "Embeddings" },
  { key: "searchIndexed", label: "Search Indexed" },
];

const getDocumentId = (doc: SourceDocument, idx: number) => doc.fileName || doc.blobPath || doc.blobUrl || doc.blobContainer || `doc-${idx}`;

const Sidebar = ({
  sessions,
  currentSessionId,
  onSwitchSession,
  onNewSession,
  activeTab,
  setActiveTab,
  canChat,
  isOpen,
  onClose,
}: {
  sessions: AnalysisSession[];
  currentSessionId: string | null;
  onSwitchSession: (id: string) => void;
  onNewSession: () => void;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  canChat: boolean;
  isOpen: boolean;
  onClose: () => void;
}) => (
  <>
    {isOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" onClick={onClose} />}
    <div
      className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-full md:flex-shrink-0
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
    `}
    >
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">{APP_BRAND_NAME}</span>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={() => {
            onNewSession();
            onClose();
          }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>

      <div className="px-4 space-y-1 pb-4">
        <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Session</p>
        <button
          onClick={() => {
            setActiveTab("dashboard");
            onClose();
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeTab === "dashboard" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
        >
          <Layout className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => {
            if (!canChat) {
              toast.info("Processing not finished. Check status before using chat.");
              return;
            }
            setActiveTab("chat");
            onClose();
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeTab === "chat" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"} ${!canChat ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <Bot className="w-4 h-4" />
          <span>RAG Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 border-t border-slate-800/50 pt-4">
        <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
          <History className="w-3 h-3 mr-1.5" /> History
        </p>
        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                onSwitchSession(session.id);
                onClose();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group border ${currentSessionId === session.id
                ? "bg-slate-800 border-slate-700 text-white shadow-sm"
                : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                }`}
            >
              <div className="font-medium text-sm truncate">{session.metadata?.title || "Untitled session"}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                <span>{session.metadata?.createdAt ? new Date(session.metadata.createdAt).toLocaleString() : ""}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Database className="w-3 h-3 text-purple-400" />
              <span>Cosmos DB</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-500">Synced</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Cloud className="w-3 h-3 text-blue-400" />
              <span>Blob Storage</span>
            </div>
            <span className="text-green-500">Active</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Search className="w-3 h-3 text-blue-400" />
              <span>Azure AI Search</span>
            </div>
            <span className="text-green-500">Active</span>
          </div>
        </div>
      </div>
    </div>
  </>
);

const DocumentUploader = ({ onUpload }: { onUpload: (files: FileList) => Promise<void> }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const steps = [
    "Uploading to Azure Blob Storage...",
    "Creating Session Entry in Cosmos DB...",
    "Triggering Azure Document Intelligence...",
    "Extracting Layouts & Tables...",
    "Generating Embeddings...",
    "Indexing for Search...",
  ];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessingStep(0);
    let step = 0;
    const interval = setInterval(() => {
      setProcessingStep(step);
      step += 1;
      if (step >= steps.length) {
        clearInterval(interval);
      }
    }, 800);

    try {
      await onUpload(files);
      toast.success("Upload started. We will refresh the session list.");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl transition-all cursor-pointer m-4 p-6 text-center ${isDragging ? "border-blue-500 bg-blue-50 scale-[0.99]" : "border-slate-300 hover:border-slate-400 bg-slate-50"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".pdf,.doc,.docx";
        input.onchange = () => handleFiles(input.files);
        input.click();
      }}
    >
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Upload className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">New Analysis Session</h3>
      <p className="text-slate-500 mb-6 text-center max-w-md text-sm md:text-base">
        Upload financial documents (PDF, DOCX) to start.
        Files are securely stored in Azure Blob Storage.
      </p>
      {isProcessing ? (
        <div className="w-full max-w-md space-y-3">
          {steps.map((text, idx) => (
            <div
              key={text}
              className={`flex items-center space-x-3 transition-all duration-300 ${idx === processingStep ? "opacity-100 scale-105" : idx < processingStep ? "opacity-70" : "opacity-30"
                }`}
            >
              {idx < processingStep ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : idx === processingStep ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
              )}
              <span className={`text-sm font-medium truncate ${idx === processingStep ? "text-blue-600" : "text-slate-600"}`}>{text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400 font-medium">
          <span className="px-2 py-1 bg-white border border-slate-200 rounded">Encrypted</span>
          <span className="px-2 py-1 bg-white border border-slate-200 rounded">Auto-Save</span>
        </div>
      )}
    </div>
  );
};

const DocumentList = ({
  documents,
  activeDocId,
  onSelect,
}: {
  documents: { id: string; name: string; type?: string; path?: string }[];
  activeDocId: string | null;
  onSelect: (id: string) => void;
}) => (
  <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full overflow-hidden shrink-0">
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
      <div>
        <div className="flex flex-row items-center gap-2 mb-0.5">
          <Inbox className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-1">Documents</h3>
        </div>
        <p className="text-[10px] text-slate-500">Blob Storage Container</p>
      </div>
      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{documents.length}</span>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-48 md:max-h-full">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={`w-full text-left p-3 rounded-lg border transition-all group ${activeDocId === doc.id ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
            }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`p-2 rounded-lg ${activeDocId === doc.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm"
                }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${activeDocId === doc.id ? "text-blue-900" : "text-slate-700"}`}>{doc.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.type || "Document"}</p>
              {doc.path && <p className="text-[10px] text-slate-400 truncate">{doc.path}</p>}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const SessionStatus = ({ session }: { session: AnalysisSession }) => {
  const percent = useMemo(() => {
    const completed = STATUS_STEPS.filter((step) => session.systemStatus?.steps?.[step.key]).length;
    return Math.round((completed / STATUS_STEPS.length) * 100);
  }, [session]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <FileSearch className="w-4 h-4 text-blue-600" />
          Pipeline status
        </div>
        <Badge variant="outline">{session.systemStatus?.overallStatus}</Badge>
      </div>
      <Progress value={percent} />
      <div className="space-y-2 text-xs text-slate-600">
        {STATUS_STEPS.map((step) => (
          <div key={step.key} className="flex items-center gap-2">
            {session.systemStatus?.steps?.[step.key] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 text-slate-300" />}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      {session.systemStatus?.errorMessage && (
        <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-100 rounded px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          {session.systemStatus.errorMessage}
        </div>
      )}
    </div>
  );
};

const InsightsPanel = ({ insights }: { insights: AnalysisOutput | null }) => {
  if (!insights) return <div className="text-sm text-slate-500">No insights available yet.</div>;

  const tables = insights.structuredTables || [];
  const risks = insights.identifiedRisks || [];
  const keyInsights = insights.keyInsights || [];

  return (
    <div className="space-y-6">
      {keyInsights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyInsights.map((item: KeyInsight) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-semibold">{item.category || "Insight"}</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{item.value}</p>
              {item.trend && <p className="text-xs text-slate-500">Trend: {item.trend}</p>}
              {typeof item.confidenceScore === "number" && (
                <div className="text-xs text-slate-500 mt-1">Confidence: {(item.confidenceScore * 100).toFixed(0)}%</div>
              )}
            </div>
          ))}
        </div>
      )}

      {risks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Risks
          </h3>
          <div className="space-y-3 text-sm">
            {risks.map((risk: RiskFactor, idx) => (
              <div key={`${risk.description}-${idx}`} className="flex items-start gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{risk.severity}</span>
                <div className="text-slate-700 flex-1">
                  <p>{risk.description}</p>
                  {typeof risk.sourcePage === "number" && (
                    <p className="text-[11px] text-slate-500">Source page: {risk.sourcePage + 1}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* {tables.length > 0 && (
        <div className="space-y-4">
          {tables.map((table) => (
            <div key={table.tableId} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{table.title}</p>
                  {table.layoutType && <p className="text-[11px] text-slate-500">Layout: {table.layoutType}</p>}
                </div>
                {typeof table.pageNumber === "number" && <Badge variant="outline">Pg {table.pageNumber + 1}</Badge>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {(table.rows || []).map((row, idx) => (
                      <tr key={idx} className="odd:bg-slate-50/50">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                            <span className="font-medium text-slate-600 mr-2">{key}:</span>
                            <span>{String(value)}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )} */}
    </div>
  );
};

const DocumentPreview = ({ document }: { document: SourceDocument | null }) => {
  if (!document) return <div className="text-sm text-slate-500">Select a document to preview.</div>;

  const url = document.blobUrl;
  if (!url) return <div className="text-sm text-slate-500">No blob URL available for this document.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{document.fileName || "Document"}</p>
          {document.fileType && <p className="text-xs text-slate-500">{document.fileType}</p>}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-blue-600 hover:text-blue-500"
        >
          Open in new tab
        </a>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <iframe
          src={url}
          title={`preview-${document.fileName || "document"}`}
          className="w-full min-h-[520px] no-scrollbar"
          scrolling="no"
        />
      </div>
    </div>
  );
};

const ChatInterface = ({
  messages,
  onSendMessage,
  isTyping,
}: {
  messages: SimpleMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const syncHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(200, Math.max(44, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-default bg-white/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">RAG Chat</p>
            <p className="text-sm text-slate-600">Ask grounded, document-backed questions for this session.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm">
            <Bot className="h-3.5 w-3.5" /> Context aware
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] md:max-w-[78%] px-4 py-3 rounded-2xl border shadow-sm transition-all ${isUser
                    ? "bg-blue-400 text-white border-blue-600 shadow-blue-200/60"
                    : "bg-white text-slate-800 border-default"}
                  ${isUser ? "rounded-tr-none" : "rounded-tl-none"}`}
                >
                  <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-semibold ${isUser ? "text-white/80" : "text-slate-500"}`}>
                    {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    <span>{isUser ? "You" : "Assistant"}</span>
                  </div>
                  {/* <div
                    className={`text-sm leading-relaxed mt-1 whitespace-pre-wrap [&>*]:mb-2 [&>*:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 ${isUser ? "text-white" : "text-slate-800"}`}
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text || "") }}
                  /> */}
                  <div
                  className={`text-sm leading-relaxed mt-1 [&>*]:mb-2 [&>*:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 ${isUser ? "text-white" : "text-slate-800"}`}
                  >
                  <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}
                    children={msg.text || ""}
                    components={{
                      code(props) {
                        const { children, className } = props
                        const match = /language-(\w+)/.exec(className || '')
                        return match ? (
                          <SyntaxHighlighter
                            PreTag="div"
                            language={match[1]}
                          // style={dark}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  />
                  </div>
                  {/* {msg.text || ""}</Markdown> */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.citations.map((src, i) => (
                        <span
                          key={`${src}-${i}`}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${isUser ? "bg-white/15 text-white border-white/30" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-default px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 md:p-5 bg-white/90 border-t border-default shadow-inner backdrop-blur-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              syncHeight();
            }}
            placeholder="Ask a question about this session"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            className="h-11 w-full resize-none rounded-md border border-default bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <Button onClick={handleSend} disabled={!input.trim()} className="h-11 px-4">
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function UserDashboard({ user, onLogout, onGoHome }: UserDashboardProps) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insights, setInsights] = useState<AnalysisOutput | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [refreshedInsightsSessions, setRefreshedInsightsSessions] = useState<Record<string, boolean>>({});
  const [dashboardView, setDashboardView] = useState<"overview" | "preview">("overview");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const sessionsRef = useRef<AnalysisSession[]>([]);
  const refreshedInsightsRef = useRef<Record<string, boolean>>({});

  const currentSession = useMemo(() => sessions.find((s) => s.id === currentSessionId) || null, [sessions, currentSessionId]);
  const canChat = currentSession?.systemStatus?.overallStatus === "completed";

  useEffect(() => {
    setTitleDraft(currentSession?.metadata?.title || "");
    setEditingTitle(false);
  }, [currentSession]);

  const documentEntries = useMemo(
    () =>
      (currentSession?.sourceDocument || []).map((doc, idx) => ({
        id: getDocumentId(doc, idx),
        name: doc.fileName || `Document ${idx + 1}`,
        type: doc.fileType || (doc as any).contentType || "Document",
        path: doc.blobPath || doc.blobUrl || doc.blobContainer,
      })),
    [currentSession]
  );

  const activeSourceDocument = useMemo(() => {
    if (!currentSession?.sourceDocument) return null;
    return currentSession.sourceDocument.find((doc, idx) => getDocumentId(doc, idx) === activeDocId) || null;
  }, [currentSession, activeDocId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    refreshedInsightsRef.current = refreshedInsightsSessions;
  }, [refreshedInsightsSessions]);

  useEffect(() => {
    const load = async () => {
      setLoadingSessions(true);
      try {
        const fetched = await fetchSessions(false);
        setSessions(fetched);
        if (fetched.length > 0) {
          setCurrentSessionId(fetched[0].id);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load sessions");
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadSessionDetails = async () => {
      if (!currentSessionId) return;
      setLoadingSession(true);
      try {
        const detail = await fetchSession(currentSessionId);
        setSessions((prev) => prev.map((s) => (s.id === detail.id ? detail : s)));
        const mapped = mapChat(detail.chatHistory || []);
        if (mapped.length === 0) {
          const welcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
          setMessages([{ id: `welcome-${detail.id}`, role: "assistant", text: welcome }]);
        } else {
          setMessages(mapped);
        }
        setInsights(detail.analysisOutput || null);
        setRefreshedInsightsSessions((prev) => ({ ...prev, [detail.id]: Boolean(detail.analysisOutput) }));
      } catch (err: any) {
        toast.error(err?.message || "Failed to load session");
      } finally {
        setLoadingSession(false);
      }
    };
    loadSessionDetails();
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSession) {
      setActiveDocId(null);
      setDashboardView("overview");
      return;
    }
    const firstDoc = currentSession.sourceDocument?.[0];
    setActiveDocId(firstDoc ? getDocumentId(firstDoc, 0) : null);
    setDashboardView("overview");
  }, [currentSession]);

  useEffect(() => {
    const syncStatus = async () => {
      if (!currentSessionId) return;
      setLoadingStatus(true);
      try {
        const status = await fetchSessionStatus(currentSessionId);
        setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? { ...s, systemStatus: status } : s)));
      } catch (err: any) {
        toast.error(err?.message || "Failed to load status");
      } finally {
        setLoadingStatus(false);
      }
    };
    syncStatus();
  }, [currentSessionId]);

  const updateStatusAndMaybeInsights = useMemo(
    () =>
      async () => {
        if (!currentSessionId) return;
        const current = sessionsRef.current.find((s) => s.id === currentSessionId);
        if (!current) return;
        const overall = current.systemStatus?.overallStatus;

        if (overall?.startsWith("processing")) {
          try {
            const status = await fetchSessionStatus(currentSessionId);
            setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? { ...s, systemStatus: status } : s)));
          } catch (err) {
            console.error("Auto status refresh failed", err);
          }
          return;
        }

        if (overall === "completed") {
          const alreadyRefreshed = refreshedInsightsRef.current[currentSessionId];
          if (!alreadyRefreshed) {
            try {
              const refreshed = await fetchInsights(currentSessionId);
              setInsights(refreshed || null);
              setRefreshedInsightsSessions((prev) => ({ ...prev, [currentSessionId]: true }));
            } catch (err) {
              console.error("Auto insights refresh failed", err);
            }
          }
        }
      },
    [currentSessionId]
  );

  useEffect(() => {
    if (!currentSessionId) return;
    if (activeTab !== "dashboard") return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await updateStatusAndMaybeInsights();
    };

    tick();
    const intervalId = setInterval(tick, 10000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeTab, currentSessionId, updateStatusAndMaybeInsights]);

  const mapChat = (chat: ChatMessage[]): SimpleMessage[] =>
    chat.map((c) => ({
      id: c.messageId,
      role: c.role === "assistant" ? "assistant" : "user",
      text: c.content,
      citations: c.citations?.map((s) => `${s.sourcefile}${s.page_range ? `, page- ${s.page_range}` : ""}${s.chunk_id ? `, ${s.chunk_id}` : ""}`) || [],
    }));

  const handleUpload = async (files: FileList) => {
    const asArray = Array.from(files);
    const resp = await uploadDocuments(asArray);
    const detail = await fetchSession(resp.sessionId);
    setSessions((prev) => [detail, ...prev]);
    setCurrentSessionId(detail.id);
    setActiveTab("dashboard");
  };

  const handleRefreshInsights = async () => {
    if (!currentSessionId) return;
    try {
      const refreshed = await fetchInsights(currentSessionId);
      setInsights(refreshed || null);
      toast.success("Insights refreshed");
      setRefreshedInsightsSessions((prev) => ({ ...prev, [currentSessionId]: true }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh insights");
    }
  };

  const handleCheckStatus = async () => {
    if (!currentSessionId) return;
    try {
      const status = await fetchSessionStatus(currentSessionId);
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? { ...s, systemStatus: status } : s)));
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh status");
    }
  };

  const handleDeleteSession = async () => {
    if (!currentSessionId) return;
    const confirmed = window.confirm("Delete this session and its blobs/index entries?");
    if (!confirmed) return;
    try {
      await deleteSession(currentSessionId);
      toast.success("Session deleted");

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== currentSessionId);
        const nextId = filtered[0]?.id || null;
        setCurrentSessionId(nextId);
        if (!nextId) {
          setMessages([]);
          setInsights(null);
        }
        return filtered;
      });

      setRefreshedInsightsSessions((prev) => {
        const copy = { ...prev };
        delete copy[currentSessionId];
        return copy;
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete session");
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!currentSessionId) return toast.error("Select a session first");
    const session = sessions.find((s) => s.id === currentSessionId);
    if (!session || session.systemStatus?.overallStatus !== "completed") {
      return toast.error("Session processing is not completed yet. Please wait for status to finish.");
    }
    const userMsg: SimpleMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    try {
      const resp = await askChatQuestion(currentSessionId, text);
      const botMsg: SimpleMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: resp.answer,
        citations: resp.citations?.map((s) => `${s.sourcefile}${s.page_range ? `, page- ${s.page_range}` : ""}${s.chunk_id ? `, ${s.chunk_id}` : ""}`) || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!currentSessionId) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await updateSession(currentSessionId, { metadata: { ...currentSession?.metadata, title: trimmed } as any });
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("Session title updated");
      setEditingTitle(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update title");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    }
    if (e.key === "Escape") {
      setTitleDraft(currentSession?.metadata?.title || "");
      setEditingTitle(false);
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={(id) => setCurrentSessionId(id)}
        onNewSession={() => setCurrentSessionId(null)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canChat={Boolean(canChat)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 text-slate-600 hover:bg-slate-100 rounded">
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden md:inline">Workspace</span>
            <ChevronRight className="w-4 h-4 hidden md:block" />
            <span className="text-slate-900 font-medium truncate max-w-[200px]">
              {currentSession?.metadata?.title || "New Session"}
            </span>
            {currentSession && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200 hidden md:flex items-center text-slate-500">
                <Save className="w-3 h-3 mr-1" /> Synced
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user.isAdmin && (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-700 border-amber-200 bg-amber-50">
                <Shield className="w-3 h-3" /> Admin
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)}>
              <User className="w-4 h-4 mr-1" />
              {user.name}
            </Button>
            {/* <Button variant="ghost" size="sm" onClick={() => setShowPasswordChange(true)}>
              <Lock className="w-4 h-4 mr-1" />
              Password
            </Button> */}
            {/* <Button variant="outline" size="sm" onClick={onGoHome}>
              <Inbox className="w-4 h-4 mr-1" />
              Home
            </Button> */}
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {loadingSessions ? (
            <div className="h-full flex items-center justify-center text-slate-500">Loading sessions...</div>
          ) : !currentSession ? (
            <div className="h-full md:p-8 overflow-y-auto">
              <DocumentUploader onUpload={handleUpload} />
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <div className="h-full flex flex-col md:flex-row">
                  <DocumentList documents={documentEntries} activeDocId={activeDocId} onSelect={(id) => setActiveDocId(id)} />
                  <div className="flex-1 h-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center flex-shrink-0 shadow-sm z-10 gap-3 md:gap-0">
                      <div className="w-full md:w-auto">
                        <div className="flex items-center justify-between md:justify-start space-x-2">
                          <h2 className="text-lg font-bold text-slate-800 truncate max-w-[220px] md:max-w-xs">
                            {editingTitle ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={titleDraft}
                                  onChange={(e) => setTitleDraft(e.target.value)}
                                  onKeyDown={handleTitleKeyDown}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveTitle}
                                  disabled={savingTitle}
                                  className="p-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Save title"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[180px] md:max-w-[220px]">{currentSession.metadata?.title || "Session"}</span>
                                <button
                                  onClick={() => setEditingTitle(true)}
                                  className="p-2 rounded-md hover:bg-slate-100 text-slate-600"
                                  title="Edit title"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </h2>
                          {currentSession.systemStatus?.overallStatus && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 shrink-0">
                              {currentSession.systemStatus.overallStatus}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col text-slate-500 text-xs mt-1 truncate">
                          <div className="flex flex-row gap-1">
                            <span className="font-medium text-slate-600">SessionId:</span> {currentSession.id}
                          </div>
                          <div className="flex flex-row gap-1">
                            <span className="font-medium text-slate-600">Source:</span> Azure Blob Storage
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full md:w-auto bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                        <button
                          onClick={() => setDashboardView("overview")}
                          className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${dashboardView === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          <PieChart className="w-3 h-3 mr-1 inline" /> Overview
                        </button>
                        <button
                          onClick={() => setDashboardView("preview")}
                          className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${dashboardView === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          <FileSearch className="w-3 h-3 mr-1 inline" /> Preview
                        </button>
                      </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 ${dashboardView === "preview" ? "no-scrollbar" : ""}`}>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                          {dashboardView === "overview" ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" /> Insights &amp; Data
                              </h3>
                              <InsightsPanel insights={insights} />
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FileSearch className="w-4 h-4 text-blue-600" /> Document Preview
                              </h3>
                              <DocumentPreview document={activeSourceDocument} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 lg:sticky lg:top-4 self-start">
                          <SessionStatus session={currentSession} />
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={handleCheckStatus}
                              className="flex w-full md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap bg-white text-slate-500 shadow-sm hover:text-slate-900 justify-center text-center"
                            >
                              <RefreshCcw className="w-3 h-3 mr-1 inline" /> Refresh Status
                            </button>
                            <button
                              onClick={handleDeleteSession}
                              className="flex w-full md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap bg-white text-red-500 shadow-sm hover:text-slate-900 justify-center text-center"
                            >
                              <Trash2 className="w-3 h-3 mr-1 inline" /> Delete Session
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="h-full">
                  {!canChat ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                      <p className="text-sm">Session is still processing. Please refresh status to continue.</p>
                      <Button variant="outline" size="sm" onClick={handleCheckStatus} disabled={loadingStatus}>
                        <RefreshCcw className="w-4 h-4 mr-1" /> Check status
                      </Button>
                    </div>
                  ) : (
                    <ChatInterface messages={messages} onSendMessage={handleSendMessage} isTyping={isTyping} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showProfile && <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />}
      {showPasswordChange && <PasswordChangeDialog open={showPasswordChange} onClose={() => setShowPasswordChange(false)} />}
    </div>
  );
}