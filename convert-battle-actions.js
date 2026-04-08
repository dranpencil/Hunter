// Codemod: convert `battleActions.push(t('key', args))` to push structured `{k:'key', a:[args]}` objects.
// Run once: node convert-battle-actions.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'game.js');
let src = fs.readFileSync(filePath, 'utf8');

function parseTCall(s, start) {
    if (s.substr(start, 2) !== 't(') return null;
    let i = start + 2;
    while (i < s.length && /\s/.test(s[i])) i++;
    const keyQuote = s[i];
    if (keyQuote !== "'" && keyQuote !== '"') return null;
    let keyEnd = i + 1;
    while (keyEnd < s.length && s[keyEnd] !== keyQuote) {
        if (s[keyEnd] === '\\') keyEnd++;
        keyEnd++;
    }
    if (keyEnd >= s.length) return null;
    const key = s.substring(i + 1, keyEnd);

    let pos = keyEnd + 1;
    while (pos < s.length && /\s/.test(s[pos])) pos++;

    if (s[pos] === ')') return { key, args: '', endIndex: pos + 1 };
    if (s[pos] !== ',') return null;
    pos++;

    let depth = 1;
    let argsStart = pos;
    let inString = null;
    let inTemplate = false;
    let templateDepth = 0;
    while (pos < s.length && depth > 0) {
        const ch = s[pos];
        const next = s[pos + 1];
        if (inString) {
            if (ch === '\\') { pos += 2; continue; }
            if (ch === inString) inString = null;
            pos++; continue;
        }
        if (inTemplate) {
            if (ch === '\\') { pos += 2; continue; }
            if (ch === '`' && templateDepth === 0) inTemplate = false;
            else if (ch === '$' && next === '{') { templateDepth++; pos += 2; continue; }
            else if (ch === '}' && templateDepth > 0) templateDepth--;
            pos++; continue;
        }
        if (ch === "'" || ch === '"') { inString = ch; pos++; continue; }
        if (ch === '`') { inTemplate = true; pos++; continue; }
        if (ch === '(') depth++;
        if (ch === ')') {
            depth--;
            if (depth === 0) break;
        }
        pos++;
    }
    if (depth !== 0) return null;
    const args = s.substring(argsStart, pos).trim();
    return { key, args, endIndex: pos + 1 };
}

let count = 0;
const needle = 'battleActions.push(t(';
let i = 0;
while (true) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) break;
    const tStart = idx + 'battleActions.push('.length;
    const parsed = parseTCall(src, tStart);
    if (!parsed) { i = idx + 1; continue; }

    // After the t() call we expect ')' to close `battleActions.push(`
    let after = parsed.endIndex;
    while (after < src.length && /\s/.test(src[after])) after++;
    if (src[after] !== ')') { i = idx + 1; continue; }

    const argsArray = parsed.args ? '[' + parsed.args + ']' : '[]';
    const replacement = `battleActions.push({k:'${parsed.key}', a:${argsArray}})`;
    src = src.substring(0, idx) + replacement + src.substring(after + 1);
    i = idx + replacement.length;
    count++;
}

fs.writeFileSync(filePath, src, 'utf8');
console.log(`Converted ${count} battleActions.push(t(...)) calls`);
