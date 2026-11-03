# Draw Calls：绘制调用

## 目标

让共享网格和材质的重复对象通过 GPU instancing 一次提交多份实例，减少 CPU 绘制准备。静态且共享材质的对象也可按项目条件合批。

## 核心规则

```text
for instance in visibleInstances:
  transforms.append(instance.worldMatrix)
instanceBuffer.upload(transforms)
drawInstanced(mesh, material, transforms.length)
```

- 每实例数据至少包含变换，也可包含颜色或自定义材质参数。
- 只上传实际变化的数据，复用实例缓冲和几何资源。
- 保留合理的可见性粒度，避免把大量离屏对象合进一个永远绘制的大组。
- 减少 draw call 不会自动减少三角形、shader 成本或透明 overdraw。

## 动效分镜

1. 创建 `20 × 20 = 400` 个相同箱子，所有实例执行相同波动和旋转。
2. 对照模式使用 400 个独立 mesh，优化模式切换为一个 instanced mesh。
3. 两种模式的几何、材质、位置和动画完全一致，仅提交方式不同。
4. 显示 mesh 组织方式和真实 renderer 统计；参考结果可从 400 次降到 1 次，但阴影、UI 等额外 pass 应单独说明。

## 常见错误

- 实例颜色或材质差异意外拆分批次。
- 每帧重建几何、材质或实例缓冲。
- 为减少调用把整个世界合批，破坏剔除粒度。
- 显示手工写死的 draw call 数，而非渲染器真实统计。

## 验收

- 两种模式画面与实例变换一致，优化模式确实使用实例化绘制。
- draw call 来自 renderer/profiler，并说明统计是否包含阴影和后处理。
- 实例移除、尺寸变化和场景销毁后，缓冲区与 GPU 资源正确更新或释放。
- 性能结论同时检查 CPU、GPU 和三角形负载，不只报告调用数。

来源：[Draw calls](https://gamedev-cheatsheet.com/concepts/draw-calls/)。
