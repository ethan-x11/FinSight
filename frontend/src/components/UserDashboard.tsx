import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Bot,
  Send,
  ThumbsUp,
  ThumbsDown,
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
  Inbox,
  FileSearch,
  Pencil,
  Check,
  Trash2,
  Search,
  MessageCircleOff
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
  type SourcePointer,
  uploadDocuments,
  updateSession,
  deleteSession,
  submitFeedback,
  Query,
  ReasoningSteps,
} from "../utils/dataHandlerAPI";
import "katex/dist/katex.min.css";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { QueryPlanButton } from "./ui/query-plan";
import { ProfileDialog } from "./ProfileDialog";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { APP_BRAND_NAME, APP_TAGLINE } from "../config/appConfig";
import { MarkdownMessage } from "./MarkdownMessage";

type DashboardTab = "dashboard" | "chat";

type UserDashboardProps = {
  user: ApiUser;
  onLogout: () => void;
  onGoHome: () => void;
};

type SimpleMessage = {
  id: string;
  messageId?: string;
  role: "user" | "assistant";
  text: string;
  citations?: { name: string; url?: string }[];
  queryPlan?: Query[];
  linkedCitations?: SourcePointer[];
  reasoningSteps?: ReasoningSteps[];
  userFeedback?: {
    thumbRating: "up" | "down";
    comment?: string;
    submittedAt?: string;
  };
  model?: string;
};


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

const normalizeRawCitation = (raw: string) => {
  let cleaned = raw.trim();
  if (cleaned.toLowerCase().startsWith("chunk[")) {
    cleaned = cleaned.slice(5);
  }
  if (cleaned.startsWith("[")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("]")) cleaned = cleaned.slice(0, -1);
  cleaned = cleaned.replace(/^Source:\s*/i, "");
  return cleaned.trim();
};

const parseCitationLabel = (raw: string) => {
  const cleaned = normalizeRawCitation(raw);
  const match = cleaned.match(/^(?<source>[^,]+),\s*Page\s*(?<page>[^,]+),/i);
  const source = match?.groups?.source?.trim();
  const pageRaw = match?.groups?.page?.trim();
  const pageNums = pageRaw ? pageRaw.match(/\d+/g)?.map((n) => Number(n)) ?? [] : [];
  const pageStart = pageNums[0];
  const pageEnd = pageNums.length > 1 ? pageNums[1] : pageStart;
  return { source, pageStart, pageEnd };
};

const formatPageLabel = (start?: number, end?: number) => {
  if (!start) return "";
  if (end && end !== start) return `, Page ${start}–${end}`;
  return `, Page ${start}`;
};

// const buildLinkLabel = (pointer: SourcePointer) => {
//   const parsed = parseCitationLabel(pointer.raw_cite);
//   const sourcefile = pointer.sourcefile?.trim() || parsed.source;
//   const pageStart = pointer.page_start ?? parsed.pageStart;
//   const pageEnd = pointer.page_end ?? parsed.pageEnd;
//   if (!sourcefile) return normalizeRawCitation(pointer.raw_cite);
//   return `${sourcefile}${pointer.page_range ? `, Page - ${pointer.page_range}` : formatPageLabel(pageStart, pageEnd)}`;
// };

// const linkifyRawCitations = (text: string, linkedCitations?: SourcePointer[]) => {
//   // console.log("Original Text", text);
//   // console.log("Original Citations", linkedCitations);
//   if (!linkedCitations || linkedCitations.length === 0) return text;
//   let output = text;
//   // console.log("Linkifying citations...");
//   linkedCitations.forEach((pointer) => {
//     if (!pointer?.raw_cite || !pointer?.url) return;
//     const display = buildLinkLabel(pointer);
//     const replacement = `[${display}](${pointer.url})`;
//     output = output.split(pointer.raw_cite).join(replacement);
//   });
//   return output;
// };

