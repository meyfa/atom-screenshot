"use babel";

import Capturer from "./capturer";
import Stitcher from "./stitcher";
import { CompositeDisposable } from "atom";

const { remote } = require("electron");
const path = remote.require("path");
const os = remote.require("os");

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
        if (!editor || !editor.buffer) {
            atom.notifications.addError("No text editor active", {
                detail: "Please select a text editor.",
            });
            return;
        }

        // obtain default save path
        let basePath = os.homedir();
        if (editor.buffer.file) {
            const editorPath = editor.buffer.file.path;
            const [projectPath, relPath] = atom.project.relativizePath(editorPath);
            if (projectPath !== null) {
                basePath = projectPath;
            }
        }

        // show save path selection
        remote.dialog.showSaveDialog(window, {
            title: "Save screenshot as...",
            defaultPath: path.join(basePath, "screenshot.png"),
            filters: [
                {
                    name: "PNG image",
                    extensions: ["png"]
                }
            ]
        }, (filename) => {
            if (!filename) return;

            // perform capture and save result
            this.capturer.captureAll(window, editor, (captureErr, result) => {
                // error handling
                if (captureErr) {
                    atom.notifications.addError("Capture error", {
                        detail: captureErr,
                    });
                    console.error(captureErr);
                    return;
                }

                result.saveAs(filename, (saveErr) => {
                    // error handling
                    if (saveErr) {
                        atom.notifications.addError("Could not write file", {
                            detail: saveErr,
                        });
                        console.error(saveErr);
                        return;
                    }

                    atom.notifications.addSuccess("Screenshot saved", {
                        detail: filename,
                    });
                });
            });
        });

    },

};
