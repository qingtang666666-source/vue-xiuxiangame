const achievement = {
  // 所有成就
  all() {
    return [
      {
        name: '灵宠成就',
        type: 'pet',
        data: this.pet()
      },
      {
        name: '探索成就',
        type: 'monster',
        data: this.monster()
      },
      {
        name: '装备成就',
        type: 'equipment',
        data: this.equipment()
      },
      {
        name: '修炼成就',
        type: 'cultivation',
        data: this.cultivation()
      },
      {
        name: '天赋成就',
        type: 'talent',
        data: this.talent()
      },
      {
        name: '出生成就',
        type: 'birth',
        data: this.birth()
      },
      {
        name: '机缘成就',
        type: 'life',
        data: this.life()
      },
      {
        name: '技艺成就',
        type: 'craft',
        data: this.craft()
      }
    ]
  },
  // 悟性 / 技艺阶位 / 功法熟练度 / 天材地宝收藏
  craft() {
    return [
      { id: 80, name: '灵性不凡', desc: '悟性达 15 档', award: 3000, perk: { cultivationSpeed: 0.1 }, condition: { insight: 15 } },
      { id: 81, name: '天纵之资', desc: '悟性达 20 档', award: 6000, perk: { attack: 200, critical: 0.02 }, condition: { insight: 20 } },
      { id: 82, name: '丹道有成', desc: '炼丹师达 5 阶', award: 3000, perk: { health: 500 }, condition: { alchemy: 5 } },
      { id: 83, name: '器道宗师', desc: '炼器师达 8 阶', award: 5000, perk: { defense: 200, attack: 100 }, condition: { forge: 8 } },
      { id: 84, name: '四艺登峰', desc: '任一技艺达 11 阶', award: 10000, perk: { attack: 300, defense: 200, health: 1000 }, condition: { anyCraft11: 1 } },
      { id: 85, name: '功法化劲', desc: '任一功法熟练度达化劲', award: 8000, perk: { cultivationSpeed: 0.3 }, condition: { profMaster: 1 } },
      { id: 86, name: '灵材集萃', desc: '收集 30 种天材地宝', award: 5000, perk: { moneyMult: 0.1 }, condition: { treasures: 30 } },
      { id: 87, name: '藏品阁主', desc: '收集 45 种天材地宝', award: 3000, rarity: 'epic', perk: { daoPoints: 30, currency: 4 }, condition: { treasures: 45 } },
      { id: 88, name: '万象归一', desc: '收集 55 种天材地宝', award: 5000, rarity: 'legend', perk: { daoMark: 2, lifespanBonus: 30 }, condition: { treasures: 55 } }
    ]
  },
  // 奇遇/秘境/轮回/界域相关成就
  life() {
    return [
      { id: 70, name: '初入奇遇', desc: '触发 1 次奇遇', award: 1000, perk: { health: 200 }, condition: { adventure: 1 } },
      { id: 71, name: '缘深似海', desc: '触发 50 次奇遇', award: 4000, perk: { critical: 0.03 }, condition: { adventure: 50 } },
      { id: 72, name: '秘境行者', desc: '探索 5 次秘境', award: 2000, perk: { attack: 100 }, condition: { realmTimes: 5 } },
      { id: 73, name: '万界一游', desc: '探索 30 次秘境', award: 6000, perk: { defense: 300, health: 1000 }, condition: { realmTimes: 30 } },
      { id: 74, name: '轮回不息', desc: '经历 3 世轮回', award: 3000, perk: { cultivationSpeed: 0.1 }, condition: { reincarnation: 3 } },
      { id: 75, name: '飞升灵界', desc: '界域飞升至灵界', award: 5000, perk: { attack: 200 }, condition: { realmStage: 1 } },
      { id: 76, name: '证道神界', desc: '界域飞升至神界', award: 10000, perk: { attack: 500, defense: 300, health: 2000 }, condition: { realmStage: 3 } },
      { id: 77, name: '轮回千载', desc: '经历 10 世轮回', award: 3000, rarity: 'epic', perk: { daoMark: 1, currency: 7 }, condition: { reincarnation: 10 } },
      { id: 78, name: '界域主宰', desc: '界域飞升至仙界(≥5)', award: 6000, rarity: 'legend', perk: { daoPoints: 50, lifespanBonus: 50 }, condition: { realmStage: 5 } },
      { id: 90, name: '屠龙勇士', desc: '击败 10 只世界Boss', award: 4000, perk: { attack: 300, defense: 200 }, condition: { bossKills: 10 } },
      { id: 91, name: '万妖克星', desc: '击败 30 只世界Boss', award: 8000, rarity: 'epic', perk: { health: 1500, critical: 0.03 }, condition: { bossKills: 30 } }
    ]
  },
  // 出生家庭相关成就
  birth() {
    return [
      { id: 60, name: '世家底蕴', desc: '出生家境 ≥ 7', award: 2000, perk: { moneyMult: 0.05 }, condition: { maxFamily: 7 } },
      { id: 61, name: '天之骄子', desc: '出生家境 ≥ 9', award: 4000, perk: { attack: 200, defense: 120 }, condition: { maxFamily: 9 } },
      { id: 62, name: '仙家血裔', desc: '出身仙家血裔(10)', award: 8000, perk: { cultivationSpeed: 0.2 }, condition: { maxFamily: 10 } },
      { id: 63, name: '寒门出贵子', desc: '寒门出身(≤3)且境界达渡劫(73级)', award: 6000, perk: { health: 2000, critical: 0.03 }, condition: { lowFamily: 1, level: 73 } },
      { id: 64, name: '历劫轮回', desc: '经历 3 次轮回', award: 3000, perk: { dodge: 0.02 }, condition: { reincarnation: 3 } }
    ]
  },
  // 灵宠相关成就
  pet() {
    return [
      {
        // 成就ID
        id: 1,
        // 成就名称
        name: '气血神宠',
        // 成就奖励
        award: 1000,
        //佩戴奖励
        titleBonus: {
          health: 5000
        },
        //达成条件
        condition: {
          dodge: 0,
          health: 23500,
          attack: 0,
          defense: 0,
          critical: 0
        }
      },
      {
        id: 2,
        name: '攻击神宠',
        award: 1000,
        titleBonus: {
          attack: 1000
        },
        condition: {
          dodge: 0,
          health: 0,
          attack: 7050,
          defense: 0,
          critical: 0
        }
      },
      {
        id: 3,
        name: '防御神宠',
        award: 1000,
        titleBonus: {
          defense: 100
        },
        condition: {
          dodge: 0,
          health: 0,
          attack: 0,
          defense: 705,
          critical: 0
        }
      },
      {
        id: 4,
        name: '闪避神宠',
        award: 1000,
        titleBonus: {
          dodge: 0.1
        },
        condition: {
          dodge: 0.47,
          health: 0,
          attack: 0,
          defense: 0,
          critical: 0
        }
      },
      {
        id: 5,
        name: '暴击神宠',
        award: 1000,
        titleBonus: {
          critical: 0.1
        },
        condition: {
          dodge: 0,
          health: 0,
          attack: 0,
          defense: 0,
          critical: 0.47
        }
      },
      {
        id: 6,
        name: '灵宠天花板',
        titleBonus: {
          attack: 2500
        },
        award: 10000,
        condition: {
          dodge: 0.47,
          health: 23500,
          attack: 7050,
          defense: 705,
          critical: 0.47
        }
      }
    ]
  },
  // 装备相关成就
  equipment() {
    return []
  },
  // 修炼成就：按境界等级(level)门槛，达成给永久加成 perk
  cultivation() {
    return [
      { id: 20, name: '初入修炼', desc: '境界达到炼气期', award: 500, perk: { attack: 20 }, condition: { level: 1 } },
      { id: 21, name: '炼气大成', desc: '境界达到炼气九层', award: 800, perk: { health: 200 }, condition: { level: 9 } },
      { id: 22, name: '筑基成功', desc: '境界达到筑基期', award: 1000, perk: { defense: 30 }, condition: { level: 10 } },
      { id: 23, name: '金丹大道', desc: '境界达到金丹期', award: 1500, perk: { attack: 60 }, condition: { level: 19 } },
      { id: 24, name: '元婴出窍', desc: '境界达到元婴期', award: 2000, perk: { health: 500 }, condition: { level: 28 } },
      { id: 25, name: '化神境', desc: '境界达到化神期', award: 2500, perk: { critical: 0.02 }, condition: { level: 37 } },
      { id: 26, name: '炼虚境', desc: '境界达到炼虚期', award: 3000, perk: { attack: 120 }, condition: { level: 46 } },
      { id: 27, name: '合体境', desc: '境界达到合体期', award: 3500, perk: { defense: 100 }, condition: { level: 55 } },
      { id: 28, name: '大乘境', desc: '境界达到大乘期', award: 4000, perk: { health: 1200 }, condition: { level: 64 } },
      { id: 29, name: '渡劫飞升', desc: '境界达到渡劫期', award: 5000, perk: { dodge: 0.02 }, condition: { level: 73 } },
      { id: 30, name: '真仙之姿', desc: '境界达到真仙境', award: 6000, perk: { attack: 250 }, condition: { level: 82 } },
      { id: 31, name: '玄仙境', desc: '境界达到玄仙境', award: 7000, perk: { health: 2500 }, condition: { level: 91 } },
      { id: 32, name: '金仙境', desc: '境界达到金仙境', award: 8000, perk: { critical: 0.05 }, condition: { level: 100 } },
      { id: 33, name: '大罗金仙', desc: '境界达到大罗金仙境', award: 10000, perk: { attack: 500, defense: 300 }, condition: { level: 109 } },
      { id: 34, name: '太乙境', desc: '境界达到太乙境', award: 12000, perk: { health: 5000 }, condition: { level: 118 } },
      { id: 35, name: '混元境', desc: '境界达到混元境', award: 15000, perk: { dodge: 0.05, critical: 0.05 }, condition: { level: 127 } },
      { id: 36, name: '证道道祖', desc: '境界达到道祖境', award: 20000, perk: { attack: 1000, defense: 800, health: 10000 }, condition: { level: 144 } },
      { id: 37, name: '转世重修', desc: '经历一次转世', award: 3000, perk: { cultivationSpeed: 0.1 }, condition: { reincarnation: 1 } }
    ]
  },
  // 天赋成就：按天赋收藏(品质/数量)达成，给永久加成 perk
  talent() {
    return [
      { id: 40, name: '初悟机缘', desc: '获得任意一个天赋', award: 500, perk: { health: 100 }, condition: { talentCount: 1 } },
      { id: 41, name: '机缘不断', desc: '获得 5 个天赋', award: 1000, perk: { attack: 50 }, condition: { talentCount: 5 } },
      { id: 42, name: '天赋异禀', desc: '获得 10 个天赋', award: 2000, perk: { cultivationSpeed: 0.1 }, condition: { talentCount: 10 } },
      { id: 43, name: '上品之姿', desc: '拥有 1 个上品及以上天赋', award: 2000, perk: { critical: 0.02 }, condition: { rarePlus: 1 } },
      { id: 44, name: '极品天骄', desc: '拥有 3 个上品及以上天赋', award: 4000, perk: { attack: 200 }, condition: { rarePlus: 3 } },
      { id: 45, name: '神品出世', desc: '获得任意一个神品天赋', award: 8000, perk: { health: 5000, dodge: 0.03 }, condition: { legendary: 1 } }
    ]
  },
  // 打怪相关成就
  monster() {
    return [
      {
        id: 7,
        name: '挑战者',
        desc: '通关无尽塔100层',
        titleBonus: {
          critical: 0.05
        },
        award: 10000,
        condition: {
          highestTowerFloor: 100
        }
      },
      {
        id: 8,
        name: '征服者',
        desc: '通关无尽塔1000层',
        titleBonus: {
          critical: 0.1
        },
        award: 10000,
        condition: {
          highestTowerFloor: 1000
        }
      },
      {
        id: 8,
        name: '长生者',
        desc: '寿元达到1000岁',
        titleBonus: {
          health: 10000
        },
        award: 10000,
        condition: {
          age: 1000
        }
      },
      {
        id: 9,
        name: '幸运之星',
        desc: '小游戏胜利超过10次',
        titleBonus: {
          defense: 0.01
        },
        award: 10000,
        condition: {
          gameWins: 10
        }
      },
      {
        id: 10,
        name: '天选之子',
        desc: '小游戏胜利超过100次',
        titleBonus: {
          defense: 0.1
        },
        award: 10000,
        condition: {
          gameWins: 100
        }
      }
    ]
  }
}
export default achievement
