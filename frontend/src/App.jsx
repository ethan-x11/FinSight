import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Bot, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  BarChart3, 
  PieChart, 
  Cpu, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  X,
  File,
  Layout,
  Eye,
  Plus,
  History,
  Database,
  Cloud,
  Save,
  Menu,
  MoreVertical
} from 'lucide-react';

// --- Mock Data Factories ---

const generateMockDocs = (idPrefix) => ({
  [`${idPrefix}-1`]: {
    id: `${idPrefix}-1`,
    name: "Q3_2023_Financial_Report.pdf",
    type: "Financial Report",
    summary: { revenue: "$45.2M", growth: "+12.5%", netIncome: "$8.4M", expenses: "$36.8M" },
    tables: [
      { title: "Consolidated Statement of Operations", headers: ["Category", "2023", "2022"], rows: [["Revenue", "45.2", "40.1"], ["Net Income", "8.4", "6.8"]] }
    ],
    risks: ["Supply chain disruptions in Q2.", "Significant investment in AI R&D."]
  },
  [`${idPrefix}-2`]: {
    id: `${idPrefix}-2`,
    name: "FY23_Risk_Assessment.docx",
    type: "Internal Memo",
    summary: { revenue: "N/A", growth: "N/A", netIncome: "N/A", expenses: "N/A" },
    tables: [],
    risks: ["Cybersecurity threats increasing.", "Regulatory compliance changes."]
  }
});

const MOCK_HISTORICAL_SESSIONS = [
  {
    id: "session-hist-1",
    title: "Q3 2023 Analysis",
    date: "Oct 24, 2:30 PM",
    documents: generateMockDocs("hist-1"),
    activeDocId: "hist-1-1",
    chatHistory: [
      { id: 1, type: 'bot', text: 'Restored session context. I have access to the Q3 reports.', helpful: null },
      { id: 2, type: 'user', text: 'What was the revenue growth?', helpful: null },
      { id: 3, type: 'bot', text: 'Revenue grew by **+12.5%** year-over-year.', helpful: true, sources: ['Q3_Report.pdf'] }
    ],
    fileUploaded: true
  },
  {
    id: "session-hist-2",
    title: "Risk Assessment Review",
    date: "Oct 22, 9:15 AM",
    documents: {
      "hist-2-1": {
         id: "hist-2-1",
         name: "Global_Risk_Memo_v2.pdf",
         type: "Memo",
         summary: { revenue: "N/A", growth: "N/A", netIncome: "N/A", expenses: "N/A" },
         tables: [],
         risks: ["Geopolitical instability in region A.", "Currency fluctuation exposure."]
      }
    },
    activeDocId: "hist-2-1",
    chatHistory: [
       { id: 1, type: 'bot', text: 'Session restored. Focusing on Risk Memo v2.', helpful: null }
    ],
    fileUploaded: true
  }
];

const SIMULATED_PIPELINE_STEPS = [
  "Uploading to Azure Blob Storage...",
  "Creating Session Entry in Cosmos DB...",
  "Triggering Azure Document Intelligence...",
  "Extracting Layouts & Tables...",
  "Vectorizing Content (OpenAI Ada-002)...",
  "Updating Session State..."
];

// --- Components ---

