using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Per-player phase countdown timers. Runs in online mode only (or whenever
/// <see cref="enabledInLocalModes"/> is toggled for testing). Each player's
/// timer resets on every phase change and stops when that player completes
/// their action for the phase (selection confirmed, shopping finished, etc.).
/// When a timer hits zero a <see cref="PlayerTimerExpiredEvent"/> fires —
/// KickVoteManager listens for that and opens a vote.
///
/// Ported from game.js initPhaseTimers() / startPhaseTimer() around lines 15175–15290.
/// </summary>
public class PhaseTimerManager : MonoBehaviour
{
    [Header("Config")]
    [Tooltip("Seconds each player has per phase. 0 = timers disabled. Matches the JS dropdown (30/60/120/180/disabled).")]
    [SerializeField] private int phaseDurationSeconds = 60;

    [Tooltip("Broadcast a PlayerTimerTickEvent at this cadence (seconds) so UIs can update without spamming every frame.")]
    [SerializeField] private float tickBroadcastInterval = 0.25f;

    [Tooltip("Let timers run in Simultaneous / TurnBased modes too. Default off — JS behaviour is online-only.")]
    [SerializeField] private bool enabledInLocalModes = false;

    private readonly Dictionary<int, float> _remaining = new Dictionary<int, float>();
    private readonly HashSet<int> _stopped = new HashSet<int>();
    private float _nextBroadcast;
    private bool _paused;  // Paused while a kick vote is active (JS behaviour).

    private void OnEnable()
    {
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Subscribe<PlayerSelectionConfirmedEvent>(OnSelectionConfirmed);
        EventBus.Subscribe<PlayerFinishedShoppingEvent>(OnShoppingFinished);
        EventBus.Subscribe<KickVoteStartedEvent>(OnKickVoteStarted);
        EventBus.Subscribe<KickVoteEndedEvent>(OnKickVoteEnded);
        EventBus.Subscribe<PlayerKickedEvent>(OnPlayerKicked);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Unsubscribe<PlayerSelectionConfirmedEvent>(OnSelectionConfirmed);
        EventBus.Unsubscribe<PlayerFinishedShoppingEvent>(OnShoppingFinished);
        EventBus.Unsubscribe<KickVoteStartedEvent>(OnKickVoteStarted);
        EventBus.Unsubscribe<KickVoteEndedEvent>(OnKickVoteEnded);
        EventBus.Unsubscribe<PlayerKickedEvent>(OnPlayerKicked);
    }

    public int PhaseDurationSeconds
    {
        get { return phaseDurationSeconds; }
        set { phaseDurationSeconds = Mathf.Max(0, value); }
    }

    public float GetRemaining(int playerId)
    {
        return _remaining.TryGetValue(playerId, out var value) ? value : 0f;
    }

    public bool IsRunning(int playerId)
    {
        return !_stopped.Contains(playerId) && _remaining.ContainsKey(playerId);
    }

    public void StopTimer(int playerId)
    {
        _stopped.Add(playerId);
    }

    // ---------------------------------------------------------------------
    // Event handlers
    // ---------------------------------------------------------------------

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        ResetForPhase(e.newPhase);
    }

    private void OnSelectionConfirmed(PlayerSelectionConfirmedEvent e) => StopTimer(e.playerId);
    private void OnShoppingFinished(PlayerFinishedShoppingEvent e) => StopTimer(e.playerId);
    private void OnPlayerKicked(PlayerKickedEvent e) => StopTimer(e.playerId);
    private void OnKickVoteStarted(KickVoteStartedEvent _) => _paused = true;
    private void OnKickVoteEnded(KickVoteEndedEvent _) => _paused = false;

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    private void ResetForPhase(GamePhase phase)
    {
        _remaining.Clear();
        _stopped.Clear();

        if (phaseDurationSeconds <= 0) return;
        if (!ShouldRunTimersForMode()) return;
        if (!PhaseUsesTimers(phase)) return;

        var gm = GameManager.Instance;
        if (gm == null) return;

        foreach (var player in gm.Players)
        {
            if (!IsEligibleForTimer(player)) continue;
            _remaining[player.id] = phaseDurationSeconds;
        }
    }

    private void Update()
    {
        if (_paused || _remaining.Count == 0) return;

        float dt = Time.deltaTime;
        // Snapshot keys because we may expire and mutate the dictionary.
        var keys = new List<int>(_remaining.Keys);
        foreach (var id in keys)
        {
            if (_stopped.Contains(id)) continue;
            float value = _remaining[id] - dt;
            _remaining[id] = value;
            if (value <= 0f)
            {
                _remaining[id] = 0f;
                _stopped.Add(id);
                EventBus.Publish(new PlayerTimerExpiredEvent { playerId = id });
            }
        }

        // Throttle tick broadcasts so UIs don't rebuild each frame.
        _nextBroadcast -= dt;
        if (_nextBroadcast <= 0f)
        {
            _nextBroadcast = tickBroadcastInterval;
            foreach (var id in keys)
            {
                if (_stopped.Contains(id)) continue;
                EventBus.Publish(new PlayerTimerTickEvent
                {
                    playerId = id,
                    remainingSeconds = _remaining[id]
                });
            }
        }
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private bool ShouldRunTimersForMode()
    {
        var gm = GameManager.Instance;
        if (gm == null) return false;
        if (gm.Mode == GameMode.Online) return true;
        return enabledInLocalModes;
    }

    private static bool PhaseUsesTimers(GamePhase phase)
    {
        // Selection and Store are the main human-input phases that JS times.
        // Battle has its own per-turn flow; Distribution/Station/NextRound are
        // automatic or quick choices.
        return phase == GamePhase.Selection || phase == GamePhase.Store;
    }

    private static bool IsEligibleForTimer(PlayerData p)
    {
        return p != null && !p.isBot && !p.isKicked;
    }
}
