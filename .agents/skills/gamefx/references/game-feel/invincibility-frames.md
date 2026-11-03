# Invincibility Frames：无敌帧

## 目标

角色受伤后获得约 `0.5–1 s` 的保护窗口，在此期间忽略指定类型的后续伤害，并用闪烁、击退和剩余时间表达保护状态。

## 核心规则

```text
if incomingHit and invulnerability <= 0:
  health -= damage
  invulnerability = 0.75
  velocity += knockbackDirection * impulse
invulnerability = max(0, invulnerability - dt)
visual.visible = invulnerability <= 0 or blinkPhase(time)
```

- 闪烁可从约 `10 Hz` 开始，但伤害判断只读无敌计时，不读精灵可见性。
- 击退方向远离伤害来源，避免把角色推入攻击者。
- 明确哪些伤害可穿透保护，以及环境伤害、持续伤害和即死效果如何处理。
- 区分「受击者全局保护」与「单次攻击对同一目标只命中一次」，两者可组合。

## 动效分镜

1. 两名角色面对相同飞行道具和碰撞窗口，血量与位置一致。
2. 无保护组在连续重叠帧反复扣血；有保护组只承受第一次伤害。
3. 受击后角色击退、闪烁，显示血量、命中次数和无敌剩余时间。
4. 后续道具可以穿过角色但不扣血，保护结束后才重新可受伤。

## 常见错误

- 只做闪烁，没有实际伤害保护。
- 用精灵可见性决定碰撞或伤害。
- 用单攻击去重集合替代全局无敌，或反过来混用。
- 低帧率下伤害次数随帧率改变。

## 验收

- 保护窗口内连续重叠和后续攻击不会重复扣血，窗口外正常受伤。
- 闪烁关闭或减少动态效果开启时，保护逻辑仍完整。
- 击退远离伤害源，且不会破坏场景边界和碰撞稳定性。
- 同一攻击去重与受击无敌分别通过测试，伤害次数不依赖渲染帧率。

来源：[Invincibility frames](https://gamedev-cheatsheet.com/concepts/invincibility-frames/)。
