import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, resolve, join } from 'path'
import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const __dirname$2 = dirname(fileURLToPath(import.meta.url))

const DEFAULT_CFG = {
   W: 500, H: 500,
   BOX_W: 500, BOX_H: 500,
   BOX_PAD: 20,
   LINE_H: 1.08,
   BASELINE_ADJ: 0.75,
   FONT_NAME: 'Arial Narrow',
   FONT_WEIGHT: 400,
   FALLBACK_FONT: 'Arial, sans-serif',
   FS_MIN: 8,
   FS_MAX: 130,
   BLUR: 2,
   C_BG: '#ffffff',
   C_BOX: '#ffffff', 
   C_TEXT: '#000000',
   fontPaths: []
}

let _fontsReady = false

function registerFonts(extraFontPaths = []) {
   if (_fontsReady) return
   _fontsReady = true

   const candidates = [
      ...extraFontPaths.map(p => resolve(process.cwd(), p)),
      resolve(process.cwd(), 'assets/arialnarrow.ttf'),
      resolve(process.cwd(), 'assets/arial_narrow-webfont.woff'),
      join(__dirname$2, '../assets/arialnarrow.ttf'),
      join(__dirname$2, '../../assets/arialnarrow.ttf'),
      join(__dirname$2, '../assets/arial_narrow-webfont.woff'),
      join(__dirname$2, '../../assets/arial_narrow-webfont.woff')
   ]

   for (const p of candidates) {
      if (!existsSync(p)) continue
      try {
         GlobalFonts.registerFromPath(p, DEFAULT_CFG.FONT_NAME)
         if (GlobalFonts.has(DEFAULT_CFG.FONT_NAME)) {
            return
         }
      } catch {}
   }
}

function fontString(size, fontName, fontWeight, fallback) {
   const family = GlobalFonts.has(fontName)
      ? `"${fontName}", ${fallback}`
      : fallback
   return `${fontWeight} ${size}px ${family}`
}

const THEMES = {
   'white': { C_BG: '#ffffff', C_BOX: '#ffffff', C_TEXT: '#000000' },
   'black': { C_BG: '#000000', C_BOX: '#000000', C_TEXT: '#ffffff' },
   'charcoal': { C_BG: '#36454f', C_BOX: '#36454f', C_TEXT: '#ffffff' },
   'slate': { C_BG: '#708090', C_BOX: '#708090', C_TEXT: '#ffffff' },
   'ice': { C_BG: '#d6eaf8', C_BOX: '#d6eaf8', C_TEXT: '#000000' },
   'brat': { C_BG: '#8ace00', C_BOX: '#8ace00', C_TEXT: '#000000' },
   'neon': { C_BG: '#39ff14', C_BOX: '#39ff14', C_TEXT: '#000000' },
   'lime': { C_BG: '#00ff00', C_BOX: '#00ff00', C_TEXT: '#000000' },
   'mint': { C_BG: '#98ff98', C_BOX: '#98ff98', C_TEXT: '#000000' },
   'crimson': { C_BG: '#dc143c', C_BOX: '#dc143c', C_TEXT: '#ffffff' },
   'coral': { C_BG: '#ff6b6b', C_BOX: '#ff6b6b', C_TEXT: '#ffffff' },
   'ruby': { C_BG: '#9b111e', C_BOX: '#9b111e', C_TEXT: '#ffffff' },
   'maroon': { C_BG: '#800000', C_BOX: '#800000', C_TEXT: '#ffffff' },
   'rose': { C_BG: '#ff007f', C_BOX: '#ff007f', C_TEXT: '#ffffff' },
   'pink': { C_BG: '#ff69b4', C_BOX: '#ff69b4', C_TEXT: '#ffffff' },
   'bubblegum': { C_BG: '#fe5bac', C_BOX: '#fe5bac', C_TEXT: '#ffffff' },
   'peach': { C_BG: '#ffcba4', C_BOX: '#ffcba4', C_TEXT: '#000000' },
   'lavender': { C_BG: '#e6e6fa', C_BOX: '#e6e6fa', C_TEXT: '#000000' },
   'purple': { C_BG: '#6a0dad', C_BOX: '#6a0dad', C_TEXT: '#ffffff' },
   'grape': { C_BG: '#6f2da8', C_BOX: '#6f2da8', C_TEXT: '#ffffff' },
   'indigo': { C_BG: '#4b0082', C_BOX: '#4b0082', C_TEXT: '#ffffff' },
   'midnight': { C_BG: '#191970', C_BOX: '#191970', C_TEXT: '#ffffff' },
   'navy': { C_BG: '#001f3f', C_BOX: '#001f3f', C_TEXT: '#ffffff' },
   'sky': { C_BG: '#87ceeb', C_BOX: '#87ceeb', C_TEXT: '#000000' },
   'cyan': { C_BG: '#00ffff', C_BOX: '#00ffff', C_TEXT: '#000000' },
   'teal': { C_BG: '#008080', C_BOX: '#008080', C_TEXT: '#ffffff' },
   'forest': { C_BG: '#228b22', C_BOX: '#228b22', C_TEXT: '#ffffff' },
   'emerald': { C_BG: '#009b77', C_BOX: '#009b77', C_TEXT: '#ffffff' },
   'olive': { C_BG: '#808000', C_BOX: '#808000', C_TEXT: '#ffffff' },
   'orange': { C_BG: '#ff6600', C_BOX: '#ff6600', C_TEXT: '#ffffff' },
   'amber': { C_BG: '#ffbf00', C_BOX: '#ffbf00', C_TEXT: '#000000' },
   'gold': { C_BG: '#ffd700', C_BOX: '#ffd700', C_TEXT: '#000000' },
   'chocolate': { C_BG: '#7b3f00', C_BOX: '#7b3f00', C_TEXT: '#ffffff' },
   'coffee': { C_BG: '#6f4e37', C_BOX: '#6f4e37', C_TEXT: '#ffffff' },
   'sand': { C_BG: '#c2b280', C_BOX: '#c2b280', C_TEXT: '#000000' }
}

