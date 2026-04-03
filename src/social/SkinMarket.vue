<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useSkinStore } from '../stores/skin'
import { useSettingsStore } from '../stores/settings'
import { getScoreColor } from '../utils/activity'
import { useI18n } from '../composables/useI18n'
import SpriteRenderer from '../pet/renderers/SpriteRenderer.vue'
import type { CatalogEntry } from '../stores/skin'
import type { MovementState, SkinAnimationConfig } from '../types'

const skinStore = useSkinStore()
const settings = useSettingsStore()
const { t } = useI18n()

const hoveredId = ref<string | null>(null)
const showGuide = ref(false)
const importStatus = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
const importing = ref(false)
const confirmRemoveId = ref<string | null>(null)
const removing = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let statusTimer: ReturnType<typeof setTimeout> | null = null

const PREVIEW_STATES: { state: MovementState; score: number }[] = [
  { state: 'idle',   score: 5 },
  { state: 'walk',   score: 30 },
  { state: 'run',    score: 60 },
  { state: 'sprint', score: 90 },
]

onMounted(() => {
  if (!skinStore.catalogLoaded) {
    skinStore.loadCatalog()
  }
})

const currentEntry = computed(() =>
  skinStore.catalog.find(e => e.id === settings.currentSkinId) ?? null,
)

const allEntries = computed(() => skinStore.catalog)

const hoveredEntry = computed(() =>
  skinStore.catalog.find(e => e.id === hoveredId.value) ?? null,
)

function petAvatarSrc(skinId: string): string {
  return `/skins/${skinId}/pet.png`
}

function animFor(entry: CatalogEntry, state: MovementState): SkinAnimationConfig | null {
  return entry.manifest.animations[state] ?? entry.manifest.animations.idle ?? null
}

function onEnter(id: string) {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    hoveredId.value = id
  }, 200)
}

function onLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
  hoveredId.value = null
}

function selectSkin(entry: CatalogEntry) {
  settings.currentSkinId = entry.id
}

function showStatus(type: 'success' | 'error' | 'info', text: string) {
  importStatus.value = { type, text }
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => { importStatus.value = null }, 4000)
}

function toggleGuide() {
  showGuide.value = !showGuide.value
}

async function openSource(url: string) {
  try { await openUrl(url) } catch { /* noop */ }
}

async function downloadExample() {
  try {
    await openUrl('https://aibubu.funagent.app/demo/vita-example.zip')
  } catch {
    showStatus('info', '请从官网下载示例：aibubu.funagent.app')
  }
}

async function importFromFolder() {
  const selected = await open({ directory: true, title: t('skinsSelectFolder') })
  if (!selected) return

  importing.value = true
  try {
    const result = await invoke<{ success: boolean; skin_id: string; message: string }>(
      'import_skin_from_dir',
      { sourceDir: selected },
    )
    if (result.success) {
      showStatus('success', result.message)
      await new Promise(r => setTimeout(r, 300))
      await skinStore.loadCatalog()
    } else {
      showStatus('error', result.message)
    }
  } catch (err) {
    showStatus('error', `导入失败: ${err}`)
  } finally {
    importing.value = false
  }
}

function requestRemove(skinId: string) {
  confirmRemoveId.value = skinId
}

function cancelRemove() {
  confirmRemoveId.value = null
}

async function confirmRemove() {
  const id = confirmRemoveId.value
  if (!id) return

  removing.value = true
  try {
    const result = await skinStore.removeSkin(id)
    if (result.success) {
      showStatus('success', result.message)
    } else {
      showStatus('error', result.message)
    }
  } finally {
    removing.value = false
    confirmRemoveId.value = null
  }
}

async function importFromZip() {
  const selected = await open({
    title: t('skinsSelectZip'),
    filters: [{ name: t('skinsZipFilter'), extensions: ['zip'] }],
  })
  if (!selected) return
  showStatus('info', 'ZIP 导入功能开发中，请先使用文件夹导入')
}
</script>

