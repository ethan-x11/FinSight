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

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const runtimeWindow = window as RuntimeWindow;
    const windowUrl = runtimeWindow.__AI_API_URL ?? runtimeWindow.__AI_RUNTIME_CONFIG__?.apiBaseUrl;
    if (windowUrl) {
      return windowUrl;
    }
  }

  return "http://localhost:8000/api";
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_STORAGE_KEY = "ai-coscientist-token";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  joinDate: string;
  sessionCount: number;
  lastActive: string;
}

export interface ApiValidatedSubHypothesis extends SubHypothesisItem {
  scoredArticles: ApiPaperResult[];
  averageScore: number;
  finding: string;
  description: string;
}

export interface ApiValidationCategory {
  category: string;
  subHypothesisList: ApiValidatedSubHypothesis[];
  graphSvg?: string;
}

export type ApiSessionResultPayload =
  | ApiValidationCategory[]
  | ApiPaperResult[]
  | string[]
  | null
  | undefined;

export interface ApiHypothesisValidationResponse {
  id: string;
  hypothesis: string;
  subHypothesis: SubHypothesisGroup[];
  modelProvider: string;
  model: string;
  timestamp: string;
  resultsCount: number;
  results: ApiValidationCategory[];
}

export interface ApiSession {
  id: string;
  userId: string;
  hypothesis: string;
  modelProvider: string;
  model: string;
  timestamp: string;
  resultsCount: number;
  results?: ApiSessionResultPayload;
  subHypothesis?: SubHypothesisGroup[] | null;
}

type ApiSessionResponse = Omit<ApiSession, "resultsCount" | "subHypothesis"> & {
  resultsCount?: unknown;
  results?: ApiSessionResultPayload;
  subHypothesis?: unknown;
  subhypotheses?: unknown;
};

export interface ApiPaperResult {
  no: number;
  id: string;
  title: string;
  year: number;
  designType: string;
  sampleSize: number;
  citationCount: number;
  design: number;
  sample: number;
  recency: number;
  citation: number;
  quality: number;
  relevance: number;
  plausibility: number;
  novelty: number;
  score: number;
  link: string;
  explanation: string;
  qualityExplanation: string;
}

const safeParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const ensureNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const ensureInteger = (value: unknown, fallback = 0): number => {
  const numeric = ensureNumber(value, fallback);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
};

const ensureStringValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return String(value);
  } catch (_error) {
    return fallback;
  }
};

const parseApiPaperResult = (raw: unknown): ApiPaperResult | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const id = candidate.id !== undefined ? String(candidate.id) : "";
  const title = candidate.title !== undefined ? String(candidate.title) : "";
  const link = candidate.link !== undefined ? String(candidate.link) : "";
  if (!id || !title || !link) {
    return null;
  }

  return {
    no: ensureInteger(candidate.no, 0),
    id,
    title,
    year: ensureInteger(candidate.year, 0),
    designType: candidate.designType !== undefined ? String(candidate.designType) : "",
    sampleSize: ensureInteger(candidate.sampleSize, 0),
    citationCount: ensureInteger(candidate.citationCount, 0),
    design: ensureNumber(candidate.design, 0),
    sample: ensureNumber(candidate.sample, 0),
    recency: ensureNumber(candidate.recency, 0),
    citation: ensureNumber(candidate.citation, 0),
    quality: ensureNumber(candidate.quality, 0),
    relevance: ensureNumber(candidate.relevance, 0),
    plausibility: ensureNumber(candidate.plausibility, 0),
    novelty: ensureNumber(candidate.novelty, 0),
    score: ensureNumber(candidate.score, 0),
    link,
    explanation: candidate.explanation !== undefined ? String(candidate.explanation) : "",
    qualityExplanation: candidate.qualityExplanation !== undefined ? String(candidate.qualityExplanation) : "",
  };
};

const parseValidatedSubHypothesis = (raw: unknown): ApiValidatedSubHypothesis | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const title = candidate.subHypothesisTitle !== undefined ? String(candidate.subHypothesisTitle) : "";
  if (!title) {
    return null;
  }
  const rawArticles = Array.isArray(candidate.scoredArticles) ? candidate.scoredArticles : [];
  const scoredArticles = rawArticles
    .map(parseApiPaperResult)
    .filter((article): article is ApiPaperResult => article !== null);

  return {
    subHypothesisTitle: title,
    rationale: candidate.rationale !== undefined ? String(candidate.rationale) : undefined,
    scoredArticles,
    averageScore: ensureNumber(candidate.averageScore, 0),
    finding: candidate.finding !== undefined ? String(candidate.finding) : "",
    description: candidate.description !== undefined ? String(candidate.description) : "",
  };
};

