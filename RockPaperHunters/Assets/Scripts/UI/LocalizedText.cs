using UnityEngine;
using TMPro;

/// <summary>
/// Attach to a GameObject that has a <see cref="TextMeshProUGUI"/> component.
/// The text is populated from <see cref="LocalizationManager"/> using the
/// configured translation key and re-rendered on every
/// <see cref="LanguageChangedEvent"/>. This is the Unity analogue of the
/// `data-i18n="key"` attribute in the JS HTML.
///
/// For dynamic strings (monster names, player names, battle logs) call
/// <see cref="LocalizationManager.T"/> directly; this component is for
/// static labels placed in the prefab/scene.
/// </summary>
[RequireComponent(typeof(TextMeshProUGUI))]
public class LocalizedText : MonoBehaviour
{
    [Tooltip("Translation key (see translations.csv). Leave blank to disable.")]
    [SerializeField] private string translationKey;

    private TextMeshProUGUI _text;

    public string TranslationKey
    {
        get { return translationKey; }
        set
        {
            translationKey = value;
            Refresh();
        }
    }

    private void Awake()
    {
        _text = GetComponent<TextMeshProUGUI>();
    }

    private void OnEnable()
    {
        EventBus.Subscribe<LanguageChangedEvent>(OnLanguageChanged);
        Refresh();
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<LanguageChangedEvent>(OnLanguageChanged);
    }

    private void OnLanguageChanged(LanguageChangedEvent _) => Refresh();

    public void Refresh()
    {
        if (_text == null) _text = GetComponent<TextMeshProUGUI>();
        if (_text == null || string.IsNullOrEmpty(translationKey)) return;

        var mgr = LocalizationManager.Instance;
        if (mgr == null) return;  // Localization not initialised yet; will retry via OnEnable when the scene is ready.

        _text.text = mgr.T(translationKey);
    }
}
