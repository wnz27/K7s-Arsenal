# Fixed Timestep：固定时间步

## 目标

用固定切片推进物理，避免可变帧长破坏数值积分稳定性；渲染在最近两个物理状态之间插值，保持画面平滑。

## 核心规则

```text
step = 1 / 60
accumulator += min(frameSeconds, 0.25)
while accumulator >= step and withinCatchUpBudget:
  previous = current
  current = simulate(current, step)
  accumulator -= step
render(lerp(previous, current, accumulator / step))
```

- 默认物理频率可用 `60 Hz`，所有物理输入在 tick 边界按项目规则采样。
- 累加器保存剩余时间，渲染插值不改变模拟状态或 tick 率。
- 设置追帧预算和过载策略，避免模拟慢于推进时间时积压无限增长。
- 固定时间步提升可重复性，但不自动保证跨机器、跨语言的完全确定性。

## 动效分镜

1. 两个相同弹簧从相同初态开始，上方直接使用可变帧长，下方固定 `1/60 s` 积分。
2. 正常帧后插入一段约 `92 ms` 的长帧，显示真实调度出的帧时间柱。
3. 可变步长弹簧可能获得能量并发散；固定步长保持稳定，并插值绘制。
4. 显示稳定或发散状态，发散后停止危险数值并重置演示。

## 常见错误

- 只固定部分物理量，位置仍用原始帧长更新。
- 没有追帧上限，卡顿后进入无限补算。
- 渲染插值结果写回物理状态。
- 把固定步长等同于跨平台确定性。

## 验收

- 不同渲染帧率下执行相同物理输入，tick 数和物理轨迹符合预期。
- 长帧后累加器和追帧预算受控，不会无限补算。
- 渲染平滑且不回写模拟，暂停和恢复不会积累巨额时间。
- 对照弹簧的初态、参数和帧序列相同，仅积分策略不同。

来源：[Fixed timestep](https://gamedev-cheatsheet.com/concepts/fixed-timestep/)。
