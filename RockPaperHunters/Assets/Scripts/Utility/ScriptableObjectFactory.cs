#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

/// <summary>
/// Editor-only script to auto-generate all ScriptableObject assets from game data.
/// Run from Unity menu: Tools > Rock Paper Hunters > Generate All Data Assets.
/// </summary>
public class ScriptableObjectFactory
{
    [MenuItem("Tools/Rock Paper Hunters/Generate All Data Assets")]
    public static void GenerateAll()
    {
        GenerateWeapons();
        GenerateMonsters();
        GenerateItems();
        GenerateLocations();
        GenerateBotTables();
        GenerateConfig();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("All ScriptableObject assets generated!");
    }

    static void GenerateWeapons()
    {
        var weapons = new[]
        {
            new { name = "Bat",     reqA = 4, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,1,1}, pri = 3,  pref = LocationId.Plaza,    ammo = false, ammoName = "" },
            new { name = "Katana",  reqA = 5, reqD = 3, cap = 4, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,1,1,1,1}, pri = 8,  pref = LocationId.Dojo,     ammo = false, ammoName = "" },
            new { name = "Rifle",   reqA = 6, reqD = 3, cap = 8, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,2,2}, pri = 10, pref = LocationId.WorkSite,  ammo = true,  ammoName = "Bullets" },
            new { name = "Plasma",  reqA = 7, reqD = 3, cap = 8, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,2,2,2}, pri = 11, pref = LocationId.WorkSite,  ammo = true,  ammoName = "Batteries" },
            new { name = "Chain",   reqA = 4, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,1,1}, pri = 6,  pref = LocationId.Bar,      ammo = false, ammoName = "" },
            new { name = "Axe",     reqA = 4, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,0,1,1}, pri = 4,  pref = LocationId.Hospital,  ammo = false, ammoName = "" },
            new { name = "Whip",    reqA = 4, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,1,1}, pri = 5,  pref = LocationId.Bar,      ammo = false, ammoName = "" },
            new { name = "Bow",     reqA = 5, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,0,0,3}, pri = 1,  pref = LocationId.Plaza,    ammo = false, ammoName = "" },
            new { name = "Sword",   reqA = 5, reqD = 3, cap = 4, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,1,2}, pri = 9,  pref = LocationId.Dojo,     ammo = false, ammoName = "" },
            new { name = "Knife",   reqA = 3, reqD = 3, cap = 10,money = 8, aDice = 2, dDice = 0, dmg = new[]{0,0,0,0,1,1}, pri = 2,  pref = LocationId.Plaza,    ammo = false, ammoName = "" },
            new { name = "Gloves",  reqA = 4, reqD = 3, cap = 6, money = 4, aDice = 2, dDice = 0, dmg = new[]{0,0,0,1,1,1}, pri = 7,  pref = LocationId.Hospital,  ammo = false, ammoName = "" },
        };

        string path = "Assets/ScriptableObjects/Weapons";
        EnsureDirectory(path);

        foreach (var w in weapons)
        {
            var asset = ScriptableObject.CreateInstance<WeaponData>();
            asset.weaponName = w.name;
            asset.reqExpAttack = w.reqA;
            asset.reqExpDefense = w.reqD;
            asset.capacity = w.cap;
            asset.initialMoney = w.money;
            asset.attackDice = w.aDice;
            asset.defenseDice = w.dDice;
            asset.damageArray = w.dmg;
            asset.priority = w.pri;
            asset.preferredLocation = w.pref;
            asset.requiresAmmo = w.ammo;
            asset.ammoItemName = w.ammoName;

            AssetDatabase.CreateAsset(asset, $"{path}/{w.name}.asset");
        }
    }

    static void GenerateMonsters()
    {
        // Data from Monster.csv (36 monsters, id 1-36)
        var monsters = new[]
        {
            // Level 1 (12 monsters)
            new { id=1,  lv=1, hp=4, att=1, money=3, energy=1, blood=0, pts=2,  effect=MonsterEffectType.None },
            new { id=2,  lv=1, hp=4, att=1, money=0, energy=3, blood=0, pts=3,  effect=MonsterEffectType.AttackUpAtHalfHP },
            new { id=3,  lv=1, hp=4, att=2, money=2, energy=1, blood=0, pts=4,  effect=MonsterEffectType.StealMoney },
            new { id=4,  lv=1, hp=3, att=2, money=0, energy=1, blood=1, pts=3,  effect=MonsterEffectType.DeathDamageAll },
            new { id=5,  lv=1, hp=3, att=1, money=0, energy=0, blood=1, pts=2,  effect=MonsterEffectType.NoExpFromDamage },
            new { id=6,  lv=1, hp=3, att=2, money=0, energy=0, blood=1, pts=4,  effect=MonsterEffectType.DamageCap2 },
            new { id=7,  lv=1, hp=3, att=1, money=1, energy=1, blood=0, pts=2,  effect=MonsterEffectType.FirstStrikeDefense1 },
            new { id=8,  lv=1, hp=3, att=2, money=0, energy=2, blood=1, pts=2,  effect=MonsterEffectType.OtherMonstersPlus1HP },
            new { id=9,  lv=1, hp=3, att=3, money=2, energy=1, blood=0, pts=4,  effect=MonsterEffectType.DamageNonForestPlayers1HP },
            new { id=10, lv=1, hp=2, att=3, money=0, energy=1, blood=1, pts=3,  effect=MonsterEffectType.DrainEPPerAttack },
            new { id=11, lv=1, hp=2, att=3, money=0, energy=2, blood=0, pts=4,  effect=MonsterEffectType.HealAfterSurviving },
            new { id=12, lv=1, hp=2, att=3, money=3, energy=0, blood=0, pts=3,  effect=MonsterEffectType.ImmuneToGrenades },

            // Level 2 (12 monsters)
            new { id=13, lv=2, hp=7, att=2, money=3, energy=1, blood=0, pts=7,  effect=MonsterEffectType.DamageNonForestPlayers1HP },
            new { id=14, lv=2, hp=7, att=2, money=0, energy=3, blood=0, pts=8,  effect=MonsterEffectType.DamageCap4 },
            new { id=15, lv=2, hp=7, att=2, money=2, energy=1, blood=0, pts=8,  effect=MonsterEffectType.ImmuneToAllExplosives },
            new { id=16, lv=2, hp=7, att=3, money=2, energy=2, blood=1, pts=6,  effect=MonsterEffectType.OtherMonstersPlus1HP },
            new { id=17, lv=2, hp=6, att=2, money=1, energy=2, blood=0, pts=6,  effect=MonsterEffectType.FirstStrikeDefense3 },
            new { id=18, lv=2, hp=6, att=3, money=2, energy=0, blood=1, pts=7,  effect=MonsterEffectType.FirstStrikeDefense2 },
            new { id=19, lv=2, hp=6, att=4, money=3, energy=1, blood=0, pts=8,  effect=MonsterEffectType.DrainEPPerAttack },
            new { id=20, lv=2, hp=6, att=3, money=0, energy=3, blood=1, pts=6,  effect=MonsterEffectType.ExtraTamingCost },
            new { id=21, lv=2, hp=5, att=4, money=2, energy=1, blood=0, pts=8,  effect=MonsterEffectType.FirstStrikeDefense2 },
            new { id=22, lv=2, hp=5, att=4, money=2, energy=0, blood=1, pts=7,  effect=MonsterEffectType.MaxExpFromDamage3 },
            new { id=23, lv=2, hp=5, att=4, money=0, energy=2, blood=1, pts=7,  effect=MonsterEffectType.ReduceNonForestExp },
            new { id=24, lv=2, hp=5, att=3, money=2, energy=2, blood=0, pts=6,  effect=MonsterEffectType.AttackUpAtHalfHP },

            // Level 3 (12 monsters)
            new { id=25, lv=3, hp=13,att=3, money=0, energy=0, blood=3, pts=15, effect=MonsterEffectType.DamageNonForestPlayers2HP },
            new { id=26, lv=3, hp=12,att=3, money=1, energy=3, blood=0, pts=15, effect=MonsterEffectType.AttackUpAtHalfHP },
            new { id=27, lv=3, hp=12,att=4, money=0, energy=1, blood=2, pts=16, effect=MonsterEffectType.FirstStrikeDefense3 },
            new { id=28, lv=3, hp=11,att=3, money=2, energy=2, blood=0, pts=14, effect=MonsterEffectType.ReduceNonForestPoints },
            new { id=29, lv=3, hp=11,att=5, money=2, energy=1, blood=1, pts=16, effect=MonsterEffectType.DrainEPPerAttack },
            new { id=30, lv=3, hp=11,att=4, money=1, energy=3, blood=0, pts=15, effect=MonsterEffectType.DamageCap6 },
            new { id=31, lv=3, hp=11,att=4, money=2, energy=2, blood=0, pts=15, effect=MonsterEffectType.DeathDamageAll },
            new { id=32, lv=3, hp=11,att=5, money=1, energy=0, blood=2, pts=16, effect=MonsterEffectType.FirstStrikeDefense4 },
            new { id=33, lv=3, hp=10,att=4, money=3, energy=1, blood=0, pts=14, effect=MonsterEffectType.OtherMonstersPlus1HP },
            new { id=34, lv=3, hp=10,att=4, money=4, energy=0, blood=0, pts=14, effect=MonsterEffectType.MaxExpFromDamage4 },
            new { id=35, lv=3, hp=10,att=4, money=0, energy=4, blood=0, pts=14, effect=MonsterEffectType.FirstStrikeDefense3 },
            new { id=36, lv=3, hp=10,att=5, money=2, energy=1, blood=0, pts=16, effect=MonsterEffectType.ImmuneToAllExplosives },
        };

        string path = "Assets/ScriptableObjects/Monsters";
        EnsureDirectory(path);

        foreach (var m in monsters)
        {
            var asset = ScriptableObject.CreateInstance<MonsterData>();
            asset.monsterId = m.id;
            asset.monsterName = $"Monster_Lv{m.lv}_{m.id}";
            asset.level = m.lv;
            asset.hp = m.hp;
            asset.att = m.att;
            asset.moneyReward = m.money;
            asset.energyReward = m.energy;
            asset.bloodReward = m.blood;
            asset.points = m.pts;
            asset.effectType = m.effect;

            AssetDatabase.CreateAsset(asset, $"{path}/Monster_{m.id:D2}_Lv{m.lv}.asset");
        }
    }

    static void GenerateItems()
    {
        string path = "Assets/ScriptableObjects/Items";
        EnsureDirectory(path);

        CreateItem(path, "Beer",       1, 2, ItemEffectType.Beer,      "Gain 1 EP");
        CreateItem(path, "Blood Bag",  1, 2, ItemEffectType.BloodBag,  "Gain 1 HP");
        CreateItem(path, "Grenade",    2, 2, ItemEffectType.Grenade,   "Deal 1 damage to monster");
        CreateItem(path, "Bomb",       3, 4, ItemEffectType.Bomb,      "Deal 2 damage to monster");
        CreateItem(path, "Dynamite",   4, 6, ItemEffectType.Dynamite,  "Deal 3 damage to monster");
        CreateItem(path, "Fake Blood", 2, 2, ItemEffectType.FakeBlood, "Bonus points = monster level on defeat");
        CreateItem(path, "Bullets",    1, 2, ItemEffectType.Bullets,   "Ammo for Rifle (consumed per battle)");
        CreateItem(path, "Batteries",  1, 2, ItemEffectType.Batteries, "Ammo for Plasma (consumed per battle)");
    }

    static void CreateItem(string path, string name, int size, int price, ItemEffectType effect, string desc)
    {
        var asset = ScriptableObject.CreateInstance<ItemData>();
        asset.itemName = name;
        asset.size = size;
        asset.price = price;
        asset.effectType = effect;
        asset.effectDescription = desc;
        AssetDatabase.CreateAsset(asset, $"{path}/{name.Replace(" ", "")}.asset");
    }

    static void GenerateLocations()
    {
        string path = "Assets/ScriptableObjects/Locations";
        EnsureDirectory(path);

        CreateLocation(path, LocationId.WorkSite, "Work Site", ResourceType.Money,
            new[]{6,4}, new[]{7,5,4}, new[]{8,6,5,4});
        CreateLocation(path, LocationId.Bar, "Bar", ResourceType.Beer,
            new[]{6,4}, new[]{7,5,4}, new[]{8,6,5,4});
        CreateLocation(path, LocationId.Station, "Station", ResourceType.PlayerChoice,
            new int[0], new int[0], new int[0]);
        CreateLocation(path, LocationId.Hospital, "Hospital", ResourceType.BloodBag,
            new[]{4,2}, new[]{5,3,2}, new[]{6,4,3,2});
        CreateLocation(path, LocationId.Dojo, "Dojo", ResourceType.Exp,
            new[]{4,2}, new[]{5,3,2}, new[]{6,4,3,2});
        CreateLocation(path, LocationId.Plaza, "Plaza", ResourceType.Score,
            new[]{4,2}, new[]{5,3,2}, new[]{6,4,3,2});
        CreateLocation(path, LocationId.Forest, "Forest", ResourceType.None,
            new int[0], new int[0], new int[0]);
    }

    static void CreateLocation(string path, LocationId id, string name, ResourceType res,
        int[] r2, int[] r3, int[] r4)
    {
        var asset = ScriptableObject.CreateInstance<LocationData>();
        asset.locationId = id;
        asset.locationName = name;
        asset.resourceType = res;
        asset.rewards2Players = r2;
        asset.rewards3Players = r3;
        asset.rewards4Players = r4;
        AssetDatabase.CreateAsset(asset, $"{path}/{name.Replace(" ", "")}.asset");
    }

    static void GenerateBotTables()
    {
        string path = "Assets/ScriptableObjects/BotTables";
        EnsureDirectory(path);

        // Dojo Lv1
        CreateBotTable(path, "DojoLv1", BotTableType.DojoLv1, new[]{
            2,2,0,0,0,0,0,  // att=2
            0,0,0,0,0,0,0,  // att=3
            0,0,0,0,0,0,0,  // att=4
            0,0,0,0,0,0,0,  // att=5
            0,0,0,0,0,0,0,  // att=6
            0,0,0,0,0,0,0   // att=7
        });

        // Dojo Lv2
        CreateBotTable(path, "DojoLv2", BotTableType.DojoLv2, new[]{
            2,2,2,1,1,0,0,
            2,1,1,1,0,0,0,
            1,1,1,0,0,0,0,
            0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,
            0,0,0,0,0,0,0
        });

        // Dojo Lv3
        CreateBotTable(path, "DojoLv3", BotTableType.DojoLv3, new[]{
            5,4,3,3,2,2,2,
            4,3,3,2,2,1,1,
            3,2,2,2,1,1,1,
            2,1,1,1,1,1,0,
            1,1,1,1,0,0,-2,
            1,0,0,-1,-2,-3,-4
        });

        // Forest Lv1
        CreateBotTable(path, "ForestLv1", BotTableType.ForestLv1, new[]{
            -1,0,0,1,2,3,4,
            0,1,1,2,3,4,5,
            1,2,3,4,5,6,7,
            2,3,4,5,6,7,8,
            3,4,5,6,7,8,9,
            4,5,6,7,8,9,10
        });

        // Forest Lv2
        CreateBotTable(path, "ForestLv2", BotTableType.ForestLv2, new[]{
            -4,-2,0,1,1,1,1,
            -2,0,1,1,2,2,2,
            0,1,1,2,3,3,3,
            1,2,3,4,4,4,4,
            2,3,4,5,5,5,5,
            3,4,5,6,6,6,6
        });

        // Forest Lv3
        CreateBotTable(path, "ForestLv3", BotTableType.ForestLv3, new[]{
            -6,-4,-2,-1,-1,-1,-1,
            -4,-2,-1,0,0,0,0,
            -2,-1,0,1,1,1,1,
            -1,0,1,2,2,2,2,
            0,1,2,2,2,2,2,
            1,2,2,3,3,3,3
        });
    }

    static void CreateBotTable(string path, string name, BotTableType type, int[] grid)
    {
        var asset = ScriptableObject.CreateInstance<BotDecisionTable>();
        asset.tableName = name;
        asset.tableType = type;
        asset.grid = grid;
        AssetDatabase.CreateAsset(asset, $"{path}/{name}.asset");
    }

    static void GenerateConfig()
    {
        string path = "Assets/ScriptableObjects/Config";
        EnsureDirectory(path);

        var asset = ScriptableObject.CreateInstance<GameConfig>();
        // All defaults are set in GameConfig.cs field initializers
        AssetDatabase.CreateAsset(asset, $"{path}/GameConfig.asset");
    }

    static void EnsureDirectory(string path)
    {
        if (!AssetDatabase.IsValidFolder(path))
        {
            string parent = Path.GetDirectoryName(path).Replace("\\", "/");
            string folder = Path.GetFileName(path);
            AssetDatabase.CreateFolder(parent, folder);
        }
    }
}
#endif
