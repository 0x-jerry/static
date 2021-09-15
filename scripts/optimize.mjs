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
      const file = await fs.readFile(r('upload', p))

      const newFile = await resolveImage(file)

      await fs.writeFile(r('images', p), newFile)
      await fs.unlink(r('upload', p))

      console.log('resolve success:', p)
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
    //an empty object means 'use default settings'
    mozjpeg: {}
  })

  const rawEncodedImage = (await image.encodedWith.mozjpeg).binary

  return rawEncodedImage
}
