using System;
using UnityEngine;
using DG.Tweening;

/// <summary>
/// Controls character sprite animations using Animator-based triggers with DOTween fallback.
/// Attach to a character GameObject with a SpriteRenderer.
/// </summary>
public class CharacterAnimator : MonoBehaviour
{
    [SerializeField] private Animator animator;
    [SerializeField] private SpriteRenderer spriteRenderer;

    private Vector3 originalPosition;
    private Color originalColor = Color.white;
    private Tweener idleTween;

    private void Awake()
    {
        if (spriteRenderer == null)
            spriteRenderer = GetComponent<SpriteRenderer>();
        if (animator == null)
            animator = GetComponent<Animator>();

        originalPosition = transform.localPosition;
        if (spriteRenderer != null)
            originalColor = spriteRenderer.color;
    }

    private void OnDestroy()
    {
        KillIdleTween();
        transform.DOKill();
        if (spriteRenderer != null)
            spriteRenderer.DOKill();
    }

    private void KillIdleTween()
    {
        if (idleTween != null && idleTween.IsActive())
        {
            idleTween.Kill();
            idleTween = null;
        }
    }

    /// <summary>
    /// Gentle up/down bob, looping forever with a 1-second cycle.
    /// </summary>
    public void PlayIdle()
    {
        KillIdleTween();
        transform.localPosition = originalPosition;

        if (animator != null && HasAnimatorState("Idle"))
        {
            animator.SetTrigger("Idle");
        }

        idleTween = transform.DOLocalMoveY(originalPosition.y + 0.1f, 0.5f)
            .SetEase(Ease.InOutSine)
            .SetLoops(-1, LoopType.Yoyo);
    }

    /// <summary>
    /// Quick forward lunge (+0.5 X in 0.15s), return (0.1s), white flash, then callback.
    /// </summary>
    public void PlayAttack(Action onComplete)
    {
        KillIdleTween();
        transform.DOKill();
        if (spriteRenderer != null) spriteRenderer.DOKill();

        if (animator != null && HasAnimatorState("Attack"))
        {
            animator.SetTrigger("Attack");
        }

        Sequence seq = DOTween.Sequence();

        // Lunge forward
        seq.Append(transform.DOLocalMoveX(originalPosition.x + 0.5f, 0.15f).SetEase(Ease.OutQuad));

        // White flash at peak of lunge
        if (spriteRenderer != null)
        {
            seq.AppendCallback(() => spriteRenderer.color = Color.white);
            seq.AppendInterval(0.05f);
        }

        // Return to original position
        seq.Append(transform.DOLocalMove(originalPosition, 0.1f).SetEase(Ease.InQuad));

        // Restore color
        if (spriteRenderer != null)
        {
            seq.AppendCallback(() => spriteRenderer.color = originalColor);
        }

        seq.OnComplete(() =>
        {
            PlayIdle();
            onComplete?.Invoke();
        });
    }

    /// <summary>
    /// Red flash (color tween to red and back over 0.3s) with position shake.
    /// </summary>
    public void PlayHit()
    {
        if (animator != null && HasAnimatorState("Hit"))
        {
            animator.SetTrigger("Hit");
        }

        // Shake position
        transform.DOShakePosition(0.3f, strength: 0.15f, vibrato: 20, randomness: 90, snapping: false, fadeOut: true);

        // Red flash
        if (spriteRenderer != null)
        {
            spriteRenderer.DOKill();
            Sequence flashSeq = DOTween.Sequence();
            flashSeq.Append(spriteRenderer.DOColor(Color.red, 0.1f));
            flashSeq.Append(spriteRenderer.DOColor(originalColor, 0.2f));
        }
    }

    /// <summary>
    /// Scale pulse up to 1.2x then back, with a slight upward bounce.
    /// </summary>
    public void PlayVictory()
    {
        KillIdleTween();
        transform.DOKill();

        if (animator != null && HasAnimatorState("Victory"))
        {
            animator.SetTrigger("Victory");
        }

        Sequence seq = DOTween.Sequence();

        // Scale pulse
        seq.Append(transform.DOScale(1.2f, 0.2f).SetEase(Ease.OutBack));
        seq.Append(transform.DOScale(1f, 0.2f).SetEase(Ease.InOutSine));

        // Slight upward bounce
        seq.Join(transform.DOLocalMoveY(originalPosition.y + 0.3f, 0.2f).SetEase(Ease.OutQuad));
        seq.Append(transform.DOLocalMoveY(originalPosition.y, 0.2f).SetEase(Ease.InBounce));
    }

    /// <summary>
    /// Fade alpha to 0.3 and droop slightly downward.
    /// </summary>
    public void PlayDefeat()
    {
        KillIdleTween();
        transform.DOKill();

        if (animator != null && HasAnimatorState("Defeat"))
        {
            animator.SetTrigger("Defeat");
        }

        if (spriteRenderer != null)
        {
            spriteRenderer.DOKill();
            Color fadedColor = originalColor;
            fadedColor.a = 0.3f;
            spriteRenderer.DOColor(fadedColor, 0.4f);
        }

        transform.DOLocalMoveY(originalPosition.y - 0.15f, 0.4f).SetEase(Ease.InQuad);
    }

    /// <summary>
    /// Tints the sprite for player color identification.
    /// </summary>
    public void SetColor(Color c)
    {
        originalColor = c;
        if (spriteRenderer != null)
            spriteRenderer.color = c;
    }

    private bool HasAnimatorState(string stateName)
    {
        if (animator == null || animator.runtimeAnimatorController == null)
            return false;

        // Check if the trigger parameter exists
        foreach (var param in animator.parameters)
        {
            if (param.name == stateName && param.type == AnimatorControllerParameterType.Trigger)
                return true;
        }
        return false;
    }
}
