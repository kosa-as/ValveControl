#include "../include/valve_driver.h"  // 包含驱动层接口定义

namespace valve {  // 阀门控制系统命名空间

/**
 * ValveDriver构造函数
 * 初始化驱动层，建立与硬件抽象层的桥接
 * @param hal 硬件抽象层接口的智能指针
 */
ValveDriver::ValveDriver(std::unique_ptr<IValveHAL> hal)
    : hal_(std::move(hal)) {
    // 初始化时不设置回调，需要外部调用setStatusCallback
}

/**
 * 初始化驱动器
 * 将参数传递给硬件抽象层
 * @param params 阀门参数
 * @return 设置是否成功
 */
bool ValveDriver::setup(const ValveParameters& params) {
    return hal_->setParameters(params);  // 委托给硬件抽象层处理
}

/**
 * 打开阀门
 * 发送打开命令到硬件抽象层
 * 实现R1需求(基本控制功能)
 */
void ValveDriver::open() {
    hal_->move(ValveMove::OPEN);  // 发送打开命令
    currentStatus_ = ValveStatus::MOVING;  // 更新当前状态为移动中
}

/**
 * 关闭阀门
 * 发送关闭命令到硬件抽象层
 * 实现R1需求(基本控制功能)
 */
void ValveDriver::close() {
    hal_->move(ValveMove::CLOSE);  // 发送关闭命令
    currentStatus_ = ValveStatus::MOVING;  // 更新当前状态为移动中
}

/**
 * 获取当前阀门状态
 * 从硬件抽象层获取最新状态
 * @return 阀门当前状态
 */
ValveStatus ValveDriver::getStatus() const {
    return hal_->getStatus();  // 委托给硬件抽象层处理
}

/**
 * 设置状态变化回调
 * 观察者模式的核心方法
 * @param callback 状态变化时调用的回调函数
 */
void ValveDriver::setStatusCallback(StatusCallback callback) {
    statusCallback_ = std::move(callback);  // 保存回调函数
}

} // namespace valve 