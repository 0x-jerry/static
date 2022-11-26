import { cpus } from 'os'
import fs from 'fs/promises'
import glob from 'fast-glob'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const r = (...args) =>
  fileURLToPath(path.join(import.meta.url, '../..', ...args))

main()

async function main() {
  const images = await glob('**.{jpg,png,jpeg}', { cwd: r('upload') })

  for (const image of images) {
    try {
      const imgPath = r('upload', image)
      const file = await fs.readFile(imgPath)
      const stat = await fs.stat(imgPath)

      const originKb = stat.size / 1024

      const newFile = await resolveImage(file)

      const outputImgPath = r('images', image.replace(/\.\w+$/, '') + '.webp')

      await fs.writeFile(outputImgPath, newFile)

      const outputStat = await fs.stat(outputImgPath)
      const outputKb = outputStat.size / 1024

      console.log(
        `resolve success: ${image}, reduce size: ${originKb.toFixed(
          0
        )}Kb -> ${outputKb.toFixed(0)}Kb`
      )
    } catch (error) {
      console.error('resolve failed:', image)
    }
  }
}

/**
 *
 * @param {Buffer} file
 * @returns
 */
async function resolveImage(file) {
  return sharp(file).webp().toBuffer()
}
