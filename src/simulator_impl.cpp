#include "../include/valve_hal.h"  // 包含硬件抽象层接口定义
#include <thread>   // 线程支持
#include <chrono>   // 时间和计时支持

namespace valve {  // 阀门控制系统命名空间

/**
 * 模拟器实现类
 * 实现了硬件抽象层接口
 * 用于测试和模拟真实硬件行为
 * 对应Coco模型中的SimulatorImpl组件
 */
class SimulatorImpl : public IValveHAL {
public:
    /**
     * 设置阀门参数
     * 在模拟器中只是保存参数
     * @param params 阀门参数
     * @return 设置是否成功，模拟器总是返回true
     */
    bool setParameters(const ValveParameters& params) override {
        params_ = params;  // 保存参数
        return true;       // 模拟器总是成功
    }

    /**
     * 执行阀门移动操作
     * 模拟异步操作，使用线程延迟状态变化
     * 实现R8需求(异步操作)
     * @param target 移动目标(打开/关闭)
     * @return 操作是否成功启动
     */
    bool move(ValveMove target) override {
        // 创建新线程模拟异步操作
        std::thread([this, target]() {
            currentStatus_ = ValveStatus::MOVING;  // 先设置为移动中
            
            // 模拟移动延迟，等待2秒
            std::this_thread::sleep_for(std::chrono::seconds(2));
            
            // 根据目标命令设置最终状态
            currentStatus_ = (target == ValveMove::OPEN) ? 
                           ValveStatus::OPENED : ValveStatus::CLOSED;
        }).detach();  // 分离线程，允许在后台运行
        
        return true;  // 模拟器总是成功启动操作
    }

    /**
     * 获取当前阀门状态
     * @return 阀门当前状态
     */
    ValveStatus getStatus() const override {
        return currentStatus_;  // 返回当前状态
    }

private:
    ValveParameters params_;  // 保存的阀门参数
    ValveStatus currentStatus_ = ValveStatus::UNKNOWN;  // 当前状态，初始为未知
};

/**
 * 创建硬件抽象层实例
 * 工厂方法模式的实现
 * @param type 硬件类型，目前只支持"simulator"
 * @return 硬件抽象层接口的智能指针
 */
std::unique_ptr<IValveHAL> ValveHALFactory::createHAL(const std::string& type) {
    if (type == "simulator") {
        return std::make_unique<SimulatorImpl>();  // 创建模拟器实例
    }
    return nullptr;  // 不支持的类型返回空指针
}

} // namespace valve 