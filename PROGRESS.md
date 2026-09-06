# 游戏进度 / 接续指南

> 本文件用于跨会话接续。若重新开始开发，先读这里，可快速恢复上下文。

## 项目信息
- 位置：`D:\MirServer\project-candidates\vue-xiuxiangame`
- 技术栈：Vue 3 + Pinia + Element Plus + Vite + vite-plugin-pwa（混淆开启）
- 路由：hash 路由（`createWebHashHistory`），`base: './'`
- 存档：浏览器 `localStorage['vuex']`，**origin 固定为 `http://127.0.0.1:5173`**（改端口会进度清零）
- 玩法：文字修仙放置挂机游戏（《凡人修仙传》风格），单机可分享

## 如何运行
- 正式玩（推荐）：双击桌面「我的文字修仙全靠刷」快捷方式（→ `start-game.cmd` → `serve-dist.mjs` 托管 `dist`，地址 `http://127.0.0.1:5173`，自动开浏览器）
- 改代码后刷新：双击 `build-game.cmd`（`npm run build` 后启动）；或终端 `npm run build`
- 开发模式：`npm run dev`（仅开发用，会占 5173，与快捷方式冲突前先停 dev）
- 分享：把 `dist` 传 GitHub Pages / Netlify / Vercel（hash 路由无需服务器配置）；或整包发人 + Node 双击启动

## 关键入口 / 文件
- 主页 `src/views/homePage.vue`（属性/命运/图鉴/赛季/世界Boss/本命法宝/挂机套餐入口）
- GM `src/views/gmPage.vue`（隐藏入口：连点「修炼」分类页签 5 次；已加筹码/道痕/赛季/命运/本命法宝/世界Boss 快捷）
- 任务 `src/plugins/quest.js`、`src/views/questPage.vue`
- 战斗聚合点 `src/plugins/setBonus.js`（`effectivePlayerStats`）+ `src/plugins/effectCombat.js`
- 挂机/离线 `src/plugins/alchemy.js`(`idleRates/idleTick`)、`offline.js`、`autoIdle.js`
- 资质 `src/plugins/aptitude.js`、`talent.js`、`insight.js`
- 新手礼包 `src/views/homePage.vue`（`genNewBiePack`；1018=随机高档装备，均 `noReq` 无穿戴限制）
- 纸牌 `src/views/game/`（zhaJinHua/texasPoker/douDizhu/pokerEngine/pokerUtil）
- 筹码 `src/views/game/game.vue`（1 筹码=10 灵石）、`src/plugins/chipShop.js`（每 1 游戏月刷新）
- 运行时插件：fate(命运/道痕/天道/宿慧)、codex(图鉴)、season(赛季)、worldBoss、natalArtifact(本命法宝)、rebirthFlow(轮回)、persistence(存档 deepMerge)

