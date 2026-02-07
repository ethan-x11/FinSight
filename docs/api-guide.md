# API Guide

Base URL: `http://localhost:8000/api`

Authentication: Bearer token (`Authorization: Bearer <token>`). All endpoints except `/auth/login`, `/auth/signup`, and `/auth/forgotpassword` require a valid token.

## Health

### `GET /`
Liveness probe. Returns service status and name.

**Response**
```json
{
	"status": "running",
	"service": "FinSight API"
}
```

## Auth

### `POST /auth/login`
Authenticate with user ID and password.

**Request**
```json
{
	"userId": "user001",
	"password": "password123"
}
```

**Response**
```json
{
	"token": {
		"accessToken": "<jwt>",
		"tokenType": "bearer",
		"expiresAt": "2025-10-14T12:34:56.789123+00:00"
	},
	"user": {
		"id": "user001",
		"name": "Dr. Sarah Johnson",
		"email": "sarah.j@research.edu",
		"isAdmin": false,
		"joinDate": "2024-09-15T00:00:00+00:00",
		"sessionCount": 23,
		"lastActive": "2025-10-14T10:00:00+00:00"
	}
}
```

### `POST /auth/signup`
Create a user and return a token. `userId` and `email` must be unique.

**Request**
```json
{
	"userId": "newuser01",
	"name": "New User",
	"email": "new.user@example.com",
	"password": "StrongPass!234"
}
```

**Response** — same shape as `/auth/login`.

### `POST /auth/forgotpassword`
Generate a temporary password for the given email. Always responds with success semantics to avoid account enumeration.

**Request**
```json
{
	"email": "user@example.com"
}
```

**Response**
```json
{
	"message": "Temporary password generated. Please update your password after login.",
	"temporaryPassword": "abc123xyz"
}
```

## Users

### `GET /user`
Admin-only. Returns all users.

**Response**
```json
[
	{
		"id": "admin",
		"name": "Admin User",
		"email": "admin@example.com",
		"isAdmin": true,
		"joinDate": "2024-01-01T00:00:00+00:00",
		"sessionCount": 4,
		"lastActive": "2025-10-14T12:00:00+00:00"
	}
]
```

### `GET /user/me`
Return the authenticated user's profile.

### `PATCH /user/me`
Update display name and/or email.

**Request**
```json
{
	"name": "Updated Name",
	"email": "updated.email@example.com"
}
```

### `POST /user/me/password`
Change password after providing the current password.

**Request**
```json
{
	"currentPassword": "OldPass!23",
	"newPassword": "NewPass!45"
}
```

## Sessions

Session objects include metadata, processing status, source documents, optional analysis output, and chat history.

### `GET /session`
- Default: return sessions for the authenticated user.
- `GET /session?all=true`: admin-only, returns all sessions.

**Response**
```json
[
	{
		"id": "sess-001",
		"userId": "user001",
		"type": "analysis_session",
		"version": "1.0",
		"metadata": {
			"title": "Q3 Filing",
			"createdAt": "2025-10-14T10:00:00+00:00",
			"lastAccessed": "2025-10-14T10:05:00+00:00",
			"isActive": true
		},
		"sourceDocument": [
			{
				"fileName": "filing.pdf",
				"fileSize": "210.50KB",
				"blobPath": "filing.pdf",
				"blobContainer": "financial-pdfs",
				"indexName": "financials-chunks"
			}
		],
		"systemStatus": {
			"overallStatus": "processing",
			"steps": {
				"docIntelligenceTriggered": true,
				"dataExtracted": true,
				"chunksGenerated": true,
				"embeddingsGenerated": false,
				"searchIndexed": false
			},
			"errorMessage": null
		},
		"analysisOutput": null,
		"chatHistory": []
	}
]
```

**Admin demo (all sessions, verbose fields)**
```json
[
	{
		"id": "string",
		"userId": "string",
		"type": "analysis_session",
		"version": "1.0",
		"metadata": {
			"title": "string",
			"createdAt": "2026-01-29T19:59:36.994Z",
			"lastAccessed": "2026-01-29T19:59:36.994Z",
			"isActive": true
		},
		"sourceDocument": [
			{
				"fileName": "string",
				"fileSize": "string",
				"blobPath": "string",
				"blobContainer": "string",
				"indexName": "string"
			}
		],
		"systemStatus": {
			"overallStatus": "pending",
			"steps": {
				"docIntelligenceTriggered": false,
				"dataExtracted": false,
				"chunksGenerated": false,
				"embeddingsGenerated": false,
				"searchIndexed": false
			},
			"errorMessage": "string"
		},
		"analysisOutput": {
			"keyInsights": [
				{
					"id": "string",
					"category": "string",
					"value": "string",
					"trend": "string",
					"confidenceScore": 0
				}
			],
			"identifiedRisks": [
				{
					"severity": "Low",
					"description": "string",
					"sourcePage": 0
				}
			]
		},
		"chatHistory": [
			{
				"messageId": "string",
				"role": "user",
				"content": "string",
				"timestamp": "2026-01-29T19:59:36.995Z",
				"citations": [
					{
						"label": "string",
						"snippet": "string",
						"pageIndex": 0
					}
				],
				"userFeedback": {
					"thumbRating": "up",
					"comment": "string",
					"submittedAt": "2026-01-29T19:59:36.995Z"
				},
				"isStreaming": false
			}
		]
	}
]
```

### `GET /session/{id}`
Return details for a specific session (owner or admin only).