const parseValidationCategory = (raw: unknown): ApiValidationCategory | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const category = candidate.category !== undefined ? String(candidate.category) : "";
  if (!category) {
    return null;
  }
  const rawSubHypotheses = Array.isArray(candidate.subHypothesisList) ? candidate.subHypothesisList : [];
  const subHypothesisList = rawSubHypotheses
    .map(parseValidatedSubHypothesis)
    .filter((entry): entry is ApiValidatedSubHypothesis => entry !== null);

  const graphSvgRaw = typeof candidate.graphSvg === "string" ? candidate.graphSvg.trim() : "";
  const graphSvg = graphSvgRaw ? graphSvgRaw : undefined;

  return { category, subHypothesisList, graphSvg };
};

const looksLikePaperResultArray = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const obj = item as Record<string, unknown>;
    return typeof obj.title === "string" && typeof obj.link === "string";
  });
};

export function normalizeValidationResultsPayload(payload: ApiSessionResultPayload): ApiValidationCategory[] {
  if (!payload) {
    return [];
  }

  if (looksLikePaperResultArray(payload)) {
    const articles = (payload as unknown[])
      .map(parseApiPaperResult)
      .filter((article): article is ApiPaperResult => article !== null);
    const average = articles.length
      ? articles.reduce((sum, article) => sum + ensureNumber(article.score, 0), 0) / articles.length
      : 0;
    return [
      {
        category: "General",
        subHypothesisList: [
          {
            subHypothesisTitle: "Overall Results",
            rationale: undefined,
            scoredArticles: articles,
            averageScore: average,
            finding: "",
            description: "",
          },
        ],
      },
    ];
  }

  const source = Array.isArray(payload) ? payload : [payload];
  return source
    .map((item) => {
      const parsed = typeof item === "string" ? parseValidationCategory(safeParseJson(item)) : parseValidationCategory(item);
      return parsed;
    })
    .filter((entry): entry is ApiValidationCategory => entry !== null);
}

export interface ApiFeedback {
  id: string;
  sessionId: string;
  userId: string;
  paperId: number;
  paperTitle: string;
  query: string;
  explanation: string;
  feedback?: string;
  status: "Liked" | "Disliked" | "Neutral";
  dateTime: string;
}

interface TokenPayload {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface AuthenticatedResponse {
  token: TokenPayload;
  user: ApiUser;
}

interface SignupPayload {
  userId: string;
  name: string;
  email: string;
  password: string;
}

interface LoginPayload {
  userId: string;
  password: string;
}

export interface ForgotPasswordResponse {
  message: string;
  temporaryPassword?: string;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type FetchOptions = {
  method?: HttpMethod;
  body?: unknown;
  authenticated?: boolean;
  signal?: AbortSignal;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function persistToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, authenticated = true, signal } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authenticated) {
    const token = getStoredToken();
    if (!token) {
      throw new Error("Authentication token missing. Please login again.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => {
    throw new Error("Failed to parse API response");
  });

  if (!response.ok) {
    const errorMessage = data?.detail ?? data?.message ?? response.statusText;
    throw new Error(errorMessage);
  }

  return data as T;
}

export function getAuthToken(): string | null {
  return getStoredToken();
}

export function clearAuthToken(): void {
  persistToken(null);
}

export interface ValidationStreamMessage {
  event: string;
  message: string;
  timestamp: string;
}

export interface ValidationStreamHandle {
  close: () => void;
}

interface ValidationStreamOptions {
  streamId: string;
  onMessage: (payload: ValidationStreamMessage) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

function ensureBrowserWebSocket(): void {
  if (typeof window === "undefined" || typeof window.WebSocket === "undefined") {
    throw new Error("Real-time streaming is not supported in this environment.");
  }
}

function toWebSocketUrl(httpUrl: string): string {
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice(8)}`;
  }
  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice(7)}`;
  }
  return httpUrl;
}

