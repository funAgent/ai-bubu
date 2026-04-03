import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const RANDOM_NICKNAMES = [
  '奔跑的猫', '代码喵', '摸鱼侠', '键盘侠', '搬砖兔',
  '咖啡因', '通宵达旦', '逻辑怪', 'Bug猎人', '像素猫',
  '闪电鼠', '暴走蛙', '安静鱼', '冲刺鸟', '思考熊',
]

const RANDOM_TEAMS = [
  '前端组', '后端组', '全栈组', '产品组', '设计组',
  '基础架构', '数据组', 'AI组', '质量组', '运维组',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const STORAGE_KEY = 'desk-pet-settings'
const SKIN_KEY = 'desk-pet-skin'
const THEME_KEY = 'desk-pet-theme'

export type ThemeMode = 'dark' | 'light' | 'system'

interface SavedSettings {
  nickname?: string
  teamName?: string
}

function loadSaved(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return {
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname : undefined,
      teamName: typeof parsed.teamName === 'string' ? parsed.teamName : undefined,
    }
  } catch {
    return {}
  }
}

function saveSettings(nick: string, team: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nickname: nick, teamName: team }))
  } catch { /* noop */ }
}

function loadTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  } catch { /* noop */ }
  return 'dark'
}

const DEFAULT_SKIN = 'vita'

function loadSkinId(): string {
  try {
    return localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN
  } catch {
    return DEFAULT_SKIN
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSaved()

  const currentSkinId = ref(loadSkinId())

  const nickname = ref(saved.nickname || pickRandom(RANDOM_NICKNAMES))
  const teamName = ref(saved.teamName || pickRandom(RANDOM_TEAMS))
  const socialEnabled = ref(false)
  const theme = ref<ThemeMode>(loadTheme())

  if (!saved.nickname || !saved.teamName) {
    saveSettings(nickname.value, teamName.value)
  }

  watch(currentSkinId, (id) => {
    try { localStorage.setItem(SKIN_KEY, id) } catch { /* noop */ }
  })

  watch(theme, (t) => {
    try { localStorage.setItem(THEME_KEY, t) } catch { /* noop */ }
  })

  function syncSkinId(newId: string) {
    if (newId && newId !== currentSkinId.value) {
      currentSkinId.value = newId
    }
  }

  function persistUserFields() {
    saveSettings(nickname.value, teamName.value)
  }

  return {
    currentSkinId,
    nickname,
    teamName,
    socialEnabled,
    theme,
    syncSkinId,
    persistUserFields,
  }
})
