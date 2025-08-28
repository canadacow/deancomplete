import * as vscode from 'vscode';
import { Symbol, Reference } from '../parser/CppParser';

export class SymbolDatabase {
    private symbols: Map<string, Symbol[]> = new Map(); // file -> symbols
    private symbolIndex: Map<string, Symbol[]> = new Map(); // name -> symbols
    private referenceIndex: Map<string, Reference[]> = new Map(); // symbolId -> references

    updateFile(filePath: string, symbols: Symbol[]) {
        // Remove old symbols for this file
        this.removeFile(filePath);
        
        // Add new symbols
        this.symbols.set(filePath, symbols);
        
        // Index symbols by name for fast lookup
        for (const symbol of symbols) {
            const key = this.getSymbolKey(symbol);
            if (!this.symbolIndex.has(symbol.name)) {
                this.symbolIndex.set(symbol.name, []);
            }
            this.symbolIndex.get(symbol.name)!.push(symbol);
        }
    }

    removeFile(filePath: string) {
        const oldSymbols = this.symbols.get(filePath);
        if (oldSymbols) {
            // Remove from symbol index
            for (const symbol of oldSymbols) {
                const symbolsWithName = this.symbolIndex.get(symbol.name);
                if (symbolsWithName) {
                    const index = symbolsWithName.findIndex(s => 
                        s.file === symbol.file && s.line === symbol.line
                    );
                    if (index !== -1) {
                        symbolsWithName.splice(index, 1);
                        if (symbolsWithName.length === 0) {
                            this.symbolIndex.delete(symbol.name);
                        }
                    }
                }
            }
            
            this.symbols.delete(filePath);
        }
    }

    findSymbolAtPosition(filePath: string, position: vscode.Position): Symbol | null {
        const symbols = this.symbols.get(filePath);
        if (!symbols) return null;

        // Find the symbol at the given position
        for (const symbol of symbols) {
            if (symbol.line === position.line && symbol.column <= position.character) {
                // For multi-line symbols, we need to check the end position
                // This is a simplified check - in a real implementation, you'd track end positions
                return symbol;
            }
        }

        return null;
    }

    findSymbolsByName(name: string): Symbol[] {
        return this.symbolIndex.get(name) || [];
    }

    findSymbolsByKind(kind: string): Symbol[] {
        const result: Symbol[] = [];
        for (const symbols of this.symbols.values()) {
            result.push(...symbols.filter(s => s.kind === kind));
        }
        return result;
    }

    findSymbolsInScope(scope: string): Symbol[] {
        const result: Symbol[] = [];
        for (const symbols of this.symbols.values()) {
            result.push(...symbols.filter(s => s.scope === scope));
        }
        return result;
    }

    findReferences(symbol: Symbol): Reference[] {
        const key = this.getSymbolKey(symbol);
        return this.referenceIndex.get(key) || [];
    }

    addReference(symbol: Symbol, reference: Reference) {
        const key = this.getSymbolKey(symbol);
        if (!this.referenceIndex.has(key)) {
            this.referenceIndex.set(key, []);
        }
        this.referenceIndex.get(key)!.push(reference);
    }

    findDefinitions(name: string): Symbol[] {
        const symbols = this.findSymbolsByName(name);
        return symbols.filter(s => s.isDefinition);
    }

    findDeclarations(name: string): Symbol[] {
        const symbols = this.findSymbolsByName(name);
        return symbols.filter(s => s.isDeclaration);
    }

    findUsages(name: string): Reference[] {
        const symbols = this.findSymbolsByName(name);
        const references: Reference[] = [];
        
        for (const symbol of symbols) {
            references.push(...this.findReferences(symbol));
        }
        
        return references;
    }

    getSymbolsInFile(filePath: string): Symbol[] {
        return this.symbols.get(filePath) || [];
    }

    getAllSymbols(): Symbol[] {
        const result: Symbol[] = [];
        for (const symbols of this.symbols.values()) {
            result.push(...symbols);
        }
        return result;
    }

    searchSymbols(query: string): Symbol[] {
        const result: Symbol[] = [];
        const lowerQuery = query.toLowerCase();
        
        for (const symbols of this.symbols.values()) {
            result.push(...symbols.filter(s => 
                s.name.toLowerCase().includes(lowerQuery) ||
                (s.type && s.type.toLowerCase().includes(lowerQuery))
            ));
        }
        
        return result;
    }

    getSymbolStatistics(): { total: number; byKind: Map<string, number>; byFile: Map<string, number> } {
        const byKind = new Map<string, number>();
        const byFile = new Map<string, number>();
        let total = 0;

        for (const [filePath, symbols] of this.symbols) {
            byFile.set(filePath, symbols.length);
            total += symbols.length;

            for (const symbol of symbols) {
                const count = byKind.get(symbol.kind) || 0;
                byKind.set(symbol.kind, count + 1);
            }
        }

        return { total, byKind, byFile };
    }

    private getSymbolKey(symbol: Symbol): string {
        return `${symbol.file}:${symbol.line}:${symbol.column}:${symbol.name}`;
    }

    clear() {
        this.symbols.clear();
        this.symbolIndex.clear();
        this.referenceIndex.clear();
    }
} 