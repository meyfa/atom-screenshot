"use babel";

import CaptureResult from "./capture-result";

export default class Capturer {

    constructor() {
    }

    captureAll(window, editor, cb) {

        var bounds = editor.editorElement.getBoundingClientRect();
        var rect = {
            x: Math.ceil(bounds.left),
            y: Math.ceil(bounds.top),
            width: Math.floor(bounds.width),
            height: Math.floor(bounds.height),
        };

        window.capturePage(rect, img => cb(new CaptureResult(img, -1, -1)));

    }

}
