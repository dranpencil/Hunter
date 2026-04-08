using System;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json;

/// <summary>
/// All serializable message types for network synchronization.
/// Maps from firebase-config.js OnlineManager and game.js serializeGameState/applyRemoteGameState.
/// </summary>

public enum ActionType
{
    ConfirmSelection,
    StorePurchase,
    FinishShopping,
    BattleAttack,
    BattleDefense,
    BattleTame,
    BattleUseItem,
    BattleUseDoubleDamage,
    StationChoice,
    PlayerBoardAction,
    CapacityOverflowAction,
    KickVote,
    ChatMessage
}

/// <summary>
/// Full serializable snapshot of the entire game state, broadcast from host to all clients.
/// </summary>
[Serializable]
public class GameStateData
{
    [JsonProperty("roundPhase")]
    public string roundPhase;

    [JsonProperty("currentRound")]
    public int currentRound;

    [JsonProperty("players")]
    public List<PlayerStateData> players = new List<PlayerStateData>();

    [JsonProperty("dummyTokenPositions")]
    public List<int> dummyTokenPositions = new List<int>();

    [JsonProperty("battleState")]
    public BattleStateData battleState;

    [JsonProperty("defeatedMonsterIds")]
    public List<int> defeatedMonsterIds = new List<int>();

    [JsonProperty("playerCompletionStatus")]
    public Dictionary<int, bool> playerCompletionStatus = new Dictionary<int, bool>();

    [JsonProperty("timestamp")]
    public long timestamp;
}

/// <summary>
/// Serializable representation of a single player's full state.
/// </summary>
[Serializable]
public class PlayerStateData
{
    [JsonProperty("id")]
    public int id;

    [JsonProperty("playerName")]
    public string playerName;

    [JsonProperty("isBot")]
    public bool isBot;

    [JsonProperty("colorName")]
    public string colorName;

    [JsonProperty("colorHex")]
    public string colorHex;

    // Token placement
    [JsonProperty("hunterLocation")]
    public int hunterLocation; // -1 = null

    [JsonProperty("apprenticeLocation")]
    public int apprenticeLocation; // -1 = null

    [JsonProperty("selectedHunterCard")]
    public int selectedHunterCard; // -1 = null

    [JsonProperty("selectedApprenticeCard")]
    public int selectedApprenticeCard; // -1 = null

    // Resources
    [JsonProperty("money")]
    public int money;

    [JsonProperty("exp")]
    public int exp;

    [JsonProperty("hp")]
    public int hp;

    [JsonProperty("ep")]
    public int ep;

    [JsonProperty("beer")]
    public int beer;

    [JsonProperty("bloodBag")]
    public int bloodBag;

    // Max resources
    [JsonProperty("maxMoney")]
    public int maxMoney;

    [JsonProperty("maxExp")]
    public int maxExp;

    [JsonProperty("maxHp")]
    public int maxHp;

    [JsonProperty("maxEp")]
    public int maxEp;

    // Upgrade progress
    [JsonProperty("epUpgradeProgress")]
    public int epUpgradeProgress;

    [JsonProperty("hpUpgradeProgress")]
    public int hpUpgradeProgress;

    // Milestones
    [JsonProperty("ep8Milestone")]
    public bool ep8Milestone;

    [JsonProperty("ep10Milestone")]
    public bool ep10Milestone;

    [JsonProperty("hp6Milestone")]
    public bool hp6Milestone;

    [JsonProperty("hp8Milestone")]
    public bool hp8Milestone;

    [JsonProperty("hp10Milestone")]
    public bool hp10Milestone;

    // Score
    [JsonProperty("score")]
    public int score;

    [JsonProperty("scoreFromMonsters")]
    public int scoreFromMonsters;

    [JsonProperty("scoreFromMilestones")]
    public int scoreFromMilestones;

    [JsonProperty("scoreFromPopularity")]
    public int scoreFromPopularity;

    [JsonProperty("scoreFromPlaza")]
    public int scoreFromPlaza;

    [JsonProperty("scoreFromFakeBlood")]
    public int scoreFromFakeBlood;

    [JsonProperty("scoreFromOther")]
    public int scoreFromOther;

    // Weapon
    [JsonProperty("weaponName")]
    public string weaponName;

    [JsonProperty("currentAttackDice")]
    public int currentAttackDice;

    [JsonProperty("currentDefenseDice")]
    public int currentDefenseDice;

