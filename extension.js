// @ts-check
'use strict';

const vscode = require('vscode');

/** @type {boolean} */
let isRunning = false;

/** @type {NodeJS.Timeout | null} */
let timeoutHandle = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const startCommand = vscode.commands.registerCommand('codeTypewriterEffect.start', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    if (isRunning) {
      vscode.window.showWarningMessage('Typewriter effect is already running. Use "Stop Typewriter Effect" to stop it.');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;

    // Get the text to type — either selected text or the entire document
    let originalText;
    let startPosition;

    if (!selection.isEmpty) {
      originalText = document.getText(selection);
      startPosition = selection.start;
    } else {
      originalText = document.getText();
      startPosition = new vscode.Position(0, 0);
    }

    if (!originalText) {
      vscode.window.showWarningMessage('No text to apply typewriter effect.');
      return;
    }

    const config = vscode.workspace.getConfiguration('codeTypewriterEffect');
    const typingSpeed = config.get('typingSpeed', 30);

    // Clear the selected region (or full document) first, then retype
    isRunning = true;

    await editor.edit(editBuilder => {
      if (!selection.isEmpty) {
        editBuilder.delete(selection);
      } else {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        editBuilder.delete(fullRange);
      }
    });

    // Split text into lines for proper handling
    // We type character by character within each line,
    // and use editor.edit with a proper newline + indentation for line breaks
    typeCharacters(editor, originalText, startPosition, typingSpeed);
  });

  const stopCommand = vscode.commands.registerCommand('codeTypewriterEffect.stop', () => {
    if (!isRunning) {
      vscode.window.showInformationMessage('Typewriter effect is not running.');
      return;
    }
    stopTypewriter();
    vscode.window.showInformationMessage('Typewriter effect stopped.');
  });

  context.subscriptions.push(startCommand, stopCommand);
}

/**
 * Type characters one by one, handling newlines properly.
 * 
 * Key fix: Instead of inserting '\n' as a raw character (which causes issues in
 * modern VSCode), we split the text into lines and insert each line's content,
 * then use a dedicated newline+indent edit for line breaks.
 *
 * @param {vscode.TextEditor} editor
 * @param {string} text
 * @param {vscode.Position} startPos
 * @param {number} speed
 */
function typeCharacters(editor, text, startPos, speed) {
  let charIndex = 0;
  // Track current cursor position manually
  let currentLine = startPos.line;
  let currentChar = startPos.character;

  // Pre-split lines for indentation reference
  const lines = text.split('\n');

  function typeNext() {
    if (!isRunning) return;
    if (charIndex >= text.length) {
      isRunning = false;
      return;
    }

    const ch = text[charIndex];
    charIndex++;

    if (ch === '\n') {
      // Handle newline: move to next line and restore the indentation of that line
      currentLine++;
      // Get the indentation of the next line from the original text
      const nextLineIndex = currentLine - startPos.line;
      const nextLineContent = nextLineIndex < lines.length ? lines[nextLineIndex] : '';
      const indentMatch = nextLineContent.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';

      // How many characters of the next line are already indentation?
      // We'll skip those chars in charIndex since we insert them here.
      const indentLen = indent.length;

      editor.edit(editBuilder => {
        const pos = new vscode.Position(currentLine - 1, currentChar);
        // Insert newline + indentation of next line in one go
        editBuilder.insert(pos, '\n' + indent);
      }, { undoStopBefore: false, undoStopAfter: false }).then(success => {
        if (!success) {
          stopTypewriter();
          return;
        }
        currentChar = indentLen;
        charIndex += indentLen; // skip over indentation chars already inserted

        // Reveal cursor
        const newPos = new vscode.Position(currentLine, currentChar);
        editor.selection = new vscode.Selection(newPos, newPos);
        editor.revealRange(new vscode.Range(newPos, newPos));

        timeoutHandle = setTimeout(typeNext, speed);
      });
    } else if (ch === '\r') {
      // Skip carriage return (Windows line endings)
      timeoutHandle = setTimeout(typeNext, 0);
    } else {
      // Normal character — insert at current position
      editor.edit(editBuilder => {
        const pos = new vscode.Position(currentLine, currentChar);
        editBuilder.insert(pos, ch);
      }, { undoStopBefore: false, undoStopAfter: false }).then(success => {
        if (!success) {
          stopTypewriter();
          return;
        }
        currentChar++;

        // Move cursor forward visually
        const newPos = new vscode.Position(currentLine, currentChar);
        editor.selection = new vscode.Selection(newPos, newPos);
        editor.revealRange(new vscode.Range(newPos, newPos));

        timeoutHandle = setTimeout(typeNext, speed);
      });
    }
  }

  // Start typing
  timeoutHandle = setTimeout(typeNext, speed);
}

function stopTypewriter() {
  isRunning = false;
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
}

function deactivate() {
  stopTypewriter();
}

module.exports = { activate, deactivate };
