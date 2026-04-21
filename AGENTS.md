# AGENTS.md — parallel-work

Guidance for AI coding agents working in this repo. Keep it tight and correct; if something here contradicts the code, the code wins — update this file.

## What this is

A single-user kanban board for managing "agentic coding" task queues: columns are projects, tasks cycle `todo → queued → in-review → done`, each task can link to GitHub PRs, Jira tickets, Slack threads, and other URLs. Tasks persist to localStorage and to a small Next.js API route (`data/boards.json`). Multi-board supported.

## Stack

- Next.js 16.1.6 (App Router, `"use client"` components), React 19.2.3, TypeScript 5, Tailwind 4.
- State: **Zustand 5** (3 stores — see below). No Redux, no XState.
- DnD: `@dnd-kit/core` + `@dnd-kit/sortable` directly (no wrapper libs).
- Tests: Vitest 2 + `@testing-library/react`, Playwright 1.58 (chromium only).
- Tooling: ESLint 9 (next/core-web-vitals + next/typescript + eslint-config-prettier), Prettier 3, Husky + lint-staged.

## Repo layout

```
src/
  app/
    page.tsx                 # Main UI: <Header/> <main><Board/></main> <Toasts/>
    layout.tsx               # Root html/body (dark-mode class toggled in Header)
    api/
      board/route.ts         # LEGACY single-board GET/PUT — do not add callers
      boards/route.ts        # Current multi-board collection GET/PUT
      link-title/route.ts    # GET ?url=... → { ok, title } (og:title / <title>)
  components/
    Board.tsx                # DndContext, global listeners (Cmd+K, Cmd+Z, pointerdown outside-card close, beforeunload flush, cross-tab storage sync)
    Column.tsx, TaskCard.tsx, TaskDetail.tsx, StatusBadge.tsx
    AddColumn.tsx, AddTask.tsx
    Header.tsx, BoardPicker.tsx
    CommandPalette.tsx       # ⌘K palette (build commands list on open)
    ConfirmModal.tsx         # role=dialog, aria-modal, focus trap, restore focus
    Toasts.tsx               # renders useToastStore entries
    LinkIcon.tsx             # dispatches by getLinkType(url)
    EmptyState.tsx
  lib/
    types.ts                 # Task, TaskLink, Column, Board, BoardsCollection, STATUS_CONFIG, COLUMN_COLORS
    storage.ts               # loadBoards / saveBoards / saveBoardsSync + legacy-key migration
    linkUtils.ts             # getLinkType(url) → "github"|"slack"|"decision-systems"|"jira"|"generic"
    shortcuts.ts             # canonical keyboard-shortcut list rendered by ShortcutsHelp
    useIsMac.ts              # hook returning true on macOS (post-hydration)
  store/
    boardStore.ts            # persisted, undo/redo, multi-board
    filterStore.ts           # ephemeral: searchQuery, statusFilters, linkTypeFilters
    toastStore.ts            # ephemeral, auto-dismiss 5s
    uiStore.ts               # ephemeral: isShortcutsOpen, isCommandPaletteOpen
  test/
    setup.ts                 # Node 25 + jsdom localStorage polyfill — load-bearing (see Gotchas)
e2e/
  board.spec.ts, header.spec.ts
data/                         # gitignored (via content) — local board snapshots
  boards.json                # current
  board.json                 # legacy, auto-migrated by /api/boards on first GET
```

## Scripts (from package.json)

```bash
npm run dev           # next dev (port 3000)
npm run build         # next build
npm run start         # next start
npm run lint          # eslint
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm test              # vitest run (headless)
npm run test:watch    # vitest (watch)
npm run test:e2e      # playwright test  (its webServer runs `npm run dev -- -p 3001`)
```

There is no separate `typecheck` script — use `npx tsc --noEmit` before committing.

## What CI runs (`.github/workflows/test.yml`, Node 22)

1. `npm ci` → `npm run format:check` → `npm run lint`
2. `npm ci` → `npx vitest run`
3. `npm ci` → `npx playwright install --with-deps chromium` → `npx playwright test`

If you change a dependency, CI will detect on `npm ci`. If you edit Playwright tests, expect the artifact `playwright-report/` on failure.

## Zustand stores — which one, and why

### `boardStore` — persisted board state

