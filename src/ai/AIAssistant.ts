import * as vscode from 'vscode';
import { Symbol } from '../parser/CppParser';

export class AIAssistant {
    private contextCache: Map<string, string> = new Map();

    async getSymbolContext(symbol: Symbol, document: vscode.TextDocument): Promise<string> {
        const cacheKey = `${symbol.file}:${symbol.line}:${symbol.column}`;
        
        if (this.contextCache.has(cacheKey)) {
            return this.contextCache.get(cacheKey)!;
        }

        const context = await this.analyzeSymbolContext(symbol, document);
        this.contextCache.set(cacheKey, context);
        
        return context;
    }

    async getCodeSuggestions(document: vscode.TextDocument, position: vscode.Position): Promise<string[]> {
        const line = document.lineAt(position.line);
        const context = this.getLineContext(document, position);
        
        return this.generateSuggestions(line.text, context);
    }

    async getRefactoringSuggestions(symbol: Symbol, document: vscode.TextDocument): Promise<string[]> {
        const context = await this.analyzeSymbolContext(symbol, document);
        return this.generateRefactoringSuggestions(symbol, context);
    }

    async getUsageAnalysis(symbol: Symbol): Promise<string> {
        const analysis = await this.analyzeSymbolUsage(symbol);
        return this.formatUsageAnalysis(analysis);
    }

    private async analyzeSymbolContext(symbol: Symbol, document: vscode.TextDocument): Promise<string> {
        const lines = document.getText().split('\n');
        const contextLines: string[] = [];
        
        // Get surrounding context (5 lines before and after)
        const startLine = Math.max(0, symbol.line - 5);
        const endLine = Math.min(lines.length - 1, symbol.line + 5);
        
        for (let i = startLine; i <= endLine; i++) {
            contextLines.push(lines[i]);
        }

        const context = contextLines.join('\n');
        
        // Analyze the symbol based on its type
        switch (symbol.kind) {
            case 'function':
                return this.analyzeFunctionContext(symbol, context);
            case 'class':
            case 'struct':
                return this.analyzeClassContext(symbol, context);
            case 'variable':
                return this.analyzeVariableContext(symbol, context);
            case 'namespace':
                return this.analyzeNamespaceContext(symbol, context);
            default:
                return this.analyzeGenericContext(symbol, context);
        }
    }

    private analyzeFunctionContext(symbol: Symbol, context: string): string {
        const signature = symbol.signature || `${symbol.type} ${symbol.name}()`;
        
        return `
**Function Analysis: ${symbol.name}**

**Signature:** \`${signature}\`
**Scope:** ${symbol.scope || 'Global'}
**File:** ${symbol.file}:${symbol.line}

**Context Analysis:**
- This function is defined in ${symbol.scope ? `the ${symbol.scope} scope` : 'global scope'}
- ${symbol.type ? `Returns: ${symbol.type}` : 'Return type not specified'}
- ${this.getFunctionComplexity(context)}

**Potential Improvements:**
- Consider adding documentation comments
- Check for proper error handling
- Verify parameter validation
        `.trim();
    }

    private analyzeClassContext(symbol: Symbol, context: string): string {
        return `
**Class Analysis: ${symbol.name}**

**Type:** ${symbol.kind}
**Scope:** ${symbol.scope || 'Global'}
**File:** ${symbol.file}:${symbol.line}

**Context Analysis:**
- This ${symbol.kind} is defined in ${symbol.scope ? `the ${symbol.scope} scope` : 'global scope'}
- ${this.getClassComplexity(context)}

**Design Patterns:**
- Consider implementing RAII principles
- Check for proper encapsulation
- Verify const-correctness
        `.trim();
    }

    private analyzeVariableContext(symbol: Symbol, context: string): string {
        return `
**Variable Analysis: ${symbol.name}**

**Type:** ${symbol.type || 'Unknown'}
**Scope:** ${symbol.scope || 'Global'}
**File:** ${symbol.file}:${symbol.line}

**Context Analysis:**
- This variable is declared in ${symbol.scope ? `the ${symbol.scope} scope` : 'global scope'}
- ${symbol.isDeclaration ? 'This is a declaration (extern)' : 'This is a definition'}
- ${this.getVariableUsage(context)}

**Recommendations:**
- Consider using const if the value doesn't change
- Check for proper initialization
- Verify naming conventions
        `.trim();
    }

    private analyzeNamespaceContext(symbol: Symbol, context: string): string {
        return `
**Namespace Analysis: ${symbol.name}**

**Scope:** ${symbol.scope || 'Global'}
**File:** ${symbol.file}:${symbol.line}

**Context Analysis:**
- This namespace is defined in ${symbol.scope ? `the ${symbol.scope} scope` : 'global scope'}
- ${this.getNamespaceContent(context)}

**Best Practices:**
- Consider using inline namespaces for versioning
- Check for proper organization of related symbols
- Verify no naming conflicts
        `.trim();
    }

