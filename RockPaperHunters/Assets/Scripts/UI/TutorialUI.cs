using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;

/// <summary>
/// Bottom-docked panel shown during the tutorial. Displays the current step's
/// text (translated via LocalizationManager), a "Step X / Y" progress
/// indicator, a Next button for text-only steps, a Quit button (opens an
/// in-app confirmation modal, not a browser popup), and a transient warning
/// toast shown when the player clicks the wrong thing.
///
/// Ported from tutorial.js UI rendering + index.html #tutorial-panel +
/// #tutorial-quit-confirm-modal.
/// </summary>
public class TutorialUI : MonoBehaviour
{
    [Header("Panel root")]
    [Tooltip("Parent GameObject of the whole tutorial panel. Toggled on TutorialStarted/Ended events.")]
    [SerializeField] private GameObject panelRoot;

    [Header("Step display")]
    [SerializeField] private TextMeshProUGUI progressText;
    [SerializeField] private TextMeshProUGUI stepText;
    [SerializeField] private string progressTemplate = "Step {0} / {1}";

    [Header("Buttons")]
    [SerializeField] private Button nextButton;
    [SerializeField] private Button quitButton;

    [Header("Quit confirmation modal")]
    [SerializeField] private GameObject quitConfirmModalRoot;
    [SerializeField] private Button quitConfirmYesButton;
    [SerializeField] private Button quitConfirmNoButton;

    [Header("Warning toast")]
    [SerializeField] private GameObject warningToastRoot;
    [SerializeField] private TextMeshProUGUI warningToastText;
    [Tooltip("How long (seconds) to show the warning toast when the player clicks the wrong thing.")]
    [SerializeField] private float warningDurationSeconds = 2.5f;
    [SerializeField] private string warningTranslationKey = "tutorial.warning.followInstruction";
    [SerializeField] private string warningFallbackText = "Please follow the instruction.";

    private float _warningHideAt;

    private void Awake()
    {
        SetVisible(false);
        if (quitConfirmModalRoot != null) quitConfirmModalRoot.SetActive(false);
        if (warningToastRoot != null) warningToastRoot.SetActive(false);
    }

    private void OnEnable()
    {
        EventBus.Subscribe<TutorialStartedEvent>(OnTutorialStarted);
        EventBus.Subscribe<TutorialEndedEvent>(OnTutorialEnded);
        EventBus.Subscribe<TutorialStepChangedEvent>(OnStepChanged);
        EventBus.Subscribe<TutorialWarningEvent>(OnWarning);
        EventBus.Subscribe<LanguageChangedEvent>(OnLanguageChanged);

        if (nextButton != null) nextButton.onClick.AddListener(OnNextClicked);
        if (quitButton != null) quitButton.onClick.AddListener(OnQuitRequested);
        if (quitConfirmYesButton != null) quitConfirmYesButton.onClick.AddListener(OnQuitConfirmed);
        if (quitConfirmNoButton != null) quitConfirmNoButton.onClick.AddListener(OnQuitCancelled);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<TutorialStartedEvent>(OnTutorialStarted);
        EventBus.Unsubscribe<TutorialEndedEvent>(OnTutorialEnded);
        EventBus.Unsubscribe<TutorialStepChangedEvent>(OnStepChanged);
        EventBus.Unsubscribe<TutorialWarningEvent>(OnWarning);
        EventBus.Unsubscribe<LanguageChangedEvent>(OnLanguageChanged);

        if (nextButton != null) nextButton.onClick.RemoveListener(OnNextClicked);
        if (quitButton != null) quitButton.onClick.RemoveListener(OnQuitRequested);
        if (quitConfirmYesButton != null) quitConfirmYesButton.onClick.RemoveListener(OnQuitConfirmed);
        if (quitConfirmNoButton != null) quitConfirmNoButton.onClick.RemoveListener(OnQuitCancelled);
    }

    private void Update()
    {
        if (warningToastRoot != null && warningToastRoot.activeSelf && Time.time >= _warningHideAt)
        {
            warningToastRoot.SetActive(false);
        }
    }

    // ---------------------------------------------------------------------

    private void OnTutorialStarted(TutorialStartedEvent _) => SetVisible(true);

    private void OnTutorialEnded(TutorialEndedEvent _)
    {
        SetVisible(false);
        // Ensure any residual modals close when the tutorial tears down.
        if (quitConfirmModalRoot != null) quitConfirmModalRoot.SetActive(false);
        if (warningToastRoot != null) warningToastRoot.SetActive(false);
    }

    private void OnStepChanged(TutorialStepChangedEvent e)
    {
        if (progressText != null)
            progressText.text = string.Format(progressTemplate, e.stepIndex + 1, e.stepCount);

        if (stepText != null && e.step != null)
            stepText.text = ResolveStepText(e.step);

        if (nextButton != null)
            nextButton.gameObject.SetActive(e.step != null && e.step.expectedAction == null);
    }

    private void OnWarning(TutorialWarningEvent _)
    {
        ShowWarning();
    }

    private void OnLanguageChanged(LanguageChangedEvent _)
    {
        // Re-render current step text using the new language.
        var mgr = TutorialManager.Instance;
        if (mgr == null || !mgr.IsActive) return;
        var step = mgr.CurrentStep;
        if (step == null || stepText == null) return;
        stepText.text = ResolveStepText(step);
    }

    // ---------------------------------------------------------------------
    // Button handlers
    // ---------------------------------------------------------------------

    private void OnNextClicked()
    {
        TutorialManager.Instance?.Advance();
    }

    private void OnQuitRequested()
    {
        if (quitConfirmModalRoot != null) quitConfirmModalRoot.SetActive(true);
    }

    private void OnQuitConfirmed()
    {
        if (quitConfirmModalRoot != null) quitConfirmModalRoot.SetActive(false);
        TutorialManager.Instance?.QuitTutorial();
        // Caller scene should listen for TutorialEndedEvent and route to the
        // main menu; as a convenience, do it here if a MainMenu scene exists.
        if (Application.CanStreamedLevelBeLoaded("MainMenu"))
            SceneManager.LoadScene("MainMenu");
    }

    private void OnQuitCancelled()
    {
        if (quitConfirmModalRoot != null) quitConfirmModalRoot.SetActive(false);
    }

    // ---------------------------------------------------------------------

    private void SetVisible(bool visible)
    {
        if (panelRoot != null) panelRoot.SetActive(visible);
    }

    private void ShowWarning()
    {
        if (warningToastRoot == null) return;
        if (warningToastText != null)
        {
            var mgr = LocalizationManager.Instance;
            string msg = (mgr != null) ? mgr.T(warningTranslationKey) : null;
            if (string.IsNullOrEmpty(msg) || msg.StartsWith("[MISSING") || msg.StartsWith("[UNTRANSLATED"))
                msg = warningFallbackText;
            warningToastText.text = msg;
        }
        warningToastRoot.SetActive(true);
        _warningHideAt = Time.time + warningDurationSeconds;
    }

    private static string ResolveStepText(TutorialStep step)
    {
        if (step == null) return "";
        var mgr = LocalizationManager.Instance;
        if (mgr != null && !string.IsNullOrEmpty(step.i18nKey))
            return mgr.T(step.i18nKey);
        return step.inlineText ?? "";
    }
}
