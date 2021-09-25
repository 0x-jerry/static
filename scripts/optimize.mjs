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

      const outputImgPath = r('images', p), newFile
      await fs.writeFile(outputImgPath, newFile)

      const outputStat = await fs.stat(outputImgPath)
      const outputKb = outputStat.size / 1024

      console.log('resolve success:', p,'reduce size:', originKb + 'kb ->', outputKb, 'kb')
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
    mozjpeg: {
      quality: 75,
      baseline: false,
      arithmetic: false,
      progressive: true,
      optimize_coding: true,
      smoothing: 0,
      color_space: 3,
      quant_table: 3,
      trellis_multipass: false,
      trellis_opt_zero: false,
      trellis_opt_table: false,
      trellis_loops: 1,
      auto_subsample: true,
      chroma_subsample: 2,
      separate_chroma_quality: false,
      chroma_quality: 75
    }
  })

  const rawEncodedImage = (await image.encodedWith.mozjpeg).binary

  return rawEncodedImage
}