function resolveTheme(options = {}) {
   const {
      theme,
      ...rest
   } = options
   if (!theme) return rest

   const t = THEMES[theme]
   if (!t) throw new Error(
      `[brat] Unknown theme "${theme}". Available: ${Object.keys(THEMES).join(', ')}`
   )
   return {
      ...t,
      ...rest
   }
}

const __dirname$1 = dirname(fileURLToPath(import.meta.url))

const candidates = [
   resolve(__dirname$1, '../assets/emoji'),
   resolve(__dirname$1, '../../assets/emoji')
]
const emojiDir = candidates.find(p => existsSync(p)) ?? candidates[0]

const fileNames = {
   apple: 'emoji-apple-image.json',
   google: 'emoji-google-image.json',
   twitter: 'emoji-twitter-image.json',
   joypixels: 'emoji-joypixels-image.json',
   blob: 'emoji-blob-image.json'
}

const emojiImageByBrand = {}

for (const brand of Object.keys(fileNames)) {
   const filePath = resolve(emojiDir, fileNames[brand])
   try {
      emojiImageByBrand[brand] = existsSync(filePath)
         ? JSON.parse(readFileSync(filePath, 'utf8'))
         : {}
   } catch {
      emojiImageByBrand[brand] = {}
   }
}

const _require = createRequire(import.meta.url)

const EMOJI_BRANDS = ['apple', 'google', 'twitter', 'facebook', 'samsung', 'microsoft']

let EmojiDbLib = null
try {
   EmojiDbLib = _require('emoji-db')
} catch (e) {}

const emojiDb = EmojiDbLib ? new EmojiDbLib({
   useDefaultDb: true
}) : null

function _resolveEmojiB64(char, preferBrand = 'apple') {
   const order = [
      preferBrand,
      ...EMOJI_BRANDS.filter(b => b !== preferBrand)
   ]
   for (const brand of order) {
      const b64 = emojiImageByBrand[brand]?.[char]
      if (b64) return b64
   }
   return null
}

