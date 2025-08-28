import Parser = require('tree-sitter');
import Cpp = require('tree-sitter-cpp');
import C = require('tree-sitter-c');
import * as vscode from 'vscode';

export interface Symbol {
    name: string;
    kind: string;
    file: string;
    line: number;
    column: number;
    scope: string;
    type?: string;
    signature?: string;
    isDefinition: boolean;
    isDeclaration: boolean;
    references: Reference[];
}

export interface Reference {
    file: string;
    line: number;
    column: number;
    kind: 'definition' | 'declaration' | 'usage';
}

export interface Scope {
    name: string;
    type: 'namespace' | 'class' | 'struct' | 'function' | 'block';
    startLine: number;
    endLine: number;
    symbols: Symbol[];
    children: Scope[];
    parent?: Scope;
}

export class CppParser {
    private cppParser: Parser;
    private cParser: Parser;
    private symbolCache: Map<string, Symbol[]> = new Map();

    constructor() {
        this.cppParser = new Parser();
        this.cppParser.setLanguage(Cpp);
        
        this.cParser = new Parser();
        this.cParser.setLanguage(C);
    }

    async parseFile(content: string, filePath: string): Promise<Symbol[]> {
        const isCpp = this.isCppFile(filePath);
        const parser = isCpp ? this.cppParser : this.cParser;
        
        const tree = parser.parse(content);
        const symbols: Symbol[] = [];
        
        // Parse the syntax tree
        this.parseNode(tree.rootNode, symbols, filePath, '');
        
        // Cache the results
        this.symbolCache.set(filePath, symbols);
        
        return symbols;
    }

    private parseNode(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, currentScope: string) {
        // Extract symbols based on node type
        switch (node.type) {
            case 'function_definition':
                this.extractFunction(node, symbols, filePath, currentScope);
                break;
            case 'declaration':
                this.extractDeclaration(node, symbols, filePath, currentScope);
                break;
            case 'class_specifier':
                this.extractClass(node, symbols, filePath, currentScope);
                break;
            case 'struct_specifier':
                this.extractStruct(node, symbols, filePath, currentScope);
                break;
            case 'namespace_definition':
                this.extractNamespace(node, symbols, filePath, currentScope);
                break;
            case 'enum_specifier':
                this.extractEnum(node, symbols, filePath, currentScope);
                break;
            case 'typedef_declaration':
                this.extractTypedef(node, symbols, filePath, currentScope);
                break;
        }

        // Recursively parse child nodes
        for (const child of node.children as Parser.SyntaxNode[]) {
            this.parseNode(child, symbols, filePath, currentScope);
        }
    }

    private extractFunction(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const declarator = node.childForFieldName('declarator');
        if (!declarator) return;

        const name = this.extractIdentifier(declarator);
        if (!name) return;

        const type = this.extractType(node);
        const signature = this.extractSignature(node);

        symbols.push({
            name,
            kind: 'function',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            type,
            signature,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });
    }

    private extractDeclaration(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const declarator = node.childForFieldName('declarator');
        if (!declarator) return;

        const name = this.extractIdentifier(declarator);
        if (!name) return;

        const type = this.extractType(node);
        const isExtern = node.children.some(child => child.type === 'storage_class_specifier' && child.text === 'extern');

        symbols.push({
            name,
            kind: 'variable',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            type,
            isDefinition: !isExtern,
            isDeclaration: isExtern,
            references: []
        });
    }

    private extractClass(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const name = this.extractIdentifier(node);
        if (!name) return;

        symbols.push({
            name,
            kind: 'class',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });

        // Parse class members
        const body = node.childForFieldName('body');
        if (body) {
            const classScope = scope ? `${scope}::${name}` : name;
            for (const child of body.children) {
                this.parseNode(child, symbols, filePath, classScope);
            }
        }
    }

