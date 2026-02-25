# Code Typewriter Effect

A VSCode extension that plays a typewriter animation on your code — fixed for modern VSCode versions.

## ✅ What's Fixed

The original `junsantilla/vscode-code-typewriter-effect` extension had issues with:

- **Newlines not working correctly** — inserting `\n` character-by-character with `editor.edit()` causes cursor position drift in modern VSCode (1.85+)
- **Indentation lost** — after a newline, the indentation of the next line was typed character-by-character, causing race conditions with VSCode's auto-indent formatter

This fork fixes both issues by:

1. Splitting the text into lines and handling `\n` as a dedicated edit operation that inserts `\n + indentation` atomically
2. Skipping over the indentation characters in the source text after inserting them as part of the newline operation
3. Using `{ undoStopBefore: false, undoStopAfter: false }` on every edit to avoid undo history bloat

## Usage

1. Open a file in VSCode
2. (Optional) Select the text you want to animate — if nothing is selected, the whole file is used
3. Press `Ctrl+Shift+P` → **Start Typewriter Effect**
4. To stop: `Ctrl+Shift+P` → **Stop Typewriter Effect**
5. Right-click in editor → **Start / Stop Typewriter Effect**

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeTypewriterEffect.typingSpeed` | `30` | Milliseconds per character. Lower = faster. |
| `codeTypewriterEffect.preserveIndentation` | `true` | Preserve original indentation on new lines. |

## Installation (Development)

```bash
git clone https://github.com/excel007/vscode-typewriter-effect.git
cd vscode-typewriter-effect
npm install
# Press F5 in VSCode to launch Extension Development Host
```

## Build `.vsix` package

```bash
npm install -g @vscode/vsce
vsce package
```

## License

MIT
