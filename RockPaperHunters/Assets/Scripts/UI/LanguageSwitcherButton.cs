using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Button component that toggles the active language between EN and ZH via
/// <see cref="LocalizationManager.ToggleLanguage"/>. Optionally drives a label
/// so the button itself re-renders — "EN" shown when the current language is
/// ZH, and "中" shown when the current language is EN (you're about to switch
/// to the other one).
/// </summary>
[RequireComponent(typeof(Button))]
public class LanguageSwitcherButton : MonoBehaviour
{
    [Tooltip("Optional label on the button. Auto-updates to show the OTHER language (what clicking will switch to).")]
    [SerializeField] private TextMeshProUGUI label;

    [SerializeField] private string labelWhenCurrentIsEn = "中";
    [SerializeField] private string labelWhenCurrentIsZh = "EN";

    private Button _button;

    private void Awake()
    {
        _button = GetComponent<Button>();
    }

    private void OnEnable()
    {
        _button.onClick.AddListener(OnClicked);
        EventBus.Subscribe<LanguageChangedEvent>(OnLanguageChanged);
        RefreshLabel();
    }

    private void OnDisable()
    {
        _button.onClick.RemoveListener(OnClicked);
        EventBus.Unsubscribe<LanguageChangedEvent>(OnLanguageChanged);
    }

    private void OnClicked()
    {
        var mgr = LocalizationManager.Instance;
        if (mgr != null) mgr.ToggleLanguage();
    }

    private void OnLanguageChanged(LanguageChangedEvent _) => RefreshLabel();

    private void RefreshLabel()
    {
        if (label == null) return;
        var mgr = LocalizationManager.Instance;
        if (mgr == null) return;
        label.text = mgr.Language == "zh" ? labelWhenCurrentIsZh : labelWhenCurrentIsEn;
    }
}
