import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('DeanComplete: Minimal definition preview activated');

    const disposable = vscode.commands.registerCommand('deancomplete.previewDefinitionTarget', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        if (!['c', 'cpp', 'cuda'].includes(editor.document.languageId)) return;

        const position = editor.selection.active;
        const range = editor.document.getWordRangeAtPosition(position, /[A-Za-z_~][A-Za-z0-9_:]*/);
        const word = range ? editor.document.getText(range) : '';

        const panel = vscode.window.createWebviewPanel(
            'definitionPreview',
            'Go to Definition',
            vscode.ViewColumn.Beside,
            { enableFindWidget: true }
        );

        const file = editor.document.fileName;
        const line = position.line + 1;
        const col = position.character + 1;
        const selectionHtml = word ? `<code>${word}</code>` : '<em>(no identifier)</em>';

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
                    .hdr { font-weight: 600; margin-bottom: 8px; }
                    code { background: #f2f2f2; padding: 2px 6px; border-radius: 4px; }
                    .kv { margin: 4px 0; }
                    .dim { color: #666; }
                </style>
            </head>
            <body>
                <div class="hdr">Definition target preview</div>
                <div class="kv">Identifier: ${selectionHtml}</div>
                <div class="kv">File: <span class="dim">${file}</span></div>
                <div class="kv">Position: <span class="dim">${line}:${col}</span></div>
                <p class="dim">This is a preview only. Actual navigation will be added later.</p>
            </body>
            </html>
        `;
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
