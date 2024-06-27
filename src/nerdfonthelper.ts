import unraw from "unraw";

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

// Regular expression to match escaped unicode codepoints
const unicodeCodepointPattern = /\\u[0-9a-fA-F]{4}|\\U[0-9a-fA-F]{8}|\\x[0-9a-fA-F]{2}|&#x[0-9a-fA-F]{1,4}|&#\d{1,5}|U\+[0-9a-fA-F]{4,6}/g;

function isNerdfontCodepoint(codepoint: number | undefined): boolean {
    return codepoint !== undefined && glyphSetCodepointRanges.some(range => codepoint >= range.low && codepoint <= range.high);
}

export interface INerdfontDecoration {
    cookedString: string;
    start: number;
    end: number;
    hoverMessage: string;
}

export type NerdfontDecorations = INerdfontDecoration[];

export interface IEscapeSequenceMarker {
    start: number;
    end: number;
    escapeSequence: string;
}

export type EscapeSequenceMarker = IEscapeSequenceMarker;
export type EscapeSequenceMarkers = EscapeSequenceMarker[];

export function findUnicodeEscapeSequences(text: string): EscapeSequenceMarkers {
    let match;
    let escapeSequenceMarkers: EscapeSequenceMarkers = [];

    while ((match = unicodeCodepointPattern.exec(text)) !== null) {
        const escapeSequence = match[0];
        const start = match.index;
        const end = start + escapeSequence.length;
        escapeSequenceMarkers.push({ start, end, escapeSequence });
    }

    return escapeSequenceMarkers;
}

export function getNerdfontDecorations(escapeSequenceMarkers: EscapeSequenceMarkers): NerdfontDecorations {
    let decorations: NerdfontDecorations = [];
    let previousMarker: EscapeSequenceMarker | undefined;
    let combinedEscapeSequences: string;

    escapeSequenceMarkers.forEach(marker => {
        if (previousMarker === undefined) {
            combinedEscapeSequences = marker.escapeSequence;
            previousMarker = marker;
            return;
        }

        let distance;

        if ((distance = marker.start - previousMarker.end) <= 1) {
            combinedEscapeSequences += ((distance === 1 ? " " : "") + marker.escapeSequence);
            previousMarker = marker;
            return;
        }

        let cookedString = unraw(combinedEscapeSequences);
        let hoverMessage = "'" + combinedEscapeSequences + "'" + " => " + cookedString;
        let start = previousMarker.start;
        let end = marker.end;

        switch (cookedString.length) {
            case 1: // easy case
                let codepoint = cookedString.codePointAt(0);
                if (isNerdfontCodepoint(codepoint)) {
                    decorations.push({ cookedString, start, end, hoverMessage });
                }
                break;

            case 2: // more tricky if we have a surrogate pair
                let codepoint1 = cookedString.codePointAt(0);
                let codepoint2 = cookedString.codePointAt(1);
                if (isNerdfontCodepoint(codepoint1) && isNerdfontCodepoint(codepoint2)) {
                    decorations.push({ cookedString, start, end, hoverMessage });
                }
                break;
            default:
                console.log(`Invalid escape sequence: ${combinedEscapeSequences}`);
                break;
        }
    });

    return decorations;
}