async function _preloadEmojis(text, brand = 'apple') {
   if (!emojiDb) {
      return {
         emojis: [],
         cache: new Map()
      }
   }
   const emojis = emojiDb.searchFromText({
      input: text,
      fixCodePoints: true
   })
   
   const cache = new Map()
   await Promise.all(
      emojis.filter(e => !cache.has(e.found)).map(async e => {
         try {
            const b64 = _resolveEmojiB64(e.found, brand)
            if (b64) {
               cache.set(e.found, await loadImage(Buffer.from(b64, 'base64')))
            }
         } catch (err) {}
      })
   )
   
   return {
      emojis,
      cache
   }
}

function _getSegments(text, emojis) {
   const segs = []
   let cur = 0
   const sorted = [...emojis].sort((a, b) => a.offset - b.offset)
   for (const e of sorted) {
      for (const ch of text.substring(cur, e.offset)) segs.push({
         type: 'text',
         value: ch
      })
      segs.push({
         type: 'emoji',
         value: e.found
      })
      cur = e.offset + e.length
   }
   for (const ch of text.substring(cur)) segs.push({
      type: 'text',
      value: ch
   })
   return segs
}

function _measureWord(ctx, wordSegs, emojiSz) {
   let w = 0,
      textRun = ''
   for (const seg of wordSegs) {
      if (seg.type === 'emoji') {
         if (textRun) {
            w += ctx.measureText(textRun).width
            textRun = ''
         }
         w += emojiSz
      } else {
         textRun += seg.value
      }
   }
   if (textRun) w += ctx.measureText(textRun).width
   return w
}

function _splitWords(segs) {
   const words = []
   let cur = []
   for (const seg of segs) {
      if (seg.type === 'text' && seg.value === ' ') {
         if (cur.length) {
            words.push([...cur])
            cur.length = 0
         }
      } else {
         cur.push(seg)
      }
   }
   if (cur.length) words.push(cur)
   return words
}

function _wrap(ctx, segs, maxW, fs, emojiSz, fontName, fontWeight, fallback) {
   ctx.font = fontString(fs, fontName, fontWeight, fallback)
   const spaceW = ctx.measureText(' ').width
   const words = _splitWords(segs)
   const lines = []
   let curLine = [],
      curWidth = 0
   for (const word of words) {
      const ww = _measureWord(ctx, word, emojiSz)
      if (curLine.length === 0) {
         curLine.push(word)
         curWidth = ww
      } else if (curWidth + spaceW + ww <= maxW) {
         curLine.push(word)
         curWidth += spaceW + ww
      } else {
         lines.push(curLine)
         curLine = [word]
         curWidth = ww
      }
   }
   if (curLine.length) lines.push(curLine)
   return lines
}

function _fitFontSize(ctx, segs, maxW, maxH, cfg) {
   let lo = cfg.FS_MIN, hi = cfg.FS_MAX, best = lo
   while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const emojiSz = mid * 1.2
      ctx.font = fontString(mid, cfg.FONT_NAME, cfg.FONT_WEIGHT, cfg.FALLBACK_FONT)
      const spaceW = ctx.measureText(' ').width
      const lines = _wrap(ctx, segs, maxW, mid, emojiSz, cfg.FONT_NAME, cfg.FONT_WEIGHT, cfg.FALLBACK_FONT)
      const totalH = lines.length * mid * cfg.LINE_H
      let maxLineW = 0
      for (const line of lines) {
         const lineW = line.reduce((s, w, i) =>
            s + _measureWord(ctx, w, emojiSz) + (i ? spaceW : 0), 0)
         if (lineW > maxLineW) maxLineW = lineW
      }
      if (maxLineW <= maxW && totalH <= maxH) {
         best = mid
         lo = mid + 1
      } else hi = mid - 1
   }
   return best
}

