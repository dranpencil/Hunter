using UnityEngine;

/// <summary>
/// Manages point token and reward token movement on the popularity track.
/// Maps from game.js popularity logic ~line 7207-7340.
/// </summary>
public class PopularityTrack
{
    private readonly GameManager _gm;

    public PopularityTrack(GameManager gm)
    {
        _gm = gm;
    }

    /// <summary>
    /// Update popularity tokens after token placement is revealed.
    /// Hunter alone at location -> reward token moves up.
    /// Hunter crowded (2+ hunters) -> reward token moves down.
    /// Forest -> no change.
    /// Knife Lv1+ is exempt from crowd penalty.
    /// </summary>
    public void UpdatePopularity(PlayerData player)
    {
        if (player.hunterLocation == null) return;
        LocationId loc = player.hunterLocation.Value;

        // Forest = no change
        if (loc == LocationId.Forest) return;

        var huntersAtLoc = _gm.GetHuntersAtLocation(loc);
        bool isAlone = huntersAtLoc.Count == 1;

        if (isAlone)
        {
            MoveRewardTokenUp(player);
            player.hunterAloneCount++;
        }
        else
        {
            // Knife Lv1+ is exempt from crowd penalty
            if (player.weaponData.weaponName == "Knife" && player.GetCurrentPowerLevel() >= 1)
                return;

            MoveRewardTokenDown(player);
        }
    }

    private void MoveRewardTokenUp(PlayerData player)
    {
        int oldReward = player.rewardToken;
        int oldPoint = player.pointToken;

        player.rewardToken = Mathf.Min(player.rewardToken + 1, _gm.config.maxPopularityLevel);

        // Point token follows reward token upward (never goes down)
        if (player.rewardToken > player.pointToken)
        {
            player.pointToken = player.rewardToken;

            // Score points for each new level reached
            if (!player.levelReached[player.pointToken])
            {
                player.levelReached[player.pointToken] = true;
                _gm.Resources.ChangeScore(player, player.pointToken, "popularity");
            }
        }

        if (oldReward != player.rewardToken || oldPoint != player.pointToken)
        {
            EventBus.Publish(new PopularityChangedEvent
            {
                playerId = player.id,
                oldPointToken = oldPoint,
                newPointToken = player.pointToken,
                oldRewardToken = oldReward,
                newRewardToken = player.rewardToken
            });
        }
    }

    private void MoveRewardTokenDown(PlayerData player)
    {
        int oldReward = player.rewardToken;
        player.rewardToken = Mathf.Max(player.rewardToken - 1, 0);

        if (oldReward != player.rewardToken)
        {
            EventBus.Publish(new PopularityChangedEvent
            {
                playerId = player.id,
                oldPointToken = player.pointToken,
                newPointToken = player.pointToken,
                oldRewardToken = oldReward,
                newRewardToken = player.rewardToken
            });
        }
    }

    /// <summary>
    /// Award Plaza bonus: 3 points if hunter is alone at Plaza.
    /// Also applies to Knife Lv2+: +2 points if alone at any location.
    /// </summary>
    public void CheckPlazaAndAloneBonuses(PlayerData player)
    {
        if (player.hunterLocation == null) return;
        LocationId loc = player.hunterLocation.Value;

        var huntersAtLoc = _gm.GetHuntersAtLocation(loc);
        bool isAlone = huntersAtLoc.Count == 1;

        // Plaza alone bonus
        if (loc == LocationId.Plaza && isAlone)
        {
            _gm.Resources.ChangeScore(player, _gm.config.plazaAlonePoints, "plaza");
        }

        // Knife Lv2/Lv3: +2 points if alone at any location (not Forest)
        if (player.weaponData.weaponName == "Knife" && player.GetCurrentPowerLevel() >= 2
            && isAlone && loc != LocationId.Forest)
        {
            _gm.Resources.ChangeScore(player, 2, "other");
        }

        // Katana/Bow/Sword Lv2: +2 EXP if alone at any location (not Forest)
        string weapon = player.weaponData.weaponName;
        if ((weapon == "Katana" || weapon == "Bow" || weapon == "Sword")
            && player.GetCurrentPowerLevel() >= 2
            && isAlone && loc != LocationId.Forest)
        {
            _gm.Resources.ChangeResource(player, "exp", 2);
        }
    }
}