## 本会话已实现
1. 轮回多周目：每世随机命运+天道规则+永久道痕/宿慧（`fate.js`）
2. 图鉴完成度加成（每 1% +0.1% 修为/+0.05% 灵石）；稀有/史诗/传说成就+稀有资源；套藏称号
3. 一键挂机套餐 + 安全自动突破；离线报告已有
4. 赛季天梯+奖励（每 14 天结算，道祖档已收敛）
5. 经济博弈：市场行情波动（45 游戏天周期 0.85~1.15），低买高卖
6. 本命法宝：随境界成长、温养、大境界觉醒词条、轮回不丢
7. 世界 Boss：每日刷新+虚拟道友榜+贡献奖励
8. 任务扩充：固定 f1~f28（境界链+四艺/秘境/洞府/世界Boss/赛季引导）、自选 s1~s14
9. GM 扩充：筹码/道痕/赛季、命运重随、本命法宝+10级、世界Boss屠、全宽布局
10. 平衡：属性点封顶、赛季顶级筹码下调、稀有成就培养丹收敛、高境界普通怪强度微调；**盲盒宝箱已按要求还原**
11. 纸牌三款 + 筹码系统 + 筹码商店（商品可点看详情）
12. 新手装备无穿戴限制（`noReq`）、1018 彩蛋随机高档装备
13. 部署：start-game.cmd / build-game.cmd / serve-dist.mjs（零 npm 依赖）；桌面已建快捷方式；移除 51.la 统计
14. 大世界地图 `worldMap.vue`（`/worldmap`）：区域按境界锁、当前区域展示、各区坊市/场所标签、点标签深链 `market?venue=` 直达对应摊位；市场页已支持 `?venue=` 打开指定场所分类；顶部导航 + 首页「冒险」双入口
15. 稳定/一致性优化：探索/BOSS 战斗改为复用共享引擎 `plugins/battle.js`（行为等价，消除两页重复）；探索怪补 `level`（修复境界压制计算为 NaN）；存档防丢——`persistence.js` 加“容量近上限预警 + 写入失败提示（指向 GM 导出备份）”；战斗页（无尽塔/世界Boss/探索）境界压制标签改为双向显示（你攻TA/TA攻你）
16. homePage 巨组件拆分（第 1 批）：已抽 `SeasonPanel.vue`（赛季）、`WorldBossPanel.vue`（世界Boss）、`NaArtifactPanel.vue`（本命法宝）、`LevelsBoard.vue`（境界表）、`BatchPanel.vue`（批量：装备分解+灵宠放生）、`StrengthenPanel.vue`（炼器强化），均用 `:visible` / `@update:visible` / props 传 info；主界面常驻显示（`naTier`/`naLv`）仍留在 homePage。**结构发现**：其余面板均带玩法操作、与主界面共享的属性/handler 深耦合，需“两步走”。
17. 两步走·共享逻辑：新增 `playerAttr.js`（`applyPlayerAttribute` 属性结算）、`equipOps.js`（`wearEquip`/`removeEquip`/`dismantleEquipsByQuality`）、`petOps.js`（`releasePets`）、`equipForge.js`（`enhanceCost`/`enhanceSuccessRate`/`resolveEnhancement` 炼器强化）；homePage 的 `playerAttribute`/`equipmentClose`/`equipItem`/炼器强化均改为调用共享并删除内联。**剩余**：背包/装备详情（最大，含 inventoryInfo 单件弹窗+出售/佩戴/分解入口）、称号佩戴结算(图鉴)、存档逻辑(设置)、故事分支(剧情)
18. 功法系统重构（数据层 done）：`technique.js` 重写——功法带 `type`(active/passive)+`rarity`(凡/灵/仙/圣/帝/神/上古)；新增卷轴 `player.techniqueScrolls` 与参悟 `attemptLearn`（成功率=`基础(稀有度)×根骨资质×悟性`，失败耗半资源）；去除修炼等级门槛；新增主动(≤5)/被动(≤3)选择 `toggleTechniqueSet`/`techniqueActive`/`techniquePassive`；`methodStats` 只结算选中的功法(旧档无设置自动回退)，并输出 `divinePool`(选中主动功法神通)。store 加 `techniqueScrolls`/`techniqueSet`。**待做**：① UI 挪侧页(TechniquePanel drawer，仅展示已获得/已习得+主动被动选择) ② 战斗多神通触发(combat/battle 读取 divinePool) ③ 功法获取途径(秘境/奇遇/宗门/游商/赛季挂接 `grantScroll`)
19. 宗门开局选择 + 捐献：`sect.js` 新增 `generateSectChoices`(3 个候选，按根骨生成、可换一批)、`joinSect`(加入后 position=1 外门弟子)、`donate`(灵石/丹药/符箓/装备→贡献，150 灵石≈1 贡献，按物品价值换算)；`sectPage.vue` 未入门时展示候选宗门、已入门展示捐献区(物品按价值给贡献)，退出宗门自动重刷候选；装备捐献下拉显示“捐献 N 贡献”。平衡：捐献是补充途径，贡献仍主要用于职位晋升（代价随职位抬升）。
20. 功法时间成本：`technique.js` 新增 `startLearn`/`startCultivate`/`tickTechniques`/`techTask`/`learnTimeMs`/`cultivateTimeMs` 等——参悟与修炼改为需要现实时间（离线也推进，转生清空），同一时间仅一门功法闭关；参悟完成按成功率结算（失败返还一半资源），修炼完成章节 +1；时长随品阶/重数提升、随悟性缩短；`App.vue` 30s 后台结算 + `TechniquePanel`/`techniquePage` 每秒进度条/倒计时与通知。`learnTechnique`/`cultivateTechnique` 改为开启任务（原 instant 行为由 `attemptLearn` 保留）。
21. 通用“工坊/修炼”计时器：新增 `actionTimer.js`（`beginAction`/`tickActions`/`actionTask`/`actionRemainMs`/`actionPercent`/`finishNow`/`cancelAction`/`canUpgradeProficiency`），统一 `player.actionTimer` 单槽位（开始校验锁定、到期结算），覆盖 **炼丹、炼器、制符、装备强化、功法熟练度**；成功/失败沿用各自原有成功率与半损逻辑，`craftCount`/`lastforge` 保留。全局新增 `ActionTimerBar.vue` 任务栏（进度/剩余秒/跳过/取消，每秒结算并通知），挂载于 App.vue；炼丹/炼器页原 5s 假计时改为该离线可推进机制，制符/强化/熟练度由即时改为计时。转生清空 `actionTimer`。（注：突破境界仍受“修为累积需时间”的自然约束，未额外加单独计时。）
22. 平衡/UX 修复：① 培养丹 `price` 320→90（`market.js` ITEM_DB），丹方估值 `ingredientValue` 改为读取 `itemDb('cultivateDan').price`（原硬编码 320），消除“批量出售培养丹换百万灵石”的倒卖漏洞；② 物品悬浮提示延迟——Element Plus `el-tooltip`/`el-popover` 的 `hide-after` 默认 200ms，导致鼠标移开后标签滞留；已给主页装备 `el-popover`、背包/市场/宗门兑换/筹码商店等 `el-tooltip` 统一设 `:hide-after="0"`，移开即消失。
23. 回合制战斗系统：新增 `battleEngine.js`（纯逻辑引擎）+ `battlePage.vue`（`/battle` 页，顶部导航新增「⚔️历战」入口）。参照传统回合制设计——速度决定行动顺序；行动=普攻/主动功法神通(耗灵力/按品阶章节折算伤害，含爆发/控制/吸血/回复四型)/防御(减伤+蓄灵)/逃跑(速度比判定概率)；`nextTurn` 推进行动者、跨回合、结算持续伤害(中毒/灼烧)与眩晕；复用特效(控制/吸血/暴击/闪避/格挡/减伤/破甲/境界压制)与 `effectCombat` 结算。敌人**按自身境界用现有 monster 表独立成长**，难度只决定敌方等级相对玩家的境界差（-9/0/+9/+18 级），由“境界压制+实际战力”自然体现碾压/被碾压；历战满血进场、胜负不损真实气血，胜利给修为/灵石/培养丹/灵草/炼器石。**自动战斗**开关（战斗中可随时开/关，手动点按钮自动关闭接管）已升级为智能策略：濒死保命(治疗/吸血) > 控住最强延缓出手 > 濒死无奶则防御苟活 > 灵力充足/对手强则发大招 > 普攻；并带“可斩杀则斩、否则打威胁最大”的目标选择。实测同级满血胜、高 9 级由败转胜（控+奶+爆发）。另修复**斗地主**叫地主阶段不显示玩家手牌的问题（叫地主阶段也展示手牌，手牌尺寸 48×68→64×90 更利于辨认）。
24. 德州扑克 AI 收紧：原 `aiDecide` 把“牌力≥0.3”都当可跟，导致 67o(≈0.326)/K7o(≈0.364) 面对大注/全下也敢跟。现收紧牌力阈值（弱<0.4、中≥0.4、好≥0.52、强≥0.75），跟注需“底池赔率更优”或“小注且牌≥0.42”，弱牌面对大注/全下必弃，中牌不再无脑加注顶全下；保留 tight/aggr 性格影响弃牌与下注频率。
25. 德州扑克 AI 偏松弱 & 买入封顶：AI 性格改为松(0.18~0.48)/被动(0.2~0.55)，决策更倾向跟注、少诈唬少加注，中/小额注咬得更松，但保留“弱牌不接大注/全下”底线。**修复“全下输超过一把上限”**：原 `chipsPerPlayer: chips` 把玩家全部筹码当作单局买入，All-in 输了会扣到整条余额；现改为 `min(chips, 底池封顶)`，每局买入以上限封顶、至多输“一把上限”，不会输光/输超。
26. 修复“AI 接全下必然赢”的观感：原全下判定只接 `isGood/isStrong(≥0.52)`，导致 AI 一旦接就是强牌、几乎稳赢，很像“透视/只接必赢”。现改为**按牌力分档 + 概率**接全下（`callP`：强≥0.7→0.9、好≥0.55→0.58、中≥0.42→0.24、弱→0.05，越松越高，极离谱下注再降），去掉了“弱牌遇全下必弃”的硬逻辑（改为仅对大注非全下必弃）。已跑 400 手翻前全下统计：AI 接全下 10%，**接后胜率 56.4%（即 43.6% 会输）**——不再是“接了必赢”。
27. 纸牌发牌公平性：将 `pokerUtil.js` 与 `douDizhu.js` 的洗牌由 `Math.random` 升级为**加密级随机 `crypto.getRandomValues`**（Fisher–Yates），保证一副 52 张/54 张牌真正均匀、不可预测；德州/炸金花每局 `createPokerEngine` 新建一副洗牌，发牌、翻牌/转牌/河牌（斗地主含底牌）均取自同一副洗好的牌。已跑 2000 副洗牌测试：全牌唯一、单牌各位置分布均匀。
28. 回合制战斗接入真实战斗：新增可复用 `TurnCombat.vue` 回合制对战弹窗 + 引擎 `monsterToEntity`（把探索/BOSS 原数据 health/attack/defense 转成对战实体）。**探索页、世界BOSS页、无尽塔页**的开战按钮由原“挂机/单回合”改为弹出回合制对战：可手动选主动功法神通/普攻/防御/撤退，也可开自动；胜利沿用原奖励（探索=击杀培养丹+`findTreasure`[经验/装备/突破]，世界BOSS=装备+悟性丹+混沌石，无尽塔=修为/灵石/装备/每5层500培养丹），引擎 `award` 开关设为 false 避免重复发奖；失败/撤退提示沿用。已实测 `monsterToEntity`+单怪战斗可胜利、`award:false` 生效。历战页 `/battle` 保留为可选挑战竞技场。（其余：秘境探秘为概率判定、共享世界Boss为每日共击磨血，暂未改。）
29. 德州全下规则：① `showdown` 实现**边池(side pot)**——按投入分档、每档只由投入达该档的玩家竞争，低筹码全下者最多赢其投入对应主池（单挑即×2），多投边池归高筹码方；② **根因修复**：原买入=`min(chips, 底池封顶)` 导致你 All-in 后 `state.pot>=封顶` 在**对手还没跟注时就提前开牌**，边池把多投部分退回、看似“只输几十”。现改为 **买入=底池封顶÷当前人数**，使对手有空间补出同等筹码、总底池在全员补齐后才触顶。实测：单挑 ante10 买入500、最大亏损 -500；六人 ante100 买入3000、最大亏损 -3000。
30. 战斗中“功法用不了”修复：`getPlayerAbilities` 原只认“上阵集合”，导致未把主动功法点进上阵时战斗没技能按钮。现改为——**已选择上阵则用所选集合（≤5门）**，**未选择则回退到所有已习得的主动功法神通**，保证学过的神通都能在回合制战斗/历战里施放；被动功法本由 `methodStats` 作为属性加成（未上阵也按主修全额/其余30%结算）。已实测未上阵时列出已习得神通、已上阵时只列所选。
31. 多项修复：① 德州“开始游戏没反应”——`chipsPerPlayer` 误引用未定义 `ante`（应为 `currentAnte.value`）导致 `createPokerEngine` 抛错，已改；② 筹码商店**宝箱批量购买**——宝箱类（盲盒/装备/高阶装备/丹药/符箓宝箱）加数量框，`qty>1` 走 `batchOpen` 批量开箱并聚合一条汇总通知（上限≤50、按筹码可负担）；③ 背包**一键整理**满背包——头部新增强整理按钮，道具按 `minScale` 品级、丹药/符箓按 `tier` 品级自动排序（并让 `props`/`pillList`/`talList` computed 自带排序）。
32. 炸金花“点全下只下底注就开牌”修复：`chipsPerPlayer: chips.value`（全余额买入）+ 封顶过小，导致全下后 `pot>=封顶` 在对手未跟注时提前开牌。改为 **买入=底池封顶÷当前人数**（含多人模式）。实测单挑/四人/九人买入 500/175/133，最大单局亏损与最大投入均等于买入；德州此前同款修复，二者共用引擎，多人模式均解决。
33. 功法时间缩短：`learnTimeMs` 改为 **`5+grade*1.4`s**（黄阶≈8s、道阶≈20s，受悟性减免），`cultivateTimeMs` 改为 **`4+grade*0.8+chapter*0.5`s**（初阶≈5s、高阶高重11阶20重≈22s，受悟性减免）。已实测主动功法在回合制战斗/历战中**可用且生效**（未上阵也回退到已习得主动神通；放技能扣灵力、造成伤害）。
34. 功法出售/遗忘：`technique.js` 新增 `techniqueSellPrice`/`sellTechnique`（**八折**回收灵石，保留卷轴可重修）/`forgetTechnique`（遗忘不返还）；删除时同步从 `techniqueSet.active/passive`、`mainMethod`、在途 `techTask` 中清除。功法卡片（侧页）已加「出售(八折)/遗忘」按钮，带确认弹窗。实测出售 1阶3重 得 108 灵石并清空主修/任务。
35. 符箓批量使用：`talisman.js` 新增 `useTalismanBatch`——buff 符箓只激发一次并延长剩余时长（共耗 count 张），instant 符箓逐个生效；背包符箓页签新增「批量使用」按钮（弹窗输入数量）。与丹药“批量服用”一致。
36. 功法阁补充 & 时间硬上限：① 旧「功法阁」页(`/technique`)已习得区补上「出售(八折)/遗忘」按钮（含确认弹窗），与侧页一致；② `learnTimeMs`/`cultivateTimeMs` 增加 **`Math.min(20000,...)` 硬封顶 20 秒**（无论悟性）。实测低悟性学习 8~20s、修炼 5~20s（道阶20重封顶20s）。
37. 筹码商店**两款功法宝箱**：`chipShop.js` 新增 `openChipTechChest`(功法宝箱,1万筹码) 与 `openChipHighTechChest`(高阶功法宝箱,10万筹码)——机制与装备宝箱一致：90% 中/高阶功法卷轴、9% 珍品/绝世功法、1% 无上功法篇(三卷)，均不限购；只发玩家**尚未持有**的卷轴（`ownedTechniqueIds` 过滤），该档集齐则退还筹码。已接入批量开箱与商店标签。**修复“刷新看不到”**：旧存档 `chipShop.stock` 是缓存，改为定义 `FIXED_CHEST_DEFS` 常量，`ensureChipShop` 在旧缓存上自动补齐缺失的固定宝箱（含新品），无需刷新/跨天。
38. 功法阁优化：列表 `displayList` 默认**按品阶从高到低**排（道阶在上，同阶按稀有度/流派），新增「一键整理」「批量出售中低阶(≤仙阶)」按钮；`doBatchSell` 将所有已习得、品阶≤5 的功法一键八折出售（含卷轴移除），弹窗确认并汇总所得。
39. 自选任务刷奖励漏洞修复：原自选任务的进度计数(`exploreWins`/`craftCount` 等)是累计值，领奖后任务虽移出 `selected`，但能立刻重新选择同一任务、进度未清零 → 可无限领取。现为自选任务新增 `quests.claimedSelected` 记录，**领取过即标记“已完成”，不可再选择/再领取**；`questPage` 任务池对已领取显示“已领取”并禁选；`autoIdle.autoQuest` 也跳过已领取任务。已实测：领过“斩妖除魔”后再选/再领均被拒。
40. 平衡：① 闪避/暴击上限由 85% 收至 **80%**（`setBonus` 的 `clamp`、`battleEngine.createPlayerEntity` 双处，含丹药/符箓临时加成一并封顶）；② **战力/属性显示全部改用有效属性**——主页新增 `effStats`/`powerScore` computed，气血(上限)/攻击/防御/暴击/闪避/总体实力均走 `effectivePlayerStats`（含阵法/增益/功法/宗门/本命法宝），暴击/闪避显示封顶 80%。实测 player.dodge/critical=1.0 时有效属性与战斗实体均为 0.8。
41. BUFF 叠加合并：`buffs.addBuff` 由“直接 push”改为**同名合并**——再次使用同一符箓/丹药时，从当前到期时间继续延长（叠加同名），不新增第 2 条，避免 BUFF 页刷出一堆同款条目；更优 `effect`/`quality` 会刷新。实测同一增益符箓用 2 次 → BUFF 仍为 1 条、时长 24→48 分钟。
42. 坊市截杀/抢劫接入回合制战斗：`npcSystem.js` 导出 `npcCombatStats`、新增 `ambushWin`/`robWin`/`ambushLose`/`robLose`；`npcPage.vue` 的「截杀/抢劫」改为弹 `TurnCombat` 对战 NPC（按等级生成攻/防/血），胜利给掉落（截杀=机缘掉落、抢劫=半数库存），失败损失灵石，撤退即放弃。
43. 多项目：① **参悟失败保底**——`learnSuccessRate` 在初始成功率 <70% 时，每失败一次 +15%，封顶 70%（`player.learnFails` 记录，成功清零，store 加字段）；实测道阶 18.8%→70% 封顶，黄阶(95%)不触发。② **功法神通悬浮介绍**——`TechniqueCard`/`techniquePage` 的神通名加 tooltip（类型/威力/主动可施放+触发率）。③ **秘境接入回合制**——`secretRealm` 新增 `realmEnemy`/`realmWin`/`realmLose`，`realmPage` 的「进入秘境/首领挑战」改为弹 `TurnCombat`（守灵/首领），胜利给掉落/天材地宝、失败返还部分。
44. 转生资源清空 + 完全重开：① 手动「转生突破」与 `performRebirth` 现在**灵石/混沌石/筹码全部清零**（本世资源从零开始），转生门槛仍为满级+无未用境界点；②「完全重开」**移到设置页**，替代原“保留传承”选项——设置里“轮回模式”固定为“重开新世（清空本世，保留永久传承）”，并新增“完全重开（不继承任何东西）”危险按钮（`fullReset` + 刷新）；`store` 默认 `rebirthMode:'fresh'`，`performRebirth` 统一 fresh；修炼页移除“完全重开”，仅保留“转生突破”。
45. 分享 & 手机端：`serve-dist.mjs` 默认绑定 `0.0.0.0` 并打印**局域网访问地址**（同 Wi‑Fi 朋友可玩），本地仍开 `127.0.0.1`；战斗弹窗 `TurnCombat` 宽度改 `min(940px,94vw)` 手机自适应；确认 PWA（manifest+图标+SW）已就绪，手机可“添加到主屏”安装；顶部导航已有移动端 media 适配。
46. GitHub Pages 公网部署：`vite.config` 已用 `base:'./'`（相对路径，任意子路径可跑）；新增 `.github/workflows/gh-pages.yml`（push 到 main 自动 build 并 deploy 到 Pages）；PWA manifest 图标改为相对路径（删除静态 `public/manifest.webmanifest`，由 VitePWA 生成）；旧 Docker workflow 改为仅 `workflow_dispatch` 手动触发。已有自定义域名 `xiuxian.wenzi.games`（`public/CNAME`，配了 DNS 则用该域名；否则删 CNAME 用 `setube.github.io/vue-xiuxiangame/`）。仓库 `setube/vue-xiuxiangame`。

## 已知 / 待办
- 第 6 点未做：战斗路线分支 + 正邪/道心（突破心魔、选择影响剧情/结局）——用户暂缓
- 盲盒宝箱机制用户**明确不改**（尊重 5%/70%/25% + 888 保底）
- 端游后期数值可为千万~亿级（受控不溢出；用户要求精确到个位展示，未改）
- 继续开发：先 `npm run build` 验证，再双击 start-game.cmd 体感
