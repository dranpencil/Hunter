using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Phase-based state machine. Replaces scattered roundPhase checks in game.js.
/// Each phase implements IGamePhase for enter/update/exit lifecycle.
/// </summary>
public enum GamePhase
{
    Setup,
    Selection,
    Distribution,
    Station,
    Store,
    Battle,
    NextRound,
    CapacityOverflow,
    GameOver
}

public interface IGamePhase
{
    GamePhase PhaseId { get; }
    void Enter(GameManager gm);
    void Update(GameManager gm);
    void Exit(GameManager gm);
}

public class GameStateMachine
{
    public GamePhase CurrentPhase { get; private set; }
    private IGamePhase _currentPhaseHandler;

    private readonly IGamePhase[] _phases;

    public GameStateMachine()
    {
        _phases = new IGamePhase[]
        {
            new SelectionPhase(),
            new DistributionPhase(),
            new StationPhase(),
            new StorePhase(),
            new BattlePhase(),
            new NextRoundPhase(),
            new CapacityOverflowPhase(),
            new GameOverPhase()
        };
    }

    public void TransitionTo(GamePhase newPhase, GameManager gm)
    {
        var previousPhase = CurrentPhase;
        _currentPhaseHandler?.Exit(gm);

        CurrentPhase = newPhase;
        _currentPhaseHandler = GetPhaseHandler(newPhase);
        _currentPhaseHandler?.Enter(gm);

        EventBus.Publish(new PhaseChangedEvent
        {
            previousPhase = previousPhase,
            newPhase = newPhase,
            round = gm.CurrentRound
        });
    }

    public void Update(GameManager gm)
    {
        _currentPhaseHandler?.Update(gm);
    }

    private IGamePhase GetPhaseHandler(GamePhase phase)
    {
        foreach (var handler in _phases)
        {
            if (handler.PhaseId == phase)
                return handler;
        }
        return null;
    }
}

// ==========================================
// Phase Implementations
// ==========================================

/// <summary>
/// Selection Phase: all players choose hunter + apprentice locations.
/// UI handles the actual selection; this phase just manages completion tracking.
/// </summary>
public class SelectionPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.Selection;
    private bool _allSelected;

    public void Enter(GameManager gm)
    {
        _allSelected = false;
        gm.ResetPlayerCompletionStatus();

        // Clear previous round's token placements
        foreach (var player in gm.Players)
        {
            player.hunterLocation = null;
            player.apprenticeLocation = null;
            player.selectedHunterCard = null;
            player.selectedApprenticeCard = null;
        }

        EventBus.Subscribe<AllPlayersSelectedEvent>(OnAllSelected);

        EventBus.Publish(new GameLogEvent
        {
            message = $"Round {gm.CurrentRound} - Selection Phase",
            logType = GameLogType.System
        });
    }

    private void OnAllSelected(AllPlayersSelectedEvent e)
    {
        _allSelected = true;
    }

    public void Update(GameManager gm)
    {
        if (_allSelected)
        {
            _allSelected = false;
            gm.StateMachine.TransitionTo(GamePhase.Distribution, gm);
        }
    }

    public void Exit(GameManager gm)
    {
        EventBus.Unsubscribe<AllPlayersSelectedEvent>(OnAllSelected);
    }
}

