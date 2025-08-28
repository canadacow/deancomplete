import { SymbolDatabase } from '../database/SymbolDatabase';
import { ScopeManager } from '../scope/ScopeManager';
import { Symbol } from '../parser/CppParser';

export interface CodeMetrics {
    cyclomaticComplexity: number;
    linesOfCode: number;
    commentLines: number;
    blankLines: number;
    functionCount: number;
    classCount: number;
    variableCount: number;
    namespaceCount: number;
}

export interface DependencyAnalysis {
    includes: string[];
    dependencies: string[];
    circularDependencies: string[][];
    unusedIncludes: string[];
}

export interface CodeQualityReport {
    metrics: CodeMetrics;
    dependencies: DependencyAnalysis;
    issues: CodeIssue[];
    suggestions: string[];
}

export interface CodeIssue {
    type: 'warning' | 'error' | 'info';
    message: string;
    line: number;
    column: number;
    file: string;
    severity: 'low' | 'medium' | 'high';
}

export class CodeAnalyzer {
    constructor(
        private symbolDb: SymbolDatabase,
        private scopeManager: ScopeManager
    ) {}

    async analyzeFile(filePath: string, content: string): Promise<CodeQualityReport> {
        const metrics = this.calculateMetrics(content);
        const dependencies = await this.analyzeDependencies(filePath, content);
        const issues = this.detectIssues(filePath, content);
        const suggestions = this.generateSuggestions(metrics, dependencies, issues);

        return {
            metrics,
            dependencies,
            issues,
            suggestions
        };
    }

    async analyzeWorkspace(): Promise<Map<string, CodeQualityReport>> {
        const reports = new Map<string, CodeQualityReport>();
        
        // This would iterate through all files in the workspace
        // For now, we'll return an empty map
        return reports;
    }

    getComplexityAnalysis(filePath: string): { functions: Array<{ name: string; complexity: number }> } {
        const symbols = this.symbolDb.getSymbolsInFile(filePath);
        const functions = symbols.filter(s => s.kind === 'function');
        
        const complexityData = functions.map(func => ({
            name: func.name,
            complexity: this.calculateFunctionComplexity(func)
        }));

        return { functions: complexityData };
    }

    getDependencyGraph(): Map<string, string[]> {
        const graph = new Map<string, string[]>();
        
        // This would build a dependency graph from the symbol database
        // For now, return empty graph
        return graph;
    }

    findUnusedSymbols(): Symbol[] {
        const allSymbols = this.symbolDb.getAllSymbols();
        const unused: Symbol[] = [];

        for (const symbol of allSymbols) {
            const references = this.symbolDb.findReferences(symbol);
            if (references.length === 0 && !symbol.isDeclaration) {
                unused.push(symbol);
            }
        }

        return unused;
    }

    findDuplicateSymbols(): Array<{ name: string; symbols: Symbol[] }> {
        const allSymbols = this.symbolDb.getAllSymbols();
        const symbolGroups = new Map<string, Symbol[]>();

        for (const symbol of allSymbols) {
            if (!symbolGroups.has(symbol.name)) {
                symbolGroups.set(symbol.name, []);
            }
            symbolGroups.get(symbol.name)!.push(symbol);
        }

        const duplicates: Array<{ name: string; symbols: Symbol[] }> = [];
        for (const [name, symbols] of symbolGroups) {
            if (symbols.length > 1) {
                duplicates.push({ name, symbols });
            }
        }

        return duplicates;
    }

    private calculateMetrics(content: string): CodeMetrics {
        const lines = content.split('\n');
        const codeLines = lines.filter(line => 
            line.trim().length > 0 && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*') &&
            !line.trim().startsWith('*')
        );
        
        const commentLines = lines.filter(line => 
            line.trim().startsWith('//') || 
            line.trim().startsWith('/*') ||
            line.trim().startsWith('*')
        ).length;
        
        const blankLines = lines.filter(line => line.trim().length === 0).length;
        
        // Calculate cyclomatic complexity (simplified)
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
        
        // Get symbol counts from database
        const stats = this.symbolDb.getSymbolStatistics();
        
        return {
            cyclomaticComplexity,
            linesOfCode: codeLines.length,
            commentLines,
            blankLines,
            functionCount: stats.byKind.get('function') || 0,
            classCount: (stats.byKind.get('class') || 0) + (stats.byKind.get('struct') || 0),
            variableCount: stats.byKind.get('variable') || 0,
            namespaceCount: stats.byKind.get('namespace') || 0
        };
    }

