cmake_minimum_required(VERSION 3.20)
project(deancomplete_definition_indexer LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

list(APPEND CMAKE_MODULE_PATH ${LLVM_DIR})
include(AddLLVM)

find_package(Clang REQUIRED CONFIG)
message(STATUS "Found Clang at: ${Clang_DIR}")

include_directories(${LLVM_INCLUDE_DIRS})
add_definitions(${LLVM_DEFINITIONS})

add_executable(definition_indexer
    src/main.cpp
)

set_target_properties(definition_indexer PROPERTIES
    OUTPUT_NAME "definition_indexer"
)

target_link_libraries(definition_indexer
    PRIVATE
        clangTooling
        clangBasic
        clangASTMatchers
)

if (MSVC)
    target_compile_options(definition_indexer PRIVATE /utf-8)
endif()


