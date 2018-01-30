"use babel";

import CaptureResult from "./capture-result";

export default class Capturer {

    constructor(stitcher) {
        this.stitcher = stitcher;
    }

    captureAll(window, editor, cb) {
        // capture from line 0 up until the last line
        return this.captureRange(window, editor, {
            start: 0,
            end: editor.getScreenLineCount() - 1,
        }, cb);
    }

    captureRange(window, editor, range, cb) {

        var captures = [];

        // recursively fill captures
        const next = (line) => {
            this.captureStartingAt(window, editor, line, range.end, cr => {
                captures.push(cr);
                if (cr.lastLine >= range.end) {
                    // done!
                    this.stitcher.stitch(captures, cb);
                    return;
                }
                next(cr.lastLine + 1);
            });
        };

        next(range.start);

    }

    captureStartingAt(window, editor, start, limit, cb) {

        // helper function to get bounding rect of a single line
        const getLineBounds = (line) => {
            let selector = ".line[data-screen-row='" + line + "']";
            let element = editor.element.querySelector(selector);
            return element.getBoundingClientRect();
        }

        editor.scrollToScreenPosition([start, 0]);

        setTimeout(() => {

            // overall bounds
            var bounds = editor.element.getBoundingClientRect();

            // limit bounds to left of vertical scrollbar
            var scrollbar = editor.element.querySelector(".vertical-scrollbar");
            var scrollbarOffset = 0;
            if (scrollbar) {
                var scrollbarBounds = scrollbar.getBoundingClientRect();
                scrollbarOffset = bounds.right - scrollbarBounds.left;
            }

            // line bounds
            var startBounds = getLineBounds(start);
            var last = Math.min(limit, editor.getLastVisibleScreenRow());
            if (start < limit) {
                // this is necessary because until the last line is definitely
                // reached, it is sometimes covered by the bottom bar
                last -= 1;
            }
            var lastBounds = getLineBounds(last);

            // perform capture
            window.capturePage({
                x: Math.ceil(bounds.left),
                y: Math.ceil(startBounds.top),
                width: Math.floor(bounds.width - scrollbarOffset),
                height: Math.floor(lastBounds.bottom - startBounds.top),
            }, (img) => {
                // return result
                cb(new CaptureResult(img, start, last));
            });

        }, 50);

    }

}
