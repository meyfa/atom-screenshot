"use babel";

import { CompositeDisposable } from "atom";

const { remote } = require("electron");

const path = remote.require("path");
const fs = remote.require("fs");

export default {

    subscriptions: null,

    activate(state) {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add("atom-workspace", {
            "screenshot:take": this.takeScreenshot,
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    takeScreenshot() {

        const currentWindow = remote.getCurrentWindow();
        const textEditor = atom.workspace.getActiveTextEditor();
        if (!textEditor || !textEditor.buffer) {
            return;
        }

        var bounds = textEditor.editorElement.getBoundingClientRect();
        var rect = {
            x: Math.ceil(bounds.left),
            y: Math.ceil(bounds.top),
            width: Math.floor(bounds.width),
            height: Math.floor(bounds.height),
        };

        var textEditorPath = textEditor.buffer.file.path;
        [projectPath, relPath] = atom.project.relativizePath(textEditorPath);

        remote.dialog.showSaveDialog(currentWindow, {
            title: "Save screenshot as...",
            defaultPath: path.join(projectPath, "screenshot.png"),
            filters: [
                {
                    name: "PNG image",
                    extensions: ["png"]
                }
            ]
        }, function (filename) {
            if (!filename) {
                return;
            }
            currentWindow.capturePage(rect, function (img) {
                fs.writeFile(filename, img.toPng());
            });
        });
    }

};
