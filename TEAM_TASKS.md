# Team Task Assignment: AI-Powered Evangadi Forum

**Group size:** 7 members  
**Branch strategy:** Each person works on their own feature branch and opens a PR into `main`.

---

## Current Status (as of project start)

| Area | Status |
|------|--------|
| Backend: Auth (register, login) | ✅ Done |
| Backend: Question routes + validators | ✅ Scaffolded (controller & service files are **empty**) |
| Backend: Answer controller | ❌ Not started |
| Backend: All RAG endpoints | ❌ Not started |
| Frontend: Auth page, Landing, Layout, Navbar, Sidebar | ✅ Done |
| Frontend: AuthContext + ProtectedRoute | ✅ Done |
| Frontend: api.client.js + auth.service.js | ✅ Done |
| Frontend: Dashboard | ⚠️ Stub only (welcome message, no data) |
| Frontend: PostQuestion, QuestionDetail, MyQuestions, RagDocuments | ❌ Not started |
| Frontend: question.service.js, answer.service.js, rag.service.js | ❌ Not started |

---

## Dependency Chain

```
[Auth ✅] ──► [BE: Questions Core] ──► [FE: Dashboard + PostQuestion]
                                   └──► [FE: QuestionDetail + MyQuestions]
           ──► [BE: Answers] ──────────► [FE: QuestionDetail + MyQuestions]
           ──► [BE: Questions AI]
           ──► [BE: RAG Core] ────────► [FE: RAG Documents]
           ──► [BE: RAG AI] ──────────► [FE: RAG Documents]
```

> **Rule:** Backend tasks in the same phase can run in **parallel**.  
> Frontend tasks must wait for their dependent backend tasks to be merged first.

---

## Phase 1 — Backend (All 5 backend tasks start simultaneously)

### Person 1 — Backend: Questions Core
**Tasks:** T-09, T-10 (partial)  
**Branch:** `feature/T-09-T-10-questions-core`

**What to build:**
- `backend/src/api/question/controller/questions.controller.js`
  - `createQuestionController` — extract `title`, `content`, `req.user.id`; call service; return 201
  - `getQuestionsController` — extract optional `q` and `mine` query params; call service; return 200
  - `getSingleQuestionController` — extract `questionHash` param; call service; return 200
- `backend/src/api/question/service/question.service.js`
  - `createQuestionWithVectorService({ title, content, userId })` — generate 16-char hash, insert into `questions`, trigger embedding via `vector.service.js`
  - `getQuestionsService({ search, userId, mine })` — query `questions` joined with users + answer count; support keyword `LIKE` filter
  - `getSingleQuestionService({ questionHash })` — fetch question + all answers with author info
- `backend/src/api/routes.js` — register question routes: `mainRouter.use('/questions', questionRoutes)`

**Reference files:** `tasks/backend/question/create-question.md`, `tasks/backend/question/list-questions.md`, `tasks/backend/question/single-question.md`

**Unblocks:** Person 6 (Frontend Dashboard + PostQuestion), Person 7 (Frontend QuestionDetail + MyQuestions)

---

### Person 2 — Backend: Questions AI & Search
**Tasks:** T-11, T-17, T-18  
**Branch:** `feature/T-11-T-17-T-18-questions-ai`

> Coordinate with Person 1 — you are both writing to `questions.controller.js` and `question.service.js`. Agree on a merge order or use separate commits to avoid conflicts.

**What to build:**
- `backend/src/api/question/controller/questions.controller.js` — add these controllers:
  - `searchQuestionsSemanticController` — extract `q`; call service; return 200
  - `getSimilarQuestionsController` — extract `questionHash`; call service; return 200
  - `generateQuestionDraftCoachController` — extract `title`, `content`; call Gemini service; return 200
  - `assessAnswerAgainstQuestionController` — extract `questionHash`, `answerDraft`; call Gemini service; return 200
