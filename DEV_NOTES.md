# 文字修仙游戏 · 开发与平衡笔记

> 本文档记录本项目的核心系统、平衡数值标准与关键可调常量，方便日后继续修改。
> 代码已全部纳入 git 并推送到 GitHub（`main` 分支）。

## 一、如何运行 / 部署

- 本地开发：`npm run dev`
- 生产构建：`npm run build`（带代码混淆）
- 部署：`git push origin main` → GitHub Actions 自动构建并发布到 GitHub Pages
- 线上地址：`https://qingtang666666-source.github.io/vue-xiuxiangame/`

> 注意：本机 git 需走系统代理才能连 GitHub（已配置）。若换机器，需再设：
> `git config --global http.proxy http://127.0.0.1:11719`

## 二、核心平衡标准：境界战力（realmPower）

所有"境界战力"系统都挂在同一套标准曲线上。**改这一处，突破/试炼/豪杰/秘境/宗门/世界BOSS 全部联动**。

- 文件：`src/plugins/breakthroughGate.js`
- 关键数组 `STAGE_POWER`（16 个大境界的标准战力，按等级 1~144 分 9 级一档）：
  炼气 2.4万 → 筑基 6.4万 → 金丹 14.4万 → 元婴 28.8万 → 化神 52万 → 炼虚 68万 →
  合体 88万 → 大乘 124万 → 渡劫 160万 → 真仙 192万 → 玄仙 224万 → 金仙 252万 →
  大罗金仙 276万 → 太乙 300万 → 混元 320万 → **道祖 400万**
- `realmPower(level)`：取 `STAGE_POWER[realmStageOf(level)]`，即按境界返回标准战力。
- `playerPowerScore(玩家)`：
  `realmPower(等级) + 闪避×320 + 攻击×4 + 气血/100×0.4 + 防御×2.4 + 暴击×360`
  （即"境界下限 + 基础属性加成"，属性权重已翻倍，加点/装备更体现在战力上）
- `breakthroughPowerNeed(level)` = `realmPower × 1.25`（突破战力门槛）
- `tribulationPowerNeed(level)` = `realmPower × 1.1`（渡劫门槛）
- `enemyStatsForPower(战力)`：按目标战力反推攻/防/血三围，用于各种敌人的实体生成
- `MAX_STAGE_FAILS = 5`（大境界突破失败上限）
- `BREAKTHROUGH_CD_FAIL = 30000`、`TRIBULATION_CD_FAIL = 60000`（毫秒）

## 三、突破与渡劫

- 文件：`src/views/cultivatePage.vue`、`src/components/BreakthroughTrial.vue`、`src/plugins/tribulation.js`
- 突破流程：
  1. 修为满 → 到境界边界（大境界或每 3 小段）触发门槛。
  2. **前置校验**：战力不足 → 提示"战力未达标"，不计失败次数。
  3. 战力达标 → 弹确认框"是否开始突破试炼？"，由玩家选择。
  4. 选择开始 → 回合制试炼：击败 2 名同阶对手（按 `enemyStatsForPower(realmPower(目标))` 生成）。
  5. 非天劫节点：胜 2 敌后还要扛一次"雷罚"伤害，存活才成功；战败才计失败次数。
- 天劫节点（Lv19/37/55/73/82/100/118/136）：由"渡劫"按钮处理（给永久劫后加成），试炼不再重复雷罚。
- `tribulation.js` 的 `TRIBULATIONS`：天劫表（名称/等级/加成/惩罚）。
- `breakThrough`（cultivatePage）里门槛触发条件：
  `player.level >= 9 && (player.level + 1) % 3 === 1`（即从筑基起每 3 级 + 所有大境界）。

## 四、豪杰榜

