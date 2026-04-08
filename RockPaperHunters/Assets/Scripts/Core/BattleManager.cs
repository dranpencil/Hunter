using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Orchestrates the entire Battle Phase: queues forest hunters by score,
/// runs monster selection, executes turn-based combat with all weapon powers
/// and monster effects, handles item usage, taming, and reward distribution.
/// Plain C# class instantiated by GameStateMachine's BattlePhase.
/// Maps from game.js startBattlePhase() ~line 11655, executeBotBattle() ~line 3233.
/// </summary>
public class BattleManager
{
    private readonly GameManager _gm;

    // Battle queue: forest hunters sorted by score asc, weapon priority asc
    private List<PlayerData> _battleQueue;
    private int _currentBattleIndex;

    // Current battle state
    private FullBattleState _currentBattle;
    private bool _waitingForPlayerInput;
    private bool _allBattlesDone;

    // HP boost from OtherMonstersPlus1HP effect, accumulated per round
    private int _monsterHPBoost;

    public bool AllBattlesDone => _allBattlesDone;
    public bool WaitingForPlayerInput => _waitingForPlayerInput;

    public BattleManager(GameManager gm)
    {
        _gm = gm;
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /// <summary>
    /// Begin the battle phase. Sorts forest hunters and starts the first battle.
    /// Returns false if there are no forest hunters.
    /// </summary>
    public bool StartBattlePhase()
    {
        _allBattlesDone = false;
        _monsterHPBoost = 0;

        // Gather hunters in Forest
        var forestHunters = _gm.GetHuntersAtLocation(LocationId.Forest);
        if (forestHunters.Count == 0)
        {
            _allBattlesDone = true;
            return false;
        }

        // Sort: lowest score first; ties broken by weapon priority (ascending)
        forestHunters.Sort((a, b) =>
        {
            int cmp = a.score.CompareTo(b.score);
            if (cmp != 0) return cmp;
            return a.weaponData.priority.CompareTo(b.weaponData.priority);
        });

        _battleQueue = forestHunters;
        _currentBattleIndex = 0;

        EventBus.Publish(new GameLogEvent
        {
            message = "Battle Phase - Forest hunters prepare to fight!",
            logType = GameLogType.System
        });

        StartNextBattle();
        return true;
    }

    /// <summary>
    /// Called when a human player selects a monster level to fight.
    /// </summary>
    public void SelectMonsterLevel(int playerId, int level)
    {
        if (_currentBattle == null || _currentBattle.playerId != playerId) return;
        if (_currentBattle.phase != BattlePhaseStep.MonsterSelection) return;

        var player = _gm.Players[playerId];

        // Pay EP cost
        int epCost = level + 1; // Lv1=2, Lv2=3, Lv3=4
        if (player.ep < epCost)
        {
            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName} doesn't have enough EP to fight level {level}!",
                logType = GameLogType.Battle
            });
            return;
        }

        // Pick a random undefeated monster of that level
        MonsterData monster = PickRandomMonster(level);
        if (monster == null)
        {
            EventBus.Publish(new GameLogEvent
            {
                message = $"No undefeated level {level} monsters remaining!",
                logType = GameLogType.Battle
            });
            return;
        }

        // Consume EP
        _gm.Resources.ChangeResource(player, "ep", -epCost);

        // Consume ammo for Rifle/Plasma
        if (player.weaponData.requiresAmmo)
        {
            _gm.Weapons.ConsumeAmmo(player);
        }

        // Initialize combat state
        _currentBattle.monster = monster;
        _currentBattle.monsterLevel = level;
        _currentBattle.monsterMaxHP = monster.hp + _monsterHPBoost;
        _currentBattle.monsterCurrentHP = _currentBattle.monsterMaxHP;
        _currentBattle.monsterATT = monster.att;
        _currentBattle.combatRound = 0;
        _currentBattle.totalDamageTaken = 0;
        _currentBattle.doubleDamageUsed = false;
        _currentBattle.doubleDamageAvailable = (player.weaponData.weaponName == "Knife"
                                                  && player.GetCurrentPowerLevel() >= 1);
        _currentBattle.fakeBloodUsed = false;
        _currentBattle.bowDoubleDamageApplied = false;
        _currentBattle.swordBonusPoints = 0;
        _currentBattle.battleLog.Clear();
        _currentBattle.lastAttackDice = null;
        _currentBattle.lastDefenseDice = null;

        // Apply steal money effect
        int stolen = _gm.MonsterEffects.GetStolenMoney(monster.effectType);
        if (stolen > 0 && player.money > 0)
        {
            int actualStolen = Mathf.Min(stolen, player.money);
            _gm.Resources.ChangeResource(player, "money", -actualStolen);
            AddBattleLog($"{monster.monsterName} stole ${actualStolen}!");
        }

        AddBattleLog($"{player.playerName} fights {monster.monsterName} (Lv{level}, HP:{_currentBattle.monsterCurrentHP}, ATT:{monster.att})");

        EventBus.Publish(new BattleStartedEvent
        {
            playerId = playerId,
            monsterLevel = level
        });

        // Check first strike
        bool firstStrike = _gm.Combat.MonsterHasFirstStrike(monster, player);
        if (firstStrike)
        {
            _currentBattle.phase = BattlePhaseStep.MonsterAttack;
            AddBattleLog($"{monster.monsterName} strikes first!");
            ProcessMonsterAttack();
        }
        else
        {
            _currentBattle.phase = BattlePhaseStep.PlayerAction;
            _waitingForPlayerInput = !player.isBot;

            if (player.isBot)
            {
                RunBotCombat();
            }
        }
    }

    /// <summary>
    /// Human player presses Attack button.
    /// </summary>
    public void ProcessPlayerAttack(int playerId)
    {
        if (!ValidatePlayerAction(playerId, BattlePhaseStep.PlayerAction)) return;
        ExecutePlayerAttack(false);
    }

    /// <summary>
    /// Human player activates Knife double damage before attacking.
    /// </summary>
    public void ProcessDoubleDamage(int playerId)
    {
        if (!ValidatePlayerAction(playerId, BattlePhaseStep.PlayerAction)) return;
        if (!_currentBattle.doubleDamageAvailable || _currentBattle.doubleDamageUsed) return;

        _currentBattle.doubleDamageUsed = true;
        _currentBattle.doubleDamageAvailable = false;
        AddBattleLog("Knife double damage activated!");

        EventBus.Publish(new GameLogEvent
        {
            message = $"{_gm.Players[playerId].playerName} activates Knife double damage!",
            logType = GameLogType.Battle
        });

        ExecutePlayerAttack(true);
    }

    /// <summary>
    /// Human player uses a combat item (Grenade/Bomb/Dynamite/Beer/BloodBag/FakeBlood).
    /// itemIndex is the index within the player's inventory.
    /// </summary>
    public void ProcessItemUse(int playerId, int itemIndex)
    {
        if (!ValidatePlayerAction(playerId, BattlePhaseStep.PlayerAction)) return;

        var player = _gm.Players[playerId];
        if (itemIndex < 0 || itemIndex >= player.inventory.Count) return;

        var item = player.inventory[itemIndex];
        UseItemInBattle(player, item, itemIndex);
    }

    /// <summary>
    /// Human player attempts to tame the current monster.
    /// </summary>
    public void ProcessTame(int playerId)
    {
        if (!ValidatePlayerAction(playerId, BattlePhaseStep.PlayerAction)) return;

        var player = _gm.Players[playerId];
        if (!_gm.Combat.CanTame(player, _currentBattle.monsterCurrentHP))
        {
            AddBattleLog("Cannot tame: monster HP too high or wrong weapon!");
            return;
        }

        int epCost = _gm.Combat.GetTamingEPCost(player, _currentBattle.monsterLevel);
        epCost += _gm.MonsterEffects.GetExtraTamingCost(_currentBattle.monster.effectType);

        if (player.ep < epCost)
        {
            AddBattleLog($"Not enough EP to tame! Need {epCost} EP.");
            return;
        }

        // Pay taming EP
        _gm.Resources.ChangeResource(player, "ep", -epCost);

        // Add pet
        switch (_currentBattle.monsterLevel)
        {
            case 1: player.petsLevel1++; break;
            case 2: player.petsLevel2++; break;
            case 3: player.petsLevel3++; break;
        }

        AddBattleLog($"{player.playerName} tamed {_currentBattle.monster.monsterName}!");

        EventBus.Publish(new MonsterTamedEvent
        {
            playerId = playerId,
            monsterLevel = _currentBattle.monsterLevel
        });

        EndCurrentBattle(true);
    }

    /// <summary>
    /// Returns a snapshot of the current battle for UI display and bot AI.
    /// </summary>
    public FullBattleState GetCurrentBattleState()
    {
        return _currentBattle;
    }

    // ------------------------------------------------------------------
    // Internal: Battle Flow
    // ------------------------------------------------------------------

    private void StartNextBattle()
    {
        if (_currentBattleIndex >= _battleQueue.Count)
        {
            _allBattlesDone = true;
            _waitingForPlayerInput = false;
            return;
        }

        var player = _battleQueue[_currentBattleIndex];

        // Check if player can enter forest (EP >= 2 and ammo if needed)
        if (player.ep < 2)
        {
            AddBattleLog($"{player.playerName} has insufficient EP and cannot fight.");
            EventBus.Publish(new BattleEndedEvent { playerId = player.id, victory = false });
            _currentBattleIndex++;
            StartNextBattle();
            return;
        }

        if (player.weaponData.requiresAmmo && !_gm.Weapons.HasAmmo(player))
        {
            AddBattleLog($"{player.playerName} has no ammunition and cannot fight.");
            EventBus.Publish(new BattleEndedEvent { playerId = player.id, victory = false });
            _currentBattleIndex++;
            StartNextBattle();
            return;
        }

        _currentBattle = new FullBattleState
        {
            playerId = player.id,
            phase = BattlePhaseStep.MonsterSelection
        };

        if (player.isBot)
        {
            // Bot selects monster level automatically
            int level = BotSelectMonsterLevel(player);
            SelectMonsterLevel(player.id, level);
        }
        else
        {
            // Human: show monster selection UI
            _waitingForPlayerInput = true;
            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName}: Select a monster level to fight!",
                logType = GameLogType.Battle
            });
        }
    }

    private void ExecutePlayerAttack(bool isDoubleDamage)
    {
        var player = _gm.Players[_currentBattle.playerId];
        _currentBattle.combatRound++;
        _currentBattle.phase = BattlePhaseStep.PlayerAttack;

        // Roll attack dice
        int[] attackDice = _gm.Combat.RollDice(player.currentAttackDice);
        _currentBattle.lastAttackDice = attackDice;

        // Calculate base weapon damage
        int damage = _gm.Combat.CalculateDamage(player.weaponData, attackDice);

        // Bat Lv3: reroll hits and sum all
        if (player.weaponData.weaponName == "Bat" && player.GetCurrentPowerLevel() >= 3)
        {
            int[] allDice = _gm.Combat.BatReroll(player.weaponData, attackDice);
            damage = _gm.Combat.CalculateDamage(player.weaponData, allDice);
            _currentBattle.lastAttackDice = allDice;
            AddBattleLog("Bat Lv3: Re-rolled hits and summed all damage!");
        }

        // Gloves bonus damage
        int gloveBonus = _gm.Combat.GetGlovesBonusDamage(player, attackDice);
        if (gloveBonus > 0)
        {
            damage += gloveBonus;
            AddBattleLog($"Gloves bonus: +{gloveBonus} damage!");
        }

        // Bow Lv3: double damage
        if (player.weaponData.weaponName == "Bow" && player.GetCurrentPowerLevel() >= 3
            && !_currentBattle.bowDoubleDamageApplied)
        {
            damage = _gm.Combat.ApplyBowDoubleDamage(player, damage);
            _currentBattle.bowDoubleDamageApplied = true;
            AddBattleLog("Bow Lv3: Damage doubled!");
        }

        // Knife double damage (one-time)
        if (isDoubleDamage)
        {
            damage = _gm.Combat.ApplyKnifeDoubleDamage(damage);
            AddBattleLog("Knife: Double damage applied!");
        }

        // Pet damage
        int petDmg = _gm.Combat.CalculatePetDamage(player);
        if (petDmg > 0)
        {
            damage += petDmg;
            AddBattleLog($"Pets deal {petDmg} bonus damage!");
        }

        // Apply damage cap from monster effect
        int damageCap = _gm.MonsterEffects.GetDamageCap(_currentBattle.monster.effectType);
        if (damageCap > 0 && damage > damageCap)
        {
            damage = damageCap;
            AddBattleLog($"Monster effect: Damage capped at {damageCap}!");
        }

        // Ensure non-negative
        damage = Mathf.Max(0, damage);

        // Apply damage to monster
        _currentBattle.monsterCurrentHP -= damage;

        // Sword Lv3: bonus points per die showing 1
        int swordBonus = _gm.Combat.GetSwordBonusPoints(player, attackDice);
        if (swordBonus > 0)
        {
            _currentBattle.swordBonusPoints += swordBonus;
            AddBattleLog($"Sword Lv3: +{swordBonus} bonus points from dice showing 1!");
        }

        // EP drain effect
        if (_gm.MonsterEffects.DrainsEPPerAttack(_currentBattle.monster.effectType))
        {
            _gm.Resources.ChangeResource(player, "ep", -1);
            AddBattleLog("Monster drains 1 EP!");
        }

        EventBus.Publish(new DiceRolledEvent
        {
            playerId = player.id,
            diceResults = _currentBattle.lastAttackDice,
            totalDamage = damage
        });

        AddBattleLog($"{player.playerName} attacks for {damage} damage! (Monster HP: {Mathf.Max(0, _currentBattle.monsterCurrentHP)}/{_currentBattle.monsterMaxHP})");

        EventBus.Publish(new MonsterDamagedEvent
        {
            monsterId = _currentBattle.monster.monsterId,
            damage = damage,
            remainingHp = Mathf.Max(0, _currentBattle.monsterCurrentHP)
        });

        // Katana Lv3: instant kill if dice sum > 27
        if (player.weaponData.weaponName == "Katana" && player.GetCurrentPowerLevel() >= 3)
        {
            if (_gm.Combat.CheckKatanaInstantKill(_currentBattle.lastAttackDice))
            {
                _currentBattle.monsterCurrentHP = 0;
                AddBattleLog("Katana Lv3: INSTANT KILL! Dice sum exceeds 27!");
            }
        }

        // Check monster defeated
        if (_currentBattle.monsterCurrentHP <= 0)
        {
            OnMonsterDefeated();
            return;
        }

        // Monster heals after surviving
        if (_gm.MonsterEffects.HealsAfterSurviving(_currentBattle.monster.effectType))
        {
            _currentBattle.monsterCurrentHP = Mathf.Min(
                _currentBattle.monsterCurrentHP + 1,
                _currentBattle.monsterMaxHP);
            AddBattleLog("Monster heals +1 HP after surviving!");
        }

        // Monster counter-attack
        _currentBattle.phase = BattlePhaseStep.MonsterAttack;
        ProcessMonsterAttack();
    }

    private void ProcessMonsterAttack()
    {
        var player = _gm.Players[_currentBattle.playerId];

        // Get effective attack (may be boosted at half HP)
        int monsterATT = _gm.MonsterEffects.GetEffectiveAttack(
            _currentBattle.monster, _currentBattle.monsterCurrentHP);
        _currentBattle.monsterATT = monsterATT;

        // Bow dodge check
        if (_gm.Combat.CheckBowDodge(player))
        {
            AddBattleLog($"{player.playerName} dodges the monster's attack! (Bow power)");
            AfterMonsterAttack(player, 0);
            return;
        }

        // Roll defense dice
        int[] defenseDice = _gm.Combat.RollDice(player.currentDefenseDice);
        _currentBattle.lastDefenseDice = defenseDice;
        int blocked = _gm.Combat.CalculateDefense(defenseDice);

        int damageToPlayer = Mathf.Max(0, monsterATT - blocked);

        // Axe counter-attack
        int axeCounter = _gm.Combat.GetAxeCounterDamage(player, damageToPlayer);

        // Apply damage to player
        if (damageToPlayer > 0)
        {
            _gm.Resources.ChangeResource(player, "hp", -damageToPlayer);
            _currentBattle.totalDamageTaken += damageToPlayer;

            AddBattleLog($"{_currentBattle.monster.monsterName} attacks for {monsterATT}, blocked {blocked}, {player.playerName} takes {damageToPlayer} damage! (HP: {player.hp}/{player.maxHp})");

            EventBus.Publish(new PlayerDamagedEvent
            {
                playerId = player.id,
                damage = damageToPlayer,
                remainingHp = player.hp
            });
        }
        else
        {
            AddBattleLog($"{_currentBattle.monster.monsterName} attacks for {monsterATT}, fully blocked!");
        }

        // Apply Axe counter damage to monster
        if (axeCounter > 0)
        {
            _currentBattle.monsterCurrentHP -= axeCounter;
            AddBattleLog($"Axe counter: {axeCounter} damage to monster! (Monster HP: {Mathf.Max(0, _currentBattle.monsterCurrentHP)})");

            EventBus.Publish(new MonsterDamagedEvent
            {
                monsterId = _currentBattle.monster.monsterId,
                damage = axeCounter,
                remainingHp = Mathf.Max(0, _currentBattle.monsterCurrentHP)
            });

            if (_currentBattle.monsterCurrentHP <= 0)
            {
                OnMonsterDefeated();
                return;
            }
        }

        AfterMonsterAttack(player, damageToPlayer);
    }

    private void AfterMonsterAttack(PlayerData player, int damageToPlayer)
    {
        // Check player death
        if (player.hp <= 0)
        {
            // Player is knocked out — set HP to 1 and end battle (defeat)
            player.hp = 1;
            _gm.Resources.ChangeResource(player, "hp", 0); // Trigger event with current value
            AddBattleLog($"{player.playerName} is knocked out!");
            EndCurrentBattle(false);
            return;
        }

        // Ready for next player action
        _currentBattle.phase = BattlePhaseStep.PlayerAction;

        if (player.isBot)
        {
            RunBotCombat();
        }
        else
        {
            _waitingForPlayerInput = true;
        }
    }

    private void OnMonsterDefeated()
    {
        var player = _gm.Players[_currentBattle.playerId];
        var monster = _currentBattle.monster;

        // Award EXP from damage taken (with effect caps)
        int expFromDamage = _currentBattle.totalDamageTaken;
        int expCap = _gm.MonsterEffects.GetExpCapFromDamage(monster.effectType);
        if (expCap == 0)
        {
            expFromDamage = 0; // NoExpFromDamage
        }
        else if (expFromDamage > expCap)
        {
            expFromDamage = expCap;
        }
        if (expFromDamage > 0)
        {
            _gm.Resources.ChangeResource(player, "exp", expFromDamage);
            AddBattleLog($"{player.playerName} gains {expFromDamage} EXP from damage taken.");
        }

        // Award monster rewards
        if (monster.moneyReward > 0)
            _gm.Resources.ChangeResource(player, "money", monster.moneyReward);
        if (monster.energyReward > 0)
            _gm.Resources.ChangeResource(player, "ep", monster.energyReward);
        if (monster.bloodReward > 0)
            _gm.Resources.ChangeResource(player, "bloodBag", monster.bloodReward);

        // Award points
        int points = monster.points;

        // Sword bonus points
        if (_currentBattle.swordBonusPoints > 0)
        {
            points += _currentBattle.swordBonusPoints;
            AddBattleLog($"Sword Lv3: +{_currentBattle.swordBonusPoints} bonus points!");
        }

        // Fake Blood bonus points
        if (_currentBattle.fakeBloodUsed)
        {
            int fakeBloodBonus = monster.level;
            points += fakeBloodBonus;
            AddBattleLog($"Fake Blood: +{fakeBloodBonus} bonus points!");
            _gm.Resources.ChangeScore(player, fakeBloodBonus, "fakeBlood");
        }

        if (points > 0)
        {
            _gm.Resources.ChangeScore(player, monster.points, "monster");
        }

        // Track defeated monster
        _gm.DefeatedMonsterIds.Add(monster.monsterId);
        switch (monster.level)
        {
            case 1: player.monstersDefeated.level1++; break;
            case 2: player.monstersDefeated.level2++; break;
            case 3: player.monstersDefeated.level3++; break;
        }

        // Apply death effects
        _gm.MonsterEffects.ApplyDeathEffects(monster, player);

        // Check if this monster boosts other monsters' HP
        if (_gm.MonsterEffects.BoostsOtherMonsters(monster.effectType))
        {
            _monsterHPBoost++;
            AddBattleLog("This monster's defeat boosts remaining monsters +1 HP!");
        }

        AddBattleLog($"{player.playerName} defeated {monster.monsterName}! " +
                      $"+{monster.points} pts, +${monster.moneyReward}, " +
                      $"+{monster.energyReward} EP, +{monster.bloodReward} blood bags");

        EventBus.Publish(new MonsterDefeatedEvent
        {
            playerId = player.id,
            monsterLevel = monster.level,
            pointsEarned = points
        });

        EndCurrentBattle(true);
    }

    private void EndCurrentBattle(bool victory)
    {
        var player = _gm.Players[_currentBattle.playerId];

        // Update bot stage
        if (player.isBot)
        {
            // Find the BotPlayer - we just update via PlayerData directly
            // BotPlayer.UpdateStage is called externally or we handle it here
        }

        _currentBattle.phase = BattlePhaseStep.BattleOver;
        _currentBattle.victory = victory;
        _waitingForPlayerInput = false;

        AddBattleLog(victory
            ? $"{player.playerName} is victorious!"
            : $"{player.playerName} retreats from battle.");

        EventBus.Publish(new BattleEndedEvent
        {
            playerId = player.id,
            victory = victory
        });

        // Move to next battle
        _currentBattleIndex++;
        StartNextBattle();
    }

    // ------------------------------------------------------------------
    // Item Usage
    // ------------------------------------------------------------------

    private void UseItemInBattle(PlayerData player, ItemData item, int inventoryIndex)
    {
        switch (item.effectType)
        {
            case ItemEffectType.Grenade:
            case ItemEffectType.Bomb:
            case ItemEffectType.Dynamite:
                UseExplosiveItem(player, item, inventoryIndex);
                break;

            case ItemEffectType.Beer:
                UseBeerInBattle(player, inventoryIndex);
                break;

            case ItemEffectType.BloodBag:
                UseBloodBagInBattle(player, inventoryIndex);
                break;

            case ItemEffectType.FakeBlood:
                UseFakeBloodInBattle(player, inventoryIndex);
                break;

            default:
                AddBattleLog($"Cannot use {item.itemName} in battle.");
                break;
        }
    }

    private void UseExplosiveItem(PlayerData player, ItemData item, int inventoryIndex)
    {
        // Check immunity
        if (_gm.MonsterEffects.IsImmuneToItem(_currentBattle.monster.effectType, item.effectType))
        {
            AddBattleLog($"{_currentBattle.monster.monsterName} is immune to {item.itemName}!");
            return;
        }

        int damage = 0;
        switch (item.effectType)
        {
            case ItemEffectType.Grenade: damage = 1; break;
            case ItemEffectType.Bomb: damage = 2; break;
            case ItemEffectType.Dynamite: damage = 3; break;
        }

        // Apply damage cap
        int damageCap = _gm.MonsterEffects.GetDamageCap(_currentBattle.monster.effectType);
        if (damageCap > 0 && damage > damageCap)
        {
            damage = damageCap;
        }

        // Remove item from inventory
        player.inventory.RemoveAt(inventoryIndex);

        // Apply damage
        _currentBattle.monsterCurrentHP -= damage;

        AddBattleLog($"{player.playerName} uses {item.itemName} for {damage} damage! " +
                      $"(Monster HP: {Mathf.Max(0, _currentBattle.monsterCurrentHP)}/{_currentBattle.monsterMaxHP})");

        EventBus.Publish(new ItemUsedEvent { playerId = player.id, item = item });
        EventBus.Publish(new MonsterDamagedEvent
        {
            monsterId = _currentBattle.monster.monsterId,
            damage = damage,
            remainingHp = Mathf.Max(0, _currentBattle.monsterCurrentHP)
        });

        // Check monster defeated
        if (_currentBattle.monsterCurrentHP <= 0)
        {
            OnMonsterDefeated();
        }
    }

    private void UseBeerInBattle(PlayerData player, int inventoryIndex)
    {
        if (player.ep >= player.maxEp)
        {
            AddBattleLog("EP already at maximum!");
            return;
        }

        player.inventory.RemoveAt(inventoryIndex);
        _gm.Resources.ChangeResource(player, "ep", 1);
        AddBattleLog($"{player.playerName} drinks Beer: +1 EP (EP: {player.ep}/{player.maxEp})");

        EventBus.Publish(new ItemUsedEvent
        {
            playerId = player.id,
            item = _gm.GetItemByName("Beer")
        });
    }

    private void UseBloodBagInBattle(PlayerData player, int inventoryIndex)
    {
        if (player.hp >= player.maxHp)
        {
            AddBattleLog("HP already at maximum!");
            return;
        }

        player.inventory.RemoveAt(inventoryIndex);
        _gm.Resources.ChangeResource(player, "hp", 1);
        AddBattleLog($"{player.playerName} uses Blood Bag: +1 HP (HP: {player.hp}/{player.maxHp})");

        EventBus.Publish(new ItemUsedEvent
        {
            playerId = player.id,
            item = _gm.GetItemByName("Blood Bag")
        });
    }

    private void UseFakeBloodInBattle(PlayerData player, int inventoryIndex)
    {
        if (_currentBattle.fakeBloodUsed)
        {
            AddBattleLog("Fake Blood already used this battle!");
            return;
        }

        player.inventory.RemoveAt(inventoryIndex);
        _currentBattle.fakeBloodUsed = true;
        AddBattleLog($"{player.playerName} uses Fake Blood! Bonus points on victory.");

        EventBus.Publish(new ItemUsedEvent
        {
            playerId = player.id,
            item = _gm.GetItemByName("Fake Blood")
        });
    }

    // ------------------------------------------------------------------
    // Bot AI
    // ------------------------------------------------------------------

    private void RunBotCombat()
    {
        var player = _gm.Players[_currentBattle.playerId];

        // Safety: limit combat iterations to prevent infinite loops
        int maxIterations = 50;
        int iterations = 0;

        while (_currentBattle.phase == BattlePhaseStep.PlayerAction
               && _currentBattle.monsterCurrentHP > 0
               && player.hp > 0
               && iterations < maxIterations)
        {
            iterations++;

            // Build a BattleState snapshot for the bot AI
            var snapshot = new BattleState
            {
                monsterCurrentHP = _currentBattle.monsterCurrentHP,
                monsterATT = _currentBattle.monsterATT,
                monsterEffect = _currentBattle.monster.effectType,
                monsterLevel = _currentBattle.monsterLevel,
                playerCurrentHP = player.hp,
                playerCurrentEP = player.ep,
                canTame = _gm.Combat.CanTame(player, _currentBattle.monsterCurrentHP)
            };

            // Get bot's BotPlayer instance (we need to find it)
            var decision = MakeBotDecision(player, snapshot);

            switch (decision.action)
            {
                case BotBattleAction.UseItem:
                    if (decision.itemToUse != null)
                    {
                        int idx = player.inventory.IndexOf(decision.itemToUse);
                        if (idx >= 0)
                        {
                            UseItemInBattle(player, decision.itemToUse, idx);
                            // If monster died from item, OnMonsterDefeated handles transition
                            if (_currentBattle.monsterCurrentHP <= 0) return;
                            continue; // Can use multiple items before attacking
                        }
                    }
                    // Fall through to attack if item not found
                    ExecutePlayerAttack(decision.useDoubleDamage);
                    break;

                case BotBattleAction.Tame:
                    ProcessTame(player.id);
                    return;

                case BotBattleAction.Attack:
                    ExecutePlayerAttack(decision.useDoubleDamage);
                    break;

                default:
                    ExecutePlayerAttack(false);
                    break;
            }

            // After attack, monster attack happens inside ExecutePlayerAttack
            // and control returns here if player survived and phase is PlayerAction again
        }
    }

    private BotBattleDecision MakeBotDecision(PlayerData player, BattleState state)
    {
        // Use the BotCombatAI logic directly
        var botAI = new BotCombatAI(player.id, _gm);
        return botAI.MakeBattleDecision(_gm, state);
    }

    private int BotSelectMonsterLevel(PlayerData player)
    {
        // Bot stage determines preferred monster level
        int preferredLevel;
        if (player.monstersDefeated.level2 >= 2)
        {
            preferredLevel = 3; // Stage 3: fight level 3
        }
        else if (player.monstersDefeated.level1 >= 2)
        {
            preferredLevel = 2; // Stage 2: fight level 2
        }
        else
        {
            preferredLevel = 1; // Stage 1: fight level 1
        }

        // Validate: check EP and available monsters
        for (int level = preferredLevel; level >= 1; level--)
        {
            int epCost = level + 1;
            if (player.ep >= epCost && HasMonstersOfLevel(level))
            {
                return level;
            }
        }

        // Fallback: lowest available level
        for (int level = 1; level <= 3; level++)
        {
            int epCost = level + 1;
            if (player.ep >= epCost && HasMonstersOfLevel(level))
            {
                return level;
            }
        }

        return 1; // Default fallback
    }

    // ------------------------------------------------------------------
    // Monster Selection Helpers
    // ------------------------------------------------------------------

    private MonsterData PickRandomMonster(int level)
    {
        var allOfLevel = _gm.GetMonstersByLevel(level);
        var available = new List<MonsterData>();
        foreach (var m in allOfLevel)
        {
            if (!_gm.DefeatedMonsterIds.Contains(m.monsterId))
                available.Add(m);
        }

        if (available.Count == 0)
        {
            // All monsters at this level defeated — allow re-fight
            available.AddRange(allOfLevel);
        }

        if (available.Count == 0) return null;
        return available[UnityEngine.Random.Range(0, available.Count)];
    }

    private bool HasMonstersOfLevel(int level)
    {
        var allOfLevel = _gm.GetMonstersByLevel(level);
        // Always allow fighting even if all defeated (re-fight)
        return allOfLevel.Length > 0;
    }

    // ------------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------------

    private bool ValidatePlayerAction(int playerId, BattlePhaseStep requiredPhase)
    {
        if (_currentBattle == null) return false;
        if (_currentBattle.playerId != playerId) return false;
        if (_currentBattle.phase != requiredPhase) return false;
        return true;
    }

    private void AddBattleLog(string message)
    {
        if (_currentBattle != null)
        {
            _currentBattle.battleLog.Add(message);
        }

        EventBus.Publish(new GameLogEvent
        {
            message = message,
            logType = GameLogType.Battle
        });
    }
}