    [JsonProperty("attackLevel")]
    public int attackLevel;

    [JsonProperty("defenseLevel")]
    public int defenseLevel;

    [JsonProperty("powerTrackPosition")]
    public int powerTrackPosition;

    // Inventory (item names)
    [JsonProperty("inventory")]
    public List<string> inventory = new List<string>();

    [JsonProperty("maxInventoryCapacity")]
    public int maxInventoryCapacity;

    // Popularity Track
    [JsonProperty("pointToken")]
    public int pointToken;

    [JsonProperty("rewardToken")]
    public int rewardToken;

    [JsonProperty("levelReached")]
    public bool[] levelReached;

    // Pets
    [JsonProperty("petsLevel1")]
    public int petsLevel1;

    [JsonProperty("petsLevel2")]
    public int petsLevel2;

    [JsonProperty("petsLevel3")]
    public int petsLevel3;

    // Statistics
    [JsonProperty("monstersDefeatedLv1")]
    public int monstersDefeatedLv1;

    [JsonProperty("monstersDefeatedLv2")]
    public int monstersDefeatedLv2;

    [JsonProperty("monstersDefeatedLv3")]
    public int monstersDefeatedLv3;
}

/// <summary>
/// Serializable snapshot of the current battle for network sync.
/// </summary>
[Serializable]
public class BattleStateData
{
    [JsonProperty("playerId")]
    public int playerId;

    [JsonProperty("monsterName")]
    public string monsterName;

    [JsonProperty("monsterId")]
    public int monsterId;

    [JsonProperty("monsterLevel")]
    public int monsterLevel;

    [JsonProperty("monsterMaxHP")]
    public int monsterMaxHP;

    [JsonProperty("monsterCurrentHP")]
    public int monsterCurrentHP;

    [JsonProperty("monsterATT")]
    public int monsterATT;

    [JsonProperty("combatRound")]
    public int combatRound;

    [JsonProperty("totalDamageTaken")]
    public int totalDamageTaken;

    [JsonProperty("phase")]
    public string phase;

    [JsonProperty("doubleDamageAvailable")]
    public bool doubleDamageAvailable;

    [JsonProperty("doubleDamageUsed")]
    public bool doubleDamageUsed;

    [JsonProperty("fakeBloodUsed")]
    public bool fakeBloodUsed;

    [JsonProperty("bowDoubleDamageApplied")]
    public bool bowDoubleDamageApplied;

    [JsonProperty("swordBonusPoints")]
    public int swordBonusPoints;

    [JsonProperty("victory")]
    public bool victory;

    [JsonProperty("lastAttackDice")]
    public int[] lastAttackDice;

    [JsonProperty("lastDefenseDice")]
    public int[] lastDefenseDice;

    [JsonProperty("battleLog")]
    public List<string> battleLog = new List<string>();
}

/// <summary>
/// Action message sent from client (guest) to host.
/// </summary>
[Serializable]
public class PlayerActionData
{
    [JsonProperty("actionType")]
    public ActionType actionType;

    [JsonProperty("playerId")]
    public int playerId;

    [JsonProperty("data")]
    public string data;

    [JsonProperty("timestamp")]
    public long timestamp;
}

/// <summary>
/// Chat message data for network transmission.
/// </summary>
[Serializable]
public class ChatMessageData
{
    [JsonProperty("senderId")]
    public int senderId;

    [JsonProperty("senderName")]
    public string senderName;

    [JsonProperty("message")]
    public string message;

    [JsonProperty("timestamp")]
    public long timestamp;
}

/// <summary>
/// Sub-data structures for specific action payloads, serialized into PlayerActionData.data as JSON.
/// </summary>
[Serializable]
public class SelectionActionPayload
{
    [JsonProperty("hunterLocation")]
    public int hunterLocation;

    [JsonProperty("apprenticeLocation")]
    public int apprenticeLocation;
}

[Serializable]
public class StorePurchasePayload
{
    [JsonProperty("itemName")]
    public string itemName;
}

[Serializable]
public class BattleItemPayload
{
    [JsonProperty("itemIndex")]
    public int itemIndex;
}

[Serializable]
public class StationChoicePayload
{
    [JsonProperty("resourceType")]
    public int resourceType;
}

[Serializable]
public class PlayerBoardActionPayload
{
    [JsonProperty("action")]
    public string action;

    [JsonProperty("param")]
    public string param;
}

