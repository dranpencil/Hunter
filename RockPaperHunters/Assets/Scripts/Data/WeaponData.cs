using UnityEngine;

[CreateAssetMenu(fileName = "NewWeapon", menuName = "RockPaperHunters/Weapon Data")]
public class WeaponData : ScriptableObject
{
    [Header("Identity")]
    public string weaponName;
    public int priority;
    public Sprite icon;
    public Sprite characterSprite;

    [Header("Stats")]
    public int reqExpAttack;
    public int reqExpDefense;
    public int capacity;
    public int initialMoney;
    public int attackDice;
    public int defenseDice;

    [Header("Damage Array (dice faces 1-6)")]
    public int[] damageArray = new int[6];

    [Header("Preferred Location")]
    public LocationId preferredLocation;

    [Header("Ammunition (Rifle/Plasma only)")]
    public bool requiresAmmo;
    public string ammoItemName; // "Bullets" or "Batteries"

    [Header("Power Descriptions")]
    [TextArea] public string lv1PowerDescription;
    [TextArea] public string lv2PowerDescription;
    [TextArea] public string lv3PowerDescription;

    /// <summary>
    /// Power track positions where each level unlocks: Lv1=1, Lv2=3, Lv3=7
    /// </summary>
    public static readonly int[] PowerTrackThresholds = { 1, 3, 7 };

    public int GetDamage(int diceFace)
    {
        if (diceFace < 1 || diceFace > 6) return 0;
        return damageArray[diceFace - 1];
    }

    public int GetPowerLevel(int trackPosition)
    {
        if (trackPosition >= 7) return 3;
        if (trackPosition >= 3) return 2;
        if (trackPosition >= 1) return 1;
        return 0;
    }
}

public enum LocationId
{
    WorkSite = 1,
    Bar = 2,
    Station = 3,
    Hospital = 4,
    Dojo = 5,
    Plaza = 6,
    Forest = 7
}
