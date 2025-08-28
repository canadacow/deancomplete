# DeanComplete - Advanced C/C++ Code Browsing Extension

A powerful VS Code extension for intelligent C/C++ code analysis, navigation, and AI-assisted development.

## Features

### 🚀 Fast C/C++ Parsing
- **Tree-sitter based parsing** for lightning-fast symbol extraction
- **Real-time analysis** with incremental updates
- **Proper scope maintenance** with hierarchical symbol tracking
- **Header file resolution** to prevent lost includes and duplicate definitions

### 🧠 AI-Powered Code Assistance
- **Context-aware symbol analysis** with intelligent suggestions
- **Code quality insights** with complexity metrics and best practices
- **Refactoring recommendations** based on modern C++ patterns
- **Usage pattern analysis** to understand how symbols are used

### 🔍 Advanced Code Navigation
- **Symbol information panels** with detailed context
- **Scope tree visualization** showing hierarchical relationships
- **Reference finding** across the entire workspace
- **Dependency analysis** with circular dependency detection

### 📊 Code Quality Analysis
- **Cyclomatic complexity** calculation
- **Code metrics** (lines of code, comment ratio, etc.)
- **Issue detection** for common C++ anti-patterns
- **Unused symbol identification**

## Commands

### Core Commands
- **`DeanComplete: Analyze Current File`** - Parse and analyze the current C/C++ file
- **`DeanComplete: Show Symbol Information`** - Display detailed information about the symbol at cursor
- **`DeanComplete: Find All References`** - Find all usages of the current symbol
- **`DeanComplete: Show Scope Tree`** - Visualize the scope hierarchy for the current file

### Context Menu
Right-click in a C/C++ file to access:
- Show Symbol Information
- Find All References

## Architecture

### Core Components

1. **CppParser** - Fast tree-sitter based C/C++ parsing
2. **SymbolDatabase** - Efficient symbol storage and indexing
3. **ScopeManager** - Hierarchical scope tracking and management
4. **AIAssistant** - Context-aware code analysis and suggestions
5. **CodeAnalyzer** - Code quality metrics and issue detection

### Key Features

#### Fast Parsing
- Uses tree-sitter for efficient syntax tree parsing
- Supports both C and C++ with appropriate grammar selection
- Incremental parsing for real-time updates
- Symbol caching for performance

#### Scope Management
- Maintains proper scope hierarchies (namespaces, classes, functions)
- Tracks symbol visibility and accessibility
- Handles nested scopes correctly
- Prevents scope pollution issues

#### AI Integration
- Context-aware symbol analysis
- Code quality recommendations
- Modern C++ best practices suggestions
- Refactoring guidance

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile the extension: `npm run compile`
4. Press F5 in VS Code to run the extension in debug mode

## Development

### Building
```bash
npm run compile        # Build the extension
npm run watch          # Watch for changes and rebuild
npm run package        # Create VSIX package
```

### Testing
```bash
npm run test           # Run tests
npm run lint           # Run linter
```

## Sample Usage

The extension includes a sample C++ file (`sample.cpp`) that demonstrates:

- **Namespaces** (`math`, `utils`)
- **Classes** (`Calculator`, `Logger`, `Application`)
- **Templates** (`Logger<T>`)
- **Smart pointers** (`std::unique_ptr`)
- **Exception handling**
- **Static members**
- **Modern C++ features**

### Testing the Extension

1. Open `sample.cpp` in VS Code
2. Right-click on any symbol (e.g., `Calculator`, `add`, `main`)
3. Select "DeanComplete: Show Symbol Information"
4. Explore the scope tree and symbol relationships

## Configuration

The extension automatically activates for C/C++ files and provides:
- Status bar indicator showing analysis status
- File watchers for real-time updates
- Context menu integration
- Command palette integration

## Roadmap

### Planned Features
- [ ] **Header file dependency graph**
- [ ] **Advanced refactoring tools**
- [ ] **Performance profiling integration**
- [ ] **Custom rule engine**
- [ ] **Team collaboration features**
- [ ] **Integration with external tools** (clang-tidy, cppcheck)

### Performance Optimizations
- [ ] **Incremental parsing improvements**
- [ ] **Symbol database optimization**
- [ ] **Memory usage optimization**
- [ ] **Parallel processing for large workspaces**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check the documentation
- Review the sample code

---

**DeanComplete** - Making C/C++ development faster, smarter, and more enjoyable! 🚀
