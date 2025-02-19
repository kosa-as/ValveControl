# 阀门控制系统 (Valve Control System)

## 项目概述

这是一个使用Dezyne和Coco建模语言实现的阀门控制系统。该系统提供了一个灵活、可扩展的架构，用于控制各种类型的工业阀门。
**Dezyne模型在dezyne/valveControl文件夹中，coco模型在coco/src文件夹中。**
## 系统架构

系统采用分层架构设计：(coco与之保持一致)

1. **控制层** (Controller Layer)
   - `ValveController.dzn`: 定义高层控制接口
   - `ValveControllerImpl.dzn`: 实现控制逻辑
   - `ValveGroup.dzn`: 组织控制器组件

2. **驱动层** (Driver Layer)
   - `ValveDriver.dzn`: 定义驱动接口
   - `ValveDriverImpl.dzn`: 实现驱动逻辑

3. **硬件抽象层** (HAL Layer)
   - `ValveHAL.dzn`: 定义硬件抽象接口
   - `SimulatorImpl.dzn`: 提供硬件模拟实现

4. **测试组件**
   - `TestValveGroup.dzn`: 系统测试和验证

## 核心功能

1. 阀门基本控制（开关操作）
2. 实时状态查询
3. 异步操作支持
4. 硬件抽象和适配
5. 状态反馈机制