function _drawJustifiedLine(ctx, lineWords, x, lineWidth, y, fs, emojiSz, cache, fontName, fontWeight, fallback) {
   if (!lineWords.length) return
   ctx.font = fontString(fs, fontName, fontWeight, fallback)
   const wordWidths = lineWords.map(w => _measureWord(ctx, w, emojiSz))
   const totalW = wordWidths.reduce((a, b) => a + b, 0)
   const gap = lineWords.length > 1 ? (lineWidth - totalW) / (lineWords.length - 1) : 0
   let curX = x
   for (let i = 0; i < lineWords.length; i++) {
      let textRun = '',
         startX = curX
      for (const seg of lineWords[i]) {
         if (seg.type === 'emoji') {
            if (textRun) {
               ctx.fillText(textRun, startX, y)
               startX += ctx.measureText(textRun).width
               textRun = ''
            }
            const img = cache.get(seg.value)
            if (img) ctx.drawImage(img, startX, y - fs + fs * 0.1, emojiSz, emojiSz)
            else ctx.fillText('?', startX, y)
            startX += emojiSz
         } else {
            textRun += seg.value
         }
      }
      if (textRun) ctx.fillText(textRun, startX, y)
      curX += wordWidths[i] + gap
   }
}

async function bratGen(text, options = {}) {
   const cfg = {
      ...DEFAULT_CFG,
      ...resolveTheme(options)
   }
   registerFonts(cfg.fontPaths)

   const {
      W,
      H,
      BOX_W,
      BOX_H,
      BOX_PAD,
      BLUR,
      LINE_H,
      BASELINE_ADJ,
      C_BG,
      C_BOX,
      C_TEXT,
      FONT_NAME,
      FONT_WEIGHT,
      FALLBACK_FONT
   } = cfg

   const bx = (W - BOX_W) / 2,
      by = (H - BOX_H) / 2
   const txW = BOX_W - BOX_PAD * 2,
      txH = BOX_H - BOX_PAD * 2

   const canvas = createCanvas(W, H)
   const ctx = canvas.getContext('2d')
   ctx.imageSmoothingEnabled = true
   ctx.imageSmoothingQuality = 'high'

   ctx.fillStyle = C_BG
   ctx.fillRect(0, 0, W, H)
   ctx.fillStyle = C_BOX
   ctx.fillRect(bx, by, BOX_W, BOX_H)

   const raw = String(text).trim().replace(/\s+/g, ' ')
   if (!raw) return await canvas.encode('png')

   const {
      emojis,
      cache
   } = await _preloadEmojis(raw, options.emojiStyle ?? 'apple')
   const segs = _getSegments(raw, emojis)

   const fontSize = _fitFontSize(ctx, segs, txW, txH, cfg)
   const emojiSize = fontSize * 1.2
   const lineHeight = fontSize * LINE_H
   const lines = _wrap(ctx, segs, txW, fontSize, emojiSize, FONT_NAME, FONT_WEIGHT, FALLBACK_FONT)

   const startY = by + BOX_PAD + fontSize * BASELINE_ADJ
   const lineX = bx + BOX_PAD

   ctx.save()
   ctx.filter = `blur(${BLUR}px)`
   ctx.fillStyle = C_TEXT
   ctx.textBaseline = 'alphabetic'
   ctx.font = fontString(fontSize, FONT_NAME, FONT_WEIGHT, FALLBACK_FONT)

   for (let i = 0; i < lines.length; i++) {
      _drawJustifiedLine(
         ctx, lines[i], lineX, txW,
         startY + i * lineHeight,
         fontSize, emojiSize, cache,
         FONT_NAME, FONT_WEIGHT, FALLBACK_FONT
      )
   }
   ctx.restore()

   return await canvas.encode('png')
}

const execFileAsync = promisify(execFile)

