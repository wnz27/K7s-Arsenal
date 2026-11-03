# Hitbox and Hurtbox：攻击盒与受击盒

## 目标

分离攻击判定体积和受击体积，并让攻击盒只存在于动画的有效帧。一次攻击实例记录已命中的目标，避免持续重叠每帧重复伤害。

## 核心规则

```text
if attack.isActive:
  for target in overlaps(attack.hitbox):
    if target not in attack.hitTargets:
      applyHit(target)
      attack.hitTargets.add(target)
```

- 新一次挥击开始时清空 `hitTargets`，不要每帧清空。
- 受击盒随下蹲、跳跃等姿态更新；不要用包含大量透明区域的精灵外接框代替。
- 攻击盒只在 active 阶段参与检测，startup 和 recovery 不造成伤害。
- 攻击去重与受击者无敌帧分别处理，二者不能互相替代。

## 动效分镜

1. 用时间轴展示 `startup → active → recovery → idle`，当前阶段和游标同步更新。
2. 青色虚线绘制双方受击盒，红色攻击盒只在 active 阶段出现。
3. 防守者每隔一次攻击下蹲，使相同挥砍交替命中和落空。
4. 命中时显示闪光、短击退和 `HIT`；active 结束仍无命中时显示 `MISS`，并累计真实结果。

## 常见错误

- 每帧清空命中集合，导致一次攻击重复伤害。
- 新挥击未重置集合，导致后续攻击无法命中。
- 攻击盒在准备或收招阶段仍启用。
- 只用精灵边界，动画与判定不一致。

## 验收

- 只有 active 阶段且两类体积真实重叠时才判定命中。
- 每次挥击对同一目标至多命中一次，新挥击可以再次命中。
- 下蹲改变受击盒并产生一致的 HIT/MISS 结果。
- 受击无敌开启时，攻击命中记录与伤害拒绝逻辑分别保持正确。

来源：[Hitbox and hurtbox](https://gamedev-cheatsheet.com/concepts/hitbox-hurtbox/)。
