# API Contracts

## Overview

The application exposes a REST API through Next.js API Route Handlers. All endpoints are under `/api/` and return JSON responses.

## Base URL

```
http://localhost:3000/api
```

## Authentication

**None** - The API is currently unauthenticated (single-user assumption).

---

## Taxonomy Endpoints

### GET /api/taxonomy

Fetch all taxonomy nodes.

**Request:**
```http
GET /api/taxonomy
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "abc123",
      "name": "Corporate Reputation",
      "description": "Building and maintaining corporate reputation",
      "objective": "Establish company as industry leader",
      "notes": "Internal tracking note",
      "audiences": ["Media", "Investors"],
      "geographies": ["Global", "North America"],
      "parentId": null,
      "level": "pillar",
      "order": 0,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-20T14:45:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### POST /api/taxonomy

Create a new taxonomy node.

**Request:**
```http
POST /api/taxonomy
Content-Type: application/json

{
  "name": "Sustainability",
  "description": "Environmental initiatives",
  "objective": "Position as sustainable leader",
  "notes": "Q2 focus area",
  "parentId": "abc123"
}
```

**Request Schema (Zod):**
```typescript
{
  name: z.string().min(1).max(200),           // Required
  description: z.string().max(1000).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  parentId: z.string().nullable()              // Required (null for pillars)
}
```

**Response:**
```json
{
  "node": {
    "id": "xyz789",
    "name": "Sustainability",
    "description": "Environmental initiatives",
    "objective": "Position as sustainable leader",
    "notes": "Q2 focus area",
    "parentId": "abc123",
    "level": "narrative_theme",
    "order": 2,
    "createdAt": "2026-01-30T09:00:00.000Z",
    "updatedAt": "2026-01-30T09:00:00.000Z"
  }
}
```

**Behavior:**
- Level is automatically determined from parent
- Order is set to end of siblings
- ID generated via nanoid(10)
- Timestamps set to current time

**Status Codes:**
- `201` - Created
- `400` - Invalid request (validation error)
- `404` - Parent node not found
- `500` - Server error

**Error Response:**
```json
{
  "error": "Invalid request",
  "details": {
    "fieldErrors": {
      "name": ["Name is required"]
    }
  }
}
```

---

### GET /api/taxonomy/[id]

Fetch a single taxonomy node.

**Request:**
```http
GET /api/taxonomy/abc123
```

**Response:**
```json
{
  "node": {
    "id": "abc123",
    "name": "Corporate Reputation",
    "level": "pillar",
    ...
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Node not found
- `500` - Server error

---

### PUT /api/taxonomy/[id]

Update a taxonomy node.

**Request:**
```http
PUT /api/taxonomy/abc123
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "objective": "Updated objective",
  "notes": "Updated notes",
  "audiences": ["Media", "Customers"],
  "geographies": ["Global"]
}
```

**Request Schema (Zod):**
```typescript
{
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  audiences: z.array(z.string()).optional(),
  geographies: z.array(z.string()).optional()
}
```

**Response:**
```json
{
  "node": {
    "id": "abc123",
    "name": "Updated Name",
    "updatedAt": "2026-01-30T10:00:00.000Z",
    ...
  }
}
```

**Behavior:**
- Only provided fields are updated
- `updatedAt` timestamp automatically updated
- Cannot change: id, parentId, level, order, createdAt

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `404` - Node not found
- `500` - Server error

---

### DELETE /api/taxonomy/[id]

Delete a taxonomy node and all its descendants.

**Request:**
```http
DELETE /api/taxonomy/abc123
```

**Response:**
```json
{
  "message": "Node and descendants deleted",
  "deleted": ["abc123", "child1", "child2", "grandchild1"]
}
```

**Behavior:**
- Cascading delete - removes all descendants
- Returns array of all deleted IDs
- Irreversible operation

**Status Codes:**
- `200` - Success
- `404` - Node not found
- `500` - Server error

---

### GET /api/taxonomy/export

Export taxonomy data as JSON or CSV.

**Request (JSON):**
```http
GET /api/taxonomy/export?format=json
```

**Response (JSON):**
```json
{
  "taxonomy": [
    {
      "id": "abc123",
      "name": "Corporate Reputation",
      "children": [
        {
          "id": "xyz789",
          "name": "Sustainability",
          "children": []
        }
      ]
    }
  ]
}
```

**Request (CSV):**
```http
GET /api/taxonomy/export?format=csv
```

**Response (CSV):**
```csv
ID,Name,Level,Pillar,Narrative Theme,Subject,Topic,Subtopic,Objective,Description,Notes,Audiences,Geographies,Created,Updated
abc123,Corporate Reputation,Pillar,Corporate Reputation,,,,,"Establish leader",,,,2026-01-15,2026-01-20
xyz789,Sustainability,Narrative Theme,Corporate Reputation,Sustainability,,,,"Green initiatives",,,,2026-01-20,2026-01-20
```

**Headers:**
- JSON: `Content-Type: application/json`
- CSV: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="taxonomy.csv"`

**Status Codes:**
- `200` - Success
- `500` - Server error

---

## Settings Endpoints

### GET /api/settings

Fetch current settings (audiences and geographies).

**Request:**
```http
GET /api/settings
```

**Response:**
```json
{
  "settings": {
    "availableAudiences": [
      "Internal Employees",
      "Executives",
      "Investors",
      "Media",
      "Customers",
      "Partners",
      "Government",
      "General Public"
    ],
    "availableGeographies": [
      "Global",
      "North America",
      "Europe",
      "Asia Pacific",
      "Latin America",
      "Middle East & Africa"
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### PUT /api/settings

Update settings.

**Request:**
```http
PUT /api/settings
Content-Type: application/json

{
  "availableAudiences": ["Media", "Investors", "New Audience"],
  "availableGeographies": ["Global", "Europe"]
}
```

**Request Schema (Zod):**
```typescript
{
  availableAudiences: z.array(z.string().min(1).max(100)).optional(),
  availableGeographies: z.array(z.string().min(1).max(100)).optional()
}
```

**Response:**
```json
{
  "settings": {
    "availableAudiences": ["Media", "Investors", "New Audience"],
    "availableGeographies": ["Global", "Europe"]
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `500` - Server error

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "details": { ... }  // Optional validation details
}
```

## Rate Limiting

**None** - No rate limiting implemented.

## CORS

Handled by Next.js defaults (same-origin only).

---
*Generated by BMAD Document Project Workflow v1.2.0*