/// <summary>
/// Distribution Phase: reveal token placements, distribute resources, update popularity.
/// This phase runs automatically (no player input needed).
/// </summary>
public class DistributionPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.Distribution;
    private bool _processed;

    public void Enter(GameManager gm)
    {
        _processed = false;

        // Place tokens based on selections
        foreach (var player in gm.Players)
        {
            if (player.selectedHunterCard.HasValue)
            {
                player.hunterLocation = player.selectedHunterCard.Value;
                EventBus.Publish(new TokenPlacedEvent
                {
                    playerId = player.id,
                    isHunter = true,
                    location = player.hunterLocation.Value
                });
            }
            if (player.selectedApprenticeCard.HasValue)
            {
                player.apprenticeLocation = player.selectedApprenticeCard.Value;
                EventBus.Publish(new TokenPlacedEvent
                {
                    playerId = player.id,
                    isHunter = false,
                    location = player.apprenticeLocation.Value
                });
            }
        }

        // Track forest players
        gm.MonsterEffects.ClearRoundEffects();
        foreach (var player in gm.Players)
        {
            if (player.hunterLocation == LocationId.Forest)
                gm.MonsterEffects.RegisterForestPlayer(player.id);
        }

        // Update popularity track
        foreach (var player in gm.Players)
        {
            gm.Popularity.UpdatePopularity(player);
            gm.Popularity.CheckPlazaAndAloneBonuses(player);
        }

        // Distribute normal resources (all locations except Forest and Station)
        gm.Resources.DistributeNormalResources();

        // Bat Lv1 power: apprentice at resource location with other hunters gives +1 resource
        ApplyBatApprenticePower(gm);

        EventBus.Publish(new GameLogEvent
        {
            message = "Resources distributed",
            logType = GameLogType.Action
        });

        _processed = true;
    }

    private void ApplyBatApprenticePower(GameManager gm)
    {
        foreach (var player in gm.Players)
        {
            if (player.weaponData.weaponName != "Bat") continue;
            if (player.GetCurrentPowerLevel() < 1) continue;
            if (!player.apprenticeLocation.HasValue) continue;

            LocationId loc = player.apprenticeLocation.Value;
            if (loc == LocationId.Forest || loc == LocationId.Station) continue;

            // Check if there are other players' hunters at this location
            var hunters = gm.GetHuntersAtLocation(loc);
            bool hasOtherHunters = false;
            foreach (var h in hunters)
            {
                if (h.id != player.id) { hasOtherHunters = true; break; }
            }

            if (hasOtherHunters)
            {
                var locData = gm.GetLocationData(loc);
                if (locData != null && locData.resourceType != ResourceType.None)
                {
                    gm.Resources.ApplyResource(player, locData.resourceType, 1);
                    EventBus.Publish(new GameLogEvent
                    {
                        message = $"{player.playerName}'s Bat Lv1: +1 {locData.resourceType} from apprentice",
                        logType = GameLogType.Action
                    });
                }
            }
        }
    }

    public void Update(GameManager gm)
    {
        if (_processed)
        {
            _processed = false;

            // Check if any hunters are at Station
            var stationHunters = gm.GetHuntersAtLocation(LocationId.Station);
            if (stationHunters.Count > 0)
            {
                gm.StateMachine.TransitionTo(GamePhase.Station, gm);
            }
            else
            {
                gm.StateMachine.TransitionTo(GamePhase.Store, gm);
            }
        }
    }

    public void Exit(GameManager gm) { }
}

