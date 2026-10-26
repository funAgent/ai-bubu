import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const fixtures = []
afterEach(() => fixtures.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

// Execute the actual CLI against a temporary repository, without touching built-in assets.
function validate(animations) {
  const root = mkdtempSync(join(tmpdir(), 'aibubu-skin-'))
  fixtures.push(root)
  const skinRoot = join(root, 'packages/app/public/skins')
  mkdirSync(join(root, 'scripts'), { recursive: true })
  mkdirSync(join(skinRoot, 'fixture'), { recursive: true })
  const script = join(root, 'scripts/validate-skins.mjs')
  writeFileSync(script, readFileSync(new URL('./validate-skins.js', import.meta.url)))
  writeFileSync(join(skinRoot, 'order.json'), '["fixture"]')
  writeFileSync(join(skinRoot, 'fixture/pet.png'), '')
  writeFileSync(
    join(skinRoot, 'fixture/skin.json'),
    JSON.stringify({
      name: 'Fixture',
      author: 'test',
      animations: { idle: { file: 'pet.png', loop: true }, ...animations },
    }),
  )
  return spawnSync(process.execPath, [script], { encoding: 'utf8' })
}

describe('skin validator reaction compatibility', () => {
  it('still accepts old skins with no reaction keys', () => {
    assert.equal(validate({}).status, 0)
  })
  it('accepts all optional reaction keys', () => {
    assert.equal(
      validate(
        Object.fromEntries(
          ['react_start', 'react_multi', 'react_done'].map((key) => [
            key,
            { file: 'pet.png', loop: false },
          ]),
        ),
      ).status,
      0,
    )
  })
  it('rejects misspelled reaction keys', () => {
    const result = validate({ react_mult: { file: 'pet.png', loop: false } })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /未知动画状态/)
  })
  it('validates file references for optional reaction clips', () => {
    const result = validate({ react_multi: { file: 'missing.png', loop: false } })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing.png/)
  })
})
