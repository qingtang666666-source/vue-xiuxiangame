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
- `heroBoostOfRank(rank)`：榜尾约 ×0.85，榜首批次 ×1.0，再叠加同名次位置差。
- 豪杰也穿装备：按排名配置黄阶~道阶、+0~+30 强化、下品~绝品细分级（`heroGearOfRank` / `heroEquipmentStats`）。
- `heroPowerOfRank(rank)` = 与玩家同口径的系统加成总和（装备/阵法/功法/宗门/资质/转世/飞升/本命法宝/技艺），**不设豪杰专用战力上限**；顶级豪杰约 42.8 亿。
- 豪杰装备基础属性统一 ×0.7，再吃系统百分比/加值加成。
- 豪杰拥有神通（`heroDivineOfRank`），战斗中可按 `skillChance` 实际释放爆发/控制/回复/吸血类技能。
- 挑战：打赢排名更高者 → 玩家取代该名次，目标及后续豪杰顺延一位；榜尾仍保留在 301 名，不会消失（`applyWin` / `boardList`）。
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
| 装备基础值 | `src/plugins/equip.js` | `equip_Attack`(4~20×lv×境界倍率)、`equip_Health`(40~200×lv×境界倍率) |
| 闪避全局 | `src/plugins/setBonus.js` | 所有闪避来源统一 ×0.4 |
| 中高阶阵法 | `src/plugins/formation.js` | `FORMATION_MULT`（道阶 80）、消耗 `pow(mult,0.72)` |
| 符箓增益上限 | `src/plugins/talisman.js` | `talismanBuffCap()`：暴/闪/特效 0.25→0.40、攻/防/修 1.2→3.36（按品阶） |
| 永久丹药 | `src/plugins/alchemy.js` | 攻/防/血/暴/闪各 effect 系数 |
| 修炼速度（境界越深越慢） | `src/plugins/game.js` | `realmCultSpeedMult`（1→0.5） |
| 寿元/衰老 | `src/plugins/time.js` | `DAYS_PER_SECOND`、`REALM_LIFESPANS` |
| 奇遇CD | `src/plugins/adventure.js` | `ADVENTURE_COOLDOWN = 30000` |
| 纸牌底注 | `game/texasPoker.vue`、`zhaJinHua.vue`、`douDizhu.vue` | `ANTE_LIST`（炸金花/德州最高 100 万；斗地主仍含至 500 万） |
| 炸金花单挑 AI | `src/views/game/pokerEngine.js`、`zhaJinHua.vue` | `AI_PROFILES` 0~5 档；单挑基础第 4 档（顶尖），单挑 3 连胜升第 5 档（无双）；只调整策略，不改牌 |

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

## 十、品阶曲线：丹 / 符 / 阵 / 装 的跨大境界差距

数值全部集中在 `src/plugins/craft.js`，改这一处四条线一起联动。

- 境界节奏：16 大境界 × 9 级 = 1~144。`stageOfLevel(lv)`、`stageStartLevel(s)`。
- 品阶解锁（`craftLevelOfTier`）**与大境界边界对齐**（可越级 +2）：
  黄=炼气1 / 玄=金丹19 / 地=元婴28 / 天=炼虚46 / 仙=合体55 / 帝=大乘64 /
  神=渡劫82 / 灵=真仙91 / 皇=金仙109 / 圣=太乙118 / 道=道祖136
  → 每跨一个大境界，就有一档更高的 丹/符/阵 可炼（阵法 `minLevel` 同源）。
- 三条倍率曲线（1~11 阶）：
  | 曲线 | 用途 | 数值 | 总跨度 |
  |---|---|---|---|
  | `TIER_FLAT` | 攻/防/气血等**加值**、炼制消耗 | 逐阶 ×1.9 | 1 → 611（原 100） |
  | `TIER_PCT` | 丹药的**百分比**效果（暴/闪/修/财） | 沿用原曲线 | 1 → 100 |
  | `TIER_BUFF` | 符箓**限时增益**专用 | 逐阶 ×1.75 | 1 → 269（原 100） |
- 符箓三处同时拉开：倍率(`TIER_BUFF`) + 生效上限(`talismanBuffCap`) + 持续时间(`talismanMinutes` 20→172 分)。
  道符：攻击 +336%（原 +120% 封顶）、暴击 +40%（原 +25% 封顶）。
- 阵法：`FORMATION_MULT` 道阶 80（原 38），消耗只按 `pow(mult,0.72)` 增长；
  `formationStats` 的 CAPS 攻防 3→4、修/财/离线 2→2.5。
- 装备：基础值 × `gearRealmMult(lv) = 1.09^大境界序号`（道祖装 ≈ 同品质炼气装 3.6 倍），
  词条(`affix.rollStatValue`)同源；品质倍率上段抬高（神 11→12 / 灵 14→16 / 皇 18→21 / 圣 23→28 / 道 30→38）。
- 为给上面留出上升空间，`setBonus.effectivePlayerStats` 的百分比封顶放宽：
  `PCT_CAP` 2.5→3.6（符+阵）、`PCT_ABS_CAP` 4.0→5.2（再含界域/转世）。

