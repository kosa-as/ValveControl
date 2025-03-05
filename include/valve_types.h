#pragma once  // 防止头文件重复包含

namespace valve {  // 阀门控制系统命名空间

/**
 * 阀门参数结构体
 * 用于配置阀门的基本参数
 * 对应Coco模型中的ValveParameters
 */
struct ValveParameters {
    int openPosition;   // 阀门完全打开时的位置值
    int closePosition;  // 阀门完全关闭时的位置值
    int moveSpeed;      // 阀门移动速度
    // 其他可能的参数...
};

/**
 * 阀门移动命令枚举
 * 定义了阀门可执行的基本动作
 * 对应Coco模型中的ValveHAL.Moves枚举
 */
enum class ValveMove {
    OPEN = 20,    // 打开阀门命令，值20对应Coco模型中的定义
    CLOSE = 101   // 关闭阀门命令，值101对应Coco模型中的定义
};

/**
 * 阀门状态枚举
 * 表示阀门当前的工作状态
 * 对应Coco模型中的ValveDriver.Status枚举
 */
enum class ValveStatus {
    UNKNOWN,  // 未知状态，初始状态或状态不确定
    OPENED,   // 阀门已完全打开
    CLOSED,   // 阀门已完全关闭
    MOVING,   // 阀门正在移动中
    ERROR     // 阀门发生错误
};

} // namespace valve 