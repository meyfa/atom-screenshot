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
 * Config setting for finish action, that indicates a save prompt should open
 * immediately instead of asking the user what to do.
 *
 * @type {string}
 */
const ACTION_PROMPT_SAVE = 'saveprompt'

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
   * @param {object} editor The TextEditor instance.
   * @returns {object} A (start, end) object specifying 0-indexed line numbers.
   */
  getScreenshotRange (editor) {
    let range = editor.getSelectedScreenRanges().filter(range => !range.isEmpty())
    if (range.length === 0) {
      range = editor.screenRangeForBufferRange(editor.getBuffer().getRange())
    } else {
      // Only support the first range in the case of a multiselect
      range = range[0]
    }
    const start = range.start.row
    const end = range.end.row

    const excludeFinalLine = config.excludeTrailingNewline &&
      end === editor.getLastScreenRow() && editor.lineTextForScreenRow(end) === ''

    return { start, end: excludeFinalLine ? end - 1 : end }
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

    this.handleCaptureResult(window, editor, result)
  },

  /**
   * Call this with a capture result to start the configured action, e.g.
   * copy to clipboard or prompt for save location.
   *
   * @param {object} window The electron remote window.
   * @param {object} editor The TextEditor instance.
   * @param {CaptureResult} captureResult The captured screenshot.
   * @returns {Promise} Resolves when done.
   */
  async handleCaptureResult (window, editor, captureResult) {
    const promptSave = async () => {
      const savePath = await this.showSaveDialog(window, editor)
      if (savePath) {
        await this.saveCaptureResult(captureResult, savePath)
      }
    }

    if (config.actionOnFinish === ACTION_PROMPT_SAVE) {
      promptSave()
    } else {
      captureResult.copyToClipboard()
      const notification = atom.notifications.addInfo('Screenshot copied to clipboard', {
        buttons: [
          {
            text: 'Save as file',
            onDidClick: async () => { await promptSave(); notification.dismiss() }
          }
        ]
      })
    }
  },

  /**
   * Obtain the default save path for a screenshot taken in the given editor.
   *
   * @param {object} editor The TextEditor instance.
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
   * @param {object} editor The TextEditor instance.
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

    if (config.openImage) {
      setTimeout(() => {
        atom.workspace.open(filePath, { split: 'right' })
      }, 100)
    }
  }
}
