# Steering Behaviors：转向行为

## 目标

通过受限加速度把当前速度平滑转向期望速度。组合 seek、arrive 和 separation，让单位接近目标时减速，并与邻居保持距离。

## 核心规则

```text
desired = normalize(target - position) * desiredSpeed
steering = clampLength(desired - velocity, maxAcceleration)
velocity = clampLength(velocity + steering * dt, maxSpeed)
position += velocity * dt
```

- 最大加速度可从约 `4 × maxSpeed` 每秒开始，速度本身也必须限制。
- arrive 在减速半径内使用 `desiredSpeed = maxSpeed * min(1, distance / slowingRadius)`；半径可从约 `4` 个单位宽度开始。
- separation 对约 `2` 个单位宽度内的邻居施加远离分量，越近越强；近零距离需要确定性降级方向。
- 障碍需要全局路线时结合 A*，局部转向可能卡在凹形区域。

## 动效分镜

1. 两组各 `8` 个单位跟随同一个平滑移动目标，初始位置相同。
2. 左侧始终以全速直冲目标，右侧使用 seek、arrive 和 separation。
3. 右侧显示减速虚线圈和分离范围，单位朝向随实际速度改变。
4. 显示平均速度与群体散布，观察左侧过冲聚集、右侧减速分散。

## 常见错误

- 只限速度、不限加速度，转向仍然瞬间完成。
- 到达目标仍保持全速，导致往返过冲。
- 邻居重叠到近零距离时归一化零向量。
- 用局部转向替代所有路径规划。

## 验收

- 单位速度和加速度均不超上限，目标附近不会持续全速振荡。
- 邻居保持合理间距，重叠退化情形不会产生 NaN。
- 不同帧率下到达和分离行为近似一致。
- 对照组共享目标轨迹、数量和初态，仅运动规则不同。

来源：[Steering behaviors](https://gamedev-cheatsheet.com/concepts/steering-behaviors/)。