<template>
  <div class="skin-market">
    <div v-if="!skinStore.catalogLoaded" class="market-loading">
      <div class="loading-shimmer" v-for="i in 3" :key="i" />
    </div>

    <template v-else>
      <!-- 当前角色 -->
      <div v-if="currentEntry" class="current-skin">
        <div class="current-label">{{ t('skinsCurrent') }}</div>
        <div class="current-card">
          <div class="current-states">
            <div
              v-for="s in PREVIEW_STATES"
              :key="s.state"
              class="current-cell"
            >
              <div class="current-anim">
                <SpriteRenderer
                  v-if="animFor(currentEntry, s.state)?.sprite"
                  :src="`/skins/${currentEntry.id}/${animFor(currentEntry, s.state)!.file}`"
                  :frame-width="animFor(currentEntry, s.state)!.sprite!.frameWidth"
                  :frame-height="animFor(currentEntry, s.state)!.sprite!.frameHeight"
                  :frame-count="animFor(currentEntry, s.state)!.sprite!.frameCount"
                  :columns="animFor(currentEntry, s.state)!.sprite!.columns"
                  :fps="animFor(currentEntry, s.state)!.sprite!.fps"
                  :start-frame="animFor(currentEntry, s.state)!.sprite!.startFrame ?? 0"
                  :loop="true"
                />
              </div>
              <span class="current-tag">
                <span class="state-dot" :style="{ background: getScoreColor(s.score) }" />
                {{ t('state' + s.state.charAt(0).toUpperCase() + s.state.slice(1)) }}
              </span>
            </div>
          </div>
          <div class="current-info">
            <span class="current-name">{{ currentEntry.manifest.name }}</span>
            <span
              v-if="currentEntry.manifest.source"
              class="current-author source-link"
              @click.stop="openSource(currentEntry.manifest.source!)"
            >{{ currentEntry.manifest.author }}</span>
            <span v-else class="current-author">{{ currentEntry.manifest.author }}</span>
          </div>
        </div>
      </div>

      <!-- 全部角色 -->
      <div v-if="allEntries.length" class="other-skins">
        <div class="other-label">{{ t('skinsChange') }}</div>
        <div class="skin-strip" role="listbox" aria-label="角色选择">
          <button
            v-for="entry in allEntries"
            :key="entry.id"
            class="skin-item"
            :class="{ 'is-active': entry.id === settings.currentSkinId }"
            role="option"
            :aria-selected="entry.id === settings.currentSkinId"
            @click="entry.id !== settings.currentSkinId && selectSkin(entry)"
            @mouseenter="entry.id !== settings.currentSkinId && onEnter(entry.id)"
            @mouseleave="onLeave"
          >
            <div class="item-preview">
              <img
                class="item-pet-img"
                :src="petAvatarSrc(entry.id)"
                :alt="entry.manifest.name"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              />
            </div>
            <span class="item-name">{{ entry.manifest.name }}</span>
            <span v-if="entry.id === settings.currentSkinId" class="active-badge">{{ t('skinsActive') }}</span>
            <button
              v-if="!skinStore.isBuiltin(entry.id)"
              class="remove-btn"
              :title="t('skinsRemoveBtn')"
              @click.stop="requestRemove(entry.id)"
            >
              <svg viewBox="0 0 12 12" fill="none" width="10" height="10" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
          </button>
        </div>

        <Transition name="popover">
          <div
            v-if="hoveredEntry"
            class="state-popover"
            @mouseenter="hoveredId = hoveredEntry!.id"
            @mouseleave="onLeave"
          >
            <div class="popover-header">
              <span class="popover-name">{{ hoveredEntry.manifest.name }}</span>
              <span
                v-if="hoveredEntry.manifest.source"
                class="popover-author source-link"
                @click.stop="openSource(hoveredEntry.manifest.source!)"
              >{{ hoveredEntry.manifest.author }}</span>
              <span v-else class="popover-author">{{ hoveredEntry.manifest.author }}</span>
            </div>
            <div class="popover-grid">
              <div
                v-for="s in PREVIEW_STATES"
                :key="s.state"
                class="popover-cell"
              >
                <div class="cell-anim">
                  <SpriteRenderer
                    v-if="animFor(hoveredEntry, s.state)?.sprite"
                    :src="`/skins/${hoveredEntry.id}/${animFor(hoveredEntry, s.state)!.file}`"
                    :frame-width="animFor(hoveredEntry, s.state)!.sprite!.frameWidth"
                    :frame-height="animFor(hoveredEntry, s.state)!.sprite!.frameHeight"
                    :frame-count="animFor(hoveredEntry, s.state)!.sprite!.frameCount"
                    :columns="animFor(hoveredEntry, s.state)!.sprite!.columns"
                    :fps="animFor(hoveredEntry, s.state)!.sprite!.fps"
                    :start-frame="animFor(hoveredEntry, s.state)!.sprite!.startFrame ?? 0"
                    :loop="true"
                  />
                </div>
                <span class="cell-tag">
                  <span class="state-dot" :style="{ background: getScoreColor(s.score) }" />
                  {{ t('state' + s.state.charAt(0).toUpperCase() + s.state.slice(1)) }}
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
      <!-- 删除确认 -->
      <Transition name="status">
        <div v-if="confirmRemoveId" class="remove-confirm">
          <span class="confirm-text">{{ t('skinsRemoveConfirm') }}</span>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelRemove">{{ t('skinsCancel') }}</button>
            <button class="confirm-btn danger" :disabled="removing" @click="confirmRemove">
              {{ removing ? t('skinsRemoving') : t('skinsRemoveOk') }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- 导入角色 -->
      <div class="import-section">
        <div class="import-header">
          <span class="import-title">{{ t('skinsImport') }}</span>
          <button class="guide-toggle" @click="toggleGuide">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M6.5 6.5a1.5 1.5 0 112.12 1.37c-.36.21-.62.58-.62 1.13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="8" cy="11.5" r="0.6" fill="currentColor"/>
            </svg>
            {{ t('skinsGuideFormat') }}
          </button>
        </div>

        <Transition name="guide">
          <div v-if="showGuide" class="guide-panel">
            <div class="guide-content">
              <div class="guide-row"><span class="guide-label">{{ t('skinsFormat') }}</span><span class="guide-val">{{ t('skinsFormatVal') }}</span></div>
              <div class="guide-row"><span class="guide-label">{{ t('skinsRequired') }}</span><span class="guide-val">{{ t('skinsRequiredVal') }}</span></div>
              <div class="guide-row"><span class="guide-label">{{ t('skinsPetPng') }}</span><span class="guide-val">{{ t('skinsPetPngVal') }}</span></div>
              <div class="guide-row"><span class="guide-label">{{ t('skinsStates') }}</span><span class="guide-val">{{ t('skinsStatesVal') }}</span></div>
              <div class="guide-row"><span class="guide-label">{{ t('skinsSkinJson') }}</span><span class="guide-val">{{ t('skinsSkinJsonVal') }}</span></div>
              <div class="guide-row"><span class="guide-label">{{ t('skinsOptional') }}</span><span class="guide-val">{{ t('skinsOptionalVal') }}</span></div>
            </div>
            <div class="guide-actions">
              <button class="example-btn" @click="downloadExample">
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                  <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ t('skinsDownloadExample') }}
              </button>
            </div>
          </div>
        </Transition>

        <div class="import-actions">
          <button class="import-btn" :disabled="importing" @click="importFromFolder">
            <svg class="import-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5.5A1.5 1.5 0 014.5 4H8l1.5 2h5A1.5 1.5 0 0116 7.5v6a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013 13.5v-8z" stroke="currentColor" stroke-width="1.4"/>
              <path d="M9.5 9v4M7.5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            {{ t('skinsImportFolder') }}
          </button>
          <button class="import-btn" :disabled="importing" @click="importFromZip">
            <svg class="import-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M8 3v14M10 5h-2M10 7h-2M10 9h-2M10 11h-2" stroke="currentColor" stroke-width="1.2"/>
              <rect x="8" y="12" width="2" height="2" rx="0.5" stroke="currentColor" stroke-width="1"/>
            </svg>
            {{ t('skinsImportZip') }}
          </button>
        </div>
        <Transition name="status">
          <div v-if="importStatus" class="import-status" :class="importStatus.type">
            {{ importStatus.text }}
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>