- Holds `board` (active board), `boards: Record<id, Board>`, `activeBoardId`, plus `expandedTaskId`, `undoCount`, `redoCount`.
- `persist(board)` is a **debounced dirty flag** (300 ms) — the flush reads the whole state and calls `storage.saveBoards()`. Every mutation action must call `persist(newBoard)` at the end of its `set()` so the dirty flag is raised.
- `flushPendingSave()` is called from `beforeunload` and `visibilitychange === "hidden"` in `Board.tsx` to synchronously write localStorage.
- `hydrateFromStorage(collection)` is called from the cross-tab `storage` event handler in `Board.tsx`. It sets `suppressHistory` so the hydrate doesn't land in the undo stack.
- **Undo/redo is centralized** in a `useBoardStore.subscribe` at the bottom of `boardStore.ts`. Any mutation that changes `state.board` is auto-captured. Don't add a second history mechanism. `undo()`, `redo()`, `switchBoard()`, `hydrateFromStorage()` all flip `suppressHistory = true` around their own `set()` so those ops don't get recorded.
- `_resetHistoryForTests()` is exported specifically for the test suite — don't call it from app code.

### `filterStore` — ephemeral

- `searchQuery`, `statusFilters`, `linkTypeFilters`. `taskMatchesFilter(task, state)` is the predicate; use it in `Column.tsx` where `activeTasks`/`doneTasks` are derived.

### `toastStore` — ephemeral

- `push(message, kind)`, 5 s auto-dismiss. Use for surfacing persistence failures, not for success confirmations.

### `uiStore` — ephemeral

- `isShortcutsOpen`, `isCommandPaletteOpen` + open/close/toggle actions. The `?` key (in `Board.tsx`), the header keyboard button, and the "Keyboard shortcuts" command-palette entry all flip `isShortcutsOpen`. The `⌘K` header pill and the global `⌘K` binding flip `isCommandPaletteOpen`. `<ShortcutsHelp />` mounts in `src/app/page.tsx` and reads from `uiStore`; `<CommandPalette />` mounts from `Board.tsx` when `isCommandPaletteOpen` is true.

**When adding a new keyboard shortcut:** (a) wire the binding in `Board.tsx`'s key handler (or the relevant component), and (b) register it in `src/lib/shortcuts.ts` so it shows up in the help dialog. The two must stay in sync.

## Storage model

```ts
type BoardsCollection = {
  activeBoardId: string;
  boards: Record<string, Board>;
};
```

Keys and endpoints:

| Use                | Key / path                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| Current client key | `localStorage["parallel-boards"]`                                               |
| Legacy client key  | `localStorage["parallel-board"]` (single `Board`, auto-migrated)                |
| Current API        | `/api/boards` — GET/PUT `BoardsCollection`                                      |
| Legacy API         | `/api/board` — GET/PUT a single `Board` (kept for back-compat, no callers)      |
| Current disk       | `data/boards.json`                                                              |
| Legacy disk        | `data/board.json` (auto-migrated into `boards.json` on first `/api/boards` GET) |

**Write new code against `/api/boards` and `storage.loadBoards()/saveBoards()`.** Don't reintroduce `storage.loadBoard` / `saveBoard`.

`Task.githubUrl` is deprecated — use `task.links: TaskLink[]` and the `addTaskLink` / `updateTaskLink` / `removeTaskLink` actions. Loaded boards are migrated automatically in `migrateBoard()`.

## Test conventions

### Unit tests (`src/**/__tests__/*.test.ts(x)`, Vitest + jsdom)

Every component test mocks storage the same way — copy this:

```ts
vi.mock("@/lib/storage", () => ({
  STORAGE_KEY: "parallel-boards",
  storage: {
    loadBoards: vi.fn().mockResolvedValue(null),
    saveBoards: vi.fn().mockResolvedValue({ ok: true }),
    saveBoardsSync: vi.fn(),
  },
}));
```

Seed store state in `beforeEach` with `useBoardStore.setState({...})`. For sortable components render inside `<DndContext><SortableContext items={[...]}>...</SortableContext></DndContext>`. For boardStore history tests, `import { _resetHistoryForTests }` and call it in `beforeEach`.

### E2E tests (`e2e/*.spec.ts`, Playwright)

Reuse helpers in `e2e/board.spec.ts`:

- `clearBoard(page)` — wipes localStorage and PUTs an empty collection to `/api/boards`.
- `createColumn(page, name)`, `addTask(page, title)`.
- `clickNextStatus(card)` / `clickPrevStatus(card)` — **use `dispatchEvent("click")` for opacity-0 hover buttons**. Real `.click()` fails because the element isn't visible without hover.

