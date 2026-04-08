using System;
using System.Collections.Generic;

/// <summary>
/// Pure C# class holding all state for one player. Not a MonoBehaviour.
/// Maps from game.js createPlayers() lines 2157-2236.
/// </summary>
[Serializable]
public class PlayerData
{
    // Identity
    public int id;
    public string playerName;
    public bool isBot;
    public PlayerColor color;

    // Token placement
    public LocationId? hunterLocation;
    public LocationId? apprenticeLocation;
    public LocationId? selectedHunterCard;
    public LocationId? selectedApprenticeCard;

    // Resources
    public int money;
    public int exp;
    public int hp;
    public int ep;
    public int beer;
    public int bloodBag;

    // Max resources
    public int maxMoney = 15;
    public int maxExp = 15;
    public int maxHp = 4;
    public int maxEp = 6;

    // Upgrade progress
    public int epUpgradeProgress; // beer towards EP upgrade (0/4)
    public int hpUpgradeProgress; // blood bags towards HP upgrade (0/3)

    // Milestones
    public bool ep8Milestone;
    public bool ep10Milestone;
    public bool hp6Milestone;
    public bool hp8Milestone;
    public bool hp10Milestone;

    // Score
    public int score;
    public int scoreFromMonsters;
    public int scoreFromMilestones;
    public int scoreFromPopularity;
    public int scoreFromPlaza;
    public int scoreFromFakeBlood;
    public int scoreFromOther;

    // Weapon
    public WeaponData weaponData; // Reference to ScriptableObject
    public int currentAttackDice;
    public int currentDefenseDice;
    public int attackLevel = 1;
    public int defenseLevel = 1;
    public int powerTrackPosition = 1;

    // Inventory
    public int maxInventoryCapacity;
    public List<ItemData> inventory = new List<ItemData>();

    // Popularity Track
    public int pointToken;    // 0-5
    public int rewardToken;   // 0-5
    public bool[] levelReached = new bool[6]; // Track which point levels have been collected

    // Pets
    public int petsLevel1;
    public int petsLevel2;
    public int petsLevel3;

    // Statistics
    public int hunterAloneCount;
    public int apprenticeWithHuntersCount;
    public MonstersDefeated monstersDefeated = new MonstersDefeated();
    public Dictionary<LocationId, TokenVisits> locationSelections = new Dictionary<LocationId, TokenVisits>();

    public PlayerData(int id, string name, bool isBot, WeaponData weapon, PlayerColor color)
    {
        this.id = id;
        this.playerName = name;
        this.isBot = isBot;
        this.color = color;
        this.weaponData = weapon;

        // Initialize from weapon data
        this.money = weapon.initialMoney;
        this.exp = 3;
        this.hp = 4;
        this.ep = 6;
        this.currentAttackDice = weapon.attackDice;
        this.currentDefenseDice = weapon.defenseDice;
        this.maxInventoryCapacity = weapon.capacity;

        // Initialize location tracking
        foreach (LocationId loc in Enum.GetValues(typeof(LocationId)))
        {
            locationSelections[loc] = new TokenVisits();
        }
    }

    public int GetCurrentPowerLevel()
    {
        return weaponData.GetPowerLevel(powerTrackPosition);
    }

    public int GetInventoryUsedCapacity()
    {
        int total = 0;
        foreach (var item in inventory)
            total += item.size;
        return total;
    }

    public int GetRemainingCapacity()
    {
        return maxInventoryCapacity - GetInventoryUsedCapacity();
    }

    public int GetTotalPets()
    {
        return petsLevel1 + petsLevel2 + petsLevel3;
    }
}

[Serializable]
public class MonstersDefeated
{
    public int level1;
    public int level2;
    public int level3;
}

[Serializable]
public class TokenVisits
{
    public int hunter;
    public int apprentice;
}

[Serializable]
public class PlayerColor
{
    public string name;
    public string hexCode;

    public PlayerColor(string name, string hexCode)
    {
        this.name = name;
        this.hexCode = hexCode;
    }
}