<style scoped>
.skin-market {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.market-loading {
  display: flex;
  gap: 8px;
  overflow: hidden;
}

.loading-shimmer {
  width: 64px;
  height: 80px;
  border-radius: 10px;
  background: linear-gradient(110deg, var(--bg-surface) 30%, var(--bg-surface-hover) 50%, var(--bg-surface) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* === Current Skin === */
.current-label, .other-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.current-card {
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  padding: 12px;
}

.current-states {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.current-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.current-anim {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--anim-bg);
  border-radius: 8px;
  overflow: hidden;
}

.current-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-label);
  letter-spacing: 0.3px;
}

.state-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.current-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.current-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-brightest);
}

.current-author {
  font-size: 10px;
  color: var(--text-tertiary);
}

.source-link {
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s;
}

.source-link:hover {
  color: var(--accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* === Other Skins === */
.other-skins {
  position: relative;
}

.skin-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar) transparent;
}

.skin-strip::-webkit-scrollbar { height: 4px; }
.skin-strip::-webkit-scrollbar-track { background: transparent; }
.skin-strip::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 2px; }

.skin-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 8px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease-out;
  color: inherit;
  flex-shrink: 0;
  min-width: 72px;
}

.skin-item:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.item-preview {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}

.item-pet-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.item-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.skin-item.is-active {
  border-color: var(--accent-border-strong);
  background: var(--accent-bg);
  cursor: default;
}

