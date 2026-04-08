using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Handles dice rolling, damage calculation, defense, and battle flow.
/// Maps from game.js combat functions around lines 6400-8068.
/// </summary>
public class CombatSystem
{
    private readonly GameManager _gm;

    public CombatSystem(GameManager gm)
    {
        _gm = gm;
    }

    /// <summary>
    /// Roll N dice, return array of results (1-6 each).
    /// </summary>
    public int[] RollDice(int count)
    {
        int[] results = new int[count];
        for (int i = 0; i < count; i++)
        {
            results[i] = Random.Range(1, 7);
        }
        return results;
    }

    /// <summary>
    /// Calculate total damage from dice results using weapon's damage array.
    /// </summary>
    public int CalculateDamage(WeaponData weapon, int[] diceResults)
    {
        int total = 0;
        foreach (int die in diceResults)
        {
            total += weapon.GetDamage(die);
        }
        return total;
    }

    /// <summary>
    /// Calculate damage from defense dice (reduces monster attack).
    /// Each defense die face 4+ blocks 1 damage.
    /// </summary>
    public int CalculateDefense(int[] defenseDice)
    {
        int blocked = 0;
        foreach (int die in defenseDice)
        {
            if (die >= 4) blocked++;
        }
        return blocked;
    }

    /// <summary>
    /// Calculate pet damage contribution.
    /// </summary>
    public int CalculatePetDamage(PlayerData player)
    {
        int damage = player.petsLevel1 * 1 + player.petsLevel2 * 2 + player.petsLevel3 * 3;

        // Chain Lv3: pet damage x2
        if (player.weaponData.weaponName == "Chain" && player.GetCurrentPowerLevel() >= 3)
        {
            damage *= 2;
        }

        return damage;
    }

    /// <summary>
    /// Check if Bow dodge triggers (Lv1+: 16% chance per hit).
    /// Returns true if the player dodges the monster's attack entirely.
    /// </summary>
    public bool CheckBowDodge(PlayerData player)
    {
        if (player.weaponData.weaponName != "Bow") return false;
        if (player.GetCurrentPowerLevel() < 1) return false;
        return Random.value < 0.16f;
    }

    /// <summary>
    /// Apply Axe counter-attack damage.
    /// Lv1: 1 damage back; Lv3: equal damage back.
    /// </summary>
    public int GetAxeCounterDamage(PlayerData player, int damageTaken)
    {
        if (player.weaponData.weaponName != "Axe") return 0;
        int powerLevel = player.GetCurrentPowerLevel();
        if (powerLevel >= 3) return damageTaken;
        if (powerLevel >= 1) return 1;
        return 0;
    }

    /// <summary>
    /// Apply Bat Lv3 power: re-roll hits, sum all damage.
    /// </summary>
    public int[] BatReroll(WeaponData weapon, int[] originalDice)
    {
        var hitDice = new List<int>();
        foreach (int die in originalDice)
        {
            if (weapon.GetDamage(die) > 0)
                hitDice.Add(die);
        }

        // Re-roll the dice that hit
        int[] rerolled = RollDice(hitDice.Count);
        // Combine original + rerolled
        var allDice = new List<int>(originalDice);
        allDice.AddRange(rerolled);
        return allDice.ToArray();
    }

    /// <summary>
    /// Check Katana Lv3 instant kill condition: dice total > 27.
    /// </summary>
    public bool CheckKatanaInstantKill(int[] diceResults)
    {
        int total = 0;
        foreach (int die in diceResults)
            total += die;
        return total > 27;
    }

    /// <summary>
    /// Calculate Knife double damage (Lv1+ power, once per battle).
    /// </summary>
    public int ApplyKnifeDoubleDamage(int damage)
    {
        return damage * 2;
    }

    /// <summary>
    /// Calculate Gloves bonus damage.
    /// Lv1: base attack = 1, +1 when HP < half.
    /// Lv3: +1 damage on dice 5,6 per HP lost (from max).
    /// </summary>
    public int GetGlovesBonusDamage(PlayerData player, int[] diceResults)
    {
        if (player.weaponData.weaponName != "Gloves") return 0;
        int powerLevel = player.GetCurrentPowerLevel();

        if (powerLevel >= 3)
        {
            int hpLost = player.maxHp - player.hp;
            int highDiceCount = 0;
            foreach (int die in diceResults)
            {
                if (die >= 5) highDiceCount++;
            }
            return highDiceCount * hpLost;
        }

        return 0;
    }

    /// <summary>
    /// Sword Lv3: +1 point per die showing 1.
    /// Returns bonus points (not damage).
    /// </summary>
    public int GetSwordBonusPoints(PlayerData player, int[] diceResults)
    {
        if (player.weaponData.weaponName != "Sword") return 0;
        if (player.GetCurrentPowerLevel() < 3) return 0;

        int count = 0;
        foreach (int die in diceResults)
        {
            if (die == 1) count++;
        }
        return count;
    }

    /// <summary>
    /// Get EP cost for taming, adjusted by weapon powers.
    /// Whip Lv1: -1 EP; Whip Lv3: 0 EP.
    /// </summary>
    public int GetTamingEPCost(PlayerData player, int monsterLevel)
    {
        int baseCost = monsterLevel + 1; // Same as fight EP cost

        if (player.weaponData.weaponName == "Whip")
        {
            int powerLevel = player.GetCurrentPowerLevel();
            if (powerLevel >= 3) return 0;
            if (powerLevel >= 1) return Mathf.Max(0, baseCost - 1);
        }

        return baseCost;
    }

    /// <summary>
    /// Check if a monster can be tamed by this player.
    /// Chain: HP <= 3 threshold. Whip: also has taming.
    /// </summary>
    public bool CanTame(PlayerData player, int monsterCurrentHP)
    {
        string weapon = player.weaponData.weaponName;
        if (weapon != "Chain" && weapon != "Whip") return false;
        return monsterCurrentHP <= _gm.config.baseTameHPThreshold;
    }

    /// <summary>
    /// Apply Bow Lv3 damage doubling.
    /// </summary>
    public int ApplyBowDoubleDamage(PlayerData player, int damage)
    {
        if (player.weaponData.weaponName != "Bow") return damage;
        if (player.GetCurrentPowerLevel() >= 3) return damage * 2;
        return damage;
    }

    /// <summary>
    /// Check if monster has first strike and player doesn't meet defense threshold.
    /// </summary>
    public bool MonsterHasFirstStrike(MonsterData monster, PlayerData player)
    {
        int defRequired = GetFirstStrikeDefenseRequirement(monster.effectType);
        if (defRequired <= 0) return false;
        return player.currentDefenseDice < defRequired;
    }

    private int GetFirstStrikeDefenseRequirement(MonsterEffectType effect)
    {
        switch (effect)
        {
            case MonsterEffectType.FirstStrikeDefense1: return 1;
            case MonsterEffectType.FirstStrikeDefense2: return 2;
            case MonsterEffectType.FirstStrikeDefense3: return 3;
            case MonsterEffectType.FirstStrikeDefense4: return 4;
            default: return 0;
        }
    }
}
