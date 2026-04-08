using UnityEngine;

[CreateAssetMenu(fileName = "NewBotTable", menuName = "RockPaperHunters/Bot Decision Table")]
public class BotDecisionTable : ScriptableObject
{
    [Header("Table Identity")]
    public string tableName; // e.g. "Dojo Lv1", "Forest Lv2"
    public BotTableType tableType;

    [Header("Lookup Grid (6 rows x 7 cols)")]
    [Tooltip("Rows = attack dice (2-7), Cols = defense dice (0-6). Flattened row-major.")]
    public int[] grid = new int[42]; // 6 rows * 7 cols

    /// <summary>
    /// Look up value by attack dice count (2-7) and defense dice count (0-6).
    /// Returns the entry bonus/penalty for location selection.
    /// </summary>
    public int Lookup(int attackDice, int defenseDice)
    {
        int row = Mathf.Clamp(attackDice - 2, 0, 5);
        int col = Mathf.Clamp(defenseDice, 0, 6);
        return grid[row * 7 + col];
    }
}

public enum BotTableType
{
    DojoLv1,
    DojoLv2,
    DojoLv3,
    ForestLv1,
    ForestLv2,
    ForestLv3
}