**Demo response**
```json
{
	"id": "string",
	"userId": "string",
	"type": "analysis_session",
	"version": "1.0",
	"metadata": {
		"title": "string",
		"createdAt": "2026-01-29T20:01:01.936Z",
		"lastAccessed": "2026-01-29T20:01:01.936Z",
		"isActive": true
	},
	"sourceDocument": [
		{
			"fileName": "string",
			"fileSize": "string",
			"blobPath": "string",
			"blobContainer": "string",
			"indexName": "string"
		}
	],
	"systemStatus": {
		"overallStatus": "pending",
		"steps": {
			"docIntelligenceTriggered": false,
			"dataExtracted": false,
			"chunksGenerated": false,
			"embeddingsGenerated": false,
			"searchIndexed": false
		},
		"errorMessage": "string"
	},
	"analysisOutput": {
		"keyInsights": [
			{
				"id": "string",
				"category": "string",
				"value": "string",
				"trend": "string",
				"confidenceScore": 0
			}
		],
		"identifiedRisks": [
			{
				"severity": "Low",
				"description": "string",
				"sourcePage": 0
			}
		]
	},
	"chatHistory": [
		{
			"messageId": "string",
			"role": "user",
			"content": "string",
			"timestamp": "2026-01-29T20:01:01.936Z",
			"citations": [
				{
					"label": "string",
					"snippet": "string",
					"pageIndex": 0
				}
			],
			"userFeedback": {
				"thumbRating": "up",
				"comment": "string",
				"submittedAt": "2026-01-29T20:01:01.936Z"
			},
			"isStreaming": false
		}
	]
}
```

### `POST /session`
Create a session record. Non-admin users can only create sessions for themselves.

**Request**
```json
{
	"userId": "user001",
	"metadata": {
		"title": "Q3 Filing",
		"createdAt": "2025-10-14T10:00:00+00:00",
		"lastAccessed": "2025-10-14T10:00:00+00:00",
		"isActive": true
	},
	"sourceDocument": [
		{
			"fileName": "filing.pdf",
			"fileSize": "210.50KB",
			"blobPath": "filing.pdf",
			"blobContainer": "financial-pdfs"
		}
	]
}
```

**Response** — session object as in `GET /session`.

### `PATCH /session/{id}`
Update a session's metadata, system status, analysis output, or chat history (owner or admin).

### `DELETE /session/{id}`
Delete a session (owner or admin). The API deletes related Azure Search indexes and stored blobs first, then removes the session record from Cosmos DB.

**Response**
```json
{
	"message": "Session deleted",
	"deletedIndices": ["index-123"],
	"deletedBlobs": ["uploads/abc123_file.pdf"]
}
```

### `GET /session/{id}/status`
Return processing status for a session.

**Response**
```json
{
	"overallStatus": "pending",
	"steps": {
		"docIntelligenceTriggered": false,
		"dataExtracted": false,
		"chunksGenerated": false,
		"embeddingsGenerated": false,
		"searchIndexed": false
	},
	"errorMessage": "string"
}
```

## Documents

### `POST /documents/upload`
Upload one or more financial documents, create a session, and trigger background ingestion (blob storage + Document Intelligence + embeddings + search indexing). Uses multipart form data.

**Request (multipart form-data)**
- `files`: list of files to upload
- `title` (optional): session title

**Response**
```json
{
	"sessionId": "sess-001",
	"blobData": [
		{ "blobName": "filing.pdf", "blobUrl": "https://storage/filing.pdf" }
	],
	"indexerRunStarted": true,
	"createdAt": "2025-10-14T10:00:00+00:00"
}
```

## Chat

### `POST /session/{session_id}/chat`
Ask a question about an analyzed session. Stores user and assistant messages in chat history.

**Request**
```json
{
	"question": "Summarize the revenue drivers",
	"top_k": 8
}
```

**Response**
```json
{
	"answer": "Revenue growth was driven by cloud subscriptions and international expansion.",
	"citations": [
		{
			"sourcefile": "filing.pdf",
			"chunk_id": "chunk-1",
			"heading": "Revenue",
			"page_range": "5-6",
			"content": "Revenue increased due to ..."
		}
	]
}
```

### `POST /session/{session_id}/chat`
Ask a question about an analyzed session. Stores user and assistant messages in chat history.

**Request**
```json
{
	"question": "Summarize the revenue drivers",
	"top_k": 8
}
```

**Response**
```json
{
	"answer": "Nestlé 2022 net profit: CHF 9,270M (9.8% of sales).",
	"citations": [
		{
			"sourcefile": "2024-financial-statements-en.pdf",
			"chunk_id": "chunk-323",
			"page_range": "188"
		}
	]
}
```

## Feedback

### `POST /feedback`
Record thumbs-up/down feedback for a specific chat message. Parameters are accepted as query strings.

**Query Parameters**
- `sessionId` (required)
- `messageId` (required)
- `thumbRating` (required, `up` or `down`)
- `comment` (optional)

**Response**
```json
{ "message": "Feedback recorded" }
```

## Insights

### `GET /insights/{session_id}`
Return persisted insights for a session (owner or admin). Also re-persists the payload to keep it stable across calls.

**Response**
```json
{
	"sessionId": "sess-001",
	"keyInsights": [
		{ "id": "k1", "category": "Profitability", "value": "Gross margin 62%", "trend": "flat", "confidenceScore": 0.74 }
	],
	"risks": [
		{ "severity": "Medium", "description": "High customer concentration", "sourcePage": 12 }
	],
	"notes": "Qualitative document - no summary metrics extracted."
}
```

## Error Handling
- `400` – validation or business-rule errors (e.g., duplicate user, wrong password, empty upload).
- `401` – missing or invalid bearer token.
- `403` – insufficient permission (non-admin requesting admin-only data, or cross-user access).
- `404` – resource not found.
