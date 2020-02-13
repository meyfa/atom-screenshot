'use babel'

import CaptureResult from './capture-result'
import stitch from './stitch'
import asyncPoll from './util/async-poll'

import config from './config'

/**
 * Interval between scroll position checks, in milliseconds.
 *
 * @type {number}
 */
const SCROLL_INTERVAL = 50

/**
 * Timeout for scrolling operations, in milliseconds.
 *
 * @type {number}
 */
const SCROLL_TIMEOUT = 1000

/**
 * Instances of this class are used to screen-capture ranges in editor panes.
 */
export default class Capturer {
  /**
   * @param {object} window The electron remote window.
   * @param {object} editor The editor pane from which to capture.
   */
  constructor (window, editor) {
    this.window = window
    this.editor = editor
  }

  /**
   * Capture a subset of the whole editor range.
   *
   * @param {object} range The range object, i.e. start/end dictionary.
   * @returns {Promise} Resolves to the capture result.
   */
  async captureRange (range) {
    const captures = []

    let next = range.start
    while (next < range.end) {
      const result = await this.captureStartingAt(next, range.end)
      captures.push(result)
      next = result.lastLine + 1
    }

    return stitch(captures)
  }

  /**
   * Capture everything the editor has to offer, starting at the given line,
   * and at most up to the limit line.
   *
   * @param {number} start The first line that should be on the capture.
   * @param {number} limit The maximum, after which no more lines may be captured.
   * @returns {Promise} Resolves to the capture result.
   */
  async captureStartingAt (start, limit) {
    await this.scrollToPosition(start)

    if (!config.showWrapGuide) {
      this.setWrapGuideVisibility(false)
    }

    let last = Math.min(limit, this.editor.getLastVisibleScreenRow())
    if (start < limit) {
      // this is necessary because until the last line is definitely
      // reached, it is sometimes covered by the bottom bar
      last -= 1
    }

    const rect = this.computeCaptureRect(start, last)
    const img = await this.capturePageRect(rect)

    if (!config.showWrapGuide) {
      this.setWrapGuideVisibility(true)
    }

    return new CaptureResult(img, start, last)
  }

  /**
   * Screen-capture a rectangle. This returns a native image.
   *
   * @param {object} rect Object with x, y, width, height properties.
   * @returns {Promise} Resolves to the nativeImage.
   */
  async capturePageRect (rect) {
    return new Promise((resolve, reject) => {
      // in theory Electron would support promises here, but Atom's dependency
      // is outdated
      this.window.capturePage(rect, (result) => resolve(result))
    })
  }

  /**
   * Show or hide the wrap guide.
   *
   * @param {boolean} visible Whether the wrap guide should be visible.
   * @returns {void}
   */
  setWrapGuideVisibility (visible) {
    const wrapGuide = this.editor.element.querySelector('.wrap-guide')
    if (wrapGuide) {
      wrapGuide.style.visibility = visible ? '' : 'hidden'
    }
  }

  /**
   * Obtain the bounding box of the given line in the viewport.
   *
   * @param {number} lineNumber The line number.
   * @returns {object} The bounds (left, right, top, bottom, width, height).
   */
  getLineBounds (lineNumber) {
    const selector = '.line[data-screen-row="' + lineNumber + '"]'
    const element = this.editor.element.querySelector(selector)

    return element.getBoundingClientRect()
  }

  /**
   * Scroll the editor to the wanted position.
   *
   * @param {number} position The line number that should be at the top.
   * @returns {Promise} Resolves when done, rejects on timeout.
   */
  async scrollToPosition (position) {
    this.editor.scrollToScreenPosition([position, 0])

    await asyncPoll(() => {
      return this.editor.getFirstVisibleScreenRow() <= position
    }, { interval: SCROLL_INTERVAL, timeout: SCROLL_TIMEOUT })
  }

  /**
   * Compute the rect object that should be captured so that it contains all
   * lines from start up to and including last.
   *
   * @param {number} start The first line to include in the capture.
   * @param {number} last The second line to include in the capture.
   * @returns {object} The capture rect (x, y, width, height).
   */
  computeCaptureRect (start, last) {
    // overall bounds
    const bounds = this.editor.element.getBoundingClientRect()

    // limit bounds to left of vertical scrollbar
    const scrollbar = this.editor.element.querySelector('.vertical-scrollbar')
    let scrollbarOffset = 0
    if (scrollbar) {
      const scrollbarBounds = scrollbar.getBoundingClientRect()
      scrollbarOffset = bounds.right - scrollbarBounds.left
    }

    // line bounds
    const startBounds = this.getLineBounds(start)
    const lastBounds = this.getLineBounds(last)

    const includeLineNumbersAndGutter = config.includeLineNumbersAndGutter
    const gutterWidth = Math.max(0, lastBounds.left - bounds.left)

    const x = Math.ceil(includeLineNumbersAndGutter ? bounds.left : lastBounds.left)
    const y = Math.ceil(startBounds.top)
    const width = Math.floor(
      includeLineNumbersAndGutter ? bounds.width - scrollbarOffset
        : Math.min(bounds.width - scrollbarOffset - gutterWidth, lastBounds.width))
    const height = Math.floor(lastBounds.bottom - startBounds.top)

    return { x, y, width, height }
  }
}
