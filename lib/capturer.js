'use babel'

/* global atom */

import CaptureResult from './capture-result'

export default class Capturer {
  constructor (stitcher) {
    this.stitcher = stitcher
  }

  captureAll (window, editor, cb) {
    // capture from line 0 up until the last line
    return this.captureRange(window, editor, {
      start: 0,
      end: editor.getScreenLineCount() - 1
    }, cb)
  }

  captureRange (window, editor, range, cb) {
    let captures = []

    // recursively fill captures
    const next = (line) => {
      this.captureStartingAt(window, editor, line, range.end, (err, result) => {
        // stop immediately on error
        if (err) {
          cb(err)
          return
        }

        captures.push(result)
        if (result.lastLine >= range.end) {
          // done!
          this.stitcher.stitch(captures, cb)
          return
        }
        next(result.lastLine + 1)
      })
    }

    next(range.start)
  }

  captureStartingAt (window, editor, start, limit, cb) {
    // helper function to get bounding rect of a single line
    const getLineBounds = (line) => {
      let selector = ".line[data-screen-row='" + line + "']"
      let element = editor.element.querySelector(selector)
      return element.getBoundingClientRect()
    }

    editor.scrollToScreenPosition([start, 0])

    // make sure we don't wait forever for scrolling to complete
    let timeoutReached = false
    setTimeout(() => {
      timeoutReached = true
    }, 1000)

    if (!atom.config.get('screenshot.showWrapGuide')) {
      this.hideWrapGuide(editor)
    }

    let tryCapture = setInterval(() => {
      // not yet at the required position?
      if (editor.getFirstVisibleScreenRow() > start) {
        if (timeoutReached) {
          clearInterval(tryCapture)
          cb(new Error('Could not set scroll position (line: ' + start + ')'))
        }
        return
      }

      // position reached - no more iterations needed
      clearInterval(tryCapture)

      // overall bounds
      let bounds = editor.element.getBoundingClientRect()

      // limit bounds to left of vertical scrollbar
      let scrollbar = editor.element.querySelector('.vertical-scrollbar')
      let scrollbarOffset = 0
      if (scrollbar) {
        let scrollbarBounds = scrollbar.getBoundingClientRect()
        scrollbarOffset = bounds.right - scrollbarBounds.left
      }

      // line bounds
      let startBounds = getLineBounds(start)
      let last = Math.min(limit, editor.getLastVisibleScreenRow())
      if (start < limit) {
        // this is necessary because until the last line is definitely
        // reached, it is sometimes covered by the bottom bar
        last -= 1
      }
      let lastBounds = getLineBounds(last)

      const includeLineNumbersAndGutter = atom.config.get('screenshot.includeLineNumbersAndGutter')

      let x = Math.ceil(includeLineNumbersAndGutter ? bounds.left : lastBounds.left)
      let y = Math.ceil(startBounds.top)
      let width = Math.floor(
        includeLineNumbersAndGutter ? bounds.width - scrollbarOffset : lastBounds.width)
      let height = Math.floor(lastBounds.bottom - startBounds.top)

      // perform capture
      window.capturePage({ x, y, width, height }, (img) => {
        if (!atom.config.get('screenshot.showWrapGuide')) {
          this.showWrapGuide(editor)
        }
        // return result
        cb(null, new CaptureResult(img, start, last))
      })
    }, 50)
  }

  hideWrapGuide (editor) {
    const wrapGuide = editor.element.querySelector('.wrap-guide')
    wrapGuide.style.visibility = 'hidden'
  }

  showWrapGuide (editor) {
    const wrapGuide = editor.element.querySelector('.wrap-guide')
    wrapGuide.style.visibility = 'inherit'
  }
}