- `backend/src/api/question/service/question.service.js` — add:
  - `searchQuestionsSemanticService({ query })` — embed query via `vector.service.js`, cosine search `question_vectors`
  - `getSimilarQuestionsService({ questionHash })` — fetch existing vector, cosine search, return top results
- Check and complete `backend/src/api/question/service/vector.service.js` — must expose `generateEmbedding(text)` and `cosineSimilaritySearch(vector, limit)`
- Check and complete `backend/src/api/question/service/geminiTextCoach.service.js` — must expose `coachQuestionDraft({ title, content })` and `assessAnswerFit({ questionTitle, questionContent, answerDraft })`

**Reference files:** `tasks/backend/question/search-questions.md`, `tasks/backend/question/similar-questions.md`, `tasks/backend/question/draft-coach.md`, `tasks/backend/question/answer-fit.md`

---

### Person 3 — Backend: Answers
**Tasks:** T-12  
**Branch:** `feature/T-12-answers`

**What to build:**
- `backend/src/api/answewr/validation/answer.validation.js` *(note: folder is `answewr` — keep consistent)*
  - `createAnswerValidation` — `questionId` must be integer, `content` min 20 chars
- `backend/src/api/answewr/validation/answer.controller.js` — complete the existing stub:
  - Finish `createAnswerController` (already started)
  - Add `getAnswersController` (list answers for a question, max 100, sortable)
- `backend/src/api/answewr/service/answer.service.js` *(new file)*
  - `createAnswerService({ questionId, content, userId })` — verify question exists, block self-answer, insert, return with author
  - `getAnswersService({ questionId, sort })` — fetch answers with author info
- `backend/src/api/answewr/routes/answer.routes.js` *(new file)*
  - `POST /` → `authenticateUser`, `createAnswerValidation`, `createAnswerController`
  - `GET /` → `authenticateUser`, `getAnswersController` (with `?questionId=` query param)
- `backend/src/api/routes.js` — register: `mainRouter.use('/answers', answerRoutes)`

**Reference files:** `tasks/backend/answer/create-answer.md`

**Unblocks:** Person 7 (Frontend QuestionDetail needs `POST /api/answers`)

---

### Person 4 — Backend: RAG Core
**Tasks:** T-22 (upload), T-24 (list, delete, get-meta, get-file)  
**Branch:** `feature/T-22-T-24-rag-core`

**What to build (new directory: `backend/src/api/rag/`):**
- `backend/src/api/rag/routes/rag.routes.js`
  - `POST /documents` → upload + process PDF
  - `GET /documents` → list my documents
  - `DELETE /documents/:documentId` → delete document + vectors
  - `GET /documents/:documentId` → get metadata
  - `GET /documents/:documentId/file` → stream PDF blob
- `backend/src/api/rag/controller/rag.controller.js`
  - `uploadDocumentController`, `listDocumentsController`, `deleteDocumentController`, `getDocumentMetaController`, `getDocumentFileController`
- `backend/src/api/rag/service/rag.service.js`
  - `uploadAndProcessDocument({ file, userId })` — save PDF to disk, parse text, chunk paragraphs, generate embeddings, store in `rag_documents` + `rag_chunks` tables; set `status: 'processing'` then `'ready'`
  - `listDocumentsService({ userId })`
  - `deleteDocumentService({ documentId, userId })` — cascade delete chunks + file
  - `getDocumentMetaService({ documentId, userId })`
  - `streamDocumentFileService({ documentId, userId })` — read PDF from disk, pipe to response
- `backend/src/api/routes.js` — register: `mainRouter.use('/rag', ragRoutes)`

**Reference files:** `tasks/backend/rag/create-document.md`, `tasks/backend/rag/list-documents.md`, `tasks/backend/rag/delete-document.md`, `tasks/backend/rag/get-document-meta.md`, `tasks/backend/rag/get-document-file.md`

**Unblocks:** Person 4's own frontend work (RAG Documents page, Phase 2)

---

### Person 5 — Backend: RAG AI (Search + Query)
**Tasks:** T-23  
**Branch:** `feature/T-23-rag-ai`

