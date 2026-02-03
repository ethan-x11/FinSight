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
  Search,
  Eye,
  Table as TableIcon // Aliasing to avoid conflict with HTML table tag
} from 'lucide-react';

// --- Mock Data ---

// distinct data for different documents to show switching works
const MOCK_DOCS_DATA = {
  "doc-1": {
    id: "doc-1",
    name: "Q3_2023_Financial_Report.pdf",
    type: "Financial Report",
    summary: {
      revenue: "$45.2M",
      growth: "+12.5%",
      netIncome: "$8.4M",
      expenses: "$36.8M"
    },
    tables: [
      {
        title: "Consolidated Statement of Operations",
        headers: ["Category", "2023 (M)", "2022 (M)", "Change"],
        rows: [
          ["Total Revenue", "$45.2", "$40.1", "+12.7%"],
          ["Cost of Revenue", "$18.5", "$17.2", "+7.5%"],
          ["Gross Profit", "$26.7", "$22.9", "+16.6%"],
          ["Operating Expenses", "$15.2", "$14.0", "+8.5%"],
          ["Net Income", "$8.4", "$6.8", "+23.5%"]
        ]
      },
      {
        title: "Balance Sheet Highlights",
        headers: ["Item", "2023 (M)", "2022 (M)"],
        rows: [
          ["Cash & Equivalents", "$12.4", "$10.1"],
          ["Total Assets", "$85.6", "$78.2"],
          ["Total Liabilities", "$32.1", "$30.5"],
          ["Shareholder Equity", "$53.5", "$47.7"]
        ]
      }
    ],
    risks: [
      "Operating margin expanded by 200 bps due to cost rationalization initiatives in the APAC region.",
      "Supply chain disruptions in Q2 slightly impacted inventory turnover, but recovery is expected in Q4.",
      "Significant investment in AI R&D ($2.1M) aimed at automating backend financial workflows."
    ]
  },
  "doc-2": {
    id: "doc-2",
    name: "Q2_2023_Financial_Report.pdf",
    type: "Financial Report",
    summary: {
      revenue: "$40.1M",
      growth: "+4.2%",
      netIncome: "$6.8M",
      expenses: "$33.3M"
    },
    tables: [
      {
        title: "Q2 Operating Results",
        headers: ["Segment", "Q2 2023", "Q2 2022"],
        rows: [
          ["North America", "$20.5M", "$19.8M"],
          ["Europe", "$12.1M", "$11.5M"],
          ["Asia Pacific", "$7.5M", "$6.2M"]
        ]
      }
    ],
    risks: [
      "Inflationary pressures in Eurozone impacted consumer discretionary spending.",
      "Forex headwinds resulted in a $0.4M impact on bottom-line revenue."
    ]
  },
  "doc-3": {
    id: "doc-3",
    name: "FY23_Risk_Assessment_Memo.docx",
    type: "Internal Memo",
    summary: {
      revenue: "N/A",
      growth: "N/A",
      netIncome: "N/A",
      expenses: "N/A"
    },
    tables: [],
    risks: [
      "Cybersecurity: Increased phishing attempts targeting finance department.",
      "Regulatory: New compliance standards for ESG reporting coming into effect next fiscal year.",
      "Talent: Higher than average turnover in data science teams."
    ]
  }
};

