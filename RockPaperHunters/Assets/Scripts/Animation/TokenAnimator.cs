using System;
using UnityEngine;
using DG.Tweening;

/// <summary>
/// Smooth token movement between board locations using DOTween.
/// Attach to hunter/apprentice token GameObjects.
/// </summary>
public class TokenAnimator : MonoBehaviour
{
    [SerializeField] private float arcHeight = 0.3f;

    private void OnDestroy()
    {
        transform.DOKill();
    }

    /// <summary>
    /// Moves the token to the target position with a slight upward arc during transit.
    /// </summary>
    /// <param name="target">Destination transform.</param>
    /// <param name="duration">Movement duration in seconds.</param>
    /// <param name="onComplete">Callback when movement finishes.</param>
    public void MoveToLocation(Transform target, float duration, Action onComplete)
    {
        if (target == null)
        {
            onComplete?.Invoke();
            return;
        }

        transform.DOKill();

        Sequence seq = DOTween.Sequence();

        // Move to target position
        seq.Append(transform.DOMove(target.position, duration).SetEase(Ease.InOutCubic));

        // Arc: punch Y upward during the move for a hop effect
        seq.Join(transform.DOPunchPosition(new Vector3(0f, arcHeight, 0f), duration, vibrato: 1, elasticity: 0f)
            .SetEase(Ease.OutQuad));

        seq.OnComplete(() => onComplete?.Invoke());
    }

    /// <summary>
    /// Place animation: scales from 0 to 1 with a bounce ease.
    /// </summary>
    public void PlayPlaceAnimation()
    {
        transform.DOKill();
        transform.localScale = Vector3.zero;
        transform.DOScale(1f, 0.35f).SetEase(Ease.OutBack);
    }

    /// <summary>
    /// Remove animation: scales to 0, then calls onComplete.
    /// </summary>
    /// <param name="onComplete">Callback when the animation finishes.</param>
    public void PlayRemoveAnimation(Action onComplete)
    {
        transform.DOKill();
        transform.DOScale(0f, 0.25f)
            .SetEase(Ease.InBack)
            .OnComplete(() => onComplete?.Invoke());
    }
}
