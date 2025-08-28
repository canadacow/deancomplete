import { Symbol, Scope } from '../parser/CppParser';

export class ScopeManager {
    private fileScopes: Map<string, Scope[]> = new Map();
    private globalScopes: Map<string, Scope> = new Map(); // scope name -> scope

    buildScopeTree(symbols: Symbol[], filePath: string): Scope[] {
        const scopes: Scope[] = [];
        const scopeStack: Scope[] = [];

        // Sort symbols by line number to process them in order
        const sortedSymbols = [...symbols].sort((a, b) => a.line - b.line);

        for (const symbol of sortedSymbols) {
            // Create scope for certain symbol types
            if (this.isScopeSymbol(symbol)) {
                const scope = this.createScope(symbol);
                
                // Find parent scope
                while (scopeStack.length > 0 && 
                       scopeStack[scopeStack.length - 1].endLine < symbol.line) {
                    scopeStack.pop();
                }

                if (scopeStack.length > 0) {
                    scope.parent = scopeStack[scopeStack.length - 1];
                    scopeStack[scopeStack.length - 1].children.push(scope);
                } else {
                    scopes.push(scope);
                }

                scopeStack.push(scope);
            }

            // Add symbol to current scope
            if (scopeStack.length > 0) {
                scopeStack[scopeStack.length - 1].symbols.push(symbol);
            }
        }

        // Update end lines for scopes
        this.updateScopeEndLines(scopes, symbols);

        // Store scopes for this file
        this.fileScopes.set(filePath, scopes);

        // Update global scope index
        this.updateGlobalScopes(scopes);

        return scopes;
    }

    updateFile(filePath: string, scopes: Scope[]) {
        this.fileScopes.set(filePath, scopes);
        this.updateGlobalScopes(scopes);
    }

    removeFile(filePath: string) {
        const scopes = this.fileScopes.get(filePath);
        if (scopes) {
            // Remove from global scope index
            for (const scope of scopes) {
                this.removeScopeFromGlobalIndex(scope);
            }
            this.fileScopes.delete(filePath);
        }
    }

    getFileScopes(filePath: string): Scope[] | undefined {
        return this.fileScopes.get(filePath);
    }

    findScopeByName(name: string): Scope | undefined {
        return this.globalScopes.get(name);
    }

    findScopeAtPosition(filePath: string, line: number): Scope | undefined {
        const scopes = this.fileScopes.get(filePath);
        if (!scopes) return undefined;

        return this.findScopeAtLine(scopes, line);
    }

    getScopeHierarchy(scope: Scope): Scope[] {
        const hierarchy: Scope[] = [scope];
        let current = scope.parent;
        
        while (current) {
            hierarchy.unshift(current);
            current = current.parent;
        }
        
        return hierarchy;
    }

    getScopePath(scope: Scope): string {
        const hierarchy = this.getScopeHierarchy(scope);
        return hierarchy.map(s => s.name).join('::');
    }

    findSymbolsInScope(scopeName: string): Symbol[] {
        const scope = this.globalScopes.get(scopeName);
        if (!scope) return [];

        return scope.symbols;
    }

    findChildScopes(scopeName: string): Scope[] {
        const scope = this.globalScopes.get(scopeName);
        if (!scope) return [];

        return scope.children;
    }

    getAllScopes(): Scope[] {
        return Array.from(this.globalScopes.values());
    }

    getScopeStatistics(): { total: number; byType: Map<string, number>; byFile: Map<string, number> } {
        const byType = new Map<string, number>();
        const byFile = new Map<string, number>();
        let total = 0;

        for (const [filePath, scopes] of this.fileScopes) {
            byFile.set(filePath, scopes.length);
            total += scopes.length;

            for (const scope of scopes) {
                const count = byType.get(scope.type) || 0;
                byType.set(scope.type, count + 1);
            }
        }

        return { total, byType, byFile };
    }

    private isScopeSymbol(symbol: Symbol): boolean {
        return ['namespace', 'class', 'struct', 'function'].includes(symbol.kind);
    }

    private createScope(symbol: Symbol): Scope {
        return {
            name: symbol.name,
            type: symbol.kind as 'namespace' | 'class' | 'struct' | 'function',
            startLine: symbol.line,
            endLine: symbol.line, // Will be updated later
            symbols: [],
            children: [],
            parent: undefined
        };
    }

    private updateScopeEndLines(scopes: Scope[], symbols: Symbol[]) {
        for (const scope of scopes) {
            // Find the last symbol in this scope
            const scopeSymbols = scope.symbols.filter(s => 
                s.line >= scope.startLine && s.kind !== scope.type
            );
            
            if (scopeSymbols.length > 0) {
                const lastSymbol = scopeSymbols[scopeSymbols.length - 1];
                scope.endLine = lastSymbol.line;
            }

            // Recursively update child scopes
            this.updateScopeEndLines(scope.children, symbols);
        }
    }

    private findScopeAtLine(scopes: Scope[], line: number): Scope | undefined {
        for (const scope of scopes) {
            if (line >= scope.startLine && line <= scope.endLine) {
                // Check if there's a more specific child scope
                const childScope = this.findScopeAtLine(scope.children, line);
                if (childScope) {
                    return childScope;
                }
                return scope;
            }
        }
        return undefined;
    }

    private updateGlobalScopes(scopes: Scope[]) {
        for (const scope of scopes) {
            this.globalScopes.set(scope.name, scope);
            this.updateGlobalScopes(scope.children);
        }
    }

    private removeScopeFromGlobalIndex(scope: Scope) {
        this.globalScopes.delete(scope.name);
        for (const child of scope.children) {
            this.removeScopeFromGlobalIndex(child);
        }
    }

    clear() {
        this.fileScopes.clear();
        this.globalScopes.clear();
    }
} 