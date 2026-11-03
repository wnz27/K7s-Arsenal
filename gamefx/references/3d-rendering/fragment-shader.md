# Fragment Shader：片元着色器

## 目标

让每个片元根据 UV、时间和其他输入独立计算颜色，用于程序化纹理、波纹、溶解、变色和全屏效果。片元是候选像素贡献，最终结果还受深度测试和混合影响。

## 最小着色模型

```glsl
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

void main() {
  float wave = 0.5 + 0.5 * sin(vUv.x * uScale + uTime * uSpeed);
  vec3 color = mix(uColorA, uColorB, wave);
  gl_FragColor = vec4(color, 1.0);
}
```

按当前引擎的 GLSL 版本调整 `varying`、`gl_FragColor` 或输出变量语法。顶点阶段负责传递 UV 和位置，不要在片元阶段重复逐顶点工作。

## 动效分镜

1. 使用两组随时间变化的正弦场扭曲 UV，再混合暗色、青色和少量高亮色，形成连续流动的表面。
2. 把 `speed`、`scale`、颜色和强度暴露为 uniforms，界面调参时无需改 shader。
3. 添加平滑移动的放大镜：镜内按粗网格采样同一程序化函数，显示方形片元、细缝和镜框。
4. 演示可从约 `64` 行片元格、`3.5` 倍放大开始；镜外保留连续图案作为对照。
5. UV 与宽高比分离处理，窗口变化后镜内格子仍接近正方形。

## 性能约束

- 先控制纹理采样、透明层和全屏覆盖面积，再增加数学复杂度。
- 透明效果要检查 overdraw；高成本全屏效果可按项目能力使用较低分辨率缓冲区。
- 复用 shader、几何体和 uniforms，避免每帧重新编译或创建 GPU 资源。
- 所有时间、尺度和颜色输入有明确范围，暂停时停止时间推进。

## 常见错误

- 把片元直接等同于最终屏幕像素，忽略深度与混合。
- 把速度、颜色等参数写死，导致每次调参都改代码。
- 未处理宽高比，图案或放大镜随窗口变形。
- 用反向边界的 `smoothstep` 等未定义写法制造边缘效果。
- 只检查画面，没有检查 shader 编译日志和 GPU 开销。

## 验收

- shader 编译和链接无错误，首帧及持续运行均无控制台错误。
- 时间驱动连续，调整 uniforms 会实时改变速度、尺度或颜色。
- 放大镜内外的图案来自同一函数，粗网格只改变采样表现。
- 缩放窗口后比例正确；隐藏标签页或暂停机制符合项目生命周期。

来源：[Fragment shader](https://gamedev-cheatsheet.com/concepts/fragment-shader/)。
