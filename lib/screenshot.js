"use babel";

import Capturer from "./capturer";
import Stitcher from "./stitcher";
import { CompositeDisposable } from "atom";

const { remote } = require("electron");
const path = remote.require("path");

export default {

    subscriptions: null,
    capturer: null,

    activate(state) {
        // create subscriptions
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add("atom-workspace", {
            "screenshot:take": () => this.takeScreenshot(),
        }));
        // create capturer
        this.capturer = new Capturer(new Stitcher());
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    takeScreenshot() {

        const window = remote.getCurrentWindow();

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor || !editor.buffer) return;

        // obtain default save path
        const editorPath = editor.buffer.file.path;
        const [projectPath, relPath] = atom.project.relativizePath(editorPath);

        // show save path selection
        remote.dialog.showSaveDialog(window, {
            title: "Save screenshot as...",
            defaultPath: path.join(projectPath, "screenshot.png"),
            filters: [
                {
                    name: "PNG image",
                    extensions: ["png"]
                }
            ]
        }, (filename) => {
            if (!filename) return;
            // perform capture and save result
            this.capturer.captureAll(window, editor, cr => {
                cr.saveAs(filename, () => {
                    atom.notifications.addSuccess("Screenshot saved", {
                        detail: filename,
                    });
                });
            });
        });

    },

};
