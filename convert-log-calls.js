// One-shot codemod: convert addLogEntry(t(...), ...) and logBattleAction(t(...), ...)
// calls into addLogEntryT('key', [args], ...) and logBattleActionT('key', [args], ...).
// Run once: node convert-log-calls.js
// This rewrites game.js in place. Make sure your editor isn't holding the file open.

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'game.js');
let src = fs.readFileSync(filePath, 'utf8');
const before = src.length;

// Helper: parse the args of `t(...)` starting at a given index in the source.
// Returns { key: 'log.foo', args: 'a, b, c', endIndex }.
// Handles nested parentheses and string literals.
function parseTCall(s, start) {
    // s[start..] should look like:  t('key', arg1, arg2)
    // Returns null if we can't parse.
    if (s.substr(start, 2) !== 't(') return null;
    let i = start + 2;
    // Skip whitespace
    while (i < s.length && /\s/.test(s[i])) i++;

    // Read the key string literal: 'foo' or "foo"
    const keyQuote = s[i];
    if (keyQuote !== "'" && keyQuote !== '"') return null;
    let keyEnd = i + 1;
    while (keyEnd < s.length && s[keyEnd] !== keyQuote) {
        if (s[keyEnd] === '\\') keyEnd++;
        keyEnd++;
    }
    if (keyEnd >= s.length) return null;
    const key = s.substring(i + 1, keyEnd);

    // After the key, look for ',' (more args) or ')' (no args)
    let pos = keyEnd + 1;
    while (pos < s.length && /\s/.test(s[pos])) pos++;

    if (s[pos] === ')') {
        return { key, args: '', endIndex: pos + 1 };
    }
    if (s[pos] !== ',') return null;
    pos++; // skip comma

    // Read the rest of the args until the matching close-paren of t()
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
            if (ch === inString) { inString = null; }
            pos++;
            continue;
        }
        if (inTemplate) {
            if (ch === '\\') { pos += 2; continue; }
            if (ch === '`' && templateDepth === 0) { inTemplate = false; }
            else if (ch === '$' && next === '{') { templateDepth++; pos += 2; continue; }
            else if (ch === '}' && templateDepth > 0) { templateDepth--; }
            pos++;
            continue;
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

// Find every occurrence of `addLogEntry(t(...)` or `logBattleAction(t(...)` and rewrite.
// Pattern: METHOD '(' t(...) ',' rest ')'
function rewrite(methodName, replacementName) {
    let count = 0;
    let i = 0;
    const needle = methodName + '(t(';
    while (true) {
        const idx = src.indexOf(needle, i);
        if (idx === -1) break;

        // Position right after `methodName(`
        const tStart = idx + methodName.length + 1;
        const parsed = parseTCall(src, tStart);
        if (!parsed) { i = idx + 1; continue; }

        // After the t() call we expect a comma + the remaining args of methodName, then ')'
        let after = parsed.endIndex;
        // skip whitespace
        while (after < src.length && /\s/.test(src[after])) after++;

        let methodEnd, methodRest;
        if (src[after] === ')') {
            // No more args
            methodEnd = after + 1;
            methodRest = '';
        } else if (src[after] === ',') {
            // Read the remainder up to the matching close-paren of methodName(
            let pos = after + 1;
            let depth = 1;
            let inString = null;
            let inTemplate = false;
            let templateDepth = 0;
            const restStart = pos;
            while (pos < src.length && depth > 0) {
                const ch = src[pos];
                const next = src[pos + 1];
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
            if (depth !== 0) { i = idx + 1; continue; }
            methodRest = src.substring(restStart, pos).trim();
            methodEnd = pos + 1;
        } else {
            i = idx + 1;
            continue;
        }

        // Build the replacement
        const argsArray = parsed.args ? '[' + parsed.args + ']' : '[]';
        let replacement;
        if (methodRest.length > 0) {
            replacement = `${replacementName}('${parsed.key}', ${argsArray}, ${methodRest})`;
        } else {
            replacement = `${replacementName}('${parsed.key}', ${argsArray})`;
        }

        src = src.substring(0, idx) + replacement + src.substring(methodEnd);
        i = idx + replacement.length;
        count++;
    }
    return count;
}

const a = rewrite('addLogEntry', 'addLogEntryT');
const b = rewrite('logBattleAction', 'logBattleActionT');

fs.writeFileSync(filePath, src, 'utf8');
console.log(`Converted ${a} addLogEntry(t(...)) calls`);
console.log(`Converted ${b} logBattleAction(t(...)) calls`);
console.log(`File size: ${before} -> ${src.length} bytes`);
