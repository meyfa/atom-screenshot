# atom-screenshot

**Atom editor plugin for creating code screenshots**

[![Build Status](https://travis-ci.com/meyfa/atom-screenshot.svg?branch=master)](https://travis-ci.com/meyfa/atom-screenshot)
[![Maintainability](https://api.codeclimate.com/v1/badges/a8715072f334495f9370/maintainability)](https://codeclimate.com/github/meyfa/atom-screenshot/maintainability)

With this package, you can take a screenshot of your code as it is shown in
Atom. With syntax highlighting and line numbers, but without any menus or
toolbars.

It captures every line from first to last into a single image by scrolling
through the file.

## Usage

You can invoke the package through the "screenshot:take" command, through the
"Packages" menu in the menu bar, or via the context menu. Note that a text
editor needs to be active so that this package knows which code to capture.

## Example

![Atom window with opened context menu showing the screenshot option](https://raw.githubusercontent.com/meyfa/atom-screenshot/master/images/context-menu.png)

This is the output image:

![Resulting screenshot image](https://raw.githubusercontent.com/meyfa/atom-screenshot/master/images/screenshot-take-result.png)