实测对照（`node --import ./tools/preload.mjs tools/check-gap.mjs`）：

| 档位 | 丹(攻) | 符(攻%) | 符持续 | 阵 20级(攻%) |
|---|---|---|---|---|
| 黄 | +10 | 3% | 20 分 | +12% |
| 神 | +470 | 86% | 103 分 | +167% |
| 道 | +6110 | 336% | 172 分 | +960%（受 400% 单系封顶） |

> 调参提示：只想让“装”更陡 → 改 `GEAR_STAGE_RATIO`；只想让“符/丹”更陡 → 改 `TIER_FLAT` / `TIER_BUFF`；
> 若发现高阶玩家战力溢出（突破/豪杰榜过易），优先回调 `TIER_FLAT` 与 `GEAR_STAGE_RATIO`，而不是改 `STAGE_POWER`。

## 十一、敌人强度锚定（历战 / 无尽塔 / 大世界探索 / 世界BOSS）

统一入口：`src/plugins/enemyScale.js`。**敌人一律以“挑战者自己的战力”（`playerPowerScore`）为锚再乘倍率**，
所以装备/丹药变强只会把锚一起抬高，越级不再白送。

| 玩法 | 函数 | 倍率口径 |
|---|---|---|
| 历战 `/battle` | `ladderEnemies` | 风平浪静 0.6 / 势均力敌 1.0 / 凶险莫测 1.4 / 首领 1.4×elite(1.8+转世×0.15)；多只时单只 ÷count^0.7 |
| 无尽塔 `/endless` | `towerFloorEnemy` | `0.25 + (层−1)×0.065`，再乘精英（5层1.12 / 10层1.4 / 50层1.8） |
| 大世界探索 | `exploreEnemy` | `0.42 + 区域序号×0.11`（上限 1.15） |
| 领地/拦路 | `territoryEnemy` | `0.75 + 区域序号×0.16`（上限 1.9） |
| 世界BOSS `/boss` | `worldBossEnemy` | `2.2 + 转世×0.18` 倍玩家战力 |

- 三围由 `enemyStatsForPower(power)` 反推（攻 13%、防 3%、血 95%），暴击/闪避按大境界温和成长（封顶 0.28 / 0.22）。
- **反秒杀保护** `guardOneShot`：敌人攻击不超过挑战者气血的 42%（世界BOSS 50%），避免早期真实属性远低于名义境界战力时被一刀带走。
- 突破试炼/豪杰榜/秘境/宗门/协力世界BOSS 仍按 `realmPower` 绝对标准（它们本身是“境界考核”），不在此列。
- 旧实现的两处硬伤（已修）：历战与无尽塔直接吃 monster 表裸数值（合体期只有标准战力约 1/10，随便越一个大境界碾压）；
  monster 表在 144→145 级一次跳约 480 倍，导致无尽塔 72 层实质封顶。
- 调参：想让塔更软 → 调 `towerFloorGrowth` 的 0.065；想更硬 → 抬 `towerElite`；历战难度在 `LADDER_DIFFICULTIES` 与 `battlePage.difficulties.mult`。

## 十二、存档保险库（加密 + 验签 + 数值体检）

`src/plugins/saveVault.js`（`persistence.js` 仍负责脏标记与延迟落盘，读写全部转调这里）。

- 结构：`XSYX2|salt|iv|cipher|HMAC`。密钥 = `PBKDF2(前端常量, 随机盐, 1300 轮, 256bit)`，AES-256-CBC；
  明文里再嵌一层 `SHA256(数据|密钥)` 摘要作第二道校验。
- **改一个字节就验签失败**；失败时不覆盖原档：自动另存 `vuex.corrupt-<ts>` 并提示可从备份回滚。
- 兼容：旧版 `{"boss":AES,"player":AES}`（localStorage 与导出文件）仍可读取，下次落盘自动升级为 v2。
- 数值体检 `auditPlayer`：结构/数值有限性/概率范围/`总体实力 ≤ 境界标准×8`；导入不合格直接拒绝（手搓 JSON 无效）。
- 备份：`backupSave(label)` 保留最近 5 份 `vuex.bak-*`；导出前先 `flushPersistence`（旧版会导出“上一次自动保存”的旧档）；
  导入前自动备份 + `stopPersistence()`（防止内存旧态在刷新前倒灌）；删档走 `wipeSave()`（先停表再删，修掉“删了又活过来”）。
- 说明：单机游戏的密钥必然在前端代码里（构建另有混淆），所以它是“抬高改档门槛”，不是密码学意义上不可破解。
- GM 页导出同样使用该加密格式；验证脚本 `node --import ./tools/preload.mjs tools/check-save.mjs`（7 场景）。

## 十三、正式版本纪念日

- 每年 **9 月 9 日**（现实日期）登录可领取：灵石 100,000、筹码 50,000。
- 文件：`src/plugins/anniversary.js`；存档字段 `player.anniversaryClaims` 记录已领取年份，每年仅一次。
- 首页会显示“正式版本纪念日”横幅，点击领取；桌面端与手机端均有入口。