    private calculateCyclomaticComplexity(content: string): number {
        let complexity = 1; // Base complexity
        
        // Count decision points
        const decisionPatterns = [
            /\bif\s*\(/g,
            /\belse\s*if\s*\(/g,
            /\bfor\s*\(/g,
            /\bwhile\s*\(/g,
            /\bdo\s*{/g,
            /\bswitch\s*\(/g,
            /\bcase\s+/g,
            /\bdefault\s*:/g,
            /\b&&\b/g,
            /\b\|\|\b/g,
            /\b\?\b/g,
            /\bcatch\s*\(/g
        ];

        for (const pattern of decisionPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }

        return complexity;
    }

    private calculateFunctionComplexity(func: Symbol): number {
        // This would analyze the function's content to calculate complexity
        // For now, return a simple estimate based on symbol type
        return func.kind === 'function' ? 1 : 0;
    }

    private async analyzeDependencies(filePath: string, content: string): Promise<DependencyAnalysis> {
        const includes = this.extractIncludes(content);
        const dependencies = this.findDependencies(filePath);
        const circularDependencies = this.findCircularDependencies(dependencies);
        const unusedIncludes = this.findUnusedIncludes(includes, content);

        return {
            includes,
            dependencies,
            circularDependencies,
            unusedIncludes
        };
    }

    private extractIncludes(content: string): string[] {
        const includePattern = /#include\s*[<"]([^>"]+)[>"]/g;
        const includes: string[] = [];
        let match;

        while ((match = includePattern.exec(content)) !== null) {
            includes.push(match[1]);
        }

        return includes;
    }

    private findDependencies(filePath: string): string[] {
        // This would analyze the symbol database to find file dependencies
        // For now, return empty array
        return [];
    }

    private findCircularDependencies(dependencies: string[]): string[][] {
        // This would implement cycle detection in the dependency graph
        // For now, return empty array
        return [];
    }

    private findUnusedIncludes(includes: string[], content: string): string[] {
        const unused: string[] = [];

        for (const include of includes) {
            const symbolName = this.extractSymbolNameFromInclude(include);
            if (symbolName && !content.includes(symbolName)) {
                unused.push(include);
            }
        }

        return unused;
    }

    private extractSymbolNameFromInclude(include: string): string | null {
        // Extract the main symbol name from include path
        const parts = include.split('/');
        const filename = parts[parts.length - 1];
        
        // Remove extension
        const name = filename.replace(/\.(h|hpp|hxx)$/, '');
        
        return name || null;
    }

    private detectIssues(filePath: string, content: string): CodeIssue[] {
        const issues: CodeIssue[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for common issues
            if (line.includes('using namespace std;')) {
                issues.push({
                    type: 'warning',
                    message: 'Avoid using namespace std; in header files',
                    line: lineNumber,
                    column: line.indexOf('using namespace std;') + 1,
                    file: filePath,
                    severity: 'medium'
                });
            }

            if (line.includes('new ') && !line.includes('delete')) {
                issues.push({
                    type: 'warning',
                    message: 'Consider using smart pointers instead of raw pointers',
                    line: lineNumber,
                    column: line.indexOf('new ') + 1,
                    file: filePath,
                    severity: 'medium'
                });
            }

            if (line.includes('malloc') || line.includes('free')) {
                issues.push({
                    type: 'warning',
                    message: 'Consider using C++ memory management instead of C-style allocation',
                    line: lineNumber,
                    column: 1,
                    file: filePath,
                    severity: 'medium'
                });
            }

            if (line.includes('printf') || line.includes('scanf')) {
                issues.push({
                    type: 'info',
                    message: 'Consider using std::cout, std::cin, or std::format (C++20)',
                    line: lineNumber,
                    column: 1,
                    file: filePath,
                    severity: 'low'
                });
            }
        }

        return issues;
    }

    private generateSuggestions(metrics: CodeMetrics, dependencies: DependencyAnalysis, issues: CodeIssue[]): string[] {
        const suggestions: string[] = [];

        // Complexity suggestions
        if (metrics.cyclomaticComplexity > 10) {
            suggestions.push('Consider breaking down complex functions into smaller, more manageable pieces');
        }

        if (metrics.linesOfCode > 1000) {
            suggestions.push('This file is quite large. Consider splitting it into multiple files');
        }

        if (metrics.commentLines / metrics.linesOfCode < 0.1) {
            suggestions.push('Consider adding more documentation comments to improve code readability');
        }

        // Dependency suggestions
        if (dependencies.unusedIncludes.length > 0) {
            suggestions.push(`Remove unused includes: ${dependencies.unusedIncludes.join(', ')}`);
        }

        if (dependencies.circularDependencies.length > 0) {
            suggestions.push('Resolve circular dependencies to improve build times and reduce coupling');
        }

        // Issue-based suggestions
        const highSeverityIssues = issues.filter(i => i.severity === 'high');
        if (highSeverityIssues.length > 0) {
            suggestions.push(`Address ${highSeverityIssues.length} high-severity issues`);
        }

        return suggestions;
    }
} 