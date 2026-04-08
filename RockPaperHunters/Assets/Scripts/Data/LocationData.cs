using UnityEngine;

[CreateAssetMenu(fileName = "NewLocation", menuName = "RockPaperHunters/Location Data")]
public class LocationData : ScriptableObject
{
    public LocationId locationId;
    public string locationName;
    public ResourceType resourceType;
    public Sprite backgroundSprite;
    public Sprite iconSprite;

    [Header("Rewards by Player Count (index = token density rank)")]
    [Tooltip("Rewards for 2-player games, ordered by density rank")]
    public int[] rewards2Players = new int[2]; // [6,4] or [4,2]
    [Tooltip("Rewards for 3-player games")]
    public int[] rewards3Players = new int[3]; // [7,5,4] or similar
    [Tooltip("Rewards for 4-player games")]
    public int[] rewards4Players = new int[4]; // [8,6,5,4] or similar

    public int[] GetRewards(int playerCount)
    {
        switch (playerCount)
        {
            case 2: return rewards2Players;
            case 3: return rewards3Players;
            case 4: return rewards4Players;
            default: return rewards2Players;
        }
    }
}

public enum ResourceType
{
    None,
    Money,
    Beer,
    BloodBag,
    Exp,
    Score,
    PlayerChoice // Station
}
