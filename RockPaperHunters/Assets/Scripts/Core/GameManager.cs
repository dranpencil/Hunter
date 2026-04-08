using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Singleton game controller. Holds all subsystems and player data.
/// Maps from game.js Game class constructor (lines 1050-1175).
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Game Config")]
    public GameConfig config;

    [Header("Data Assets")]
    public WeaponData[] allWeapons;     // 11 weapons
    public MonsterData[] allMonsters;   // 37 monsters
    public ItemData[] allItems;         // 8 items (6 + bullets + batteries)
    public LocationData[] allLocations; // 7 locations
    public BotDecisionTable[] botTables; // 6 tables

    // Game state
    public int PlayerCount { get; private set; }
    public List<PlayerData> Players { get; private set; } = new List<PlayerData>();
    public int CurrentRound { get; private set; } = 1;
    public GameMode Mode { get; private set; }
    public GameStateMachine StateMachine { get; private set; }

    // Subsystems (will be created in later steps)
    public CombatSystem Combat { get; private set; }
    public ResourceSystem Resources { get; private set; }
    public WeaponSystem Weapons { get; private set; }
    public PopularityTrack Popularity { get; private set; }
    public MonsterEffectSystem MonsterEffects { get; private set; }
    public ScoringSystem Scoring { get; private set; }

    // Bot instances
    public List<BotPlayer> Bots { get; private set; } = new List<BotPlayer>();

    // Dummy tokens
    public List<LocationId> DummyTokenPositions { get; private set; } = new List<LocationId>();

    // Player completion tracking for async phases
    public Dictionary<int, bool> PlayerCompletionStatus { get; private set; } = new Dictionary<int, bool>();

    // Monster tracking
    public HashSet<int> DefeatedMonsterIds { get; private set; } = new HashSet<int>();

    // Available player colors
    private static readonly PlayerColor[] AvailableColors =
    {
        new PlayerColor("Red", "#E74C3C"),
        new PlayerColor("Blue", "#3498DB"),
        new PlayerColor("Green", "#2ECC71"),
        new PlayerColor("Purple", "#9B59B6"),
        new PlayerColor("Orange", "#E67E22"),
        new PlayerColor("Teal", "#1ABC9C")
    };

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        StateMachine = new GameStateMachine();
    }

    /// <summary>
    /// Initialize a new game with the given configuration.
    /// </summary>
    public void StartNewGame(int playerCount, GameMode mode, List<PlayerSetup> playerSetups)
    {
        PlayerCount = playerCount;
        Mode = mode;
        CurrentRound = 1;
        Players.Clear();
        DefeatedMonsterIds.Clear();

        // Create players
        for (int i = 0; i < playerSetups.Count; i++)
        {
            var setup = playerSetups[i];
            var weapon = GetWeaponByName(setup.weaponName);
            var color = AvailableColors[i % AvailableColors.Length];
            if (setup.color != null) color = setup.color;

            var player = new PlayerData(i, setup.playerName, setup.isBot, weapon, color);
            Players.Add(player);
        }

        // Create bot instances
        Bots.Clear();
        foreach (var player in Players)
        {
            if (player.isBot)
            {
                Bots.Add(new BotPlayer(player.id, this));
            }
        }

        // Initialize dummy tokens
        InitializeDummyTokens();

        // Initialize subsystems
        Combat = new CombatSystem(this);
        Resources = new ResourceSystem(this);
        Weapons = new WeaponSystem(this);
        Popularity = new PopularityTrack(this);
        MonsterEffects = new MonsterEffectSystem(this);
        Scoring = new ScoringSystem(this);

        // Start first phase
        StateMachine.TransitionTo(GamePhase.Selection, this);

        EventBus.Publish(new RoundStartedEvent { roundNumber = 1 });
    }

    private void InitializeDummyTokens()
    {
        DummyTokenPositions.Clear();
        LocationId[] positions = null;

        switch (PlayerCount)
        {
            case 2: positions = config.dummyPositions2Players; break;
            case 3: positions = config.dummyPositions3Players; break;
            case 4: break; // No dummy tokens for 4 players
        }

        if (positions != null)
        {
            foreach (var pos in positions)
                DummyTokenPositions.Add(pos);
        }
    }

    /// <summary>
    /// Rotate dummy tokens: locations 1->2->3->4->5->6->1 (skip Forest/7)
    /// </summary>
    public void RotateDummyTokens()
    {
        for (int i = 0; i < DummyTokenPositions.Count; i++)
        {
            int current = (int)DummyTokenPositions[i];
            int next = current % 6 + 1; // 1->2->3->4->5->6->1, skip 7 (Forest)
            DummyTokenPositions[i] = (LocationId)next;
        }

        EventBus.Publish(new DummyTokensMovedEvent
        {
            newPositions = DummyTokenPositions.ToArray()
        });
    }

    public void AdvanceRound()
    {
        CurrentRound++;
        EventBus.Publish(new RoundStartedEvent { roundNumber = CurrentRound });
    }

    public bool CheckWinCondition()
    {
        foreach (var player in Players)
        {
            if (player.score >= config.winScore)
                return true;
        }
        return false;
    }

    public BotPlayer GetBot(int playerId)
    {
        foreach (var bot in Bots)
        {
            if (bot.PlayerId == playerId) return bot;
        }
        return null;
    }

    public WeaponData GetWeaponByName(string name)
    {
        foreach (var w in allWeapons)
        {
            if (w.weaponName == name)
                return w;
        }
        Debug.LogError($"Weapon not found: {name}");
        return null;
    }

    public MonsterData[] GetMonstersByLevel(int level)
    {
        var result = new List<MonsterData>();
        foreach (var m in allMonsters)
        {
            if (m.level == level)
                result.Add(m);
        }
        return result.ToArray();
    }

    public ItemData GetItemByName(string name)
    {
        foreach (var item in allItems)
        {
            if (item.itemName == name)
                return item;
        }
        Debug.LogError($"Item not found: {name}");
        return null;
    }

    public LocationData GetLocationData(LocationId id)
    {
        foreach (var loc in allLocations)
        {
            if (loc.locationId == id)
                return loc;
        }
        return null;
    }

    /// <summary>
    /// Get all players whose hunter is at the given location.
    /// </summary>
    public List<PlayerData> GetHuntersAtLocation(LocationId location)
    {
        var result = new List<PlayerData>();
        foreach (var p in Players)
        {
            if (p.hunterLocation == location)
                result.Add(p);
        }
        return result;
    }

    /// <summary>
    /// Count total tokens (hunter + apprentice + dummy) at a location.
    /// </summary>
    public int CountTokensAtLocation(LocationId location)
    {
        int count = 0;
        foreach (var p in Players)
        {
            if (p.hunterLocation == location) count++;
            if (p.apprenticeLocation == location) count++;
        }
        foreach (var dummy in DummyTokenPositions)
        {
            if (dummy == location) count++;
        }
        return count;
    }

    public void ResetPlayerCompletionStatus()
    {
        PlayerCompletionStatus.Clear();
        foreach (var p in Players)
        {
            PlayerCompletionStatus[p.id] = false;
        }
    }

    public bool AllPlayersCompleted()
    {
        foreach (var kvp in PlayerCompletionStatus)
        {
            if (!kvp.Value) return false;
        }
        return true;
    }

    private void Update()
    {
        StateMachine?.Update(this);
    }

    private void OnDestroy()
    {
        if (Instance == this)
        {
            EventBus.Clear();
            Instance = null;
        }
    }
}

public enum GameMode
{
    Simultaneous, // 1 human local
    TurnBased,    // 2+ humans local
    Online        // Steam multiplayer
}

/// <summary>
/// Setup data for creating a player before game starts.
/// </summary>
public class PlayerSetup
{
    public string playerName;
    public string weaponName;
    public bool isBot;
    public PlayerColor color;
}
