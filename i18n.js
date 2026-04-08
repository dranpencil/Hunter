/**
 * Rock Paper Hunters - i18n (internationalization) module
 *
 * Loads translations.csv at startup and exposes a global t() function
 * for translating strings. Supports placeholder substitution via {0}, {1}, etc.
 *
 * Usage:
 *   t('menu.title')                              -> "Rock Paper Hunters"
 *   t('battle.playerAttacks', name, rolls, dmg)  -> "Alice attacks: [3,5] = 7 damage"
 *
 * To switch language:
 *   setLanguage('en') / setLanguage('zh')
 *
 * Translations are loaded from translations.csv with format:
 *   key,en,zh
 *   menu.title,Rock Paper Hunters,搶劫獵人
 *
 * Missing keys return [MISSING: key.name] so they're easy to spot.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'rph_language';
    const DEFAULT_LANG = 'en';
    const SUPPORTED_LANGS = ['en', 'zh'];

    // In-memory store: { "menu.title": { en: "...", zh: "..." }, ... }
    const translations = {};

    // Current active language
    let currentLanguage = DEFAULT_LANG;

    // Track whether translations have finished loading
    let isLoaded = false;
    const onLoadCallbacks = [];

    // ----------------------------------------------------------------
    // CSV parser (handles quoted fields with embedded commas/newlines)
    // ----------------------------------------------------------------
    function parseCSV(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        let i = 0;

        while (i < text.length) {
            const ch = text[i];

            if (inQuotes) {
                if (ch === '"') {
                    // Escaped quote ""
                    if (text[i + 1] === '"') {
                        field += '"';
                        i += 2;
                        continue;
                    }
                    inQuotes = false;
                    i++;
                    continue;
                }
                field += ch;
                i++;
                continue;
            }

            if (ch === '"') {
                inQuotes = true;
                i++;
                continue;
            }

            if (ch === ',') {
                row.push(field);
                field = '';
                i++;
                continue;
            }

            if (ch === '\n' || ch === '\r') {
                // End of row (handle both \n and \r\n)
                row.push(field);
                field = '';
                if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
                    rows.push(row);
                }
                row = [];
                if (ch === '\r' && text[i + 1] === '\n') i++;
                i++;
                continue;
            }

            field += ch;
            i++;
        }

        // Final field/row
        if (field.length > 0 || row.length > 0) {
            row.push(field);
            if (!(row.length === 1 && row[0] === '')) {
                rows.push(row);
            }
        }

        return rows;
    }

    // ----------------------------------------------------------------
    // Process CSV text into the translations object
    // ----------------------------------------------------------------
    function ingestCSV(csvText) {
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
            console.warn('[i18n] translations.csv is empty');
            return 0;
        }

        // First row is header: key, en, zh, ...
        const header = rows[0].map(function (h) { return h.trim(); });
        const keyIndex = header.indexOf('key');
        if (keyIndex === -1) {
            console.error('[i18n] translations.csv missing "key" column');
            return 0;
        }

        const langCols = {};
        header.forEach(function (col, idx) {
            if (col !== 'key' && col.length > 0) {
                langCols[idx] = col;
            }
        });

        let count = 0;
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const key = (row[keyIndex] || '').trim();
            if (!key) continue;

            if (!translations[key]) translations[key] = {};
            Object.keys(langCols).forEach(function (idxStr) {
                const idx = parseInt(idxStr);
                const lang = langCols[idx];
                const value = row[idx] || '';
                translations[key][lang] = value;
            });
            count++;
        }
        return count;
    }

    // ----------------------------------------------------------------
    // Load translations: prefer embedded global (works under file://)
    // and fall back to fetch() (works under http://)
    // ----------------------------------------------------------------
    function loadTranslations() {
        // Path 1: data was embedded as a JS string via translations.js
        if (typeof window !== 'undefined' && typeof window.__TRANSLATIONS_CSV__ === 'string') {
            const count = ingestCSV(window.__TRANSLATIONS_CSV__);
            console.log('[i18n] Loaded ' + count + ' translation keys (embedded)');
            isLoaded = true;
            onLoadCallbacks.forEach(function (cb) {
                try { cb(); } catch (e) { console.error(e); }
            });
            onLoadCallbacks.length = 0;
            return Promise.resolve();
        }

        // Path 2: fetch the CSV (works on http:// only)
        return fetch('translations.csv?_=' + Date.now())
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load translations.csv: ' + response.status);
                }
                return response.text();
            })
            .then(function (csvText) {
                const count = ingestCSV(csvText);
                console.log('[i18n] Loaded ' + count + ' translation keys (fetch)');
                isLoaded = true;
                onLoadCallbacks.forEach(function (cb) {
                    try { cb(); } catch (e) { console.error(e); }
                });
                onLoadCallbacks.length = 0;
            })
            .catch(function (err) {
                console.error('[i18n] Failed to load translations:', err);
                // Mark loaded anyway so UI doesn't hang
                isLoaded = true;
                onLoadCallbacks.forEach(function (cb) {
                    try { cb(); } catch (e) { console.error(e); }
                });
                onLoadCallbacks.length = 0;
            });
    }

    // ----------------------------------------------------------------
    // Translate a key, optionally substituting placeholders
    // ----------------------------------------------------------------
    function t(key) {
        if (!key) return '';

        const entry = translations[key];
        if (!entry) {
            return '[MISSING: ' + key + ']';
        }

        let value = entry[currentLanguage];
        if (value === undefined || value === null || value === '') {
            // Fall back to other language if current is empty
            const fallbackLang = currentLanguage === 'en' ? 'zh' : 'en';
            value = entry[fallbackLang];
            if (value === undefined || value === null || value === '') {
                return '[UNTRANSLATED: ' + key + ']';
            }
        }

        // Substitute placeholders {0}, {1}, ...
        if (arguments.length > 1) {
            for (let i = 1; i < arguments.length; i++) {
                const placeholder = '{' + (i - 1) + '}';
                // Replace ALL occurrences
                value = value.split(placeholder).join(String(arguments[i]));
            }
        }

        return value;
    }

    // ----------------------------------------------------------------
    // Set the active language and persist it
    // ----------------------------------------------------------------
    function setLanguage(lang) {
        if (SUPPORTED_LANGS.indexOf(lang) === -1) {
            console.warn('[i18n] Unsupported language: ' + lang);
            return;
        }
        currentLanguage = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }

        // Trigger UI refresh by calling a hook on the game object if it exists
        if (typeof window !== 'undefined' && window.game && typeof window.game.onLanguageChanged === 'function') {
            try { window.game.onLanguageChanged(lang); } catch (e) { console.error(e); }
        }

        // Also fire a custom event for any other listeners
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            try {
                window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
            } catch (e) { /* ignore */ }
        }
    }

    function getLanguage() {
        return currentLanguage;
    }

    function isReady() {
        return isLoaded;
    }

    function onReady(callback) {
        if (isLoaded) {
            try { callback(); } catch (e) { console.error(e); }
        } else {
            onLoadCallbacks.push(callback);
        }
    }

    // ----------------------------------------------------------------
    // Initial setup: pick stored language or default, start loading CSV
    // ----------------------------------------------------------------
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGS.indexOf(stored) !== -1) {
            currentLanguage = stored;
        } else {
            // Try to detect browser language
            const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
            if (browserLang.indexOf('zh') === 0) {
                currentLanguage = 'zh';
            } else {
                currentLanguage = DEFAULT_LANG;
            }
        }
    } catch (e) {
        currentLanguage = DEFAULT_LANG;
    }

    // Expose API on window
    window.t = t;
    window.setLanguage = setLanguage;
    window.getLanguage = getLanguage;
    window.i18n = {
        t: t,
        setLanguage: setLanguage,
        getLanguage: getLanguage,
        isReady: isReady,
        onReady: onReady,
        supportedLanguages: SUPPORTED_LANGS.slice()
    };

    // Kick off load immediately
    loadTranslations();
})();
