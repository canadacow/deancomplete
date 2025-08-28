# DeanComplete — Code assist for real this time.

A VS Code extension that parses C/C++ files with tree-sitter and provides basic symbol navigation and simple context views. This is an early prototype focused on practicality and fast iteration.

## What it does today

- **Parse C/C++ with tree-sitter** and extract common symbols:
  - functions, variables, classes, structs, namespaces, enums, typedefs
- **Index per file** and keep a simple name index for quick lookups
- **Scan workspace on activation** for `*.{c,cpp,h,hpp,cc,cxx}` and re-analyze on file change/create/delete
- **Status bar indicator** while scanning
- **Commands**:
  - `DeanComplete: Analyze Current File` — Re-parse the active file
  - `DeanComplete: Show Symbol Information` — Open a webview with symbol details and a small heuristic “analysis”
  - `DeanComplete: Find All References` — Invokes VS Code’s reference UI from the current cursor position (results depend on editors/providers)
  - `DeanComplete: Show Scope Tree` — Display a simple, read-only scope tree in a webview

## What it is not (yet)

- Not a full C/C++ language server and not a replacement for clangd
- No semantic understanding of templates, overload resolution, or macros
- No build-system awareness (no compile_commands.json integration)
- No real header/include resolution across projects
- Reference results are best-effort and not guaranteed to be complete
- The “AI” helper is rule-based heuristics; no remote model is used

## Install and run

1. Clone the repo
2. Install deps: `npm install`
3. Build: `npm run compile`
4. Press F5 in VS Code to launch the extension host

## Development

```bash
npm run compile        # Build once
npm run watch          # Rebuild on change
npm run package        # Production bundle

npm run lint           # ESLint
npm run test           # VS Code test runner
```

## Try it quickly

1. Open `sample.cpp`
2. Run `DeanComplete: Analyze Current File`
3. Place the cursor on a symbol and run `DeanComplete: Show Symbol Information`
4. Run `DeanComplete: Show Scope Tree` to see a hierarchical view

## Project structure (high level)

- `src/parser/CppParser.ts` — tree-sitter integration and symbol extraction
- `src/database/SymbolDatabase.ts` — in-memory symbol and name index
- `src/scope/ScopeManager.ts` — builds a simple scope tree for display
- `src/ai/AIAssistant.ts` — lightweight, heuristic context text for the webview
- `src/analysis/CodeAnalyzer.ts` — basic metrics helpers (not surfaced in UI yet)
- `src/extension.ts` — command registration, workspace scanning, webviews

## Roadmap (near-term)

- Improve reference finding and cross-file symbol linkage
- Surface basic code metrics in the UI
- Better header/include handling and simple dependency graph view

## License

MIT — see `LICENSE`.
