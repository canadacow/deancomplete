import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('DeanComplete: Definition index prototype activated');

    // Go to Definition using our own index (Option B skeleton)
    const goToDef = vscode.commands.registerCommand('deancomplete.goToDefinition', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        if (!['c', 'cpp', 'cuda'].includes(editor.document.languageId)) return;

        const position = editor.selection.active;
        const range = editor.document.getWordRangeAtPosition(position, /[A-Za-z_~][A-Za-z0-9_:]*/);
        const word = range ? editor.document.getText(range) : '';
        if (!word) {
            vscode.window.showInformationMessage('No identifier at cursor.');
            return;
        }

        // Lookup in our definitions index
        const idxPath = getIndexPath();
        const results = await lookupDefinition(idxPath, word, editor.document.fileName);
        if (results.length > 0) {
            const top = results[0];
            await vscode.window.showTextDocument(vscode.Uri.file(top.file), {
                selection: new vscode.Range(new vscode.Position(top.line, top.column), new vscode.Position(top.line, top.column))
            });
        } else {
            vscode.window.showInformationMessage(`No definition found in DeanComplete index for '${word}'.`);
        }
    });

    // Build the definition index by invoking an external tool (to be supplied)
    const buildIndex = vscode.commands.registerCommand('deancomplete.buildIndex', async () => {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspace) {
            vscode.window.showErrorMessage('Open a folder to build an index.');
            return;
        }
        const compileDir = getCompileCommandsDir(workspace);
        const indexerPath = getIndexerPath();
        if (!indexerPath) {
            vscode.window.showErrorMessage('Set deancomplete.indexer.path to your LibTooling indexer executable.');
            return;
        }
        const outPath = getIndexPath();
        const files = await vscode.workspace.findFiles('**/*.{c,cc,cxx,cpp}', '**/{.git,node_modules}/**');
        if (files.length === 0) {
            vscode.window.showWarningMessage('No C/C++ sources found to index.');
        }
        const argsList = files.map(f => `"${f.fsPath}"`).join(' ');
        const term = await vscode.window.createTerminal({ name: 'DeanComplete Indexer' });
        term.show(true);
        // Expected CLI (CommonOptionsParser): indexer -p <build_dir> <files...> --out <file>
        term.sendText(`"${indexerPath}" -p "${compileDir}" ${argsList} --out "${outPath}"`);
        vscode.window.showInformationMessage(`Building index → ${outPath}`);
    });

    context.subscriptions.push(goToDef, buildIndex);
}

export function deactivate() {}

type DefRow = { name: string; scope?: string; file: string; line: number; column: number };

function getConfig<T>(key: string, def: T): T {
    return vscode.workspace.getConfiguration('deancomplete').get<T>(key, def);
}

function getIndexPath(): string {
    const rel = getConfig<string>('index.file', '.deancomplete/index.jsonl');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    return require('path').resolve(root, rel);
}

function getCompileCommandsDir(root: string): string {
    const cfg = getConfig<string>('compileCommandsDir', '');
    return cfg ? cfg : root;
}

function getIndexerPath(): string | undefined {
    const p = getConfig<string>('indexer.path', '');
    return p || undefined;
}

async function lookupDefinition(indexFile: string, identifier: string, currentFile: string): Promise<DefRow[]> {
    const fs = await import('fs');
    if (!fs.existsSync(indexFile)) return [];
    const content = fs.readFileSync(indexFile, 'utf8');
    const rows: DefRow[] = [];
    for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj && typeof obj.name === 'string') rows.push(obj as DefRow);
        } catch {}
    }
    // Simple ranking: exact name, prefer same file, then by shortest scope
    return rows
        .filter(r => r.name === identifier || r.name.endsWith(`::${identifier}`))
        .sort((a, b) => (a.file === currentFile ? -1 : 0) - (b.file === currentFile ? -1 : 0)
            || (a.scope?.length || 9999) - (b.scope?.length || 9999));
}
