#pragma once  // 防止头文件重复包含
#include "valve_types.h"  // 包含基本类型定义
#include "valve_hal.h"    // 包含硬件抽象层接口
#include <functional>     // 函数对象支持
#include <memory>         // 智能指针支持

namespace valve {  // 阀门控制系统命名空间

/**
 * 阀门驱动接口
 * 定义了驱动层的标准接口
 * 使用观察者模式通知状态变化
 * 对应Coco模型中的ValveDriver接口
 */
class IValveDriver {
public:
    virtual ~IValveDriver() = default;  // 虚析构函数
    
    /**
     * 初始化驱动器
     * @param params 阀门参数
     * @return 设置是否成功
     */
    virtual bool setup(const ValveParameters& params) = 0;
    
    /**
     * 打开阀门
     * 异步操作，通过回调通知完成
     */
    virtual void open() = 0;
    
    /**
     * 关闭阀门
     * 异步操作，通过回调通知完成
     */
    virtual void close() = 0;
    
    /**
     * 获取当前阀门状态
     * @return 阀门当前状态
     */
    virtual ValveStatus getStatus() const = 0;
    
    // 观察者模式 - 状态变化通知回调函数类型
    using StatusCallback = std::function<void(ValveStatus)>;
    
    /**
     * 设置状态变化回调
     * @param callback 状态变化时调用的回调函数
     */
    virtual void setStatusCallback(StatusCallback callback) = 0;
};

/**
 * 阀门驱动实现类
 * 实现了驱动接口
 * 使用桥接模式连接硬件抽象层
 * 对应Coco模型中的ValveDriverImpl组件
 */
class ValveDriver : public IValveDriver {
public:
    /**
     * 构造函数
     * @param hal 硬件抽象层接口的智能指针
     */
    explicit ValveDriver(std::unique_ptr<IValveHAL> hal);
    ~ValveDriver() override = default;  // 虚析构函数
    
    // 实现IValveDriver接口的方法
    bool setup(const ValveParameters& params) override;
    void open() override;
    void close() override;
    ValveStatus getStatus() const override;
    void setStatusCallback(StatusCallback callback) override;

private:
    std::unique_ptr<IValveHAL> hal_;  // 硬件抽象层接口
    StatusCallback statusCallback_;    // 状态变化回调函数
    ValveStatus currentStatus_ = ValveStatus::UNKNOWN;  // 当前状态
};

} // namespace valve 