    private extractStruct(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const name = this.extractIdentifier(node);
        if (!name) return;

        symbols.push({
            name,
            kind: 'struct',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });

        // Parse struct members
        const body = node.childForFieldName('body');
        if (body) {
            const structScope = scope ? `${scope}::${name}` : name;
            for (const child of body.children) {
                this.parseNode(child, symbols, filePath, structScope);
            }
        }
    }

    private extractNamespace(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const name = this.extractIdentifier(node);
        if (!name) return;

        symbols.push({
            name,
            kind: 'namespace',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });

        // Parse namespace contents
        const body = node.childForFieldName('body');
        if (body) {
            const namespaceScope = scope ? `${scope}::${name}` : name;
            for (const child of body.children) {
                this.parseNode(child, symbols, filePath, namespaceScope);
            }
        }
    }

    private extractEnum(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const name = this.extractIdentifier(node);
        if (!name) return;

        symbols.push({
            name,
            kind: 'enum',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });

        // Parse enum values
        const body = node.childForFieldName('body');
        if (body) {
            for (const child of body.children) {
                if (child.type === 'enumerator') {
                    const enumName = this.extractIdentifier(child);
                    if (enumName) {
                        symbols.push({
                            name: enumName,
                            kind: 'enum_value',
                            file: filePath,
                            line: child.startPosition.row,
                            column: child.startPosition.column,
                            scope: scope ? `${scope}::${name}` : name,
                            isDefinition: true,
                            isDeclaration: false,
                            references: []
                        });
                    }
                }
            }
        }
    }

    private extractTypedef(node: Parser.SyntaxNode, symbols: Symbol[], filePath: string, scope: string) {
        const declarator = node.childForFieldName('declarator');
        if (!declarator) return;

        const name = this.extractIdentifier(declarator);
        if (!name) return;

        const type = this.extractType(node);

        symbols.push({
            name,
            kind: 'typedef',
            file: filePath,
            line: node.startPosition.row,
            column: node.startPosition.column,
            scope,
            type,
            isDefinition: true,
            isDeclaration: false,
            references: []
        });
    }

    private extractIdentifier(node: Parser.SyntaxNode): string | null {
        // Look for identifier in the node or its children
        if (node.type === 'identifier') {
            return node.text;
        }

        for (const child of node.children) {
            if (child.type === 'identifier') {
                return child.text;
            }
        }

        // Handle qualified identifiers (e.g., std::string)
        if (node.type === 'qualified_identifier') {
            return node.text;
        }

        return null;
    }

    private extractType(node: Parser.SyntaxNode): string {
        const typeNodes: string[] = [];
        
        for (const child of node.children) {
            if (child.type === 'primitive_type' || 
                child.type === 'type_identifier' ||
                child.type === 'qualified_identifier') {
                typeNodes.push(child.text);
            }
        }

        return typeNodes.join(' ');
    }

    private extractSignature(node: Parser.SyntaxNode): string {
        // Extract function signature including parameters
        const declarator = node.childForFieldName('declarator');
        if (!declarator) return '';

        const parameters: string[] = [];
        const parameterList = declarator.childForFieldName('parameters');
        
        if (parameterList) {
            for (const param of parameterList.children) {
                if (param.type === 'parameter_declaration') {
                    const type = this.extractType(param);
                    const name = this.extractIdentifier(param);
                    parameters.push(name ? `${type} ${name}` : type);
                }
            }
        }

        const returnType = this.extractType(node);
        const name = this.extractIdentifier(declarator);
        
        return `${returnType} ${name}(${parameters.join(', ')})`;
    }

    private isCppFile(filePath: string): boolean {
        const cppExtensions = ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return cppExtensions.includes(ext);
    }

    getCachedSymbols(filePath: string): Symbol[] | undefined {
        return this.symbolCache.get(filePath);
    }

    clearCache(filePath?: string) {
        if (filePath) {
            this.symbolCache.delete(filePath);
        } else {
            this.symbolCache.clear();
        }
    }
} 