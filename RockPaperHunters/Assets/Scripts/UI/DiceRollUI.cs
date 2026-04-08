using UnityEngine;
using System;

/// <summary>
/// Animated dice display for battle phase.
/// </summary>
public class DiceRollUI : MonoBehaviour
{
    [Header("Dice Visuals")]
    [SerializeField] private Transform[] diceSlots;
    [SerializeField] private Sprite[] diceFaceSprites; // index 0-5 for faces 1-6

    [Header("Animation")]
    [SerializeField] private float rollDuration = 0.5f;

    public void ShowDiceRoll(int[] results, Action onComplete)
    {
        // TODO: Animate all dice rolling, then show final results and invoke callback
    }

    public void AnimateSingleDie(int index, int result)
    {
        // TODO: Animate one die at the given slot index to land on result
    }
}
