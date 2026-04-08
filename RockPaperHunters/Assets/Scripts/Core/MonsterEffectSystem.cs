using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Processes all 24 monster special effects during and after combat.
/// Maps from game.js lines 7786-8068.
/// </summary>
public class MonsterEffectSystem
{
    private readonly GameManager _gm;

    // Track active effects for the current battle round
    public List<ActiveMonsterEffect> ActiveEffects { get; private set; } = new List<ActiveMonsterEffect>();
    public HashSet<int> ForestPlayersThisRound { get; private set; } = new HashSet<int>();

    public MonsterEffectSystem(GameManager gm)
    {
        _gm = gm;
    }

    public void ClearRoundEffects()
    {
        ActiveEffects.Clear();
        ForestPlayersThisRound.Clear();
    }

    public void RegisterForestPlayer(int playerId)
    {
        ForestPlayersThisRound.Add(playerId);
    }

    /// <summary>
    /// Get the damage cap imposed by a monster effect (0 = no cap).
    /// </summary>
    public int GetDamageCap(MonsterEffectType effect)
    {
        switch (effect)
        {
            case MonsterEffectType.DamageCap2: return 2;
            case MonsterEffectType.DamageCap4: return 4;
            case MonsterEffectType.DamageCap6: return 6;
            default: return 0;
        }
    }

    /// <summary>
    /// Check if monster is immune to a specific explosive item.
    /// </summary>
    public bool IsImmuneToItem(MonsterEffectType effect, ItemEffectType itemEffect)
    {
        switch (effect)
        {
            case MonsterEffectType.ImmuneToGrenades:
                return itemEffect == ItemEffectType.Grenade;
            case MonsterEffectType.ImmuneToAllExplosives:
                return itemEffect == ItemEffectType.Grenade
                    || itemEffect == ItemEffectType.Bomb
                    || itemEffect == ItemEffectType.Dynamite;
            default:
                return false;
        }
    }

    /// <summary>
    /// Check if monster gains attack boost at half HP.
    /// </summary>
    public bool HasHalfHPAttackBoost(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.AttackUpAtHalfHP;
    }

    /// <summary>
    /// Get the current attack value considering half-HP boost.
    /// </summary>
    public int GetEffectiveAttack(MonsterData monster, int currentHP)
    {
        int att = monster.att;
        if (HasHalfHPAttackBoost(monster.effectType) && currentHP <= monster.hp / 2)
        {
            att += 1;
        }
        return att;
    }

    /// <summary>
    /// Check if monster steals money on encounter.
    /// </summary>
    public int GetStolenMoney(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.StealMoney ? 2 : 0;
    }

    /// <summary>
    /// Get EXP cap from monster effect (0 = no cap).
    /// </summary>
    public int GetExpCapFromDamage(MonsterEffectType effect)
    {
        switch (effect)
        {
            case MonsterEffectType.NoExpFromDamage: return 0;
            case MonsterEffectType.MaxExpFromDamage3: return 3;
            case MonsterEffectType.MaxExpFromDamage4: return 4;
            default: return int.MaxValue;
        }
    }

    /// <summary>
    /// Check if the monster drains EP per player attack.
    /// </summary>
    public bool DrainsEPPerAttack(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.DrainEPPerAttack;
    }

    /// <summary>
    /// Check if monster heals after surviving an attack.
    /// </summary>
    public bool HealsAfterSurviving(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.HealAfterSurviving;
    }

    /// <summary>
    /// Check if this monster boosts other monsters' HP by 1 this round.
    /// </summary>
    public bool BoostsOtherMonsters(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.OtherMonstersPlus1HP;
    }

    /// <summary>
    /// Get extra taming EP cost from monster effect.
    /// </summary>
    public int GetExtraTamingCost(MonsterEffectType effect)
    {
        return effect == MonsterEffectType.ExtraTamingCost ? 1 : 0;
    }

    /// <summary>
    /// Apply death effects when a monster is defeated.
    /// </summary>
    public void ApplyDeathEffects(MonsterData monster, PlayerData killer)
    {
        switch (monster.effectType)
        {
            case MonsterEffectType.DeathDamageAll:
                // Killer and all forest players lose 1 HP (won't go below 1)
                foreach (var player in _gm.Players)
                {
                    if (player.id == killer.id || ForestPlayersThisRound.Contains(player.id))
                    {
                        if (player.hp > 1)
                            _gm.Resources.ChangeResource(player, "hp", -1);
                    }
                }
                break;

            case MonsterEffectType.DamageNonForestPlayers1HP:
                foreach (var player in _gm.Players)
                {
                    if (!ForestPlayersThisRound.Contains(player.id) && player.hp > 1)
                        _gm.Resources.ChangeResource(player, "hp", -1);
                }
                break;

            case MonsterEffectType.DamageNonForestPlayers2HP:
                foreach (var player in _gm.Players)
                {
                    if (!ForestPlayersThisRound.Contains(player.id))
                    {
                        int dmg = Mathf.Min(2, player.hp - 1);
                        if (dmg > 0)
                            _gm.Resources.ChangeResource(player, "hp", -dmg);
                    }
                }
                break;

            case MonsterEffectType.ReduceNonForestExp:
                foreach (var player in _gm.Players)
                {
                    if (!ForestPlayersThisRound.Contains(player.id))
                        _gm.Resources.ChangeResource(player, "exp", -2);
                }
                break;

            case MonsterEffectType.ReduceNonForestPoints:
                foreach (var player in _gm.Players)
                {
                    if (!ForestPlayersThisRound.Contains(player.id))
                        _gm.Resources.ChangeScore(player, -2, "other");
                }
                break;
        }
    }

    /// <summary>
    /// Get the first-strike defense requirement for a monster effect.
    /// Returns 0 if monster does not have first strike.
    /// </summary>
    public int GetFirstStrikeDefenseRequirement(MonsterEffectType effect)
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

public class ActiveMonsterEffect
{
    public int monsterId;
    public MonsterEffectType effectType;
    public int remainingHP;
}