function escapePath(path) {
   return path.replace(/'/g, "'\\''")
}

function buildManifest(framePaths, durations, fps = 25) {
   if (!Array.isArray(framePaths) || framePaths.length === 0) {
      throw new Error('[buildManifest] framePaths must be non-empty array')
   }
   
   const durArray = Array.isArray(durations) ? durations : new Array(framePaths.length).fill(durations)
   
   if (durArray.length < framePaths.length) {
      const lastDur = durArray[durArray.length - 1] ?? 1.0
      while (durArray.length < framePaths.length) {
         durArray.push(lastDur)
      }
   }
   
   const frameDuration = 1 / fps
   const lines = []
   
   for (let i = 0; i < framePaths.length; i++) {
      const dur = Math.max(0.001, durArray[i] ?? 1.0)
      lines.push(`file '${escapePath(framePaths[i])}'`)
      lines.push(`duration ${dur}`)
   }
   
   const lastFrame = framePaths[framePaths.length - 1]
   const lastDur = Math.max(0.001, durArray[durArray.length - 1] ?? 1.0)
   const adjustedLastDur = Math.max(frameDuration, lastDur - frameDuration)
   
   lines.push(`file '${escapePath(lastFrame)}'`)
   lines.push(`duration ${adjustedLastDur}`)
   
   return lines.join('\n')
}

async function encodeMP4(concatPath, options = {}) {
   const { signal } = options
   
   const args = [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-vf', 'scale=512:512',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov', 
      'pipe:1'
   ]
   
   const { stdout } = await execFileAsync('ffmpeg', args, {
      encoding: 'buffer',
      maxBuffer: 50 * 1024 * 1024,
      signal: signal
   })

   return stdout
}

async function encodeGIF(concatPath, options = {}) {
   const { signal } = options
   
   const args = [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-vf', [
         'fps=10',
         'scale=512:512:flags=lanczos',
         'split[s0][s1]',
         '[s0]palettegen=max_colors=64[p]',
         '[s1][p]paletteuse=dither=bayer'
      ].join(','),
      '-loop', '0',
      '-f', 'gif',
      'pipe:1'
   ]
   
   const { stdout } = await execFileAsync('ffmpeg', args, {
      encoding: 'buffer',
      maxBuffer: 50 * 1024 * 1024,
      signal: signal
   })

   return stdout
}

async function encode(concatPath, format = 'mp4', options = {}) {
   if (format === 'gif') return encodeGIF(concatPath, options)
   return encodeMP4(concatPath, options)
}

const EMOJI_RE = /\p{Emoji}(\uFE0F|\u200D\p{Emoji})*/gu

function tokenize(text) {
   if (text == null) return []
   const raw = String(text).trim()
      .replace(/[,，]/g, ' ')
      .replace(/\s+/g, ' ')

   if (!raw) return []

   const tokens = []
   let i = 0

   while (i < raw.length) {
      if (raw[i] === ' ') {
         i++
         continue
      }

      EMOJI_RE.lastIndex = i
      const m = EMOJI_RE.exec(raw)
      if (m && m.index === i && m[0].length > 0) {
         tokens.push(m[0])
         i += m[0].length
      } else {
         let j = i
         while (j < raw.length && raw[j] !== ' ') {
            EMOJI_RE.lastIndex = j
            const em = EMOJI_RE.exec(raw)
            if (em && em.index === j && em[0].length > 0) break
            j++
         }
         const word = raw.slice(i, j).trim()
         if (word) tokens.push(word)
         i = j
      }
   }
   return tokens.filter(Boolean)
}

function _splitIntoLayers(tokens, maxWordPerLayer) {
   if (!maxWordPerLayer || maxWordPerLayer === Infinity) return [tokens]
   const layers = []
   for (let i = 0; i < tokens.length; i += maxWordPerLayer) {
      layers.push(tokens.slice(i, i + maxWordPerLayer))
   }
   return layers
}

function _resolveDurations(totalFrames, lastInLayerIdx, lyric = {}) {
   const {
      tempo,
      timestamps,
      bpm,
      frameDuration = 0.7,
      lastFrameDuration = 1.5
   } = lyric

   if (typeof totalFrames !== 'number' || totalFrames <= 0) {
      throw new Error('[bratVid] totalFrames must be a positive number')
   }

   if (Array.isArray(tempo) && tempo.length > 0) {
      const validTempo = tempo.filter(t => typeof t === 'number' && t > 0)
      if (validTempo.length === 0) {
         throw new Error('[bratVid] lyric.tempo array must contain positive numbers')
      }
      return Array.from({ length: totalFrames }, (_, i) =>
         validTempo[i] ?? validTempo[validTempo.length - 1]
      )
   }

   if (Array.isArray(timestamps) && timestamps.length >= totalFrames) {
      for (let i = 1; i < totalFrames; i++) {
         if (timestamps[i] <= timestamps[i - 1]) {
            throw new Error(`[bratVid] lyric.timestamps must be strictly ascending at index ${i}`)
         }
      }
      return Array.from({ length: totalFrames }, (_, i) => {
         if (lastInLayerIdx.has(i)) return Math.max(0.05, lastFrameDuration)
         const dur = (timestamps[i + 1] - timestamps[i]) / 1000
         return Math.max(0.05, dur)
      })
   }

   if (typeof bpm === 'number') {
      if (bpm <= 0) throw new Error('[bratVid] lyric.bpm must be positive')
      const beat = 60 / bpm
      return Array.from({ length: totalFrames }, (_, i) =>
         lastInLayerIdx.has(i) ? Math.max(0.05, lastFrameDuration) : beat
      )
   }

   return Array.from({ length: totalFrames }, (_, i) =>
      lastInLayerIdx.has(i) ? lastFrameDuration : frameDuration
   )
}

