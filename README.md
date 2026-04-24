# PDF Fragment Link Builder - Chrome Extension

## Features

- **Keyboard Shortcut**: Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) to create a fragment link
- **Context Menu**: Right-click anywhere and select "Link to Text Copied in Clipboard"
- **Works in PDF Viewer**: Bypass Chrome PDF viewer limitations by reading from clipboard
- **Works Everywhere**: Create fragment links on any webpage

## How to Use

1. Copy text from the PDF (`Ctrl+C`)
2. Press `Ctrl+Shift+F` or use the context menu
4. If automatic clipboard reading succeeds, the link is generated

## Notes
- This won't work on all PDFs. It is most consistent on PDFs that are not embedded (usually URL ends in .PDF)
- You can't create fragment links that go across page boundaries -- won't work
- Can be used for non-PDF pages, but on regular web pages it will often fail, e.g. if you copy a word in the middle.





