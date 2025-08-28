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
