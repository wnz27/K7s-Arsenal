# Overdraw：重复绘制

## 目标

识别同一像素在一帧中被重复着色的层数，重点处理透明粒子、烟雾和大面积 UI。透明图元无法像不透明表面那样通过深度遮挡省掉后方着色。

## 核心规则

```text
for effect in visibleEffects:
  effect.maxParticles = qualityBudget
  effect.spriteBounds = tightBounds
renderHeavySmokeToHalfResolutionTarget()
compositeSmoke()
```

- 限制重叠粒子数量和屏幕覆盖面积，裁剪四边形到可见像素附近。
- 重烟雾等效果可使用半分辨率目标，再合成到主画面。
- `alpha = 0` 不一定免除片元处理，纹理透明区域也可能产生开销。
- 降低 overdraw 与减少 draw call 是不同优化，分别测量。

## 动效分镜

1. 让约 `34` 个不同大小的透明烟雾精灵缓慢交叉运动。
2. 在普通视图与 overdraw 热力图之间切换，热力图按每层计数从蓝色渐变到白色。
3. 显示峰值层数和被覆盖区域的平均层数，参考图例用 `1×` 到 `8×+`。
4. 教学 Canvas 可在半分辨率计数缓冲中光栅化圆形覆盖；真实 GPU 诊断应使用引擎的 overdraw 视图或 profiler。

## 常见错误

- 只看粒子数量，不看屏幕面积和实际重叠。
- 认为透明像素或透明材质没有成本。
- 用精灵外接大方框绘制很小图案。
- 把教学覆盖计数冒充完整 GPU 时间测量。

## 验收

- 热力图层数与演示中实际覆盖图元一致，峰值和平均数由计数缓冲计算。
- 优化前后保持可接受视觉结果，并比较有代表性的帧时间或 GPU 数据。
- 裁剪、粒子上限和半分辨率设置确实生效。
- 明确区分覆盖层数、draw call 和 GPU 耗时三种指标。

来源：[Overdraw](https://gamedev-cheatsheet.com/concepts/overdraw/)。