> Coordinate with Person 4 — you are adding routes and controllers to the same RAG directory.

**What to build:**
- Add to `backend/src/api/rag/routes/rag.routes.js`:
  - `GET /documents/:documentId/search` → semantic search in PDF
  - `POST /documents/:documentId/query` → AI-grounded answer from PDF
- Add to `backend/src/api/rag/controller/rag.controller.js`:
  - `searchDocumentController`, `queryDocumentController`
- Add to `backend/src/api/rag/service/rag.service.js`:
  - `searchDocumentService({ documentId, userId, query })` — embed query, cosine search `rag_chunks`, return ranked excerpts with scores
  - `queryDocumentService({ documentId, userId, query })` — retrieve top chunks, build context, call Gemini with strict grounding prompt, return structured answer with citations

**Reference files:** `tasks/backend/rag/search-document.md`, `tasks/backend/rag/query-document.md`

**Unblocks:** Person 4's RAG Documents page (Phase 2 Ask AI + Search tabs)

---

## Phase 2 — Frontend (start after backend PRs are merged)

### Person 6 — Frontend: Dashboard + Post Question
**Tasks:** T-14, T-15  
**Branch:** `feature/FE-dashboard-post-question`  
**Depends on:** Person 1's PR merged (`/api/questions` working)

**What to build:**
- `frontend/src/services/question/question.service.js` *(new file)*
  - `getQuestions({ search })` → `GET /api/questions?q=...`
  - `searchQuestionsSemantic(query)` → `GET /api/questions/search?q=...`
  - `createQuestion({ title, content })` → `POST /api/questions`
  - `getSingleQuestion(questionHash)` → `GET /api/questions/:questionHash`
  - `generateQuestionDraftCoach({ title, content })` → `POST /api/questions/draft-coach`
  - `assessAnswerFit(questionHash, answerText)` → `POST /api/questions/:questionHash/answer-fit`
- `frontend/src/pages/Dashboard/Dashboard.jsx` — **replace the stub** with full implementation:
  - Fetch all questions on mount
  - Keyword search toggle vs semantic search toggle
  - Loading/error/empty states
  - Question cards (title, author, answer count, date) → navigate to `/questions/:questionHash`
- `frontend/src/pages/PostQuestion/PostQuestion.jsx` *(new file)*
  - Route: `/questions/ask`
  - Title + content form with validation
  - "Get AI Feedback" button → calls `generateQuestionDraftCoach`, renders tips panel
  - "Post Question" button → calls `createQuestion`, redirects to `/dashboard`
  - Loading/disabled states during API calls

**Reference files:** `tasks/frontend/dashboard/task-dashboard.md`, `tasks/frontend/post-question/task-post-question.md`

> Also add the route for `/questions/ask` in `frontend/src/App.jsx`.

---

### Person 7 — Frontend: Question Detail + My Questions
**Tasks:** T-16, T-20, T-21  
**Branch:** `feature/FE-question-detail-my-questions`  
**Depends on:** Person 1's PR merged (questions) + Person 3's PR merged (answers)

**What to build:**
- `frontend/src/services/answer/answer.service.js` *(new file)*
  - `postAnswer({ questionId, content })` → `POST /api/answers`
- `frontend/src/pages/QuestionDetail/QuestionDetail.jsx` *(new file)*
  - Route: `/questions/:questionHash`
  - Fetch question + answers on mount via `getSingleQuestion(questionHash)` from `question.service.js`
  - Render question title, body (use `react-markdown`), author, date
  - Render answers list with author + content
  - Post Answer form (min 20 chars); hide form or show message if user is the question author
  - "Check Answer Fit" button → calls `assessAnswerFit`, shows level (strong/partial/weak) + note in feedback panel
  - On answer submit → call `postAnswer`, append result to list, clear textarea
- `frontend/src/pages/MyQuestions/MyQuestions.jsx` *(new file)*
  - Route: `/my-questions`
  - Calls `getQuestions({ mine: true })` using `question.service.js`
  - Same card layout as Dashboard but filtered to the logged-in user's questions
  - Loading/error/empty states