/// <summary>
/// Station Phase: hunters at Station choose which resource type to receive.
/// </summary>
public class StationPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.Station;
    private List<PlayerData> _pendingPlayers;
    private int _currentIndex;
    private Dictionary<int, ResourceType> _stationChoices;
    private int _stationTotalTokens;
    private bool _waitingForChoice;

    public void Enter(GameManager gm)
    {
        _pendingPlayers = gm.GetHuntersAtLocation(LocationId.Station);
        _stationChoices = new Dictionary<int, ResourceType>();
        _stationTotalTokens = gm.CountTokensAtLocation(LocationId.Station);
        _currentIndex = 0;
        _waitingForChoice = false;

        EventBus.Subscribe<StationChoiceMadeEvent>(OnStationChoice);

        PromptNextPlayer(gm);
    }

    private void PromptNextPlayer(GameManager gm)
    {
        // Skip bots (auto-choose for them)
        while (_currentIndex < _pendingPlayers.Count)
        {
            var player = _pendingPlayers[_currentIndex];
            if (player.isBot)
            {
                // Bot picks the resource they need most
                ResourceType choice = BotChooseStationResource(player);
                _stationChoices[player.id] = choice;
                _currentIndex++;
                continue;
            }

            // Human player: show station choice UI
            int rewardAmount = CalculateStationReward(gm);
            EventBus.Publish(new StationChoiceRequestedEvent
            {
                playerId = player.id,
                rewardAmount = rewardAmount
            });
            _waitingForChoice = true;
            return;
        }

        // All station players have chosen — distribute
        DistributeStationResources(gm);
    }

    private ResourceType BotChooseStationResource(PlayerData player)
    {
        // Pick the resource they need most
        float moneyRatio = (float)player.money / player.maxMoney;
        float expRatio = (float)player.exp / player.maxExp;
        float hpRatio = (float)player.hp / player.maxHp;
        float epRatio = (float)player.ep / player.maxEp;

        float minRatio = Mathf.Min(moneyRatio, expRatio, hpRatio, epRatio);

        if (minRatio == moneyRatio) return ResourceType.Money;
        if (minRatio == expRatio) return ResourceType.Exp;
        if (minRatio == epRatio) return ResourceType.Beer;
        return ResourceType.BloodBag;
    }

    private void OnStationChoice(StationChoiceMadeEvent e)
    {
        _stationChoices[e.playerId] = e.chosenResource;
        _waitingForChoice = false;
        _currentIndex++;
    }

    public void Update(GameManager gm)
    {
        if (!_waitingForChoice && _currentIndex < _pendingPlayers.Count)
        {
            PromptNextPlayer(gm);
        }
    }

    private int CalculateStationReward(GameManager gm)
    {
        // Station reward scales like other locations based on token density
        var rewards = gm.config.rewardScale2Players; // Default
        switch (gm.PlayerCount)
        {
            case 2: rewards = gm.config.rewardScale2Players; break;
            case 3: rewards = gm.config.rewardScale3Players; break;
            case 4: rewards = gm.config.rewardScale4Players; break;
        }

        int densityIndex = Mathf.Clamp(_stationTotalTokens - 1, 0, rewards.Length - 1);
        return rewards[densityIndex];
    }

    private void DistributeStationResources(GameManager gm)
    {
        int rewardAmount = CalculateStationReward(gm);

        foreach (var kvp in _stationChoices)
        {
            var player = gm.Players[kvp.Key];
            gm.Resources.ApplyResource(player, kvp.Value, rewardAmount);

            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName} received {rewardAmount} {kvp.Value} from Station",
                logType = GameLogType.Action
            });
        }

        // Transition to Store phase
        gm.StateMachine.TransitionTo(GamePhase.Store, gm);
    }

    public void Exit(GameManager gm)
    {
        EventBus.Unsubscribe<StationChoiceMadeEvent>(OnStationChoice);
    }
}

/// <summary>
/// Store Phase: players buy items. Stub — full implementation in Step 5.
/// </summary>
public class StorePhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.Store;

    public void Enter(GameManager gm)
    {
        gm.ResetPlayerCompletionStatus();

        EventBus.Publish(new GameLogEvent
        {
            message = "Store Phase",
            logType = GameLogType.System
        });

        // Bot shopping is handled by StoreUI.RunBotShopping() when it receives PhaseChangedEvent
    }

    public void Update(GameManager gm)
    {
        if (gm.AllPlayersCompleted())
        {
            gm.StateMachine.TransitionTo(GamePhase.Battle, gm);
        }
    }

    public void Exit(GameManager gm) { }
}

