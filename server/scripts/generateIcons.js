/**
 * Icon Generator for Blood Donor Finder PWA
 * Generates all required icon sizes using jimp v4 (pure JS, no native deps)
 * Run: node scripts/generateIcons.js
 */
const { Jimp } = require('jimp')
const path = require('path')
const fs = require('fs')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUTPUT_DIR = path.join(__dirname, '../../client/public/icons')

// Colours (in Jimp RGBA hex format: 0xRRGGBBAA)
const BG_COLOR = 0x0f172aff       // slate-950
const RING_COLOR = 0xe11d48ff     // blood-red (rose-600)
const DROP_COLOR = 0xf43f5eff     // rose-500
const TEXT_COLOR = 0xffffffff     // white (fallback)

async function generateIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG_COLOR })

  const cx = size / 2
  const cy = size / 2
  const ringR = size * 0.46
  const ringThick = Math.max(2, size * 0.06)

  // Draw background circle (ring / border)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= ringR && dist >= ringR - ringThick) {
        img.setPixelColor(RING_COLOR, x, y)
      }

    }
  }

  // Draw blood-drop shape (circle top + pointed bottom)
  const dropR = size * 0.22
  const dropCY = cy - size * 0.06  // centre of drop circle part
  const tipY = cy + size * 0.30    // tip of drop at bottom

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - dropCY

      // Circle top half of drop
      if (Math.sqrt(dx * dx + dy * dy) <= dropR) {
        img.setPixelColor(DROP_COLOR, x, y)
        continue
      }

      // Pointed bottom — triangular bounding check
      if (y > dropCY && y <= tipY) {
        const progress = (y - dropCY) / (tipY - dropCY)
        const halfWidth = dropR * (1 - progress)
        if (Math.abs(dx) <= halfWidth) {
          img.setPixelColor(DROP_COLOR, x, y)
        }
      }
    }
  }

  // (font rendering skipped — icon text not available in jimp v4 without extra setup)

  const outPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)
  await img.write(outPath)
  console.log(`✅ Generated ${size}x${size} → ${outPath}`)
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`📁 Created ${OUTPUT_DIR}`)
  }

  console.log('🩸 Generating Blood Donor Finder PWA icons...\n')
  await Promise.all(SIZES.map(generateIcon))
  console.log('\n✅ All icons generated successfully!')
  console.log(`📂 Location: ${OUTPUT_DIR}`)
}

main().catch((err) => { console.error('❌ Error:', err); process.exit(1) })