**Reference files:** `tasks/frontend/question-detail/task-question-detail.md`, `tasks/frontend/my-questions/task-my-questions.md`

> Add routes for `/questions/:questionHash` and `/my-questions` in `frontend/src/App.jsx`.

---

### Person 4 — Frontend: RAG Documents (Phase 2 continuation)
**Tasks:** T-24 (frontend), T-25  
**Branch:** `feature/FE-rag-documents` *(new branch from your merged backend branch)*  
**Depends on:** Person 4's own backend PR + Person 5's backend PR merged

**What to build:**
- `frontend/src/services/rag/rag.service.js` *(new file)*
  - `listDocuments()` → `GET /api/rag/documents`
  - `uploadPdf(file)` → `POST /api/rag/documents` (multipart/form-data)
  - `deleteDocument(documentId)` → `DELETE /api/rag/documents/:documentId`
  - `getDocumentMeta(documentId)` → `GET /api/rag/documents/:documentId`
  - `searchInDocument(documentId, query)` → `GET /api/rag/documents/:documentId/search`
  - `queryDocument(documentId, query)` → `POST /api/rag/documents/:documentId/query`
  - `fetchPdfObjectUrl(documentId)` → `GET /api/rag/documents/:documentId/file` (returns blob URL)
- `frontend/src/pages/RagDocuments/RagDocuments.jsx` *(new file)*
  - Route: `/rag-documents`
  - Left column: document list + upload dropzone (show uploading state)
  - Right column (empty state if no doc selected):
    - On doc selected: show header with delete button
    - 3 tabs: **Ask AI** (query input + AI answer via `RagAnswerBody` component), **Search** (query input + excerpt list with scores), **Preview** (PDF iframe from blob URL, revoke on unmount)
  - If doc `status === 'processing'` → show pending state, optionally poll every 5s
  - Delete → remove from list after API success

**Reference files:** `tasks/frontend/rag-documents/task-rag-documents.md`

> Add route for `/rag-documents` in `frontend/src/App.jsx`.

---

## Milestone Overview

| Milestone | Backend task rows | Frontend task rows | Total task rows |
| --- | ---: | ---: | ---: |
| 1. Authentication (Auth) | 2 | 4 | 6 |
| 2. Questions & Answers | 8 | 5 | 13 |
| 3. Knowledge Base (RAG) | 7 | 1 | 8 |
| **Total** | **17** | **10** | **27** |

## Milestone 1: Authentication (Auth)

*The foundation of user access. Backend APIs and frontend pages are implemented in this milestone.*

### Backend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-04` | Register User | Implement `POST /api/auth/register` to validate input, hash passwords using bcrypt, and create new user accounts. | `/auth/register.md` | TBD | Not set |
| `T-05` | Login User | Implement `POST /api/auth/login` to verify user credentials and issue signed JWT tokens for session management. | `/auth/login.md` | TBD | Not set |

### Frontend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-06` | Axios + Auth Service | Set up Axios interceptors to automatically attach JWT tokens to API requests and handle global 401 unauthorized redirects. | — | TBD | Not set |
| `T-07` | Auth Page UI | Build the combined Login/Register page at `/auth`, using Framer Motion for smooth form transitions. | `/auth/task-auth.md` | TBD | Not set |
| `T-08` | AuthContext + ProtectedRoute | Create the global React authentication context and route guards to protect authenticated pages from unauthorized access. | — | TBD | Not set |
| `T-00` | Public Landing Page | Build the unauthenticated `/` homepage to market the application and direct users to sign up or log in. | `/public/task-landing.md` | TBD | Not set |

## Milestone 2: Questions & Answers

*The core community forum functionality, featuring AI-assisted drafting and answer evaluation.*