function isValidationStreamMessage(payload: unknown): payload is ValidationStreamMessage {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.event === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "string"
  );
}

export function createValidationStream(options: ValidationStreamOptions): ValidationStreamHandle {
  ensureBrowserWebSocket();

  const token = getStoredToken();
  if (!token) {
    throw new Error("Authentication token missing. Please login again.");
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  const websocketBase = toWebSocketUrl(base);
  const streamUrl = `${websocketBase}/stream/validation/${encodeURIComponent(options.streamId)}?token=${encodeURIComponent(token)}`;

  const socket = new WebSocket(streamUrl);
  let closed = false;

  const finalizeClose = (): void => {
    if (closed) return;
    closed = true;
    options.onClose?.();
  };

  const handleOpen = (): void => {
    options.onOpen?.();
  };

  const handleClose = (): void => {
    finalizeClose();
  };

  const handleError = (): void => {
    const error = new Error("WebSocket connection error");
    options.onError?.(error);
  };

  const handleMessage = (event: MessageEvent): void => {
    try {
      const parsed = JSON.parse(event.data);
      if (isValidationStreamMessage(parsed)) {
        options.onMessage(parsed);
      }
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error("Failed to parse stream message"));
    }
  };

  socket.addEventListener("open", handleOpen);
  socket.addEventListener("close", handleClose);
  socket.addEventListener("error", handleError);
  socket.addEventListener("message", handleMessage);

  const cleanup = (): void => {
    socket.removeEventListener("open", handleOpen);
    socket.removeEventListener("close", handleClose);
    socket.removeEventListener("error", handleError);
    socket.removeEventListener("message", handleMessage);
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    finalizeClose();
  };

  return {
    close: cleanup,
  };
}

export async function login(payload: LoginPayload): Promise<AuthenticatedResponse> {
  const result = await request<AuthenticatedResponse>("/login", {
    method: "POST",
    body: payload,
    authenticated: false,
  });
  persistToken(result.token.accessToken);
  return result;
}

export async function signup(payload: SignupPayload): Promise<AuthenticatedResponse> {
  const result = await request<AuthenticatedResponse>("/signup", {
    method: "POST",
    body: payload,
    authenticated: false,
  });
  persistToken(result.token.accessToken);
  return result;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/forgotpassword", {
    method: "POST",
    body: { email },
    authenticated: false,
  });
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  return request<ApiUser>("/user/me");
}