/// <summary>
/// Battle Phase: forest hunters fight monsters in score order.
/// Creates a BattleManager to orchestrate each individual combat encounter.
/// Transitions to NextRound once all battles are complete.
/// </summary>
public class BattlePhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.Battle;

    private BattleManager _battleManager;
    private bool _battlesDone;

    public void Enter(GameManager gm)
    {
        _battlesDone = false;

        var forestHunters = gm.GetHuntersAtLocation(LocationId.Forest);
        if (forestHunters.Count == 0)
        {
            // No battles to fight, skip to next round
            gm.StateMachine.TransitionTo(GamePhase.NextRound, gm);
            return;
        }

        EventBus.Publish(new GameLogEvent
        {
            message = "Battle Phase",
            logType = GameLogType.System
        });

        // Create BattleManager and start the phase
        _battleManager = new BattleManager(gm);

        // Inject BattleManager into BattleUI so it can call back
        var battleUI = UnityEngine.Object.FindObjectOfType<BattleUI>();
        if (battleUI != null)
        {
            battleUI.SetBattleManager(_battleManager);
        }

        // Subscribe to battle end events to track completion
        EventBus.Subscribe<BattleEndedEvent>(OnBattleEnded);

        // Start the battle sequence (sorts forest hunters and begins first battle)
        bool hasBattles = _battleManager.StartBattlePhase();
        if (!hasBattles)
        {
            _battlesDone = true;
        }
    }

    private void OnBattleEnded(BattleEndedEvent e)
    {
        // After each battle ends, check if all battles are done
        if (_battleManager != null && _battleManager.AllBattlesDone)
        {
            _battlesDone = true;
        }
    }

    public void Update(GameManager gm)
    {
        if (_battlesDone)
        {
            _battlesDone = false;
            gm.StateMachine.TransitionTo(GamePhase.NextRound, gm);
        }
    }

    public void Exit(GameManager gm)
    {
        EventBus.Unsubscribe<BattleEndedEvent>(OnBattleEnded);
        _battleManager = null;
    }
}

/// <summary>
/// NextRound Phase: rotate dummy tokens, apply round-start powers, check win condition.
/// </summary>
public class NextRoundPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.NextRound;
    private bool _processed;

    public void Enter(GameManager gm)
    {
        _processed = false;

        // Check win condition
        if (gm.CheckWinCondition())
        {
            gm.StateMachine.TransitionTo(GamePhase.GameOver, gm);
            return;
        }

        // Rotate dummy tokens
        gm.RotateDummyTokens();

        // Advance round
        gm.AdvanceRound();

        // Apply round-start weapon powers
        gm.Weapons.ApplyRoundStartPowers();

        EventBus.Publish(new GameLogEvent
        {
            message = $"Round {gm.CurrentRound} begins",
            logType = GameLogType.System
        });

        _processed = true;
    }

    public void Update(GameManager gm)
    {
        if (_processed)
        {
            _processed = false;
            gm.StateMachine.TransitionTo(GamePhase.Selection, gm);
        }
    }

    public void Exit(GameManager gm) { }
}

/// <summary>
/// CapacityOverflow Phase: stub for Step 5.
/// </summary>
public class CapacityOverflowPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.CapacityOverflow;
    public void Enter(GameManager gm) { }
    public void Update(GameManager gm) { }
    public void Exit(GameManager gm) { }
}

/// <summary>
/// GameOver Phase: determine winner, show rankings.
/// </summary>
public class GameOverPhase : IGamePhase
{
    public GamePhase PhaseId => GamePhase.GameOver;

    public void Enter(GameManager gm)
    {
        var rankings = gm.Scoring.GetRankings();
        int winnerId = rankings.Count > 0 ? rankings[0].playerId : 0;
        int winnerScore = rankings.Count > 0 ? rankings[0].score : 0;

        EventBus.Publish(new GameOverEvent
        {
            winnerId = winnerId,
            winnerScore = winnerScore
        });

        EventBus.Publish(new GameLogEvent
        {
            message = $"Game Over! {gm.Players[winnerId].playerName} wins with {winnerScore} points!",
            logType = GameLogType.System
        });
    }

    public void Update(GameManager gm) { }
    public void Exit(GameManager gm) { }
}
