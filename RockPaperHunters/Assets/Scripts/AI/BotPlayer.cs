/// <summary>
/// Main bot controller. Coordinates location selection, shopping, and combat AI.
/// Maps from game.js BotPlayer class (lines 2-1048).
/// </summary>
public class BotPlayer
{
    public int PlayerId { get; private set; }
    public BotStage Stage { get; private set; }

    private readonly BotLocationSelector _locationSelector;
    private readonly BotShoppingAI _shoppingAI;
    private readonly BotCombatAI _combatAI;

    public BotPlayer(int playerId, GameManager gm)
    {
        PlayerId = playerId;
        Stage = BotStage.Stage1;
        _locationSelector = new BotLocationSelector(playerId, gm);
        _shoppingAI = new BotShoppingAI(playerId, gm);
        _combatAI = new BotCombatAI(playerId, gm);
    }

    public PlayerData GetPlayerData(GameManager gm)
    {
        return gm.Players[PlayerId];
    }

    /// <summary>
    /// Update bot stage based on monsters defeated.
    /// Stage 1: before 2nd Lv1 kill. Stage 2: before 2nd Lv2 kill. Stage 3: after 2nd Lv2 kill.
    /// </summary>
    public void UpdateStage(PlayerData player)
    {
        if (player.monstersDefeated.level2 >= 2)
            Stage = BotStage.Stage3;
        else if (player.monstersDefeated.level1 >= 2)
            Stage = BotStage.Stage2;
        else
            Stage = BotStage.Stage1;
    }

    public LocationId SelectHunterLocation(GameManager gm)
    {
        return _locationSelector.SelectHunterLocation(gm);
    }

    public LocationId SelectApprenticeLocation(GameManager gm)
    {
        return _locationSelector.SelectApprenticeLocation(gm);
    }

    public void DoShopping(GameManager gm)
    {
        _shoppingAI.DoShopping(gm);
    }

    public BotBattleDecision MakeBattleDecision(GameManager gm, BattleState state)
    {
        return _combatAI.MakeBattleDecision(gm, state);
    }
}

public enum BotStage
{
    Stage1, // Before 2nd level 1 monster defeat
    Stage2, // Before 2nd level 2 monster defeat
    Stage3  // After 2nd level 2 monster defeat
}

public class BattleState
{
    public int monsterCurrentHP;
    public int monsterATT;
    public MonsterEffectType monsterEffect;
    public int monsterLevel;
    public int playerCurrentHP;
    public int playerCurrentEP;
    public bool canTame;
}

public class BotBattleDecision
{
    public BotBattleAction action;
    public ItemData itemToUse;
    public bool useBeerForEP;
    public bool useDoubleDamage; // Knife power
}

public enum BotBattleAction
{
    Attack,
    Tame,
    UseItem,
    Defend
}