    private analyzeGenericContext(symbol: Symbol, context: string): string {
        return `
**Symbol Analysis: ${symbol.name}**

**Type:** ${symbol.kind}
**Scope:** ${symbol.scope || 'Global'}
**File:** ${symbol.file}:${symbol.line}

**Context Analysis:**
- This ${symbol.kind} is defined in ${symbol.scope ? `the ${symbol.scope} scope` : 'global scope'}
- ${this.getGenericContext(context)}
        `.trim();
    }

    private getFunctionComplexity(context: string): string {
        const lines = context.split('\n');
        const functionLines = lines.filter(line => 
            line.trim().length > 0 && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*')
        ).length;

        if (functionLines > 50) {
            return 'This function appears to be complex (many lines). Consider breaking it into smaller functions.';
        } else if (functionLines > 20) {
            return 'This function has moderate complexity. Consider if it can be simplified.';
        } else {
            return 'This function has good complexity.';
        }
    }

    private getClassComplexity(context: string): string {
        const lines = context.split('\n');
        const classLines = lines.filter(line => 
            line.trim().length > 0 && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*')
        ).length;

        if (classLines > 200) {
            return 'This class is quite large. Consider if it follows the Single Responsibility Principle.';
        } else if (classLines > 100) {
            return 'This class has moderate size. Check if all methods are necessary.';
        } else {
            return 'This class has a reasonable size.';
        }
    }

    private getVariableUsage(context: string): string {
        const lines = context.split('\n');
        const usageCount = lines.filter(line => 
            line.includes('const') || 
            line.includes('static') ||
            line.includes('volatile')
        ).length;

        if (usageCount > 0) {
            return 'This variable uses qualifiers (const, static, etc.).';
        } else {
            return 'This variable has no special qualifiers.';
        }
    }

    private getNamespaceContent(context: string): string {
        const lines = context.split('\n');
        const contentLines = lines.filter(line => 
            line.trim().length > 0 && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*') &&
            !line.trim().startsWith('namespace')
        ).length;

        return `Contains approximately ${contentLines} lines of code.`;
    }

    private getGenericContext(context: string): string {
        const lines = context.split('\n');
        const codeLines = lines.filter(line => 
            line.trim().length > 0 && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*')
        ).length;

        return `This symbol is part of a ${codeLines}-line code block.`;
    }

    private getLineContext(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(0, position.line - 3);
        const endLine = Math.min(document.lineCount - 1, position.line + 3);
        
        const contextLines: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
            contextLines.push(document.lineAt(i).text);
        }
        
        return contextLines.join('\n');
    }

    private generateSuggestions(lineText: string, context: string): string[] {
        const suggestions: string[] = [];
        
        // Basic code completion suggestions
        if (lineText.includes('std::')) {
            suggestions.push('Consider using namespace std; or specific using declarations');
        }
        
        if (lineText.includes('new ') && !lineText.includes('delete')) {
            suggestions.push('Consider using smart pointers (std::unique_ptr, std::shared_ptr)');
        }
        
        if (lineText.includes('malloc') || lineText.includes('free')) {
            suggestions.push('Consider using C++ memory management instead of C-style allocation');
        }
        
        if (lineText.includes('printf') || lineText.includes('scanf')) {
            suggestions.push('Consider using std::cout, std::cin, or std::format (C++20)');
        }
        
        return suggestions;
    }

    private generateRefactoringSuggestions(symbol: Symbol, context: string): string[] {
        const suggestions: string[] = [];
        
        switch (symbol.kind) {
            case 'function':
                suggestions.push('Extract common functionality into helper functions');
                suggestions.push('Consider making the function const-correct');
                suggestions.push('Add noexcept specification if appropriate');
                break;
            case 'class':
            case 'struct':
                suggestions.push('Consider using the Rule of Five/Zero');
                suggestions.push('Add virtual destructor if inheritance is planned');
                suggestions.push('Consider making member functions const where possible');
                break;
            case 'variable':
                suggestions.push('Consider using const if the value doesn\'t change');
                suggestions.push('Use initialization lists for member variables');
                suggestions.push('Consider using auto for type deduction');
                break;
        }
        
        return suggestions;
    }

    private async analyzeSymbolUsage(symbol: Symbol): Promise<any> {
        // This would integrate with the symbol database to analyze usage patterns
        return {
            definitionCount: 1,
            declarationCount: 0,
            usageCount: 0,
            files: [symbol.file],
            scopes: [symbol.scope]
        };
    }

    private formatUsageAnalysis(analysis: any): string {
        return `
**Usage Analysis:**

- **Definitions:** ${analysis.definitionCount}
- **Declarations:** ${analysis.declarationCount}
- **Usages:** ${analysis.usageCount}
- **Files:** ${analysis.files.length}
- **Scopes:** ${analysis.scopes.length}

**Recommendations:**
- ${analysis.usageCount === 0 ? 'This symbol is not used. Consider removing it.' : 'This symbol is actively used.'}
- ${analysis.files.length > 1 ? 'This symbol is used across multiple files.' : 'This symbol is used in a single file.'}
        `.trim();
    }

    clearCache() {
        this.contextCache.clear();
    }
} 