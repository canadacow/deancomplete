declare module 'tree-sitter-cpp' {
    const language: any;
    export = language;
}

declare module 'tree-sitter-c' {
    const language: any;
    export = language;
} 

declare module 'tree-sitter' {
    export interface Point {
        row: number;
        column: number;
    }

    export interface SyntaxNode {
        type: string;
        text: string;
        children: SyntaxNode[];
        childCount: number;
        startPosition: Point;
        endPosition: Point;
        child(index: number): SyntaxNode | null;
        namedChild(index: number): SyntaxNode | null;
        childForFieldName(field: string): SyntaxNode | null;
    }

    export interface Tree {
        rootNode: SyntaxNode;
    }

    export interface Language {}

    class Parser {
        setLanguage(language: Language): void;
        parse(input: string): Tree;
    }

    export = Parser;
}