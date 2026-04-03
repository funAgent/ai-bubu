import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const RANDOM_NICKNAMES = [
  '奔跑的猫',
  '代码喵',
  '摸鱼侠',
  '键盘侠',
  '搬砖兔',
  '咖啡因',
  '通宵达旦',
  '逻辑怪',
  'Bug猎人',
  '像素猫',
  '闪电鼠',
  '暴走蛙',
  '安静鱼',
  '冲刺鸟',
  '思考熊',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const STORAGE_KEY = 'aibubu-settings'
const SKIN_KEY = 'aibubu-skin'
const THEME_KEY = 'aibubu-theme'

export type ThemeMode = 'dark' | 'light' | 'system'

interface SavedSettings {
  nickname?: string
}

function loadSaved(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return {
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname : undefined,
    }
  } catch {
    return {}
  }
}

function saveSettings(nick: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nickname: nick }))
  } catch {
    /* noop */
  }
}

function loadTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  } catch {
    /* noop */
  }
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
  const socialEnabled = ref(false)
  const theme = ref<ThemeMode>(loadTheme())

  if (!saved.nickname) {
    saveSettings(nickname.value)
  }

  watch(currentSkinId, (id) => {
    try {
      localStorage.setItem(SKIN_KEY, id)
    } catch {
      /* noop */
    }
  })

  watch(theme, (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* noop */
    }
  })

  function syncSkinId(newId: string) {
    if (newId && newId !== currentSkinId.value) {
      currentSkinId.value = newId
    }
  }

  function persistUserFields() {
    saveSettings(nickname.value)
  }

  return {
    currentSkinId,
    nickname,
    socialEnabled,
    theme,
    syncSkinId,
    persistUserFields,
  }
})
