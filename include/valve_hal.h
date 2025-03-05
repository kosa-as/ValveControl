#pragma once  // 防止头文件重复包含
#include "valve_types.h"  // 包含基本类型定义
#include <memory>  // 智能指针支持
#include <string>  // 字符串支持

namespace valve {  // 阀门控制系统命名空间

/**
 * 硬件抽象层接口
 * 定义了与硬件交互的标准接口
 * 使用策略模式允许不同的硬件实现
 * 对应Coco模型中的ValveHAL接口
 */
class IValveHAL {
public:
    virtual ~IValveHAL() = default;  // 虚析构函数
    
    /**
     * 设置阀门参数
     * @param params 阀门参数结构体
     * @return 设置是否成功
     */
    virtual bool setParameters(const ValveParameters& params) = 0;
    
    /**
     * 执行阀门移动操作
     * @param target 移动目标(打开/关闭)
     * @return 操作是否成功启动
     */
    virtual bool move(ValveMove target) = 0;
    
    /**
     * 获取当前阀门状态
     * @return 阀门当前状态
     */
    virtual ValveStatus getStatus() const = 0;
};

/**
 * 硬件抽象层工厂类
 * 使用工厂方法模式创建不同类型的硬件抽象层实例
 * 支持R7需求(硬件变更适应性)
 */
class ValveHALFactory {
public:
    /**
     * 创建硬件抽象层实例
     * @param type 硬件类型，如"simulator"表示模拟器
     * @return 硬件抽象层接口的智能指针
     */
    static std::unique_ptr<IValveHAL> createHAL(const std::string& type);
};

} // namespace valve 