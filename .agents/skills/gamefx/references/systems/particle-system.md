# Particle System：粒子系统

## 目标

用一个发射器和一组参数生成大量短生命周期粒子。分离发射、模拟和渲染，让每部分都有独立预算和质量设置。

## 核心规则

```text
spawnBudget += emissionRate * dt
while spawnBudget >= 1:
  spawnFromPool()
  spawnBudget -= 1
for particle in active:
  particle.velocity += gravity * dt
  particle.velocity *= dragModel(dt)
  particle.position += particle.velocity * dt
```

- 参数包括发射率、寿命范围、方向散布、初速度、重力、阻力、颜色，以及尺寸和透明度曲线。
- 发射数量由时间预算产生，不能每渲染帧固定生成若干粒子。
- 使用固定容量池并设置活跃上限；池满时按明确策略丢弃或回收。
- 随机参数只在生成时确定，逐帧运动使用粒子的自身状态。

## 动效分镜

1. 同一套实现提供 `sparks`、`smoke`、`confetti` 三种预设，只改变参数和形状。
2. 火花短寿、快速、受重力下坠；烟雾缓慢上升、膨胀并淡出；纸屑旋转下落。
3. 定期切换预设，显示当前名称、活跃数量、发射率、寿命、散布、重力和阻力。
4. 教学初始容量可用约 `260` 个粒子，实际项目按峰值和透明叠加预算调整。

## 常见错误

- 发射密度随帧率变化。
- 尺寸或透明度使用全局时间，而非单粒子寿命进度。
- 池满后继续分配，或复用时未重置全部字段。
- 只减少对象分配，不限制透明粒子的 overdraw。

## 验收

- 不同帧率下单位时间发射数量、运动轨迹分布和寿命一致。
- 三种预设共享同一模拟代码，曲线按各自生命周期计算。
- 粒子死亡后回到池，复用无旧颜色、速度或透明度残留。
- 达到容量时行为明确，活跃数不超限，透明叠加有独立预算。

来源：[Particle system](https://gamedev-cheatsheet.com/concepts/particle-system/)。