const Sidebar = ({
  sessions,
  currentSessionId,
  onSwitchSession,
  onNewSession,
  activeTab,
  setActiveTab,
  canChat,
  deployments,
  selectedDeployment,
  onSelectDeployment,
  loadingDeployments,
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
  deployments: string[];
  selectedDeployment: string;
  onSelectDeployment: (deployment: string) => void;
  loadingDeployments: boolean;
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
        {activeTab === "chat" && (
          <div className="mt-2 ml-7 space-y-2">
            <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Select Model
            </label>
            <select
              value={selectedDeployment}
              onChange={(e) => onSelectDeployment(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              disabled={loadingDeployments}
            >
              {loadingDeployments && <option value="">Loading...</option>}
              {!loadingDeployments && deployments.length === 0 && (
                <option value="">No deployments found</option>
              )}
              {!loadingDeployments && deployments.length > 0 && (
                <>
                  <option value="">Default</option>
                  {deployments.map((deployment) => (
                    <option key={deployment} value={deployment}>
                      {deployment}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 border-t border-slate-800/50 pt-4 scrollbar-slim">
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

  // const tables = insights.structuredTables || [];
  const risks = insights.risks || [];
  const keyInsights = insights.keyInsights || [];

  return (
    <div className="space-y-6">
      {keyInsights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyInsights.map((item: KeyInsight) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-semibold">{item.category || "Insight"}</p>
              <p className="text-md font-semibold text-slate-900 mt-1">{item.value}</p>
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

const InsightsNotesPanel = ({ notes }: { notes?: string | null }) => {
  if (!notes || !notes.trim()) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FileText className="w-4 h-4 text-blue-600" /> Auto Analysis Notes
      </div>
      <div className="text-sm leading-relaxed text-slate-700 [&>*]:mb-2 [&>*:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5">
        {/* <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>
          {notes}
        </Markdown> */}
        <MarkdownMessage text={notes || ""} />
      </div>
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
  isLoading,
  onAbortRequest,
  onSendFeedback,
}: {
  messages: SimpleMessage[];
  onSendMessage: (text: string, topK: number, useQueryPlanner: boolean) => void;
  isTyping: boolean;
  isLoading: boolean;
  onAbortRequest: () => void;
  onSendFeedback: (messageId: string, thumbRating: "up" | "down", comment?: string) => Promise<void>;
}) => {
  const [input, setInput] = useState("");
  const [topK, setTopK] = useState(8);
  const [useQueryPlanner, setUseQueryPlanner] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackMsgId, setActiveFeedbackMsgId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmittingId, setFeedbackSubmittingId] = useState<string | null>(null);
  const [expandedReasoningIds, setExpandedReasoningIds] = useState<Record<string, boolean>>({});
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [sourcesModalItems, setSourcesModalItems] = useState<{ name: string; url?: string }[]>([]);
  const [sourcesModalTitle, setSourcesModalTitle] = useState<string | null>(null);
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

  const openFeedbackModal = (messageId: string) => {
    setActiveFeedbackMsgId(messageId);
    setFeedbackComment("");
    setFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setActiveFeedbackMsgId(null);
    setFeedbackComment("");
  };

  const openSourcesModal = (sources: { name: string; url?: string }[], title?: string | null) => {
    setSourcesModalItems(sources);
    setSourcesModalTitle(title || null);
    setSourcesModalOpen(true);
  };

  const closeSourcesModal = () => {
    setSourcesModalOpen(false);
    setSourcesModalItems([]);
    setSourcesModalTitle(null);
  };

  const toggleReasoning = (messageId: string) => {
    setExpandedReasoningIds((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const handleSend = () => {
    if (isTyping) {
      onAbortRequest();
      return;
    }
    if (!input.trim()) return;
    onSendMessage(input.trim(), topK, useQueryPlanner);
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
          {isLoading ? (
            <ChatMessagesSkeleton />
          ) : (
            messages.map((msg) => {
            const isUser = msg.role === "user";
            const feedbackTargetId = msg.messageId;
            const showFeedback = !isUser && Boolean(feedbackTargetId);
            const alreadyRated = showFeedback && Boolean(msg.userFeedback?.thumbRating);
            const feedbackPending = feedbackTargetId ? feedbackSubmittingId === feedbackTargetId : false;
            const canShowReasoning = !isUser && Boolean(msg.reasoningSteps?.length) && Boolean(msg.messageId);
            const isReasoningOpen = msg.messageId ? expandedReasoningIds[msg.messageId] : false;
            const sources = msg.citations || [];
            const previewSources = sources.slice(0, 3);
            const remainingSources = sources.length - previewSources.length;
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] md:max-w-[78%] px-4 py-3 rounded-2xl border shadow-sm transition-all ${isUser
                    ? "bg-slate-500 text-white border-blue-800 shadow-blue-200/60"
                    : "bg-white text-slate-800 border-default"}
                  ${isUser ? "rounded-tr-none" : "rounded-tl-none"}`}
                >
                  <div className={`flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.08em] font-semibold ${isUser ? "text-white/80" : "text-slate-500"}`}>
                    <div className="flex items-center gap-2">
                      {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        <span>
                          {isUser ? "You" : "Assistant"}
                          {!isUser && msg.model ? (
                            <span className={`ml-1 text-[10px] font-semibold ${isUser ? "text-white/70" : "text-slate-400"}`}>
                              ({msg.model})
                            </span>
                          ) : null}
                        </span>
                    </div>
                    {canShowReasoning && msg.messageId && (
                      <button
                        type="button"
                        onClick={() => toggleReasoning(msg.messageId!)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${isReasoningOpen
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {isReasoningOpen ? "Hide Reasoning" : "Show Reasoning Steps"}
                      </button>
                    )}
                  </div>

                  {canShowReasoning && isReasoningOpen && (
                    <div className="mt-3 mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reasoning steps</p>
                      <div className="mt-2 space-y-2">
                        {msg.reasoningSteps?.map((step, idx) => {
                          const isLast = idx === (msg.reasoningSteps?.length || 0) - 1;
                          return (
                            <div key={`${step.title}-${idx}`} className="relative pl-6">
                              {!isLast && (
                                <span className="absolute left-[5px] top-5 h-[calc(90%+4px)] w-px bg-slate-200 overflow-hidden">
                                  <span className="absolute inset-0 bg-slate-400 opacity-70 animate-pulse" />
                                </span>
                              )}
                              <span className="absolute left-0 top-2.5 h-3 w-3 rounded-full bg-slate-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)] animate-pulse" />
                              <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
                                <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                                <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-sm leading-relaxed mt-1 [&>*]:mb-2 [&>*:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 ${isUser ? "text-white" : "text-slate-800"}`}
                  >
                    <MarkdownMessage text={msg.text || ""} linkedCitations={msg.linkedCitations} />
                  </div>

                  {sources.length > 0 && (
                    <div className="mt-2 space-y-2 group">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span>Sources:</span>
                        {previewSources.map((src, i) => (
                          <a
                            key={`${src.name}-${i}`}
                            href={src.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${isUser ? "bg-white/15 text-white border-white/30" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                          >
                            {src.name}
                          </a>
                        ))}
                        {remainingSources > 0 && (
                          <button
                            type="button"
                            onClick={() => openSourcesModal(sources, isUser ? "User Sources" : "Assistant Sources")}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${isUser ? "bg-white/10 text-white border-white/30 hover:bg-white/15" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}
                          >
                            +{remainingSources} more
                          </button>
                        )}
                      </div>
                      {msg.queryPlan && msg.queryPlan.length > 0 && (
                        <div className="flex items-center gap-2">
                          <QueryPlanButton queries={msg.queryPlan} />
                        </div>
                      )}
                    </div>
                  )}
                  {showFeedback && feedbackTargetId && (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>Was this helpful?</span>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${alreadyRated && msg.userFeedback?.thumbRating === "up"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            } ${feedbackPending ? "opacity-60" : ""}`}
                          disabled={alreadyRated || feedbackPending}
                          onClick={async () => {
                            setFeedbackSubmittingId(feedbackTargetId);
                            try {
                              await onSendFeedback(feedbackTargetId, "up");
                            } finally {
                              setFeedbackSubmittingId(null);
                            }
                          }}
                        >
                          {feedbackPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                          <span className="text-[11px] font-semibold">Yes</span>
                        </button>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${alreadyRated && msg.userFeedback?.thumbRating === "down"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            } ${feedbackPending ? "opacity-60" : ""}`}
                          disabled={alreadyRated || feedbackPending}
                          onClick={() => openFeedbackModal(feedbackTargetId)}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">No</span>
                        </button>
                      </div>
                      {msg.userFeedback?.thumbRating && (
                        <span className="text-[11px] font-semibold text-gray-600">Thanks for the feedback</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }))}
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
        <div className="flex gap-2 max-w-5xl mx-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">Query Planner</label>
            <button
              type="button"
              onClick={() => setUseQueryPlanner((prev) => !prev)}
              className={`relative h-4 w-12 rounded-full border transition-colors duration-200 ${useQueryPlanner
                ? "bg-blue-600 border-blue-600"
                : "bg-slate-200 border-slate-300"}`}
              aria-pressed={useQueryPlanner}
            >
              <span
                className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ${useQueryPlanner ? "left-8" : "left-1"}`}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 text-[8px] font-semibold transition-opacity duration-200 ${useQueryPlanner ? "left-3 text-white opacity-100" : "left-3 text-slate-500 opacity-0"}`}
              >
                On
              </span>
              <span
                className={`absolute top-1/2 -translate-y-1/2 text-[8px] font-semibold transition-opacity duration-200 ${useQueryPlanner ? "right-3 text-white opacity-0" : "right-3 text-slate-600 opacity-100"}`}
              >
                Off
              </span>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">Top K</label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="h-6 rounded-md border border-default bg-slate-50 px-2 text-xs text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {Array.from({ length: 15 }, (_, idx) => idx + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
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
          <Button onClick={handleSend} disabled={!isTyping && !input.trim()} className="h-11 px-4">
            {isTyping ? <MessageCircleOff className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {isTyping ? "Stop" : "Send"}
          </Button>
        </div>
      </div>
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Tell us what was off</p>
                <p className="text-xs text-slate-500">Your feedback helps improve grounded answers.</p>
              </div>
              <button onClick={closeFeedbackModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <label className="text-xs font-semibold text-slate-700">Comments (optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-blue-400 focus:outline-none"
                placeholder="What could be improved?"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 rounded-b-xl">
              <Button variant="ghost" onClick={closeFeedbackModal}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!activeFeedbackMsgId) return;
                  setFeedbackSubmittingId(activeFeedbackMsgId);
                  try {
                    await onSendFeedback(activeFeedbackMsgId, "down", feedbackComment.trim() || undefined);
                    closeFeedbackModal();
                  } finally {
                    setFeedbackSubmittingId(null);
                  }
                }}
                disabled={!activeFeedbackMsgId || feedbackSubmittingId === activeFeedbackMsgId}
              >
                {feedbackSubmittingId === activeFeedbackMsgId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{sourcesModalTitle || "Sources"}</p>
                <p className="text-xs text-slate-500">All cited sources for this response.</p>
              </div>
              <button onClick={closeSourcesModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              {sourcesModalItems.length === 0 ? (
                <div className="text-sm text-slate-500">No sources available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {sourcesModalItems.map((src, idx) => (
                    <a
                      key={`${src.name}-${idx}`}
                      href={src.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    >
                      {src.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChatMessagesSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex justify-start">
      <div className="w-3/4 max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-200" />
        </div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className="w-2/3 max-w-lg rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-4/5 rounded bg-slate-200" />
        </div>
      </div>
    </div>
    <div className="flex justify-start">
      <div className="w-4/5 max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-11/12 rounded bg-slate-200" />
          <div className="h-3 w-3/4 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  </div>
);

const OverviewSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-5/6 rounded bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-200" />
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-32 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="h-4 w-44 rounded bg-slate-200" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-11/12 rounded bg-slate-200" />
        <div className="h-3 w-4/5 rounded bg-slate-200" />
      </div>
    </div>
  </div>
);

export default function UserDashboard({ user, onLogout, onGoHome }: UserDashboardProps) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insights, setInsights] = useState<AnalysisOutput[] | null>(null);
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
  const [deployments, setDeployments] = useState<string[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState("");
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const titleEditRef = useRef<HTMLDivElement | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const abortRequestedRef = useRef(false);

  const sessionsRef = useRef<AnalysisSession[]>([]);
  const refreshedInsightsRef = useRef<Record<string, boolean>>({});

  const currentSession = useMemo(() => sessions.find((s) => s.id === currentSessionId) || null, [sessions, currentSessionId]);
  const canChat = currentSession?.systemStatus?.overallStatus === "completed";

  useEffect(() => {
    setTitleDraft(currentSession?.metadata?.title || "");
    setEditingTitle(false);
  }, [currentSession]);

  useEffect(() => {
    if (!editingTitle) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!titleEditRef.current) return;
      if (titleEditRef.current.contains(event.target as Node)) return;
      setTitleDraft(currentSession?.metadata?.title || "");
      setEditingTitle(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [editingTitle, currentSession]);

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

  useEffect(() => {
    if (deployments.length > 0) return;
    let cancelled = false;

    const loadDeployments = async () => {
      setLoadingDeployments(true);
      try {
        // const items = await fetchDeployments();
        const items = ["model-router"];
        if (cancelled) return;
        setDeployments(items);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Failed to load deployments");
        }
      } finally {
        if (!cancelled) setLoadingDeployments(false);
      }
    };

    loadDeployments();
    return () => {
      cancelled = true;
    };
  }, [deployments.length]);

  const mapChat = (chat: ChatMessage[]): SimpleMessage[] =>
    chat.map((c) => {
      const baseId = c.messageId || crypto.randomUUID();
      return {
        id: baseId,
        messageId: c.messageId || baseId,
        role: c.role === "assistant" ? "assistant" : "user",
        // text: c.role === "assistant" ? linkifyRawCitations(c.content, c.linkedCitations) : c.content,
        text: c.content,
        citations:
          c.citations?.map((s) => ({
            name: `${s.sourcefile}${s.page_range ? `, page- ${s.page_range}` : ""}${s.chunk_id ? `, ${s.chunk_id}` : ""}`,
            url: s.pointer_url,
          })) || [],
        queryPlan: c.queryPlan,
        linkedCitations: c.linkedCitations,
        reasoningSteps: c.reasoningSteps,
        userFeedback: c.userFeedback || undefined,
        model: c.model,
      };
    });

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
    try {
      setDeleteBusy(true);
      await deleteSession(currentSessionId);
      toast.success("Session deleted");
      setDeleteDialogOpen(false);

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
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSendMessage = async (text: string, topK: number, useQueryPlanner: boolean) => {
    if (!currentSessionId) return toast.error("Select a session first");
    const session = sessions.find((s) => s.id === currentSessionId);
    if (!session || session.systemStatus?.overallStatus !== "completed") {
      return toast.error("Session processing is not completed yet. Please wait for status to finish.");
    }
    if (isTyping) return;
    const userId = crypto.randomUUID();
    const userMsg: SimpleMessage = { id: userId, messageId: userId, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    abortRequestedRef.current = false;
    const controller = new AbortController();
    chatAbortRef.current = controller;
    try {
      const resp = await askChatQuestion(
        currentSessionId,
        text,
        topK,
        useQueryPlanner,
        selectedDeployment || undefined,
        controller.signal
      );
      const botId = resp.messageId || crypto.randomUUID();
      const botMsg: SimpleMessage = {
        id: botId,
        messageId: resp.messageId,
        role: "assistant",
        text: resp.answer,
        citations: resp.citations?.map((s) => ({
          name: `${s.sourcefile}${s.page_range ? `, page- ${s.page_range}` : ""}${s.chunk_id ? `, ${s.chunk_id}` : ""}`,
          url: s.pointer_url,
        })) || [],
        queryPlan: resp.queryPlan,
        linkedCitations: resp.linkedCitations,
        reasoningSteps: resp.reasoningSteps,
        model: resp.model,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        if (!abortRequestedRef.current) {
          toast.info("Request aborted");
        }
        return;
      }
      toast.error(err?.message || "Failed to send message");
    } finally {
      setIsTyping(false);
      chatAbortRef.current = null;
      abortRequestedRef.current = false;
    }
  };

  const handleAbortChat = () => {
    if (!isTyping) return;
    abortRequestedRef.current = true;
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsTyping(false);
  };

  const handleSubmitFeedback = async (messageId: string, thumbRating: "up" | "down", comment?: string) => {
    if (!currentSessionId) {
      toast.error("Select a session first");
      return;
    }
    const previousFeedback = messages.find((m) => m.id === messageId || m.messageId === messageId)?.userFeedback;
    const submittedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId || m.messageId === messageId
          ? { ...m, userFeedback: { thumbRating, comment, submittedAt } }
          : m
      )
    );

    try {
      await submitFeedback({ sessionId: currentSessionId, messageId, thumbRating, comment });
      toast.success("Feedback recorded");
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.messageId === messageId ? { ...m, userFeedback: previousFeedback } : m
        )
      );
      toast.error(err?.message || "Failed to submit feedback");
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
        deployments={deployments}
        selectedDeployment={selectedDeployment}
        onSelectDeployment={setSelectedDeployment}
        loadingDeployments={loadingDeployments}
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
                              <div className="flex items-center gap-2" ref={titleEditRef}>
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
                            loadingSession ? (
                              <OverviewSkeleton />
                            ) : (
                              <div className="space-y-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" /> Insights &amp; Data
                                  </h3>
                                  <InsightsPanel insights={insights?.find(insight => insight.fileName === activeDocId) ?? null} />
                                </div>
                                <InsightsNotesPanel notes={(insights?.find(insight => insight.fileName === activeDocId) ?? null)?.notes ?? null} />
                              </div>
                            )
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
                            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                              <AlertDialogTrigger asChild>
                                <button
                                  disabled={!currentSessionId}
                                  className="flex w-full md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap bg-white text-red-500 shadow-sm hover:text-slate-900 justify-center text-center disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3 h-3 mr-1 inline" /> Delete Session
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the session and its blobs/index entries. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteSession}
                                    className="bg-red-600 text-white hover:bg-red-500"
                                  >
                                    {deleteBusy ? "Deleting..." : "Delete Session"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isTyping={isTyping}
                      isLoading={loadingSession}
                      onAbortRequest={handleAbortChat}
                      onSendFeedback={handleSubmitFeedback}
                    />
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