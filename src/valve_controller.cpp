#include "../include/valve_controller.h"  // 包含控制器接口定义
#include <iostream>  // 标准输入输出流

namespace valve {  // 阀门控制系统命名空间

/**
 * 未知状态类
 * 表示阀门状态未知或初始状态
 * 状态模式的具体状态类
 */
class UnknownState : public ValveState {
public:
    void open() override {}  // 未知状态下的打开操作
    void close() override {}  // 未知状态下的关闭操作
    bool isOpen() const override { return false; }  // 未知状态不是打开的
    bool isClosed() const override { return false; }  // 未知状态不是关闭的
};

/**
 * 已打开状态类
 * 表示阀门已完全打开
 * 状态模式的具体状态类
 */
class OpenedState : public ValveState {
public:
    void open() override {}  // 已打开状态下的打开操作(无需动作)
    void close() override {}  // 已打开状态下的关闭操作
    bool isOpen() const override { return true; }  // 已打开状态是打开的
    bool isClosed() const override { return false; }  // 已打开状态不是关闭的
};

/**
 * 已关闭状态类
 * 表示阀门已完全关闭
 * 状态模式的具体状态类
 */
class ClosedState : public ValveState {
public:
    void open() override {}  // 已关闭状态下的打开操作
    void close() override {}  // 已关闭状态下的关闭操作(无需动作)
    bool isOpen() const override { return false; }  // 已关闭状态不是打开的
    bool isClosed() const override { return true; }  // 已关闭状态是关闭的
};

/**
 * 移动中状态类
 * 表示阀门正在移动
 * 状态模式的具体状态类
 */
class MovingState : public ValveState {
public:
    void open() override {}  // 移动中状态下的打开操作(忽略)
    void close() override {}  // 移动中状态下的关闭操作(忽略)
    bool isOpen() const override { return false; }  // 移动中状态不是打开的
    bool isClosed() const override { return false; }  // 移动中状态不是关闭的
};

/**
 * ValveController构造函数
 * 初始化控制器，设置初始状态和回调
 * @param driver 驱动层接口的智能指针
 */
ValveController::ValveController(std::unique_ptr<IValveDriver> driver)
    : driver_(std::move(driver)), currentState_(std::make_unique<UnknownState>()) {
    // 设置驱动层状态回调，使用lambda捕获this指针
    driver_->setStatusCallback([this](ValveStatus status) {
        handleStatusChange(status);  // 处理状态变化
    });
}

/**
 * 初始化控制器
 * 将参数传递给驱动层
 * @param params 阀门参数
 * @return 设置是否成功
 */
bool ValveController::setup(const ValveParameters& params) {
    return driver_->setup(params);  // 委托给驱动层处理
}

/**
 * 打开阀门
 * 通知当前状态并发送命令到驱动层
 * 实现R1需求(基本控制功能)
 */
void ValveController::open() {
    if (currentState_) {
        currentState_->open();  // 通知当前状态对象
    }
    driver_->open();  // 发送打开命令到驱动层
}

/**
 * 关闭阀门
 * 通知当前状态并发送命令到驱动层
 * 实现R1需求(基本控制功能)
 */
void ValveController::close() {
    if (currentState_) {
        currentState_->close();  // 通知当前状态对象
    }
    driver_->close();  // 发送关闭命令到驱动层
}

/**
 * 查询阀门是否打开
 * 委托给当前状态对象
 * 实现R2需求(状态查询)
 * @return 阀门是否处于打开状态
 */
bool ValveController::isOpen() const {
    return currentState_ && currentState_->isOpen();  // 委托给当前状态对象
}

/**
 * 查询阀门是否关闭
 * 委托给当前状态对象
 * 实现R2需求(状态查询)
 * @return 阀门是否处于关闭状态
 */
bool ValveController::isClosed() const {
    return currentState_ && currentState_->isClosed();  // 委托给当前状态对象
}

/**
 * 设置状态变化回调
 * 观察者模式的核心方法
 * @param callback 状态变化时调用的回调函数
 */
void ValveController::setStatusCallback(StatusCallback callback) {
    statusCallback_ = std::move(callback);  // 保存回调函数
}

/**
 * 处理状态变化
 * 根据新状态更新内部状态机
 * 状态模式的核心方法
 * @param status 新的阀门状态
 */
void ValveController::handleStatusChange(ValveStatus status) {
    // 状态转换逻辑 - 根据新状态创建对应的状态对象
    switch (status) {
        case ValveStatus::OPENED:
            setState(std::make_unique<OpenedState>());  // 切换到已打开状态
            break;
        case ValveStatus::CLOSED:
            setState(std::make_unique<ClosedState>());  // 切换到已关闭状态
            break;
        case ValveStatus::MOVING:
            setState(std::make_unique<MovingState>());  // 切换到移动中状态
            break;
        default:
            setState(std::make_unique<UnknownState>());  // 切换到未知状态
            break;
    }
    
    // 如果设置了回调函数，通知外部状态变化
    if (statusCallback_) {
        statusCallback_(status);  // 调用回调函数
    }
}

/**
 * 设置当前状态
 * 处理状态转换的辅助方法
 * @param newState 新的状态对象
 */
void ValveController::setState(std::unique_ptr<ValveState> newState) {
    if (currentState_) {
        currentState_->exit();  // 调用旧状态的退出方法
    }
    currentState_ = std::move(newState);  // 更新当前状态
    if (currentState_) {
        currentState_->enter();  // 调用新状态的进入方法
    }
}

} // namespace valve 