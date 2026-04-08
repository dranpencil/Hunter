using System.Collections.Generic;
using System.Linq;
using UnityEngine;

/// <summary>
/// Handles resource distribution, store purchases, and capacity overflow.
/// Maps from game.js distributeNormalResources() ~line 11363 and store logic ~line 10298.
/// </summary>
public class ResourceSystem
{
    private readonly GameManager _gm;

    public ResourceSystem(GameManager gm)
    {
        _gm = gm;
    }

    /// <summary>
    /// Distribute resources from all locations except Forest and Station.
    /// Rewards scale by token density per player count.
    /// </summary>
    public void DistributeNormalResources()
    {
        for (int locIdx = 0; locIdx < _gm.allLocations.Length; locIdx++)
        {
            var locData = _gm.allLocations[locIdx];
            if (locData.locationId == LocationId.Forest || locData.locationId == LocationId.Station)
                continue;
            if (locData.resourceType == ResourceType.None || locData.resourceType == ResourceType.PlayerChoice)
                continue;

            DistributeLocationResources(locData);
        }
    }

    private void DistributeLocationResources(LocationData locData)
    {
        // Get all hunters at this location, sorted by reward token (highest first for priority)
        var hunters = _gm.GetHuntersAtLocation(locData.locationId);
        if (hunters.Count == 0) return;

        // Sort by reward token descending (higher reward token = higher priority)
        hunters.Sort((a, b) => b.rewardToken.CompareTo(a.rewardToken));

        // Count total tokens at location (hunters + apprentices + dummies)
        int totalTokens = _gm.CountTokensAtLocation(locData.locationId);

        // Get reward array based on total token density
        var rewards = locData.GetRewards(_gm.PlayerCount);

        for (int i = 0; i < hunters.Count && i < rewards.Length; i++)
        {
            int amount = GetRewardByDensity(totalTokens, i, rewards);
            ApplyResource(hunters[i], locData.resourceType, amount);
        }
    }

    private int GetRewardByDensity(int totalTokens, int rank, int[] rewards)
    {
        // Clamp rank to available rewards
        if (rank >= rewards.Length) return 0;
        // Use density to determine which reward tier
        int index = Mathf.Clamp(totalTokens - 1, 0, rewards.Length - 1);
        // Players at same location share based on rank
        return rank < rewards.Length ? rewards[Mathf.Min(rank, rewards.Length - 1)] : 0;
    }

    public void ApplyResource(PlayerData player, ResourceType type, int amount)
    {
        switch (type)
        {
            case ResourceType.Money:
                ChangeResource(player, "money", amount);
                break;
            case ResourceType.Beer:
                ChangeResource(player, "beer", amount);
                break;
            case ResourceType.BloodBag:
                ChangeResource(player, "bloodBag", amount);
                break;
            case ResourceType.Exp:
                ChangeResource(player, "exp", amount);
                break;
            case ResourceType.Score:
                ChangeScore(player, amount, "plaza");
                break;
        }
    }

    public void ChangeResource(PlayerData player, string resource, int delta)
    {
        int oldValue = GetResource(player, resource);
        int max = GetResourceMax(player, resource);
        int newValue = Mathf.Clamp(oldValue + delta, 0, max);
        SetResource(player, resource, newValue);

        EventBus.Publish(new ResourceChangedEvent
        {
            playerId = player.id,
            resourceName = resource,
            oldValue = oldValue,
            newValue = newValue
        });
    }

    public void ChangeScore(PlayerData player, int amount, string source)
    {
        int oldScore = player.score;
        player.score += amount;

        switch (source)
        {
            case "monster": player.scoreFromMonsters += amount; break;
            case "milestone": player.scoreFromMilestones += amount; break;
            case "popularity": player.scoreFromPopularity += amount; break;
            case "plaza": player.scoreFromPlaza += amount; break;
            case "fakeBlood": player.scoreFromFakeBlood += amount; break;
            default: player.scoreFromOther += amount; break;
        }

        EventBus.Publish(new ScoreChangedEvent
        {
            playerId = player.id,
            oldScore = oldScore,
            newScore = player.score,
            source = source
        });
    }

    public bool TryPurchaseItem(PlayerData player, ItemData item)
    {
        int effectivePrice = GetEffectivePrice(player, item);
        if (player.money < effectivePrice) return false;
        if (item.size > player.GetRemainingCapacity()) return false;

        ChangeResource(player, "money", -effectivePrice);
        player.inventory.Add(item);

        EventBus.Publish(new ItemPurchasedEvent { playerId = player.id, item = item });
        return true;
    }

    public int GetEffectivePrice(PlayerData player, ItemData item)
    {
        int price = item.price;
        // Rifle Lv3 power: store prices -1$
        if (player.weaponData.weaponName == "Rifle" && player.GetCurrentPowerLevel() >= 3)
        {
            price = Mathf.Max(1, price - 1);
        }
        return price;
    }

    public bool IsOverCapacity(PlayerData player)
    {
        return player.GetInventoryUsedCapacity() > player.maxInventoryCapacity;
    }

    public int GetResource(PlayerData player, string resource)
    {
        switch (resource)
        {
            case "money": return player.money;
            case "exp": return player.exp;
            case "hp": return player.hp;
            case "ep": return player.ep;
            case "beer": return player.beer;
            case "bloodBag": return player.bloodBag;
            default: return 0;
        }
    }

    private int GetResourceMax(PlayerData player, string resource)
    {
        switch (resource)
        {
            case "money": return player.maxMoney;
            case "exp": return player.maxExp;
            case "hp": return player.maxHp;
            case "ep": return player.maxEp;
            default: return 999;
        }
    }

    private void SetResource(PlayerData player, string resource, int value)
    {
        switch (resource)
        {
            case "money": player.money = value; break;
            case "exp": player.exp = value; break;
            case "hp": player.hp = value; break;
            case "ep": player.ep = value; break;
            case "beer": player.beer = value; break;
            case "bloodBag": player.bloodBag = value; break;
        }
    }
}
