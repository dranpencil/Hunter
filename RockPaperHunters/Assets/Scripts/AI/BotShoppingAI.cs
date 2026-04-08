using UnityEngine;

/// <summary>
/// Bot purchasing logic: priority-based item buying.
/// Maps from game.js bot store logic.
/// </summary>
public class BotShoppingAI
{
    private readonly int _playerId;
    private readonly GameManager _gm;

    public BotShoppingAI(int playerId, GameManager gm)
    {
        _playerId = playerId;
        _gm = gm;
    }

    public void DoShopping(GameManager gm)
    {
        var player = gm.Players[_playerId];

        // Priority buying order:
        // 1. Ammo (if Rifle/Plasma and need ammo)
        // 2. Beer (if EP low)
        // 3. Blood Bags (if HP low)
        // 4. Combat items (Dynamite > Bomb > Grenade) if planning forest
        // 5. Fake Blood (always good if can afford)

        bool needsAmmo = player.weaponData.requiresAmmo && !gm.Weapons.HasAmmo(player);
        bool lowEP = player.ep <= 3;
        bool lowHP = player.hp <= player.maxHp / 2;

        // Buy ammo first
        if (needsAmmo)
        {
            TryBuy(gm, player, player.weaponData.ammoItemName);
            TryBuy(gm, player, player.weaponData.ammoItemName);
            TryBuy(gm, player, player.weaponData.ammoItemName);
        }

        // Buy recovery items
        if (lowEP)
        {
            TryBuy(gm, player, "Beer");
            TryBuy(gm, player, "Beer");
        }

        if (lowHP)
        {
            TryBuy(gm, player, "Blood Bag");
            TryBuy(gm, player, "Blood Bag");
        }

        // Buy combat items based on remaining budget
        if (player.money >= 6 && player.GetRemainingCapacity() >= 4)
            TryBuy(gm, player, "Dynamite");
        else if (player.money >= 4 && player.GetRemainingCapacity() >= 3)
            TryBuy(gm, player, "Bomb");
        else if (player.money >= 2 && player.GetRemainingCapacity() >= 2)
            TryBuy(gm, player, "Grenade");

        // Fake Blood if affordable
        if (player.money >= 2 && player.GetRemainingCapacity() >= 2)
            TryBuy(gm, player, "Fake Blood");

        // Mark as finished
        gm.PlayerCompletionStatus[_playerId] = true;
        EventBus.Publish(new PlayerFinishedShoppingEvent { playerId = _playerId });
    }

    private bool TryBuy(GameManager gm, PlayerData player, string itemName)
    {
        var item = gm.GetItemByName(itemName);
        if (item == null) return false;
        return gm.Resources.TryPurchaseItem(player, item);
    }
}
