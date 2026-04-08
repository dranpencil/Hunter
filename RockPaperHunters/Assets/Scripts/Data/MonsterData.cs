using UnityEngine;

[CreateAssetMenu(fileName = "NewMonster", menuName = "RockPaperHunters/Monster Data")]
public class MonsterData : ScriptableObject
{
    [Header("Identity")]
    public int monsterId;
    public string monsterName;
    public Sprite sprite;

    [Header("Stats")]
    public int level; // 1, 2, or 3
    public int hp;
    public int att;

    [Header("Rewards")]
    public int moneyReward;
    public int energyReward;
    public int bloodReward;
    public int points;

    [Header("Special Effect")]
    public MonsterEffectType effectType;
    [TextArea] public string effectDescription;

    /// <summary>
    /// EP cost to fight this monster's level: Lv1=2, Lv2=3, Lv3=4
    /// </summary>
    public int GetEPCost()
    {
        return level + 1;
    }
}

public enum MonsterEffectType
{
    None,                           // 無
    AttackUpAtHalfHP,              // 血減半時，攻擊力+1
    StealMoney,                     // 偷走玩家2金幣
    DeathDamageAll,                // 死亡時，玩家及在森林裡的玩家-1血
    NoExpFromDamage,               // 玩家受傷無法獲得經驗
    DamageCap2,                    // 玩家無法一次給予怪獸超過2點傷害
    FirstStrikeDefense1,           // 玩家防禦力1以上先攻
    OtherMonstersPlus1HP,          // 這回合其他怪獸+1血
    DamageNonForestPlayers1HP,     // 不在森林的玩家-1血
    DrainEPPerAttack,              // 每次玩家攻擊-1體力
    HealAfterSurviving,           // 遭受攻擊後若沒有死亡+1血
    ImmuneToGrenades,             // 不怕手榴彈
    DamageCap4,                    // 玩家無法一次給予怪獸超過4點傷害
    ImmuneToAllExplosives,        // 不怕手榴彈、炸彈、炸藥
    FirstStrikeDefense3,           // 玩家防禦力3以上先攻
    FirstStrikeDefense2,           // 玩家防禦力2以上先攻
    ExtraTamingCost,              // 需要+1體力收服
    MaxExpFromDamage3,            // 玩家受傷最多獲得3經驗
    ReduceNonForestExp,           // 不在森林的玩家-2經驗
    DamageNonForestPlayers2HP,     // 不在森林的玩家-2血
    ReduceNonForestPoints,        // 不在森林的玩家-2分
    DamageCap6,                    // 玩家無法一次給予怪獸超過6點傷害
    FirstStrikeDefense4,           // 玩家防禦力4以上先攻
    MaxExpFromDamage4,            // 玩家受傷最多獲得4經驗
}
