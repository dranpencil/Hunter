/// <summary>
/// All game events published via EventBus.
/// UI scripts subscribe to these; game logic publishes them.
/// </summary>

// Phase transitions
public struct PhaseChangedEvent
{
    public GamePhase previousPhase;
    public GamePhase newPhase;
    public int round;
}

// Player resource changes
public struct ResourceChangedEvent
{
    public int playerId;
    public string resourceName; // "money", "exp", "hp", "ep", "beer", "bloodBag"
    public int oldValue;
    public int newValue;
}

// Score changes
public struct ScoreChangedEvent
{
    public int playerId;
    public int oldScore;
    public int newScore;
    public string source; // "monster", "milestone", "popularity", "plaza", "fakeBlood", "other"
}

// Token placement
public struct TokenPlacedEvent
{
    public int playerId;
    public bool isHunter; // true = hunter, false = apprentice
    public LocationId location;
}

// Selection phase
public struct PlayerSelectionConfirmedEvent
{
    public int playerId;
}

public struct AllPlayersSelectedEvent { }

// Store
public struct ItemPurchasedEvent
{
    public int playerId;
    public ItemData item;
}

public struct PlayerFinishedShoppingEvent
{
    public int playerId;
}

// Battle
public struct BattleStartedEvent
{
    public int playerId;
    public int monsterLevel;
}

public struct DiceRolledEvent
{
    public int playerId;
    public int[] diceResults;
    public int totalDamage;
}

public struct MonsterDamagedEvent
{
    public int monsterId;
    public int damage;
    public int remainingHp;
}

public struct PlayerDamagedEvent
{
    public int playerId;
    public int damage;
    public int remainingHp;
}

public struct MonsterDefeatedEvent
{
    public int playerId;
    public int monsterLevel;
    public int pointsEarned;
}

public struct MonsterTamedEvent
{
    public int playerId;
    public int monsterLevel;
}

public struct BattleEndedEvent
{
    public int playerId;
    public bool victory;
}

// Item usage
public struct ItemUsedEvent
{
    public int playerId;
    public ItemData item;
}

// Weapon upgrades
public struct WeaponUpgradedEvent
{
    public int playerId;
    public string upgradeType; // "attack" or "defense"
    public int newLevel;
}

public struct PowerTrackAdvancedEvent
{
    public int playerId;
    public int newPosition;
    public int newPowerLevel;
}

// Popularity
public struct PopularityChangedEvent
{
    public int playerId;
    public int oldPointToken;
    public int newPointToken;
    public int oldRewardToken;
    public int newRewardToken;
}

// HP/EP upgrades
public struct MaxStatUpgradedEvent
{
    public int playerId;
    public string stat; // "hp" or "ep"
    public int newMax;
}

// Capacity overflow
public struct CapacityOverflowEvent
{
    public int playerId;
    public int overflow; // how many units over capacity
}

// Station choice
public struct StationChoiceRequestedEvent
{
    public int playerId;
    public int rewardAmount;
}

public struct StationChoiceMadeEvent
{
    public int playerId;
    public ResourceType chosenResource;
}

// Game flow
public struct RoundStartedEvent
{
    public int roundNumber;
}

public struct GameOverEvent
{
    public int winnerId;
    public int winnerScore;
}

// Dummy tokens
public struct DummyTokensMovedEvent
{
    public LocationId[] newPositions;
}

// Game log
public struct GameLogEvent
{
    public string message;
    public GameLogType logType;
}

public enum GameLogType
{
    Info,
    Action,
    Battle,
    System,
    Score
}

// Online / network
public struct PlayerDisconnectedEvent
{
    public int playerId;
}

public struct ChatMessageEvent
{
    public int senderId;
    public string message;
}

// Tutorial lifecycle
public struct TutorialStartedEvent { }
public struct TutorialEndedEvent { }

public struct TutorialStepChangedEvent
{
    public int stepIndex;
    public int stepCount;
    public TutorialStep step;
}

public struct TutorialWarningEvent
{
    public string expectedAction;
    public string attemptedAction;
}

// Localization: fired when the user switches EN/ZH. UI elements should
// subscribe and re-render any strings they didn't look up via LocalizedText.
public struct LanguageChangedEvent
{
    public string languageCode; // "en" or "zh"
}

// Phase timers (online only)
public struct PlayerTimerTickEvent
{
    public int playerId;
    public float remainingSeconds;
}

public struct PlayerTimerExpiredEvent
{
    public int playerId;
}

// Kick vote
public struct KickVoteStartedEvent
{
    public int[] targetPlayerIds;
}

public struct KickVoteTallyUpdatedEvent
{
    public int targetPlayerId;
    public int yesCount;
    public int noCount;
    public float remainingSeconds;
}

public struct KickVoteEndedEvent
{
    public int[] kickedPlayerIds;
}

// Player kicked from the game (vote passed, or auto-kick when only bots left)
public struct PlayerKickedEvent
{
    public int playerId;
}
