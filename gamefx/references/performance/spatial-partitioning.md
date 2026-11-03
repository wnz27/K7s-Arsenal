# Spatial Partitioning：空间划分

## 目标

用均匀网格或树把邻域与碰撞查询限制在附近候选中，替代所有对象两两检查。空间划分是 broad phase，最终重叠仍需精确 narrow phase。

## 核心规则

```text
cell = floor(position / cellSize)
grid[cell].add(object)
for neighborCell in cellsOverlapping(queryBounds):
  for candidate in grid[neighborCell]:
    runExactTest(candidate)
```

- 网格单元可从最大对象尺寸的约两倍开始，再结合查询半径和密度调整。
- 大对象覆盖多个单元时，插入所有相交单元或按查询包围体覆盖范围查询。
- 邻居遍历只选一半方向，或使用有序 pair key 去重，避免同一对重复测试。
- 每帧重建动态网格时复用桶和数组，避免引入新的分配瓶颈。

## 动效分镜

1. 使用 `48` 个持续运动的对象，交替运行全量两两检查和空间网格。
2. 绘制候选对象之间的连线，网格模式显示单元边界。
3. 两种模式执行同一个精确重叠测试，并分别记录检查数与发现的碰撞数。
4. 全量模式应有 `48 × 47 / 2 = 1128` 对；网格约 100 次只属于参考分布，不作为固定结果。

## 常见错误

- 把网格候选直接判定为碰撞，跳过精确测试。
- 大对象只占一个单元，漏掉跨格碰撞。
- 双向遍历邻居导致重复检查和重复事件。
- 单元过小造成大量桶，或过大退化成近似全量检查。

## 验收

- 网格与全量检测对同一场景得到相同重叠集合。
- 跨格、大对象、边界负坐标和重复 pair 均有正确处理。
- 候选检查计数来自真实循环，不用估算值替代。
- 性能比较包含网格重建和去重成本，而非只统计 narrow phase。

来源：[Spatial partitioning](https://gamedev-cheatsheet.com/concepts/spatial-partitioning/)。
