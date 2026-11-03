# Acceleration and Friction：加速与减速

## 目标

让速度按每秒固定变化率接近输入目标，而非一帧内直接复制输入。地面、空中和反向制动使用不同速率，形成可控的移动手感。

## 核心规则

```text
target = inputAxis * maxSpeed
rate = acceleration if inputAxis != 0 else deceleration
if target * velocity.x < 0: rate = reversalRate
velocity.x = moveTowards(velocity.x, target, rate * dt)
position.x += velocity.x * dt
```

- 加速度可从「`0.1–0.2 s` 达到最高速度」反推，松开后约 `0.1 s` 停止。
- 反向输入可使用约两倍减速度；空中可把相关速率减半，再按项目手感调整。
- 控制器的 deceleration 不一定等于物理摩擦，保持单位与语义一致。
- 用 `moveTowards` 防止越过目标速度；积分可使用项目一致的数值方法。

## 动效分镜

1. 两名角色接受相同的右、左、松开输入时间序列。
2. 上方速度直接等于输入，下方逐渐加速、减速并更快反向制动。
3. 在角色下方同步绘制输入虚线和实际速度曲线，显示当前速度百分比。
4. 位置由速度积分得到，不要为对照演示手工摆角色位置。

## 常见错误

- 加速度按每帧而非每秒定义。
- 松开、反向和空中状态使用错误速率。
- 位置仍直接跟随输入，速度曲线与运动脱节。
- 没有测试斜坡、反向和不同帧率。

## 验收

- 达到最高速度、停止和反向所需时间符合参数。
- 速度不会越过目标，输入曲线与实际速度图一致。
- 30、60、144 fps 下相同输入时间序列产生近似一致的速度和位置。
- 空中、坡面和反向行为符合项目控制器约定。

来源：[Acceleration and friction](https://gamedev-cheatsheet.com/concepts/acceleration-and-friction/)。
