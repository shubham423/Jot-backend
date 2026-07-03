# Jot API — Guide for the Android App

Welcome! This document explains everything you need to talk to the Jot backend from the Android app. No prior API experience assumed — read it top to bottom once, then use it as a reference.

---

## 1. The basics

**What is this?** The backend is a server that stores users, notes, and to-dos in a database. Your Android app talks to it over the internet by sending HTTP requests and reading JSON responses.

**Base URL** (every request starts with this):

```
https://jot-backend-zx3h.onrender.com
```

**⚠️ Important quirk — the server "sleeps":** we host on a free plan, so after ~15 minutes with no traffic the server shuts down. The next request wakes it up, which takes **30–60 seconds**. So if your very first request after a break fails with a timeout — that's not a bug in your code. Just retry. Set your HTTP client timeout to at least 60 seconds during development.

**Quick health check:** open this in any browser to confirm the server is awake:

```
GET https://jot-backend-zx3h.onrender.com/health
→ { "success": true, "data": { "status": "ok" } }
```

---

## 2. Every response has the same shape

You never have to guess. Success always looks like:

```json
{ "success": true, "data": <the thing you asked for> }
```

Failure always looks like:

```json
{ "success": false, "error": { "message": "What went wrong", "details": <sometimes extra info> } }
```

So in Kotlin you can check `success` first, then read either `data` or `error.message`. `error.message` is safe to show to the user.

**Status codes you'll see:**

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful read/update/delete |
| 201 | Created | Successful register / new note / new todo |
| 400 | Bad request | You sent invalid data (e.g. empty title, malformed date) |
| 401 | Unauthorized | Missing/expired token → send the user to the login screen |
| 404 | Not found | That note/todo doesn't exist (or belongs to another user) |
| 409 | Conflict | Registering an email that already exists |
| 500 | Server error | Our bug, not yours |

---

## 3. Logging in: how the token works

Think of the token like a **wristband at an event**. You show your ID once at the entrance (login with email+password), they give you a wristband (the token), and after that you just show the wristband everywhere.

1. Call **register** or **login** → the response contains a `token` (a long string).
2. Save it on the device (encrypted SharedPreferences / DataStore).
3. Send it with **every** notes/todos request, in a header:

```
Authorization: Bearer <the token>
```

(That's the word `Bearer`, a space, then the token.)

4. The token expires after **7 days**. When any request returns `401`, delete the saved token and show the login screen again.

---

## 4. Auth endpoints (no token needed)

### Register — `POST /api/auth/register`

Creates an account. Body (JSON):

```json
{ "email": "test@example.com", "password": "password123" }
```

Rules: `email` must be a valid email. `password` must be **at least 8 characters**.

Success `201`:

```json
{ "success": true, "data": { "token": "eyJhbGciOi..." } }
```

Errors: `400` invalid email/short password · `409` email already registered.

### Login — `POST /api/auth/login`

Same body as register. Success `200`, same shape (returns a fresh `token`).
Error `401` — wrong email or password (message is intentionally vague for security).

---

## 5. Notes endpoints (token required)

A note object looks like:

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "title": "Trip to Jaipur",
  "content": "Book train tickets…",
  "createdAt": "2026-07-02T10:30:00.000Z",
  "updatedAt": "2026-07-02T14:05:00.000Z"
}
```

`_id` is the note's unique identifier — you'll use it in URLs for get/update/delete.

### List my notes — `GET /api/notes`

Optional query parameters (add to the URL):

| Param | What it does | Example |
|-------|--------------|---------|
| `search` | Only notes matching this text | `?search=jaipur` |
| `page` | Which page of results (starts at 1) | `?page=2` |
| `limit` | Notes per page (max 100, default 20) | `?limit=10` |

Combined example: `GET /api/notes?search=trip&page=1&limit=10`

### Create — `POST /api/notes`

```json
{ "title": "My note", "content": "Optional body text" }
```

`title` is required and can't be empty. `content` is optional. Returns `201` with the created note (grab `_id` from it).

### Get one — `GET /api/notes/{id}`
### Update — `PUT /api/notes/{id}`

Send only what changed — but at least one field:

```json
{ "title": "New title" }
```

### Delete — `DELETE /api/notes/{id}`

Errors for all of these: `400` malformed id · `401` bad token · `404` no such note (you also get 404 for notes that belong to a *different* user — you can never see or touch someone else's data).

---

## 6. To-do endpoints (token required)

A todo object:

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0e",
  "title": "Buy groceries",
  "completed": false,
  "dueDate": "2026-07-10T18:00:00.000Z",
  "createdAt": "2026-07-03T08:00:00.000Z",
  "updatedAt": "2026-07-03T08:00:00.000Z"
}
```

### List — `GET /api/todos`

| Param | What it does | Example |
|-------|--------------|---------|
| `completed` | Filter: exactly `true` or `false` | `?completed=false` |
| `sort` | `createdAt` (default) or `dueDate` | `?sort=dueDate` |

### Create — `POST /api/todos`

```json
{ "title": "Buy groceries", "dueDate": "2026-07-10T18:00:00.000Z" }
```

`title` required. `dueDate` optional — but if you send it, it must be a **full ISO 8601 datetime** exactly like above (`"2026-07-10"` alone will be rejected with 400).

### Get one — `GET /api/todos/{id}`

### Update — `PATCH /api/todos/{id}` ← note: PATCH, not PUT

Send any subset of fields (at least one). Ticking a checkbox is just:

```json
{ "completed": true }
```

### Delete — `DELETE /api/todos/{id}`

---

## 7. Android tips

- **Retrofit base URL:** `https://jot-backend-zx3h.onrender.com/` (keep the trailing slash — Retrofit requires it).
- Add the token with an **OkHttp Interceptor** so you don't repeat it in every call.
- Dates come as ISO 8601 strings — parse with `java.time.Instant.parse(...)`.
- The JSON key for a note/todo id is `_id` (with underscore) — map it in Moshi/Gson with `@Json(name = "_id")` / `@SerializedName("_id")`.
- Test everything in **Postman first** (see `docs/Jot-API.postman_collection.json` in this repo — import it into Postman and every request is pre-built). When a call works in Postman but not in your app, compare the two requests — it's almost always a missing header or a typo in the URL.

Questions? Every endpoint above maps to a file in `src/routes/` — the code is heavily commented and beginner-friendly, so don't be afraid to read it.
