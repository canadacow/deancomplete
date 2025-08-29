cmake_minimum_required(VERSION 3.20)
project(deancomplete_all LANGUAGES CXX)

# If vcpkg toolchain is present, CMake will pick it up via CMAKE_TOOLCHAIN_FILE env/arg

add_subdirectory(tools/definition_indexer)