### Backend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-09` | Create Question & Auto-Embed | Implement `POST /api/questions` to save questions and simultaneously generate AI vector embeddings for semantic search. | `/question/create-question.md` | TBD | Not set |
| `T-10` | List Questions | Implement `GET /api/questions` with support for keyword search and a "mine" filter. | `/question/list-questions.md` | TBD | Not set |
| `T-10` | Get Single Question Details | Implement `GET /api/questions/:questionHash` to fetch a specific question and all its associated answers. | `/question/single-question.md` | TBD | Not set |
| `T-11` | Semantic Search Questions | Implement `GET /api/questions/search` to find conceptually related questions using AI vector cosine similarity. | `/question/search-questions.md` | TBD | Not set |
| `T-11` | Find Similar Questions | Implement `GET /api/questions/:questionHash/similar` to recommend related questions based on an existing question's vector. | `/question/similar-questions.md` | TBD | Not set |
| `T-12` | Create Answer | Implement `POST /api/answers` to allow users to answer community questions while preventing them from answering their own. | `/answer/create-answer.md` | TBD | Not set |
| `T-17` | AI Question Draft Coach | Implement `POST /api/questions/draft-coach` to provide real-time AI feedback and tips on question drafts. | `/question/draft-coach.md` | TBD | Not set |
| `T-18` | AI Answer Fit Evaluation | Implement `POST /api/questions/:questionHash/answer-fit` to evaluate how strongly a draft answer addresses the question. | `/question/answer-fit.md` | TBD | Not set |

### Frontend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-13` | Layout Shell | Create the `Layout`, `Navbar`, and `Sidebar` components to wrap and navigate between protected routes. | — | Ferdos | Not set |
| `T-14` | Dashboard Page | Build the `/dashboard` page to list questions and handle keyword and semantic search inputs. | `/dashboard/task-dashboard.md` | Mussa | Not set |
| `T-15` | Post Question Page | Build the `/questions/ask` form, integrating the AI Draft Coach for real-time writing feedback. | `/post-question/task-post-question.md` | TBD | Not set |
| `T-16` & `T-20` | Question Detail Page | Build the `/questions/:questionHash` page to display the question, answers, and a new answer form equipped with AI Answer Fit. | `/question-detail/task-question-detail.md` | TBD | Not set |
| `T-21` | My Questions Page | Build the `/my-questions` page to display a personalized list containing only the user's authored questions. | `/my-questions/task-my-questions.md` | TBD | Not set |


### Backend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-22` | Upload & Process RAG Document | Implement `POST /api/rag/documents` to securely upload PDFs, parse text, chunk paragraphs, and generate vector embeddings. | `/rag/create-document.md` | TBD | Not set |
| `T-23` | Semantic Search in RAG Document | Implement `GET /api/rag/documents/:documentId/search` to find and return the most relevant text excerpts within a PDF. | `/rag/search-document.md` | TBD | Not set |
| `T-23` | AI Query Grounded in RAG Document | Implement `POST /api/rag/documents/:documentId/query` to generate AI answers based solely on the uploaded PDF's context. | `/rag/query-document.md` | TBD | Not set |
| `T-24` | Get RAG Document Metadata | Implement `GET /api/rag/documents/:documentId` to fetch a document's processing status and metadata. | `/rag/get-document-meta.md` | TBD | Not set |
| `T-24` | Stream RAG Document PDF | Implement `GET /api/rag/documents/:documentId/file` to serve the PDF blob for browser previews. | `/rag/get-document-file.md` | TBD | Not set |
| `T-24` | List My RAG Documents | Implement `GET /api/rag/documents` to list all PDFs uploaded by the authenticated user. | `/rag/list-documents.md` | TBD | Not set |
| `T-24` | Delete RAG Document | Implement `DELETE /api/rag/documents/:documentId` to safely remove a PDF from disk and cascade delete its vectors from the database. | `/rag/delete-document.md` | TBD | Not set |

### Frontend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-24` & `T-25` | RAG Documents Page | Build the `/rag-documents` page with a document list sidebar, PDF upload dropzone, and an active document view with three tabs: Ask AI, Semantic Search, and PDF Preview. | `/rag-documents/task-rag-documents.md` | TBD | Not set |


