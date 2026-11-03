# Finite State Machine：有限状态机

## 目标

让角色在明确的状态集合中一次处于一个状态，并用显式转移表决定事件是否有效，替代可能相互矛盾的布尔标记。

## 核心规则

```text
next = transitions[currentState].get(event)
if next exists:
  states[currentState].exit()
  currentState = next
  states[currentState].enter()
```

- 每个状态提供 `enter`、`update`、`exit`；事件无对应边时忽略，不暗中改变状态。
- 教学状态可用 `idle`、`run`、`jump`、`attack`，转移由当前状态和事件共同决定。
- 状态内部计时在 `enter` 时初始化，完成事件只发送一次。
- 移动与武器等独立维度使用分离状态机或层级状态机，避免枚举全部组合。

## 动效分镜

1. 角色按预设事件序列待机、跑动、跳跃、攻击和落地，动画由当前状态驱动。
2. 同步绘制状态节点和有向边，当前状态及刚通过的边高亮。
3. 跳跃中发送 attack 等无效事件时，显示 `ignored`，角色保持原状态。
4. 显示当前状态、最近事件和状态持续时间，便于检查转移原因。

## 常见错误

- 重要转移仍藏在无关布尔标记中。
- 同一帧重复 enter/exit，或未初始化新状态计时。
- 无匹配事件时进入隐式默认状态。
- 用一个扁平状态机枚举所有独立行为组合。

## 验收

- 任一时刻只有一个当前状态，所有可见行为与该状态一致。
- 每条合法转移按 `exit → 更新状态 → enter` 执行一次。
- 无效事件被忽略并有可观察反馈，不影响当前状态。
- 连续事件、状态完成和重置后没有重复回调或矛盾标记。

来源：[Finite state machine](https://gamedev-cheatsheet.com/concepts/state-machine/)。