// ------------------------------------------------------------------
// Battle State Data
// ------------------------------------------------------------------

/// <summary>
/// Steps within a single battle encounter.
/// </summary>
public enum BattlePhaseStep
{
    MonsterSelection,
    PlayerAction,
    PlayerAttack,
    MonsterAttack,
    BattleOver
}

/// <summary>
/// Full state of the current battle, used by UI and bot AI.
/// </summary>
public class FullBattleState
{
    // Identity
    public int playerId;
    public MonsterData monster;
    public int monsterLevel;

    // Monster stats
    public int monsterMaxHP;
    public int monsterCurrentHP;
    public int monsterATT;

    // Combat tracking
    public int combatRound;
    public int totalDamageTaken;
    public bool victory;

    // Phase tracking
    public BattlePhaseStep phase;

    // Dice results
    public int[] lastAttackDice;
    public int[] lastDefenseDice;

    // Weapon power flags
    public bool doubleDamageAvailable;  // Knife Lv1+
    public bool doubleDamageUsed;
    public bool bowDoubleDamageApplied; // Bow Lv3, once per battle
    public int swordBonusPoints;        // Sword Lv3, accumulated

    // Item usage tracking
    public bool fakeBloodUsed;

    // Battle log
    public List<string> battleLog = new List<string>();

    // Derived properties for UI convenience

    /// <summary>
    /// Whether the current player can attempt taming this monster.
    /// Must be checked against CombatSystem.CanTame() for authoritative result.
    /// </summary>
    public bool canTame;
}
