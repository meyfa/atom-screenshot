'use babel'

import Capturer from './capturer'
import { CompositeDisposable } from 'atom'

import config from './config'

const { remote } = require('electron')
const path = remote.require('path')
const os = remote.require('os')

/**
 * Identifier for the 'Take Code Screenshot' command.
 *
 * @type {string}
 */
const TAKE_COMMAND_ID = 'screenshot:take'

/**
 * Title of the save dialog.
 *
 * @type {string}
 */
const SAVE_DIALOG_TITLE = 'Save screenshot as...'

/**
 * The name entered in the save file dialog by default.
 *
 * @type {string}
 */
const DEFAULT_FILE_NAME = 'screenshot.png'

/**
 * The package singleton.
 */
export default {
  subscriptions: null,

  /**
   * Runs on package activation.
   *
   * @param {object} state Saved state.
   * @returns {void}
   */
  activate (state) {
    // create subscriptions
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      [TAKE_COMMAND_ID]: () => this.takeScreenshot()
    }))
  },

  /**
   * Runs on package deactivation.
   *
   * @returns {void}
   */
  deactivate () {
    this.subscriptions.dispose()
  },

  /**
   * Determine the range (inside the given editor) to take a screenshot of.
   *
   * This is usually the full range, unless there are selections, in which case
   * the line range of the first selection determines the screenshot range.
   *
   * @param   {[type]} editor [description]
   * @returns {[type]}        [description]
   */
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

  /**
   * The default 'screenshot take' action. Determines capture range, takes the
   * screenshot, and then prompts the user to save it.
   *
   * @returns {Promise} Resolves when done.
   */
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

    const capturer = new Capturer(window, editor)

    let result
    try {
      result = await capturer.captureRange(screenshotRange)
    } catch (captureErr) {
      atom.notifications.addError('Capture error', { detail: captureErr })
      console.error(captureErr)
      return
    }

    const savePath = await this.showSaveDialog(window, editor)
    if (savePath) {
      await this.saveCaptureResult(result, savePath)
    }
  },

  /**
   * Obtain the default save path for a screenshot taken in the given editor.
   *
   * @param {object} editor The Atom editor.
   * @returns {string} The save path.
   */
  getDefaultSavePath (editor) {
    let basePath = os.homedir()
    if (editor.buffer.file) {
      const [projectPath] = atom.project.relativizePath(editor.buffer.file.path)
      if (projectPath !== null) {
        basePath = projectPath
      }
    }
    return path.join(basePath, DEFAULT_FILE_NAME)
  },

  /**
   * Prompt the user for a save path.
   *
   * @param {object} window The electron remote window.
   * @param {object} editor The Atom editor.
   * @returns {Promise} Resolves to the absolute file path, or null if canceled.
   */
  async showSaveDialog (window, editor) {
    const defaultPath = this.getDefaultSavePath(editor)

    // promisified save path selection
    const filePath = await new Promise((resolve) => {
      remote.dialog.showSaveDialog(window, {
        title: SAVE_DIALOG_TITLE,
        defaultPath,
        filters: [{ name: 'PNG image', extensions: ['png'] }]
      }, (result) => resolve(result))
    })

    return filePath
  },

  /**
   * Save the capture result to the given path.
   *
   * @param {CaptureResult} captureResult The captured screenshot.
   * @param {string} filePath The path to which the screenshot will be saved.
   * @returns {Promise} Resolves when done.
   */
  async saveCaptureResult (captureResult, filePath) {
    try {
      await captureResult.saveAs(filePath)
    } catch (saveErr) {
      atom.notifications.addError('Could not write file', { detail: saveErr })
      console.error(saveErr)
      return
    }

    atom.notifications.addSuccess('Screenshot saved', { detail: filePath })

    if (config.openImage) {
      atom.workspace.open(filePath, { split: 'right' })
    }
  }
}
