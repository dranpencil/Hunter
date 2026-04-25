using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Modal shown while a kick vote is in progress. Displays the target player's
/// name, live Yes/No tally, a countdown ("M:SS"), and Yes/No buttons that
/// route to <see cref="KickVoteManager"/>.
///
/// The local human player's id is read from <see cref="GameManager.LocalPlayerId"/>
/// (or falls back to the first non-bot player if that's not set).
/// Target players and bots can't vote — their buttons are disabled.
///
/// Ported from game.js kick-vote modal ~lines 15291–15700 + index.html #kick-vote-modal.
/// </summary>
public class KickVoteUI : MonoBehaviour
{
    [Header("Modal root")]
    [Tooltip("Parent GameObject that contains the entire kick-vote modal. Toggled active/inactive when a vote starts/ends.")]
    [SerializeField] private GameObject modalRoot;

    [Header("Display")]
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private TextMeshProUGUI messageText;
    [SerializeField] private TextMeshProUGUI yesCountText;
    [SerializeField] private TextMeshProUGUI noCountText;
    [SerializeField] private TextMeshProUGUI timerText;

    [Header("Buttons")]
    [SerializeField] private Button yesButton;
    [SerializeField] private Button noButton;

    [Header("Dependency")]
    [Tooltip("Must reference the KickVoteManager in the scene.")]
    [SerializeField] private KickVoteManager voteManager;

    [Header("Text templates")]
    [SerializeField] private string titleTemplate = "Kick Vote";
    [SerializeField] private string messageTemplate = "Kick {0}?";

    private int? _currentTargetId;

    private void Awake()
    {
        if (modalRoot != null) modalRoot.SetActive(false);
    }

    private void OnEnable()
    {
        EventBus.Subscribe<KickVoteStartedEvent>(OnVoteStarted);
        EventBus.Subscribe<KickVoteTallyUpdatedEvent>(OnTallyUpdated);
        EventBus.Subscribe<KickVoteEndedEvent>(OnVoteEnded);

        if (yesButton != null) yesButton.onClick.AddListener(OnYesClicked);
        if (noButton != null) noButton.onClick.AddListener(OnNoClicked);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<KickVoteStartedEvent>(OnVoteStarted);
        EventBus.Unsubscribe<KickVoteTallyUpdatedEvent>(OnTallyUpdated);
        EventBus.Unsubscribe<KickVoteEndedEvent>(OnVoteEnded);

        if (yesButton != null) yesButton.onClick.RemoveListener(OnYesClicked);
        if (noButton != null) noButton.onClick.RemoveListener(OnNoClicked);
    }

    private void OnVoteStarted(KickVoteStartedEvent e)
    {
        if (e.targetPlayerIds == null || e.targetPlayerIds.Length == 0) return;

        _currentTargetId = e.targetPlayerIds[0];
        var gm = GameManager.Instance;
        string targetName = "Player";
        if (gm != null && _currentTargetId.Value >= 0 && _currentTargetId.Value < gm.Players.Count)
            targetName = gm.Players[_currentTargetId.Value].playerName;

        if (titleText != null) titleText.text = titleTemplate;
        if (messageText != null) messageText.text = string.Format(messageTemplate, targetName);
        if (yesCountText != null) yesCountText.text = "0";
        if (noCountText != null) noCountText.text = "0";
        if (timerText != null) timerText.text = "";

        // Disable voting for the target or for bots (local human is the only
        // one with access to this UI in practice, but guard anyway).
        bool localCanVote = LocalPlayerCanVote();
        if (yesButton != null) yesButton.interactable = localCanVote;
        if (noButton != null) noButton.interactable = localCanVote;

        if (modalRoot != null) modalRoot.SetActive(true);
    }

    private void OnTallyUpdated(KickVoteTallyUpdatedEvent e)
    {
        if (!_currentTargetId.HasValue || e.targetPlayerId != _currentTargetId.Value) return;

        if (yesCountText != null) yesCountText.text = e.yesCount.ToString();
        if (noCountText != null) noCountText.text = e.noCount.ToString();
        if (timerText != null) timerText.text = FormatTime(e.remainingSeconds);
    }

    private void OnVoteEnded(KickVoteEndedEvent _)
    {
        _currentTargetId = null;
        if (modalRoot != null) modalRoot.SetActive(false);
    }

    private void OnYesClicked() => SubmitVote(true);
    private void OnNoClicked() => SubmitVote(false);

    private void SubmitVote(bool yes)
    {
        if (voteManager == null) return;
        int voterId = GetLocalPlayerId();
        if (voterId < 0) return;
        voteManager.RegisterVote(voterId, yes);

        // One-shot: prevent double-voting.
        if (yesButton != null) yesButton.interactable = false;
        if (noButton != null) noButton.interactable = false;
    }

    // ---------------------------------------------------------------------

    private bool LocalPlayerCanVote()
    {
        var gm = GameManager.Instance;
        if (gm == null || !_currentTargetId.HasValue) return false;
        int me = GetLocalPlayerId();
        if (me < 0 || me == _currentTargetId.Value) return false;
        var p = gm.Players[me];
        return p != null && !p.isBot && !p.isKicked;
    }

    private static int GetLocalPlayerId()
    {
        var gm = GameManager.Instance;
        if (gm == null) return -1;

        // Prefer an explicit local player id if GameManager exposes one in the
        // future (online mode). For local play, the first human is "you".
        foreach (var p in gm.Players)
        {
            if (p != null && !p.isBot) return p.id;
        }
        return -1;
    }

    private static string FormatTime(float seconds)
    {
        if (seconds < 0f) seconds = 0f;
        int total = Mathf.CeilToInt(seconds);
        int m = total / 60;
        int s = total % 60;
        return string.Format("{0}:{1:D2}", m, s);
    }
}
