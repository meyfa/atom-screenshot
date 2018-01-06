"use babel";

const { remote } = require("electron");
const fs = remote.require("fs");

export default class CaptureResult {

    constructor(image, firstLine, lastLine) {
        this.image = image;
        this.firstLine = firstLine;
        this.lastLine = lastLine;
    }

    saveAs(filename) {
        fs.writeFile(filename, this.image.toPng());
    }

}
