# brat-canvas

Generate **brat-style images and videos (MP4/GIF)** with clean text layout.
Text in → image or video out.

## ✨ Features
 * Generate **images (PNG)**
 * Generate **videos (MP4 / GIF)** with progressive text reveal
 * Smart text wrapping & justification
 * Auto font scaling (always fits inside the box)
 * **Emoji Support**: Native emoji rendering with brand selection (Apple, Google, etc.)
 * Theme support
 * Fast / memory-safe rendering modes (parallel frame processing)

## 📦 Installation

### npm
```bash
npm install brat-canvas
```

## 🖼️ Generate Image
```javascript
import { writeFile } from 'fs/promises';
import { bratGen } from 'brat-canvas';

const buf = await bratGen('kangen masa lalu ya?');

await writeFile('output.png', buf);
console.log('Done!');
```

## 🎬 Generate Video
```javascript
import { writeFile } from 'fs/promises';
import { bratVid } from 'brat-canvas/video';

const buf = await bratVid('mending tidur gweh mah', {
  outputFormat: 'mp4'
});

await writeFile('output.mp4', buf);
console.log('Done!');
```

## ⚙️ Image Options (bratGen)
```typescript
type ImageOptions = {
  theme?: string; // Theme name (e.g., 'brat', 'apple')
  emojiStyle?: 'apple' | 'google' | 'twitter' | 'facebook' | 'samsung' | 'microsoft';
  debugMode?: boolean; // Print detailed logs (canvas, font size, lines, emoji) (default: false)

  // Layout
  W?: number; // Canvas width (default: 1024)
  H?: number; // Canvas height (default: 1024)
  BOX_W?: number; // Text box width
  BOX_H?: number; // Text box height
  BOX_PAD?: number; // Padding inside the box

  // Text behavior
  LINE_H?: number; // Line height multiplier
  FS_MIN?: number; // Minimum font size
  FS_MAX?: number; // Maximum font size
  BASELINE_ADJ?: number; // Vertical text adjustment (default: 1)

  // Colors
  C_BG?: string; // Background color (hex/rgb)
  C_BOX?: string; // Box color
  C_TEXT?: string; // Text color

  // Effects
  BLUR?: number; // Text blur amount

  // Fonts
  FONT_NAME?: string;
  FONT_WEIGHT?: string | number;
  FALLBACK_FONT?: string;
  fontPaths?: string[]; // Array of paths to local .ttf/.otf files
}
```

## ⚙️ Video Options (bratVid)
```typescript
type VideoOptions = {
  outputFormat?: 'mp4' | 'gif'; // default: 'mp4'
  fast_progress?: boolean; // parallel rendering (faster but uses more RAM)
  debugMode?: boolean; // Print detailed logs (tokens, layers, frames, durations) (default: false)

  // Lyric & Timing Controls
  lyric?: {
    maxWordPerLayer?: number; // Max words per layer before reveal resets (default: Infinity = 1 layer)

    // Choose one timing option:
    frameDuration?: number; // flat duration per frame (default: 0.7s)
    lastFrameDuration?: number; // hold time for last frame of each layer (default: 1.5s)
    bpm?: number; // auto-calculate duration based on Beats Per Minute
    tempo?: number[]; // array of durations (seconds) per token
    timestamps?: number[]; // array of absolute timestamps (ms) for each word
  };

  // Callback & Control
  onProgress?: (data: { current: number, total: number, text: string }) => void;
  signal?: AbortSignal; // used to cancel the generation process

  // Styling
  theme?: string;
  brat?: ImageOptions; // forwarded to bratGen for every frame
}
```

## 🧠 Advanced Options Explained

**BPM (Beats Per Minute)** Sync word reveals to the beat of a track automatically.
```javascript
lyric: { bpm: 120 }
```

**Timestamps** Used for precise lyric syncing. Accepts an array of absolute time in milliseconds.
```javascript
lyric: { timestamps: [0, 450, 900, 1350] }
```

**maxWordPerLayer** Resets the progressive reveal every N words. Useful for lyric videos where each line should appear independently.
```javascript
lyric: { maxWordPerLayer: 5 }

// tokens: [A, B, C, D, E, F, G]  maxWordPerLayer: 3
// layer 1 frames → "A" · "A B" · "A B C"
// layer 2 frames → "D" · "D E" · "D E F"
// layer 3 frames → "G"
```

**onProgress** Useful for creating progress bars in CLI or web interfaces.
```javascript
onProgress: ({ current, total, text }) => {
  console.log(`Processing frame ${current}/${total}: ${text}`);
}
```

**fontPaths** Register local font files without needing to install them on the host system.
```javascript
fontPaths: ['./assets/fonts/BratFont-Bold.ttf']
```

**debugMode** Prints detailed internal logs. Available on both `bratGen` and `bratVid`.
```javascript
// image
bratGen('teks', { debugMode: true });

// video
bratVid('teks', { debugMode: true });
```

## 🧪 Full Example (Lyric Sync)
```javascript
import { writeFile } from 'fs/promises';
import { bratVid } from 'brat-canvas/video';

const vid = await bratVid('akugweh michelle', {
  fast_progress: true,
  theme: 'brat',
  debugMode: true,
  lyric: {
    bpm: 130,
    maxWordPerLayer: 5,
    lastFrameDuration: 2,
  },
  onProgress: (p) => console.log(`Progress: ${p.current}/${p.total}`),
  brat: {
    BLUR: 3,
    emojiStyle: 'twitter'
  }
});

await writeFile('akugweh.mp4', vid);
```

## 🛠 Requirements
 * Node.js 18+
 * **ffmpeg** must be installed and available in your system's PATH
```bash
ffmpeg -version
```
