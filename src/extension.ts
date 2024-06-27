import * as vscode from 'vscode';
import { setTimeout, clearTimeout } from 'timers';
import { INerdfontDecoration, findUnicodeEscapeSequences, getNerdfontDecorations } from './nerdfonthelper';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "tukoda-nerdfontdecorator" is now active!');

	let timeout: NodeJS.Timeout | undefined = undefined;

	let iconColor = new vscode.ThemeColor('editor.foreground');
	let borderColor = new vscode.ThemeColor('editorUnicodeHighlight.border');
	let backgroundColor = new vscode.ThemeColor('editorUnicodeHighlight.background');

	// We need to define a dictionary to store the TextEditorDecorationType for each codepoint
	const nerdfontDecoration = vscode.window.createTextEditorDecorationType({
		borderColor: borderColor,
		backgroundColor: backgroundColor,
		borderStyle: 'solid',
		borderWidth: '1px',
		borderSpacing: '2px 2px 2px 2px',
		after: {
			fontStyle: 'font-family: "CaskaydiaCove Nerd Font", "CaskaydiaMono Nerd Font"; font-size: 1.2em; font-weight: 300; display: inline-block; width: 1em; text-align: center;',
			margin: '1px 1px 1px 1px',
			color: iconColor,
			height: '2em',
		},
	});

	let activeEditor = vscode.window.activeTextEditor;

	function rawDecorationToDecorationOptions(rawDecoration: INerdfontDecoration, editor: vscode.TextEditor): vscode.DecorationOptions {
		const cookedString = rawDecoration.cookedString;
		const startPos = editor.document.positionAt(rawDecoration.start);
		const endPos = editor.document.positionAt(rawDecoration.end);
		const hoverMessage = rawDecoration.hoverMessage;
		const range = new vscode.Range(startPos, endPos);
		const decoration: vscode.DecorationOptions = {
			range, hoverMessage, renderOptions: {
				after: {
					contentText: cookedString,
				},
			}
		};
		return decoration;
	}

	function updateDecorations(): void {
		if (!activeEditor) { return; }

		const editor = activeEditor;

		// Get the text of the active editor
		const text = editor.document.getText();

		// Search all unicode escape sequences in the text
		const escapeSequenceMarkers = findUnicodeEscapeSequences(text);

		// And get the ones that are valid nerdfont codepoints
		const rawDecorations = getNerdfontDecorations(escapeSequenceMarkers);
		const decorations = rawDecorations.map(rawDecoration => rawDecorationToDecorationOptions(rawDecoration, editor));

		activeEditor.setDecorations(nerdfontDecoration, decorations);
	}

	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		if (throttle) {
			timeout = setTimeout(updateDecorations, 500);
		} else {
			updateDecorations();
		}
	}

	if (vscode.window.activeTextEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations(true);
		}
	}, null, context.subscriptions);
}
