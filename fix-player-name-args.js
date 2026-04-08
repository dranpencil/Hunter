// Replace `player.name` with `player` (and similar) inside the args of addLogEntryT/logBattleActionT calls
// so the network serializer wraps player objects as {__player__, name} markers and the receiver
// re-translates them into the local language.
// Run once: node fix-player-name-args.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'game.js');
let src = fs.readFileSync(filePath, 'utf8');

// Replace `getPlayerDisplayName(X)` inside logBattleActionT/addLogEntryT calls with X (the player object)
// because the structured serializer should receive the player, not a pre-rendered display name.
let count1 = 0;
src = src.replace(/(\baddLogEntryT\(|\blogBattleActionT\()([^;]*?)\bthis\.getPlayerDisplayName\(([a-zA-Z_$][\w$.]*)\)/g, function (match, prefix, mid, expr) {
    count1++;
    return prefix + mid + expr;
});

// Repeat until stable (handles multiple occurrences in same call)
let prev;
do {
    prev = src;
    src = src.replace(/(\baddLogEntryT\(|\blogBattleActionT\()([^;]*?)\bthis\.getPlayerDisplayName\(([a-zA-Z_$][\w$.]*)\)/g, function (match, prefix, mid, expr) {
        count1++;
        return prefix + mid + expr;
    });
} while (src !== prev);

// Replace `player.name` -> `player` inside addLogEntryT/logBattleActionT calls (only the args)
// Pattern: addLogEntryT('key', [...player.name...], ...) -> [...player...]
// We do a context-aware replace by walking each call.
function processCalls(methodName) {
    let count = 0;
    let i = 0;
    const needle = methodName + '(';
    while (true) {
        const idx = src.indexOf(needle, i);
        if (idx === -1) break;

        // Find the matching close paren of this call
        let pos = idx + needle.length;
        let depth = 1;
        let inString = null;
        let inTemplate = false;
        let templateDepth = 0;
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

        const callStart = idx;
        const callEnd = pos + 1;
        const callText = src.substring(callStart, callEnd);

        // Replace `player.name` with `player` inside this call only
        // Use word boundaries to avoid clobbering things like `playerInventory.name`
        // Specifically, replace [a-zA-Z_$][\w$]*\.name -> the same identifier (drop .name) when the identifier is "player" or "p"
        // Be conservative: only "player.name", "p.name", "this.currentPlayer.name", "winner.name", "humanPlayer.name", "battlePlayer.name"
        const newCallText = callText.replace(/\b(player|p|battlePlayer|humanPlayer|winner|currentPlayer|guestPlayer|localPlayer|otherPlayer|attacker|defender)\.name\b/g, '$1');

        if (newCallText !== callText) {
            src = src.substring(0, callStart) + newCallText + src.substring(callEnd);
            count++;
            i = callStart + newCallText.length;
        } else {
            i = callEnd;
        }
    }
    return count;
}

const a = processCalls('addLogEntryT');
const b = processCalls('logBattleActionT');

fs.writeFileSync(filePath, src, 'utf8');
console.log(`Stripped ${count1} this.getPlayerDisplayName() wraps from inside log calls`);
console.log(`Converted ${a} player.name -> player in addLogEntryT call args`);
console.log(`Converted ${b} player.name -> player in logBattleActionT call args`);
