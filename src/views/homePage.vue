<template>
  <div class="index">
    <div class="money-banner"><MoneyBar compact /></div>
    <div class="left-fabs">
      <div class="left-fab" @click="heroShow = true">⚔️ 豪杰</div>
      <div class="left-fab" @click="equipAllShow = true">📖 图鉴</div>
      <div class="left-fab" @click="sellingEquipmentBox">🗂️ 批量</div>
      <div class="left-fab" @click="seasonShow = true">🏆 赛季</div>
      <div class="left-fab" @click="wbShow = true">🌍 世界</div>
      <div class="left-fab" @click="techniqueShow = true">📜 功法</div>
      <div class="left-fab" @click="show = true">⚙️ 设置</div>
    </div>
    <div class="index-box">
      <div class="guide-banner" :class="{ urgent: guide.urgent }" @click="doGuide">
        📌 下一步 · 【{{ guide.title }}】 {{ guide.desc }}
      </div>
      <div v-if="!player.isNewbie" class="newbie-cta" @click="newbiePack()">
        🎁 新手大礼包未领取 · 点击去开包
      </div>
      <div class="story">
        <p v-html="storyText" />
      </div>
      <div class="attributes">
        <div class="attribute-box">
          <div class="tag attribute attr-name" @click="editUserName">
            名字: {{ player.name }}
            <el-text v-if="player.currentTitle" type="danger">[{{ player.currentTitle }}]</el-text>
            <el-icon>
              <EditPen />
            </el-icon>
          </div>
          <div class="tag attribute attr-calendar">修仙历: {{ calendar.year }}年{{ calendar.month }}月{{ calendar.day }}日</div>
          <div class="tag attribute attr-age" :class="{ warn: remaining <= 10 }">岁数: {{ player.age }} / 寿元 {{ lifespan }} 年（剩 {{ remaining }} 年）</div>
          <div class="tag attribute attr-birth">出生: {{ familyName }}（{{ player.birthFamily || 1 }}/10）</div>
          <div class="tag attribute attr-clan">已见世家: {{ familySeen || '寒门起步' }}</div>
          <div class="tag attribute attr-fate" v-if="fateData.fate || fateData.world || player.daoMark">
            命运: {{ fateData.fate ? fateData.fate.name : '无' }}
            <span v-if="fateData.world"> · 天道: {{ fateData.world.name }}</span>
            <span v-if="player.daoMark"> · 道痕 {{ player.daoMark }}</span>
          </div>
          <div class="tag attribute attr-codex" v-if="codexStat.total">
            图鉴: {{ Math.floor(codexStat.percent * 100) }}% · 修为+{{ (codexStat.percent * 10).toFixed(1) }}% 灵石+{{ (codexStat.percent * 5).toFixed(1) }}%
            <el-icon> <Trophy /> </el-icon>
          </div>
          <div class="tag attribute attr-collect" v-if="collectSet.name">
            套藏: {{ collectSet.name }}
            <el-icon> <Medal /> </el-icon>
          </div>
          <div class="tag attribute attr-na" @click="naShow = true">
            本命法宝: <b class="na-tier">{{ naTier }}</b> {{ naLv }}级
            <el-icon> <StarFilled /> </el-icon>
          </div>
          <div class="tag attribute attr-realm" @click="isLevel = true">
            境界: {{ levelNames(player.level) }} ({{ player.reincarnation || 0 }}转)
            <el-tag size="small" style="margin-left: 6px" :type="realmTagType">{{ currentRealmName }}</el-tag>
            <el-icon>
              <Warning />
            </el-icon>
          </div>
          <div class="tag attribute attr-cult" v-if="player.level >= maxLv">修为: 登峰造极</div>
           <div
            class="tag attribute attr-cult attr-cult-wide"
            v-else
            @click="
              gameNotifys({
                title: '提示',
                message: `您距离${levelNames(player.level + 1)}境界还需${formatNumberToChineseUnit(
                  player.maxCultivation - player.cultivation
                )}点修为`
              })
            "
          >
            修为: {{ calculatePercentageDifference(player.maxCultivation, player.cultivation) }}
            <div class="cult-bar"><div class="cult-bar-in" :style="{ width: calculatePercentageDifference(player.maxCultivation, player.cultivation) + '%' }"></div></div>
          </div>
          <div class="tag attribute attr-health">
            气血: <b>{{ formatNumberToChineseUnit(player.health) }}</b> / {{ formatNumberToChineseUnit(effStats.maxHealth) }}
            <el-icon v-if="player.points > 0" @click="attributePoints('health')">
              <CirclePlus />
            </el-icon>
          </div>
          <div class="tag attribute attr-attack">
            攻击: <b>{{ formatNumberToChineseUnit(effStats.attack) }}</b>
            <span v-if="buffBonus.attack" class="attr-temp"> (临时 +{{ formatNumberToChineseUnit(buffBonus.attack) }})</span>
            <el-icon v-if="player.points > 0" @click="attributePoints('attack')">
              <CirclePlus />
            </el-icon>
          </div>
          <div class="tag attribute attr-defense">
            防御: <b>{{ formatNumberToChineseUnit(effStats.defense) }}</b>
            <span v-if="buffBonus.defense" class="attr-temp"> (临时 +{{ formatNumberToChineseUnit(buffBonus.defense) }})</span>
            <el-icon v-if="player.points > 0" @click="attributePoints('defense')">
              <CirclePlus />
            </el-icon>
          </div>
          <div class="tag attribute attr-dodge">
            闪避率: {{ (Math.min(0.8, effStats.dodge || 0) * 100).toFixed(2) }}%
          </div>
          <div class="tag attribute attr-critical">
            暴击率: {{ (Math.min(0.8, effStats.critical || 0) * 100).toFixed(2) }}%
          </div>
          <div class="tag attribute attr-score">总体实力: <b><AnimatedNumber :value="Math.round(powerScore || 0)" /></b></div>
          <div
            class="tag attribute attr-points"
            @click="gameNotifys({ title: '获得方式', message: '每提成一次境界可以获得3点境界点' })"
          >
            境界点: {{ formatNumberToChineseUnit(player.points) }}
            <el-icon>
              <Warning />
            </el-icon>
          </div>
          <el-button v-if="spentPoints > 0" size="small" type="danger" plain @click="resetPoints">重置境界点</el-button>
          <div class="tag attribute" @click="gameNotifys({ title: '获得方式', message: '每转生一次可以增加50容量' })">
            背包容量: {{ player?.inventory?.length }} / {{ backpackCapNow }}
            <el-icon>
              <Warning />
            </el-icon>
          </div>
          <div class="tag attribute attr-dao" @click="router.push('/rebirthShop')">
            道行: {{ player.daoPoints || 0 }} <span style="color:#909399;font-size:12px">(转世商店)</span>
          </div>
        </div>
      </div>
      <div class="buff-banner" v-if="activeBuffsList.length">
        <el-tag v-for="b in activeBuffsList" :key="b.name + b.expireAt" type="warning" effect="dark" class="buff-tag">
          【{{ b.name }}】 {{ b.expireAt ? `剩余 ${remainingMinutes(b.expireAt)} 分钟` : '（永久持续）' }}
        </el-tag>
      </div>
      <div class="set-banner" v-if="setList.length">
        <div class="set-card" v-for="st in setList" :key="st.quality">
          <div class="set-head">
            <tag :type="st.quality">{{ st.name }}套 · {{ st.pieces }}件</tag>
          </div>
          <div class="set-line" v-for="t in st.tiers" :key="t.need">
            <span :class="['set-tier', t.active ? 'active' : 'inactive']">{{ t.need }}件</span>
            <span class="set-text">{{ t.text }}</span>
          </div>
        </div>
      </div>
      <div class="set-collect" v-if="setRewardTotal">
        <div class="sc-head">
          <span class="sc-title">集齐全套奖励</span>
          <b class="sc-count">{{ setRewardClaimed }}/{{ setRewardTotal }}</b>
          <el-progress :percentage="setRewardPercent" :stroke-width="6" :show-text="false" class="sc-bar" />
          <el-tag v-if="setRewardClaimable" size="small" type="warning" effect="dark">{{ setRewardClaimable }} 项待发放</el-tag>
          <el-button size="small" text @click="rewardTipShow = !rewardTipShow">{{ rewardTipShow ? '收起' : '清单' }}</el-button>
        </div>
        <div class="sc-list" v-if="rewardTipShow">
          <div class="sc-row" v-for="d in setRewardNear" :key="d.key" :class="{ done: d.done, claimed: d.claimed }">
            <span class="sc-name">{{ d.label }}</span>
            <span class="sc-prog">{{ d.have }}/4</span>
            <span class="sc-reward">{{ d.rewardText }}</span>
            <span class="sc-state">{{ d.claimed ? '已领取' : d.done ? '待发放' : '未集齐' }}</span>
          </div>
        </div>
      </div>
      <div class="aptitude-banner" v-if="aptitude">
        <el-tag type="primary" effect="plain">根骨：{{ aptitude.rootBoneName }}</el-tag>
        <el-tag :type="constitutionTag" effect="plain">体质：{{ constitutionLabel }}</el-tag>
        <el-button
          v-if="aptitude.constitution?.type !== 'none' && !aptitude.constitution?.awakened"
          size="small"
          type="warning"
          @click="doAwaken"
        >
          觉醒({{ awakenCost }}灵石)
        </el-button>
      </div>
      <div class="aptitude-banner">
        <el-tag type="primary" effect="plain">悟性 {{ player.insight || 1 }} · {{ insightLabelOf(player) }}</el-tag>
        <el-tag type="warning" effect="plain">丹 {{ craftTitle('alchemy', player.skills?.alchemy) }}</el-tag>
        <el-tag type="warning" effect="plain">器 {{ craftTitle('forge', player.skills?.forge) }}</el-tag>
        <el-tag type="warning" effect="plain">符 {{ craftTitle('talisman', player.skills?.talisman) }}</el-tag>
        <el-tag type="warning" effect="plain">阵 {{ craftTitle('formation', player.skills?.formation) }}</el-tag>
      </div>
      <div class="equip-box">
        <div class="tag equip-item">
          <span class="equip">
            <span>神兵:</span>
            <el-popover
              v-if="player.equipment?.weapon?.name"
              placement="bottom"
              :title="player.equipment?.weapon?.name"
              :width="300"
              trigger="hover" :hide-after="0"
            >
              <template #reference>
                <span>
                  <tag
                    :type="player.equipment?.weapon?.quality"
                    :closable="player.equipment?.weapon?.name ? true : false"
                    @close="equipmentClose('weapon')"
                    @click="openEquip('weapon')"
                    @mouseenter="getEquipmentInfo(player.equipment['weapon']?.id, 'weapon')"
                  >
                    {{ player.equipment?.weapon?.name }}
                    {{ player.equipment?.weapon?.strengthen ? '+' + player.equipment?.weapon?.strengthen : '' }}
                  </tag>
                </span>
              </template>
              <template #default>
                <div>
                  <equip-tooltip :player="player" :strengthen-info="strengthenInfo" />
                </div>
              </template>
            </el-popover>
            <el-button v-if="player.equipment?.weapon?.name" size="small" link type="primary" class="forge-btn" @click="equipmentInfo(player.equipment['weapon']?.id, 'weapon')">强化</el-button>
            <span v-else>无</span>
          </span>
          <span class="equip">
            <span>护甲:</span>
            <el-popover
              v-if="player.equipment?.armor?.name"
              placement="bottom"
              :title="player.equipment?.armor?.name"
              :width="300"
              trigger="hover" :hide-after="0"
            >
              <template #reference>
                <span>
                  <tag
                    :type="player.equipment?.armor?.quality"
                    :closable="player.equipment?.armor?.name ? true : false"
                    @close="equipmentClose('armor')"
                    @click="openEquip('armor')"
                    @mouseenter="getEquipmentInfo(player.equipment['armor']?.id, 'armor')"
                  >
                    {{ player.equipment?.armor?.name }}
                    {{ player.equipment?.armor?.strengthen ? '+' + player.equipment?.armor?.strengthen : '' }}
                  </tag>
                </span>
              </template>
              <template #default>
                <div>
                  <equip-tooltip :player="player" :strengthen-info="strengthenInfo" />
                </div>
              </template>
            </el-popover>
            <el-button v-if="player.equipment?.armor?.name" size="small" link type="primary" class="forge-btn" @click="equipmentInfo(player.equipment['armor']?.id, 'armor')">强化</el-button>
            <span v-else>无</span>
          </span>
        </div>
        <div class="tag equip-item">
          <span class="equip">
            <span>灵宝:</span>
            <el-popover
              v-if="player.equipment?.accessory?.name"
              placement="bottom"
              :title="player.equipment?.accessory?.name"
              :width="300"
              trigger="hover" :hide-after="0"
            >
              <template #reference>
                <span>
                  <tag
                    :type="player.equipment?.accessory?.quality"
                    :closable="!!player.equipment?.accessory?.name"
                    @close="equipmentClose('accessory')"
                    @click="openEquip('accessory')"
                    @mouseenter="getEquipmentInfo(player.equipment['accessory']?.id, 'accessory')"
                  >
                    {{ player.equipment?.accessory?.name }}
                    {{ player.equipment?.accessory?.strengthen ? '+' + player.equipment?.accessory?.strengthen : '' }}
                  </tag>
                </span>
              </template>
              <template #default>
                <div>
                  <equip-tooltip :player="player" :strengthen-info="strengthenInfo" />
                </div>
              </template>
            </el-popover>
            <el-button v-if="player.equipment?.accessory?.name" size="small" link type="primary" class="forge-btn" @click="equipmentInfo(player.equipment['accessory']?.id, 'accessory')">强化</el-button>
            <span v-else>无</span>
          </span>
          <span class="equip">
            <span>法器:</span>
            <el-popover
              v-if="player.equipment?.sutra?.name"
              placement="bottom"
              :title="player.equipment?.sutra?.name"
              :width="300"
              trigger="hover" :hide-after="0"
            >
              <template #reference>
                <span>
                  <tag
                    :type="player.equipment?.sutra?.quality"
                    :closable="!!player.equipment?.sutra?.name"
                    @close="equipmentClose(player.equipment['sutra']?.id, 'sutra')"
                    @click="openEquip('sutra')"
                    @mouseenter="getEquipmentInfo(player.equipment['sutra']?.id, 'sutra')"
                  >
                    {{ player.equipment?.sutra?.name }}
                    {{ player.equipment?.sutra?.strengthen ? '+' + player.equipment?.sutra?.strengthen : '' }}
                  </tag>
                </span>
              </template>
              <template #default>
                <div>
                  <equip-tooltip :player="player" :strengthen-info="strengthenInfo" />
                </div>
              </template>
            </el-popover>
            <el-button v-if="player.equipment?.sutra?.name" size="small" link type="primary" class="forge-btn" @click="equipmentInfo(player.equipment['sutra']?.id, 'sutra')">强化</el-button>
            <span v-else>无</span>
          </span>
        </div>
        <div class="tag equip-item">
          <span class="equip">
            <span>道侣:</span>
            <tag class="pet" v-if="player.wife?.name" closable @close="wifeRevoke" @click="wifeItemShow = true">
              {{ player.wife?.name }}
            </tag>
            <span v-else>无</span>
          </span>
          <span class="equip">
            <span>灵宠:</span>
            <tag
              class="pet"
              v-if="player.pet?.name"
              :type="computePetsLevel(player.pet?.level)"
              closable
              @close="petRetract"
              @click="petItemShow = true"
            >
              {{ player.pet?.name }}({{ levelNames(player.pet.level) }})
            </tag>
            <span v-else>无</span>
          </span>
        </div>
        <div class="tag inventory-box" v-if="false">
          <el-tabs v-model="inventoryActive" :stretch="true">
            <el-tab-pane label="装备" name="equipment">
              <el-dropdown trigger="click" @command="equipmentDropdown" v-if="player.inventory?.length">
                <span class="el-dropdown-link">
                  装备排序
                  <el-icon>
                    <arrow-down />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      :command="item.type"
                      v-for="(item, index) in dropdownType"
                      :key="index"
                      :disabled="equipmentDropdownActive == item.type"
                    >
                      根据{{ item.name }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-tabs v-model="equipmentActive">
                <el-tab-pane :label="i.name" :name="i.type" v-for="(i, k) in backPackItem" :key="k">
                  <div class="inventory-content">
                    <div v-if="player.inventory.length">
                      <template v-for="item in player.inventory" :key="item.id">
                        <el-popover placement="bottom" :title="item.name" :width="300" trigger="hover" :hide-after="0">
                          <template #reference>
                            <span>
                              <tag
                                class="inventory-item"
                                v-if="item.type == i.type"
                                :key="item.id"
                                :type="item.quality"
                                :closable="!item.lock"
                                @close="inventoryClose(item)"
                                @click="inventory(item.id, item.type)"
                                @mouseenter="getEquipmentInfo(item.id, item.type)"
                              >
                                <el-icon v-if="item.lock">
                                  <Lock />
                                </el-icon>
                                <el-icon v-else>
                                  <Unlock />
                                </el-icon>
                                {{ item?.name }}
                                {{ item?.strengthen ? '+' + item?.strengthen : '' }}
                                <span v-if="item?.gradeName" style="margin-left: 4px; font-weight: bold">{{ item.gradeName }}</span>
                              </tag>
                            </span>
                          </template>
                          <template #default>
                            <div>
                              <equip-tooltip :player="player" :strengthen-info="strengthenInfo" />
                            </div>
                          </template>
                        </el-popover>
                      </template>
                    </div>
                    <tag type="success" class="dialog-footer-button" v-if="!player.isNewbie" @click="newbiePack(4)">
                      领取新手礼包
                    </tag>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
            <el-tab-pane label="道具" name="props">
              <div class="inventory-content">
                <template v-for="(item, index) in sortedProps" :key="index">
                  <tag
                    type="primary"
                    class="inventory-item"
                    @click="gameNotifys({ title: '获得方式', message: propItemNames[item.name].desc })"
                  >
                    {{ propItemNames[item.name].name }}({{ item.num }})
                  </tag>
                </template>
              </div>
            </el-tab-pane>
            <el-tab-pane label="灵宠" name="pet">
              <el-dropdown trigger="click" @command="petDropdown" v-if="player.pets.length">
                <span class="el-dropdown-link">
                  灵宠排序
                  <el-icon>
                    <arrow-down />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      :command="item.type"
                      v-for="(item, index) in dropdownType"
                      :key="index"
                      :disabled="petDropdownActive == item.type"
                    >
                      根据{{ item.name }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <div class="inventory-content">
                <template v-for="(item, index) in player.pets" :key="index">
                  <tag
                    class="inventory-item"
                    :type="computePetsLevel(item.level)"
                    closable
                    @close="petClose(item)"
                    @click="petItemInfo(item)"
                  >
                    <el-icon v-if="item.lock">
                      <Lock />
                    </el-icon>
                    <el-icon v-else>
                      <Unlock />
                    </el-icon>
                    {{ item.name }}({{ levelNames(item.level) }})
                  </tag>
                </template>
              </div>
            </el-tab-pane>
            <el-tab-pane label="道侣" name="wife">
              <div class="inventory-content">
                <template v-for="(item, index) in player.wifes" :key="index">
                  <tag class="inventory-item" @click="wifeItemInfo(item)">
                    {{ item.name }}
                  </tag>
                </template>
              </div>
            </el-tab-pane>
            <el-tab-pane label="鸿蒙商店" name="shop">
              <div class="el-dropdown">
                <span class="el-dropdown-link el-dropdown-selfdefine" @click="refreshShop">
                  刷新商店
                  <el-icon>
                    <Refresh />
                  </el-icon>
                </span>
              </div>
              <el-tabs v-model="shopActive" :stretch="true">
                <el-tab-pane :label="i.name" :name="i.type" v-for="(i, k) in player.shopData" :key="k">
                  <div class="inventory-content">
                    <template v-for="(item, index) in i.data">
                      <tag
                        class="inventory-item"
                        :type="item.quality"
                        v-if="item.type == i.type"
                        :key="index"
                        @click="shopItemInfo(item)"
                      >
                        {{ item.name }}
                      </tag>
                    </template>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      <div class="group-tabs">
        <el-button
          v-for="group in actionGroups"
          :key="group.name"
          size="small"
          :type="activeGroup === group.name ? 'primary' : ''"
          @click="onGroupTab(group)"
        >
          {{ group.name }}
        </el-button>
      </div>
      <div class="actions" v-for="group in actionGroups" :key="group.name" v-show="group.name === activeGroup">
        <div class="action-row">
          <div class="action" v-for="(action, index) in group.actions" :key="index">
            <el-button class="item" :type="action.type ? action.type : ''" @click="action.handler">
              {{ action.text }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <LevelsBoard :visible="isLevel" @update:visible="isLevel = $event" />
    <el-drawer :title="player.wife?.name" v-model="wifeItemShow" direction="rtl" class="strengthen">
      <div class="strengthen-box">
        <div class="attributes">
          <div class="attribute-box">
            <div class="tag attribute">境界: {{ levelNames(player.wife.level) }}</div>
            <div class="tag attribute">气血: {{ formatNumberToChineseUnit(player.wife.health) }}</div>
            <div class="tag attribute">攻击: {{ formatNumberToChineseUnit(player.wife.attack) }}</div>
            <div class="tag attribute">防御: {{ formatNumberToChineseUnit(player.wife.defense) }}</div>
            <div
              class="tag attribute"
              @click="gameNotifys({ title: '获得方式', message: '可以通过赠送礼物给NPC获得', position: 'top-left' })"
            >
              拥有情缘点: {{ formatNumberToChineseUnit(player.props.qingyuan) }}
            </div>
            <div class="tag attribute">升级消耗: {{ player.wife.level * 10 }}</div>
          </div>
        </div>
        <div class="click-box">
          <el-button type="primary" @click="wifeUpgrade(player.wife)" :disabled="player.wife.level >= maxLv">
            {{ player.wife.level >= maxLv ? '道侣等级已满' : '道侣升级' }}
          </el-button>
        </div>
      </div>
    </el-drawer>
    <el-drawer :title="player.pet?.name" v-model="petItemShow" direction="rtl" class="strengthen">
      <div class="strengthen-box">
        <div class="attributes">
          <div class="attribute-box">
            <div class="tag attribute">
              境界: {{ levelNames(player.pet.level) }} ({{ player.pet.reincarnation || 0 }}转)
            </div>
            <div class="tag attribute">悟性: {{ player.pet.rootBone }}</div>
            <div class="tag attribute">气血: {{ formatNumberToChineseUnit(player.pet.health) }}</div>
            <div class="tag attribute">攻击: {{ formatNumberToChineseUnit(player.pet.attack) }}</div>
            <div class="tag attribute">防御: {{ formatNumberToChineseUnit(player.pet.defense) }}</div>
            <div class="tag attribute">灵宠评分: {{ Math.round(player.pet.score || 0).toLocaleString('zh-CN') }}</div>
            <div
              class="tag attribute"
              @click="gameNotifys({ title: '获得方式', message: '可以通过探索秘境获得', position: 'top-left' })"
            >
              拥有培养丹: {{ formatNumberToChineseUnit(player.props.cultivateDan) }}
            </div>
            <div
              class="tag attribute"
              @click="gameNotifys({ title: '获得方式', message: '可以通过击败世界BOSS获得', position: 'top-left' })"
            >
              拥有悟性丹: {{ formatNumberToChineseUnit(player.props.rootBone) }}
            </div>
            <div class="tag attribute">培养消耗: {{ petConsumption(player.pet.level) }}</div>
            <div class="tag attribute">提升悟性消耗: {{ petRootBone ? player.pet.rootBone : 0 }}</div>
          </div>
        </div>
        <div class="click-box">
          <el-checkbox v-model="petReincarnation" label="灵宠转生" />
          <el-checkbox v-model="petRootBone" label="提升悟性" />
          <el-button type="primary" @click="petUpgrade(player.pet)">点击培养</el-button>
        </div>
      </div>
    </el-drawer>
    <StrengthenPanel :visible="strengthenShow" :info="strengthenInfo" @update:visible="strengthenShow = $event" />
    <el-dialog :title="petInfo.name" :lock-scroll="false" v-model="petShow" center width="420px">
      <div class="monsterinfo">
        <div class="monsterinfo-box">
          <p>
            <span class="description">境界: {{ levelNames(petInfo?.level) }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.level, player.pet?.level).icon" />
            </span>
            <span class="value">
              {{
                petInfo.level > parseInt(player.pet?.level || 0)
                  ? levelNames(petInfo.level)
                  : levelNames(player.pet?.level)
              }}
            </span>
          </p>
          <p>
            <span class="description">转生: {{ petInfo?.reincarnation || 0 }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.reincarnation, player.pet?.reincarnation).icon" />
            </span>
            <span class="value">
              {{ calculateDifference(petInfo?.reincarnation, player.pet?.reincarnation).num }}
            </span>
          </p>
          <p>
            <span class="description">气血: {{ petInfo?.health }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.health, player.pet?.health).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.health, player.pet?.health).num }}</span>
          </p>
          <p>
            <span class="description">攻击: {{ petInfo?.attack }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.attack, player.pet?.attack).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.attack, player.pet?.attack).num }}</span>
          </p>
          <p>
            <span class="description">防御: {{ petInfo?.defense }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.defense, player.pet?.defense).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.defense, player.pet?.defense).num }}</span>
          </p>
          <p>
            <span class="description">
              闪避率:
              {{ petInfo?.dodge > 0 ? (petInfo?.dodge * 100 > 100 ? 100 : (petInfo?.dodge * 100).toFixed(2)) : 0 }}%
            </span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.dodge, player.pet?.dodge).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.dodge, player?.pet?.dodge).num }}</span>
          </p>
          <p>
            <span class="description">
              暴击率:
              {{
                petInfo?.critical > 0
                  ? petInfo?.critical * 100 > 100
                    ? 100
                    : (petInfo?.critical * 100).toFixed(2)
                  : 0
              }}%
            </span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.critical, player.pet?.critical).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.critical, player.pet?.critical).num }}</span>
          </p>
          <p>
            <span class="description">灵宠评分: {{ petInfo?.score }}</span>
            <span class="icon">
              <i :class="calculateDifference(petInfo?.score, player.pet?.score).icon" />
            </span>
            <span class="value">{{ calculateDifference(petInfo?.score, player.pet?.score).num }}</span>
          </p>
        </div>
      </div>
      <el-collapse v-model="petCollapse" class="collapse">
        <el-collapse-item name="1">
          <template #title>
            <div class="custom-title">基础属性对比</div>
          </template>
          <div class="monsterinfo-box">
            <p>
              <span class="description">气血: {{ petInfo?.initial?.health }}</span>
              <span class="icon">
                <i :class="calculateDifference(petInfo?.initial?.health, player.pet?.initial?.health).icon" />
              </span>
              <span class="value">
                {{ calculateDifference(petInfo?.initial?.health, player.pet?.initial?.health).num }}
              </span>
            </p>
            <p>
              <span class="description">攻击: {{ petInfo?.initial?.attack }}</span>
              <span class="icon">
                <i :class="calculateDifference(petInfo?.initial?.attack, player.pet?.initial?.attack).icon" />
              </span>
              <span class="value">
                {{ calculateDifference(petInfo?.initial?.attack, player.pet?.initial?.attack).num }}
              </span>
            </p>
            <p>
              <span class="description">防御: {{ petInfo?.initial?.defense }}</span>
              <span class="icon">
                <i :class="calculateDifference(petInfo?.initial?.defense, player.pet?.initial?.defense).icon" />
              </span>
              <span class="value">
                {{ calculateDifference(petInfo?.initial?.defense, player.pet?.initial?.defense).num }}
              </span>
            </p>
            <p>
              <span class="description">
                闪避率:
                {{
                  petInfo?.initial?.dodge > 0
                    ? petInfo?.initial?.dodge * 100 > 100
                      ? 100
                      : (petInfo?.initial?.dodge * 100).toFixed(2)
                    : 0
                }}%
              </span>
              <span class="icon">
                <i :class="calculateDifference(petInfo?.initial?.dodge, player.pet?.initial?.dodge).icon" />
              </span>
              <span class="value">
                {{ calculateDifference(petInfo?.initial?.dodge, player.pet?.initial?.dodge).num }}
              </span>
            </p>
            <p>
              <span class="description">
                暴击率:
                {{
                  petInfo?.initial?.critical > 0
                    ? petInfo?.initial?.critical * 100 > 100
                      ? 100
                      : (petInfo?.initial?.critical * 100).toFixed(2)
                    : 0
                }}%
              </span>
              <span class="icon">
                <i :class="calculateDifference(petInfo?.initial?.critical, player.pet?.initial?.critical).icon" />
              </span>
              <span class="value">
                {{ calculateDifference(petInfo?.initial?.critical, player.pet?.initial?.critical).num }}
              </span>
            </p>
          </div>
        </el-collapse-item>
      </el-collapse>
      <div class="dialog-footer">
        <el-button plain class="dialog-footer-button" @click="petLock(petInfo)">
          灵宠{{ petInfo.lock ? '解锁' : '锁定' }}
        </el-button>
        <el-button plain class="dialog-footer-button" @click="petClose(petInfo)">灵宠放生</el-button>
        <el-button type="primary" class="dialog-footer-button" @click="petCarry(petInfo)">灵宠出战</el-button>
      </div>
    </el-dialog>
    <el-dialog :title="inventoryInfo.name" :lock-scroll="false" v-model="inventoryShow" center width="420px">
      <div class="monsterinfo">
        <div class="monsterinfo-box">
          <p>
            <span class="description">类型: {{ genre[inventoryInfo.type] }}</span>
            <span class="icon" />
            <span class="value" />
          </p>
          <p>
            <span class="description">强化: {{ inventoryInfo.strengthen || 0 }}</span>
            <span class="icon">
              <i
                :class="
                  calculateDifference(inventoryInfo.strengthen, player.equipment[inventoryInfo.type]?.strengthen).icon
                "
              />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo.strengthen, player.equipment[inventoryInfo.type]?.strengthen).num }}
            </span>
          </p>
          <p>
            <span class="description">境界: {{ levelNames(inventoryInfo.level) }}</span>
            <span class="icon">
              <i :class="calculateDifference(inventoryInfo.level, player.equipment[inventoryInfo.type]?.level).icon" />
            </span>
            <span class="value">
              {{
                inventoryInfo.level > parseInt(player.equipment[inventoryInfo.type]?.level || 1)
                  ? levelNames(inventoryInfo.level)
                  : levelNames(player.equipment[inventoryInfo.type]?.level)
              }}
            </span>
          </p>
          <p>
            <span class="description">品质: {{ levels[inventoryInfo.quality] }}</span>
            <span class="icon">
              <i
                :class="
                  calculateDifference(
                    levelsNum[inventoryInfo.quality],
                    levelsNum[player.equipment[inventoryInfo.type]?.quality]
                  ).icon
                "
              />
            </span>
            <span class="value">
              {{
                calculateDifference(
                  levelsNum[inventoryInfo.quality],
                  levelsNum[player.equipment[inventoryInfo.type]?.quality]
                ).num < 0
                  ? levels[player.equipment[inventoryInfo.type]?.quality]
                  : levels[inventoryInfo.quality]
              }}
            </span>
          </p>
          <p>
            <span class="description">气血: {{ inventoryInfo?.health }}</span>
            <span class="icon">
              <i
                :class="calculateDifference(inventoryInfo?.health, player.equipment[inventoryInfo.type]?.health).icon"
              />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.health, player.equipment[inventoryInfo.type]?.health).num }}
            </span>
          </p>
          <p>
            <span class="description">攻击: {{ inventoryInfo?.attack }}</span>
            <span class="icon">
              <i
                :class="calculateDifference(inventoryInfo?.attack, player.equipment[inventoryInfo.type]?.attack).icon"
              />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.attack, player.equipment[inventoryInfo.type]?.attack).num }}
            </span>
          </p>
          <p>
            <span class="description">防御: {{ inventoryInfo?.defense }}</span>
            <span class="icon">
              <i
                :class="calculateDifference(inventoryInfo?.defense, player.equipment[inventoryInfo.type]?.defense).icon"
              />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.defense, player.equipment[inventoryInfo.type]?.defense).num }}
            </span>
          </p>
          <p>
            <span class="description">
              闪避率:
              {{
                inventoryInfo?.dodge > 0
                  ? inventoryInfo?.dodge * 100 > 100
                    ? 100
                    : (inventoryInfo?.dodge * 100).toFixed(2)
                  : 0
              }}%
            </span>
            <span class="icon">
              <i :class="calculateDifference(inventoryInfo?.dodge, player.equipment[inventoryInfo.type]?.dodge).icon" />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.dodge, player.equipment[inventoryInfo.type]?.dodge).num }}
            </span>
          </p>
          <p>
            <span class="description">
              暴击率:
              {{
                inventoryInfo?.critical > 0
                  ? inventoryInfo?.critical * 100 > 100
                    ? 100
                    : (inventoryInfo?.critical * 100).toFixed(2)
                  : 0
              }}%
            </span>
            <span class="icon">
              <i
                :class="
                  calculateDifference(inventoryInfo?.critical, player.equipment[inventoryInfo.type]?.critical).icon
                "
              />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.critical, player.equipment[inventoryInfo.type]?.critical).num }}
            </span>
          </p>
          <p>
            <span class="description">装备评分: {{ inventoryInfo?.score }}</span>
            <span class="icon">
              <i :class="calculateDifference(inventoryInfo?.score, player.equipment[inventoryInfo.type]?.score).icon" />
            </span>
            <span class="value">
              {{ calculateDifference(inventoryInfo?.score, player.equipment[inventoryInfo.type]?.score).num }}
            </span>
          </p>
        </div>
      </div>
      <el-collapse v-model="inventoryCollapse" class="collapse">
        <el-collapse-item name="1">
          <template #title>
            <div class="custom-title">基础属性对比</div>
          </template>
          <div class="monsterinfo-box">
            <p>
              <span class="description">气血: {{ inventoryInfo?.initial?.health }}</span>
              <span class="icon">
                <i
                  :class="
                    calculateDifference(
                      inventoryInfo?.initial?.health,
                      player.equipment[inventoryInfo.type]?.initial?.health
                    ).icon
                  "
                />
              </span>
              <span class="value">
                {{
                  calculateDifference(
                    inventoryInfo?.initial?.health,
                    player.equipment[inventoryInfo.type]?.initial?.health
                  ).num
                }}
              </span>
            </p>
            <p>
              <span class="description">攻击: {{ inventoryInfo?.initial?.attack }}</span>
              <span class="icon">
                <i
                  :class="
                    calculateDifference(
                      inventoryInfo?.initial?.attack,
                      player.equipment[inventoryInfo.type]?.initial?.attack
                    ).icon
                  "
                />
              </span>
              <span class="value">
                {{
                  calculateDifference(
                    inventoryInfo?.initial?.attack,
                    player.equipment[inventoryInfo.type]?.initial?.attack
                  ).num
                }}
              </span>
            </p>
            <p>
              <span class="description">防御: {{ inventoryInfo?.initial?.defense }}</span>
              <span class="icon">
                <i
                  :class="
                    calculateDifference(
                      inventoryInfo?.initial?.defense,
                      player.equipment[inventoryInfo.type]?.initial?.defense
                    ).icon
                  "
                />
              </span>
              <span class="value">
                {{
                  calculateDifference(
                    inventoryInfo?.initial?.defense,
                    player.equipment[inventoryInfo.type]?.initial?.defense
                  ).num
                }}
              </span>
            </p>
            <p>
              <span class="description">
                闪避率:
                {{
                  inventoryInfo?.initial?.dodge > 0
                    ? inventoryInfo?.initial?.dodge * 100 > 100
                      ? 100
                      : (inventoryInfo?.initial?.dodge * 100).toFixed(2)
                    : 0
                }}%
              </span>
              <span class="icon">
                <i
                  :class="
                    calculateDifference(
                      inventoryInfo?.initial?.dodge,
                      player.equipment[inventoryInfo.type]?.initial?.dodge
                    ).icon
                  "
                />
              </span>
              <span class="value">
                {{
                  calculateDifference(
                    inventoryInfo?.initial?.dodge,
                    player.equipment[inventoryInfo.type]?.initial?.dodge
                  ).num
                }}
              </span>
            </p>
            <p>
              <span class="description">
                暴击率:
                {{
                  inventoryInfo?.initial?.critical > 0
                    ? inventoryInfo?.initial?.critical * 100 > 100
                      ? 100
                      : (inventoryInfo?.initial?.critical * 100).toFixed(2)
                    : 0
                }}%
              </span>
              <span class="icon">
                <i
                  :class="
                    calculateDifference(
                      inventoryInfo?.initial?.critical,
                      player.equipment[inventoryInfo.type]?.initial?.critical
                    ).icon
                  "
                />
              </span>
              <span class="value">
                {{
                  calculateDifference(
                    inventoryInfo?.initial?.critical,
                    player.equipment[inventoryInfo.type]?.initial?.critical
                  ).num
                }}
              </span>
            </p>
          </div>
        </el-collapse-item>
      </el-collapse>
      <div class="dialog-footer">
        <el-button plain class="inventory-button" @click="inventoryClose(inventoryInfo)">装备分解</el-button>
        <el-button plain class="inventory-button" @click="inventoryLock(inventoryInfo.id)">
          {{ inventoryInfo.lock ? '装备解锁' : '装备锁定' }}
        </el-button>
        <el-button type="primary" class="inventory-button" @click="equipItem(inventoryInfo.id, inventoryInfo.type)">
          立即装备
        </el-button>
      </div>
    </el-dialog>
    <BatchPanel :visible="sellingEquipmentShow" @update:visible="sellingEquipmentShow = $event" />
    <el-dialog v-model="show" :lock-scroll="false" title="游戏设置" width="350px">
      <div class="dialog-footer">
        <el-divider>存档相关</el-divider>
        <el-button type="info" class="dialog-footer-button" @click="exportData">导出存档</el-button>
        <el-upload
          action="#"
          class="dialog-upload"
          :http-request="importData"
          :show-file-list="false"
          accept="application/json"
        >
          <el-button type="warning" class="dialog-footer-button">导入存档</el-button>
        </el-upload>
        <el-button type="danger" class="dialog-footer-button" @click="deleteData">删除存档</el-button>
        <el-button type="danger" class="dialog-footer-button" @click="restartGame">进入下一世轮回</el-button>
        <div class="dialog-footer-button mode-row">
          轮回模式：重开新世（清空本世，保留永久传承）
        </div>
        <div class="mode-row">
          <span style="color: var(--el-color-danger);">完全重开</span>
          <span style="font-size:12px;color:var(--el-text-color-secondary);">不继承任何东西，如同新号（不可逆）</span>
          <el-button type="danger" plain size="small" @click="doFullReset">确认重开</el-button>
        </div>
        <el-divider>自动挂机</el-divider>
        <div class="mode-row">
          <span>自动探索</span><el-switch v-model="player.autoIdle.explore" size="small" />
          <span>自动秘境</span><el-switch v-model="player.autoIdle.realm" size="small" />
          <span>自动任务</span><el-switch v-model="player.autoIdle.quest" size="small" />
          <span>自动突破</span><el-switch v-model="player.autoIdle.breakthrough" size="small" />
        </div>
        <div class="mode-row">
          <el-button size="small" type="primary" plain @click="autoIdlePreset(true)">一键开启挂机套餐</el-button>
          <el-button size="small" type="info" plain @click="autoIdlePreset(false)">一键关闭</el-button>
          <span class="auto-hint">套餐 = 探索 + 秘境 + 任务 + 突破（突破仅在有把握时自动进行）</span>
        </div>
        <el-divider>其他相关</el-divider>
        <el-divider>当前版本为: {{ ver }}</el-divider>
      </div>
    </el-dialog>
    <el-drawer title="图鉴与成就" v-model="equipAllShow" direction="rtl" class="equipAll">
      <div class="codex-summary" v-if="codexStat.total">
        图鉴总收集度 <b>{{ Math.floor(codexStat.percent * 100) }}%</b> ·
        修为加成 +{{ (codexStat.percent * 10).toFixed(1) }}% · 灵石加成 +{{ (codexStat.percent * 5).toFixed(1) }}%
      </div>
      <el-tabs v-model="activeName" type="border-card">
        <el-tab-pane label="装备图鉴" name="illustrations">
          <div class="equipAll-box">
            <el-tabs v-model="illustrationsActive" :stretch="true">
              <el-tab-pane :label="i.name" :name="i.type" v-for="(i, k) in illustrationsItems" :key="k">
                <div class="equipAll-content">
                  <template v-for="(item, index) in i.data">
                    <div
                      class="equipAll-item"
                      v-if="item.type == i.type"
                      :key="index"
                      @click="illustrationsInfo(k, index)"
                    >
                      <tag :type="item.quality">
                        {{ item.name }}
                      </tag>
                    </div>
                  </template>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-tab-pane>
        <el-tab-pane label="材料图鉴" name="materials">
          <div class="equipAll-box">
            <el-select v-model="matTier" size="small" class="codex-filter">
              <el-option label="全部" :value="-1" />
              <el-option v-for="(n, i) in MATERIAL_TIER_NAMES" :key="i" :label="n" :value="i" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedMats.length }}/{{ filteredMats.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownProp(m.key) }" v-for="m in filteredMats" :key="m.key" @click="codexInfo(m.name, m.desc)">
                <tag :type="qualityOfMaterial(m.tier)">{{ m.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="丹药图鉴" name="pills">
          <div class="equipAll-box">
            <el-select v-model="pillTier" size="small" class="codex-filter">
              <el-option label="全部" :value="-1" />
              <el-option v-for="n in 11" :key="n" :label="`${n}阶`" :value="n" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedPills.length }}/{{ filteredPills.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownPill(r) }" v-for="r in filteredPills" :key="r.id" @click="codexInfo(r.name, r.effectText)">
                <tag :type="r.quality">{{ r.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="功法图鉴" name="techs">
          <div class="equipAll-box">
            <el-select v-model="techGrade" size="small" class="codex-filter">
              <el-option label="全部" :value="-1" />
              <el-option v-for="n in 11" :key="n" :label="`${n}阶`" :value="n" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedTechs.length }}/{{ filteredTechs.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownTech(t) }" v-for="t in filteredTechs" :key="t.id" @click="codexInfo(t.name, t.desc)">
                <tag :type="t.quality">{{ t.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="符箓图鉴" name="tals">
          <div class="equipAll-box">
            <el-select v-model="talTier" size="small" class="codex-filter">
              <el-option label="全部" :value="-1" />
              <el-option v-for="n in 11" :key="n" :label="`${n}阶`" :value="n" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedTals.length }}/{{ filteredTals.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownTal(x) }" v-for="x in filteredTals" :key="x.id" @click="codexInfo(x.name, x.effectText)">
                <tag :type="x.quality">{{ x.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="阵法图鉴" name="forms">
          <div class="equipAll-box">
            <el-select v-model="formGroup" size="small" class="codex-filter">
              <el-option label="全部" value="all" />
              <el-option v-for="g in formationGroups" :key="g.key" :label="g.name" :value="g.key" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedForms.length }}/{{ filteredForms.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownForm(f) }" v-for="f in filteredForms" :key="f.id" @click="codexInfo(f.name, f.desc)">
                <tag :type="f.quality">{{ f.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="天材地宝图鉴" name="tres">
          <div class="equipAll-box">
            <el-select v-model="treTier" size="small" class="codex-filter">
              <el-option label="全部" :value="-1" />
              <el-option v-for="n in 11" :key="n" :label="`${n}阶`" :value="n" />
            </el-select>
            <div class="codex-count">已收集 {{ ownedTres.length }}/{{ filteredTres.length }}</div>
            <div class="equipAll-content">
              <div class="equipAll-item" :class="{ 'codex-dim': !ownTre(t) }" v-for="t in filteredTres" :key="t.key" @click="codexInfo(t.name, t.desc)">
                <tag :type="t.quality">{{ t.name }}</tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="游商专辑" name="trav">
          <div class="equipAll-box">
            <div class="codex-count">已见 {{ travelerSeen.length }} 种货品</div>
            <div class="equipAll-content">
              <div class="equipAll-item" v-for="t in travelerSeen" :key="t.key" @click="codexInfo(t.name, t.tierName)">
                <tag :type="tierOfSeen(t)">{{ t.name }}</tag>
              </div>
              <el-empty v-if="!travelerSeen.length" description="游商尚未进货" :image-size="60" />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="盲盒记录" name="blind">
          <div class="equipAll-box">
            <div class="codex-count">已开 {{ blindBoxStat.opened }} 次 · 出1000倍 {{ blindBoxStat.jackpot }} 次</div>
            <div class="equipAll-content">
              <div class="equipAll-item" v-for="x in blindBoxItems" :key="x.key" @click="codexInfo(nameOfKey(x.key), '累计开出 ×' + x.qty)">
                <el-tag size="small" type="warning">{{ nameOfKey(x.key) }} ×{{ x.qty }}</el-tag>
              </div>
              <el-empty v-if="!blindBoxItems.length" description="还未开过盲盒" :image-size="60" />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="我的成就" name="achievement">
          <div class="ach-progress">
            <div class="ach-progress-head">成就收集度 <b>{{ achievementStats.done }}</b> / {{ achievementStats.total }}（{{ Math.round(achievementStats.percent * 100) }}%）</div>
            <el-progress :percentage="Math.round(achievementStats.percent * 100)" :stroke-width="10" :color="achievementStats.percent >= 1 ? '#67c23a' : '#409eff'" />
          </div>
          <el-tabs v-model="achievementActive" :stretch="true">
            <el-tab-pane :label="i.name" :name="i.type" v-for="(i, k) in achievementAll" :key="k">
              <div class="achievement-content" v-if="i.data.length > 0">
                <div
                  class="achievement-item"
                  v-for="(item, index) in i.data"
                  :key="index"
                  @click="achievementInfo(i.type, item)"
                >
                  <tag :type="getTagClass(i.type, item.id) ? 'success' : 'info'">
                    {{ item.name }}
                    <span v-if="item.rarity" class="ach-rarity" :class="'rarity-' + item.rarity">{{ rarityLabel(item.rarity) }}</span>
                    ({{ getTagClass(i.type, item.id) ? '已完成' : '未完成' }})
                  </tag>
                </div>
              </div>
              <div class="achievement-content" v-else>此类成就暂未发布</div>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>
        <el-tab-pane label="我的天赋" name="talent">
          <div class="equipAll-box">
            <div class="talent-content" v-if="myTalents.length > 0">
              <div
                class="talent-item"
                v-for="(item, index) in myTalents"
                :key="index"
                @click="talentInfo(item)"
              >
                <tag :type="TALENT_QUALITY[item.quality].color">
                  {{ TALENT_QUALITY[item.quality].name }}·{{ item.name }}
                  <template v-if="item.count > 1">({{ item.count }}层)</template>
                </tag>
              </div>
            </div>
            <div class="achievement-content" v-else>尚未领悟任何天赋，修炼突破即有几率获得</div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <div class="backtop" @click="equipAllShow = false">
        <el-icon>
          <Close />
        </el-icon>
      </div>
    </el-drawer>
    <NaArtifactPanel :visible="naShow" @update:visible="naShow = $event" />
    <WorldBossPanel :visible="wbShow" @update:visible="wbShow = $event" />
    <SeasonPanel :visible="seasonShow" @update:visible="seasonShow = $event" />
    <HeroBoardPanel :visible="heroShow" @update:visible="heroShow = $event" />
    <TechniquePanel :visible="techniqueShow" @update:visible="techniqueShow = $event" />
    <el-drawer
      title="新手礼包"
      v-model="newBieBox"
      :before-close="confirmCollectionNewBie"
      class="newBieBox"
      direction="rtl"
    >
      <div class="newBie">
        <div class="newbie-note">输入你的 4 位幸运数字，开启新手大礼包</div>
        <div class="newbie-input">
          <el-input v-model="newBieCode" maxlength="4" placeholder="0000-9999" class="code-input" />
          <el-button type="primary" @click="openNewBie">开启礼包</el-button>
        </div>
        <el-alert v-if="newBieEgg" type="success" :closable="false" show-icon class="egg-alert" title="彩蛋触发！你获得了一份更好的礼包" />
        <tag
          v-for="(item, index) in newBieData"
          class="inventory-item"
          :type="item.quality"
          :key="index"
          @click="newBieInfo(item)"
        >
          {{ item.name }}({{ genre[item.type] }})
          <el-icon>
            <View />
          </el-icon>
        </tag>
      </div>
      <el-button type="primary" @click="confirmCollectionNewBie">领取装备</el-button>
    </el-drawer>
    <el-dialog v-model="newBieInfoBox" :lock-scroll="false" :title="newBieItem.name" width="420px">
      <div class="monsterinfo">
        <div class="newbieinfo-box">
          <p>类型: {{ genre[newBieItem.type] }}</p>
          <p>境界: {{ levelNames(newBieItem.level) }}</p>
          <p>品质: {{ levels[newBieItem.quality] }}</p>
          <p>气血: {{ newBieItem?.health }}</p>
          <p>攻击: {{ newBieItem?.attack }}</p>
          <p>防御: {{ newBieItem?.defense }}</p>
          <p>
            闪避率:
            {{
              newBieItem?.dodge > 0 ? (newBieItem?.dodge * 100 > 100 ? 100 : (newBieItem?.dodge * 100).toFixed(2)) : 0
            }}%
          </p>
          <p>
            暴击率:
            {{
              newBieItem?.critical > 0
                ? newBieItem?.critical * 100 > 100
                  ? 100
                  : (newBieItem?.critical * 100).toFixed(2)
                : 0
            }}%
          </p>
          <p>装备评分: {{ newBieItem?.score }}</p>
        </div>
      </div>
      <div class="dialog-footer">
        <el-button type="primary" class="inventory-button" @click="newBieInfoBox = false">确定</el-button>
      </div>
    </el-dialog>
    <el-dialog v-model="errBox" :lock-scroll="false" title="错误信息" width="420px">
      <el-input v-model="err" :rows="10" type="textarea" />
      <div class="dialog-footer">
        <el-button type="primary" class="inventory-button" @click="errBox = false">确定</el-button>
      </div>
    </el-dialog>
    <el-dialog v-model="storyDlg.show" :title="storyDlg.title" width="480px" :lock-scroll="false" :close-on-click-modal="false">
      <div class="story-dlg-text">{{ storyDlg.text }}</div>
      <div class="story-dlg-choices">
        <el-button
          v-for="(c, i) in storyDlg.choices"
          :key="i"
          type="primary"
          plain
          class="story-dlg-choice"
          :disabled="!choiceReqMet(player, c.req)"
          @click="pickStory(i)"
        >
          {{ c.label }}<span v-if="c.req" class="story-dlg-req">（{{
            (choiceReqMet(player, c.req) ? '' : '需') + choiceReqText(c.req)
          }}）</span>
        </el-button>
      </div>
      <div class="story-dlg-hint">选择不同道路，结局与机缘各异</div>
    </el-dialog>
    <item-info :visible="infoShow" :data="infoData" @update:visible="infoShow = $event" />
  </div>
</template>
<script setup>
  import { useRouter } from 'vue-router'
  import { ref, reactive, computed, watch, onMounted } from 'vue'
  // 标签组件
  import tag from '@/components/tag.vue'
  // 商店
  import shop from '@/plugins/shop'
  // 装备
  import equip from '@/plugins/equip'
  import { applyPlayerAttribute } from '@/plugins/playerAttr'
  import { wearEquip, removeEquip } from '@/plugins/equipOps'
  import { playerPowerScore } from '@/plugins/breakthroughGate'
  // 数据导出
  import { saveAs } from 'file-saver'
  // 图鉴
  import equipAll from '@/plugins/equipAll'
  // 成就
  import achievement from '@/plugins/achievement'
  import { TALENTS, TALENT_QUALITY } from '@/plugins/talent'
  import { manorEnhanceBonus } from '@/plugins/manor'
  import { activeBuffs } from '@/plugins/alchemy'
  import { buffStats } from '@/plugins/buffs'
  import { RECIPES } from '@/plugins/alchemy'
  import { setSummary } from '@/plugins/setBonus'
  import { setRewardStatus, setRewardSummary } from '@/plugins/setReward'
  import { ensureAptitude, awakenConstitution, awakenCost as awakenCostCalc } from '@/plugins/aptitude'
  import { sumStatAffixes } from '@/plugins/affix'
  import { gameDate, playerLifespan } from '@/plugins/time'
  import { addTreasure, TREASURES } from '@/plugins/treasure'
  import { TALISMANS } from '@/plugins/talisman'
  import { performRebirth, rebirthSummaryHtml, fullReset } from '@/plugins/rebirthFlow'
  import { fateInfo } from '@/plugins/fate'
  import { codexStats } from '@/plugins/codex'
  import { collectSetInfo, effectiveBackpackCap, effectivePlayerStats } from '@/plugins/setBonus'
  import { natalArtifactTier } from '@/plugins/natalArtifact'
  import { triggerAdventure, canAdventure, adventureCooldownLeft } from '@/plugins/adventure'
  import { rollStory, resolveStory, resolveStoryChoice, choiceReqMet, choiceReqText } from '@/plugins/story'
  import { insightLabelOf } from '@/plugins/insight'
  import { craftTitle } from '@/plugins/craft'
  import { MATERIALS, MATERIAL_TIERS } from '@/plugins/materialDb'
  import { TECHNIQUES, grantSeededScrolls } from '@/plugins/technique'
  import { FORMATIONS, FORMATION_GROUPS } from '@/plugins/formation'
  import { equipSellPrice } from '@/plugins/market'
  import MoneyBar from '@/components/MoneyBar.vue'
  import AnimatedNumber from '@/components/AnimatedNumber.vue'
  import { ensureBirthFamily, birthFamilyInfo } from '@/plugins/birthFamily'
  import { nextObjective } from '@/plugins/guide'
  import equipTooltip from '@/components/equipTooltip.vue'
  import itemInfo from '@/components/itemInfo.vue'
  import SeasonPanel from '@/components/SeasonPanel.vue'
  import HeroBoardPanel from '@/components/HeroBoardPanel.vue'
  import WorldBossPanel from '@/components/WorldBossPanel.vue'
  import NaArtifactPanel from '@/components/NaArtifactPanel.vue'
  import LevelsBoard from '@/components/LevelsBoard.vue'
  import BatchPanel from '@/components/BatchPanel.vue'
  import StrengthenPanel from '@/components/StrengthenPanel.vue'
  import TechniquePanel from '@/components/TechniquePanel.vue'
  import { ElMessageBox } from 'element-plus'
  import { useMainStore } from '@/plugins/store'
  import {
    maxLv,
    dropdownType,
    levelNames,
    realmOf,
    gradeNames,
    formatNumberToChineseUnit,
    genre,
    levels,
    gameNotifys,
    propItemNames,
    dropdownTypeObject
  } from '@/plugins/game'

  const store = useMainStore()
  const router = useRouter()
  const ver = ref('1.0.0')
  // 错误信息
  const err = ref('')
  const show = ref(false)
  // 错误信息弹窗
  const errBox = ref(false)
  // boss数据
  const boss = ref(store.boss)
  // 玩家属性
  const player = ref(store.player)
  // 有效属性（含装备/功法/阵法/增益等），暴击/闪避封顶 80%
  const effStats = computed(() => effectivePlayerStats(player.value))
  const powerScore = computed(() => playerPowerScore(player.value))
  const calendar = computed(() => gameDate(player.value))
  const fateData = computed(() => fateInfo(player.value))
  const codexStat = computed(() => codexStats(player.value))
  const collectSet = computed(() => collectSetInfo(player.value))
  const autoIdlePreset = on => {
    player.value.autoIdle.explore = on
    player.value.autoIdle.realm = on
    player.value.autoIdle.quest = on
    player.value.autoIdle.breakthrough = on
  }
  const seasonShow = ref(false)
  const heroShow = ref(false)
  const naShow = ref(false)
  const naTier = computed(() => natalArtifactTier(player.value))
  const naLv = computed(() => player.value.natalArtifact?.level || 1)
  const wbShow = ref(false)
  const techniqueShow = ref(false)
  const lifespan = computed(() => playerLifespan(player.value))
  const remaining = computed(() => Math.max(0, lifespan.value - (player.value.age || 0)))
  const familyName = computed(() => birthFamilyInfo(ensureBirthFamily(player.value))?.name || '无')
  const familySeen = computed(() => (player.value.birthFamilySeen || []).map(r => `${birthFamilyInfo(r)?.name}(${r})`).join(' / '))
  const guide = computed(() => nextObjective(player.value))
  const activeGroup = ref('修 炼')
  // 隐藏 GM：连点「修炼」分类页签 5 次进入
  let gmClick = 0
  let gmTimer = null
  const onGroupTab = group => {
    activeGroup.value = group.name
    if (group.name.replace(/\s/g, '') === '修炼') {
      gmClick++
      if (gmTimer) clearTimeout(gmTimer)
      gmTimer = setTimeout(() => { gmClick = 0 }, 3000)
      if (gmClick >= 5) {
        gmClick = 0
        gameNotifys({ title: 'GM', message: '隐藏控制台已开启', type: 'success' })
        router.push('/gm')
      }
    }
  }
  const infoShow = ref(false)
  const infoData = ref(null)

  const openItem = it => {
    infoData.value = {
      title: it.name,
      rows: [
        { k: '类型', v: genre[it.type] },
        { k: '境界', v: levelNames(it.level) },
        { k: '品质', v: levels[it.quality] },
        { k: '细分级', v: it.gradeName },
        { k: '强化', v: it.strengthen ? '+' + it.strengthen : '无' },
        { k: '气血', v: formatNumberToChineseUnit(it.health) },
        { k: '攻击', v: formatNumberToChineseUnit(it.attack) },
        { k: '防御', v: formatNumberToChineseUnit(it.defense) },
        { k: '暴击', v: (it.critical * 100).toFixed(1) + '%' },
        { k: '闪避', v: (it.dodge * 100).toFixed(1) + '%' },
        { k: '评分', v: Math.round(it.score || 0).toLocaleString('zh-CN') }
      ],
      affixes: (it.affixes || []).map(a =>
        a.type === 'stat'
          ? { name: a.name, text: a.value, desc: '' }
          : { name: a.name, text: (a.triggerChance * 100).toFixed(1) + '% 触发', desc: a.desc }
      )
    }
    infoShow.value = true
  }
  const openEquip = type => {
    const it = player.value.equipment[type]
    if (it && it.id) openItem(it)
  }
  const doGuide = () => {
    if (guide.value.action === 'newbie') {
      newbiePack()
      return
    }
    if (guide.value.route) router.push(guide.value.route)
  }
  const actionGroups = ref([])
  // 当前生效的限时增益
  const activeBuffsList = computed(() => activeBuffs(player.value))
  // 临时(丹药/符箓)加成，显示在基础属性后的括号
  const buffBonus = computed(() => {
    const b = buffStats(player.value)
    return {
      attack: Math.round((player.value.attack || 0) * (b.attack || 0)),
      defense: Math.round((player.value.defense || 0) * (b.defense || 0)),
      critical: ((player.value.critical || 0) * (b.critical || 0) * 100).toFixed(1) + '%',
      dodge: ((player.value.dodge || 0) * (b.dodge || 0) * 100).toFixed(1) + '%'
    }
  })
  const remainingMinutes = expireAt => (expireAt ? Math.max(0, Math.ceil((expireAt - Date.now()) / 60000)) : 0)
  const setList = computed(() => setSummary(player.value))
  // 集齐全套奖励：进度与清单（同阶四件 / 同名套装四件）
  const rewardTipShow = ref(false)
  const setRewardList = computed(() => setRewardStatus(player.value))
  const setRewardSum = computed(() => setRewardSummary(player.value))
  const setRewardClaimed = computed(() => setRewardSum.value.claimed)
  const setRewardTotal = computed(() => setRewardSum.value.total)
  const setRewardClaimable = computed(() => setRewardSum.value.claimable)
  const setRewardPercent = computed(() => setRewardSum.value.percent)
  const setRewardNear = computed(() => setRewardList.value.filter(d => d.have >= 2 || d.done).sort((a, b) => b.have - a.have || a.tier - b.tier))
  // 资质：根骨 与 体质
  const aptitude = computed(() => ensureAptitude(player.value))
  const constitutionLabel = computed(() => {
    const c = aptitude.value.constitution || {}
    if (!c.type || c.type === 'none') return '凡体'
    return `${c.name}${c.awakened ? '·已觉醒' : '·未觉醒'}`
  })
  const constitutionTag = computed(() => {
    const c = aptitude.value.constitution || {}
    if (!c.type || c.type === 'none') return 'info'
    if (c.type === 'special') return 'danger'
    return c.awakened ? 'success' : 'warning'
  })
  const awakenCost = computed(() => {
    const c = aptitude.value.constitution || {}
    return c.grade ? awakenCostCalc(player.value).money : 0
  })
  const doAwaken = () => {
    const res = awakenConstitution(player.value)
    if (res.ok) gameNotifys({ title: '体质觉醒', message: `觉醒成功：${res.name}体质`, type: 'success' })
    else gameNotifys({ title: '体质觉醒', message: res.reason, type: 'error' })
  }
  const isLevel = ref(false)
  // 灵宠信息弹窗
  const petShow = ref(false)
  // 灵宠数据
  const petInfo = ref({})
  // 修改昵称
  const editName = ref(false)
  const levelsNum = ref({
    info: 1,
    pink: 7,
    danger: 6,
    purple: 4,
    primary: 3,
    success: 2,
    warning: 5
  })
  // 新手礼包弹窗
  const newBieBox = ref(false)
  const storyText = ref('')
  // 商店商品价格
  const shopPrice = ref(100)
  // 新手礼包数据
  const newBieData = ref([])
  const shopActive = ref('weapon')
  const activeName = ref('illustrations')
  /// 新手礼包装备信息
  const newBieItem = ref({})
  // 新手礼包幸运数字
  const newBieCode = ref('')
  // 是否触发彩蛋(1018)
  const newBieEgg = ref(false)
  // 上传的脚本文件
  const scriptFile = ref('')
  // 灵宠信息弹窗
  const petItemShow = ref(false)
  const backPackItem = ref([
    { type: 'weapon', name: '神兵' },
    { type: 'armor', name: '护甲' },
    { type: 'accessory', name: '灵宝' },
    { type: 'sutra', name: '法器' }
  ])
  const petRootBone = ref(false)
  const petCollapse = ref('')
  // 图鉴弹窗
  const equipAllShow = ref(false)
  // 道侣弹窗
  const wifeItemShow = ref(false)
  // 装备信息
  const inventoryInfo = ref({})
  // 新手礼包装备信息弹窗
  const newBieInfoBox = ref(false)
  // 新手礼包刷新状态
  const newBieLoading = ref(false)
  // 装备信息弹窗
  const inventoryShow = ref(false)
  // 炼器弹窗
  const strengthenShow = ref(false)
  // 炼器的信息
  const strengthenInfo = ref({})
  const achievementAll = ref([])
  // 选择分解的装备品阶
  // const checkedEquipmen = ref([])
  const inventoryActive = ref('equipment')
  const equipmentActive = ref('weapon')
  // 灵宠转生勾选状态
  const petReincarnation = ref(false)
  const achievementActive = ref('pet')
  // 成就收集度：已完成 / 总数（用于进度条与集齐加成）
  const achievementStats = computed(() => {
    const playerAch = player.value.achievement || {}
    let total = 0
    let done = 0
    achievementAll.value.forEach(cat => {
      ;(cat.data || []).forEach(item => {
        total++
        if ((playerAch[cat.type] || []).some(a => a.id === item.id)) done++
      })
    })
    return { done, total, percent: total ? done / total : 0 }
  })
  // 当前界域展示
  const currentRealmName = computed(() => {
    const r = realmOf(player.value.level || 0)
    return r ? r.name : ''
  })
  const realmTagType = computed(() => {
    const r = realmOf(player.value.level || 0)
    return r?.id === 'mortal' ? 'info' : r?.id === 'spirit' ? 'success' : r?.id === 'immortal' ? 'warning' : 'danger'
  })
  // 我的天赋列表（由 player.talents 中的 id 对应天赋池映射出完整信息）
  const myTalents = computed(() => {
    return (player.value.talents || []).map(t => {
      const detail = TALENTS.find(x => x.id === t.id) || {}
      return { ...detail, count: t.count || 1 }
    })
  })
  const talentInfo = talent => {
    gameNotifys({
      title: `${TALENT_QUALITY[talent.quality].name}【${talent.name}】`,
      message:
        `${talent.desc}\n当前层数：${talent.count}\n` +
        `天赋品质越高，加成的属性越多；境界等级越高，越容易获得高品天赋。`,
      dangerouslyUseHTMLString: true
    })
  }
  const inventoryCollapse = ref('')
  const petDropdownActive = ref('')
  const illustrationsItems = ref([])
  // 批量分解弹窗
  const sellingEquipmentShow = ref(false)
  const illustrationsActive = ref('weapon')
  const equipmentDropdownActive = ref('')
  // —— 图鉴：材料 / 丹药 / 功法 / 符箓 / 阵法 / 天材地宝 ——
  const MATERIALS_TIERS_NEW = MATERIAL_TIERS.map(t => t.name)
  const matTier = ref(-1)
  const pillTier = ref(-1)
  const techGrade = ref(-1)
  const talTier = ref(-1)
  const formGroup = ref('all')
  const treTier = ref(-1)
  const formationGroups = FORMATION_GROUPS
  const QUALITY_BY_TIER = ['info', 'success', 'primary', 'purple', 'pink', 'warning', 'danger', 'cyan', 'orange', 'gold', 'legendary']
  const qualityOfMaterial = tier => QUALITY_BY_TIER[tier] || 'info'
  const filteredMats = computed(() => (matTier.value < 0 ? MATERIALS : MATERIALS.filter(m => m.tier === matTier.value)))
  const filteredPills = computed(() => (pillTier.value < 0 ? RECIPES : RECIPES.filter(r => r.tier === pillTier.value)))
  const filteredTechs = computed(() => (techGrade.value < 0 ? TECHNIQUES : TECHNIQUES.filter(t => t.grade === techGrade.value)))
  const filteredTals = computed(() => (talTier.value < 0 ? TALISMANS : TALISMANS.filter(x => x.tier === talTier.value)))
  const filteredForms = computed(() => (formGroup.value === 'all' ? FORMATIONS : FORMATIONS.filter(f => f.group === formGroup.value)))
  const filteredTres = computed(() => (treTier.value < 0 ? TREASURES : TREASURES.filter(x => x.tier === treTier.value)))
  const codexInfo = (name, desc) => gameNotifys({ title: name, message: desc || '', type: 'info' })
  const travelerSeen = computed(() => Object.entries(player.value.travSeen || {}).map(([key, v]) => ({ key, ...v })))
  const tierOfSeen = t => ({ prop: 'primary', material: 'info', pill: 'warning', treasure: 'danger' }[t.kind] || 'info')
  const blindBoxStat = computed(() => player.value.blindBoxLog || { opened: 0, jackpot: 0, items: {} })
  const blindBoxItems = computed(() => Object.entries(blindBoxStat.value.items || {}).map(([key, qty]) => ({ key, qty })))
  const nameOfKey = key => {
    if (key === 'currency') return '混沌石'
    const m = MATERIALS.find(x => x.key === key)
    if (m) return m.name
    const t = TREASURES.find(x => x.key === key)
    return t ? t.name : key
  }
  // —— 图鉴收集进度 ——
  const ownProp = k => (player.value.props?.[k] || 0) > 0
  const ownPill = r => !!player.value.pills?.some(p => p.id === r.id)
  const ownTech = t => !!player.value.methods?.[t.id]
  const ownTal = t => !!player.value.talismans?.some(x => x.id === t.id)
  const ownForm = f => (player.value.formations?.[f.id] || 0) > 0
  const ownTre = t => (player.value.treasures?.[t.key] || 0) > 0
  const ownedMats = computed(() => filteredMats.value.filter(m => ownProp(m.key)))
  const ownedPills = computed(() => filteredPills.value.filter(r => ownPill(r)))
  const ownedTechs = computed(() => filteredTechs.value.filter(t => ownTech(t)))
  const ownedTals = computed(() => filteredTals.value.filter(x => ownTal(x)))
  const ownedForms = computed(() => filteredForms.value.filter(f => ownForm(f)))
  const ownedTres = computed(() => filteredTres.value.filter(t => ownTre(t)))
  // 道具背包对象转数组
  const sortedProps = computed(() => {
    const obj = player.value.props
    return Object.keys(obj).map(key => ({ name: key, num: obj[key] }))
  })

  onMounted(() => {
    achievementAll.value = achievement.all()
    illustrationsItems.value = equipAll.drawPrize(maxLv)
    startGame()
  })

  // 监听背包标签页切换
  watch(
    () => inventoryActive.value,
    type => {
      if (type == 'shop' && !player.value.shopData.length) {
        player.value.shopData = shop.drawPrize(maxLv)
      }
      if (type == 'props') gameNotifys({ title: '提示', message: '点击道具可以获取道具相关信息' })
    }
  )

  // 监听玩家属性，防止NaN值
  watch(
    () => player.value.attack,
    val => {
      if (isNaN(val)) reset()
      else return val
    }
  )

  watch(
    () => player.value.health,
    val => {
      if (isNaN(val)) reset()
      else return val
    }
  )

  watch(
    () => player.value.defense,
    val => {
      if (isNaN(val)) reset()
      else return val
    }
  )

  watch(
    () => player.value.maxHealth,
    val => {
      if (isNaN(val)) reset()
      else return val
    }
  )

  watch(
    () => player.value.critical,
    val => {
      if (isNaN(val) || val < 0) {
        storyText.value =
          '暴击属性出错, 请手动卸下身上穿的所有装备后刷新游戏<br>如果身上没有装备却一直存在此提示可以尝试穿一次装备再刷新游戏'
        return 0
      } else {
        return val
      }
    }
  )

  watch(
    () => player.value.dodge,
    val => {
      if (isNaN(val) || val < 0) {
        storyText.value =
          '闪避属性出错, 请手动卸下身上穿的所有装备后刷新游戏<br>如果身上没有装备却一直存在此提示可以尝试穿一次装备再刷新游戏'
        return 0
      } else {
        return val
      }
    }
  )

  // 初始化游戏
  const startGame = () => {
    storyText.value = '你的修仙之旅开始了。'
    actionGroups.value = [
      {
        name: '修 炼',
        actions: [
          { text: '开始修炼', handler: () => router.push('/cultivate') },
          { text: '洞府', handler: () => router.push('/manor') },
          { text: '界域飞升', handler: () => router.push('/ascension') },
          { text: '转世商店', handler: () => router.push('/rebirthShop') }
        ]
      },
      {
        name: '造 化',
        actions: [
          { text: '炼丹', handler: () => router.push('/alchemy') },
          { text: '炼器', handler: () => router.push('/forge') },
          { text: '符箓', handler: () => router.push('/talisman') },
          { text: '阵法', handler: () => router.push('/formation') }
        ]
      },
      {
        name: '商 贸',
        actions: [
          { text: '贸易市场', handler: () => router.push('/market') },
          { text: '行会商会', handler: () => router.push('/guild') },
          { text: '下界坊市', handler: () => router.push('/npc') },
          { text: '宗门', handler: () => router.push('/sect') }
        ]
      },
      {
        name: '冒 险',
        actions: [
          { text: '秘境', handler: () => router.push('/realm') },
          {
            text: '探索秘境',
            handler: () => {
              if (!player.value.isNewbie) return gameNotifys({ title: '提示', message: `新手礼包未领取` })
              if (player.value.level < 10) return gameNotifys({ title: '实力不足提示', message: `请突破到${levelNames(10)}再出去吧!` })
              router.push('/map')
            }
          },
          { text: '挑战无尽塔', handler: () => router.push('/endlesstower') },
          { text: '世界BOSS', handler: () => router.push('/boss') },
          { text: '奇遇', handler: () => doAdventure() },
          { text: '随机剧情', handler: () => doStory() }
        ]
      },
    ]
    // 初始化玩家当前气血
    player.value.health = player.value.maxHealth
  }

  // 删除脚本
  const deleteScriptData = () => {
    // 清空玩家导入的脚本
    player.value.script = ''
    // 发送提示
    gameNotifys({ title: '提示', message: '脚本删除成功' })
    // 刷新页面
    location.reload(1)
  }

  // 在上传脚本之前触发
  const scriptBeforeUpload = file => {
    // 保存当前文件
    scriptFile.value = file
    // 显示确认对话框
    uploadScript()
    // 阻止上传
    return false
  }

  // 导入脚本
  const uploadScript = () => {
    ElMessageBox.confirm('', '脚本导入须知', {
      center: true,
      message: '导入前请确认脚本可用并备份存档<br>如因导入错误脚本导致的存档游戏出现任何问题<br>作者概不负责',
      cancelButtonText: '考虑一下',
      confirmButtonText: '我会为自己的行为负责',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        const file = scriptFile.value
        const reader = new FileReader()
        reader.onload = e => {
          try {
            const script = e.target.result
            // 保存玩家导入的脚本
            player.value.script = script
            // 发送提示
            gameNotifys({ title: '提示', message: '脚本导入成功' })
            // 刷新页面
            location.reload(1)
          } catch (err) {
            err.value = err
            errBox.value = true
            gameNotifys({
              title: '脚本导入失败',
              message: '复制错误信息到QQ群内'
            })
          }
        }
        reader.readAsText(file)
      })
      .catch(() => {})
  }

  // 修改名字
  const editUserName = () => {
    const free = !player.value.nameChanged
    ElMessageBox.prompt(free ? '首次修改名字免费' : '每次修改名字需要花费100灵石', '修改名字', {
      inputPattern: /^(?=\S).*/,
      cancelButtonText: '取消修改',
      confirmButtonText: '确定修改',
      inputErrorMessage: '名字不可为空'
    })
      .then(({ value }) => {
        if (!free) {
          if (player.value.props.money < 100) {
            gameNotifys({ title: '提示', message: '灵石不足, 名字修改失败' })
            return
          }
          player.value.props.money -= 100
        }
        // 修改名字
        player.value.name = value
        player.value.nameChanged = true
        // 发送通知
        gameNotifys({ title: '提示', message: '修改成功' })
      })
      .catch(() => {})
  }

  // 清空存档
  const clearSave = () => {
    ElMessageBox.confirm('由于当前游戏版本不兼容存档版本,需要删档处理', '存档删除提示', {
      center: true,
      showClose: false,
      showCancelButton: false,
      confirmButtonText: '确定',
      closeOnClickModal: false,
      closeOnPressEscape: false
    }).then(() => {
      // 清空存档
      localStorage.removeItem('vuex')
      // 刷新页面
      location.reload(1)
    })
  }

  // 重置
  const reset = () => {
    storyText.value = '属性出错, 请添加QQ群:920930589, 上传"存档"并联系作者解决'
    ElMessageBox.confirm('你是否要导出存档?', '存档导出提示', {
      center: true,
      confirmButtonText: '确定'
    })
      .then(() => {
        exportData()
      })
      .catch(() => {})
  }

  // 刷新商店
  const refreshShop = () => {
    if (player.value.props.money < 500) {
      gameNotifys({
        title: '提示',
        message: '灵石不足, 刷新商店需要500灵石'
      })
      return
    }
    // 扣除灵石
    player.value.props.money -= 500
    // 更新鸿蒙商店数据
    player.value.shopData = shop.drawPrize(maxLv)
    gameNotifys({ title: '提示', message: '刷新成功' })
  }

  // 删档
  const deleteData = () => {
    ElMessageBox.confirm('你确定要删除存档吗?建议数据出问题的时候再删除', '数据删除提示', {
      center: true,
      cancelButtonText: '我点错了',
      confirmButtonText: '确定以及肯定'
    })
      .then(() => {
        gameNotifys({ title: '提示', message: '存档删除成功' })
        // 清空存档
        localStorage.removeItem('vuex')
        // 刷新页面
        location.reload(1)
      })
      .catch(() => {})
  }

  // 进入下一世轮回
  const restartGame = () => {
    ElMessageBox.confirm('确定要进入下一世轮回吗? 本世的境界/修为/宗门/资质将重置，永久传承(装备/功法/界域/转世数)会保留。', '进入下一世轮回', {
      center: true,
      cancelButtonText: '再想想',
      confirmButtonText: '轮回转世',
      type: 'warning'
    })
      .then(() => {
        const res = performRebirth(player.value)
        showRebirth(res)
      })
      .catch(() => {})
  }

  // 轮回结算弹窗
  const showRebirth = info => {
    ElMessageBox.alert(rebirthSummaryHtml(info), '轮回结算', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '进入新世',
      cancelButtonText: '关闭'
    })
  }

  // 奇遇：70% 得好 / 30% 遭殃，带回冷却
  const doAdventure = () => {
    if (!canAdventure(player.value)) {
      gameNotifys({ title: '奇遇', message: `时机未到，冷却中(${adventureCooldownLeft(player.value)}秒)` })
      return
    }
    const res = triggerAdventure(player.value)
    const tag = res.good ? 'E6A23C' : 'F56C6C'
    storyText.value += `<p style="color:#${tag}">【奇遇·${res.type}】${res.desc}</p>`
    gameNotifys({ title: res.good ? '奇遇·好运' : '奇遇·凶险', message: `【${res.type}】${res.desc}`, type: res.good ? 'success' : 'error' })
  }

  // 随机剧情：抽一段奇遇/传承/试炼，按成败结算奖励
  const storyDlg = reactive({ show: false, title: '', text: '', event: null, choices: [] })
  const doStory = () => {
    const ev = rollStory(player.value)
    if (!ev) {
      gameNotifys({ title: '随机剧情', message: '当前没有可触发的剧情', type: 'info' })
      return
    }
    // 分支剧情：弹出选项
    if (ev.choices && ev.choices.length) {
      storyDlg.show = true
      storyDlg.title = `【${ev.type}】${ev.title}`
      storyDlg.text = ev.text
      storyDlg.event = ev
      storyDlg.choices = ev.choices
      return
    }
    // 普通剧情：直接应验
    ElMessageBox.alert(
      `<div style="text-align:left"><b>【${ev.type}】${ev.title}</b><br>${ev.text}</div>`,
      '随机剧情',
      { dangerouslyUseHTMLString: true, confirmButtonText: '前往应验' }
    )
      .then(() => {
        const res = resolveStory(player.value, ev)
        if (res.ok) {
          gameNotifys({ title: `${ev.title}·应验`, message: `机缘达成：${res.texts.join('，')}`, type: 'success' })
        } else {
          gameNotifys({ title: `${ev.title}·失手`, message: `${res.reason}${res.texts?.length ? '（' + res.texts.join('，') + '）' : ''}`, type: 'warning' })
        }
      })
      .catch(() => {})
  }

  const pickStory = i => {
    const ev = storyDlg.event
    const choice = storyDlg.choices[i]
    if (!ev || !choice) return
    storyDlg.show = false
    const res = resolveStoryChoice(player.value, ev, choice)
    if (res.ok) {
      gameNotifys({ title: `${ev.title}·${choice.label}`, message: `${choice.outcome || ''}\n机缘：${res.texts.join('，')}`, type: 'success' })
    } else {
      gameNotifys({ title: `${ev.title}·${choice.label}`, message: `${res.reason}${res.texts?.length ? '（' + res.texts.join('，') + '）' : ''}`, type: 'warning' })
    }
  }

  // 电脑导入存档
  const importData = data => {
    const file = data.file
    const reader = new FileReader()
    reader.onload = e => {
      try {
        // 导入存档
        localStorage.setItem('vuex', e.target.result)
        // 刷新页面
        location.reload(1)
      } catch (err) {
        err.value = err
        errBox.value = true
        gameNotifys({
          title: '脚本导入失败',
          message: '复制错误信息到QQ群内'
        })
      }
    }
    reader.readAsText(file)
  }

  // 导出存档
  const exportData = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const hours = String(today.getHours()).padStart(2, '0')
    const minutes = String(today.getMinutes()).padStart(2, '0')
    const seconds = String(today.getSeconds()).padStart(2, '0')
    const blob = new Blob([localStorage.getItem('vuex')], {
      type: 'application/json;charset=utf-8'
    })
    const name = `我的文字修仙全靠刷-${year}${month}${day}${hours}${minutes}${seconds}-${ver.value}.json`
    saveAs(blob, name)
  }

  // 批量分解装备弹窗
  const sellingEquipmentBox = () => {
    show.value = false
    sellingEquipmentShow.value = true
  }

  // 道具锁定or道具解锁
  const inventoryLock = id => {
    let inventoryItem = getObjectById(id, player.value.inventory)
    inventoryItem.lock = !inventoryItem.lock
    gameNotifys({
      title: !inventoryItem.lock ? '装备解锁提示' : '装备锁定提示',
      message: !inventoryItem.lock ? '装备解锁成功' : '装备锁定成功'
    })
  }
  // 灵宠出战
  const petCarry = item => {
    // 根据灵宠id查找灵宠信息
    const petItem = getObjectById(item.id, player.value.pets)
    // 如果已经有灵宠出战就收回
    if (JSON.stringify(player.value.pet) != '{}') {
      const itemInfo = player.value.pet
      // 更新玩家属性，移除出战灵宠的属性加成
      playerAttribute(-itemInfo.dodge, -itemInfo.attack, -itemInfo.health, -itemInfo.critical, -itemInfo.defense)
      // 收回当前出战的灵宠
      player.value.pets.push(player.value.pet)
    }
    // 关闭灵宠信息弹窗
    petShow.value = false
    // 出战当前选择的灵宠
    player.value.pet = petItem
    // 更新玩家属性，添加当前出战灵宠的属性加成
    playerAttribute(petItem.dodge, petItem.attack, petItem.health, petItem.critical, petItem.defense)
    // 从灵宠背包中移除这个灵宠
    player.value.pets = player.value.pets.filter(i => i.id !== item.id)
  }

  // 放生灵宠
  const petClose = item => {
    ElMessageBox.confirm(
      `你确定要放生<span class="el-tag el-tag--${computePetsLevel(item.level)}">${item.name}(${levelNames(
        item.level
      )})</span>吗?`,
      '灵宠放生通知',
      {
        center: true,
        cancelButtonText: '取消放生',
        confirmButtonText: '确定放生',
        dangerouslyUseHTMLString: true
      }
    )
      .then(() => {
        // 灵宠转生次数
        const reincarnation = item.reincarnation ? item.reincarnation : 1
        // 获得的培养丹数量
        const num = item.level * reincarnation
        // 关闭灵宠信息弹窗
        petShow.value = false
        // 增加培养丹数量
        player.value.props.cultivateDan += num
        // 删除道具
        player.value.pets = player.value.pets.filter(obj => obj.id !== item.id)
        // 装备分解通知
        gameNotifys({
          title: `${item.name}已成功放生`,
          message: `对方临走时赠与了你${num}个培养丹`
        })
      })
      .catch(() => {})
  }

  // 道具锁定or道具解锁
  const petLock = item => {
    item.lock = !item.lock
    gameNotifys({
      title: !item.lock ? '灵宠解锁提示' : '灵宠锁定提示',
      message: !item.lock ? '灵宠解锁成功' : '灵宠锁定成功'
    })
  }

  // 计算身上装备和背包装备差值
  const calculateDifference = (item1, item2) => {
    item1 = item1 || 0
    item2 = item2 || 0
    const isFloat = num => {
      return Number(num) === num && num % 1 !== 0
    }
    const Float = item1 - parseFloat(item2) < -1 ? -1 : item1 - parseFloat(item2) > 1 ? 1 : item1 - parseFloat(item2)
    const ojb = {
      num: isFloat(item1) || isFloat(item2) ? (Float * 100).toFixed(2) + '%' : item1 - parseInt(item2),
      icon: item1 > item2 ? 'success el-icon-caret-top' : item1 == item2 ? '' : 'danger el-icon-caret-bottom'
    }
    ojb.num = ojb.num == 0 ? '' : ojb.num
    return ojb
  }

  // 灵宠升级
  const petUpgrade = item => {
    // 计算灵宠升级所需材料数量
    const consume = petConsumption(item.level)

    // 如果勾选了提升悟性但是悟性丹不足
    if (petRootBone.value && player.value.props.rootBone < item.rootBone) {
      // 发送通知
      gameNotifys({
        title: '灵宠培养提示',
        message: '悟性丹不足, 无法提升灵宠悟性',
        position: 'top-left'
      })
      return
    }
    // 如果勾选了灵宠转生但是人物转生不等于灵宠转生
    if (petReincarnation.value && player.value.reincarnation < player.value.pet.reincarnation) {
      // 发送通知
      gameNotifys({
        title: '灵宠培养提示',
        message: '灵宠转生不能高于人物转生',
        position: 'top-left'
      })
      return
    }
    // 如果勾选了灵宠转生但是灵宠等级没满
    if (petReincarnation.value && maxLv > item.level) {
      // 发送通知
      gameNotifys({
        title: '灵宠培养提示',
        message: '灵宠境界未满无法转生',
        position: 'top-left'
      })
      return
    }
    // 如果没有勾选灵宠转生并且境界满了
    if (!petReincarnation.value && item.level >= maxLv) {
      // 发送通知
      gameNotifys({
        title: '灵宠培养提示',
        message: '灵宠境界已满请转生',
        position: 'top-left'
      })
      return
    }
    // 如果培养丹不足
    if (consume > player.value.props.cultivateDan) {
      // 发送通知
      gameNotifys({
        title: '灵宠培养提示',
        message: '培养丹不足, 进行无法培养',
        position: 'top-left'
      })
      return
    }
    // 灵宠培养确认弹窗
    ElMessageBox.confirm('你确定要培养该灵宠吗?', '灵宠培养提示', {
      cancelButtonText: '我点错了',
      confirmButtonText: '确定以及肯定'
    })
      .then(() => {
        let attack,
          health,
          defense = 0
        // 如果勾选了提升悟性并且悟性丹足够
        if (petRootBone.value && player.value.props.rootBone >= item.rootBone) {
          let rootBone = item.initial.rootBone - item.rootBone
          rootBone = rootBone ? rootBone : 1
          // 攻击
          attack = Math.floor(item.initial.attack * rootBone)
          // 血量
          health = Math.floor(item.initial.health * rootBone)
          // 防御
          defense = Math.floor(item.initial.defense * rootBone)
          // 提升悟性
          item.rootBone++
          // 扣除悟性丹
          player.value.props.rootBone -= item.rootBone
        } else {
          // 攻击
          attack = Math.floor(item.initial.attack * 0.05)
          // 血量
          health = Math.floor(item.initial.health * 0.05)
          // 防御
          defense = Math.floor(item.initial.defense * 0.05)
        }
        // 如果勾选了转生并且当前等级已满
        if (petReincarnation.value && item.level >= maxLv) {
          // 重置灵宠等级
          player.value.pet.level = 1
          // 取消转生勾选
          petReincarnation.value = false
          // 增加灵宠转生次数
          player.value.pet.reincarnation++
          // 发送通知
          gameNotifys({
            title: '灵宠培养提示',
            message: '灵宠转生成功, 已重置灵宠境界',
            position: 'top-left'
          })
        } else {
          // 增加灵宠等级
          player.value.pet.level++
          // 发送通知
          gameNotifys({
            title: '灵宠培养提示',
            message: '灵宠培养成功',
            position: 'top-left'
          })
        }
        // 增加灵宠属性
        player.value.pet.attack += attack
        player.value.pet.health += health
        player.value.pet.defense += defense
        // 更新玩家属性，添加灵宠培养后的属性加成
        playerAttribute(0, attack, health, 0, defense)
        // 重新计算灵宠评分
        player.value.pet.score = equip.calculateEquipmentScore(
          player.value.pet.dodge,
          player.value.pet.attack,
          player.value.pet.health,
          player.value.pet.critical,
          player.value.pet.defense
        )
        // 扣除培养丹
        player.value.props.cultivateDan -= consume
      })
      .catch(() => {})
  }
  // 道侣升级
  const wifeUpgrade = item => {
    // 计算道侣升级所需材料数量
    const consume = item.level * 10
    // 如果情缘点不足
    if (consume > player.value.props.qingyuan) {
      // 发送通知
      gameNotifys({
        title: '道侣升级提示',
        message: '情缘点不足, 进行无法培养',
        position: 'top-left'
      })
      return
    }
    // 道侣升级确认弹窗
    ElMessageBox.confirm('你确定要升级该道侣吗?', '道侣升级提示', {
      cancelButtonText: '我点错了',
      confirmButtonText: '确定以及肯定'
    })
      .then(() => {
        const attack = Math.floor(item.attack * 0.1)
        const health = Math.floor(item.health * 0.1)
        const defense = Math.floor(item.defense * 0.1)
        // 增加道侣等级
        player.value.wife.level++
        // 发送通知
        gameNotifys({
          title: '道侣升级提示',
          message: '道侣升级提示成功',
          position: 'top-left'
        })
        // 增加道侣属性
        player.value.wife.attack += attack
        player.value.wife.health += health
        player.value.wife.defense += defense
        // 更新玩家属性，添加道侣升级后的属性加成
        playerAttribute(0, attack, health, 0, defense)
        // 扣除情缘点
        player.value.props.qingyuan -= consume
      })
      .catch(() => {})
  }

  // 计算灵宠升级所需消耗
  const petConsumption = lv => {
    // 是否勾选转生选项
    const cost = petReincarnation.value ? 10 : 1
    // 转生次数
    const reincarnation = player.value.pet.reincarnation ? lv * 200 : 1
    return (lv * 200 + reincarnation) * cost
  }

  // 购买装备
  const shopBuy = item => {
    if (player.value.props.currency >= shopPrice.value) {
      // 扣除混沌石
      player.value.props.currency -= shopPrice.value
      // 如果装备背包当前容量大于等于背包总容量
      if (player.value.inventory.length >= effectiveBackpackCap(player.value))
        storyText.value = `当前装备背包容量已满, 该装备自动丢弃, 转生可增加背包容量`
      // 添加到背包
      else player.value.inventory.push(item)
      // 跳转背包相关页
      inventoryActive.value = 'equipment'
      equipmentActive.value = item.type
      gameNotifys({
        title: '购买提示',
        message: `您成功花费${shopPrice.value}混沌石购买${item.name}`
      })
    } else {
      gameNotifys({ title: '购买提示', message: '购买失败, 混沌石不足' })
    }
  }
  // 道侣跟随
  const wifeTack = item => {
    // 如果已经有道侣跟随就收回
    if (JSON.stringify(player.value.wife) != '{}') {
      const itemInfo = player.value.wife
      // 更新玩家属性，移除跟随道侣的属性加成
      playerAttribute(-itemInfo.dodge, -itemInfo.attack, -itemInfo.health, -itemInfo.critical, -itemInfo.defense)
      // 收回当前跟随的道侣
      player.value.wifes.push(player.value.wife)
    }
    player.value.wife = item
    // 更新玩家属性，添加当前跟随道侣的属性加成
    playerAttribute(item.dodge, item.attack, item.health, item.critical, item.defense)
    // 从道侣背包中移除这个道侣
    player.value.wifes = player.value.wifes.filter(i => i.name !== item.name)
  }
  // 道侣收回
  const wifeRevoke = () => {
    const item = player.value.wife
    // 更新玩家属性，移除当前跟随道侣的属性加成
    playerAttribute(-item.dodge, -item.attack, -item.health, -item.critical, -item.defense)
    // 收回当前跟随的道侣
    player.value.wife = {}
    player.value.wifes.push(item)
  }
  // 道侣信息
  const wifeItemInfo = item => {
    ElMessageBox.confirm('', item.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
      <p>境界: ${levelNames(item.level)}</p>
      <p>气血: ${formatNumberToChineseUnit(item.health)}</p>
      <p>攻击: ${formatNumberToChineseUnit(item.attack)}</p>
      <p>防御: ${formatNumberToChineseUnit(item.defense)}</p>
      </div>
    </div>`,
      confirmButtonText: '跟随',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        wifeTack(item)
      })
      .catch(() => {})
  }
  // 商店装备信息
  const shopItemInfo = item => {
    ElMessageBox.confirm('', item.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
      <p>价格: ${shopPrice.value}混沌石</p>
      <p>类型: ${genre[item.type]}</p>
      <p>境界: ${levelNames(item.level)}</p>
      <p>品质: ${levels[item.quality]}</p>
      <p>气血: ${formatNumberToChineseUnit(item.health)}</p>
      <p>攻击: ${formatNumberToChineseUnit(item.attack)}</p>
      <p>防御: ${formatNumberToChineseUnit(item.defense)}</p>
      <p>闪避率: ${item.dodge > 0 ? (item.dodge * 100 > 100 ? 100 : (item.dodge * 100).toFixed(2)) : 0}%</p>
      <p>暴击率: ${item.critical > 0 ? (item.critical * 100 > 100 ? 100 : (item.critical * 100).toFixed(2)) : 0}%</p>
      <p>装备评分: ${Math.round(item.score || 0).toLocaleString('zh-CN')}</p>
      </div>
    </div>`,
      cancelButtonText: '取消购买',
      confirmButtonText: '购买装备',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        shopBuy(item)
      })
      .catch(() => {})
  }
  // 生成新手礼包：普通=玄~仙品，彩蛋(1018)=帝~道品
  const genNewBiePack = easter => {
    const lv = easter ? 20 : 10
    const band = easter ? ['warning', 'danger', 'cyan', 'orange', 'gold', 'legendary'] : ['success', 'primary', 'purple', 'pink']
    const genKeys = ['equip_Weapons', 'equip_Armors', 'equip_Accessorys', 'equip_Sutras']
    const pack = []
    genKeys.forEach(key => {
      let item
      if (easter) {
        // 彩蛋(1018)：在高品阶中均匀随机选一个品质，随机生成装备
        const quality = band[Math.floor(Math.random() * band.length)]
        item = equip[key](lv, false, quality)
      } else {
        for (let i = 0; i < 40; i++) {
          item = equip[key](lv, false)
          if (band.includes(item.quality)) break
        }
      }
      if (item) {
        item.noReq = true // 新手礼包装备无穿戴限制（保留等级用于展示/计算，穿戴时跳过境界校验）
        pack.push(item)
      }
    })
    return pack
  }

  const doFullReset = () => {
    ElMessageBox.confirm('完全重开将清空所有进度（境界/装备/功法/灵石/混沌石/筹码/转世/道痕等），如同新号且不可逆！是否继续？', '完全重开', {
      confirmButtonText: '完全重开',
      cancelButtonText: '取消',
      type: 'error'
    })
      .then(() => {
        fullReset(player.value)
        gameNotifys({ title: '完全重开', message: '已重开新号，所有进度清空（页面将刷新）', type: 'success' })
        window.location.reload()
      })
      .catch(() => {})
  }

  // 打开新手礼包抽屉
  const newbiePack = () => {
    if (player.value.isNewbie) {
      gameNotifys({ title: '提示', message: '新手礼包无法重复领取' })
      return
    }
    newBieBox.value = true
    newBieCode.value = ''
    newBieEgg.value = false
    // 打开即自动生成一份，保证一定能领
    try {
      newBieData.value = genNewBiePack(false)
    } catch (e) {
      newBieData.value = []
    }
  }

  // 输入4位数字开包（1018 触发彩蛋）
  const openNewBie = () => {
    const code = (newBieCode.value || '').trim()
    if (!/^\d{4}$/.test(code)) {
      gameNotifys({ title: '提示', message: '请输入 4 位数字（0000-9999）' })
      return
    }
    const easter = code === '1018'
    newBieData.value = genNewBiePack(easter)
    newBieEgg.value = easter
  }

  // 换一个数字
  const refreshNewBie = () => {
    newBieCode.value = ''
    newBieEgg.value = false
    newBieData.value = []
  }

  // 新手礼包装备信息
  const newBieInfo = item => {
    newBieItem.value = item
    newBieInfoBox.value = true
  }

  // 确定领取新手礼包
  const confirmCollectionNewBie = () => {
    if (!newBieData.value.length) {
      // 兜底：自动生成再领
      try {
        newBieData.value = genNewBiePack(false)
      } catch (e) {
        newBieBox.value = false
        return
      }
    }
    ElMessageBox.confirm('你确定已经获得到了自己满意的装备了吗?', '提示', {
      center: true,
      cancelButtonText: '不确定',
      confirmButtonText: '确定',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        // 关闭弹窗
        newBieBox.value = false
        // 更新玩家装备
        player.value.inventory = [...(player.value.inventory || []), ...newBieData.value]
        // 清空
        newBieData.value = []
        // 修改礼包领取状态
        player.value.isNewbie = true
        // 附赠功法卷轴：以幸运数字为种子，不同数字出不同功法；彩蛋(1018)高一档
        const seed = (parseInt(newBieCode.value, 10) || 0) || (Date.now() & 0xffffffff)
        const granted = grantSeededScrolls(player.value, seed, { easter: !!newBieEgg.value, count: 2 })
        const techGifts = granted.map(t => `功法卷轴【${t.name}】`)
        const giftText = techGifts.length ? '，并获赠' + techGifts.join('、') : ''
        // 彩蛋(1018)额外资源
        const gotEgg = newBieEgg.value
        if (gotEgg) {
          player.value.props.money += 50000
          player.value.props.spiritHerb += 200
          player.value.props.cultivateDan += 10
          player.value.props.strengtheningStone += 100
          player.value.props.rootBone += 2
          player.value.props.currency += 3
          addTreasure(player.value, TREASURES[Math.floor(Math.random() * TREASURES.length)].key, 1)
          const pill = RECIPES[Math.floor(Math.random() * RECIPES.length)]
          if (!player.value.pills) player.value.pills = []
          const exP = player.value.pills.find(p => p.id === pill.id)
          if (exP) exP.count++
          else player.value.pills.push({ id: pill.id, count: 1 })
          const tal = TALISMANS[Math.floor(Math.random() * TALISMANS.length)]
          if (!player.value.talismans) player.value.talismans = []
          const exT = player.value.talismans.find(x => x.id === tal.id)
          if (exT) exT.count++
          else player.value.talismans.push({ id: tal.id, count: 1 })
        }
        newBieEgg.value = false
        gameNotifys({
          title: '新手礼包领取提示',
          message: gotEgg
            ? `新手礼包领取成功! 彩蛋大礼已到账：5万灵石/灵草200/培养丹10/炼器石100/悟性丹2/混沌石3 + 天材地宝/丹药/符箓各1${giftText}`
            : `新手礼包领取成功!${giftText}`
        })
      })
      .catch(() => {})
  }

  // 分解装备
  const inventoryClose = item => {
    ElMessageBox.confirm(
      `你确定要分解<span class="el-tag el-tag--${item.quality}">${levels[item.quality]}${item.name}(${
        genre[item.type]
      })</span>吗?`,
      '装备分解通知',
      {
        center: true,
        cancelButtonText: '取消分解',
        confirmButtonText: '确定分解',
        dangerouslyUseHTMLString: true
      }
    )
      .then(() => {
        const num = item.level + Math.floor((item.level * player.value.reincarnation) / 10)
        // 增加炼器石数量
        player.value.props.strengtheningStone += num
        // 删除背包装备
        player.value.inventory = player.value.inventory.filter(obj => obj.id !== item.id)
        // 关闭装备信息弹窗
        inventoryShow.value = false
        // 装备分解通知
        gameNotifys({
          title: '背包装备售卖提示',
          message: `${item.name}已成功卖出, 你获得了${num}个炼器石`
        })
      })
      .catch(() => {})
  }

  // 根据装备ID给出信息
  const getObjectById = (id, arr) => {
    return arr.find(obj => obj.id === id)
  }

  // 道具信息
  const inventory = id => {
    inventoryInfo.value = getObjectById(id, player.value.inventory)
    inventoryShow.value = true
  }

  // 灵宠信息
  const petItemInfo = item => {
    petShow.value = true
    petInfo.value = item
  }

  // 灵宠收回
  const petRetract = () => {
    const item = player.value.pet
    if (JSON.stringify(item) == '{}') return
    // 更新玩家属性，移除当前出战灵宠的属性加成
    playerAttribute(-item.dodge, -item.attack, -item.health, -item.critical, -item.defense)
    // 跳转背包相关页
    inventoryActive.value = 'pet'
    // 添加灵宠到灵宠背包里
    player.value.pets.push(item)
    // 收回当前出战的灵宠
    player.value.pet = {}
  }

  // 计算灵宠等级
  const computePetsLevel = lv => {
    if (lv >= 1 && lv <= 9) return 'success'
    if (lv >= 10 && lv <= 19) return 'primary'
    if (lv >= 20 && lv <= 29) return 'warning'
    if (lv >= 30) return 'danger'
  }

  // 玩家属性操作
  const playerAttribute = (dodge = 0, attack = 0, health = 0, critical = 0, defense = 0) =>
    applyPlayerAttribute(player.value, dodge, attack, health, critical, defense)

  // 卸装备
  const equipmentClose = type => {
    if (!removeEquip(player.value, type).ok) return
    // 切换背包相关页
    equipmentActive.value = type
  }

  // 穿装备
  const equipItem = (id, type) => {
    const r = wearEquip(player.value, id, type)
    if (!r.ok) {
      gameNotifys({ title: '当前境界不足', message: r.reason })
      return
    }
    inventoryShow.value = false
  }

  //获取角色当前装备
  const getEquipmentInfo = (id, type) => {
    if (!id || !type) return
    const equipment = getObjectById(id, player.value.inventory.concat(player.value.equipment[type]))
    if (!equipment) return
    // 需要炼器的装备信息
    strengthenInfo.value = equipment
    // 炼器等级
    if (player.value.equipment[type] && !player.value.equipment[type].hasOwnProperty('strengthen')) {
      player.value.equipment[type].strengthen = equipment?.strengthen ? equipment?.strengthen : 0
    }
  }

  // 装备信息
  const equipmentInfo = (id, type) => {
    if (id) {
      // 打开炼器弹窗
      strengthenShow.value = true
      getEquipmentInfo(id, type)
    }
  }

  // 装备排序
  const equipmentDropdown = command => {
    equipmentDropdownActive.value = command
    player.value.inventory = player.value.inventory.slice().sort((a, b) => b[command] - a[command])
  }
  // 灵宠排序
  const petDropdown = command => {
    petDropdownActive.value = command
    player.value.pets = player.value.pets.slice().sort((a, b) => b[command] - a[command])
  }

  // 属性加点
  const pointNum = () => {
    const rin = player.value.reincarnation || 0
    const rinMult = rin ? Math.min(60, rin * 10) : 1
    const lvMult = 1 + Math.min(2, Math.floor((player.value.level || 0) / 45))
    return rinMult * lvMult
  }
  const pointBonus = type => ((type === 'health' ? 150 : 75) * pointNum())
  const spentPoints = computed(() => {
    const a = player.value.pointAlloc || {}
    return (a.attack || 0) + (a.defense || 0) + (a.health || 0)
  })
  const backpackCapNow = computed(() => effectiveBackpackCap(player.value))
  const attributePoints = type => {
    const typeNames = {
      attack: '攻击',
      health: '气血',
      defense: '防御'
    }
    if (player.value.points > 0) {
      const b = pointBonus(type)
      // 如果是攻击
      if (type == 'attack') playerAttribute(0, b, 0, 0, 0)
      // 如果是防御
      else if (type == 'defense') playerAttribute(0, 0, 0, 0, b)
      // 如果是血量
      else if (type == 'health') playerAttribute(0, 0, b, 0, 0)
      if (!player.value.pointAlloc) player.value.pointAlloc = { attack: 0, defense: 0, health: 0 }
      player.value.pointAlloc[type] = (player.value.pointAlloc[type] || 0) + 1
      // 扣除点数
      player.value.points--
      gameNotifys({
        title: '加点提示',
        message: `加点成功${typeNames[type]}增加了${b}点`
      })
    }
  }

  // 重置境界点：1000 灵石/次，返还已分配点数并清空其属性加成
  const resetPoints = () => {
    const alloc = player.value.pointAlloc || { attack: 0, defense: 0, health: 0 }
    const spent = (alloc.attack || 0) + (alloc.defense || 0) + (alloc.health || 0)
    if (!spent) {
      gameNotifys({ title: '提示', message: '当前没有已分配的境界点，无需重置' })
      return
    }
    const cost = 1000
    if ((player.value.props.money || 0) < cost) {
      gameNotifys({ title: '提示', message: `灵石不足，重置需 ${cost} 灵石` })
      return
    }
    ElMessageBox.confirm(
      `将返还已分配的 ${spent} 点境界点并清空其属性加成，需 ${cost} 灵石。确定重置？`,
      '重置境界点',
      { confirmButtonText: '重置', cancelButtonText: '取消' }
    )
      .then(() => {
        const atk = (alloc.attack || 0) * pointBonus('attack')
        const def = (alloc.defense || 0) * pointBonus('defense')
        const hp = (alloc.health || 0) * pointBonus('health')
        playerAttribute(0, -atk, -hp, 0, -def)
        player.value.props.money -= cost
        player.value.points += spent
        player.value.pointAlloc = { attack: 0, defense: 0, health: 0 }
        gameNotifys({ title: '重置成功', message: `返还 ${spent} 点境界点，可重新加点`, type: 'success' })
      })
      .catch(() => {})
  }
  // 计算所需修为相差百分比
  const calculatePercentageDifference = (num1, num2) => {
    let difference = Math.abs(num1 - num2)
    let percentage = (difference / num1) * 100
    const num3 = player.value.maxCultivation - player.value.cultivation > 0 ? 100 - percentage : 100
    // return percentage < 0 ? 100 : 100 - percentage;
    return `${num3.toFixed(2)}%`
  }
  const copyContent = type => {
    const content = type == 'qq' ? '920930589' : 'https://github.com/setube/vue-XiuXianGame'
    ElMessageBox.prompt('', type == 'qq' ? '官方群聊' : '开源地址', {
      inputValue: content,
      showCancelButton: false,
      confirmButtonText: '复制',
      beforeClose: async (action, instance, done) => {
        if (action === 'confirm') {
          if (window.navigator.clipboard) {
            try {
              await window.navigator.clipboard.writeText(content)
              done()
              // 关闭弹窗
              show.value = false
              gameNotifys({ title: '提示', message: '复制成功' })
            } catch (err) {
              gameNotifys({
                title: '提示',
                message: '复制失败, 请手动复制'
              })
            }
          }
        } else {
          done()
        }
      }
    }).catch(() => {})
  }

  const getTagClass = (type, index) => {
    const achievements1 = player.value.achievement[type] || []
    return Array.isArray(achievements1) && achievements1.some(ach => ach.id === index)
  }

  // 成就详细
  const rarityLabel = r => ({ common: '', rare: '稀有', epic: '史诗', legend: '传说' }[r] || '稀有')
  const achievementInfo = (type, item) => {
    let message = ''
    if (
      item.condition.health ||
      item.condition.attack ||
      item.condition.defense ||
      item.condition.dodge ||
      item.condition.critical
    ) {
      message = `
    <p>气血: ${item.condition.health || '无要求'}</p>
    <p>攻击: ${item.condition.attack || '无要求'}</p>
    <p>防御: ${item.condition.defense || '无要求'}</p>
    <p>闪避率: ${item.condition.dodge ? (item.condition.dodge * 100).toFixed(2) + '%' : '无要求'}</p>
    <p>暴击率: ${item.condition.critical ? (item.condition.critical * 100).toFixed(2) + '%' : '无要求'}</p>`
    } else if (item.condition.maxFamily || item.condition.lowFamily) {
      message = `<p>出生家境: ${item.condition.maxFamily ? item.condition.maxFamily + '/10 以上' : '≤3/10(寒门)'}</p>`
      if (item.condition.level) message += `<p>达到境界: ${levelNames(item.condition.level)}</p>`
    } else if (item.condition.level) {
      message = `<p>达到境界: ${levelNames(item.condition.level)}</p>`
    } else if (item.condition.reincarnation) {
      message = `<p>转世次数: ${item.condition.reincarnation}</p>`
    } else if (item.condition.realmStage) {
      message = `<p>界域印记: ${item.condition.realmStage}</p>`
    } else if (item.condition.adventure) {
      message = `<p>奇遇次数: ${item.condition.adventure}</p>`
    } else if (item.condition.realmTimes) {
      message = `<p>秘境探索: ${item.condition.realmTimes}</p>`
    } else if (item.condition.talentCount) {
      message = `<p>累计获得天赋数量: ${item.condition.talentCount}</p>`
    } else if (item.condition.rarePlus) {
      message = `<p>拥有上品及以上天赋数量: ${item.condition.rarePlus}</p>`
    } else if (item.condition.legendary) {
      message = `<p>拥有神品天赋数量: ${item.condition.legendary}</p>`
    } else if (item.condition.monstersDefeated) {
      message = `<p>击败怪物数量: ${item.condition.monstersDefeated}</p>`
    } else if (item.condition.money) {
      message = `<p>累积灵石: ${formatNumberToChineseUnit(item.condition.money)}</p>`
    }
    if (item.desc) {
      message += `<p>描述: ${item.desc}</p>`
    }
    message += `<p>完成奖励: ${item.award}培养丹</p>`
    message += `<p>称号加成: ${item.titleBonus ? formatTitleBonus(item.titleBonus) : '无'}</p>`
    message += `<p>永久加成: ${item.perk ? formatTitleBonus(item.perk) : '无'}</p>`
    const isCompleted = getTagClass(type, item.id)
    const isWearing = player.value.currentTitle === item.name
    ElMessageBox.confirm('', `${item.name}`, {
      center: true,
      message: `<div class="monsterinfo"><div class="monsterinfo-box">${message}</div></div>`,
      cancelButtonText: '关闭',
      showCancelButton: isCompleted,
      confirmButtonText: isCompleted ? (isWearing ? '取消佩戴' : '佩戴称号') : '知道了',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        if (isCompleted) toggleTitle(item)
      })
      .catch(() => {})
  }

  // 新增方法
  const formatTitleBonus = bonus => {
    return Object.entries(bonus)
      .map(([key, value]) => {
        const num = value > 1 ? value : `${value * 100}%`
        return `${dropdownTypeObject[key]}+${num}`
      })
      .join(', ')
  }

  const toggleTitle = achievement => {
    if (player.value.currentTitle === achievement.name) {
      // 取消佩戴称号
      applyTitleBonus(achievement.titleBonus, false)
      player.value.currentTitle = null
      gameNotifys({
        title: '称号系统',
        message: `你取消佩戴了称号"${achievement.name}"`
      })
    } else {
      // 佩戴新称号
      if (player.value.currentTitle) {
        // 如果已经佩戴了称号，先移除旧称号的加成
        const oldAchievement = findAchievementByTitle(player.value.currentTitle)
        if (oldAchievement) applyTitleBonus(oldAchievement.titleBonus, false)
      }
      applyTitleBonus(achievement.titleBonus, true)
      player.value.currentTitle = achievement.name
      gameNotifys({
        title: '称号系统',
        message: `你佩戴了称号"${achievement.name}"`
      })
    }
  }

  const applyTitleBonus = (bonus, isApplying) => {
    const multiplier = isApplying ? 1 : -1
    let dodge = 0,
      attack = 0,
      health = 0,
      critical = 0,
      defense = 0
    Object.entries(bonus).forEach(([key, value]) => {
      switch (key) {
        case 'dodge':
          dodge += value * multiplier
          break
        case 'attack':
          attack += value * multiplier
          break
        case 'health':
          health += value * multiplier
          break
        case 'critical':
          critical += value * multiplier
          break
        case 'defense':
          defense += value * multiplier
          break
        default:
      }
    })
    playerAttribute(dodge, attack, health, critical, defense)
  }
  const findAchievementByTitle = title => {
    return achievementAll.value.flatMap(category => category.data).find(ach => ach.name === title)
  }

  // 图鉴装备信息
  const illustrationsInfo = (i, ii) => {
    const info = illustrationsItems.value[i].data[ii]
    ElMessageBox.confirm('', info.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
        <p>类型: ${genre[info.type]}</p>
        <p>境界: ${levelNames(info.level)}</p>
        <p>品质: ${levels[info.quality]}</p>
        <p>气血: ${formatNumberToChineseUnit(info.health)}</p>
        <p>攻击: ${formatNumberToChineseUnit(info.attack)}</p>
        <p>防御: ${formatNumberToChineseUnit(info.defense)}</p>
        <p>闪避率: ${info.dodge > 0 ? (info.dodge * 100 > 100 ? 100 : (info.dodge * 100).toFixed(2)) : 0}%</p>
        <p>暴击率: ${info.critical > 0 ? (info.critical * 100 > 100 ? 100 : (info.critical * 100).toFixed(2)) : 0}%</p>
        <p>装备评分: ${Math.round(info.score || 0).toLocaleString('zh-CN')}</p>
        <p>获得率: ${info.prize}%</p>
      </div>
    </div>`,
      cancelButtonText: '关闭',
      showCancelButton: false,
      confirmButtonText: '知道了',
      dangerouslyUseHTMLString: true
    }).catch(() => {})
  }
</script>

<style scoped>
  .index-box {
    margin-top: 15px;
  }

  .left-fabs {
    position: fixed;
    top: 78px;
    left: 10px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .money-banner {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 21;
    background: linear-gradient(135deg, #f7e9b0, #e6c477);
    border: 1px solid #d8b35a;
    color: #7a5b12;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .left-fab {
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid var(--el-border-color);
    color: var(--el-text-color-primary);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .dark .left-fab {
    background: rgba(30, 30, 30, 0.9);
    border-color: var(--el-border-color);
  }

  @media only screen and (max-width: 768px) {
    .left-fabs {
      top: auto;
      bottom: 10px;
      left: 6px;
      right: 6px;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
    }
    .left-fab {
      padding: 5px 9px;
      font-size: 12px;
    }
    .money-banner {
      position: static;
      width: fit-content;
      margin: 4px auto 8px;
      font-size: 12px;
    }
    .index-box {
      padding-bottom: 78px;
    }
  }

  .group-tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  .quest-tip {
    margin-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }

  .guide-banner {
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .guide-banner.urgent {
    background: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning-light-7);
    color: var(--el-color-warning);
  }

  .newbie-cta {
    background: linear-gradient(90deg, #ffe9c7, #fff3e0);
    border: 1px solid #ffcc80;
    color: #b8860b;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: bold;
    text-align: left;
    cursor: pointer;
  }

  .actions {
    display: block;
    margin: 0;
  }

  .group-title {
    font-size: 13px;
    font-weight: bold;
    color: var(--el-text-color-secondary);
    text-align: left;
    margin: 12px 0 4px;
    padding-left: 6px;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .attribute {
    width: calc(50% - 8px);
    margin: 4px;
    overflow: auto hidden;
  }

  .attr-health, .attr-cult { background: rgba(103, 194, 58, 0.13); color: var(--attr-c-health); border-color: var(--attr-c-health); }
  .attr-attack { background: rgba(230, 162, 60, 0.13); color: var(--attr-c-attack); border-color: var(--attr-c-attack); }
  .attr-temp { font-size: 12px; font-weight: 700; color: #67c23a; }
  .attr-defense, .attr-realm { background: rgba(64, 158, 255, 0.15); color: var(--attr-c-defense); border-color: var(--attr-c-defense); }
  .attr-dodge { background: rgba(0, 176, 176, 0.14); color: var(--attr-c-dodge); border-color: var(--attr-c-dodge); }
  .attr-critical, .attr-collect, .attr-fate { background: rgba(178, 109, 240, 0.13); color: var(--attr-c-critical); border-color: var(--attr-c-critical); }
  .attr-score { background: linear-gradient(135deg, rgba(230, 178, 60, 0.2), rgba(255, 200, 120, 0.12)); color: var(--attr-c-score); border-color: var(--attr-c-score); }
  .attr-name { background: rgba(120, 130, 150, 0.13); color: var(--attr-c-name); border-color: var(--attr-c-name); }
  .attr-codex { background: rgba(0, 160, 160, 0.13); color: var(--attr-c-codex); border-color: var(--attr-c-codex); }
  .attr-na { background: rgba(240, 130, 170, 0.13); color: var(--attr-c-na); border-color: var(--attr-c-na); }
  .attr-calendar { background: rgba(230, 162, 60, 0.12); color: var(--attr-c-calendar); border-color: var(--attr-c-calendar); }
  .attr-age { background: rgba(0, 176, 140, 0.14); color: var(--attr-c-age); border-color: var(--attr-c-age); }
  .attr-birth { background: rgba(240, 130, 150, 0.13); color: var(--attr-c-birth); border-color: var(--attr-c-birth); }
  .attr-clan { background: rgba(100, 120, 220, 0.13); color: var(--attr-c-clan); border-color: var(--attr-c-clan); }
  .attr-points { background: rgba(255, 180, 60, 0.15); color: var(--attr-c-points); border-color: var(--attr-c-points); }
  .attr-dao { background: rgba(0, 170, 190, 0.13); color: var(--attr-c-dao); border-color: var(--attr-c-dao); }
  .attr-health b, .attr-attack b, .attr-defense b, .attr-score b { color: currentColor; }
  .attr-cult-wide { width: 100%; height: 42px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .cult-bar { height: 6px; border-radius: 3px; background: rgba(103, 194, 58, 0.2); overflow: hidden; }
  .cult-bar-in { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #67c23a, #b9e178, #67c23a); background-size: 200% 100%; animation: cult-flow 2.2s linear infinite; transition: width 0.4s; }
  @keyframes cult-flow { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
  /* 岁数/寿元剩余过少 -> 红色警戒 */
  .attr-age.warn { background: rgba(245, 108, 108, 0.16); color: #e5484d; border-color: #f56c6c; }
  html.dark .attr-age.warn { background: rgba(245, 108, 108, 0.22); color: #ff8a8a; border-color: #f56c6c; }

  .attribute-box {
    display: flex;
    flex-wrap: wrap;
  }

  .user-name {
    margin-right: 5px;
  }

  .equip-box {
    padding: 0 3px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
  }

  .buff-banner {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 6px 0 0;
  }

  .buff-tag {
    font-size: 12px;
  }

  .set-collect {
    margin: 8px 0 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
  }
  .sc-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .sc-title { font-weight: bold; color: var(--el-color-primary); }
  .sc-count { font-variant-numeric: tabular-nums; }
  .sc-bar { width: 110px; }
  .sc-list {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 220px;
    overflow: auto;
  }
  .sc-row {
    display: grid;
    grid-template-columns: 1fr 44px 1.6fr 56px;
    gap: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    padding: 2px 0;
    border-bottom: 1px dashed var(--el-border-color-lighter);
  }
  .sc-row.done .sc-name { color: var(--el-color-warning); }
  .sc-row.claimed .sc-name { color: var(--el-color-success); }
  .sc-state { text-align: right; }
  .set-banner {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0 0;
  }

  .set-card {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 6px 10px;
  }

  .set-head {
    margin-bottom: 4px;
  }

  .set-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    line-height: 18px;
  }

  .set-tier {
    display: inline-block;
    min-width: 34px;
    text-align: center;
    border-radius: 3px;
    padding: 0 4px;
  }

  .set-tier.active {
    background: var(--el-color-success-light-8);
    color: var(--el-color-success);
  }

  .set-tier.inactive {
    background: var(--el-fill-color);
    color: var(--el-text-color-placeholder);
  }

  .set-text {
    color: var(--el-text-color-secondary);
  }

  .aptitude-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 8px 0 0;
  }

  .equip-item {
    margin-bottom: 8px;
    height: 40px;
    line-height: 38px;
  }

  .equip {
    margin-left: 10px;
  }

  .forge-btn {
    margin-left: 4px;
    font-size: 12px;
  }

  .inventory-box {
    white-space: pre-wrap;
    min-height: 40px;
    line-height: 38px;
    height: auto;
  }

  .backpack-head {
    text-align: left;
    font-weight: bold;
    font-size: 14px;
    margin: 10px 0 4px;
    padding-left: 6px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inventory-content {
    margin-bottom: 15px;
    height: 120px;
    overflow: auto;
  }

  .inventory-item {
    margin: 4px;
  }

  .dialog-footer {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .dialog-footer .el-button {
    margin: 0;
    margin-bottom: 10px;
  }

  .dialog-upload {
    margin: 0;
  }

  .dialog-footer-button {
    margin: 10px 0 0 0 !important;
    width: 100%;
  }

  .dialog-footer-button:nth-child(2 + n) {
    margin-top: 10px;
    width: 100%;
  }

  .mode-row {
    width: 100%;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
  }

  .auto-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  /* 炼器弹窗 */
  .strengthen-box {
    padding: 0 5px;
  }

  .click-box {
    padding: 0 5px;
    margin-top: 10px;
  }

  .click-box button {
    margin-top: 10px;
    width: 100%;
  }

  /* 装备信息 */
  .monsterinfo {
    display: flex;
    justify-content: center;
  }

  .monsterinfo-box {
    display: grid;
    grid-template-columns: 1fr 20px 1fr;
    gap: 10px;
  }

  .collapse p,
  .monsterinfo-box p {
    display: contents;
  }

  .description {
    text-align: left;
  }

  .icon {
    text-align: center;
  }

  .value {
    text-align: left;
  }

  /* 基础属性对比 */
  .collapse {
    margin: 20px 0;
  }

  /* 属性对比 */
  .el-icon-caret-top,
  .el-icon-caret-bottom {
    width: 1em;
    height: 1em;
    display: block;
    margin-left: 5px;
  }

  .el-icon-caret-top {
    background-image: url(@/assets/CaretTop.svg);
  }

  .el-icon-caret-bottom {
    background-image: url(@/assets/caretBottom.svg);
  }

  .equipAll-content {
    display: flex;
    flex-wrap: wrap;
  }

  .equipAll-item {
    width: 20%;
    margin-top: 10px;
  }

  .achievement-content {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    justify-content: center;
    color: var(--el-text-color-primary);
  }

  .achievement-item {
    width: 33.33%;
    margin-top: 10px;
  }

  .ach-rarity {
    margin-left: 4px;
    padding: 1px 5px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
  }
  .ach-rarity.rarity-rare {
    color: #409eff;
    background: rgba(64, 158, 255, 0.12);
  }
  .ach-rarity.rarity-epic {
    color: #b26df0;
    background: rgba(178, 109, 240, 0.12);
  }
  .ach-rarity.rarity-legend {
    color: #e6a23c;
    background: rgba(230, 162, 60, 0.15);
  }
  .ach-progress { margin-bottom: 12px; }
  .ach-progress-head { margin-bottom: 6px; font-size: 14px; color: #303133; font-weight: 700; }
  .talent-content {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    justify-content: center;
    color: var(--el-text-color-primary);
  }

  .talent-item {
    width: 33.33%;
    margin-top: 10px;
  }

  .backtop {
    background-color: #4d4d4d;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #fff;
    position: fixed;
    z-index: 1;
    bottom: 20px;
    right: 20px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .dark .backtop {
    background-color: #fff;
    color: #4d4d4d;
  }

  /* 新手弹窗 */
  .newBie {
    display: flex;
    flex-direction: column;
    height: 128px;
    margin-bottom: 10px;
  }

  .newbie-note {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
  }

  .newbie-input {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .code-input {
    width: 140px;
  }

  .egg-alert {
    margin-bottom: 8px;
  }

  .newbieinfo-box p {
    margin-bottom: 10px;
  }

  @media only screen and (max-width: 768px) {
    .title {
      font-size: 20px;
    }

    .game-container {
      min-height: 574px;
      min-width: 356px;
    }

    .equip-box {
      padding: 0 5px;
    }

    .inventory-button {
      margin-left: 0 !important;
    }

    .equipAll-item {
      width: 33%;
    }

    .achievement-item {
      width: 50%;
    }

    .backtop {
      display: flex;
    }
  }
  .story-dlg-text {
    text-align: left;
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-primary);
    margin-bottom: 14px;
  }
  .story-dlg-choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .story-dlg-choice {
    width: 100%;
    text-align: left;
    white-space: normal;
    height: auto;
    padding: 10px 12px;
    line-height: 1.5;
  }
  .story-dlg-hint {
    margin-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .story-dlg-req {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .codex-count {
    margin: 4px 0 8px;
    font-size: 13px;
    font-weight: bold;
    color: var(--el-color-primary);
  }
  .codex-dim {
    opacity: 0.38;
    filter: grayscale(0.6);
  }
  .codex-summary {
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .season-body {
    min-height: 80vh;
  }
  .season-top {
    font-size: 15px;
    font-weight: bold;
    color: var(--el-color-primary);
    margin-bottom: 8px;
  }
  .season-line {
    margin: 6px 0;
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .season-pts {
    color: #e6a23c;
    font-size: 18px;
  }
  .season-tier {
    color: #409eff;
    font-weight: bold;
  }
  .season-rank {
    color: #f56c6c;
  }
  .season-next {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  .season-settle {
    margin: 6px 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
    font-size: 12px;
  }
  .rival {
    display: flex;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px dashed var(--el-border-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .rival-pts {
    color: var(--el-text-color-secondary);
  }
  .tier-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px dashed var(--el-border-color-light);
    font-size: 12px;
  }
  .tier-rewards {
    color: var(--el-text-color-secondary);
  }
  .na-body {
    line-height: 1.7;
  }
  .na-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--el-color-primary);
  }
  .na-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: normal;
  }
  .na-line {
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .na-note {
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  .na-tier {
    color: #409eff;
  }
  .wb-body {
    min-height: 60vh;
  }
  .wb-name {
    font-size: 16px;
    font-weight: bold;
    color: #f56c6c;
  }
  .wb-day {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: normal;
  }
  .wb-bar {
    margin: 8px 0 2px;
    height: 14px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    overflow: hidden;
  }
  .wb-bar-in {
    height: 100%;
    background: linear-gradient(90deg, #f56c6c, #e6a23c);
    transition: width 0.3s;
  }
  .wb-hp,
  .wb-line {
    color: var(--el-text-color-primary);
    font-size: 13px;
    margin: 4px 0;
  }
  .wb-dead {
    color: #67c23a;
    font-weight: bold;
  }
  .value-trend {
    margin: 8px 0;
    font-size: 13px;
    color: var(--el-color-warning);
  }
</style>

<style>
  .equipAll {
    width: 60% !important;
  }

  @media only screen and (max-width: 768px) {
    .equipAll {
      width: 100% !important;
    }

    /* 新手弹窗 */
    .newBieBox {
      width: 60% !important;
    }

    .el-popper {
      display: none;
    }
  }

  .el-collapse-item__content,
  .el-collapse-item div[role='tab'] {
    display: flex;
    justify-content: center;
  }

  .el-message-box--center {
    text-align: center;
  }

  /* 上传按钮 */
  .el-upload {
    width: 100%;
  }
</style>
