using UnityEngine;

[CreateAssetMenu(fileName = "GameConfig", menuName = "RockPaperHunters/Game Config")]
public class GameConfig : ScriptableObject
{
    [Header("Win Condition")]
    public int winScore = 50;

    [Header("Resource Caps")]
    public int maxMoney = 15;
    public int maxExp = 15;

    [Header("Starting Stats")]
    public int baseHp = 4;
    public int baseEp = 6;
    public int baseExp = 3;

    [Header("Max Stats")]
    public int maxHp = 10;
    public int maxEp = 10;

    [Header("Upgrade Requirements")]
    public int beerForEpUpgrade = 4;
    public int bloodBagForHpUpgrade = 3;

    [Header("Popularity Track")]
    public int maxPopularityLevel = 5;

    [Header("Milestones")]
    public int ep8MilestonePoints = 2;
    public int ep10MilestonePoints = 4;
    public int hp6MilestonePoints = 2;
    public int hp8MilestonePoints = 3;
    public int hp10MilestonePoints = 4;

    [Header("Plaza Scoring")]
    public int plazaAlonePoints = 3;

    [Header("Dummy Token Positions by Player Count")]
    [Tooltip("2 players: dummy tokens at Bar(2) and Dojo(5)")]
    public LocationId[] dummyPositions2Players = { LocationId.Bar, LocationId.Dojo };
    [Tooltip("3 players: dummy token at Station(3)")]
    public LocationId[] dummyPositions3Players = { LocationId.Station };

    [Header("Resource Distribution Scales")]
    [Tooltip("Reward amounts by density rank for 2 players")]
    public int[] rewardScale2Players = { 6, 4 };
    [Tooltip("Reward amounts by density rank for 3 players")]
    public int[] rewardScale3Players = { 7, 5, 4 };
    [Tooltip("Reward amounts by density rank for 4 players")]
    public int[] rewardScale4Players = { 8, 6, 5, 4 };

    [Header("EP Cost Per Monster Level")]
    public int epCostLevel1 = 2;
    public int epCostLevel2 = 3;
    public int epCostLevel3 = 4;

    [Header("Taming")]
    public int baseTameHPThreshold = 3; // Chain Lv1 power

    [Header("Phase Timers (Online)")]
    public int defaultPhaseTimeSeconds = 60;
    public int kickVoteTimeSeconds = 30;
}
