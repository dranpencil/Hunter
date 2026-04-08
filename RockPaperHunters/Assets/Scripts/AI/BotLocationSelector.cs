using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Probabilistic entry system for bot location selection.
/// Maps from game.js BotPlayer.selectHunterLocation() lines 106-390.
/// Each location gets "entries" (weighted lottery tickets). More entries = higher probability.
/// </summary>
public class BotLocationSelector
{
    private readonly int _playerId;
    private int _lastPlazaRound = -10; // Track when bot last visited Plaza

    private const int BASE_ENTRIES = 4;

    public BotLocationSelector(int playerId, GameManager gm)
    {
        _playerId = playerId;
    }

    public LocationId SelectHunterLocation(GameManager gm)
    {
        var player = gm.Players[_playerId];
        var entries = new Dictionary<LocationId, int>();

        // Base entries for all locations
        foreach (LocationId loc in System.Enum.GetValues(typeof(LocationId)))
        {
            entries[loc] = BASE_ENTRIES;
        }

        // 1. Weapon preference: +2 to preferred location
        entries[player.weaponData.preferredLocation] += 2;

        // 2. Resource needs
        // Low HP -> Hospital bonus
        if (player.hp <= player.maxHp / 2)
            entries[LocationId.Hospital] += 3;

        // Low EP -> Bar bonus
        if (player.ep <= 2)
            entries[LocationId.Bar] += 2;

        // Low money -> Work Site bonus
        if (player.money <= 2)
            entries[LocationId.WorkSite] += 2;

        // Need capacity -> Work Site bonus (for money to buy items)
        if (player.GetRemainingCapacity() > 4)
            entries[LocationId.WorkSite] += 1;

        // 3. Dojo: CSV table lookup based on attack/defense dice + power track level
        int dojoBonus = LookupDojoBonus(gm, player);
        entries[LocationId.Dojo] += dojoBonus;

        // 4. Plaza: +2 if not visited in 2+ rounds
        if (gm.CurrentRound - _lastPlazaRound >= 2)
            entries[LocationId.Plaza] += 2;

        // 5. Forest: complex bonuses and penalties
        int forestBonus = CalculateForestBonus(gm, player);
        entries[LocationId.Forest] += forestBonus;

        // Ensure no negative entries
        foreach (var key in new List<LocationId>(entries.Keys))
        {
            if (entries[key] < 0) entries[key] = 0;
        }

        // Weighted random selection
        var selected = WeightedRandomSelect(entries);

        if (selected == LocationId.Plaza)
            _lastPlazaRound = gm.CurrentRound;

        return selected;
    }

    public LocationId SelectApprenticeLocation(GameManager gm)
    {
        var player = gm.Players[_playerId];
        var entries = new Dictionary<LocationId, int>();

        foreach (LocationId loc in System.Enum.GetValues(typeof(LocationId)))
        {
            entries[loc] = BASE_ENTRIES;
        }

        // 1. Other players' weapon preferences: +2 per player that prefers this location
        foreach (var other in gm.Players)
        {
            if (other.id == _playerId) continue;
            entries[other.weaponData.preferredLocation] += 2;
        }

        // 2. Highest-score player: +2 additional to their preferred location
        PlayerData highestScorer = null;
        foreach (var p in gm.Players)
        {
            if (p.id == _playerId) continue;
            if (highestScorer == null || p.score > highestScorer.score)
                highestScorer = p;
        }
        if (highestScorer != null)
            entries[highestScorer.weaponData.preferredLocation] += 2;

        // 3. Forest coordination: +2 if hunter is in Forest and popularity advantage
        if (player.hunterLocation == LocationId.Forest)
        {
            entries[LocationId.Forest] += 2;
        }

        // Remove Forest for apprentice (usually not useful)
        entries[LocationId.Forest] = Mathf.Max(entries[LocationId.Forest] - 3, 0);

        return WeightedRandomSelect(entries);
    }

    private int LookupDojoBonus(GameManager gm, PlayerData player)
    {
        var bot = GetBot(gm);
        if (bot == null) return 0;

        // Determine which table to use based on bot stage
        BotTableType tableType;
        switch (bot.Stage)
        {
            case BotStage.Stage1: tableType = BotTableType.DojoLv1; break;
            case BotStage.Stage2: tableType = BotTableType.DojoLv2; break;
            default: tableType = BotTableType.DojoLv3; break;
        }

        var table = FindTable(gm, tableType);
        if (table == null) return 0;

        return table.Lookup(player.currentAttackDice, player.currentDefenseDice);
    }

    private int CalculateForestBonus(GameManager gm, PlayerData player)
    {
        int bonus = 0;
        var bot = GetBot(gm);
        if (bot == null) return 0;

        // Forest table lookup
        BotTableType tableType;
        switch (bot.Stage)
        {
            case BotStage.Stage1: tableType = BotTableType.ForestLv1; break;
            case BotStage.Stage2: tableType = BotTableType.ForestLv2; break;
            default: tableType = BotTableType.ForestLv3; break;
        }

        var table = FindTable(gm, tableType);
        if (table != null)
            bonus += table.Lookup(player.currentAttackDice, player.currentDefenseDice);

        // Penalties
        // Low HP penalty
        if (player.hp <= 2)
            bonus -= 3;

        // No ammo penalty (Rifle/Plasma)
        if (player.weaponData.requiresAmmo && !gm.Weapons.HasAmmo(player))
            bonus -= 10;

        // Low EP penalty
        if (player.ep < 2)
            bonus -= 5;

        // Item bonuses (grenades, bombs, dynamite)
        foreach (var item in player.inventory)
        {
            if (item.effectType == ItemEffectType.Grenade) bonus += 1;
            if (item.effectType == ItemEffectType.Bomb) bonus += 2;
            if (item.effectType == ItemEffectType.Dynamite) bonus += 3;
        }

        // Lowest score bonus: encourage forest when behind
        bool isLowestScore = true;
        foreach (var p in gm.Players)
        {
            if (p.id != _playerId && p.score < player.score)
            {
                isLowestScore = false;
                break;
            }
        }
        if (isLowestScore) bonus += 2;

        return bonus;
    }

    private BotPlayer GetBot(GameManager gm)
    {
        return gm.GetBot(_playerId);
    }

    private BotDecisionTable FindTable(GameManager gm, BotTableType type)
    {
        foreach (var table in gm.botTables)
        {
            if (table.tableType == type) return table;
        }
        return null;
    }

    private LocationId WeightedRandomSelect(Dictionary<LocationId, int> entries)
    {
        int total = 0;
        foreach (var kvp in entries)
            total += kvp.Value;

        if (total <= 0) return LocationId.WorkSite; // Fallback

        int roll = Random.Range(0, total);
        int cumulative = 0;
        foreach (var kvp in entries)
        {
            cumulative += kvp.Value;
            if (roll < cumulative)
                return kvp.Key;
        }

        return LocationId.WorkSite; // Fallback
    }
}