[Serializable]
public class CapacityOverflowPayload
{
    [JsonProperty("action")]
    public string action; // "use", "upgrade", "discard"

    [JsonProperty("itemIndex")]
    public int itemIndex;
}

[Serializable]
public class KickVotePayload
{
    [JsonProperty("targetId")]
    public int targetId;

    [JsonProperty("vote")]
    public bool vote;
}

[Serializable]
public class MonsterLevelPayload
{
    [JsonProperty("level")]
    public int level;
}

/// <summary>
/// Static helper methods for serialization, deserialization, and applying game state.
/// </summary>
public static class NetworkMessageHelper
{
    private static readonly JsonSerializerSettings _settings = new JsonSerializerSettings
    {
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Include
    };

    /// <summary>
    /// Serialize the current GameManager state into a JSON string.
    /// </summary>
    public static string SerializeGameState(GameManager gm)
    {
        var data = new GameStateData();
        data.roundPhase = gm.StateMachine.CurrentPhase.ToString();
        data.currentRound = gm.CurrentRound;
        data.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // Serialize players
        foreach (var player in gm.Players)
        {
            data.players.Add(SerializePlayer(player));
        }

        // Serialize dummy token positions
        foreach (var pos in gm.DummyTokenPositions)
        {
            data.dummyTokenPositions.Add((int)pos);
        }

        // Serialize defeated monster IDs
        foreach (var id in gm.DefeatedMonsterIds)
        {
            data.defeatedMonsterIds.Add(id);
        }

        // Serialize completion status
        foreach (var kvp in gm.PlayerCompletionStatus)
        {
            data.playerCompletionStatus[kvp.Key] = kvp.Value;
        }

        // Serialize battle state if one is active
        var battlePhaseHandler = GetActiveBattleManager(gm);
        if (battlePhaseHandler != null)
        {
            var fullBattle = battlePhaseHandler.GetCurrentBattleState();
            if (fullBattle != null)
            {
                data.battleState = SerializeBattleState(fullBattle);
            }
        }

        return JsonConvert.SerializeObject(data, _settings);
    }

    /// <summary>
    /// Deserialize a JSON string into a GameStateData object.
    /// </summary>
    public static GameStateData DeserializeGameState(string json)
    {
        return JsonConvert.DeserializeObject<GameStateData>(json, _settings);
    }

