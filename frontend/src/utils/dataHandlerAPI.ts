/*
 * API client for FinSight frontend. Uses real backend endpoints documented in docs/api-guide.md.
 * This file intentionally mirrors the structure from the dataHandlerAPI demo but strips mock data.
 */

import { APP_BRAND_NAME } from "../config/appConfig";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type FetchOptions = {
	method?: HttpMethod;
	body?: unknown;
	authenticated?: boolean;
	signal?: AbortSignal;
};

interface ImportMetaEnvLite {
	API_BASE_URL?: string;
	VITE_API_URL?: string;
	VITE_API_BASE_URL?: string;
}

interface ExtendedImportMeta extends ImportMeta {
	env?: ImportMetaEnvLite;
}

interface RuntimeWindow extends Window {
	__AI_API_URL?: string;
	__AI_RUNTIME_CONFIG__?: {
		apiBaseUrl?: string;
	};
}

function resolveApiBaseUrl(): string {
	const env = typeof import.meta !== "undefined" ? (import.meta as ExtendedImportMeta).env : undefined;
	const envUrl = env?.API_BASE_URL ?? env?.VITE_API_URL ?? env?.VITE_API_BASE_URL;
	if (envUrl) return envUrl.replace(/\/$/, "");

	if (typeof window !== "undefined") {
		const runtime = window as RuntimeWindow;
		const winUrl = runtime.__AI_API_URL ?? runtime.__AI_RUNTIME_CONFIG__?.apiBaseUrl;
		if (winUrl) return winUrl.replace(/\/$/, "");
	}

	return "http://localhost:8000/api";
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_STORAGE_KEY = "finsight-token";

export interface TokenPayload {
	accessToken: string;
	tokenType: string;
	expiresAt: string;
}

export interface ApiUser {
	id: string;
	name: string;
	email: string;
	isAdmin: boolean;
	joinDate: string;
	sessionCount: number;
	lastActive: string;
}

export interface AuthenticatedResponse {
	token: TokenPayload;
	user: ApiUser;
}

export interface ForgotPasswordResponse {
	message: string;
	temporaryPassword?: string;
}

export interface SessionMetadata {
	title: string;
	createdAt: string;
	lastAccessed: string;
	isActive: boolean;
}

export interface SourceDocument {
	fileName: string;
	fileType?: string;
	fileSizeBytes?: number;
	blobContainer?: string;
	blobPath?: string;
	blobUrl?: string;
	indexName?: string;
}

export type ProcessStage = "pending" | "processing" | "completed" | "failed";

export interface ProcessingStatus {
	overallStatus: ProcessStage;
	steps: {
		docIntelligenceTriggered: boolean;
		dataExtracted: boolean;
		chunksGenerated: boolean;
		embeddingsGenerated: boolean;
		searchIndexed: boolean;
	};
	errorMessage?: string | null;
}

export interface KeyInsight {
	id: string;
	category?: string;
	value: string;
	trend?: string;
	confidenceScore?: number;
}

export interface RiskFactor {
	severity: "Low" | "Medium" | "High";
	description: string;
	sourcePage?: number;
}

export interface FinancialTable {
	tableId: string;
	title: string;
	pageNumber?: number;
	layoutType?: string;
	rows?: Record<string, unknown>[];
}

export interface AnalysisOutput {
	keyInsights?: KeyInsight[];
	identifiedRisks?: RiskFactor[];
	structuredTables?: FinancialTable[];
	notes?: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
	messageId: string;
	role: ChatRole;
	content: string;
	timestamp: string;
	citations?: {
		label: string;
		sourcefile?: string;
		page_range?: string;
	}[];
	userFeedback?: {
		thumbRating: "up" | "down";
		comment?: string;
		submittedAt: string;
	} | null;
	isStreaming?: boolean;
}

export interface AnalysisSession {
	id: string;
	userId: string;
	type?: string;
	version?: string;
	metadata: SessionMetadata;
	sourceDocument: SourceDocument[];
	systemStatus: ProcessingStatus;
	analysisOutput: AnalysisOutput | null;
	chatHistory: ChatMessage[];
	resultsCount?: number;
}

export interface UploadDocumentsResponse {
	sessionId: string;
	blobData: { blobName: string; blobUrl: string }[];
	indexerRunStarted: boolean;
	createdAt: string;
}

export interface ChatResponse {
	answer: string;
	sources: {
		sourcefile: string;
		page_range?: string;
		content?: string;
	}[];
}

export interface FeedbackResponse {
	message: string;
}

function getStoredToken(): string | null {
	try {
		return window.localStorage.getItem(TOKEN_STORAGE_KEY);
	} catch (err) {
		console.warn("Failed to read token from storage", err);
		return null;
	}
}

function persistToken(token: string | null) {
	try {
		if (!token) {
			window.localStorage.removeItem(TOKEN_STORAGE_KEY);
		} else {
			window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
		}
	} catch (err) {
		console.warn("Failed to persist token", err);
	}
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { method = "GET", body, authenticated = false, signal } = options;
	const headers: Record<string, string> = {};
	let fetchBody: BodyInit | undefined;

	const token = authenticated ? getStoredToken() : null;
	if (token) headers["Authorization"] = `Bearer ${token}`;

	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
	if (!isFormData && body !== undefined && body !== null) {
		headers["Content-Type"] = "application/json";
		fetchBody = JSON.stringify(body);
	} else if (isFormData) {
		fetchBody = body as FormData;
	}

	const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		headers,
		body: fetchBody,
		signal,
	});

	if (resp.status === 204) return undefined as unknown as T;

	const contentType = resp.headers.get("content-type") || "";
	const isJson = contentType.includes("application/json");
	const parsed = isJson ? await resp.json() : await resp.text();

	if (!resp.ok) {
		const message = isJson && (parsed as any)?.message ? (parsed as any).message : resp.statusText;
		throw new Error(message || "Request failed");
	}

	return parsed as T;
}

