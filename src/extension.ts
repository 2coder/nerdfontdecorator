// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { setTimeout, clearTimeout } from 'timers';
import { findUnicodeEscapeSequences, getNerdfontDecorations} from './nerdfonthelper';


type DecorationOptionsCache = Map<string, vscode.DecorationOptions[]>;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "tukoda-nerdfontdecorator" is now active!');

	let timeout: NodeJS.Timeout | undefined = undefined;

	let iconColor = new vscode.ThemeColor('editor.foreground');
	let iconBorderColor = new vscode.ThemeColor('editorUnicodeHighlight.border');

	// We need to define a dictionary to store the TextEditorDecorationType for each codepoint
	const nerdfontDecoration = vscode.window.createTextEditorDecorationType({
		border: '2px solid',
		borderColor: iconBorderColor,
		after: {
			fontStyle: 'font-family: "CaskaydiaCove Nerd Font", "CaskaydiaMono Nerd Font"; font-size: 1.2em; font-weight: 300; display: inline-block; width: 1em; text-align: center;',
			margin: '2px 1px 2px 1px',
			color: iconColor,
		},
	});

	let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations(): void {
		if (!activeEditor) { return; }

		const editor = activeEditor;

		// Get the text of the active editor
		const text = editor.document.getText();

		// Search all unicode escape sequences in the text
		const escapeSequenceMarkers = findUnicodeEscapeSequences(text);

		// And get the ones that are valid nerdfont codepoints
		const decorations = getNerdfontDecorations(escapeSequenceMarkers).map(rawDecoration => {
			const cookedString = rawDecoration.cookedString;
			const startPos = editor.document.positionAt(rawDecoration.start);
			const endPos = editor.document.positionAt(rawDecoration.end);
			const hoverMessage = rawDecoration.hoverMessage;
			const range = new vscode.Range(startPos, endPos);
			const decoration: vscode.DecorationOptions = {
				range,
				hoverMessage,
				renderOptions: {
					after: {
						contentText: cookedString,
					}
				}
			};

			return decoration;
		});

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
