# A* Pathfinding：A* 寻路

## 目标

在可通行图或网格中优先扩展 `f = g + h` 最小的节点，找到从起点到目标的路径。图负责可行走区域，移动控制器负责沿结果路线运动。

## 核心规则

```text
open.push(start, priority = heuristic(start, goal))
while open is not empty:
  current = open.popLowest()
  if current == goal: return reconstructPath(current)
  for next in neighbors(current):
    relaxEdge(current, next)
```

- `g` 保存当前最小已知代价，`h` 估计剩余代价，`parent` 用于回溯路径。
- 四方向移动使用 Manhattan；八方向移动使用 octile，并禁止角色无法通过的对角切角。
- 优先队列使用二叉堆或项目既有结构；`f` 相同可优先较低 `h`。
- 通常的最短路保证要求启发式不高估剩余成本；无解时明确返回失败。

## 动效分镜

1. 网格包含墙、起点和终点，按固定时间间隔逐步执行搜索。
2. 用不同亮度区分 open、closed 和未访问节点，实时显示扩展数量。
3. 到达目标后沿 parent 回溯并绘制路径，停留后重播。
4. 可运行同等条件下的 Dijkstra 或盲搜作对照，显示各自真实扩展数；约 `40%` 的节省只属于参考场景，不是固定保证。

## 常见错误

- 启发式与允许的移动方式不匹配。
- 对角移动穿过两个阻挡格之间的角。
- 不更新更优 `g` 和 parent，或继续扩展已关闭节点。
- 把寻路结果当成局部避障或移动控制器。

## 验收

- 在已知小地图上返回最优代价路径，路径不穿墙且连续可走。
- open 选择、代价更新和 parent 回溯与真实内部状态一致。
- 起点等于终点、目标不可达和动态尺寸变化均有明确结果。
- 对照组扩展计数来自真实运行，不使用硬编码的性能提升结论。

来源：[A* pathfinding](https://gamedev-cheatsheet.com/concepts/pathfinding/)。
