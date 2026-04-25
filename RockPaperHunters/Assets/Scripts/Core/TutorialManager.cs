using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Singleton that drives the scripted tutorial playthrough. Ported from
/// tutorial.js + tutorial-steps.js. Holds the ordered list of
/// <see cref="TutorialStep"/>s, gates player actions through
/// <see cref="Blocks"/>, advances on <see cref="Notify"/>, and exposes
/// bot-scripting / forced-monster / forced-dice hooks that the real
/// game loop queries when the tutorial is active.
///
/// ---- Hook integration (manual — flagged as designer / follow-up) ----
/// The JS game.js calls `tutorialBlocks(action, params)` and
/// `tutorialNotify(action, params)` at ~18 action sites. Unity needs the
/// same: at the start of each player-initiated action handler add
///
///     if (TutorialManager.Instance != null
///         &amp;&amp; TutorialManager.Instance.Blocks("confirmSelection", null))
///         return;
///
/// and after the action succeeds:
///
///     TutorialManager.Instance?.Notify("confirmSelection", null);
///
/// Candidate sites (not auto-wired by this file):
///   SelectionPhaseUI   — selectCard, confirmSelection
///   StoreUI            — buyStoreItem, finishShopping
///   StationChoiceUI    — selectStationResource
///   BattleUI           — selectMonsterLevel, confirmBattleSelection,
///                        confirmMonsterSelection, playerAttackMonster,
///                        tameMonster, useBattleItem, playerDefense
///   PlayerBoardUI      — upgradeWeapon, restoreHP, restoreEP,
///                        addToUpgrade
///   CapacityOverflowUI — addToUpgradeFromOverflow
///   GameSceneSetup     — toggleBoards
/// </summary>
public class TutorialManager : MonoBehaviour
{
    public static TutorialManager Instance { get; private set; }

    [Header("Step data (inject via Inspector or code)")]
    [Tooltip("Ordered tutorial steps. Can be authored in code, loaded from a ScriptableObject, or populated by a content script.")]
    [SerializeField] private List<TutorialStep> steps = new List<TutorialStep>();

    [Header("Bot scripting")]
    [Tooltip("Optional scripted bot moves keyed by round + moveType. If no script for a (round, moveType) pair, the normal bot AI runs.")]
    [SerializeField] private TutorialBotScript botScript;

    [Header("Forced battle content")]
    [SerializeField] private List<TutorialForcedMonster> forcedMonsters = new List<TutorialForcedMonster>();
    [SerializeField] private List<TutorialForcedRoll> forcedRolls = new List<TutorialForcedRoll>();

    private bool _active;
    private int _currentStepIndex;
    private readonly Dictionary<string, Queue<int[]>> _rollQueues = new Dictionary<string, Queue<int[]>>();

    public bool IsActive => _active;
    public int CurrentStepIndex => _currentStepIndex;
    public TutorialStep CurrentStep => (_active && _currentStepIndex < steps.Count) ? steps[_currentStepIndex] : null;
    public int StepCount => steps.Count;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    /// <summary>
    /// Begin the tutorial. Caller is responsible for having set up a
    /// single-human / single-bot solo game with the expected weapons first
    /// (the JS tutorial starts from the main menu via TutorialManager.start()).
    /// </summary>
    public void StartTutorial()
    {
        if (_active || steps.Count == 0) return;
        _active = true;
        _currentStepIndex = 0;
        BuildRollQueues();
        EventBus.Publish(new TutorialStartedEvent { });
        BroadcastStepChanged();
    }

    /// <summary>
    /// Tear down the tutorial. Called from the quit modal or after the final
    /// step auto-advances. The actual "return to main menu" is the caller's
    /// responsibility.
    /// </summary>
    public void QuitTutorial()
    {
        if (!_active) return;
        _active = false;
        _currentStepIndex = 0;
        _rollQueues.Clear();
        EventBus.Publish(new TutorialEndedEvent { });
    }

