using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Runs a single kick-vote session when a player's phase timer expires.
/// Collects Yes/No votes from every eligible (non-bot, non-target) player,
/// counts down for <see cref="GameConfig.kickVoteTimeSeconds"/>, and passes
/// the kick if Yes &gt;= No (tie goes to kick, matching the JS "first voter
/// tiebreaker" outcome in majority-yes-wins edge cases).
///
/// If there are no eligible human voters (e.g. everyone else is a bot),
/// the target is auto-kicked immediately — mirrors JS behaviour.
///
/// Ported from game.js triggerKickVote() / submitKickVote() ~lines 15291–15700.
/// </summary>
public class KickVoteManager : MonoBehaviour
{
    [Header("Debounce")]
    [Tooltip("Seconds to wait before actually starting a vote after a timer expiry, so multiple simultaneous expiries can be batched.")]
    [SerializeField] private float startDebounceSeconds = 0.5f;

    public bool VoteInProgress => _activeTargetId.HasValue;
    public int? ActiveTargetId => _activeTargetId;

    private int? _activeTargetId;
    private float _remainingSeconds;
    private int _yes;
    private int _no;
    private readonly HashSet<int> _votersCast = new HashSet<int>();
    private int _firstVoterId = -1;
    private bool _firstVoterChoice;

    // Debounce buffer for near-simultaneous expiries.
    private readonly List<int> _pendingTargets = new List<int>();
    private float _debounceRemaining;

    private void OnEnable()
    {
        EventBus.Subscribe<PlayerTimerExpiredEvent>(OnTimerExpired);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PlayerTimerExpiredEvent>(OnTimerExpired);
    }

    private void OnTimerExpired(PlayerTimerExpiredEvent e)
    {
        if (!_pendingTargets.Contains(e.playerId))
            _pendingTargets.Add(e.playerId);
        _debounceRemaining = startDebounceSeconds;
    }

    private void Update()
    {
        // Resolve any pending debounced start.
        if (_pendingTargets.Count > 0 && !VoteInProgress)
        {
            _debounceRemaining -= Time.deltaTime;
            if (_debounceRemaining <= 0f)
            {
                int first = _pendingTargets[0];
                _pendingTargets.Clear();
                StartVote(first);
            }
        }

        // Countdown for an active vote.
        if (VoteInProgress)
        {
            _remainingSeconds -= Time.deltaTime;

            // Broadcast live tally/countdown for UI.
            EventBus.Publish(new KickVoteTallyUpdatedEvent
            {
                targetPlayerId = _activeTargetId.Value,
                yesCount = _yes,
                noCount = _no,
                remainingSeconds = Mathf.Max(0f, _remainingSeconds)
            });

            if (_remainingSeconds <= 0f || AllEligibleVotersCast())
            {
                FinishVote();
            }
        }
    }

    // ---------------------------------------------------------------------
    // Public API (UI buttons call this)
    // ---------------------------------------------------------------------

    /// <summary>
    /// Called by a UI button when the local human player votes. Silently
    /// ignored if there's no active vote, if the voter is the target, or if
    /// they've already cast a vote.
    /// </summary>
    public void RegisterVote(int voterId, bool yes)
    {
        if (!VoteInProgress) return;
        if (voterId == _activeTargetId.Value) return;
        if (_votersCast.Contains(voterId)) return;
        if (!IsEligibleVoter(voterId)) return;

        _votersCast.Add(voterId);
        if (_firstVoterId < 0)
        {
            _firstVoterId = voterId;
            _firstVoterChoice = yes;
        }
        if (yes) _yes++; else _no++;
    }

    // ---------------------------------------------------------------------
    // Internal flow
    // ---------------------------------------------------------------------

    private void StartVote(int targetId)
    {
        var gm = GameManager.Instance;
        if (gm == null) return;
        if (targetId < 0 || targetId >= gm.Players.Count) return;
        if (gm.Players[targetId].isKicked) return;

        _activeTargetId = targetId;
        _yes = 0;
        _no = 0;
        _votersCast.Clear();
        _firstVoterId = -1;
        _firstVoterChoice = false;
        _remainingSeconds = Mathf.Max(1f, gm.config.kickVoteTimeSeconds);

        EventBus.Publish(new KickVoteStartedEvent
        {
            targetPlayerIds = new[] { targetId }
        });

        // Auto-kick if no eligible human voters exist (game is all bots besides
        // the target). Matches JS "if no voters (only bots): auto-kick".
        if (CountEligibleVoters() == 0)
        {
            FinishVote(forceKick: true);
        }
    }

    private void FinishVote(bool forceKick = false)
    {
        if (!VoteInProgress) return;

        int target = _activeTargetId.Value;
        bool kickPassed;

        if (forceKick)
        {
            kickPassed = true;
        }
        else if (_yes > _no)
        {
            kickPassed = true;
        }
        else if (_no > _yes)
        {
            kickPassed = false;
        }
        else
        {
            // Tie: fall back to the first voter's choice (JS tiebreaker rule).
            kickPassed = _firstVoterId >= 0 ? _firstVoterChoice : false;
        }

        var kickedIds = kickPassed ? new[] { target } : new int[0];

        if (kickPassed)
        {
            var gm = GameManager.Instance;
            gm?.KickPlayer(target);
        }

        _activeTargetId = null;
        _remainingSeconds = 0f;

        EventBus.Publish(new KickVoteEndedEvent { kickedPlayerIds = kickedIds });
    }

    private bool AllEligibleVotersCast()
    {
        return _votersCast.Count >= CountEligibleVoters();
    }

    private int CountEligibleVoters()
    {
        var gm = GameManager.Instance;
        if (gm == null || !_activeTargetId.HasValue) return 0;
        int count = 0;
        foreach (var p in gm.Players)
        {
            if (IsEligibleVoter(p.id)) count++;
        }
        return count;
    }

    private bool IsEligibleVoter(int playerId)
    {
        var gm = GameManager.Instance;
        if (gm == null || !_activeTargetId.HasValue) return false;
        if (playerId == _activeTargetId.Value) return false;
        if (playerId < 0 || playerId >= gm.Players.Count) return false;
        var p = gm.Players[playerId];
        return p != null && !p.isBot && !p.isKicked;
    }
}