Other patterns worth copying:

- Modal confirmations: `page.getByTestId("confirm-modal-backdrop").getByRole("button", { name: "Delete" })`.
- Cmd+K: `await page.keyboard.press(\`${process.platform === "darwin" ? "Meta" : "Control"}+k\`);`
- `window.prompt` / `window.confirm`: pre-register `page.once("dialog", d => d.accept("..."))` before the action.

## Style / lint rules you'll actually hit

- Prettier: `semi`, double quotes, `trailingComma: "es5"`, `printWidth: 100`. `.prettierignore` excludes `playwright-report/` and `test-results/`.
- ESLint enables `react-hooks/set-state-in-effect`. Don't call `setState` in an unconditional `useEffect` body; derive values during render, move state updates to event handlers / other effects, or guard with a meaningful dep. There is exactly one justified `eslint-disable-next-line react-hooks/set-state-in-effect` in the repo (`Header.tsx` SSR hydration). Match that bar before adding another.
- Husky pre-commit runs `lint-staged`: `eslint --fix` + `prettier --write` on staged `.ts`/`.tsx`, `prettier --write` on other staged text files. If the hook rejects, **the commit did not happen** — re-stage and create a NEW commit rather than amending.

## Commit style

Subject lines in recent history (imperative, often prefixed with `Feat:`, `a11y:`, `Perf:`, `chore:` or no prefix):

```
Feat: multi-board support
Feat: undo / redo stack (⌘Z / ⇧⌘Z)
Feat: header search + status/link filter bar
a11y: landmarks, aria-labels, focus trap in ConfirmModal
Perf: memoize derived task arrays + TaskCard
Disable drag on Done tasks; tie ProgressBar colors to STATUS_CONFIG
chore: gitignore playwright test artifacts
```

Anthropic `Co-Authored-By` trailer is used when commits are AI-authored.

## Gotchas (please read before making changes)

1. **Node 25 ships a stub `globalThis.localStorage` with no `setItem`/`getItem`/`clear`** unless started with `--experimental-webstorage --localstorage-file=...`. jsdom doesn't override it. `src/test/setup.ts` installs a Map-backed `Storage` polyfill on `globalThis` and `window` so tests work. If you rename / move this file, update `vitest.config.ts`'s `setupFiles`.

2. **Outside-click to collapse a task** lives in `Board.tsx` on `document.pointerdown`. It calls `(document.activeElement as HTMLElement).blur()` before `setExpandedTaskId(null)` so `TaskDetail`'s `onBlur` save handlers run _before_ the detail unmounts. Don't reorder that.

3. **Hidden drag handle on done tasks** is intentional. `TaskCard` sets `useSortable({ disabled: task.status === "done" })` and omits the handle element in render — don't "fix" it by re-adding the handle.

4. **Undo/redo and `suppressHistory`** — `switchBoard`, `createBoard`/`deleteBoardById` re-assign `state.board`. Those ops set `suppressHistory = true` around their `set()` so the board-swap isn't treated as a user edit. If you add a new code path that replaces `state.board` wholesale, decide whether it should be in the undo stack; if not, use the same guard.

5. **Export / Import still operates on a single `Board`**, not a collection. `importBoard(board)` replaces the currently-active board in place (keeps its id). Keep that contract unless you're deliberately designing multi-board export.

6. **Playwright webServer port is 3001**, not 3000 (`playwright.config.ts` runs `npm run dev -- -p 3001` with `reuseExistingServer: !process.env.CI`). If a local `next dev` is already running on 3000, it won't conflict.

7. **Pre-commit hook can reformat your files.** Inspect `git status` after a commit completes; lint-staged may have applied Prettier fixes that landed in the commit. No action needed — just know that diffs may expand.

8. **Dev environment may wrap npm via `rtk`.** If `npx …` behaves strangely (e.g. truncated output, weird flags), try `rtk proxy npx …` to bypass the wrapper. CI does not use rtk.

## What to avoid

- Adding a toast / dialog / DnD wrapper library — we have home-grown `Toasts`, `ConfirmModal`, and use `@dnd-kit` directly.
- Reintroducing `Task.githubUrl` writes — use `links[]`.
- Calling `/api/board` (singular) from new client code.
- Bypassing `persist()` in a mutation action — saved state will drift from UI state.
- Calling `useBoardStore.setState({ board: ... })` from a component to bypass an action; the undo-capture subscribe will treat it as a user edit.
