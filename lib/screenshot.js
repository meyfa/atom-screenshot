'use babel'

import Capturer from './capturer'
import Stitcher from './stitcher'
import { CompositeDisposable } from 'atom'

import config from './config'

const { remote } = require('electron')
const path = remote.require('path')
const os = remote.require('os')

export default {
  subscriptions: null,
  capturer: null,

  activate (state) {
    // create subscriptions
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'screenshot:take': () => this.takeScreenshot()
    }))
    // create capturer
    this.capturer = new Capturer(new Stitcher())
  },

  deactivate () {
    this.subscriptions.dispose()
  },

  getScreenshotRange (editor) {
    let range = editor.getSelectedScreenRanges().filter((range) => !range.isEmpty())
    if (range.length === 0) {
      range = editor.screenRangeForBufferRange(editor.getBuffer().getRange())
    } else {
      // Only support the first range in the case of a multiselect
      range = range[0]
    }
    return { start: range.start.row, end: range.end.row }
  },

  async takeScreenshot () {
    const window = remote.getCurrentWindow()

    const editor = atom.workspace.getActiveTextEditor()
    if (!editor || !editor.buffer) {
      atom.notifications.addError('No text editor active', {
        detail: 'Please select a text editor.'
      })
      return
    }

    const screenshotRange = this.getScreenshotRange(editor)
    const origin = editor.getCursorScreenPosition()
    editor.setSelectedBufferRanges([origin, origin])

    let result
    try {
      result = await this.capturer.captureRange(window, editor, screenshotRange)
    } catch (captureErr) {
      atom.notifications.addError('Capture error', { detail: captureErr })
      console.error(captureErr)
      return
    }

    await this.showSaveDialog(window, editor, result)
  },

  getDefaultSavePath (editor) {
    let basePath = os.homedir()
    if (editor.buffer.file) {
      const [projectPath] = atom.project.relativizePath(editor.buffer.file.path)
      if (projectPath !== null) {
        basePath = projectPath
      }
    }
    return path.join(basePath, 'screenshot.png')
  },

  async showSaveDialog (window, editor, captureResult) {
    const defaultPath = this.getDefaultSavePath(editor)

    // promisified save path selection
    const filename = await new Promise((resolve) => {
      remote.dialog.showSaveDialog(window, {
        title: 'Save screenshot as...',
        defaultPath,
        filters: [{ name: 'PNG image', extensions: ['png'] }]
      }, (filename) => resolve(filename))
    })

    if (filename) {
      await this.saveCaptureResult(captureResult, filename)
    }
  },

  async saveCaptureResult (captureResult, filename) {
    try {
      await captureResult.saveAs(filename)
    } catch (saveErr) {
      atom.notifications.addError('Could not write file', { detail: saveErr })
      console.error(saveErr)
      return
    }

    atom.notifications.addSuccess('Screenshot saved', { detail: filename })

    if (config.openImage) {
      atom.workspace.open(filename, { split: 'right' })
    }
  }
}
