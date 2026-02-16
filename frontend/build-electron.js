import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function buildElectron() {
  const outputDir = path.join(__dirname, 'dist-electron')
  
  // Create dist-electron directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src-electron/main.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(outputDir, 'main.js'),
      external: ['electron'],
      sourcemap: true,
    })

    // Build preload
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src-electron/preload.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(outputDir, 'preload.js'),
      external: ['electron'],
      sourcemap: true,
    })

    console.log('✅ Electron build completed')
  } catch (err) {
    console.error('❌ Electron build failed:', err)
    process.exit(1)
  }
}

buildElectron()
