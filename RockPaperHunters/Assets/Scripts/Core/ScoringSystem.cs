using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Handles final scoring, rankings, milestones, and win condition.
/// </summary>
public class ScoringSystem
{
    private readonly GameManager _gm;

    public ScoringSystem(GameManager gm)
    {
        _gm = gm;
    }

    /// <summary>
    /// Check and award HP/EP milestones for a player.
    /// </summary>
    public void CheckMilestones(PlayerData player)
    {
        // EP milestones
        if (player.maxEp >= 8 && !player.ep8Milestone)
        {
            player.ep8Milestone = true;
            _gm.Resources.ChangeScore(player, _gm.config.ep8MilestonePoints, "milestone");
        }
        if (player.maxEp >= 10 && !player.ep10Milestone)
        {
            player.ep10Milestone = true;
            _gm.Resources.ChangeScore(player, _gm.config.ep10MilestonePoints, "milestone");
        }

        // HP milestones
        if (player.maxHp >= 6 && !player.hp6Milestone)
        {
            player.hp6Milestone = true;
            _gm.Resources.ChangeScore(player, _gm.config.hp6MilestonePoints, "milestone");
        }
        if (player.maxHp >= 8 && !player.hp8Milestone)
        {
            player.hp8Milestone = true;
            _gm.Resources.ChangeScore(player, _gm.config.hp8MilestonePoints, "milestone");
        }
        if (player.maxHp >= 10 && !player.hp10Milestone)
        {
            player.hp10Milestone = true;
            _gm.Resources.ChangeScore(player, _gm.config.hp10MilestonePoints, "milestone");
        }
    }

    /// <summary>
    /// Try to upgrade max EP using beer. Requires 4 beer per upgrade.
    /// </summary>
    public bool TryUpgradeEP(PlayerData player)
    {
        if (player.beer <= 0) return false;
        if (player.maxEp >= 10) return false;

        _gm.Resources.ChangeResource(player, "beer", -1);
        player.epUpgradeProgress++;

        if (player.epUpgradeProgress >= _gm.config.beerForEpUpgrade)
        {
            player.epUpgradeProgress = 0;
            player.maxEp += 1;
            _gm.Resources.ChangeResource(player, "ep", 1); // Gain 1 EP on upgrade

            EventBus.Publish(new MaxStatUpgradedEvent
            {
                playerId = player.id,
                stat = "ep",
                newMax = player.maxEp
            });

            CheckMilestones(player);
        }
        return true;
    }

    /// <summary>
    /// Try to upgrade max HP using blood bags. Requires 3 blood bags per upgrade.
    /// </summary>
    public bool TryUpgradeHP(PlayerData player)
    {
        if (player.bloodBag <= 0) return false;
        if (player.maxHp >= 10) return false;

        _gm.Resources.ChangeResource(player, "bloodBag", -1);
        player.hpUpgradeProgress++;

        if (player.hpUpgradeProgress >= _gm.config.bloodBagForHpUpgrade)
        {
            player.hpUpgradeProgress = 0;
            player.maxHp += 1;
            _gm.Resources.ChangeResource(player, "hp", 1); // Gain 1 HP on upgrade

            EventBus.Publish(new MaxStatUpgradedEvent
            {
                playerId = player.id,
                stat = "hp",
                newMax = player.maxHp
            });

            CheckMilestones(player);
        }
        return true;
    }

    /// <summary>
    /// Restore HP using blood bags from inventory.
    /// </summary>
    public bool TryRestoreHP(PlayerData player)
    {
        if (player.hp >= player.maxHp) return false;

        // Find a blood bag in inventory
        for (int i = 0; i < player.inventory.Count; i++)
        {
            if (player.inventory[i].effectType == ItemEffectType.BloodBag)
            {
                player.inventory.RemoveAt(i);
                _gm.Resources.ChangeResource(player, "hp", 1);
                return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Restore EP using beer from inventory.
    /// </summary>
    public bool TryRestoreEP(PlayerData player)
    {
        if (player.ep >= player.maxEp) return false;

        // Find a beer in inventory
        for (int i = 0; i < player.inventory.Count; i++)
        {
            if (player.inventory[i].effectType == ItemEffectType.Beer)
            {
                player.inventory.RemoveAt(i);
                _gm.Resources.ChangeResource(player, "ep", 1);
                return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Get ranked results at game end.
    /// Primary: highest score. Tiebreaker: popularity track level.
    /// </summary>
    public List<PlayerRanking> GetRankings()
    {
        var rankings = new List<PlayerRanking>();
        foreach (var p in _gm.Players)
        {
            rankings.Add(new PlayerRanking
            {
                playerId = p.id,
                playerName = p.playerName,
                weaponName = p.weaponData.weaponName,
                score = p.score,
                popularityLevel = p.pointToken
            });
        }

        // Sort: highest score first, then highest popularity
        rankings.Sort((a, b) =>
        {
            int cmp = b.score.CompareTo(a.score);
            if (cmp != 0) return cmp;
            return b.popularityLevel.CompareTo(a.popularityLevel);
        });

        // Assign ranks (shared ranks for ties)
        for (int i = 0; i < rankings.Count; i++)
        {
            if (i == 0)
            {
                rankings[i].rank = 1;
            }
            else if (rankings[i].score == rankings[i - 1].score
                     && rankings[i].popularityLevel == rankings[i - 1].popularityLevel)
            {
                rankings[i].rank = rankings[i - 1].rank; // Shared rank
            }
            else
            {
                rankings[i].rank = i + 1;
            }
        }

        return rankings;
    }
}

public class PlayerRanking
{
    public int playerId;
    public string playerName;
    public string weaponName;
    public int score;
    public int popularityLevel;
    public int rank;
}
