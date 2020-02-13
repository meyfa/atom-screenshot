'use babel'

const { remote } = require('electron')
const fs = remote.require('fs')

export default class CaptureResult {
  constructor (image, firstLine, lastLine) {
    this.image = image
    this.firstLine = firstLine
    this.lastLine = lastLine
  }

  async saveAs (filename) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, this.image.toPNG(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
