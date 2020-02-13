'use babel'

import CaptureResult from './capture-result'
import mergeImages from 'merge-images'

const { nativeImage } = require('electron')

export default class Stitcher {
  async stitch (captures) {
    let width = 0
    let height = 0
    const images = []

    for (const capture of captures) {
      // convert capture to { src, x, y } objects
      images.push({
        src: capture.image.toDataURL(),
        x: 0,
        y: height
      })

      const size = capture.image.getSize()
      // width = max(width_1, width_2, ..., width_n)
      width = Math.max(width, size.width)
      // height = height_1 + height_2 + ... + height_n
      height += size.height
    }

    // perform merge
    const b64 = await mergeImages(images, { width, height })
    const img = nativeImage.createFromDataURL(b64)

    // new line range
    const first = captures[0].firstLine
    const last = captures[captures.length - 1].lastLine

    return new CaptureResult(img, first, last)
  }
}
