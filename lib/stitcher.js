'use babel'

import CaptureResult from './capture-result'
import mergeImages from 'merge-images'

const { nativeImage } = require('electron')

export default class Stitcher {
  stitch (captures, cb) {
    let width = 0
    let height = 0
    let images = []

    captures.forEach((capture) => {
      // convert capture to { src, x, y } objects
      images.push({
        src: capture.image.toDataURL(),
        x: 0,
        y: height
      })

      let size = capture.image.getSize()
      // width = max(width_1, width_2, ..., width_n)
      width = Math.max(width, size.width)
      // height = height_1 + height_2 + ... + height_n
      height += size.height
    })

    // perform merge
    mergeImages(images, { width, height }).then(b64 => {
      let img = nativeImage.createFromDataURL(b64)

      // new line range
      let first = captures[0].firstLine
      let last = captures[captures.length - 1].lastLine

      // done
      cb(null, new CaptureResult(img, first, last))
    })
  }
}