export function getAuthToken(): string | null {
	return getStoredToken();
}

export function clearAuthToken(): void {
	persistToken(null);
}

export async function login(payload: { userId: string; password: string }): Promise<AuthenticatedResponse> {
	const resp = await request<AuthenticatedResponse>("/auth/login", { method: "POST", body: payload });
	persistToken(resp.token.accessToken);
	return resp;
}

export async function signup(payload: { userId: string; name: string; email: string; password: string }): Promise<AuthenticatedResponse> {
	const resp = await request<AuthenticatedResponse>("/auth/signup", { method: "POST", body: payload });
	persistToken(resp.token.accessToken);
	return resp;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
	return request<ForgotPasswordResponse>("/auth/forgotpassword", { method: "POST", body: { email } });
}

export async function fetchCurrentUser(): Promise<ApiUser> {
	return request<ApiUser>("/user/me", { authenticated: true });
}

export async function updateProfile(updates: Partial<Pick<ApiUser, "name" | "email">>): Promise<ApiUser> {
	return request<ApiUser>("/user/me", { method: "PATCH", body: updates, authenticated: true });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
	await request<void>("/user/me/password", {
		method: "POST",
		body: { currentPassword, newPassword },
		authenticated: true,
	});
}

export async function fetchUsers(): Promise<ApiUser[]> {
	return request<ApiUser[]>("/user", { authenticated: true });
}

export async function fetchSessions(includeAll = false): Promise<AnalysisSession[]> {
	const query = includeAll ? "?all=true" : "";
	return request<AnalysisSession[]>(`/session${query}`, { authenticated: true });
}

export async function fetchSession(sessionId: string): Promise<AnalysisSession> {
	return request<AnalysisSession>(`/session/${sessionId}`, { authenticated: true });
}

export async function createSession(payload: Partial<AnalysisSession> & { userId: string }): Promise<AnalysisSession> {
	return request<AnalysisSession>("/session", { method: "POST", body: payload, authenticated: true });
}

export async function updateSession(sessionId: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession> {
	return request<AnalysisSession>(`/session/${sessionId}`, {
		method: "PATCH",
		body: updates,
		authenticated: true,
	});
}

export async function fetchSessionStatus(sessionId: string): Promise<ProcessingStatus> {
	return request<ProcessingStatus>(`/session/${sessionId}/status`, { authenticated: true });
}

export async function uploadDocuments(files: File[], title?: string): Promise<UploadDocumentsResponse> {
	const formData = new FormData();
	files.forEach((file) => formData.append("files", file));
	if (title) formData.append("title", title);
	return request<UploadDocumentsResponse>("/documents/upload", {
		method: "POST",
		body: formData,
		authenticated: true,
	});
}

export async function askChatQuestion(sessionId: string, question: string, topK = 8): Promise<ChatResponse> {
	return request<ChatResponse>(`/session/${sessionId}/chat`, {
		method: "POST",
		body: { question, top_k: topK },
		authenticated: true,
	});
}

export async function fetchInsights(sessionId: string): Promise<AnalysisOutput & { sessionId: string }> {
	return request(`/insights/${sessionId}`, { authenticated: true });
}

export async function submitFeedback(params: {
	sessionId: string;
	messageId: string;
	thumbRating: "up" | "down";
	comment?: string;
}): Promise<FeedbackResponse> {
	const query = new URLSearchParams({
		sessionId: params.sessionId,
		messageId: params.messageId,
		thumbRating: params.thumbRating,
	});
	if (params.comment) query.append("comment", params.comment);
	return request<FeedbackResponse>(`/feedback?${query.toString()}`, {
		method: "POST",
		authenticated: true,
	});
}

export { API_BASE_URL, APP_BRAND_NAME };
