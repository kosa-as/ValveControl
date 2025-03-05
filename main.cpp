#include "include/valve_controller.h"  // 包含阀门控制器接口
#include "include/valve_driver.h"      // 包含阀门驱动接口
#include "include/valve_hal.h"         // 包含硬件抽象层接口
#include <iostream>                    // 标准输入输出流
#include <thread>                      // 线程支持

#ifdef _WIN32
#include <windows.h>
#endif

int main() {
    using namespace valve;  // 使用valve命名空间
    
    // 创建组件实例 - 使用工厂模式创建硬件抽象层
    auto hal = ValveHALFactory::createHAL("simulator");  // 创建模拟器实现的HAL
    
    // 使用桥接模式连接驱动层和硬件层
    auto driver = std::make_unique<ValveDriver>(std::move(hal));  // 创建驱动层实例
    
    // 使用状态模式管理阀门状态
    auto controller = std::make_unique<ValveController>(std::move(driver));  // 创建控制器实例
    
    // 设置状态回调 - 使用观察者模式监听状态变化
    controller->setStatusCallback([](ValveStatus status) {
        // 输出阀门状态变化信息
        std::cout << "Valve status changed to: " 
                  << static_cast<int>(status) << std::endl;
    });
    
    // 初始化阀门参数
    ValveParameters params;
    params.openPosition = 100;    // 设置打开位置
    params.closePosition = 0;     // 设置关闭位置
    params.moveSpeed = 10;        // 设置移动速度
    controller->setup(params);    // 配置阀门参数
    
    // 测试阀门操作 - 打开阀门
    std::cout << "Opening valve..." << std::endl;
    controller->open();  // 发送打开命令
    // 等待操作完成 - 模拟异步操作
    std::this_thread::sleep_for(std::chrono::seconds(3));
    
    // 测试阀门操作 - 关闭阀门
    std::cout << "Closing valve..." << std::endl;
    controller->close();  // 发送关闭命令
    // 等待操作完成 - 模拟异步操作
    std::this_thread::sleep_for(std::chrono::seconds(3));
    
    return 0;  // 程序正常结束
}
