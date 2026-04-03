<script setup lang="ts">
import { useSocialStore } from '../stores/social'
import { MOVEMENT_COLORS } from '../utils/activity'
import { useI18n } from '../composables/useI18n'

const socialStore = useSocialStore()
const { t } = useI18n()

function memberColor(movementState: string): string {
  return MOVEMENT_COLORS[movementState as keyof typeof MOVEMENT_COLORS]?.body || '#4ade80'
}
</script>

<template>
  <div class="team-view">
    <div v-if="socialStore.teams.length === 0" class="team-empty">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="9" r="2.2" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="16" cy="9" r="2.2" stroke="currentColor" stroke-width="1.6"/>
        <path d="M4.7 17.2C5.3 14.8 7 13.6 8.9 13.6H9.1C11 13.6 12.7 14.8 13.3 17.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M10.7 17.2C11.3 14.8 13 13.6 14.9 13.6H15.1C17 13.6 18.7 14.8 19.3 17.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <div class="empty-title">{{ t('teamEmpty') }}</div>
      <div class="empty-desc">{{ t('teamEmptyDesc') }}</div>
    </div>

    <div v-for="team in socialStore.teams" :key="team.name" class="team-card">
      <div class="team-header">
        <span class="team-name">{{ team.name }}</span>
        <span class="team-count">{{ team.memberCount }}{{ t('teamPeople') }}</span>
      </div>
      <div class="team-steps-row">
        <span class="team-steps-num">{{ team.totalSteps.toLocaleString() }}</span>
        <span class="team-steps-label">{{ t('teamTotalSteps') }}</span>
      </div>
      <div class="team-bar">
        <div
          v-for="member in team.members"
          :key="member.peerId"
          class="member-seg"
          :style="{
            flex: member.dailySteps || 1,
            background: memberColor(member.movementState),
          }"
          :title="`${member.nickname}: ${member.dailySteps.toLocaleString()}${t('steps')}`"
        />
      </div>
      <div class="member-labels">
        <span v-for="member in team.members" :key="member.peerId" class="member-label">{{ member.nickname }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-view { padding: 0 24px; }
.team-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 20px; }
.empty-icon { width: 36px; height: 36px; color: #64748b; margin-bottom: 12px; display: block; }
.empty-title { font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; }
.empty-desc { font-size: 12px; color: #475569; line-height: 1.5; }
.team-card { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.team-name { font-size: 15px; font-weight: 600; color: #f1f5f9; }
.team-count { font-size: 11px; color: #64748b; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 6px; }
.team-steps-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px; }
.team-steps-num { font-size: 28px; font-weight: 800; color: #f1f5f9; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
.team-steps-label { font-size: 12px; color: #475569; }
.team-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; gap: 2px; }
.member-seg { border-radius: 3px; min-width: 8px; transition: flex 0.3s; }
.member-labels { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.member-label { font-size: 10px; color: #475569; }
</style>
