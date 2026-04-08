using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Bot tactical combat decisions: item usage, taming, attack/defend.
/// Maps from game.js executeBotBattle() ~line 3233 and handleBotTacticalItemUsage() ~line 4854.
/// </summary>
public class BotCombatAI
{
    private readonly int _playerId;
    private readonly GameManager _gm;

    public BotCombatAI(int playerId, GameManager gm)
    {
        _playerId = playerId;
        _gm = gm;
    }

    public BotBattleDecision MakeBattleDecision(GameManager gm, BattleState state)
    {
        var player = gm.Players[_playerId];
        var decision = new BotBattleDecision { action = BotBattleAction.Attack };

        // 1. Use Fake Blood if available (always beneficial)
        var fakeBlood = FindItem(player, ItemEffectType.FakeBlood);
        if (fakeBlood != null)
        {
            decision.action = BotBattleAction.UseItem;
            decision.itemToUse = fakeBlood;
            return decision;
        }

        // 2. Try to tame if possible and worthwhile
        if (state.canTame && ShouldTame(player, state))
        {
            decision.action = BotBattleAction.Tame;
            return decision;
        }

        // 3. Use combat items tactically
        var combatItem = SelectBestCombatItem(player, state);
        if (combatItem != null)
        {
            decision.action = BotBattleAction.UseItem;
            decision.itemToUse = combatItem;
            return decision;
        }

        // 4. Use Knife double damage if available and monster has enough HP
        if (player.weaponData.weaponName == "Knife" && player.GetCurrentPowerLevel() >= 1
            && state.monsterCurrentHP >= 3)
        {
            decision.useDoubleDamage = true;
        }

        // 5. Use beer for EP if running low during battle
        if (state.playerCurrentEP <= 1)
        {
            var beer = FindItem(player, ItemEffectType.Beer);
            if (beer != null)
            {
                decision.useBeerForEP = true;
            }
        }

        // Default: attack
        decision.action = BotBattleAction.Attack;
        return decision;
    }

    /// <summary>
    /// Select minimum item needed for guaranteed kill.
    /// Dynamite(3) > Bomb(2) > Grenade(1).
    /// </summary>
    private ItemData SelectBestCombatItem(PlayerData player, BattleState state)
    {
        int hp = state.monsterCurrentHP;

        // Check if monster is immune to explosives
        bool immuneAll = state.monsterEffect == MonsterEffectType.ImmuneToAllExplosives;
        bool immuneGrenade = state.monsterEffect == MonsterEffectType.ImmuneToGrenades || immuneAll;

        // Use minimum needed item
        if (hp <= 1 && !immuneGrenade)
        {
            var grenade = FindItem(player, ItemEffectType.Grenade);
            if (grenade != null) return grenade;
        }

        if (hp <= 2 && !immuneAll)
        {
            var bomb = FindItem(player, ItemEffectType.Bomb);
            if (bomb != null) return bomb;
        }

        if (hp <= 3 && !immuneAll)
        {
            var dynamite = FindItem(player, ItemEffectType.Dynamite);
            if (dynamite != null) return dynamite;
        }

        // If monster has low HP, use any available combat item
        if (hp <= 3)
        {
            if (!immuneAll)
            {
                var dynamite = FindItem(player, ItemEffectType.Dynamite);
                if (dynamite != null) return dynamite;
                var bomb = FindItem(player, ItemEffectType.Bomb);
                if (bomb != null) return bomb;
            }
            if (!immuneGrenade)
            {
                var grenade = FindItem(player, ItemEffectType.Grenade);
                if (grenade != null) return grenade;
            }
        }

        return null;
    }

    private bool ShouldTame(PlayerData player, BattleState state)
    {
        // Tame higher-level monsters for pet damage
        if (state.monsterLevel >= 2) return true;
        // Tame level 1 if we have few pets
        return player.GetTotalPets() < 2;
    }

    private ItemData FindItem(PlayerData player, ItemEffectType effectType)
    {
        foreach (var item in player.inventory)
        {
            if (item.effectType == effectType) return item;
        }
        return null;
    }
}
