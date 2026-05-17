/**
 * Scan skin directories from packages/app/public/skins/,
 * generate a consolidated skins.json for the site gallery,
 * and copy pet.png + sprite sheet assets into site/public/skins/{id}/.
 *
 * Run: node scripts/gen-skin-data.mjs
 */
import { readFileSync, readdirSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SITE_ROOT = resolve(__dirname, '..')
const APP_SKINS_DIR = resolve(SITE_ROOT, '../app/public/skins')
const OUT_DIR = resolve(SITE_ROOT, 'public/data')
const SKINS_ASSET_DIR = resolve(SITE_ROOT, 'public/skins')

const VALID_STATES = ['idle', 'walk', 'run', 'sprint']

let order = []
try {
  order = JSON.parse(readFileSync(join(APP_SKINS_DIR, 'order.json'), 'utf-8'))
} catch {
  // fallback: no ordering
}

const dirs = readdirSync(APP_SKINS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const skins = []

for (const id of dirs) {
  const skinJsonPath = join(APP_SKINS_DIR, id, 'skin.json')
  const petPngPath = join(APP_SKINS_DIR, id, 'pet.png')

  if (!existsSync(skinJsonPath) || !existsSync(petPngPath)) continue

  try {
    const manifest = JSON.parse(readFileSync(skinJsonPath, 'utf-8'))
    const rawAnims = manifest.animations ?? {}
    const states = Object.keys(rawAnims).filter((s) => VALID_STATES.includes(s))

    const animations = {}
    const spriteFiles = new Set()
    const fileMaxFrame = {}

    for (const state of states) {
      const anim = rawAnims[state]
      const sprite = anim?.sprite
      if (!sprite) continue

      const startFrame = sprite.startFrame ?? 0
      const endFrame = startFrame + sprite.frameCount

      animations[state] = {
        file: anim.file,
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
        frameCount: sprite.frameCount,
        columns: sprite.columns,
        fps: sprite.fps,
        startFrame,
      }
      spriteFiles.add(anim.file)
      fileMaxFrame[anim.file] = Math.max(fileMaxFrame[anim.file] || 0, endFrame)
    }

    for (const state of Object.keys(animations)) {
      const a = animations[state]
      const maxFrame = fileMaxFrame[a.file] || a.startFrame + a.frameCount
      a.sheetRows = Math.ceil(maxFrame / a.columns)
    }

    skins.push({
      id,
      name: manifest.name ?? id,
      author: manifest.author ?? 'Unknown',
      description: manifest.description,
      style: manifest.style,
      states,
      pet: `/skins/${id}/pet.png`,
      animations,
    })

    const destDir = join(SKINS_ASSET_DIR, id)
    mkdirSync(destDir, { recursive: true })
    copyFileSync(petPngPath, join(destDir, 'pet.png'))

    for (const file of spriteFiles) {
      const srcPath = join(APP_SKINS_DIR, id, file)
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, join(destDir, file))
      }
    }
  } catch (e) {
    console.warn(`Skipping skin "${id}": ${e.message}`)
  }
}

// Sort: order.json first, then alphabetically
skins.sort((a, b) => {
  const ai = order.indexOf(a.id)
  const bi = order.indexOf(b.id)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.id.localeCompare(b.id)
})

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'skins.json'), JSON.stringify(skins, null, 2))

console.log(`Generated skins.json with ${skins.length} skins → ${join(OUT_DIR, 'skins.json')}`)
