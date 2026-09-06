// 随机剧情数据库 —— 约 100 段奇遇/机缘/传承/秘辛/试炼
//
// 参考主流玄幻修仙小说与同类型成功游戏。tier 为境界解锁档(每10级一档)，
// difficulty 1~5(越高越难、奖励越强)。reward 由 story.js 统一结算：
//   { money, currency, material:{tier,qty}, treasure:{tier,qty}, equip:{quality,grade},
//     methodGrade, stat:{...}, buff:{name,effect,minutes} }

export const STORY_EVENTS = [
  { id: 'mistery_1', title: '山穷水尽', tier: 0, difficulty: 1, type: '奇遇', text: '赶路遇一重伤老者，你出手相救，他临终赠你一枚玉简。', reward: { material: { tier: 2, qty: 8 }, money: 800 } },
  { id: 'mistery_2', title: '古刹疗伤', tier: 0, difficulty: 1, type: '机缘', text: '避雨入破败古刹，佛像下藏着一片失传的疗伤丹方。', reward: { material: { tier: 3, qty: 5 } } },
  { id: 'mistery_3', title: '渡口商队', tier: 0, difficulty: 1, type: '坊市', text: '渡口商队仗义，托你捎一件货，酬以银两。', reward: { money: 1200 }, choices: [
    { label: '应下送镖', desc: '接下这趟货，安全送至', difficulty: 1, fail: '中途遇劫，货损人伤', outcome: '你顺利送镖，得了一笔酬劳', reward: { money: 1800 } },
    { label: '婉言谢绝', desc: '另有要事，不便相帮', difficulty: 1, fail: '商队失望而去', outcome: '商队留你一杯清茶，缘浅', reward: { money: 600 } }
  ] },
  { id: 'mistery_4', title: '灵田枯井', tier: 0, difficulty: 1, type: '奇遇', text: '老农恳求你灵井有水，井底竟有一株千年灵草。', reward: { material: { tier: 4, qty: 4 } }, choices: [
    { label: '下井取草', desc: '亲入井底，取那灵草', difficulty: 2, fail: '井底阴寒，你只得干看着', outcome: '你下井采得千年灵草', reward: { material: { tier: 4, qty: 6 } } },
    { label: '引水救田', desc: '以灵泉灌溉，成全农人', difficulty: 1, fail: '灵泉水涸，草亦未得', outcome: '老农感念，分你半株', reward: { material: { tier: 3, qty: 5 } } }
  ] },
  { id: 'mistery_5', title: '侠盗赠物', tier: 0, difficulty: 1, type: '机缘', text: '一侠盗被追，将一袋灵石掷入你怀中，纵身而去。', reward: { money: 2000 }, choices: [
    { label: '收下灵石', desc: '财不露白，揣入怀中', difficulty: 1, fail: '被追兵盯上，你又舍回大半', outcome: '你收下一袋灵石', reward: { money: 2800 } },
    { label: '抛还给追兵', desc: '明哲保身，撇清干系', difficulty: 2, fail: '追兵不领情，讥你胆小', outcome: '追兵取走灵石，向你说破江湖规矩', reward: { material: { tier: 2, qty: 4 } } }
  ] },
  { id: 'mistery_6', title: '山洞剑意', tier: 0, difficulty: 2, type: '遗迹', text: '山洞石壁留有一道剑痕，参悟可得剑道皮毛。', reward: { stat: { attack: 30 }, material: { tier: 3, qty: 3 } }, choices: [
    { label: '参悟剑痕', desc: '贪图剑意，以心悟剑', difficulty: 2, fail: '剑意太锐，你心神受创而退', outcome: '剑意入心，剑气自生', reward: { stat: { attack: 50 }, material: { tier: 3, qty: 4 } } },
    { label: '拓印带走', desc: '稳妥拓下，留待日后', difficulty: 1, fail: '拓印粗糙，未能全录', outcome: '你将剑痕拓入卷中', reward: { material: { tier: 3, qty: 6 } } }
  ] },
  { id: 'mistery_7', title: '野狼袭营', tier: 0, difficulty: 2, type: '遇险', text: '夜宿荒山遭群狼围困，搏杀后得妖丹数枚。', reward: { material: { tier: 3, qty: 6 } }, choices: [
    { label: '硬撼群狼', desc: '以力破之，斩尽杀绝', difficulty: 3, fail: '群狼撕咬，你负伤而退', outcome: '你杀狼取丹，满载而归', reward: { material: { tier: 3, qty: 8 } } },
    { label: '火遁脱身', desc: '烧退狼群，安全为上', difficulty: 2, fail: '狼群避火反扑，你仓皇逃走', outcome: '你借火势脱身，得些许妖丹', reward: { material: { tier: 3, qty: 4 } } }
  ] },
  { id: 'mistery_8', title: '仙人抚顶', tier: 0, difficulty: 2, type: '机缘', text: '一老道抚你头顶，助你疏通经脉，修行大喜。', reward: { stat: { cultivationSpeed: 0.05 } }, choices: [
    { label: '诚心受教', desc: '俯首受道，专心聆听', difficulty: 2, fail: '老道嫌你心浮气躁', outcome: '老道为你疏经通络', reward: { stat: { cultivationSpeed: 0.07 } } },
    { label: '叩问大道', desc: '趁势追问大道真谛', difficulty: 3, fail: '老道笑而不答，飘然而去', outcome: '老道点破一丝玄机，你似有明悟', reward: { stat: { cultivationSpeed: 0.05, critical: 0.004 } } }
  ] },
  { id: 'mistery_9', title: '兽潮淬体', tier: 0, difficulty: 2, type: '试炼', text: '兽潮过境，你借机以兽血凝炼肉身。', reward: { stat: { health: 200 }, material: { tier: 2, qty: 8 } } },
  { id: 'mistery_10', title: '丹师遗泽', tier: 1, difficulty: 2, type: '传承', text: '丹师洞府坍塌前，你抢出半炉丹与一册心得。', reward: { material: { tier: 5, qty: 4 }, money: 3000 } },
  { id: 'mistery_11', title: '古碑迷阵', tier: 1, difficulty: 2, type: '遗迹', text: '古碑文晦涩，你苦读数日，竟窥得一丝大道之意。', reward: { stat: { cultivationSpeed: 0.08 }, currency: 1 }, choices: [
    { label: '昼夜参悟', desc: '不眠不休，硬啃碑文', difficulty: 3, fail: '碑文反噬，你心神受创', outcome: '你参透碑文，大道自明', reward: { stat: { cultivationSpeed: 0.1, critical: 0.005 }, currency: 1 } },
    { label: '拓碑而回', desc: '拓下碑文，留待来日', difficulty: 2, fail: '拓印不全，只得残篇', outcome: '你带回碑文拓片，慢慢参研', reward: { stat: { cultivationSpeed: 0.06 }, currency: 1 } }
  ] },
  { id: 'mistery_12', title: '拍卖顺风', tier: 1, difficulty: 1, type: '坊市', text: '恰逢拍卖会，你得贵人指点，低价捡漏一物。', reward: { treasure: { tier: 3, qty: 1 } }, choices: [
    { label: '果断拍下', desc: '听贵人指点赶紧出价', difficulty: 2, fail: '竞价过猛，高价得之无赚', outcome: '你低价捡得一件宝', reward: { treasure: { tier: 3, qty: 1 } } },
    { label: '静观其变', desc: '不贸然出手，静待机会', difficulty: 1, fail: '宝物流拍，你错失良机', outcome: '你于散场购得一件小物', reward: { material: { tier: 4, qty: 4 } } }
  ] },
  { id: 'mistery_13', title: '妖藤缠身', tier: 1, difficulty: 3, type: '遇险', text: '误入食人妖藤之地，你力战得脱，藤中藏有灵髓。', reward: { treasure: { tier: 2, qty: 1 } }, choices: [
    { label: '剖藤取髓', desc: '深入藤心，夺取灵髓', difficulty: 4, fail: '妖藤反噬，你仓皇退出', outcome: '你剖开妖藤，得灵髓一汪', reward: { treasure: { tier: 3, qty: 1 } } },
    { label: '全身而退', desc: '见好就收，不惹麻烦', difficulty: 2, fail: '惊动藤主，你狼狈逃出', outcome: '你全身而退，顺手拾得些许', reward: { treasure: { tier: 2, qty: 1 } } }
  ] },
  { id: 'mistery_14', title: '前辈传功', tier: 1, difficulty: 3, type: '传承', text: '垂死前辈将毕生功力打入你体，助你脱胎换骨。', reward: { stat: { attack: 80, defense: 60, health: 400 }, methodGrade: 3 }, choices: [
    { label: '全力承接', desc: '以肉身硬纳功力，风险极大', difficulty: 4, fail: '功力反冲，你经脉受损', outcome: '你承接其功力，脱胎换骨', reward: { stat: { attack: 120, defense: 90, health: 600 }, methodGrade: 4 } },
    { label: '循序渐进', desc: '只纳三成，稳扎稳打', difficulty: 2, fail: '前辈油尽灯枯，传功中断', outcome: '你稳步接纳，得部分精华', reward: { stat: { attack: 60, defense: 50, health: 300 }, methodGrade: 3 } }
  ] },
  { id: 'mistery_15', title: '黑市奇珍', tier: 1, difficulty: 2, type: '坊市', text: '黑市掌柜看中你的胆识，以低价售你一件来历不明的宝。', reward: { equip: { quality: 'warning', grade: 3 } } },
  { id: 'mistery_16', title: '湖心剑冢', tier: 2, difficulty: 3, type: '遗迹', text: '湖心剑冢有万剑环伺，你拼死取出一柄绝世神兵。', reward: { equip: { quality: 'danger', grade: 4 } }, choices: [
    { label: '拔剑而出', desc: '以血祭剑，强行夺兵', difficulty: 4, fail: '万剑噬体，你重伤撤出', outcome: '你拔出一柄绝世神兵', reward: { equip: { quality: 'danger', grade: 4 } } },
    { label: '取剑胚离', desc: '取一枚剑胚，稳中求胜', difficulty: 2, fail: '剑冢剑气凌乱，你只得到残片', outcome: '你夺得一枚剑胚与剑意', reward: { equip: { quality: 'warning', grade: 3 } } }
  ] },
  { id: 'mistery_17', title: '心魔试炼', tier: 2, difficulty: 4, type: '试炼', text: '心魔幻境步步杀机，你以道心破之，得大道之悟。', reward: { stat: { cultivationSpeed: 0.1, critical: 0.01 }, currency: 2 }, choices: [
    { label: '直面心魔', desc: '以道心硬撼心魔', difficulty: 5, fail: '心魔蚀心，你险些沉沦', outcome: '你斩却心魔，道心通明', reward: { stat: { cultivationSpeed: 0.12, critical: 0.012 }, currency: 3 } },
    { label: '绕道而行', desc: '避开幻境，另寻机缘', difficulty: 2, fail: '错过试炼，空手而归', outcome: '你绕开杀局，捡得一枚遗珠', reward: { treasure: { tier: 4, qty: 1 } } }
  ] },
  { id: 'mistery_18', title: '商会结善', tier: 2, difficulty: 1, type: '坊市', text: '你助商会平了一桩纷争，会长重谢于你。', reward: { money: 6000, material: { tier: 4, qty: 6 } } },
  { id: 'mistery_19', title: '灵兽归心', tier: 2, difficulty: 3, type: '机缘', text: '垂死灵兽认你为主，赠你一身灵脉精粹。', reward: { treasure: { tier: 4, qty: 1 }, stat: { health: 500 } }, choices: [
    { label: '收其为仆', desc: '结契收服，共赴大道', difficulty: 3, fail: '灵兽宁死不从，拂袖离去', outcome: '灵兽认主，赠你精粹', reward: { treasure: { tier: 4, qty: 1 }, stat: { health: 600 } } },
    { label: '放其归山', desc: '仁心放生，结一善缘', difficulty: 2, fail: '灵兽伤重，未能生还', outcome: '灵兽感念，衔来一株灵草', reward: { material: { tier: 5, qty: 6 }, stat: { health: 300 } } }
  ] },
  { id: 'mistery_20', title: '魔窟探秘', tier: 2, difficulty: 4, type: '遇险', text: '魔窟阴风阵阵，你九死一生夺得一缕魔焰之灵。', reward: { treasure: { tier: 5, qty: 1 }, equip: { quality: 'cyan', grade: 3 } }, choices: [
    { label: '深入魔渊', desc: '火中取栗，谋取魔焰', difficulty: 5, fail: '魔潮汹涌，你险些葬身', outcome: '你夺得魔焰之灵与一件魔器', reward: { treasure: { tier: 5, qty: 1 }, equip: { quality: 'cyan', grade: 3 } } },
    { label: '魔窟外围', desc: '只在外围拾取魔晶', difficulty: 3, fail: '魔卫察觉，你夺路而逃', outcome: '你拾得数枚魔晶', reward: { material: { tier: 5, qty: 6 }, currency: 1 } }
  ] },
  { id: 'mistery_21', title: '仙缘垂青', tier: 3, difficulty: 3, type: '机缘', text: '仙家遗物认你为有缘人，传你一门上乘功法。', reward: { methodGrade: 5 }, money: 8000 },
  { id: 'mistery_22', title: '秘境传承', tier: 3, difficulty: 4, type: '传承', text: '秘境洞窟为前人衣冠冢，你叩首得受其传承。', reward: { buff: { name: '秘境遗泽', effect: { attack: 0.2, defense: 0.2 }, minutes: 120 } } },
  { id: 'mistery_23', title: '远古丹方', tier: 3, difficulty: 3, type: '遗迹', text: '石室丹方失传已久，你拓印下来，又顺走些许药材。', reward: { material: { tier: 6, qty: 5 }, money: 5000 } },
  { id: 'mistery_24', title: '天骄比试', tier: 3, difficulty: 4, type: '试炼', text: '与一方天骄论道斗法，你险胜，赢得彩头与威名。', reward: { equip: { quality: 'orange', grade: 4 }, currency: 3 }, choices: [
    { label: '放手一搏', desc: '倾尽全力，强取彩头', difficulty: 5, fail: '天骄技高一筹，你铩羽而归', outcome: '你力压天骄，名动一方', reward: { equip: { quality: 'gold', grade: 4 }, currency: 4 } },
    { label: '点到即止', desc: '以和为贵，了却比试', difficulty: 3, fail: '天骄惜才，未尽全力', outcome: '你赢得彩头，结得一善缘', reward: { equip: { quality: 'orange', grade: 4 }, currency: 2 } }
  ] },
  { id: 'mistery_25', title: '拍卖夺宝', tier: 3, difficulty: 3, type: '坊市', text: '拍卖会上你力压群雄，拍得一件天地奇珍。', reward: { treasure: { tier: 6, qty: 1 } } },
  { id: 'mistery_26', title: '界域飞升', tier: 4, difficulty: 5, type: '传承', text: '你跨境飞升，天劫加身，历尽生死证得道基。', reward: { methodGrade: 7, stat: { attack: 200, defense: 150, health: 1000, lifespan: 20 } }, choices: [
    { label: '硬渡天劫', desc: '以肉身硬抗劫雷', difficulty: 5, req: { maxHealth: 120000 }, fail: '劫雷浩瀚，你险些陨落', outcome: '你渡劫功成，道基稳固', reward: { methodGrade: 8, stat: { attack: 260, defense: 200, health: 1400, lifespan: 30 } } },
    { label: '借宝渡劫', desc: '以法宝削弱劫威', difficulty: 4, fail: '法宝尽碎，你勉强渡过', outcome: '你稳渡天劫，心境更坚', reward: { methodGrade: 7, stat: { attack: 200, defense: 150, health: 1000, lifespan: 20 } } }
  ] },
  { id: 'mistery_27', title: '造化之河', tier: 4, difficulty: 4, type: '机缘', text: '造化之河翻涌，你淬体千百次，道体小成。', reward: { stat: { health: 1500, defense: 200 }, treasure: { tier: 7, qty: 1 } }, choices: [
    { label: '深入炼体', desc: '在河心炼体，风险极大', difficulty: 5, req: { maxHealth: 100000 }, fail: '造化反噬，你重伤而退', outcome: '你淬体大成，道体初成', reward: { stat: { health: 2200, defense: 300 }, treasure: { tier: 7, qty: 1 } } },
    { label: '岸边受益', desc: '于岸边沐浴造化', difficulty: 3, fail: '造化转瞬即逝，收获寥寥', outcome: '你浅得造化，气血清润', reward: { stat: { health: 1000, defense: 120 }, treasure: { tier: 6, qty: 1 } } }
  ] },
  { id: 'mistery_28', title: '仙府遗址', tier: 4, difficulty: 4, type: '遗迹', text: '陨落仙府禁制重重，你破阵而入，获太初紫气。', reward: { treasure: { tier: 7, qty: 1 }, currency: 5 }, choices: [
    { label: '强破禁制', desc: '硬闯仙府核心', difficulty: 5, fail: '禁制反噬，你狼狈撤出', outcome: '你破阵而入，直取太初紫气', reward: { treasure: { tier: 7, qty: 1 }, currency: 5 } },
    { label: '循门而入', desc: '寻得侧门，稳妥取宝', difficulty: 3, fail: '侧门有诈，你只得碎片', outcome: '你从侧门取走部分遗宝', reward: { treasure: { tier: 6, qty: 1 }, currency: 2 } }
  ] },
  { id: 'mistery_29', title: '鸿蒙机缘', tier: 5, difficulty: 5, type: '机缘', text: '鸿蒙之地一缕鸿蒙紫气认主，你踏入道途。', reward: { buff: { name: '鸿蒙紫气', effect: { cultivationSpeed: 0.5, attack: 0.4, defense: 0.4 }, minutes: 600 }, methodGrade: 9 } },
  { id: 'mistery_30', title: '大道之争', tier: 5, difficulty: 5, type: '试炼', text: '与界域之子争夺大道机缘，你胜出得道果半枚。', reward: { treasure: { tier: 9, qty: 1 }, stat: { cultivationSpeed: 0.15, attack: 300 } }, choices: [
    { label: '正面争道', desc: '与界域之子正面相抗', difficulty: 5, req: { attack: 150000 }, fail: '道劫加身，你败退下来', outcome: '你争得道果，得大道垂青', reward: { treasure: { tier: 10, qty: 1 }, stat: { cultivationSpeed: 0.18, attack: 400 } } },
    { label: '借势取道', desc: '引他人相争，渔翁得利', difficulty: 4, fail: '被识破算计，空手而归', outcome: '你坐收渔利，得半枚道果', reward: { treasure: { tier: 9, qty: 1 }, stat: { cultivationSpeed: 0.12, attack: 200 } } }
  ] },
  { id: 'mistery_31', title: '夜逢赶尸', tier: 0, difficulty: 1, type: '奇遇', text: '夜路逢赶尸人，问你讨一口烈酒，报以少许银钱。', reward: { money: 600 } },
  { id: 'mistery_32', title: '义庄惊魂', tier: 0, difficulty: 2, type: '遇险', text: '投宿义庄，夜半僵尸作祟，你斩之得镇尸符数张。', reward: { material: { tier: 2, qty: 5 } } },
  { id: 'mistery_33', title: '集市识宝', tier: 0, difficulty: 1, type: '坊市', text: '集市地摊一件旧物，你眼力过人，捡到灵材。', reward: { material: { tier: 3, qty: 3 } } },
  { id: 'mistery_34', title: '老翁问路', tier: 0, difficulty: 1, type: '机缘', text: '老翁问路，你引他归家，他赠你一张符。', reward: { material: { tier: 2, qty: 4 } } },
  { id: 'mistery_35', title: '山洪过境', tier: 0, difficulty: 2, type: '遇险', text: '山洪冲垮堤坝，你救人一命，受赠一枚妖丹。', reward: { treasure: { tier: 1, qty: 1 } }, choices: [
    { label: '奋不顾身', desc: '跳入激流救人', difficulty: 3, fail: '洪水湍急，你险些溺亡', outcome: '你救起一人，受赠妖丹', reward: { treasure: { tier: 1, qty: 1 } } },
    { label: '抛绳施救', desc: '以绳索搭救，稳妥为上', difficulty: 2, fail: '水流太急，人未能救起', outcome: '你救起落水者，得些许谢银', reward: { money: 1200 } }
  ] },
  { id: 'mistery_36', title: '枯木逢春', tier: 1, difficulty: 2, type: '机缘', text: '你将灵泉浇灌枯木，枯木竟生新芽结出灵果。', reward: { material: { tier: 4, qty: 4 } } },
  { id: 'mistery_37', title: '道观求签', tier: 1, difficulty: 1, type: '机缘', text: '道观上上签，老道替你醍醐灌顶，悟性大增。', reward: { stat: { cultivationSpeed: 0.04 } } },
  { id: 'mistery_38', title: '诡市交易', tier: 1, difficulty: 3, type: '坊市', text: '诡市暗流涌动，你以胆识换得一柄断剑。', reward: { equip: { quality: 'primary', grade: 3 } } },
  { id: 'mistery_39', title: '灵猴指路', tier: 1, difficulty: 2, type: '奇遇', text: '灵猴引你至幽谷，谷中有一株天材地宝。', reward: { treasure: { tier: 3, qty: 1 } } },
  { id: 'mistery_40', title: '石门机关', tier: 2, difficulty: 3, type: '遗迹', text: '石门机关重重，你巧解机关，得一把储物灵物。', reward: { equip: { quality: 'purple', grade: 3 }, money: 3000 }, choices: [
    { label: '强攻破门', desc: '以力硬破，速取宝去', difficulty: 4, fail: '机关爆发，你被乱箭逼退', outcome: '你破门而入，取走灵物', reward: { equip: { quality: 'warning', grade: 3 }, money: 3000 } },
    { label: '精巧解铃', desc: '循机关脉络，稳妥开启', difficulty: 3, fail: '迷雾难辨，你止步门外', outcome: '你巧解机关，得储物灵物', reward: { equip: { quality: 'purple', grade: 3 }, money: 2000 } }
  ] },
  { id: 'mistery_41', title: '心魔问心', tier: 2, difficulty: 4, type: '试炼', text: '心魔化形问你道心，你斩念而立，得一缕剑意。', reward: { stat: { attack: 120, critical: 0.008 }, currency: 1 } },
  { id: 'mistery_42', title: '蛟龙夺珠', tier: 2, difficulty: 4, type: '遇险', text: '蛟龙霸占灵潭，你九死一生抢出灵珠。', reward: { treasure: { tier: 4, qty: 1 } } },
  { id: 'mistery_43', title: '法会当头', tier: 2, difficulty: 2, type: '机缘', text: '宗门法会你悟性超群，得长老青眼，指点一二。', reward: { stat: { cultivationSpeed: 0.06 }, material: { tier: 4, qty: 5 } }, choices: [
    { label: '请教学问', desc: '趁热打铁，多聆教诲', difficulty: 3, fail: '长老避而不答，止于客套', outcome: '你得长老亲传，悟性大增', reward: { stat: { cultivationSpeed: 0.09 }, material: { tier: 4, qty: 6 } } },
    { label: '谢过即走', desc: '不贪不恋，自去修行', difficulty: 2, fail: '错失良机，未得真传', outcome: '你稳扎稳打，亦有小得', reward: { stat: { cultivationSpeed: 0.05 }, material: { tier: 4, qty: 5 } } }
  ] },
  { id: 'mistery_44', title: '城隍庙会', tier: 2, difficulty: 1, type: '坊市', text: '城隍庙会热闹非凡，你掷骰手气正旺，赢了一笔。', reward: { money: 5000 }, choices: [
    { label: '乘胜再赌', desc: '趁手气正旺连庄', difficulty: 3, fail: '手气转衰，连输回去', outcome: '你连赢数把，盆满钵满', reward: { money: 12000 } },
    { label: '见好就收', desc: '赢一笔便抽身而去', difficulty: 1, fail: '被人做局，分文未得', outcome: '你揣着赢来的银两离席', reward: { money: 5000 } }
  ] },
  { id: 'mistery_45', title: '古洞余威', tier: 3, difficulty: 4, type: '遗迹', text: '古洞残留大能余威，你硬撑而入，得一篇道纹。', reward: { methodGrade: 5, money: 6000 }, choices: [
    { label: '以身扛威', desc: '硬抗余威，直取道纹', difficulty: 5, req: { maxHealth: 80000 }, fail: '余威骇人，你重伤而退', outcome: '你扛住余威，夺走道纹', reward: { methodGrade: 6, money: 8000 } },
    { label: '借物抵挡', desc: '以法宝护身，缓入其中', difficulty: 3, fail: '法宝崩裂，道纹难全', outcome: '你护身而入，得半篇道纹', reward: { methodGrade: 5, money: 5000 } }
  ] },
  { id: 'mistery_46', title: '灵兽认主', tier: 3, difficulty: 3, type: '机缘', text: '受伤灵兽认你为主，托付一身灵骨。', reward: { treasure: { tier: 5, qty: 1 } }, choices: [
    { label: '结契收服', desc: '与灵兽缔结契约', difficulty: 3, fail: '灵兽伤势过重，未能救回', outcome: '灵兽认主，得一身灵骨', reward: { treasure: { tier: 5, qty: 1 } } },
    { label: '救而不取', desc: '只救其性命，不求回报', difficulty: 2, fail: '灵兽伤重而亡，空叹一场', outcome: '灵兽感念，留下一缕灵息', reward: { material: { tier: 6, qty: 5 }, stat: { health: 500 } } }
  ] },
  { id: 'mistery_47', title: '天骄夺擂', tier: 3, difficulty: 4, type: '试炼', text: '秘境夺擂，你连败强敌，夺得榜首奖励。', reward: { equip: { quality: 'danger', grade: 4 }, currency: 2 }, choices: [
    { label: '连战夺魁', desc: '一路战到榜首，名震秘境', difficulty: 5, fail: '强敌环伺，你止步三强', outcome: '你夺得魁首，获重赏', reward: { equip: { quality: 'orange', grade: 4 }, currency: 3 } },
    { label: '藏拙求稳', desc: '保存实力，见好就收', difficulty: 3, fail: '对手相让，你险胜过关', outcome: '你稳进前列，得一笔彩头', reward: { equip: { quality: 'danger', grade: 4 }, currency: 2 } }
  ] },
  { id: 'mistery_48', title: '黑市压价', tier: 3, difficulty: 3, type: '坊市', text: '黑市掌柜压低一口价，你据理力争，成交一件奇珍。', reward: { treasure: { tier: 5, qty: 1 }, money: 3000 } },
  { id: 'mistery_49', title: '断壁悟道', tier: 3, difficulty: 3, type: '机缘', text: '断壁残字蕴含道意，你坐参三日，修为精进。', reward: { stat: { cultivationSpeed: 0.08, attack: 80 } } },
  { id: 'mistery_50', title: '妖兽围城', tier: 4, difficulty: 5, type: '遇险', text: '妖兽围城，你镇守城头，战至功成，获授军功。', reward: { equip: { quality: 'gold', grade: 4 }, material: { tier: 6, qty: 8 } }, choices: [
    { label: '死守城头', desc: '以一己之力力挽狂澜', difficulty: 5, req: { defense: 180000 }, fail: '妖兽破城，你负伤突围', outcome: '你力挽狂澜，军功彪炳', reward: { equip: { quality: 'gold', grade: 4 }, material: { tier: 6, qty: 10 } } },
    { label: '率众击退', desc: '发动军民共御兽潮', difficulty: 4, fail: '兽潮过急，你勉强守住', outcome: '你击退兽潮，得厚赏', reward: { equip: { quality: 'gold', grade: 3 }, material: { tier: 6, qty: 6 } } }
  ] },
  { id: 'mistery_51', title: '古碑证道', tier: 4, difficulty: 5, type: '传承', text: '古碑记载大道，你以血肉之躯证道，得大道之意。', reward: { methodGrade: 7, stat: { attack: 150, defense: 120, lifespan: 15 } } },
  { id: 'mistery_52', title: '星河洗练', tier: 4, difficulty: 4, type: '机缘', text: '星河之力入体，你借机淬炼道体。', reward: { stat: { health: 1200 }, treasure: { tier: 6, qty: 1 } } },
  { id: 'mistery_53', title: '仙府遗宝', tier: 4, difficulty: 4, type: '遗迹', text: '陨落仙府禁制渐弱，你抢先一步取走遗宝。', reward: { equip: { quality: 'legendary', grade: 4 }, currency: 3 }, choices: [
    { label: '直取核心', desc: '直奔藏宝核心，速抢', difficulty: 5, req: { attack: 160000 }, fail: '禁制爆发，你重伤而退', outcome: '你夺走仙府至宝', reward: { equip: { quality: 'legendary', grade: 4 }, currency: 4 } },
    { label: '拾其边角', desc: '取外围遗物，稳中求安', difficulty: 3, fail: '他人先至，你只捡薄利', outcome: '你拾得几件遗物', reward: { equip: { quality: 'gold', grade: 3 }, currency: 2 } }
  ] },
  { id: 'mistery_54', title: '闭关突破', tier: 4, difficulty: 3, type: '机缘', text: '闭关参悟大道，你一朝顿悟，境界松动。', reward: { stat: { cultivationSpeed: 0.1 } } },
  { id: 'mistery_55', title: '齐天之会', tier: 5, difficulty: 5, type: '试炼', text: '界域天骄齐聚，你力压群雄，争得成道之基。', reward: { methodGrade: 9, treasure: { tier: 9, qty: 1 } }, choices: [
    { label: '一路横扫', desc: '胜负一路战到底', difficulty: 5, req: { attack: 220000 }, fail: '天骄逞凶，你止步半途', outcome: '你力压群雄，成道在望', reward: { methodGrade: 9, treasure: { tier: 9, qty: 1 } } },
    { label: '深藏不露', desc: '保留底牌，智取机缘', difficulty: 4, fail: '被识破用意，空手而归', outcome: '你以巧取胜，得成道之基', reward: { methodGrade: 8, treasure: { tier: 8, qty: 1 } } }
  ] },
  { id: 'mistery_56', title: '太初之种', tier: 5, difficulty: 5, type: '传承', text: '你亲眼见证太初之种萌发，获一缕创世之力。', reward: { buff: { name: '太初之种', effect: { cultivationSpeed: 0.4, attack: 0.3, defense: 0.3 }, minutes: 300 }, currency: 6 } },
  { id: 'mistery_57', title: '归墟残响', tier: 5, difficulty: 5, type: '遗迹', text: '归墟残响萦绕，你于混沌中觅得一物。', reward: { treasure: { tier: 10, qty: 1 }, stat: { lifespan: 30 } }, choices: [
    { label: '深入归墟', desc: '入混沌核心，觅造化', difficulty: 5, req: { attack: 200000 }, fail: '归墟吞噬而来，你险死还生', outcome: '你自混沌中取出一宝', reward: { treasure: { tier: 10, qty: 1 }, stat: { lifespan: 40 } } },
    { label: '外围拾遗', desc: '只在边缘徘徊', difficulty: 3, fail: '残响摄魂，你匆忙退出', outcome: '你捡得一块虚空残片', reward: { treasure: { tier: 8, qty: 1 }, stat: { lifespan: 15 } } }
  ] },
  { id: 'mistery_58', title: '老者磨剑', tier: 1, difficulty: 2, type: '奇遇', text: '磨剑老者见你根骨不凡，传你一招剑诀。', reward: { stat: { attack: 60 }, material: { tier: 3, qty: 3 } } },
  { id: 'mistery_59', title: '雨夜留宿', tier: 1, difficulty: 1, type: '机缘', text: '雨夜借宿猎户家中，他见你有缘，赠你兽皮一张。', reward: { material: { tier: 2, qty: 6 } } },
  { id: 'mistery_60', title: '商船遭劫', tier: 2, difficulty: 3, type: '遇险', text: '商船遭黑风寨劫掠，你出手平乱，分得一份货。', reward: { money: 7000, material: { tier: 4, qty: 4 } }, choices: [
    { label: '出手平乱', desc: '拔刀相助，击退匪徒', difficulty: 4, fail: '匪徒势众，你负伤而退', outcome: '你击退黑风寨，商船重谢', reward: { money: 12000, material: { tier: 4, qty: 6 } } },
    { label: '静观其变', desc: '不触霉头，任其掠劫', difficulty: 1, fail: '匪徒顺手劫了你一份', outcome: '你混在人群中，没分到好处', reward: { material: { tier: 3, qty: 3 } } }
  ] },
  { id: 'mistery_61', title: '书生论道', tier: 2, difficulty: 2, type: '机缘', text: '落第书生与你论道，言辞犀利，令你茅塞顿开。', reward: { stat: { cultivationSpeed: 0.05 } } },
  { id: 'mistery_62', title: '枯井藏宝', tier: 2, difficulty: 3, type: '遗迹', text: '荒村枯井下别有洞天，你探得一件古器。', reward: { equip: { quality: 'warning', grade: 3 } } },
  { id: 'mistery_63', title: '茶楼听书', tier: 2, difficulty: 1, type: '坊市', text: '茶楼说书人讲古，你听出弦外之音，顺走一句功法要点。', reward: { material: { tier: 3, qty: 5 } }, choices: [
    { label: '追问细节', desc: '丢银请说书人细讲', difficulty: 2, fail: '说书人言尽于此，不再多言', outcome: '你多听出一段功法口决', reward: { material: { tier: 3, qty: 6 }, stat: { cultivationSpeed: 0.03 } } },
    { label: '打赏走人', desc: '舍些银两，体面离开', difficulty: 1, fail: '打赏不值，一无所获', outcome: '你记下那句功法要点', reward: { material: { tier: 3, qty: 5 } } }
  ] },
  { id: 'mistery_64', title: '画舫雅集', tier: 3, difficulty: 2, type: '机缘', text: '画舫雅集，才子佳人斗诗，你以诗会友，获赠珠玉。', reward: { money: 8000, material: { tier: 5, qty: 4 } } },
  { id: 'mistery_65', title: '古寺钟声', tier: 3, difficulty: 3, type: '机缘', text: '古寺钟声涤荡凡尘，你入定一日，道心愈发澄澈。', reward: { stat: { cultivationSpeed: 0.07, dodge: 0.006 } } },
  { id: 'mistery_66', title: '拍卖失主', tier: 3, difficulty: 3, type: '坊市', text: '拍卖会一件流拍的宝物，你以低了三分之二的价捡漏。', reward: { treasure: { tier: 5, qty: 1 } } },
  { id: 'mistery_67', title: '断崖横渡', tier: 4, difficulty: 5, type: '试炼', text: '断崖万丈，孤人独桥，你以道心渡之，得大机缘。', reward: { methodGrade: 8, stat: { attack: 200, defense: 150 } }, choices: [
    { label: '御风渡崖', desc: '以一身轻功硬渡万丈', difficulty: 5, req: { dodge: 0.06 }, fail: '罡风猎猎，你坠崖一瞬险死', outcome: '你渡崖成功，得大机缘', reward: { methodGrade: 8, stat: { attack: 250, defense: 180 } } },
    { label: '攀藤而下', desc: '沿崖壁攀援，步步为营', difficulty: 4, fail: '藤蔓断裂，你狼狈撤回', outcome: '你缓渡断崖，得半途机缘', reward: { methodGrade: 7, stat: { attack: 150, defense: 120 } } }
  ] },
  { id: 'mistery_68', title: '万道共鸣', tier: 4, difficulty: 4, type: '机缘', text: '你于万道之中觅得共鸣，修为大进。', reward: { stat: { cultivationSpeed: 0.12 }, treasure: { tier: 6, qty: 1 } } },
  { id: 'mistery_69', title: '真龙之血', tier: 4, difficulty: 5, type: '遇险', text: '真龙陨落之地，你以血肉之躯承接龙血洗礼。', reward: { stat: { attack: 180, health: 1500, defense: 120 } } },
  { id: 'mistery_70', title: '道台论法', tier: 5, difficulty: 5, type: '试炼', text: '道台之上万修论法，你口若悬河，折服众生。', reward: { buff: { name: '道台之光', effect: { cultivationSpeed: 0.3, attack: 0.2 }, minutes: 200 }, currency: 4 } },
  { id: 'mistery_71', title: '猎户报恩', tier: 0, difficulty: 1, type: '奇遇', text: '你救下的猎户报恩，送来山中野味与些许药材。', reward: { material: { tier: 1, qty: 5 } } },
  { id: 'mistery_72', title: '流水桃花', tier: 0, difficulty: 1, type: '机缘', text: '溪畔桃花成阵，你误入桃林，拾得一枚灵果。', reward: { material: { tier: 2, qty: 4 } } },
  { id: 'mistery_73', title: '乡绅赠银', tier: 0, difficulty: 1, type: '坊市', text: '乡绅见你英武，慷慨赠银结善缘。', reward: { money: 900 } },
  { id: 'mistery_74', title: '荒庙夜雨', tier: 0, difficulty: 2, type: '遇险', text: '荒庙避雨，忽有邪祟夜袭，你斩之得辟邪符。', reward: { material: { tier: 2, qty: 6 } } },
  { id: 'mistery_75', title: '樵夫指路', tier: 0, difficulty: 1, type: '机缘', text: '樵夫指引一条隐秘山路，尽头竟有灵泉。', reward: { material: { tier: 3, qty: 3 } } },
  { id: 'mistery_76', title: '石矶道场', tier: 1, difficulty: 2, type: '传承', text: '石矶道场残存感悟，你坐悟得一段功法口诀。', reward: { stat: { cultivationSpeed: 0.05 }, material: { tier: 3, qty: 4 } } },
  { id: 'mistery_77', title: '赌坊一掷', tier: 1, difficulty: 2, type: '坊市', text: '赌坊豪掷一注，你手气正盛，赢回翻倍灵石。', reward: { money: 4000 } },
  { id: 'mistery_78', title: '花妖幻境', tier: 1, difficulty: 3, type: '遇险', text: '误入花妖幻境，你破幻而出，顺走花妖精魄。', reward: { treasure: { tier: 2, qty: 1 } } },
  { id: 'mistery_79', title: '同心玉简', tier: 1, difficulty: 2, type: '机缘', text: '一对双修眷侣赠你同心玉简，你参悟得一丝心境。', reward: { stat: { cultivationSpeed: 0.04, dodge: 0.005 } } },
  { id: 'mistery_80', title: '灵植园圃', tier: 2, difficulty: 2, type: '机缘', text: '灵植园圃主人请你帮忙照料，赠你一株灵植。', reward: { material: { tier: 4, qty: 5 } } },
  { id: 'mistery_81', title: '古地宫谜', tier: 2, difficulty: 4, type: '遗迹', text: '古地宫机关杀机四伏，你以命相搏取出一件宝。', reward: { equip: { quality: 'cyan', grade: 3 }, money: 5000 } },
  { id: 'mistery_82', title: '万魔窟口', tier: 2, difficulty: 4, type: '遇险', text: '万魔窟口煞气森然，你凝丹抵御，得魔晶数枚。', reward: { material: { tier: 5, qty: 4 }, currency: 1 }, choices: [
    { label: '深入夺晶', desc: '顶煞气直取魔晶', difficulty: 5, req: { attack: 120000 }, fail: '煞气入体，你狼狈退出', outcome: '你得一批魔晶与魔珠', reward: { material: { tier: 6, qty: 5 }, currency: 2 } },
    { label: '边缘采集', desc: '只在口边采些魔草', difficulty: 3, fail: '魔卫察觉，你仓皇而走', outcome: '你采得数枚魔晶', reward: { material: { tier: 5, qty: 4 }, currency: 1 } }
  ] },
  { id: 'mistery_83', title: '鹤发童颜', tier: 3, difficulty: 3, type: '机缘', text: '鹤发童颜的隐世高人见你，指你一条成道捷径。', reward: { stat: { cultivationSpeed: 0.08, attack: 100 } } },
  { id: 'mistery_84', title: '天降横财', tier: 3, difficulty: 3, type: '坊市', text: '你于荒郊救下一宝车主人，他赠你一份大礼。', reward: { money: 12000, material: { tier: 5, qty: 6 } } },
  { id: 'mistery_85', title: '阴魂索命', tier: 3, difficulty: 4, type: '遇险', text: '阴魂索命，你以血符相抗，反夺其魂珠。', reward: { treasure: { tier: 5, qty: 1 }, stat: { dodge: 0.008 } } },
  { id: 'mistery_86', title: '剑冢铸兵', tier: 4, difficulty: 5, type: '遗迹', text: '剑冢万剑齐鸣，你以血饲剑，夺得绝世剑胚。', reward: { equip: { quality: 'orange', grade: 5 } } },
  { id: 'mistery_87', title: '百战之躯', tier: 4, difficulty: 5, type: '试炼', text: '百战试炼场你连闯百关，肉身再度淬炼。', reward: { stat: { health: 1800, defense: 200, attack: 150 } } },
  { id: 'mistery_88', title: '仙人指路', tier: 4, difficulty: 4, type: '机缘', text: '仙人一枚落叶为你指路，你循之得一天材地宝。', reward: { treasure: { tier: 6, qty: 1 } } },
  { id: 'mistery_89', title: '魔道夺舍', tier: 4, difficulty: 5, type: '遇险', text: '魔道残魂欲夺舍于你，你反吞其魂，修为暴涨。', reward: { stat: { attack: 250, cultivationSpeed: 0.12 }, currency: 4 } },
  { id: 'mistery_90', title: '虚空裂隙', tier: 5, difficulty: 5, type: '遗迹', text: '虚空裂隙中飘出一缕太初之气，你冒险收取。', reward: { buff: { name: '太初之气', effect: { attack: 0.35, defense: 0.35, cultivationSpeed: 0.35 }, minutes: 400 }, currency: 5 } },
  { id: 'mistery_91', title: '道树参悟', tier: 5, difficulty: 5, type: '传承', text: '道树之下你入定千年之感，一朝醒来道心通明。', reward: { methodGrade: 9, stat: { cultivationSpeed: 0.12 } } },
  { id: 'mistery_92', title: '造化一指', tier: 5, difficulty: 5, type: '机缘', text: '造化大能一指点化，你瞬间洞悉大道玄机。', reward: { buff: { name: '造化一指', effect: { cultivationSpeed: 0.5, precision: 0.0 }, minutes: 300 }, treasure: { tier: 10, qty: 1 } } },
  { id: 'mistery_93', title: '天机窥测', tier: 1, difficulty: 2, type: '机缘', text: '天机阁主见你命格不凡，破例向你透露一丝天机。', reward: { stat: { cultivationSpeed: 0.04, critical: 0.005 } }, choices: [
    { label: '问修行捷径', desc: '求取修炼速成之道', difficulty: 2, fail: '天机晦涩，你未解其意', outcome: '你得一句修行要害', reward: { stat: { cultivationSpeed: 0.06 } } },
    { label: '问命途吉凶', desc: '探寻自身劫难与机缘', difficulty: 3, fail: '天机反噬，你心绪不宁', outcome: '你窥得一丝命数，心境通明', reward: { stat: { critical: 0.007, dodge: 0.005 } } }
  ] },
  { id: 'mistery_94', title: '山贼入伙', tier: 1, difficulty: 2, type: '遇险', text: '山贼强拉你入伙，你将计就计，抄了寨子分赃。', reward: { money: 6000, material: { tier: 3, qty: 4 } } },
  { id: 'mistery_95', title: '擂鼓台', tier: 2, difficulty: 3, type: '试炼', text: '擂鼓台擂主守擂，你上去一战技惊四座。', reward: { equip: { quality: 'warning', grade: 4 }, money: 4000 } },
  { id: 'mistery_96', title: '金蝉脱壳', tier: 2, difficulty: 3, type: '奇遇', text: '你助一小孩脱险，他爹爹竟是遁术大家，传你身法。', reward: { stat: { dodge: 0.008, critical: 0.005 } } },
  { id: 'mistery_97', title: '寒潭淬骨', tier: 3, difficulty: 4, type: '试炼', text: '寒潭淬骨冰寒刺骨，你咬牙撑过，骨骼铮铮。', reward: { stat: { health: 900, defense: 120 }, treasure: { tier: 5, qty: 1 } } },
  { id: 'mistery_98', title: '丹心一片', tier: 3, difficulty: 3, type: '机缘', text: '你为素不相识者炼丹救命，其人回赠一门丹方。', reward: { material: { tier: 6, qty: 5 }, stat: { cultivationSpeed: 0.06 } } },
  { id: 'mistery_99', title: '龙潭取水', tier: 4, difficulty: 4, type: '遇险', text: '龙潭妖龙盘踞，你潜入取水，被人发觉死里逃生。', reward: { treasure: { tier: 6, qty: 1 }, stat: { attack: 120 } } },
  { id: 'mistery_100', title: '终极一问', tier: 5, difficulty: 5, type: '传承', text: '神秘强者问你“何谓道”，你答出惊天一语，得传无上法。', reward: { methodGrade: 10, buff: { name: '无上法', effect: { cultivationSpeed: 0.5, attack: 0.5 }, minutes: 600 } } }
]

export const storyCount = STORY_EVENTS.length