    /// <summary>
    /// Serialize an action into a JSON string for sending from client to host.
    /// </summary>
    public static string SerializeAction(ActionType actionType, int playerId, object data)
    {
        var action = new PlayerActionData
        {
            actionType = actionType,
            playerId = playerId,
            data = data != null ? JsonConvert.SerializeObject(data, _settings) : "",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        return JsonConvert.SerializeObject(action, _settings);
    }

    /// <summary>
    /// Deserialize a JSON string into a PlayerActionData object.
    /// </summary>
    public static PlayerActionData DeserializeAction(string json)
    {
        return JsonConvert.DeserializeObject<PlayerActionData>(json, _settings);
    }

    /// <summary>
    /// Apply a deserialized GameStateData to the local GameManager.
    /// Used by clients (guests) to sync their state with the host.
    /// </summary>
    public static void ApplyGameState(GameStateData stateData, GameManager gm)
    {
        if (stateData == null || gm == null) return;

        // Apply player states
        for (int i = 0; i < stateData.players.Count && i < gm.Players.Count; i++)
        {
            ApplyPlayerState(stateData.players[i], gm.Players[i], gm);
        }

        // Apply dummy token positions
        gm.DummyTokenPositions.Clear();
        foreach (var pos in stateData.dummyTokenPositions)
        {
            gm.DummyTokenPositions.Add((LocationId)pos);
        }

        // Apply defeated monster IDs
        gm.DefeatedMonsterIds.Clear();
        foreach (var id in stateData.defeatedMonsterIds)
        {
            gm.DefeatedMonsterIds.Add(id);
        }

        // Apply completion status
        gm.PlayerCompletionStatus.Clear();
        foreach (var kvp in stateData.playerCompletionStatus)
        {
            gm.PlayerCompletionStatus[kvp.Key] = kvp.Value;
        }

        // Apply phase transition if it changed
        GamePhase remotePhase = ParseGamePhase(stateData.roundPhase);
        if (gm.StateMachine.CurrentPhase != remotePhase)
        {
            gm.StateMachine.TransitionTo(remotePhase, gm);
        }
    }

    // ------------------------------------------------------------------
    // Private Helpers
    // ------------------------------------------------------------------

    private static PlayerStateData SerializePlayer(PlayerData player)
    {
        var data = new PlayerStateData
        {
            id = player.id,
            playerName = player.playerName,
            isBot = player.isBot,
            colorName = player.color != null ? player.color.name : "Red",
            colorHex = player.color != null ? player.color.hexCode : "#E74C3C",
            hunterLocation = player.hunterLocation.HasValue ? (int)player.hunterLocation.Value : -1,
            apprenticeLocation = player.apprenticeLocation.HasValue ? (int)player.apprenticeLocation.Value : -1,
            selectedHunterCard = player.selectedHunterCard.HasValue ? (int)player.selectedHunterCard.Value : -1,
            selectedApprenticeCard = player.selectedApprenticeCard.HasValue ? (int)player.selectedApprenticeCard.Value : -1,
            money = player.money,
            exp = player.exp,
            hp = player.hp,
            ep = player.ep,
            beer = player.beer,
            bloodBag = player.bloodBag,
            maxMoney = player.maxMoney,
            maxExp = player.maxExp,
            maxHp = player.maxHp,
            maxEp = player.maxEp,
            epUpgradeProgress = player.epUpgradeProgress,
            hpUpgradeProgress = player.hpUpgradeProgress,
            ep8Milestone = player.ep8Milestone,
            ep10Milestone = player.ep10Milestone,
            hp6Milestone = player.hp6Milestone,
            hp8Milestone = player.hp8Milestone,
            hp10Milestone = player.hp10Milestone,
            score = player.score,
            scoreFromMonsters = player.scoreFromMonsters,
            scoreFromMilestones = player.scoreFromMilestones,
            scoreFromPopularity = player.scoreFromPopularity,
            scoreFromPlaza = player.scoreFromPlaza,
            scoreFromFakeBlood = player.scoreFromFakeBlood,
            scoreFromOther = player.scoreFromOther,
            weaponName = player.weaponData != null ? player.weaponData.weaponName : "",
            currentAttackDice = player.currentAttackDice,
            currentDefenseDice = player.currentDefenseDice,
            attackLevel = player.attackLevel,
            defenseLevel = player.defenseLevel,
            powerTrackPosition = player.powerTrackPosition,
            maxInventoryCapacity = player.maxInventoryCapacity,
            pointToken = player.pointToken,
            rewardToken = player.rewardToken,
            levelReached = player.levelReached,
            petsLevel1 = player.petsLevel1,
            petsLevel2 = player.petsLevel2,
            petsLevel3 = player.petsLevel3,
            monstersDefeatedLv1 = player.monstersDefeated.level1,
            monstersDefeatedLv2 = player.monstersDefeated.level2,
            monstersDefeatedLv3 = player.monstersDefeated.level3
        };

        // Serialize inventory as item names
        data.inventory = new List<string>();
        foreach (var item in player.inventory)
        {
            data.inventory.Add(item.itemName);
        }

        return data;
    }

    private static void ApplyPlayerState(PlayerStateData stateData, PlayerData player, GameManager gm)
    {
        // Identity fields are not overwritten (id, name, isBot, weaponData are set at creation)
        player.color = new PlayerColor(stateData.colorName, stateData.colorHex);

        // Token placement
        player.hunterLocation = stateData.hunterLocation >= 0 ? (LocationId?)stateData.hunterLocation : null;
        player.apprenticeLocation = stateData.apprenticeLocation >= 0 ? (LocationId?)stateData.apprenticeLocation : null;
        player.selectedHunterCard = stateData.selectedHunterCard >= 0 ? (LocationId?)stateData.selectedHunterCard : null;
        player.selectedApprenticeCard = stateData.selectedApprenticeCard >= 0 ? (LocationId?)stateData.selectedApprenticeCard : null;

        // Resources
        player.money = stateData.money;
        player.exp = stateData.exp;
        player.hp = stateData.hp;
        player.ep = stateData.ep;
        player.beer = stateData.beer;
        player.bloodBag = stateData.bloodBag;

        // Max resources
        player.maxMoney = stateData.maxMoney;
        player.maxExp = stateData.maxExp;
        player.maxHp = stateData.maxHp;
        player.maxEp = stateData.maxEp;

        // Upgrade progress
        player.epUpgradeProgress = stateData.epUpgradeProgress;
        player.hpUpgradeProgress = stateData.hpUpgradeProgress;

        // Milestones
        player.ep8Milestone = stateData.ep8Milestone;
        player.ep10Milestone = stateData.ep10Milestone;
        player.hp6Milestone = stateData.hp6Milestone;
        player.hp8Milestone = stateData.hp8Milestone;
        player.hp10Milestone = stateData.hp10Milestone;

        // Score
        player.score = stateData.score;
        player.scoreFromMonsters = stateData.scoreFromMonsters;
        player.scoreFromMilestones = stateData.scoreFromMilestones;
        player.scoreFromPopularity = stateData.scoreFromPopularity;
        player.scoreFromPlaza = stateData.scoreFromPlaza;
        player.scoreFromFakeBlood = stateData.scoreFromFakeBlood;
        player.scoreFromOther = stateData.scoreFromOther;

        // Weapon stats (weaponData ScriptableObject stays the same)
        player.currentAttackDice = stateData.currentAttackDice;
        player.currentDefenseDice = stateData.currentDefenseDice;
        player.attackLevel = stateData.attackLevel;
        player.defenseLevel = stateData.defenseLevel;
        player.powerTrackPosition = stateData.powerTrackPosition;
        player.maxInventoryCapacity = stateData.maxInventoryCapacity;

        // Popularity Track
        player.pointToken = stateData.pointToken;
        player.rewardToken = stateData.rewardToken;
        if (stateData.levelReached != null)
        {
            Array.Copy(stateData.levelReached, player.levelReached,
                Mathf.Min(stateData.levelReached.Length, player.levelReached.Length));
        }

        // Pets
        player.petsLevel1 = stateData.petsLevel1;
        player.petsLevel2 = stateData.petsLevel2;
        player.petsLevel3 = stateData.petsLevel3;

        // Statistics
        player.monstersDefeated.level1 = stateData.monstersDefeatedLv1;
        player.monstersDefeated.level2 = stateData.monstersDefeatedLv2;
        player.monstersDefeated.level3 = stateData.monstersDefeatedLv3;

        // Rebuild inventory from item names
        player.inventory.Clear();
        if (stateData.inventory != null)
        {
            foreach (var itemName in stateData.inventory)
            {
                var item = gm.GetItemByName(itemName);
                if (item != null)
                {
                    player.inventory.Add(item);
                }
            }
        }
    }

    private static BattleStateData SerializeBattleState(FullBattleState battle)
    {
        return new BattleStateData
        {
            playerId = battle.playerId,
            monsterName = battle.monster != null ? battle.monster.monsterName : "",
            monsterId = battle.monster != null ? battle.monster.monsterId : -1,
            monsterLevel = battle.monsterLevel,
            monsterMaxHP = battle.monsterMaxHP,
            monsterCurrentHP = battle.monsterCurrentHP,
            monsterATT = battle.monsterATT,
            combatRound = battle.combatRound,
            totalDamageTaken = battle.totalDamageTaken,
            phase = battle.phase.ToString(),
            doubleDamageAvailable = battle.doubleDamageAvailable,
            doubleDamageUsed = battle.doubleDamageUsed,
            fakeBloodUsed = battle.fakeBloodUsed,
            bowDoubleDamageApplied = battle.bowDoubleDamageApplied,
            swordBonusPoints = battle.swordBonusPoints,
            victory = battle.victory,
            lastAttackDice = battle.lastAttackDice,
            lastDefenseDice = battle.lastDefenseDice,
            battleLog = battle.battleLog != null ? new List<string>(battle.battleLog) : new List<string>()
        };
    }

    /// <summary>
    /// Attempt to extract the active BattleManager from NetworkGameManager.
    /// Returns null if not in battle phase or no BattleManager is active.
    /// </summary>
    private static BattleManager GetActiveBattleManager(GameManager gm)
    {
        if (gm.StateMachine.CurrentPhase != GamePhase.Battle) return null;

        // NetworkGameManager holds a reference set by BattlePhase.Enter()
        var netMgr = NetworkGameManager.Instance;
        if (netMgr != null)
        {
            return netMgr.GetActiveBattleManagerRef();
        }
        return null;
    }

    private static GamePhase ParseGamePhase(string phaseName)
    {
        if (Enum.TryParse<GamePhase>(phaseName, true, out GamePhase result))
        {
            return result;
        }
        Debug.LogWarning($"[NetworkMessages] Unknown phase name: {phaseName}, defaulting to Selection");
        return GamePhase.Selection;
    }
}