export async function updateProfile(updates: Partial<Pick<ApiUser, "name" | "email">>): Promise<ApiUser> {
  return request<ApiUser>("/user/me", {
    method: "PATCH",
    body: updates,
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request("/user/me/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function fetchUsers(): Promise<ApiUser[]> {
  return request<ApiUser[]>("/user");
}

export async function validateHypothesis(
  params: {
    streamId: string;
    hypothesis: string;
    modelProvider: string;
    model: string;
    maxResults: number;
    subHypothesis: SubHypothesisGroup[];
  },
  options: { signal?: AbortSignal } = {}
): Promise<ApiHypothesisValidationResponse> {
  return request<ApiHypothesisValidationResponse>("/validate", {
    method: "POST",
    body: params,
    signal: options.signal,
  });
}

export interface SubHypothesisItem {
  subHypothesisTitle: string;
  rationale?: string;
}

export interface SubHypothesisGroup {
  category: string;
  subHypothesisList: SubHypothesisItem[];
}

const parseSubHypothesisItemPayload = (raw: unknown): SubHypothesisItem | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const title = ensureStringValue(candidate.subHypothesisTitle ?? candidate.title ?? candidate.name ?? "").trim();
  if (!title) {
    return null;
  }
  const rationaleRaw = ensureStringValue(candidate.rationale ?? candidate.description ?? candidate.summary ?? "");
  const rationale = rationaleRaw.trim() ? rationaleRaw.trim() : undefined;
  return {
    subHypothesisTitle: title,
    rationale,
  };
};

const parseSubHypothesisGroupPayload = (raw: unknown): SubHypothesisGroup | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const category = ensureStringValue(candidate.category ?? candidate.name ?? candidate.label ?? "").trim();
  if (!category) {
    return null;
  }
  const rawList = Array.isArray(candidate.subHypothesisList)
    ? candidate.subHypothesisList
    : Array.isArray((candidate as { subhypotheses?: unknown }).subhypotheses)
    ? ((candidate as { subhypotheses?: unknown }).subhypotheses as unknown[])
    : [];
  const subHypothesisList = rawList
    .map(parseSubHypothesisItemPayload)
    .filter((item): item is SubHypothesisItem => item !== null);
  return {
    category,
    subHypothesisList,
  };
};

export function normalizeSubHypothesisGroups(payload: unknown): SubHypothesisGroup[] {
  if (!payload) {
    return [];
  }
  const source = Array.isArray(payload) ? payload : [payload];
  return source
    .map(parseSubHypothesisGroupPayload)
    .filter((group): group is SubHypothesisGroup => group !== null)
    .map((group) => ({
      category: group.category,
      subHypothesisList: group.subHypothesisList.map((item) => ({ ...item })),
    }));
}

const normalizeSessionResponse = (raw: ApiSessionResponse): ApiSession => {
  const {
    subHypothesis: camelCase,
    subhypotheses: snakeCase,
    resultsCount: rawCount,
    results: rawResults,
    ...rest
  } = raw;

  const base = rest as Record<string, unknown>;
  const normalized: ApiSession = {
    id: ensureStringValue(base.id),
    userId: ensureStringValue(base.userId),
    hypothesis: ensureStringValue(base.hypothesis),
    modelProvider: ensureStringValue(base.modelProvider),
    model: ensureStringValue(base.model),
    timestamp: ensureStringValue(base.timestamp),
    results: rawResults,
    resultsCount: ensureInteger(rawCount, 0),
    subHypothesis: normalizeSubHypothesisGroups(camelCase ?? snakeCase),
  };

  return normalized;
};

export async function fetchSessions(includeAll = false): Promise<ApiSession[]> {
  const query = includeAll ? "?all=true" : "";
  const rawSessions = await request<ApiSessionResponse[]>(`/session${query}`);
  return rawSessions.map(normalizeSessionResponse);
}

export async function fetchSessionsByUser(userId: string): Promise<ApiSession[]> {
  const rawSessions = await request<ApiSessionResponse[]>(`/session/user/${encodeURIComponent(userId)}`);
  return rawSessions.map(normalizeSessionResponse);
}

export async function fetchSession(sessionId: string): Promise<ApiSession> {
  const rawSession = await request<ApiSessionResponse>(`/session/${sessionId}`);
  return normalizeSessionResponse(rawSession);
}

export async function createSession(
  payload: Omit<ApiSession, "id" | "timestamp"> & { id?: string; timestamp?: string },
  options: { signal?: AbortSignal } = {}
): Promise<ApiSession> {
  const rawSession = await request<ApiSessionResponse>("/session", {
    method: "POST",
    body: payload,
    signal: options.signal,
  });
  return normalizeSessionResponse(rawSession);
}

export async function updateSession(sessionId: string, updates: Partial<ApiSession>): Promise<ApiSession> {
  const rawSession = await request<ApiSessionResponse>(`/session/${sessionId}`, {
    method: "PATCH",
    body: updates,
  });
  return normalizeSessionResponse(rawSession);
}

export async function decompose(
  params: {
    streamId: string;
    hypothesis: string;
    modelProvider: string;
    model: string;
    maxResults: number;
  },
  options: { signal?: AbortSignal } = {}
): Promise<{ id: string; hypothesis: string; subHypothesis: SubHypothesisGroup[] }> {
  return request<{ id: string; hypothesis: string; subHypothesis: SubHypothesisGroup[] }>("/decompose", {
    method: "POST",
    body: params,
    signal: options.signal,
  });
}

export async function fetchMockResults(): Promise<ApiPaperResult[]> {
  return request<ApiPaperResult[]>("/mock-results");
}

export async function fetchProviders(): Promise<{ id: string; name: string }[]> {
  return request("/providers");
}

export async function fetchModels(providerId: string): Promise<{
  id: string;
  name: string;
  description?: string;
  providerId: string;
}[]> {
  return request(`/providers/${providerId}/models`);
}

export async function submitFeedback(payload: Omit<ApiFeedback, "id">): Promise<ApiFeedback> {
  return request<ApiFeedback>("/feedback", {
    method: "POST",
    body: payload,
  });
}

export async function fetchFeedback(sessionId?: string): Promise<ApiFeedback[]> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return request<ApiFeedback[]>(`/feedback${query}`);
}
