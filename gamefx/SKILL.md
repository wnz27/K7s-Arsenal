---
name: gamefx
description: 制作可运行的游戏动效、系统机制与性能交互演示。完整覆盖 Game Development Cheat Sheet 的 34 个条目，包括 3D & Rendering、Game feel、Systems、Performance；根据目标项目引擎实现真实机制并完成运行验证。
type: prompt
whenToUse: 用户要求制作、改造或调试游戏动效、游戏机制、性能可视化，或调用 gamefx 系列命令时使用。
---

# GameFX：游戏动效制作

目标是在当前项目中交付可运行、可调参、可验证的动效，不只输出概念解释或提示词。

## 选择动效

从 `$ARGUMENTS` 和用户上下文识别动效。直接命令已经指定动效时，以命令为准。

### 3D & Rendering

| 动效 | 命令 | 可识别别名 | 参考文件 |
|---|---|---|---|
| 射线检测 | `/gamefx-raycasting` | `raycast`、`射线` | `references/3d-rendering/raycasting.md` |
| 法线 | `/gamefx-normals` | `normal`、`法线` | `references/3d-rendering/normals.md` |
| 细节层次 | `/gamefx-lod` | `level-of-detail`、`LOD` | `references/3d-rendering/level-of-detail.md` |
| 视锥剔除 | `/gamefx-frustum-culling` | `culling` | `references/3d-rendering/frustum-culling.md` |
| 片元着色器 | `/gamefx-fragment-shader` | `shader` | `references/3d-rendering/fragment-shader.md` |
| 公告牌 | `/gamefx-billboarding` | `billboard`、`面向相机` | `references/3d-rendering/billboarding.md` |
| 四元数旋转 | `/gamefx-quaternions` | `quaternion`、`slerp` | `references/3d-rendering/quaternions.md` |
| 深度冲突 | `/gamefx-z-fighting` | `zfighting` | `references/3d-rendering/z-fighting.md` |

### Game feel

| 动效 | 命令 | 可识别别名 | 参考文件 |
|---|---|---|---|
| 帧间隔时间 | `/gamefx-delta-time` | `dt` | `references/game-feel/delta-time.md` |
| 土狼时间 | `/gamefx-coyote-time` | `离地宽限` | `references/game-feel/coyote-time.md` |
| 缓动 | `/gamefx-easing` | `tween`、`缓动曲线` | `references/game-feel/easing.md` |
| 屏幕震动 | `/gamefx-screen-shake` | `trauma`、`相机震动` | `references/game-feel/screen-shake.md` |
| 挤压与拉伸 | `/gamefx-squash-and-stretch` | `squash`、`stretch` | `references/game-feel/squash-and-stretch.md` |
| 相机死区 | `/gamefx-camera-deadzone` | `deadzone` | `references/game-feel/camera-deadzone.md` |
| 输入缓冲 | `/gamefx-input-buffering` | `jump buffer` | `references/game-feel/input-buffering.md` |
| 加速与减速 | `/gamefx-acceleration-and-friction` | `acceleration`、`friction` | `references/game-feel/acceleration-and-friction.md` |
| 命中停顿 | `/gamefx-hit-stop` | `hitstop` | `references/game-feel/hit-stop.md` |
| 无敌帧 | `/gamefx-invincibility-frames` | `i-frames`、`iframes` | `references/game-feel/invincibility-frames.md` |

### Systems

