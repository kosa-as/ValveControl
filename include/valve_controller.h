#pragma once  // 防止头文件重复包含
#include "valve_types.h"    // 包含基本类型定义
#include "valve_driver.h"   // 包含驱动层接口
#include <memory>           // 智能指针支持
#include <functional>       // 函数对象支持

namespace valve {  // 阀门控制系统命名空间

// 前向声明
class ValveState;  // 阀门状态类

/**
 * 阀门控制器接口
 * 定义了控制层的标准接口
 * 对应Coco模型中的ValveController接口
 */
class IValveController {
public:
    virtual ~IValveController() = default;  // 虚析构函数
    
    /**
     * 初始化控制器
     * @param params 阀门参数
     * @return 设置是否成功
     */
    virtual bool setup(const ValveParameters& params) = 0;
    
    /**
     * 打开阀门
     * 实现R1需求(基本控制功能)
     */
    virtual void open() = 0;
    
    /**
     * 关闭阀门
     * 实现R1需求(基本控制功能)
     */
    virtual void close() = 0;
    
    /**
     * 查询阀门是否打开
     * 实现R2需求(状态查询)
     * @return 阀门是否处于打开状态
     */
    virtual bool isOpen() const = 0;
    
    /**
     * 查询阀门是否关闭
     * 实现R2需求(状态查询)
     * @return 阀门是否处于关闭状态
     */
    virtual bool isClosed() const = 0;
    
    // 观察者模式 - 状态变化通知回调函数类型
    using StatusCallback = std::function<void(ValveStatus)>;
    
    /**
     * 设置状态变化回调
     * 实现R6需求(执行反馈)
     * @param callback 状态变化时调用的回调函数
     */
    virtual void setStatusCallback(StatusCallback callback) = 0;
};

/**
 * 阀门控制器实现类
 * 实现了控制器接口
 * 使用状态模式管理阀门状态
 * 对应Coco模型中的ValveControllerImpl组件
 */
class ValveController : public IValveController {
public:
    /**
     * 构造函数
     * @param driver 驱动层接口的智能指针
     */
    explicit ValveController(std::unique_ptr<IValveDriver> driver);
    ~ValveController() override = default;  // 虚析构函数
    
    // 实现IValveController接口的方法
    bool setup(const ValveParameters& params) override;
    void open() override;
    void close() override;
    bool isOpen() const override;
    bool isClosed() const override;
    void setStatusCallback(StatusCallback callback) override;

private:
    /**
     * 处理状态变化
     * 根据新状态更新内部状态机
     * @param status 新的阀门状态
     */
    void handleStatusChange(ValveStatus status);
    
    /**
     * 设置当前状态
     * 状态模式的核心方法
     * @param newState 新的状态对象
     */
    void setState(std::unique_ptr<ValveState> newState);

    std::unique_ptr<IValveDriver> driver_;      // 驱动层接口
    std::unique_ptr<ValveState> currentState_;  // 当前状态对象
    StatusCallback statusCallback_;             // 状态变化回调函数
};

/**
 * 阀门状态基类
 * 状态模式的核心组件
 * 定义了不同状态下的行为接口
 */
class ValveState {
public:
    virtual ~ValveState() = default;  // 虚析构函数
    
    /**
     * 进入状态时的处理
     * 可被子类重写以执行特定操作
     */
    virtual void enter() {}
    
    /**
     * 退出状态时的处理
     * 可被子类重写以执行特定操作
     */
    virtual void exit() {}
    
    /**
     * 打开阀门命令处理
     * 不同状态下有不同的实现
     */
    virtual void open() = 0;
    
    /**
     * 关闭阀门命令处理
     * 不同状态下有不同的实现
     */
    virtual void close() = 0;
    
    /**
     * 查询阀门是否打开
     * @return 阀门是否处于打开状态
     */
    virtual bool isOpen() const = 0;
    
    /**
     * 查询阀门是否关闭
     * @return 阀门是否处于关闭状态
     */
    virtual bool isClosed() const = 0;
};

} // namespace valve 