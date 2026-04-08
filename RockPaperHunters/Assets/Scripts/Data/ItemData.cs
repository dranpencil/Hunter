using UnityEngine;

[CreateAssetMenu(fileName = "NewItem", menuName = "RockPaperHunters/Item Data")]
public class ItemData : ScriptableObject
{
    public string itemName;
    public int size;
    public int price;
    public ItemEffectType effectType;
    [TextArea] public string effectDescription;
    public Sprite icon;
}

public enum ItemEffectType
{
    Beer,       // Gain 1 EP
    BloodBag,   // Gain 1 HP
    Grenade,    // 1 damage to monster
    Bomb,       // 2 damage to monster
    Dynamite,   // 3 damage to monster
    FakeBlood,  // Bonus points = monster level
    Bullets,    // Ammo for Rifle
    Batteries   // Ammo for Plasma
}