.skin-item.is-active .item-name {
  color: var(--accent-brightest);
}

.active-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  color: var(--accent-text);
  background: var(--accent-bg);
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

/* === Remove Button === */
.remove-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--danger-bg);
  border: none;
  border-radius: 4px;
  color: var(--danger);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  padding: 0;
}
.skin-item:hover .remove-btn { opacity: 1; }
.remove-btn:hover { background: var(--danger-bg-strong); color: var(--danger-text); }

.remove-confirm {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.confirm-text {
  font-size: 11px;
  color: var(--danger-text);
  font-weight: 500;
}

.confirm-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.confirm-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.confirm-btn.cancel {
  background: var(--bg-surface-hover);
  color: var(--text-secondary);
}
.confirm-btn.cancel:hover { background: var(--border-hover); }

.confirm-btn.danger {
  background: var(--danger-bg-strong);
  color: var(--danger);
}
.confirm-btn.danger:hover { background: var(--danger-border); color: var(--danger-text); }
.confirm-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; }

/* === Hover Popover === */
.state-popover {
  margin-top: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 8px 32px var(--shadow);
}

.popover-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.popover-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-bright);
}

.popover-author {
  font-size: 10px;
  color: var(--text-tertiary);
}

.popover-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.popover-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.cell-anim {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border-radius: 10px;
  overflow: hidden;
}

.cell-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-label);
  letter-spacing: 0.3px;
}

/* === Import Section === */
.import-section {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.import-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.import-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.guide-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--text-dim);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.guide-toggle:hover {
  color: var(--accent-bright);
  background: var(--accent-bg);
}

.guide-panel {
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

.guide-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 10px;
}

.guide-label {
  color: var(--text-dim);
  min-width: 56px;
  flex-shrink: 0;
}

.guide-val {
  color: var(--text-label);
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 9.5px;
}

.guide-actions {
  display: flex;
  gap: 6px;
}

.example-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--accent-text);
  background: var(--info-bg);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
  justify-content: center;
  text-decoration: none;
}

.example-btn:hover {
  background: var(--accent-bg-strong);
  color: var(--accent-bright);
}

.guide-enter-active { transition: all 0.2s ease-out; }
.guide-leave-active { transition: all 0.15s ease-in; }
.guide-enter-from, .guide-leave-to { opacity: 0; max-height: 0; margin-bottom: 0; padding: 0 12px; overflow: hidden; }
.guide-enter-to, .guide-leave-from { max-height: 200px; }

.import-actions {
  display: flex;
  gap: 8px;
}

.import-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 12px;
  border: 1.5px dashed var(--border-strong);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.import-btn:hover:not(:disabled) {
  border-color: var(--accent-border-strong);
  background: var(--accent-bg);
  color: var(--accent-brightest);
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.import-status {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.import-status.success {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success-border);
}

.import-status.error {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.import-status.info {
  background: var(--info-bg);
  color: var(--accent-bright);
  border: 1px solid var(--info-border);
}

.status-enter-active { transition: all 0.2s ease-out; }
.status-leave-active { transition: all 0.15s ease-in; }
.status-enter-from, .status-leave-to { opacity: 0; transform: translateY(-4px); }

/* === Popover transition === */
.popover-enter-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.popover-leave-active {
  transition: all 0.1s ease-in;
}
.popover-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
