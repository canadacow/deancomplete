#include <clang/Tooling/CommonOptionsParser.h>
#include <clang/Tooling/Tooling.h>
#include <clang/Frontend/FrontendActions.h>
#include <clang/AST/AST.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/AST/ASTContext.h>
#include <clang/AST/Decl.h>
#include <clang/Basic/SourceManager.h>
#include <clang/Basic/Version.h>
#include <llvm/Support/CommandLine.h>
#include <llvm/Support/Path.h>
#include <llvm/Support/JSON.h>
#include <fstream>
#include <string>

using namespace clang;
using namespace clang::tooling;
using namespace llvm;

static cl::OptionCategory Cat("deancomplete-indexer");
static cl::opt<std::string> OutPath("out", cl::desc("Output JSONL path"), cl::value_desc("file"), cl::init("index.jsonl"), cl::cat(Cat));

namespace {
struct DefVisitor : public RecursiveASTVisitor<DefVisitor> {
    ASTContext *Context{};
    std::ofstream *Out{};

    bool VisitFunctionDecl(FunctionDecl *FD) {
        if (!FD->isThisDeclarationADefinition()) return true;
        SourceManager &SM = Context->getSourceManager();
        SourceLocation Loc = FD->getLocation();
        if (Loc.isInvalid() || !SM.isInMainFile(Loc)) return true;
        PresumedLoc P = SM.getPresumedLoc(Loc);
        if (!P.isValid()) return true;
        std::string name = FD->getQualifiedNameAsString();
        (*Out) << llvm::formatv("{{\"name\":\"{0}\",\"file\":\"{1}\",\"line\":{2},\"column\":{3}}}\n",
                                name, P.getFilename(), (int)P.getLine()-1, (int)P.getColumn()-1);
        return true;
    }

    bool VisitCXXRecordDecl(CXXRecordDecl *RD) {
        if (!RD->isThisDeclarationADefinition()) return true;
        SourceManager &SM = Context->getSourceManager();
        SourceLocation Loc = RD->getLocation();
        if (Loc.isInvalid() || !SM.isInMainFile(Loc)) return true;
        PresumedLoc P = SM.getPresumedLoc(Loc);
        if (!P.isValid()) return true;
        std::string name = RD->getQualifiedNameAsString();
        (*Out) << llvm::formatv("{{\"name\":\"{0}\",\"file\":\"{1}\",\"line\":{2},\"column\":{3}}}\n",
                                name, P.getFilename(), (int)P.getLine()-1, (int)P.getColumn()-1);
        return true;
    }
};

class DefConsumer : public ASTConsumer {
public:
    explicit DefConsumer(ASTContext *Ctx, std::ofstream &Out): Ctx(Ctx), Out(Out) {}
    void HandleTranslationUnit(ASTContext &Context) override {
        DefVisitor V; V.Context = &Context; V.Out = &Out; V.TraverseDecl(Context.getTranslationUnitDecl());
    }
private:
    ASTContext *Ctx;
    std::ofstream &Out;
};

class DefAction : public ASTFrontendAction {
public:
    std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &CI, StringRef) override {
        if (!Stream.is_open()) Stream.open(OutPath, std::ios::app);
        return std::make_unique<DefConsumer>(&CI.getASTContext(), Stream);
    }
    void EndSourceFileAction() override {}
private:
    std::ofstream Stream;
};
}

int main(int argc, const char** argv) {
    auto ExpectedParser = CommonOptionsParser::create(argc, argv, Cat);
    if (!ExpectedParser) {
        llvm::errs() << toString(ExpectedParser.takeError()) << "\n";
        return 1;
    }
    CommonOptionsParser &Options = ExpectedParser.get();
    ClangTool Tool(Options.getCompilations(), Options.getSourcePathList());
    return Tool.run(newFrontendActionFactory<DefAction>().get());
}


