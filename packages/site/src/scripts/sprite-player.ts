export interface SpriteAnimParams {
  file: string
  frameWidth: number
  frameHeight: number
  frameCount: number
  columns: number
  fps: number
  startFrame: number
  sheetRows: number
}

export class SpritePlayer {
  private el: HTMLElement
  private params: SpriteAnimParams | null = null
  private spriteUrl = ''
  private frameIndex = 0
  private lastFrameTime = 0
  private animId = 0
  private _paused = false
  private scale = 1
  private maxW: number
  private maxH: number

  constructor(el: HTMLElement, maxSize = 96) {
    this.el = el
    this.maxW = maxSize
    this.maxH = maxSize
  }

  play(params: SpriteAnimParams, spriteUrl: string) {
    this.stop()
    this.params = params
    this.spriteUrl = spriteUrl
    this.frameIndex = 0
    this.lastFrameTime = 0
    this._paused = false

    const maxW = this.maxW
    const maxH = this.maxH
    this.scale = Math.min(maxW / params.frameWidth, maxH / params.frameHeight)

    const scaledFW = Math.round(params.frameWidth * this.scale)
    const scaledFH = Math.round(params.frameHeight * this.scale)
    this.el.style.width = `${scaledFW}px`
    this.el.style.height = `${scaledFH}px`
    this.el.style.overflow = 'hidden'

    const bgW = params.columns * params.frameWidth * this.scale
    const bgH = (params.sheetRows || 1) * params.frameHeight * this.scale
    this.el.style.backgroundImage = `url("${spriteUrl}")`
    this.el.style.backgroundSize = `${bgW}px ${bgH}px`
    this.el.style.imageRendering = 'pixelated'
    this.el.style.backgroundRepeat = 'no-repeat'

    this.renderFrame()
    this.animId = requestAnimationFrame((t) => this.tick(t))
  }

  private tick(now: number) {
    if (this._paused || !this.params) return

    const interval = 1000 / this.params.fps
    if (now - this.lastFrameTime >= interval) {
      this.lastFrameTime = now - ((now - this.lastFrameTime) % interval)
      this.frameIndex = (this.frameIndex + 1) % this.params.frameCount
      this.renderFrame()
    }
    this.animId = requestAnimationFrame((t) => this.tick(t))
  }

  private renderFrame() {
    if (!this.params) return
    const globalFrame = this.params.startFrame + this.frameIndex
    const col = globalFrame % this.params.columns
    const row = Math.floor(globalFrame / this.params.columns)
    const scaledFW = this.params.frameWidth * this.scale
    const scaledFH = this.params.frameHeight * this.scale
    const bgX = Math.round(-(col * scaledFW))
    const bgY = Math.round(-(row * scaledFH))
    this.el.style.backgroundPosition = `${bgX}px ${bgY}px`
  }

  pause() {
    this._paused = true
    cancelAnimationFrame(this.animId)
  }

  resume() {
    if (!this._paused || !this.params) return
    this._paused = false
    this.lastFrameTime = 0
    this.animId = requestAnimationFrame((t) => this.tick(t))
  }

  stop() {
    cancelAnimationFrame(this.animId)
    this._paused = false
    this.params = null
  }

  get paused() {
    return this._paused
  }

  get playing() {
    return this.params !== null && !this._paused
  }
}