const SIMULATED_RAG_STEPS = [
  "Uploading 3 documents to blob storage...",
  "Triggering Azure Document Intelligence batch...",
  "Analyzing layout (prebuilt-layout model)...",
  "Extracting tables, headers, and paragraphs...",
  "Chunking content across multiple files...",
  "Generating embeddings (text-embedding-ada-002)...",
  "Indexing to Vector Store...",
  "Knowledge Base Ready."
];

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }) => (
  <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 flex-shrink-0">
    <div className="p-6 flex items-center space-x-2 border-b border-slate-800">
      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
        <BarChart3 className="w-5 h-5 text-white" />
      </div>
      <span className="font-bold text-lg tracking-tight">FinSight AI</span>
    </div>
    
    <nav className="flex-1 p-4 space-y-2">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Layout className="w-5 h-5" />
        <span className="font-medium">Analysis Dashboard</span>
      </button>
      <button 
        onClick={() => setActiveTab('chat')}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Bot className="w-5 h-5" />
        <span className="font-medium">RAG Assistant</span>
      </button>
    </nav>

    <div className="p-4 border-t border-slate-800">
      <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
        <div className="flex items-center space-x-2 mb-2 text-blue-400 font-semibold">
          <Cpu className="w-3 h-3" />
          <span>System Status</span>
        </div>
        <div className="flex justify-between">
          <span>Azure Doc Int:</span>
          <span className="text-green-400">Active</span>
        </div>
        <div className="flex justify-between">
          <span>Vector Index:</span>
          <span className="text-green-400">3 Docs</span>
        </div>
      </div>
    </div>
  </div>
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
      if (step >= SIMULATED_RAG_STEPS.length) {
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
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-slate-200 p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {SIMULATED_RAG_STEPS.map((text, idx) => (
              <div key={idx} className={`flex items-center space-x-3 transition-all duration-300 ${idx === processingStep ? 'opacity-100 scale-105' : idx < processingStep ? 'opacity-50' : 'opacity-20'}`}>
                {idx < processingStep ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : idx === processingStep ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                )}
                <span className={`text-sm font-medium ${idx === processingStep ? 'text-blue-600' : 'text-slate-600'}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={startSimulation}
    >
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <Upload className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-2xl font-semibold text-slate-800 mb-2">Upload Financial Documents</h3>
      <p className="text-slate-500 mb-6 text-center max-w-md">
        Drag and drop multiple files (PDF, DOCX, XLSX).
        Our Multi-Document Intelligence pipeline will analyze layouts and cross-reference data.
      </p>
      <div className="flex gap-3 text-xs text-slate-400 font-medium">
        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Batch Upload Supported</span>
        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Auto-Categorization</span>
      </div>
    </div>
  );
};

const DocumentList = ({ documents, activeDocId, onSelect }) => (
  <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-1">Documents</h3>
      <p className="text-xs text-slate-500">3 Processed • Ready for Analysis</p>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
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
    <div className="p-3 border-t border-slate-100 bg-slate-50">
        <button className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Upload className="w-3 h-3" />
            <span>Add More Files</span>
        </button>
    </div>
  </div>
);

const AnalysisDashboard = ({ activeDocData }) => {
  const [viewMode, setViewMode] = useState('insights'); // 'insights', 'tables', 'preview'

  if (!activeDocData) return <div className="p-8 text-center text-slate-400">Select a document to view analysis</div>;

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
      {/* Header for current doc */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center flex-shrink-0">
        <div>
           <div className="flex items-center space-x-2">
             <h2 className="text-lg font-bold text-slate-800">{activeDocData.name}</h2>
             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">ANALYZED</span>
           </div>
           <p className="text-slate-500 text-xs mt-1">Azure Doc Intelligence detected {activeDocData.tables?.length || 0} tables and {activeDocData.risks?.length || 0} key highlights.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('insights')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Key Insights
          </button>
          <button 
            onClick={() => setViewMode('tables')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'tables' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Structured Data
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Eye className="w-3 h-3 mr-1.5" />
            Original Document
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {viewMode === 'insights' ? (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Conditional Rendering based on Doc Type for variety */}
            {activeDocData.summary.revenue !== "N/A" ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{activeDocData.summary.revenue}</div>
                  <div className="text-green-600 text-xs font-medium mt-1 flex items-center">
                    {activeDocData.summary.growth} <span className="text-slate-400 ml-1 font-normal">vs prev period</span>
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
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-800">This document is primarily qualitative. Financial summary metrics are not applicable.</span>
               </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
               <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                 <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                 Extracted Highlights & Risks
               </h3>
               <ul className="space-y-3">
                 {activeDocData.risks && activeDocData.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-slate-600 text-sm leading-relaxed">{risk}</p>
                    </li>
                 ))}
               </ul>
            </div>
          </div>
        ) : viewMode === 'tables' ? (
          <div className="space-y-8 max-w-5xl mx-auto">
            {activeDocData.tables && activeDocData.tables.length > 0 ? (
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
                            <th key={i} className="px-6 py-3 font-medium text-xs uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`px-6 py-3 text-slate-700 ${cIdx === 0 ? 'font-medium' : ''}`}>
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
                <TableIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No structured tables detected in this document.</p>
              </div>
            )}
          </div>
        ) : (
          /* Preview Mode */
          <div className="h-full flex justify-center">
            <div className="bg-white shadow-xl w-full max-w-3xl min-h-[800px] p-12 relative border border-slate-300 select-none animate-in fade-in duration-200">
               {/* Document Header */}
               <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-6">
                  <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-bold text-xl tracking-tighter rounded">
                    FS
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-serif font-bold text-slate-800">FINANCIAL REPORT</div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">{activeDocData.name.replace('.pdf', '').replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400 mt-1">CONFIDENTIAL • INTERNAL USE ONLY</div>
                  </div>
               </div>

               {/* Mock Content Body */}
               <div className="space-y-6 font-serif text-slate-300">
                  {/* Mock Paragraphs */}
                  <div className="space-y-3">
                     <div className="h-3 bg-slate-200 w-full rounded-sm"></div>
                     <div className="h-3 bg-slate-200 w-11/12 rounded-sm"></div>
                     <div className="h-3 bg-slate-200 w-full rounded-sm"></div>
                     <div className="h-3 bg-slate-200 w-3/4 rounded-sm"></div>
                  </div>
                  
                  {/* Mock Table visual */}
                  <div className="border border-slate-200 rounded p-4 my-8">
                     <div className="flex space-x-4 mb-4 border-b border-slate-100 pb-2">
                        <div className="h-4 bg-slate-300 w-1/4 rounded-sm"></div>
                        <div className="h-4 bg-slate-300 w-1/4 rounded-sm"></div>
                        <div className="h-4 bg-slate-300 w-1/4 rounded-sm"></div>
                        <div className="h-4 bg-slate-300 w-1/4 rounded-sm"></div>
                     </div>
                     {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex space-x-4 mb-3">
                           <div className="h-3 bg-slate-100 w-1/4 rounded-sm"></div>
                           <div className="h-3 bg-slate-100 w-1/4 rounded-sm"></div>
                           <div className="h-3 bg-slate-100 w-1/4 rounded-sm"></div>
                           <div className="h-3 bg-slate-100 w-1/4 rounded-sm"></div>
                        </div>
                     ))}
                  </div>

                  <div className="space-y-3">
                     <div className="h-3 bg-slate-200 w-full rounded-sm"></div>
                     <div className="h-3 bg-slate-200 w-full rounded-sm"></div>
                     <div className="h-3 bg-slate-200 w-5/6 rounded-sm"></div>
                  </div>

                  {/* Page Number */}
                  <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-300 font-sans">
                      Page 1 of 24
                  </div>
               </div>
               
               {/* Overlay indicating it's a preview */}
               <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg tracking-wider">
                  PREVIEW MODE
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FeedbackModal = ({ isOpen, onClose, onSubmit }) => {
  const [comment, setComment] = useState("");
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Provide Feedback</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">Why did you find this response helpful/unhelpful? Your feedback improves our RAG model.</p>
          <textarea 
            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-32 resize-none"
            placeholder="Optional comments (e.g., 'The number for net income was incorrect...')"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
          <button 
            onClick={() => { onSubmit(comment); setComment(""); }} 
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! I\'ve analyzed the **3 uploaded documents**. You can ask me to compare figures across quarters (Q2 vs Q3) or summarize risks from the internal memo.', helpful: null }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackMsgId, setActiveFeedbackMsgId] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate RAG Latency and Response with Cross-Doc context
    setTimeout(() => {
      let responseText = "Based on the document context, I couldn't find a specific answer to that.";
      const lowerInput = input.toLowerCase();
      
      if (lowerInput.includes('revenue') || lowerInput.includes('sales')) {
        responseText = "I found revenue data in two documents:\n\n1. **Q3 2023 Report**: Total Revenue was **$45.2M** (+12.7% YoY).\n2. **Q2 2023 Report**: Total Revenue was **$40.1M**.\n\nComparing the two quarters, revenue grew by approximately **$5.1M** from Q2 to Q3.";
      } else if (lowerInput.includes('risk') || lowerInput.includes('challenge')) {
        responseText = "I've synthesized risks from the Financial Reports and the Internal Memo:\n\n* **Operational**: Supply chain disruptions in Q2 (recovering in Q4).\n* **Financial**: Inflationary pressures in the Eurozone and currency fluctuations.\n* **Internal (Memo)**: Increased cybersecurity threats and higher talent turnover in data science teams.";
      } else if (lowerInput.includes('net income') || lowerInput.includes('profit')) {
        responseText = "The **Net Income** for Q3 2023 was **$8.4M**, showing strong growth compared to Q2 2023, where Net Income was **$6.8M**. This improvement is attributed to cost rationalization in APAC.";
      }

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: responseText, 
        helpful: null,
        sources: ['Q3_2023_Report.pdf', 'Q2_2023_Report.pdf', 'FY23_Risk_Memo.docx']
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleFeedback = (msgId, isHelpful) => {
    if (isHelpful) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, helpful: true } : m));
    } else {
      setActiveFeedbackMsgId(msgId);
      setFeedbackModalOpen(true);
    }
  };

  const submitFeedback = (comment) => {
    setMessages(prev => prev.map(m => m.id === activeFeedbackMsgId ? { ...m, helpful: false, feedbackComment: comment } : m));
    setFeedbackModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-slate-200 ml-3' : 'bg-blue-600 mr-3'}`}>
                {msg.type === 'user' ? <div className="text-slate-500 text-xs font-bold">ME</div> : <Bot className="w-5 h-5 text-white" />}
              </div>

              <div className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.type === 'user' 
                    ? 'bg-white text-slate-800 border border-slate-100 rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                  <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                </div>
                
                {msg.type === 'bot' && (
                  <div className="mt-2 flex items-center space-x-4 ml-1">
                    {msg.sources && (
                       <div className="flex gap-2 flex-wrap max-w-xs">
                         {msg.sources.map((src, idx) => (
                           <span key={idx} className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300">
                             {src}
                           </span>
                         ))}
                       </div>
                    )}

                    {msg.id !== 1 && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleFeedback(msg.id, true)}
                          className={`p-1 rounded transition-colors ${msg.helpful === true ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id, false)}
                          className={`p-1 rounded transition-colors ${msg.helpful === false ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none ml-11 shadow-sm flex items-center space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm shadow-inner"
            placeholder="Ask a question about the financial reports..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
           RAG model v2.1 • Indexing 3 Documents • 98.4% Accuracy
        </p>
      </div>

      <FeedbackModal 
        isOpen={feedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
        onSubmit={submitFeedback}
      />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [activeDocId, setActiveDocId] = useState('doc-1');

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center space-x-2 text-slate-500 text-sm">
            <span>Workspace</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">Financial Analysis</span>
            {fileUploaded && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 flex items-center">
                   <File className="w-3 h-3 mr-1" />
                   {Object.keys(MOCK_DOCS_DATA).length} Files Loaded
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
              JD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {!fileUploaded ? (
            <div className="h-full p-8 bg-slate-50/50">
              <DocumentUploader 
                onUploadStart={() => {}} 
                onUploadComplete={() => setFileUploaded(true)} 
              />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="h-full flex">
                   {/* Documents Panel (Left) */}
                   <DocumentList 
                      documents={MOCK_DOCS_DATA} 
                      activeDocId={activeDocId} 
                      onSelect={setActiveDocId} 
                   />
                   
                   {/* Main Analysis (Right) */}
                   <AnalysisDashboard activeDocData={MOCK_DOCS_DATA[activeDocId]} />
                </div>
              )}
              {activeTab === 'chat' && (
                <div className="h-full">
                  <ChatInterface />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}