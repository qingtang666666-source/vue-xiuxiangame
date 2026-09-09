import { defineStore } from 'pinia'
import { rollInsight } from './insight.js'

export const useMainStore = defineStore('main', {
  state: () => ({
    // boss属性
    boss: {
      name: '',
      text: '',
      time: 0,
      desc: '',
      level: 0,
      dodge: 0,
      attack: 0,
      health: 0,
      conquer: false,
      defense: 0,
      critical: 0,
      maxhealth: 0
    },
    // 玩家属性
    player: {
      zc: false,
      age: 6 + Math.floor(Math.random() * 7),
      ageBase: 6 + Math.floor(Math.random() * 7),
      insight: rollInsight(),
      timeDays: 0,
      timeAnchor: null,
      lifespanBonus: 0,
      nameChanged: false,
      rebirthMode: 'fresh',
      autoIdle: {
        explore: false,
        realm: false,
        quest: false,
        breakthrough: false
      },
      lastAdventure: null,
      travelingMerchant: { cycle: -1, stock: [], show: false },
      travSeen: {},
      blindBoxPity: 0,
      birthFamily: 0,
      birthFamilySeen: [],
      quests: {
        claimedFixed: [],
        selected: []
      },
      questState: {
        xp: 0,
        streak: 0,
        lastDay: ''
      },
      adventureTimes: 0,
      realmTimes: 0,
      exploreWins: 0,
      bossKills: 0,
      craftCount: 0,
      pet: {},
      time: 0,
      name: '玩家',
      dark: false,
      npcs: [],
      wife: {},
      pets: [],
      wifes: [],
      props: {
        money: 0,
        daoFruit: 0,
        chips: 0,
        flying: 0,
        qingyuan: 0,
        rootBone: 0,
        currency: 0,
        cultivateDan: 0,
        spiritHerb: 0,
        zhuSha: 0,
        zhenQi: 0,
        xuanTie: 0,
        yaoDan: 0,
        strengtheningStone: 0
      },
      score: 0,
      pointAlloc: { attack: 0, defense: 0, health: 0 },
      manor: {},
      level: 0,
      dodge: 0,
      points: 0,
      daoPoints: 0,
      daoShop: {},
      cultivationSpeed: 1,
      pills: [],
      talismans: [],
      gamblePity: 0,
      buffs: [],
      formations: {},
      worldNpcs: [],
      worldNpcsReincarnation: -1,
      aptitude: null,
      aptitudeReincarnation: -1,
      sect: {
        reincarnation: -1
      },
      skills: {
        alchemy: 0,
        forge: 0,
        talisman: 0,
        formation: 0
      },
      techniques: 0,
      alchemy: {
        moneyMult: 1,
        offlineMult: 1
      },
      talents: [],
      methods: {},
      mainMethod: null,
      techTask: null,
      learnFails: {},
      actionTimer: null,
      techniqueScrolls: [],
      techniqueSet: { active: [], passive: [] },
      passedTribulation: [],
      stageFails: {},
      btCdUntil: 0,
      tribulationCdUntil: 0,
      heroRank: 301,
      heroClaimDate: '',
      realm: {
        stage: 0
      },
      guild: {
        date: '',
        orders: [],
        points: 0
      },
      treasures: {},
      attack: 5,
      health: 50,
      critical: 0,
      defense: 5,
      taskNum: 0,
      version: 0.9,
      lastOnlineTime: null,
      lastSaveAt: null,
      currency: 0,
      maxHealth: 50,
      inventory: [],
      isNewbie: false,
      shopData: [],
      equipment: {
        sutra: {},
        armor: {},
        weapon: {},
        accessory: {}
      },
      achievement: {
        pet: [],
        monster: [],
        equipment: [],
        cultivation: [],
        talent: [],
        birth: [],
        life: [],
        craft: []
      },
      script: '',
      cultivation: 0,
      currentTitle: null,
      reincarnation: 0,
      maxCultivation: 100,
      backpackCapacity: 1000,
      sellingEquipmentData: [],
      highestTowerFloor: 1,
      rewardedTowerFloors: [],
      nextGameTimes: {
        rps: null,
        dice: null,
        fortune: null,
        secretrealm: 0,
        gamblingStone: null
      },
      gameWins: 0,
      gameLosses: 0,
      checkinDays: 0,
      checkinStreak: 0,
      lastCheckinDate: null,
      fortuneTellingDate: null,
      checkedInToday: false
    },
    // 怪物信息
    monster: {
      name: '',
      // 气血
      health: 0,
      // 攻击
      attack: 0,
      // 防御
      defense: 0,
      // 闪避率
      dodge: 0,
      // 暴击
      critical: 0
    },
    mapData: {
      y: 0,
      x: 0,
      map: []
    },
    mapScroll: 0,
    fishingMap: []
  })
})
