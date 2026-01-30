import { ArrowRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { APP_BRAND_NAME, APP_TAGLINE } from "../config/appConfig";

interface HomePageProps {
	onNavigateToLogin: () => void;
}

export function HomePage({ onNavigateToLogin }: HomePageProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900">
			<div className="max-w-6xl mx-auto px-6 py-16">
				<header className="flex items-center justify-between mb-12">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
							<Sparkles className="w-6 h-6" />
						</div>
						<div>
							<p className="text-xs uppercase tracking-widest text-slate-500">Financial AI</p>
							<h1 className="text-xl font-semibold">{APP_BRAND_NAME}</h1>
						</div>
					</div>
					<Button variant="outline" onClick={onNavigateToLogin} className="hidden sm:flex">
						Sign In
					</Button>
				</header>

				<main className="grid md:grid-cols-2 gap-12 items-center">
					<div className="space-y-6">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-sm">
							<ShieldCheck className="w-4 h-4 text-green-600" />
							Azure-native, RAG-first
						</div>
						<h2 className="text-4xl md:text-5xl font-bold leading-tight">
							Financial report analysis powered by trustworthy AI.
						</h2>
						<p className="text-lg text-slate-600">
							Upload annual reports, filings, and memos. We ingest them with Azure Document Intelligence, enrich with embeddings, and expose a RAG assistant tuned for finance. {APP_TAGLINE}
						</p>
						<div className="flex flex-wrap gap-3">
							<Button size="lg" onClick={onNavigateToLogin}>
								Launch Workspace
								<ArrowRight className="w-4 h-4 ml-2" />
							</Button>
							<Button size="lg" variant="outline" onClick={onNavigateToLogin}>
								View Sessions
							</Button>
						</div>
						<div className="grid grid-cols-2 gap-4 pt-4 text-sm">
							<div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
								<p className="text-slate-500">Document Intelligence</p>
								<p className="text-xl font-semibold flex items-center gap-2">
									<TrendingUp className="w-4 h-4 text-blue-600" />
									Tables, risks, KPIs
								</p>
							</div>
							<div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
								<p className="text-slate-500">RAG Assistant</p>
								<p className="text-xl font-semibold flex items-center gap-2">
									<Sparkles className="w-4 h-4 text-purple-600" />
									Cited answers
								</p>
							</div>
						</div>
					</div>
					<div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs uppercase text-slate-500">Preview</p>
								<p className="text-lg font-semibold">Session timeline</p>
							</div>
							<Badge>Live</Badge>
						</div>
						<div className="space-y-3 text-sm">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								Upload to Azure Blob Storage
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								Extract with Document Intelligence
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								Vectorize and index for search
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								Chat with contextual citations
							</div>
						</div>
						<div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
							<p className="text-sm text-blue-50">Security-first</p>
							<p className="text-xl font-semibold">Cosmos DB + Private Blob Storage</p>
							<p className="text-sm text-blue-50 mt-1">Regional, encrypted at rest, fine-grained access.</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
