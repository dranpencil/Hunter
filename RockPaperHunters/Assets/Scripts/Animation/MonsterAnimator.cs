using System;
using UnityEngine;
using DG.Tweening;

/// <summary>
/// Controls monster sprite animations with DOTween.
/// Attach to a monster GameObject with a SpriteRenderer.
/// </summary>
public class MonsterAnimator : MonoBehaviour
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
    /// Slow sway left/right, looping forever.
    /// </summary>
    public void PlayIdle()
    {
        KillIdleTween();
        transform.localPosition = originalPosition;

        if (animator != null && HasAnimatorState("Idle"))
        {
            animator.SetTrigger("Idle");
        }

        idleTween = transform.DOLocalMoveX(originalPosition.x + 0.12f, 0.8f)
            .SetEase(Ease.InOutSine)
            .SetLoops(-1, LoopType.Yoyo);
    }

    /// <summary>
    /// Lunge forward toward player, slight camera shake, return, then callback.
    /// </summary>
    public void PlayAttack(Action onComplete)
    {
        KillIdleTween();
        transform.DOKill();

        if (animator != null && HasAnimatorState("Attack"))
        {
            animator.SetTrigger("Attack");
        }

        Sequence seq = DOTween.Sequence();

        // Lunge toward player (negative X = toward player on left side)
        seq.Append(transform.DOLocalMoveX(originalPosition.x - 0.6f, 0.12f).SetEase(Ease.OutQuad));

        // Screen shake via camera
        seq.AppendCallback(() =>
        {
            Camera cam = Camera.main;
            if (cam != null)
            {
                cam.transform.DOShakePosition(0.2f, strength: 0.1f, vibrato: 15, randomness: 90, fadeOut: true);
            }
        });

        seq.AppendInterval(0.1f);

        // Return to original
        seq.Append(transform.DOLocalMove(originalPosition, 0.15f).SetEase(Ease.InQuad));

        seq.OnComplete(() =>
        {
            PlayIdle();
            onComplete?.Invoke();
        });
    }

    /// <summary>
    /// Scale punch (shrink to 0.8x briefly then back) with a red flash.
    /// </summary>
    public void PlayHit()
    {
        if (animator != null && HasAnimatorState("Hit"))
        {
            animator.SetTrigger("Hit");
        }

        // Scale punch: shrink then return
        transform.DOPunchScale(new Vector3(-0.2f, -0.2f, 0f), 0.3f, vibrato: 5, elasticity: 0.5f);

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
    /// Spin + shrink to 0 + fade out over 0.5s, then callback.
    /// </summary>
    public void PlayDefeat(Action onComplete)
    {
        KillIdleTween();
        transform.DOKill();
        if (spriteRenderer != null) spriteRenderer.DOKill();

        if (animator != null && HasAnimatorState("Defeat"))
        {
            animator.SetTrigger("Defeat");
        }

        Sequence seq = DOTween.Sequence();

        // Spin (rotate Z 360 degrees)
        seq.Append(transform.DORotate(new Vector3(0f, 0f, 360f), 0.5f, RotateMode.FastBeyond360)
            .SetEase(Ease.InQuad));

        // Shrink to 0
        seq.Join(transform.DOScale(0f, 0.5f).SetEase(Ease.InBack));

        // Fade out
        if (spriteRenderer != null)
        {
            Color fadeColor = originalColor;
            fadeColor.a = 0f;
            seq.Join(spriteRenderer.DOColor(fadeColor, 0.5f));
        }

        seq.OnComplete(() => onComplete?.Invoke());
    }

    /// <summary>
    /// Heart particle burst (via VFXManager if available) and gentle glow pulse.
    /// </summary>
    public void PlayTamed()
    {
        KillIdleTween();
        transform.DOKill();

        if (animator != null && HasAnimatorState("Tamed"))
        {
            animator.SetTrigger("Tamed");
        }

        // Spawn heart particles via VFXManager if available
        if (VFXManager.Instance != null)
        {
            VFXManager.Instance.SpawnVFX("HeartBurst", transform.position);
        }

        // Gentle glow pulse: brighten then return, looping a few times
        if (spriteRenderer != null)
        {
            spriteRenderer.DOKill();
            Color glowColor = Color.Lerp(originalColor, Color.yellow, 0.4f);
            Sequence pulseSeq = DOTween.Sequence();
            pulseSeq.Append(spriteRenderer.DOColor(glowColor, 0.3f));
            pulseSeq.Append(spriteRenderer.DOColor(originalColor, 0.3f));
            pulseSeq.SetLoops(3, LoopType.Restart);
        }

        // Slight upward float
        transform.DOLocalMoveY(originalPosition.y + 0.2f, 0.6f).SetEase(Ease.OutSine);
    }

    private bool HasAnimatorState(string stateName)
    {
        if (animator == null || animator.runtimeAnimatorController == null)
            return false;

        foreach (var param in animator.parameters)
        {
            if (param.name == stateName && param.type == AnimatorControllerParameterType.Trigger)
                return true;
        }
        return false;
    }
}
