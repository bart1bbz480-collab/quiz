/**
 * Genereert placeholder PWA-iconen.
 * Vervang later door echte huisstijl-iconen.
 * Gebruik: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const PRIMARY = { r: 37, g: 99, b: 235 } // #2563eb

async function makeIcon(size, path, background = PRIMARY) {
  // Eenvoudig gekleurd vierkant met een "Q" als tekst
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="rgb(${background.r},${background.g},${background.b})" rx="${size * 0.15}"/>
      <text
        x="50%" y="55%"
        font-family="system-ui, sans-serif"
        font-size="${size * 0.5}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >Q</text>
    </svg>
  `
  await sharp(Buffer.from(svg)).png().toFile(path)
  console.log(`✓ ${path}`)
}

await makeIcon(32,  'public/icons/icon-32.png')
await makeIcon(192, 'public/icons/icon-192.png')
await makeIcon(512, 'public/icons/icon-512.png')
await makeIcon(512, 'public/icons/icon-512-maskable.png')
await makeIcon(180, 'public/icons/apple-touch-icon.png')

console.log('\nPlaceholder iconen aangemaakt. Vervang ze later met echte huisstijl-iconen.')