async function bratVid(text, options = {}) {
   const {
      outputFormat = 'mp4',
      fast_progress = false,
      theme,
      brat: bratOptions = {},
      lyric = {},
      onProgress,
      signal
   } = options

   const VALID_FORMATS = ['mp4', 'gif']
   if (!VALID_FORMATS.includes(outputFormat)) {
      throw new Error(`[bratVid] outputFormat must be one of: ${VALID_FORMATS.join(', ')}`)
   }

   if (signal?.aborted) throw new Error('[bratVid] operation aborted')

   const frameOptions = {
      ...(theme ? resolveTheme({ theme }) : {}),
      ...bratOptions
   }

   const tokens = tokenize(text)
   if (!tokens.length) throw new Error('[bratVid] No tokens found in text')

   const { maxWordPerLayer = Infinity } = lyric
   const layers = _splitIntoLayers(tokens, maxWordPerLayer)

   const frames = []
   for (let li = 0; li < layers.length; li++) {
      const layer = layers[li]
      let layerText = ''
      for (let ti = 0; ti < layer.length; ti++) {
         layerText += (ti > 0 ? ' ' : '') + layer[ti]
         frames.push({ text: layerText, layerIdx: li, isLastInLayer: ti === layer.length - 1 })
      }
   }

   const totalFrames = frames.length
   const lastInLayerIdx = new Set(
      frames.map((f, i) => f.isLastInLayer ? i : -1).filter(i => i >= 0)
   )

   const durations = _resolveDurations(totalFrames, lastInLayerIdx, lyric)

   const tmpDir = await mkdtemp(join(tmpdir(), 'bratvid-'))
   const framePaths = frames.map((_, i) =>
      join(tmpDir, `frame${String(i + 1).padStart(4, '0')}.png`)
   )

   try {
      if (fast_progress) {
         const BATCH_SIZE = 5
         for (let batchStart = 0; batchStart < totalFrames; batchStart += BATCH_SIZE) {
            if (signal?.aborted) throw new Error('[bratVid] operation aborted')

            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalFrames)
            const batchPromises = []

            for (let i = batchStart; i < batchEnd; i++) {
               const idx = i
               const frameText = frames[idx].text

               batchPromises.push(
                  (async () => {
                     const buf = await bratGen(frameText, frameOptions)
                     if (signal?.aborted) throw new Error('[bratVid] operation aborted')
                     await writeFile(framePaths[idx], buf)
                     if (onProgress) {
                        onProgress({ current: idx + 1, total: totalFrames, text: frameText })
                     }
                  })()
               )
            }

            await Promise.all(batchPromises)
         }
      } else {
         for (let i = 0; i < totalFrames; i++) {
            if (signal?.aborted) throw new Error('[bratVid] operation aborted')

            const frameText = frames[i].text
            const buf = await bratGen(frameText, frameOptions)
            await writeFile(framePaths[i], buf)

            if (onProgress) {
               onProgress({ current: i + 1, total: totalFrames, text: frameText })
            }
         }
      }

      const manifest = buildManifest(framePaths, durations)
      const concatPath = join(tmpDir, 'concat.txt')
      await writeFile(concatPath, manifest)
      const finalBuffer = await encode(concatPath, outputFormat, { signal })
      return finalBuffer
   } finally {
      try {
         await rm(tmpDir, { recursive: true, force: true })
      } catch (err) {}
   }
}

export { bratVid, bratVid as default, tokenize }