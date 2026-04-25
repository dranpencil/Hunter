using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

/// <summary>
/// Runtime EN/ZH translation service. Loads the shared translations.csv from
/// StreamingAssets/ at startup, exposes <see cref="T"/> for key lookups with
/// {0},{1} placeholder substitution, persists the selected language to
/// PlayerPrefs["rph_language"] (same key the rulebook viewer uses), and
/// publishes <see cref="LanguageChangedEvent"/> on switch.
///
/// Ported from i18n.js. CSV format matches (columns: key, en, zh; quoted
/// fields supported). First-run default: "zh" if the system language code
/// starts with "zh", otherwise "en" — matching i18n.js first-run detection.
/// </summary>
public class LocalizationManager : MonoBehaviour
{
    private const string PrefsKey = "rph_language";
    private const string CsvRelativePath = "translations.csv";

    public static LocalizationManager Instance { get; private set; }

    private readonly Dictionary<string, (string en, string zh)> _entries = new Dictionary<string, (string en, string zh)>();
    private string _language = "en";
    private bool _loaded;

    public string Language => _language;
    public bool IsLoaded => _loaded;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        _language = ResolveInitialLanguage();
        LoadTranslations();
    }

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------

    /// <summary>
    /// Translate a key. Placeholders {0}, {1}, ... are replaced with args.
    /// Missing key → "[MISSING: key]"; empty string in active language →
    /// fallback to the other language, then "[UNTRANSLATED: key]".
    /// </summary>
    public string T(string key, params object[] args)
    {
        if (string.IsNullOrEmpty(key)) return "";

        if (!_entries.TryGetValue(key, out var pair))
            return $"[MISSING: {key}]";

        string raw = _language == "zh" ? pair.zh : pair.en;
        if (string.IsNullOrEmpty(raw))
            raw = _language == "zh" ? pair.en : pair.zh;
        if (string.IsNullOrEmpty(raw))
            return $"[UNTRANSLATED: {key}]";

        if (args == null || args.Length == 0) return raw;
        return SubstitutePlaceholders(raw, args);
    }

    /// <summary>
    /// Switch between "en" and "zh". Persists to PlayerPrefs and publishes
    /// <see cref="LanguageChangedEvent"/> so UI can re-render.
    /// </summary>
    public void SetLanguage(string code)
    {
        if (code != "en" && code != "zh") code = "en";
        if (code == _language) return;

        _language = code;
        PlayerPrefs.SetString(PrefsKey, code);
        PlayerPrefs.Save();

        EventBus.Publish(new LanguageChangedEvent { languageCode = code });
    }

    public void ToggleLanguage()
    {
        SetLanguage(_language == "zh" ? "en" : "zh");
    }

    // ---------------------------------------------------------------------
    // Initial language detection
    // ---------------------------------------------------------------------

    private static string ResolveInitialLanguage()
    {
        if (PlayerPrefs.HasKey(PrefsKey))
        {
            string saved = PlayerPrefs.GetString(PrefsKey, "en");
            if (saved == "en" || saved == "zh") return saved;
        }

        // First-run detection: match i18n.js — default to zh if the OS says zh.
        var sys = Application.systemLanguage;
        if (sys == SystemLanguage.Chinese
            || sys == SystemLanguage.ChineseSimplified
            || sys == SystemLanguage.ChineseTraditional)
        {
            return "zh";
        }
        return "en";
    }

    // ---------------------------------------------------------------------
    // CSV loading
    // ---------------------------------------------------------------------

    private void LoadTranslations()
    {
        string path = Path.Combine(Application.streamingAssetsPath, CsvRelativePath);
        if (!File.Exists(path))
        {
            Debug.LogError($"[LocalizationManager] translations.csv not found at: {path}");
            _loaded = true;
            return;
        }

        try
        {
            string csv = File.ReadAllText(path, Encoding.UTF8);
            ParseCsv(csv);
            _loaded = true;
            Debug.Log($"[LocalizationManager] Loaded {_entries.Count} translation entries (language = {_language}).");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[LocalizationManager] Failed to load translations: {e}");
            _loaded = true;
        }
    }

    /// <summary>
    /// Minimal CSV parser with quoted-field support. Handles embedded commas
    /// inside "..." and "" as an escaped quote. Does not handle newlines
    /// inside quoted fields — translations.csv keeps all entries one per line.
    /// </summary>
    private void ParseCsv(string csv)
    {
        _entries.Clear();

        // Strip BOM if present.
        if (csv.Length > 0 && csv[0] == '﻿') csv = csv.Substring(1);

        bool firstLine = true;
        foreach (var rawLine in csv.Split('\n'))
        {
            string line = rawLine.TrimEnd('\r');
            if (string.IsNullOrEmpty(line)) continue;
            if (firstLine)
            {
                firstLine = false;
                // Skip header row if it looks like one.
                if (line.StartsWith("key,") || line.StartsWith("Key,")) continue;
            }

            var fields = SplitCsvLine(line);
            if (fields.Count < 3) continue;

            string key = fields[0].Trim();
            if (string.IsNullOrEmpty(key)) continue;

            string en = fields[1];
            string zh = fields[2];
            _entries[key] = (en, zh);
        }
    }

    private static List<string> SplitCsvLine(string line)
    {
        var result = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    // "" inside quoted field = literal quote
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    sb.Append(c);
                }
            }
            else
            {
                if (c == ',')
                {
                    result.Add(sb.ToString());
                    sb.Length = 0;
                }
                else if (c == '"' && sb.Length == 0)
                {
                    inQuotes = true;
                }
                else
                {
                    sb.Append(c);
                }
            }
        }
        result.Add(sb.ToString());
        return result;
    }

    private static string SubstitutePlaceholders(string template, object[] args)
    {
        // Replace {0}, {1}, ... in place. Simpler than string.Format for our
        // CSV strings which may contain stray braces or incomplete placeholders.
        var sb = new StringBuilder(template);
        for (int i = 0; i < args.Length; i++)
        {
            string placeholder = "{" + i + "}";
            string replacement = args[i] == null ? "" : args[i].ToString();
            sb.Replace(placeholder, replacement);
        }
        return sb.ToString();
    }
}
