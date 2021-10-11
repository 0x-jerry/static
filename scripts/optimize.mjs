import { ImagePool } from '@squoosh/lib'
import { cpus } from 'os'
import fs from 'fs/promises'
import glob from 'fast-glob'
import path from 'path'
import { fileURLToPath } from 'url'

const imagePool = new ImagePool(cpus().length)

const r = (...args) =>
  fileURLToPath(path.join(import.meta.url, '../..', ...args))

main()

async function main() {
  const images = await glob('**.{jpg,png,jpeg}', { cwd: r('upload') })

  const p = images.map(async (p) => {
    try {
      const imgPath = r('upload', p)
      const file = await fs.readFile(imgPath)
      const stat = await fs.stat(imgPath)

      const originKb = stat.size / 1024

      const newFile = await resolveImage(file)

      const outputImgPath = r('images', p.replace(/\.\w+$/, '') + '.webp')

      await fs.writeFile(outputImgPath, newFile)

      const outputStat = await fs.stat(outputImgPath)
      const outputKb = outputStat.size / 1024

      console.log(
        `resolve success: ${p}, reduce size: ${originKb.toFixed(
          0
        )}Kb -> ${outputKb.toFixed(0)}Kb`
      )
    } catch (error) {
      console.error('resolve failed:', p)
    }
  })

  await Promise.all(p)

  await imagePool.close()
}

async function resolveImage(file) {
  const image = imagePool.ingestImage(file)

  // Wait until the image is decoded before running preprocessors.
  await image.decoded

  await image.preprocess({})

  await image.encode({
    webp: {
      quality: 75,
      target_size: 0,
      target_PSNR: 0,
      method: 4,
      sns_strength: 50,
      filter_strength: 60,
      filter_sharpness: 0,
      filter_type: 1,
      partitions: 0,
      segments: 4,
      pass: 1,
      show_compressed: 0,
      preprocessing: 0,
      autofilter: 0,
      partition_limit: 0,
      alpha_compression: 1,
      alpha_filtering: 1,
      alpha_quality: 100,
      lossless: 0,
      exact: 0,
      image_hint: 0,
      emulate_jpeg_size: 0,
      thread_level: 0,
      low_memory: 0,
      near_lossless: 100,
      use_delta_palette: 0,
      use_sharp_yuv: 0
    }
  })

  const rawEncodedImage = (await image.encodedWith.webp).binary

  return rawEncodedImage
}