const Sidebar = ({ sessions, currentSessionId, onSwitchSession, onNewSession, activeTab, setActiveTab, isOpen, onClose }) => (
  <>
    {/* Overlay for mobile */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
        onClick={onClose}
      />
    )}
    
    {/* Sidebar Container */}
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-full md:flex-shrink-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FinSight AI</span>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4">
        <button 
          onClick={() => { onNewSession(); onClose(); }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Navigation for Active Session */}
        <div className="px-4 space-y-1 pb-4">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Session</p>
          <button 
            onClick={() => { setActiveTab('dashboard'); onClose(); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Layout className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('chat'); onClose(); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Bot className="w-4 h-4" />
            <span>RAG Chat</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 border-t border-slate-800/50 pt-4">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
            <History className="w-3 h-3 mr-1.5" /> History
          </p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => { onSwitchSession(session.id); onClose(); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group border ${
                  currentSessionId === session.id 
                    ? 'bg-slate-800 border-slate-700 text-white shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                }`}
              >
                <div className="font-medium text-sm truncate">{session.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                  <span>{session.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Database className="w-3 h-3 text-purple-400" />
              <span>Cosmos DB</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
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
        </div>
      </div>
    </div>
  </>
);

const DocumentUploader = ({ onUploadStart, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    startSimulation();
  };

  const startSimulation = () => {
    setIsProcessing(true);
    onUploadStart();
    let step = 0;
    const interval = setInterval(() => {
      setProcessingStep(step);
      step++;
      if (step >= SIMULATED_PIPELINE_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          onUploadComplete();
        }, 800);
      }
    }, 800);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-12 animate-in fade-in duration-500 m-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {SIMULATED_PIPELINE_STEPS.map((text, idx) => (
              <div key={idx} className={`flex items-center space-x-3 transition-all duration-300 ${idx === processingStep ? 'opacity-100 scale-105' : idx < processingStep ? 'opacity-50' : 'opacity-20'}`}>
                {idx < processingStep ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : idx === processingStep ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                )}
                <span className={`text-sm font-medium truncate ${idx === processingStep ? 'text-blue-600' : 'text-slate-600'}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl transition-all cursor-pointer m-4 p-6 text-center ${isDragging ? 'border-blue-500 bg-blue-50 scale-[0.99]' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={startSimulation}
    >
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Upload className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">New Analysis Session</h3>
      <p className="text-slate-500 mb-6 text-center max-w-md text-sm md:text-base">
        Upload financial documents (PDF, DOCX) to start.
        Files are securely stored in <strong>Azure Blob Storage</strong>.
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400 font-medium">
        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Encrypted</span>
        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Auto-Save</span>
      </div>
    </div>
  );
};

const DocumentList = ({ documents, activeDocId, onSelect }) => (
  <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full overflow-hidden shrink-0">
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-1">Documents</h3>
        <p className="text-[10px] text-slate-500">Blob Storage Container</p>
      </div>
      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{Object.keys(documents).length}</span>
    </div>
    {/* On mobile, limit height so it doesn't take over whole screen */}
    <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-48 md:max-h-full">
      {Object.values(documents).map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={`w-full text-left p-3 rounded-lg border transition-all group ${
            activeDocId === doc.id 
              ? 'bg-blue-50 border-blue-200 shadow-sm' 
              : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${activeDocId === doc.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${activeDocId === doc.id ? 'text-blue-900' : 'text-slate-700'}`}>
                {doc.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.type}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const AnalysisDashboard = ({ activeDocData }) => {
  const [viewMode, setViewMode] = useState('insights'); // 'insights', 'tables', 'preview'

  if (!activeDocData) return <div className="p-8 text-center text-slate-400">Select a document to view analysis</div>;

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
      {/* Header for current doc */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center flex-shrink-0 shadow-sm z-10 gap-3 md:gap-0">
        <div className="w-full md:w-auto">
           <div className="flex items-center justify-between md:justify-start space-x-2">
             <h2 className="text-lg font-bold text-slate-800 truncate max-w-[200px] md:max-w-xs">{activeDocData.name}</h2>
             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 shrink-0">ANALYZED</span>
           </div>
           <p className="text-slate-500 text-xs mt-1 truncate">
             <span className="font-medium text-slate-600">Source:</span> Azure Blob Storage
           </p>
        </div>
        <div className="flex w-full md:w-auto bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setViewMode('insights')}
            className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${viewMode === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Insights
          </button>
          <button 
            onClick={() => setViewMode('tables')}
            className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${viewMode === 'tables' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Data Tables
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center whitespace-nowrap ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Eye className="w-3 h-3 mr-1.5 hidden md:block" />
            Original
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
        {viewMode === 'insights' ? (
          <div className="space-y-6 max-w-5xl mx-auto pb-6">
            {activeDocData.summary.revenue !== "N/A" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{activeDocData.summary.revenue}</div>
                  <div className="text-green-600 text-xs font-medium mt-1 flex items-center">
                    {activeDocData.summary.growth} <span className="text-slate-400 ml-1 font-normal">vs prev</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Income</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{activeDocData.summary.netIncome}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Expenses</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{activeDocData.summary.expenses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-center">
                   <div className="text-center">
                      <PieChart className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                      <span className="text-purple-700 font-medium text-xs">View Allocation</span>
                   </div>
                </div>
              </div>
            ) : (
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-800">This document is qualitative. No summary metrics extracted.</span>
               </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
               <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                 <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                 Extracted Highlights & Risks
               </h3>
               <ul className="space-y-3">
                 {activeDocData.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-slate-600 text-sm leading-relaxed">{risk}</p>
                    </li>
                 ))}
               </ul>
            </div>
          </div>
        ) : viewMode === 'tables' ? (
          <div className="space-y-8 max-w-5xl mx-auto pb-6">
            {activeDocData.tables.length > 0 ? (
               activeDocData.tables.map((table, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 text-sm">{table.title}</h3>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Table Detected</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          {table.headers.map((h, i) => (
                            <th key={i} className="px-6 py-3 font-medium text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`px-6 py-3 text-slate-700 whitespace-nowrap ${cIdx === 0 ? 'font-medium' : ''}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <p className="text-slate-500">No structured tables detected.</p>
              </div>
            )}
          </div>
        ) : (
          /* Preview Mode */
          <div className="h-full flex justify-center pb-6">
            <div className="bg-white shadow-xl w-full max-w-3xl min-h-[400px] md:min-h-[800px] p-6 md:p-12 relative border border-slate-300 select-none animate-in fade-in duration-200">
               <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 text-white flex items-center justify-center font-bold text-lg md:text-xl tracking-tighter rounded">FS</div>
                  <div className="text-right">
                    <div className="text-lg md:text-2xl font-serif font-bold text-slate-800">DOCUMENT PREVIEW</div>
                    <div className="text-xs md:text-sm text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[150px] md:max-w-none ml-auto">{activeDocData.name}</div>
                  </div>
               </div>
               <div className="space-y-6 font-serif text-slate-300">
                  <div className="space-y-3"><div className="h-3 bg-slate-200 w-full rounded-sm"></div><div className="h-3 bg-slate-200 w-11/12 rounded-sm"></div></div>
                  <div className="border border-slate-200 rounded p-4 my-8"><div className="flex space-x-4 mb-4 border-b border-slate-100 pb-2"><div className="h-4 bg-slate-300 w-1/4 rounded-sm"></div></div><div className="flex space-x-4"><div className="h-3 bg-slate-100 w-1/4 rounded-sm"></div></div></div>
               </div>
               <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg tracking-wider">READ ONLY</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatInterface = ({ messages, onSendMessage, isTyping }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] md:max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-slate-200 ml-2 md:ml-3' : 'bg-blue-600 mr-2 md:mr-3'}`}>
                {msg.type === 'user' ? <div className="text-slate-500 text-xs font-bold">ME</div> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.type === 'user' ? 'bg-white text-slate-800 border border-slate-100 rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                  <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                </div>
                {msg.sources && msg.type === 'bot' && (
                  <div className="mt-2 flex items-center space-x-4 ml-1">
                     <div className="flex gap-2 flex-wrap max-w-xs">{msg.sources.map((src, i) => <span key={i} className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300">{src}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start"><div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none ml-11 shadow-sm flex items-center space-x-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm shadow-inner"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={!input.trim()} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [sessions, setSessions] = useState(MOCK_HISTORICAL_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState(null); // null means "New Session" mode
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Helper to get current session object
  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId) || null;
  const currentSession = getCurrentSession();

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setActiveTab('dashboard');
  };

  const handleSwitchSession = (id) => {
    setCurrentSessionId(id);
    setActiveTab('dashboard');
  };

  const handleUploadComplete = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession = {
      id: newSessionId,
      title: "New Financial Analysis", // Would be dynamic based on filename
      date: "Just now",
      documents: generateMockDocs(newSessionId),
      activeDocId: `${newSessionId}-1`,
      chatHistory: [{ id: 1, type: 'bot', text: 'Files uploaded to **Blob Storage**. Metadata saved to **Cosmos DB**. Ready for analysis.', helpful: null }],
      fileUploaded: true
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
  };

  const handleChatMessage = (text) => {
    if (!currentSession) return;
    const userMsg = { id: Date.now(), type: 'user', text };
    
    // Immediate update for user message using functional update for safety
    setSessions(prevSessions => prevSessions.map(s => 
      s.id === currentSessionId ? { ...s, chatHistory: [...s.chatHistory, userMsg] } : s
    ));
    setIsTyping(true);

    // Simulate RAG Latency and Response with Cross-Doc context
    setTimeout(() => {
      let responseText = "Based on the document context, I couldn't find a specific answer to that.";
      const lowerInput = text.toLowerCase();
      
      if (lowerInput.includes('revenue') || lowerInput.includes('sales')) {
        responseText = "I found revenue data in two documents:\n\n1. **Q3 2023 Report**: Total Revenue was **$45.2M** (+12.7% YoY).\n2. **Q2 2023 Report**: Total Revenue was **$40.1M**.\n\nComparing the two quarters, revenue grew by approximately **$5.1M** from Q2 to Q3.";
      } else if (lowerInput.includes('risk') || lowerInput.includes('challenge')) {
        responseText = "I've synthesized risks from the Financial Reports and the Internal Memo:\n\n* **Operational**: Supply chain disruptions in Q2 (recovering in Q4).\n* **Financial**: Inflationary pressures in the Eurozone and currency fluctuations.\n* **Internal (Memo)**: Increased cybersecurity threats and higher talent turnover in data science teams.";
      } else if (lowerInput.includes('net income') || lowerInput.includes('profit')) {
        responseText = "The **Net Income** for Q3 2023 was **$8.4M**, showing strong growth compared to Q2 2023, where Net Income was **$6.8M**. This improvement is attributed to cost rationalization in APAC.";
      }

      const botResponse = { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: responseText, 
        helpful: null,
        sources: ['Q3_2023_Report.pdf', 'Q2_2023_Report.pdf', 'FY23_Risk_Memo.docx']
      };
      
      setSessions(prevSessions => prevSessions.map(s => 
        s.id === currentSessionId ? { ...s, chatHistory: [...s.chatHistory, botResponse] } : s
      ));
      setIsTyping(false);
    }, 1500);
  };

  const updateActiveDoc = (docId) => {
    const updatedSessions = sessions.map(s => 
      s.id === currentSessionId ? { ...s, activeDocId: docId } : s
    );
    setSessions(updatedSessions);
  };

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      <Sidebar 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        onSwitchSession={handleSwitchSession} 
        onNewSession={handleNewSession}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-20 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-sm">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mr-2 p-1 text-slate-600 hover:bg-slate-100 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden md:inline">Workspace</span>
            <ChevronRight className="w-4 h-4 hidden md:block" />
            {currentSession ? (
              <div className="flex items-center">
                 <span className="text-slate-900 font-medium truncate max-w-[120px] md:max-w-none">{currentSession.title}</span>
                 <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200 hidden md:flex items-center ml-2 text-slate-500">
                   <Save className="w-3 h-3 mr-1" /> Synced
                 </span>
              </div>
            ) : (
              <span className="text-slate-900 font-medium">New Session</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
              JD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {!currentSession ? (
            <div className="h-full md:p-8 overflow-y-auto">
              <DocumentUploader 
                onUploadStart={() => {}} 
                onUploadComplete={handleUploadComplete} 
              />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="h-full flex flex-col md:flex-row">
                   <DocumentList 
                      documents={currentSession.documents} 
                      activeDocId={currentSession.activeDocId} 
                      onSelect={updateActiveDoc} 
                   />
                   <AnalysisDashboard 
                     activeDocData={currentSession.documents[currentSession.activeDocId]} 
                   />
                </div>
              )}
              {activeTab === 'chat' && (
                <div className="h-full">
                  <ChatInterface 
                    messages={currentSession.chatHistory} 
                    onSendMessage={handleChatMessage}
                    isTyping={isTyping}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}