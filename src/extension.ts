// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CppParser } from './parser/CppParser';
import { SymbolDatabase } from './database/SymbolDatabase';
import { ScopeManager } from './scope/ScopeManager';
import { AIAssistant } from './ai/AIAssistant';
import { CodeAnalyzer } from './analysis/CodeAnalyzer';

export class DeanCompleteExtension {
    private parser: CppParser;
    private symbolDb: SymbolDatabase;
    private scopeManager: ScopeManager;
    private aiAssistant: AIAssistant;
    private analyzer: CodeAnalyzer;
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        this.parser = new CppParser();
        this.symbolDb = new SymbolDatabase();
        this.scopeManager = new ScopeManager();
        this.aiAssistant = new AIAssistant();
        this.analyzer = new CodeAnalyzer(this.symbolDb, this.scopeManager);
        
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(code) DeanComplete";
        this.statusBarItem.tooltip = "C/C++ Code Browser";
        this.statusBarItem.show();
    }

    async activate() {
        console.log('DeanComplete: Advanced C/C++ code browsing extension activated!');

        // Register commands
        this.registerCommands();
        // Register providers (definition, etc.)
        this.registerProviders();
        
        // Set up file watchers for C/C++ files
        this.setupFileWatchers();
        
        // Initialize workspace analysis
        await this.analyzeWorkspace();
    }

    private registerCommands() {
        // Analyze current file
        const analyzeFileCmd = vscode.commands.registerCommand('deancomplete.analyzeFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && this.isCppFile(editor.document)) {
                await this.analyzeFile(editor.document);
            }
        });

        // Show symbol information
        const showSymbolInfoCmd = vscode.commands.registerCommand('deancomplete.showSymbolInfo', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && this.isCppFile(editor.document)) {
                await this.showSymbolInfo(editor);
            }
        });

        // Find all references
        const findReferencesCmd = vscode.commands.registerCommand('deancomplete.findReferences', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && this.isCppFile(editor.document)) {
                await this.findReferences(editor);
            }
        });

        // Show scope tree
        const showScopeTreeCmd = vscode.commands.registerCommand('deancomplete.showScopeTree', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && this.isCppFile(editor.document)) {
                await this.showScopeTree(editor);
            }
        });

        this.context.subscriptions.push(
            analyzeFileCmd,
            showSymbolInfoCmd,
            findReferencesCmd,
            showScopeTreeCmd
        );
    }

    private registerProviders() {
        const selector: vscode.DocumentSelector = [
            { language: 'cpp', scheme: 'file' },
            { language: 'c', scheme: 'file' }
        ];

        const definitionProvider: vscode.DefinitionProvider = {
            provideDefinition: async (document, position, _token) => {
                // Ensure current document is analyzed (best-effort, fast parse)
                try { await this.analyzeFile(document); } catch {}
                // Identify the target identifier at the cursor
                const range = document.getWordRangeAtPosition(position, /[A-Za-z_~][A-Za-z0-9_:]*/);
                if (!range) {
                    return undefined;
                }

                const word = document.getText(range);
                const targetName = this.getUnqualifiedName(word);

                // Current scope context
                const currentScope = this.scopeManager.findScopeAtPosition(document.fileName, position.line);
                const candidateScopes = this.getCandidateScopePaths(currentScope);

                // Collect definitions by name
                const allDefs = this.symbolDb.findDefinitions(targetName);
                // Also consider fully-qualified matches if the word is qualified
                const fqDefs = word.includes('::') ? this.symbolDb.findDefinitions(word) : [];
                const defs = [...new Set([...allDefs, ...fqDefs])];

                if (defs.length === 0) {
                    return undefined;
                }

                // Rank by scope proximity and file locality
                const ranked = defs
                    .map(def => ({ def, score: this.scoreDefinition(def, document.fileName, candidateScopes, word, targetName) }))
                    .sort((a, b) => b.score - a.score);

                const top = ranked.filter((_, i) => i < 5).map(r => r.def);

                const locations = top.map(d => new vscode.Location(
                    vscode.Uri.file(d.file),
                    new vscode.Position(d.line, d.column)
                ));

                return locations.length === 1 ? locations[0] : locations;
            }
        };

        const disposable = vscode.languages.registerDefinitionProvider(selector, definitionProvider);
        this.context.subscriptions.push(disposable);
    }

    private getUnqualifiedName(name: string): string {
        const idx = name.lastIndexOf('::');
        return idx === -1 ? name : name.substring(idx + 2);
    }

    private getCandidateScopePaths(scope: any | undefined): string[] {
        if (!scope) {
            return [''];
        }
        // Build paths from the hierarchy, from most specific to least specific
        const hierarchy = this.scopeManager.getScopeHierarchy(scope);
        const names = hierarchy.map(s => s.name);
        const paths: string[] = [];
        for (let i = names.length; i >= 1; i--) {
            paths.push(names.slice(0, i).join('::'));
        }
        paths.push(''); // include global namespace as fallback
        return paths;
    }

    private scoreDefinition(
        def: any,
        currentFile: string,
        candidateScopes: string[],
        word: string,
        targetName: string
    ): number {
        let score = 0;

        // Prefer definitions in the current file
        if (def.file === currentFile) score += 5;

        // Prefer exact scope matches, then suffix matches
        if (candidateScopes.includes(def.scope || '')) score += 20;
        for (const c of candidateScopes) {
            if (c && (def.scope || '').endsWith(c)) { score += 12; break; }
        }

        // If symbol name is qualified, prefer matching qualification
        if (word.includes('::')) {
            const qualifier = word.substring(0, Math.max(0, word.lastIndexOf('::')));
            if (def.name && typeof def.name === 'string' && def.name.startsWith(qualifier + '::')) {
                score += 15;
            }
            if ((def.scope || '').endsWith(qualifier)) {
                score += 10;
            }
        }

        // Prefer exact unqualified name match
        if (def.name === targetName) score += 2;
        if (typeof def.name === 'string' && def.name.endsWith('::' + targetName)) score += 1;

        // Prefer definitions over declarations
        if (def.isDefinition && !def.isDeclaration) score += 3;

        return score;
    }

    private setupFileWatchers() {
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{c,cpp,h,hpp,cc,cxx}');
        
        fileWatcher.onDidChange(async (uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.analyzeFile(document);
        });

        fileWatcher.onDidCreate(async (uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.analyzeFile(document);
        });

        fileWatcher.onDidDelete((uri) => {
            this.symbolDb.removeFile(uri.fsPath);
            this.scopeManager.removeFile(uri.fsPath);
        });

        this.context.subscriptions.push(fileWatcher);
    }

    private async analyzeWorkspace() {
        const cppFiles = await vscode.workspace.findFiles(
            '**/*.{c,cpp,h,hpp,cc,cxx}',
            '**/node_modules/**'
        );

        this.statusBarItem.text = "$(sync~spin) Analyzing...";
        
        for (const file of cppFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                await this.analyzeFile(document);
            } catch (error) {
                console.error(`Error analyzing ${file.fsPath}:`, error);
            }
        }

        this.statusBarItem.text = "$(code) DeanComplete";
        vscode.window.showInformationMessage(`DeanComplete: Analyzed ${cppFiles.length} C/C++ files`);
    }

    private async analyzeFile(document: vscode.TextDocument) {
        try {
            const symbols = await this.parser.parseFile(document.getText(), document.fileName);
            this.symbolDb.updateFile(document.fileName, symbols);
            
            const scopes = this.scopeManager.buildScopeTree(symbols, document.fileName);
            this.scopeManager.updateFile(document.fileName, scopes);
            
            console.log(`Analyzed ${document.fileName}: ${symbols.length} symbols found`);
        } catch (error) {
            console.error(`Error analyzing ${document.fileName}:`, error);
        }
    }

    private async showSymbolInfo(editor: vscode.TextEditor) {
        const position = editor.selection.active;
        const symbol = this.symbolDb.findSymbolAtPosition(editor.document.fileName, position);
        
        if (symbol) {
            const info = await this.aiAssistant.getSymbolContext(symbol, editor.document);
            const panel = vscode.window.createWebviewPanel(
                'symbolInfo',
                `Symbol: ${symbol.name}`,
                vscode.ViewColumn.Beside,
                {}
            );
            
            panel.webview.html = this.getSymbolInfoHtml(symbol, info);
        } else {
            vscode.window.showInformationMessage('No symbol found at cursor position');
        }
    }

    private async findReferences(editor: vscode.TextEditor) {
        const position = editor.selection.active;
        const symbol = this.symbolDb.findSymbolAtPosition(editor.document.fileName, position);
        
        if (symbol) {
            const references = this.symbolDb.findReferences(symbol);
            const locations = references.map(ref => new vscode.Location(
                vscode.Uri.file(ref.file),
                new vscode.Position(ref.line, ref.column)
            ));
            
            if (locations.length > 0) {
                vscode.commands.executeCommand('vscode.executeReferenceProvider', 
                    editor.document.uri, position);
            } else {
                vscode.window.showInformationMessage(`No references found for ${symbol.name}`);
            }
        }
    }

    private async showScopeTree(editor: vscode.TextEditor) {
        const scopes = this.scopeManager.getFileScopes(editor.document.fileName);
        if (scopes) {
            const panel = vscode.window.createWebviewPanel(
                'scopeTree',
                'Scope Tree',
                vscode.ViewColumn.Beside,
                {}
            );
            
            panel.webview.html = this.getScopeTreeHtml(scopes);
        }
    }

    private isCppFile(document: vscode.TextDocument): boolean {
        const cppLanguages = ['c', 'cpp', 'cuda'];
        return cppLanguages.includes(document.languageId);
    }

    private getSymbolInfoHtml(symbol: any, aiInfo: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Symbol Information</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .symbol-header { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
                    .ai-section { background: #e8f4fd; padding: 15px; border-radius: 5px; }
                    .symbol-details { margin: 10px 0; }
                    .label { font-weight: bold; color: #333; }
                </style>
            </head>
            <body>
                <div class="symbol-header">
                    <h2>${symbol.name}</h2>
                    <div class="symbol-details">
                        <span class="label">Type:</span> ${symbol.kind}<br>
                        <span class="label">File:</span> ${symbol.file}<br>
                        <span class="label">Line:</span> ${symbol.line}<br>
                        <span class="label">Scope:</span> ${symbol.scope || 'Global'}
                    </div>
                </div>
                <div class="ai-section">
                    <h3>AI Analysis</h3>
                    <p>${aiInfo}</p>
                </div>
            </body>
            </html>
        `;
    }

    private getScopeTreeHtml(scopes: any): string {
        const renderScope = (scope: any, depth: number = 0): string => {
            const indent = '  '.repeat(depth);
            let html = `${indent}<li><strong>${scope.name}</strong> (${scope.type})`;
            if (scope.symbols && scope.symbols.length > 0) {
                html += '<ul>';
                scope.symbols.forEach((symbol: any) => {
                    html += `${indent}  <li>${symbol.name} (${symbol.kind})</li>`;
                });
                html += '</ul>';
            }
            if (scope.children && scope.children.length > 0) {
                html += '<ul>';
                scope.children.forEach((child: any) => {
                    html += renderScope(child, depth + 1);
                });
                html += '</ul>';
            }
            html += '</li>';
            return html;
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Scope Tree</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    ul { list-style-type: none; padding-left: 20px; }
                    li { margin: 5px 0; }
                </style>
            </head>
            <body>
                <h2>Scope Tree</h2>
                <ul>
                    ${renderScope(scopes)}
                </ul>
            </body>
            </html>
        `;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const extension = new DeanCompleteExtension(context);
    extension.activate();
    
    context.subscriptions.push(extension);
}

export function deactivate() {}
