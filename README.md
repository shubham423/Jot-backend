# Notes + To-Do App Backend

A learning-focused REST API for a combined Notes + To-Do app, built with
Node.js, TypeScript, Express, MongoDB/Mongoose, Zod, and JWT auth. The only
intended client is an Android app (Retrofit/Moshi), so every response uses
one consistent, predictable JSON envelope.

## Tech stack

- Node.js + TypeScript (strict mode)
- Express (web framework)
- MongoDB + Mongoose (ODM)
- Zod (request validation)
- JWT (`jsonwebtoken`) for auth, `bcrypt` for password hashing
- `dotenv` for config

## Architecture

```
src/
  config/        env loading/validation, mongoose connection
  models/        Mongoose schemas (DB-layer validation)
  schemas/       Zod schemas (HTTP request validation)
  middleware/     auth, generic Zod validation, central error handler
  controllers/   HTTP <-> service translation
  services/      business logic + DB calls
  routes/        URL -> middleware chain -> controller wiring
  utils/         AppError, asyncHandler, apiResponse envelope helpers
  types/         Express Request augmentation (req.userId)
  app.ts         builds the Express app
  server.ts      connects to MongoDB, starts the HTTP server
```

Every file has a comment at the top explaining its single responsibility.
The general request flow for any protected route is:

```
route -> Zod validation middleware -> JWT auth middleware -> controller
       -> service -> Mongoose model -> MongoDB
       (and the result/error flows back the same path)
```

### Why both Zod AND Mongoose validate things

They protect two different boundaries:

- **Zod** validates the raw HTTP request (body/params/query) the moment it
  enters the system, before any business logic runs. Its job is to produce
  a clean `400 Bad Request` for malformed client input.
- **Mongoose** validates documents at the database layer, for ANY code path
  that creates/updates a document - not just the one HTTP route we wrote a
  Zod schema for. It's a second line of defense that protects data
  integrity regardless of how the document was constructed.

They're not redundant - removing either one leaves a real gap.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in real values:
   ```
   cp .env.example .env
   ```
3. Make sure MongoDB is running locally (or point `MONGODB_URI` at a remote
   instance, e.g. MongoDB Atlas).
4. Run in dev mode (hot reload via `tsx watch`):
   ```
   npm run dev
   ```
5. Or build + run the compiled JS:
   ```
   npm run build
   npm start
   ```

The server starts on `http://localhost:4000` by default (configurable via
`PORT`). A simple health check is available at `GET /health`.

## Response envelope

Every response, success or error, uses the same shape:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "message": "...", "details": null } }
```

## Endpoints

Base path: `/api`

### Auth

| Method | Path                | Auth | Body                          |
|--------|---------------------|------|--------------------------------|
| POST   | `/api/auth/register`| No   | `{ email, password }`         |
| POST   | `/api/auth/login`   | No   | `{ email, password }`         |

### Notes (all require `Authorization: Bearer <token>`)

| Method | Path             | Notes                                   |
|--------|------------------|------------------------------------------|
| POST   | `/api/notes`     | Create a note                            |
| GET    | `/api/notes`     | `?search=&page=&limit=`                 |
| GET    | `/api/notes/:id` | 404 if not found or not owned by you     |
| PUT    | `/api/notes/:id` | Partial update (title and/or content)    |
| DELETE | `/api/notes/:id` | Delete                                   |

### Todos (all require `Authorization: Bearer <token>`)

| Method | Path             | Notes                                            |
|--------|------------------|---------------------------------------------------|
| POST   | `/api/todos`     | Create a todo                                    |
| GET    | `/api/todos`     | `?completed=true|false&sort=createdAt|dueDate`   |
| GET    | `/api/todos/:id` |                                                   |
| PATCH  | `/api/todos/:id` | Partial update, including toggling `completed`   |
| DELETE | `/api/todos/:id` |                                                   |

## Example requests (curl)

Replace `TOKEN` with the `data.token` value returned by register/login.

### Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "supersecret123"}'
```

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "supersecret123"}'
```

### Create a note

```bash
curl -X POST http://localhost:4000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title": "Groceries", "content": "Milk, eggs, bread"}'
```

### List notes (with search + pagination)

```bash
curl "http://localhost:4000/api/notes?search=grocer&page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

### Get one note

```bash
curl http://localhost:4000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN"
```

### Update a note

```bash
curl -X PUT http://localhost:4000/api/notes/NOTE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content": "Milk, eggs, bread, butter"}'
```

### Delete a note

```bash
curl -X DELETE http://localhost:4000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN"
```

### Create a todo

```bash
curl -X POST http://localhost:4000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title": "Pay rent", "dueDate": "2026-07-01T00:00:00.000Z"}'
```

