using System;
using UnityEngine;
using UnityEngine.UI;
using DG.Tweening;

/// <summary>
/// Animated dice face cycling using DOTween.
/// Rapidly cycles through random dice faces before landing on the final result.
/// </summary>
public class DiceAnimator : MonoBehaviour
{
    [SerializeField] private Image diceImage;
    [SerializeField] private Sprite[] diceFaces; // 6 sprites: index 0 = face 1, index 5 = face 6

    private Sequence rollSequence;

    private void Awake()
    {
        if (diceImage == null)
            diceImage = GetComponent<Image>();
    }

    private void OnDestroy()
    {
        if (rollSequence != null && rollSequence.IsActive())
            rollSequence.Kill();
        transform.DOKill();
    }

    /// <summary>
    /// Animates a dice roll: rapidly cycles through random faces for the given duration,
    /// then lands on the finalValue sprite with a scale punch.
    /// </summary>
    /// <param name="finalValue">Dice result (1-6) to land on.</param>
    /// <param name="duration">Total animation duration in seconds.</param>
    /// <param name="onComplete">Callback when the animation finishes.</param>
    public void AnimateRoll(int finalValue, float duration, Action onComplete)
    {
        if (rollSequence != null && rollSequence.IsActive())
            rollSequence.Kill();
        transform.DOKill();

        int clampedValue = Mathf.Clamp(finalValue, 1, 6);

        if (diceImage == null || diceFaces == null || diceFaces.Length < 6)
        {
            // No sprites to animate; just invoke callback
            onComplete?.Invoke();
            return;
        }

        rollSequence = DOTween.Sequence();

        // Calculate how many face cycles fit in the duration (each cycle = 0.05s)
        float cycleInterval = 0.05f;
        int cycleCount = Mathf.Max(1, Mathf.FloorToInt(duration / cycleInterval));

        // Rapid cycling phase: swap to random faces
        for (int i = 0; i < cycleCount; i++)
        {
            int capturedIndex = i;
            rollSequence.AppendCallback(() =>
            {
                int randomFace = UnityEngine.Random.Range(0, 6);
                diceImage.sprite = diceFaces[randomFace];
            });
            rollSequence.AppendInterval(cycleInterval);

            // Add slight rotation jitter during cycling
            if (i % 3 == 0)
            {
                float randomAngle = UnityEngine.Random.Range(-15f, 15f);
                rollSequence.Join(transform.DOLocalRotate(new Vector3(0f, 0f, randomAngle), cycleInterval)
                    .SetEase(Ease.Linear));
            }
        }

        // Landing: set final face
        rollSequence.AppendCallback(() =>
        {
            diceImage.sprite = diceFaces[clampedValue - 1];
        });

        // Reset rotation
        rollSequence.Append(transform.DOLocalRotate(Vector3.zero, 0.1f).SetEase(Ease.OutBack));

        // Scale punch on landing
        rollSequence.Append(transform.DOPunchScale(new Vector3(0.2f, 0.2f, 0f), 0.2f, vibrato: 5, elasticity: 0.5f));

        rollSequence.OnComplete(() => onComplete?.Invoke());
    }

    /// <summary>
    /// Animates multiple dice with staggered starts (0.1s apart).
    /// All dice roll for the given duration, then the final callback fires after the last one finishes.
    /// </summary>
    public static void AnimateMultipleDice(DiceAnimator[] dice, int[] results, float duration, Action onComplete)
    {
        if (dice == null || dice.Length == 0)
        {
            onComplete?.Invoke();
            return;
        }

        int completedCount = 0;
        int totalDice = Mathf.Min(dice.Length, results.Length);

        for (int i = 0; i < totalDice; i++)
        {
            int index = i;
            float staggerDelay = i * 0.1f;

            DOVirtual.DelayedCall(staggerDelay, () =>
            {
                dice[index].AnimateRoll(results[index], duration, () =>
                {
                    completedCount++;
                    if (completedCount >= totalDice)
                    {
                        onComplete?.Invoke();
                    }
                });
            });
        }
    }
}
