cmake_minimum_required(VERSION 3.10)  # 指定CMake最低版本要求
project(ValveControl)  # 定义项目名称

# 添加UTF-8支持
if(MSVC)  # 如果使用的是Microsoft Visual C++编译器
  # 只使用一个UTF-8选项，确保源代码以UTF-8编码处理
  add_compile_options(/utf-8)  # 添加编译选项，使MSVC支持UTF-8编码
endif()

# 设置C++标准
set(CMAKE_CXX_STANDARD 17)  # 使用C++17标准
set(CMAKE_CXX_STANDARD_REQUIRED ON)  # 强制要求支持指定的C++标准

# 添加头文件目录
include_directories(${PROJECT_SOURCE_DIR}/include)  # 将项目根目录下的include文件夹添加到包含路径

# 收集源文件
file(GLOB SOURCES  # 使用GLOB收集所有匹配的源文件
    "src/*.cpp"    # 包含src目录下的所有cpp文件
    "src/**/*.cpp"  # 包含src的所有子目录下的cpp文件
)

# 创建可执行文件
add_executable(valve_control  # 创建名为valve_control的可执行文件
    main.cpp  # 主程序源文件
    ${SOURCES}  # 之前收集的所有源文件
)

# 添加线程库依赖
find_package(Threads REQUIRED)  # 查找线程库，并标记为必需
target_link_libraries(valve_control PRIVATE Threads::Threads)  # 将线程库链接到可执行文件