| 动效 | 命令 | 可识别别名 | 参考文件 |
|---|---|---|---|
| 对象池 | `/gamefx-object-pooling` | `pool`、`pooling` | `references/systems/object-pooling.md` |
| 有限状态机 | `/gamefx-state-machine` | `finite state machine`、`FSM` | `references/systems/state-machine.md` |
| 攻击盒与受击盒 | `/gamefx-hitbox-hurtbox` | `hitbox`、`hurtbox` | `references/systems/hitbox-hurtbox.md` |
| A* 寻路 | `/gamefx-pathfinding` | `a-star`、`A*` | `references/systems/pathfinding.md` |
| 粒子系统 | `/gamefx-particle-system` | `particles`、`emitter` | `references/systems/particle-system.md` |
| 固定时间步 | `/gamefx-fixed-timestep` | `fixed step` | `references/systems/fixed-timestep.md` |
| 转向行为 | `/gamefx-steering-behaviors` | `steering`、`seek`、`arrive` | `references/systems/steering-behaviors.md` |
| 隧穿 | `/gamefx-tunneling` | `swept collision`、`连续碰撞` | `references/systems/tunneling.md` |
| 种子噪声 | `/gamefx-seeded-noise` | `noise`、`种子随机` | `references/systems/seeded-noise.md` |

### Performance

| 动效 | 命令 | 可识别别名 | 参考文件 |
|---|---|---|---|
| 帧预算 | `/gamefx-frame-budget` | `16.67 ms`、`帧时间` | `references/performance/frame-budget.md` |
| 绘制调用 | `/gamefx-draw-calls` | `instancing`、`实例化` | `references/performance/draw-calls.md` |
| 空间划分 | `/gamefx-spatial-partitioning` | `spatial grid`、`空间网格` | `references/performance/spatial-partitioning.md` |
| 重复绘制 | `/gamefx-overdraw` | `透明叠加` | `references/performance/overdraw.md` |
| 时间分片 | `/gamefx-time-slicing` | `time slice`、`AI 分桶` | `references/performance/time-slicing.md` |
| 纹理图集 | `/gamefx-texture-atlas` | `atlas` | `references/performance/texture-atlas.md` |
| 分块流式加载 | `/gamefx-chunk-streaming` | `chunk`、`流式加载` | `references/performance/chunk-streaming.md` |

只读取选中动效的参考文件。未指定动效时，列出分类并请用户选择；这 34 个条目之外的需求按普通任务处理，不声称已有专用配方。

## 实现流程

1. 检查目标项目的 `AGENTS.md`、目录结构、引擎、语言、渲染循环、依赖和测试命令。沿用现有架构与命名，不另起一套框架。
2. 阅读选中动效的参考文件，区分「真实游戏机制」与「用于讲解的可视化层」。两者都要忠实实现，不能用纯装饰动画冒充射线检测、剔除、LOD 或寻路等机制。
3. 在已有游戏中，把机制接入真实场景、相机和更新循环；可视化调试层应能关闭。用户只要求演示时，交付可交互 demo。
4. 没有现有工程且用户未指定技术栈时，交付可直接打开的单文件 HTML。使用原生 Canvas 2D 或 WebGL，不为 demo 擅自安装依赖。2D 投影演示须明确标注，不能声称其验证了真实 GPU 深度或着色行为。
5. 暴露参考文件列出的关键参数。动画使用真实时间或 `dt`，处理窗口尺寸、设备像素比和生命周期；已有项目有自己的时间与资源管理方式时，沿用项目实现。
6. 优先保留清晰的运动因果关系：输入或状态变化先发生，机制随后响应，视觉结果最后出现。对比演示中的对照组只能改变目标机制。
7. 性能指标来自真实测量或真实内部状态。为教学合成的数据、GC 停顿和成本模型必须明确标注，不能冒充项目优化结果。
8. 不复制参考网站的页面、品牌或美术资源。根据机制重新实现 visuals。

## 验证与交付

- 运行目标项目覆盖本次改动的标准构建和测试。
- Web demo 必须在浏览器中实际运行，检查控制台、动画、交互和尺寸变化；不能只验证文件存在或语法通过。
- 按参考文件的验收标准检查边界情况。涉及 GPU 差异的效果，应在目标渲染器或设备上确认。
- 最终说明实现文件、运行方式、可调参数和验证结果；有未验证项时明确写出。

参考来源：[Game Development Cheat Sheet](https://gamedev-cheatsheet.com/) 的 3D & Rendering、Game feel、Systems、Performance 四章。
