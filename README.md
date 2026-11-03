# K7s Arsenal

面向 AI 编程助手的开源工具与 Skill 集合。当前包含 GameFX 游戏动效 Skill 和 Msg Tool。

## GameFX

GameFX 是一个适用于 Kimi Code 的游戏动效制作 Skill，覆盖 [Game Development Cheat Sheet](https://gamedev-cheatsheet.com/) 的完整 34 个条目。调用对应命令后，Agent 会读取独立配方，在当前项目中制作可运行、可调参、可验证的实现，而不只是返回概念解释或提示词。

### 功能

- **34 个独立命令**：覆盖 3D & Rendering、Game feel、Systems、Performance 四章。
- **真实机制与可视化**：实现射线检测、寻路、对象池、固定时间步等实际逻辑，并提供可观察的动画或调试层。
- **适配现有项目**：优先沿用目标项目的引擎、语言、渲染循环、依赖和代码约定。
- **独立演示**：没有现有工程且未指定技术栈时，可生成使用原生 Canvas 2D 或 WebGL 的单文件 HTML，不强制安装依赖。
- **完整制作配方**：每个条目包含核心规则、动效分镜、常见错误和验收标准。
- **可信性能数据**：性能指标来自真实测量或内部状态；教学模拟数据必须明确标注。

### 环境要求

- 支持项目级或用户级 Agent Skills 的 Kimi Code。
- 无需安装 Node.js、Python 包或其他运行时依赖。

### 安装到当前项目

在 macOS 或 Linux 中执行。把 `/path/to/project` 替换为目标项目的绝对路径。

```bash
git clone https://github.com/wnz27/K7s-Arsenal.git
cd K7s-Arsenal
mkdir -p /path/to/project/.agents/skills
cp -R .agents/skills/gamefx* /path/to/project/.agents/skills/
```

在目标项目中启动 Kimi Code，或执行 `/reload` 刷新 Skill 列表。

### 安装到用户级目录

安装后可在所有支持用户级 Skill 的项目中使用：

```bash
git clone https://github.com/wnz27/K7s-Arsenal.git
cd K7s-Arsenal
mkdir -p ~/.agents/skills
cp -R .agents/skills/gamefx* ~/.agents/skills/
```

重新启动 Kimi Code，或执行 `/reload`。

### 更新

```bash
cd K7s-Arsenal
git pull
cp -R .agents/skills/gamefx* /path/to/project/.agents/skills/
```

用户级安装将最后一行目标路径替换为 `~/.agents/skills/`。

### 使用

直接输入动效命令：

```text
/gamefx-screen-shake
```

也可以在命令后补充引擎、交互或视觉要求：

```text
/gamefx-pathfinding 制作一个可以切换障碍物的 A* 网格演示
/gamefx-particle-system 使用现有项目的引擎实现火花和烟雾
```

#### 3D & Rendering

| 命令 | 功能 |
|---|---|
| `/gamefx-raycasting` | 射线检测、最近命中、命中点和法线 |
| `/gamefx-normals` | 动态法线、光照、反弹和坡度判断 |
| `/gamefx-lod` | 多级网格、距离切换和滞回 |
| `/gamefx-frustum-culling` | 相机视锥、包围体测试和剔除计数 |
| `/gamefx-fragment-shader` | UV、时间 uniforms、程序化图案和片元放大镜 |
| `/gamefx-billboarding` | 面向相机的血条、名字和竖直精灵 |
| `/gamefx-quaternions` | 四元数短弧插值和欧拉角对照 |
| `/gamefx-z-fighting` | 深度冲突、几何偏移和 polygon offset |

#### Game feel

| 命令 | 功能 |
|---|---|
| `/gamefx-delta-time` | 帧率无关移动、计时和指数平滑 |
| `/gamefx-coyote-time` | 离地宽限和晚按跳跃 |
| `/gamefx-easing` | 缓动曲线和同步运动轨道 |
| `/gamefx-screen-shake` | trauma 驱动、连续噪声和轻重击震动 |
| `/gamefx-squash-and-stretch` | 速度拉伸、落地压扁和面积保持 |
| `/gamefx-camera-deadzone` | 相机死区、边缘补偿和世界边界 |
| `/gamefx-input-buffering` | 早按记录、动作排队和缓冲倒计时 |
| `/gamefx-acceleration-and-friction` | 加速度、减速度和反向制动 |
| `/gamefx-hit-stop` | 局部命中冻结和独立时间域 |
| `/gamefx-invincibility-frames` | 无敌帧、伤害保护、闪烁和击退 |

#### Systems

| 命令 | 功能 |
|---|---|
| `/gamefx-object-pooling` | 对象预分配、复用槽位和耗尽策略 |
| `/gamefx-state-machine` | 显式状态转移、状态图和无效事件 |
| `/gamefx-hitbox-hurtbox` | 攻击盒、受击盒、有效帧和挥击去重 |
| `/gamefx-pathfinding` | A* 搜索、启发式、扩展计数和路径回溯 |
| `/gamefx-particle-system` | 粒子发射、生命周期曲线和对象池 |
| `/gamefx-fixed-timestep` | 固定时间步、累加器和渲染插值 |
| `/gamefx-steering-behaviors` | seek、arrive、separation 转向行为 |
| `/gamefx-tunneling` | 端点重叠与扫掠碰撞对照 |
| `/gamefx-seeded-noise` | 种子噪声、多 octave 地形和确定性重建 |

#### Performance

| 命令 | 功能 |
|---|---|
| `/gamefx-frame-budget` | 分系统计时、慢帧和帧预算可视化 |
| `/gamefx-draw-calls` | GPU instancing 和真实绘制调用统计 |
| `/gamefx-spatial-partitioning` | 空间网格、候选对和精确碰撞 |
| `/gamefx-overdraw` | 透明叠加、逐像素层数和热力图 |
| `/gamefx-time-slicing` | AI 决策分桶和逐帧移动 |
| `/gamefx-texture-atlas` | 纹理图集、UV 映射和批次对照 |
| `/gamefx-chunk-streaming` | 分块加载、双半径和异步状态 |

### 验证安装

1. 在 Kimi Code 输入 `/`，确认候选列表中出现 `gamefx-` 命令。
2. 执行 `/gamefx-easing` 或任意其他命令。
3. 检查 Agent 是否读取 `.agents/skills/gamefx/SKILL.md` 及对应配方，并生成可运行实现。

### 源码结构

```text
.agents/skills/
├── gamefx/
│   ├── SKILL.md
│   └── references/
│       ├── 3d-rendering/
│       ├── game-feel/
│       ├── systems/
│       └── performance/
├── gamefx-raycasting.md
├── gamefx-screen-shake.md
├── gamefx-pathfinding.md
└── ... 其余 31 个命令入口
```

`gamefx/SKILL.md` 是核心路由和制作流程，`references/` 保存 34 份独立配方，根目录下的 `gamefx-*.md` 是对应的斜杠命令入口。

### 参考与许可

概念与动画行为参考 [Game Development Cheat Sheet](https://gamedev-cheatsheet.com/)，配方与实现指南针对 GameFX 重新编写。

本仓库使用 [MIT License](LICENSE)。
