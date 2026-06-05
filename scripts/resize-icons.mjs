/**
 * scripts/resize-icons.mjs
 *
 * One-time script: resize the brand logo into PWA-required sizes.
 * Requires sharp (already a Next.js peer dep via @next/image-optimize).
 *
 * Run: node scripts/resize-icons.mjs
 * Output:
 *   public/images/brand/logo-192.png  (192×192)
 *   public/images/brand/logo-512.png  (512×512)
 *   public/images/brand/apple-touch-icon.png (180×180)
 */

import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'public', 'images', 'brand', 'logo.png')
const outDir = path.join(root, 'public', 'images', 'brand')

const sizes = [
  { name: 'logo-192.png',         size: 192 },
  { name: 'logo-512.png',         size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const dest = path.join(outDir, name)
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 250, b: 240, alpha: 1 }, // matches PWA background_color #FFFAF0
    })
    .png()
    .toFile(dest)
  console.log(`wrote ${dest} (${size}x${size})`)
}

console.log('done')