## Milestone 3: Knowledge Base (RAG)

*Advanced AI functionality allowing users to upload PDFs, perform semantic searches within them, and ask questions grounded in their content.*

### Backend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-22` | Upload & Process RAG Document | Implement `POST /api/rag/documents` to securely upload PDFs, parse text, chunk paragraphs, and generate vector embeddings. | `/rag/create-document.md` | Eyob | Not set |
| `T-23` | Semantic Search in RAG Document | Implement `GET /api/rag/documents/:documentId/search` to find and return the most relevant text excerpts within a PDF. | `/rag/search-document.md` | mussa | Not set |
| `T-23` | AI Query Grounded in RAG Document | Implement `POST /api/rag/documents/:documentId/query` to generate AI answers based solely on the uploaded PDF's context. | `/rag/query-document.md` | sadik| Not set |
| `T-24` | Get RAG Document Metadata | Implement `GET /api/rag/documents/:documentId` to fetch a document's processing status and metadata. | `/rag/get-document-meta.md` | mahamud | Not set |
| `T-24` | Stream RAG Document PDF | Implement `GET /api/rag/documents/:documentId/file` to serve the PDF blob for browser previews. | `/rag/get-document-file.md` | firdos | Not set |
| `T-24` | List My RAG Documents | Implement `GET /api/rag/documents` to list all PDFs uploaded by the authenticated user. | `/rag/list-documents.md` | israel | Not set |
| `T-24` | Delete RAG Document | Implement `DELETE /api/rag/documents/:documentId` to safely remove a PDF from disk and cascade delete its vectors from the database. | `/rag/delete-document.md` | yonatan| Not set |

### Frontend Tasks

| Task ID | Task Name | Description | Reference | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `T-24` & `T-25` | RAG Documents Page | Build the `/rag-documents` page with a document list sidebar, PDF upload dropzone, and an active document view with three tabs: Ask AI, Semantic Search, and PDF Preview. | `/rag-documents/task-rag-documents.md` | Mussa| Not set |

## PR Checklist (every PR must include this)

```markdown
- [ ] `npm run dev` starts with no errors
- [ ] All endpoints in this task tested in Postman (backend tasks)
- [ ] No console errors in the browser (frontend tasks)
- [ ] All acceptance criteria from the referenced task file are met
- [ ] File paths match exactly what's listed in the task
```

---

## Files That Need `routes.js` Updates

`backend/src/api/routes.js` needs these lines added. **Coordinate** — only one person should add each line, or merge carefully:

```js
// Person 1 adds this:
import questionRoutes from './question/routes/questions.routes.js';
mainRouter.use('/questions', questionRoutes);

// Person 3 adds this:
import answerRoutes from './answewr/routes/answer.routes.js';
mainRouter.use('/answers', answerRoutes);

// Person 4 adds this:
import ragRoutes from './rag/routes/rag.routes.js';
mainRouter.use('/rag', ragRoutes);
```

---

## New Files to Create (full list)

```
backend/src/api/question/controller/questions.controller.js    (P1 + P2)
backend/src/api/question/service/question.service.js           (P1 + P2)
backend/src/api/answewr/service/answer.service.js              (P3)
backend/src/api/answewr/routes/answer.routes.js                (P3)
backend/src/api/rag/routes/rag.routes.js                       (P4 + P5)
backend/src/api/rag/controller/rag.controller.js               (P4 + P5)
backend/src/api/rag/service/rag.service.js                     (P4 + P5)
frontend/src/services/question/question.service.js             (P6)
frontend/src/services/answer/answer.service.js                 (P7)
frontend/src/services/rag/rag.service.js                       (P4)
frontend/src/pages/PostQuestion/PostQuestion.jsx               (P6)
frontend/src/pages/QuestionDetail/QuestionDetail.jsx           (P7)
frontend/src/pages/MyQuestions/MyQuestions.jsx                 (P7)
frontend/src/pages/RagDocuments/RagDocuments.jsx               (P4)
```
