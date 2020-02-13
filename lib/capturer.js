'use babel'

import CaptureResult from './capture-result'
import asyncPoll from './util/async-poll'

import config from './config'

export default class Capturer {
  constructor (stitcher) {
    this.stitcher = stitcher
  }

  async captureAll (window, editor) {
    // capture from line 0 up until the last line
    return this.captureRange(window, editor, {
      start: 0,
      end: editor.getScreenLineCount() - 1
    })
  }

  async captureRange (window, editor, range) {
    const captures = []

    let next = range.start
    while (next < range.end) {
      const result = await this.captureStartingAt(window, editor, next, range.end)
      captures.push(result)
      next = result.lastLine + 1
    }

    return this.stitcher.stitch(captures)
  }

  async captureStartingAt (window, editor, start, limit) {
    await this.scrollToPosition(editor, start)

    if (!config.showWrapGuide) {
      this.setWrapGuideVisibility(editor, false)
    }

    let last = Math.min(limit, editor.getLastVisibleScreenRow())
    if (start < limit) {
      // this is necessary because until the last line is definitely
      // reached, it is sometimes covered by the bottom bar
      last -= 1
    }

    const rect = this.computeCaptureRect(editor, start, last)
    const img = await this.capturePageRect(window, rect)

    if (!config.showWrapGuide) {
      this.setWrapGuideVisibility(editor, true)
    }

    return new CaptureResult(img, start, last)
  }

  async capturePageRect (window, rect) {
    return new Promise((resolve, reject) => {
      // in theory Electron would support promises here, but Atom's dependency
      // is outdated
      window.capturePage(rect, (result) => resolve(result))
    })
  }

  setWrapGuideVisibility (editor, visible) {
    const wrapGuide = editor.element.querySelector('.wrap-guide')
    if (wrapGuide) {
      wrapGuide.style.visibility = visible ? '' : 'hidden'
    }
  }

  getLineBounds (editor, lineNumber) {
    const selector = '.line[data-screen-row="' + lineNumber + '"]'
    const element = editor.element.querySelector(selector)

    return element.getBoundingClientRect()
  }

  async scrollToPosition (editor, position) {
    editor.scrollToScreenPosition([position, 0])

    await asyncPoll(() => {
      return editor.getFirstVisibleScreenRow() <= position
    }, { interval: 50, timeout: 1000 })
  }

  computeCaptureRect (editor, start, last) {
    // overall bounds
    const bounds = editor.element.getBoundingClientRect()

    // limit bounds to left of vertical scrollbar
    const scrollbar = editor.element.querySelector('.vertical-scrollbar')
    let scrollbarOffset = 0
    if (scrollbar) {
      const scrollbarBounds = scrollbar.getBoundingClientRect()
      scrollbarOffset = bounds.right - scrollbarBounds.left
    }

    // line bounds
    const startBounds = this.getLineBounds(editor, start)
    const lastBounds = this.getLineBounds(editor, last)

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