- 文件：`src/plugins/heroBoard.js`、`src/components/HeroBoardPanel.vue`
- 300 名豪杰，等级 1~144 全覆盖（第1名=道祖、第300名=炼气）。
- `heroLevelOfRank(rank)`：由名次映射等级（等级 1~144）。
- `heroBoostOfRank(rank)`：排名加成，**封顶 ×2.0**（道祖顶级 = 400万×2 = 800万）。
- `heroPowerOfRank(rank)` = `realmPower(等级) × 加成`。
- 挑战：打赢排名更高者 → 与之**交换名次**（`applyWin`）。
- 前 100 名每日可领奖励（`heroReward`），越高越好但不过分；战败名次不变。
- 页面在首页左侧"⚔️ 豪杰"按钮打开（右侧抽屉）。

## 五、世界BOSS

- 文件：`src/plugins/worldBoss.js`、`src/components/WorldBossPanel.vue`
- 每日 6 只、境界档位不同（BOSS_DEFS），**每只每天可攻击 3 次**。
- 血量 = `realmPower(Boss等级) × 0.04`（总量约 16 刀）。
- **玩家 + 道友合力**：每次挑战附带 `道友协同伤害(6~10×玩家)`，协力几日内击杀。
- 击杀奖励按**玩家伤害贡献**（share = 玩家伤害 / Boss血量）结算。

## 六、秘境 / 宗门 / 战斗

- 秘境 `src/plugins/secretRealm.js`：守灵/首领按 `realmPower` 生成；费用几何增长（最高约 20 万灵石），收益与费用对等；判定用 `playerPowerScore`。
- 宗门 `src/plugins/sect.js`：入门考核 = 战力达标 + 战胜同境界门内弟子（随宗门品级）；晋升/守关/除妖按 `realmPower` 与 `playerPowerScore`。
- 战斗 `src/plugins/battleEngine.js`、`src/components/TurnCombat.vue`：回合制，支持自动战斗、主动功法神通（最多 5 个）、控制类神通为**概率定身**（约 6%，伤害 ×0.8）。

## 七、其它数值可调点

| 系统 | 文件 | 关键常量 |
|---|---|---|
| 加点属性 | `src/views/homePage.vue` | `pointNum()`（气血150/攻防75，随转生/等级放大）、`points += 3` |
| 装备基础值 | `src/plugins/equip.js` | `equip_Attack`(4~20×lv)、`equip_Health`(40~200×lv) |
| 闪避全局 | `src/plugins/setBonus.js` | 所有闪避来源统一 ×0.4 |
| 中高阶阵法 | `src/plugins/formation.js` | `FORMATION_TIERS` 的 mult（最高 38） |
| 符箓增益上限 | `src/plugins/talisman.js` | 暴/闪/特效 0.25、攻/防/修 1.2 |
| 永久丹药 | `src/plugins/alchemy.js` | 攻/防/血/暴/闪各 effect 系数 |
| 修炼速度（境界越深越慢） | `src/plugins/game.js` | `realmCultSpeedMult`（1→0.5） |
| 寿元/衰老 | `src/plugins/time.js` | `DAYS_PER_SECOND`、`REALM_LIFESPANS` |
| 奇遇CD | `src/plugins/adventure.js` | `ADVENTURE_COOLDOWN = 30000` |
| 纸牌底注 | `game/texasPoker.vue`、`zhaJinHua.vue`、`douDizhu.vue` | `ANTE_LIST`（含百万~五百万档） |

## 八、常见修改场景

- **想让某境界战力更高/更低**：改 `breakthroughGate.js` 的 `STAGE_POWER` 里对应项即可（全局联动）。
- **想让突破门槛更松/更严**：改 `breakthroughPowerNeed` 的 `×1.25`。
- **想让豪杰榜更难/更易**：改 `heroBoard.js` 的 `heroBoostOfRank` 封顶（现 2.0）或 `realmPower`。
- **想让世界BOSS更好打/难打**：改 `worldBoss.js` 的 `realmPower×0.04`（血量）或 `道友协同 6~10×`。
- **想让敌人自虐点/温柔点**：改 `enemyStatsForPower` 里的攻/防/血分配比例。

## 九、版本回溯

每个改动都是独立 commit。若某次改动想回退：
`git revert <commit>`（安全生成反向提交），或 `git reset --hard <上个commit>`（工作区会丢，慎用）。
最新提交见 `git log --oneline`。
