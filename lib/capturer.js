'use babel'

import CaptureResult from './capture-result'

import config from './config'

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
    const captures = []

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
    this.scrollToPosition(editor, start, (err) => {
      if (err) {
        cb(err)
        return
      }

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

      // perform capture
      window.capturePage(rect, (img) => {
        if (!config.showWrapGuide) {
          this.setWrapGuideVisibility(editor, true)
        }
        // return result
        cb(null, new CaptureResult(img, start, last))
      })
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

  scrollToPosition (editor, position, cb) {
    editor.scrollToScreenPosition([position, 0])

    // make sure we don't wait forever for scrolling to complete
    let timeoutReached = false
    setTimeout(() => {
      timeoutReached = true
    }, 1000)

    const checkPosition = setInterval(() => {
      // not yet at the required position?
      if (editor.getFirstVisibleScreenRow() > position) {
        if (timeoutReached) {
          clearInterval(checkPosition)
          cb(new Error('Could not set scroll position (line: ' + position + ')'))
        }
        return
      }
      // position reached - no more iterations needed
      clearInterval(checkPosition)
      cb()
    }, 50)
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