    /// <summary>
    /// Advance to the next step. Called from <see cref="Notify"/> when the
    /// just-completed action matches the current step's expectedAction, or
    /// from the UI "Next" button for text-only steps.
    /// </summary>
    public void Advance()
    {
        if (!_active) return;
        _currentStepIndex++;
        if (_currentStepIndex >= steps.Count)
        {
            QuitTutorial();
            return;
        }
        BroadcastStepChanged();
    }

    // ---------------------------------------------------------------------
    // Hook-point API (inserted into action handlers)
    // ---------------------------------------------------------------------

    /// <summary>
    /// Return true if this action doesn't match the current step's expected
    /// action — the caller should abort and show a toast like "Please follow
    /// the instruction". Always returns false when the tutorial is inactive,
    /// so hook-site additions are zero-cost in normal play.
    /// </summary>
    public bool Blocks(string actionType, object actionParams = null)
    {
        if (!_active) return false;
        var step = CurrentStep;
        if (step == null) return false;
        if (step.expectedAction == null || step.expectedAction.type == null) return false;

        // Mismatch — block the action and show the warning toast.
        if (step.expectedAction.type != actionType)
        {
            EventBus.Publish(new TutorialWarningEvent
            {
                expectedAction = step.expectedAction.type,
                attemptedAction = actionType
            });
            return true;
        }

        // Optional param-level match (e.g. "buyStoreItem" but only when the
        // item name equals expected). Subclasses of TutorialExpectedAction
        // can add matching logic; keep it simple for now.
        if (!step.expectedAction.Matches(actionParams))
        {
            EventBus.Publish(new TutorialWarningEvent
            {
                expectedAction = step.expectedAction.type,
                attemptedAction = actionType
            });
            return true;
        }
        return false;
    }

    /// <summary>
    /// Notify the tutorial that an action succeeded. Advances to the next
    /// step when the action matches the current step's expectation.
    /// </summary>
    public void Notify(string actionType, object actionParams = null)
    {
        if (!_active) return;
        var step = CurrentStep;
        if (step == null) return;
        if (step.expectedAction == null || step.expectedAction.type == null) return;

        if (step.expectedAction.type == actionType
            && step.expectedAction.Matches(actionParams))
        {
            Advance();
        }
    }

    // ---------------------------------------------------------------------
    // Scripted-content API (queried by bot AI / combat system)
    // ---------------------------------------------------------------------

    /// <summary>
    /// Scripted bot move for the given round and move type, or null if the
    /// bot AI should run normally. moveType values: "hunterLocation",
    /// "apprenticeLocation", "stationChoice", "storeBuys", "battleAction".
    /// </summary>
    public object GetBotMove(int round, string moveType)
    {
        if (!_active || botScript == null) return null;
        return botScript.Lookup(round, moveType);
    }

    /// <summary>
    /// Scripted monster for the given round/level, or null if the engine
    /// should pick randomly. BattleManager.PickRandomMonster should call
    /// this first.
    /// </summary>
    public TutorialForcedMonster GetForcedMonster(int round, int level)
    {
        if (!_active) return null;
        foreach (var m in forcedMonsters)
        {
            if (m.round == round && m.level == level) return m;
        }
        return null;
    }

    /// <summary>
    /// Pop the next scripted dice roll for the given category ("attack",
    /// "defense", "other"), or null if the engine should roll normally.
    /// CombatSystem.RollDice should consult this before generating dice.
    /// </summary>
    public int[] ConsumeForcedRoll(string category)
    {
        if (!_active) return null;
        if (!_rollQueues.TryGetValue(category, out var q) || q.Count == 0) return null;
        return q.Dequeue();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void BuildRollQueues()
    {
        _rollQueues.Clear();
        foreach (var r in forcedRolls)
        {
            if (string.IsNullOrEmpty(r.category) || r.values == null) continue;
            if (!_rollQueues.TryGetValue(r.category, out var q))
            {
                q = new Queue<int[]>();
                _rollQueues[r.category] = q;
            }
            q.Enqueue(r.values);
        }
    }

    private void BroadcastStepChanged()
    {
        EventBus.Publish(new TutorialStepChangedEvent
        {
            stepIndex = _currentStepIndex,
            stepCount = steps.Count,
            step = CurrentStep
        });
    }
}