### List todos (filter + sort)

```bash
curl "http://localhost:4000/api/todos?completed=false&sort=dueDate" \
  -H "Authorization: Bearer TOKEN"
```

### Get one todo

```bash
curl http://localhost:4000/api/todos/TODO_ID \
  -H "Authorization: Bearer TOKEN"
```

### Toggle a todo as completed

```bash
curl -X PATCH http://localhost:4000/api/todos/TODO_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"completed": true}'
```

### Delete a todo

```bash
curl -X DELETE http://localhost:4000/api/todos/TODO_ID \
  -H "Authorization: Bearer TOKEN"
```

## Future additions

These are intentionally NOT built, to keep this a focused fundamentals
project - but worth knowing about as natural next steps:

- **Refresh tokens** - currently a single JWT expires after `JWT_EXPIRES_IN`
  and the user just has to log in again; a refresh-token flow would let the
  app silently renew access without forcing a re-login.
- **Rate limiting** - protecting `/api/auth/login` and `/register` against
  brute-force/credential-stuffing attempts.
- **Redis** - for caching or for storing refresh tokens / blocklists.
- **Docker** - containerizing the app and MongoDB for easier setup.
- **File uploads** - e.g. attaching images to notes.
- **Pagination metadata standardization** - e.g. a shared `meta` envelope
  field across all list endpoints instead of per-resource shapes.
- **Automated tests** - unit tests for services, integration tests for
  routes (e.g. with Jest + supertest + mongodb-memory-server).
- **Soft deletes / trash** - instead of permanently deleting notes/todos.
- **WebSockets** - real-time sync across multiple devices.

## Suggested reading order

If you're new to this codebase, read in this order to build understanding
layer by layer:

1. [src/config/env.ts](src/config/env.ts) - see how config is loaded/validated once at startup.
2. [src/models/user.model.ts](src/models/user.model.ts), [src/models/note.model.ts](src/models/note.model.ts), [src/models/todo.model.ts](src/models/todo.model.ts) - the data shapes everything else builds on.
3. [src/utils/AppError.ts](src/utils/AppError.ts), [src/utils/asyncHandler.ts](src/utils/asyncHandler.ts), [src/utils/apiResponse.ts](src/utils/apiResponse.ts) - the small primitives every other layer depends on.
4. [src/schemas/auth.schema.ts](src/schemas/auth.schema.ts) and [src/middleware/validate.middleware.ts](src/middleware/validate.middleware.ts) - how requests get validated at the edge.
5. [src/types/express.d.ts](src/types/express.d.ts) and [src/middleware/auth.middleware.ts](src/middleware/auth.middleware.ts) - how JWT auth attaches `req.userId`.
6. [src/middleware/error.middleware.ts](src/middleware/error.middleware.ts) - how thrown errors become HTTP responses.
7. [src/services/auth.service.ts](src/services/auth.service.ts) -> [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts) -> [src/routes/auth.routes.ts](src/routes/auth.routes.ts) - a full vertical slice, start to finish.
8. [src/services/note.service.ts](src/services/note.service.ts) and [src/services/todo.service.ts](src/services/todo.service.ts) - the same pattern applied twice more, now with user-scoping.
9. [src/app.ts](src/app.ts) and [src/server.ts](src/server.ts) - how it all gets wired together and started.

## Build order (if implementing this by hand)

1. Project setup: `package.json`, `tsconfig.json`, `.env.example`.
2. `config/env.ts`, `config/db.ts` - get config and DB connection working first; nothing else can run without them.
3. `models/` - define your data shapes before you write anything that uses them.
4. `utils/AppError.ts`, `utils/asyncHandler.ts`, `utils/apiResponse.ts` - small, dependency-free helpers used everywhere else.
5. `middleware/error.middleware.ts` - build this before any routes, so from the start every error you hit has somewhere sane to go.
6. `app.ts` + `server.ts` with just the health check route - confirm the server boots and connects to MongoDB before adding any real features.
7. Auth vertical slice: `schemas/auth.schema.ts` -> `middleware/validate.middleware.ts` -> `services/auth.service.ts` -> `controllers/auth.controller.ts` -> `routes/auth.routes.ts`. Get register/login fully working and tested with curl before moving on.
8. `types/express.d.ts` + `middleware/auth.middleware.ts` - now that you have tokens to test with, build the auth-protection middleware.
9. Notes vertical slice, same shape as auth: schema -> service -> controller -> routes, now also wired through `requireAuth`.
10. Todos vertical slice - by now the pattern repeats, so this should be the fastest of the three.
11. Wire everything into `app.ts`, write the README, do a final pass with curl through every endpoint.
