using UnityEngine;

/// <summary>
/// Handles weapon upgrades, power track advancement, and round-start weapon powers.
/// Weapon combat powers are in CombatSystem.cs.
/// </summary>
public class WeaponSystem
{
    private readonly GameManager _gm;

    // EXP requirements per attack level: level 1->2, 2->3, etc.
    // reqExpAttack from WeaponData is the base cost per upgrade
    private static readonly int[] AttackLevelThresholds = { 0, 1, 2, 3, 4, 5 }; // placeholder
    private static readonly int[] DefenseLevelThresholds = { 0, 1, 2, 3, 4, 5 };

    public WeaponSystem(GameManager gm)
    {
        _gm = gm;
    }

    /// <summary>
    /// Try to upgrade attack dice. Costs reqExpAttack EXP.
    /// </summary>
    public bool TryUpgradeAttack(PlayerData player)
    {
        int cost = player.weaponData.reqExpAttack;
        if (player.exp < cost) return false;

        _gm.Resources.ChangeResource(player, "exp", -cost);
        player.currentAttackDice++;
        player.attackLevel++;
        AdvancePowerTrack(player);

        EventBus.Publish(new WeaponUpgradedEvent
        {
            playerId = player.id,
            upgradeType = "attack",
            newLevel = player.attackLevel
        });
        return true;
    }

    /// <summary>
    /// Try to upgrade defense dice. Costs reqExpDefense EXP.
    /// </summary>
    public bool TryUpgradeDefense(PlayerData player)
    {
        int cost = player.weaponData.reqExpDefense;
        if (player.exp < cost) return false;

        _gm.Resources.ChangeResource(player, "exp", -cost);
        player.currentDefenseDice++;
        player.defenseLevel++;
        AdvancePowerTrack(player);

        EventBus.Publish(new WeaponUpgradedEvent
        {
            playerId = player.id,
            upgradeType = "defense",
            newLevel = player.defenseLevel
        });
        return true;
    }

    private void AdvancePowerTrack(PlayerData player)
    {
        int oldPosition = player.powerTrackPosition;
        // Power track = attackLevel + defenseLevel - 1
        player.powerTrackPosition = player.attackLevel + player.defenseLevel - 1;

        int oldPower = player.weaponData.GetPowerLevel(oldPosition);
        int newPower = player.weaponData.GetPowerLevel(player.powerTrackPosition);

        if (newPower != oldPower)
        {
            EventBus.Publish(new PowerTrackAdvancedEvent
            {
                playerId = player.id,
                newPosition = player.powerTrackPosition,
                newPowerLevel = newPower
            });
        }
    }

    /// <summary>
    /// Apply round-start weapon powers for all players.
    /// Called at the beginning of each round (in NextRound phase).
    /// </summary>
    public void ApplyRoundStartPowers()
    {
        foreach (var player in _gm.Players)
        {
            ApplyRoundStartPower(player);
        }
    }

    private void ApplyRoundStartPower(PlayerData player)
    {
        string weapon = player.weaponData.weaponName;
        int powerLevel = player.GetCurrentPowerLevel();

        switch (weapon)
        {
            case "Bat":
                // Lv2: +1 EP or +1 HP (pick whichever is lower relative to max)
                if (powerLevel >= 2)
                {
                    float epRatio = (float)player.ep / player.maxEp;
                    float hpRatio = (float)player.hp / player.maxHp;
                    if (epRatio <= hpRatio)
                        _gm.Resources.ChangeResource(player, "ep", 1);
                    else
                        _gm.Resources.ChangeResource(player, "hp", 1);
                }
                break;

            case "Rifle":
                // Lv2: +2$
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "money", 2);
                break;

            case "Plasma":
                // Lv2: +2$
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "money", 2);
                break;

            case "Chain":
                // Lv2: +2 beer
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "beer", 2);
                break;

            case "Axe":
                // Lv2: +1 blood bag
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "bloodBag", 1);
                break;

            case "Whip":
                // Lv2: +2 beer
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "beer", 2);
                break;

            case "Gloves":
                // Lv2: +1 blood bag
                if (powerLevel >= 2)
                    _gm.Resources.ChangeResource(player, "bloodBag", 1);
                break;
        }
    }

    /// <summary>
    /// Check if player has ammo for Rifle/Plasma.
    /// </summary>
    public bool HasAmmo(PlayerData player)
    {
        if (!player.weaponData.requiresAmmo) return true;

        // Plasma Lv3: infinite ammo
        if (player.weaponData.weaponName == "Plasma" && player.GetCurrentPowerLevel() >= 3)
            return true;

        string ammoName = player.weaponData.ammoItemName;
        foreach (var item in player.inventory)
        {
            if (item.itemName == ammoName) return true;
        }
        return false;
    }

    /// <summary>
    /// Consume one ammo from inventory (Rifle/Plasma).
    /// </summary>
    public bool ConsumeAmmo(PlayerData player)
    {
        if (!player.weaponData.requiresAmmo) return true;

        // Plasma Lv3: infinite ammo
        if (player.weaponData.weaponName == "Plasma" && player.GetCurrentPowerLevel() >= 3)
            return true;

        string ammoName = player.weaponData.ammoItemName;
        for (int i = 0; i < player.inventory.Count; i++)
        {
            if (player.inventory[i].itemName == ammoName)
            {
                player.inventory.RemoveAt(i);
                return true;
            }
        }
        return false;
    }
}
