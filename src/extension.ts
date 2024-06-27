// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { setTimeout, clearTimeout } from 'timers';
import { unraw } from 'unraw';
import { get } from 'http';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "tukoda-nerdfontdecorator" is now active!');

	const glyphSetCodepointRanges = [
		{ 'low': 0x23fb, 'high': 0x23fe }, // IEC Power Symbols
		{ 'low': 0x2665, 'high': 0x2665 }, // Octicons
		{ 'low': 0x26a1, 'high': 0x26a1 }, // Octicons
		{ 'low': 0x2b58, 'high': 0x2b58 }, // IEC Power Symbols
		{ 'low': 0xe000, 'high': 0xe00a }, // Pomicons
		{ 'low': 0xe0a0, 'high': 0xe0a2 }, // Powerline
		{ 'low': 0xe0a3, 'high': 0xe0a3 }, // Powerline Extra
		{ 'low': 0xe0b0, 'high': 0xe0b3 }, // Powerline
		{ 'low': 0xe0b4, 'high': 0xe0c8 }, // Powerline Extra
		{ 'low': 0xe0ca, 'high': 0xe0ca }, // Powerline Extra
		{ 'low': 0xe0cc, 'high': 0xe0d7 }, // Powerline Extra
		{ 'low': 0xe200, 'high': 0xe2a9 }, // Font Awesome Extension
		{ 'low': 0xe300, 'high': 0xe3e3 }, // Weather Icons
		{ 'low': 0xe5fa, 'high': 0xe6b5 }, // Seti-UI + Custom
		{ 'low': 0xe700, 'high': 0xe7c5 }, // Devicons
		{ 'low': 0xea60, 'high': 0xec1e }, // Codicons
		{ 'low': 0xed00, 'high': 0xefc1 }, // Font Awesome
		{ 'low': 0xf000, 'high': 0xf2ff }, // Font Awesome
		{ 'low': 0xf300, 'high': 0xf372 }, // Font Logos
		{ 'low': 0xf400, 'high': 0xf533 }, // Octicons
		{ 'low': 0xf500, 'high': 0xfd46 }, // Material Design
		{ 'low': 0xf0001, 'high': 0xf1af0 }, // Material Design
	];

	function isNerdfontCodepoint(codepoint: number | undefined): boolean {
		return codepoint !== undefined && glyphSetCodepointRanges.some(range => codepoint >= range.low && codepoint <= range.high);
	}

	let timeout: NodeJS.Timeout | undefined = undefined;
	let iconColor = new vscode.ThemeColor('editor.foreground');
	let iconBorderColor = new vscode.ThemeColor('editorUnicodeHighlight.border');

	// Regular expression to match escaped unicode codepoints
	const unicodeCodepointPattern = /\\u[0-9a-fA-F]{4}|\\U[0-9a-fA-F]{8}|\\x[0-9a-fA-F]{2}|&#x[0-9a-fA-F]{1,4}|&#\d{1,5}|U\+[0-9a-fA-F]{4,6}/g;

	// We need to define a dictionary to store the TextEditorDecorationType for each codepoint
	const codepointDecorationTypes: Map<number, vscode.TextEditorDecorationType> = new Map();

	// We need to convert the escaped codepoint to the actual unicode character
	// As we support multiple escape variations, we must convert them into the one that we can parse with eval
	function convertCodepointToCharacter(codepoint: string): number | undefined {
		const parsedInt = parseInt(codepoint.replace(/\\u|\\U|\\x|&#x|&#|U\+/, ''), 16);
		return String.fromCodePoint(parsedInt).codePointAt(0);
	}

	function createCodepointDecorationType(codepoint: number): vscode.TextEditorDecorationType {
		const codepointDecoration = vscode.window.createTextEditorDecorationType({
			after: {
				contentText: String.fromCodePoint(codepoint),
				color: iconColor,
				border: '2px solid',
				borderColor: iconBorderColor,
				margin: '1px 0px 1px 0px',
				fontStyle: 'font-family: "Nerd Fonts"; font-size: 1.2em; font-weight: bold; display: inline-block; width: 1em; text-align: center;',								
			},
		});
		codepointDecorationTypes.set(codepoint, codepointDecoration);
		return codepointDecoration;
	}

	function getTextEditorDecorationTypeForCodepoint(codepoint: number | undefined) : vscode.TextEditorDecorationType | undefined {
		return codepoint ? codepointDecorationTypes.get(codepoint) : undefined;
	}

	function getOrCreateTextEditorDecorationTypeForCodepoint(codepoint: number | undefined): vscode.TextEditorDecorationType | undefined {
		return codepoint ? (getTextEditorDecorationTypeForCodepoint(codepoint) || createCodepointDecorationType(codepoint)) : undefined;		
	}

	function addToDecorations(decorations: Map<number, vscode.DecorationOptions[]>, codepoint: number, options: vscode.DecorationOptions): void {
		const existingDecorations = decorations.get(codepoint) || [];
		existingDecorations.push(options);
		decorations.set(codepoint, existingDecorations);

	}

	let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations(): void {
		if (activeEditor) {

			const text = activeEditor.document.getText();

			let decorations: Map<number, vscode.DecorationOptions[]> = new Map<number, vscode.DecorationOptions[]>();
			let match;

			while ((match = unicodeCodepointPattern.exec(text)) !== null) {
				const escapedCodepoint = match[0];
				const codepoint: number | undefined = convertCodepointToCharacter(escapedCodepoint);

				if (!codepoint) { continue; }

				if (!isNerdfontCodepoint(codepoint)) { continue; }

				const startPos = activeEditor.document.positionAt(match.index);
				const endPos = activeEditor.document.positionAt(match.index + match[0].length + 1);
				const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: String.fromCodePoint(codepoint) };

				addToDecorations(decorations, codepoint, decoration);
			}

			const toSet: number[] = Array.from(decorations.keys());
			const toClear: number[] = Array.from(codepointDecorationTypes.keys()).filter((c) => !toSet.includes(c));

			toClear.forEach((c) => {
				const decorationType = codepointDecorationTypes.get(c);
				if (decorationType) {
					activeEditor!.setDecorations(decorationType, []);
				}
			});

			toSet.forEach((c) => {
				const decorationType = getOrCreateTextEditorDecorationTypeForCodepoint(c);
				const decorationOptions = decorations.get(c);
				if (decorationType && decorationOptions) {
					activeEditor!.setDecorations(decorationType, decorationOptions);
				}
			});
		}
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
