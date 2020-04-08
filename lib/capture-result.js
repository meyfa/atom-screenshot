'use babel'

const { remote, clipboard } = require('electron')
const fs = remote.require('fs')

/**
 * Represents a captured screenshot.
 *
 * This class is composed of the `nativeImage` that was captured as well as
 * the start and end line numbers.
 */
export default class CaptureResult {
  /**
   * @param {nativeImage} image The image.
   * @param {number} firstLine The first line included in the capture.
   * @param {number} lastLine The last line included in the capture.
   */
  constructor (image, firstLine, lastLine) {
    this.image = image
    this.firstLine = firstLine
    this.lastLine = lastLine
  }

  /**
   * Save the capture result as a PNG image at the given path.
   *
   * @param {string} filePath The path at which to save.
   * @returns {Promise} Resolves when done or rejects on file system error.
   */
  async saveAs (filePath) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, this.image.toPNG(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Copy the capture result into the system clipboard as a native image.
   *
   * @returns {void}
   */
  copyToClipboard () {
    clipboard.writeImage(this.image)
  }
}
