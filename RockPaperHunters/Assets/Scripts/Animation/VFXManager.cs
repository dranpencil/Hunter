using System.Collections.Generic;
using UnityEngine;
using DG.Tweening;
using TMPro;

/// <summary>
/// Singleton manager for spawning visual effects and floating text.
/// Subscribes to EventBus events to auto-spawn effects during gameplay.
/// </summary>
public class VFXManager : MonoBehaviour
{
    public static VFXManager Instance { get; private set; }

    [Header("VFX Prefabs")]
    [SerializeField] private GameObject slashHitPrefab;
    [SerializeField] private GameObject explosionHitPrefab;
    [SerializeField] private GameObject healSparklePrefab;
    [SerializeField] private GameObject coinBurstPrefab;
    [SerializeField] private GameObject monsterDissolvePrefab;
    [SerializeField] private GameObject levelUpGlowPrefab;
    [SerializeField] private GameObject popularityStarsPrefab;
    [SerializeField] private GameObject heartBurstPrefab;

    [Header("UI Prefabs")]
    [SerializeField] private GameObject damageNumberPrefab;
    [SerializeField] private GameObject floatingTextPrefab;

    [Header("References")]
    [SerializeField] private Canvas worldCanvas;
    [SerializeField] private Transform[] monsterPositions;
    [SerializeField] private Transform[] playerPositions;

    private Dictionary<string, GameObject> vfxLookup;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        BuildVFXLookup();
    }

    private void OnEnable()
    {
        EventBus.Subscribe<MonsterDamagedEvent>(OnMonsterDamaged);
        EventBus.Subscribe<PlayerDamagedEvent>(OnPlayerDamaged);
        EventBus.Subscribe<ScoreChangedEvent>(OnScoreChanged);
        EventBus.Subscribe<MonsterDefeatedEvent>(OnMonsterDefeated);
        EventBus.Subscribe<ItemUsedEvent>(OnItemUsed);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<MonsterDamagedEvent>(OnMonsterDamaged);
        EventBus.Unsubscribe<PlayerDamagedEvent>(OnPlayerDamaged);
        EventBus.Unsubscribe<ScoreChangedEvent>(OnScoreChanged);
        EventBus.Unsubscribe<MonsterDefeatedEvent>(OnMonsterDefeated);
        EventBus.Unsubscribe<ItemUsedEvent>(OnItemUsed);
    }

    private void BuildVFXLookup()
    {
        vfxLookup = new Dictionary<string, GameObject>();

        RegisterPrefab("SlashHit", slashHitPrefab);
        RegisterPrefab("ExplosionHit", explosionHitPrefab);
        RegisterPrefab("HealSparkle", healSparklePrefab);
        RegisterPrefab("CoinBurst", coinBurstPrefab);
        RegisterPrefab("MonsterDissolve", monsterDissolvePrefab);
        RegisterPrefab("LevelUpGlow", levelUpGlowPrefab);
        RegisterPrefab("PopularityStars", popularityStarsPrefab);
        RegisterPrefab("HeartBurst", heartBurstPrefab);
    }

    private void RegisterPrefab(string name, GameObject prefab)
    {
        if (prefab != null)
            vfxLookup[name] = prefab;
    }

    /// <summary>
    /// Instantiates a VFX prefab by name at the given world position.
    /// Auto-destroys after 2 seconds.
    /// </summary>
    public void SpawnVFX(string vfxName, Vector3 position)
    {
        if (vfxLookup == null || !vfxLookup.ContainsKey(vfxName))
        {
            Debug.LogWarning($"[VFXManager] VFX prefab not found: {vfxName}");
            return;
        }

        GameObject vfx = Instantiate(vfxLookup[vfxName], position, Quaternion.identity);
        Destroy(vfx, 2f);
    }

    /// <summary>
    /// Spawns a floating damage number at the given position.
    /// Animates upward 50 units and fades out over 1 second, then destroys.
    /// </summary>
    public void SpawnDamageNumber(int damage, Vector3 position)
    {
        if (damageNumberPrefab == null) return;

        GameObject dmgObj = Instantiate(damageNumberPrefab, position, Quaternion.identity, GetCanvasParent());
        TextMeshProUGUI tmp = dmgObj.GetComponentInChildren<TextMeshProUGUI>();
        if (tmp == null)
        {
            TextMeshPro tmpWorld = dmgObj.GetComponentInChildren<TextMeshPro>();
            if (tmpWorld != null)
            {
                tmpWorld.text = damage.ToString();
                tmpWorld.color = Color.red;
                AnimateFloatingObject(dmgObj, Color.red);
            }
        }
        else
        {
            tmp.text = damage.ToString();
            tmp.color = Color.red;
            AnimateFloatingObject(dmgObj, Color.red);
        }
    }

    /// <summary>
    /// Spawns floating text with a custom message and color at the given position.
    /// Animates upward 50 units and fades out over 1 second, then destroys.
    /// </summary>
    public void SpawnFloatingText(string text, Vector3 position, Color color)
    {
        if (floatingTextPrefab == null) return;

        GameObject textObj = Instantiate(floatingTextPrefab, position, Quaternion.identity, GetCanvasParent());
        TextMeshProUGUI tmp = textObj.GetComponentInChildren<TextMeshProUGUI>();
        if (tmp == null)
        {
            TextMeshPro tmpWorld = textObj.GetComponentInChildren<TextMeshPro>();
            if (tmpWorld != null)
            {
                tmpWorld.text = text;
                tmpWorld.color = color;
                AnimateFloatingObject(textObj, color);
            }
        }
        else
        {
            tmp.text = text;
            tmp.color = color;
            AnimateFloatingObject(textObj, color);
        }
    }

    /// <summary>
    /// Spawns a "+N" resource text that arcs from one position to another.
    /// </summary>
    public void SpawnResourceGain(string resourceName, int amount, Vector3 from, Vector3 to)
    {
        if (floatingTextPrefab == null) return;

        string displayText = $"+{amount} {resourceName}";
        Color textColor = GetResourceColor(resourceName);

        GameObject textObj = Instantiate(floatingTextPrefab, from, Quaternion.identity, GetCanvasParent());
        TextMeshProUGUI tmp = textObj.GetComponentInChildren<TextMeshProUGUI>();
        TextMeshPro tmpWorld = null;

        if (tmp != null)
        {
            tmp.text = displayText;
            tmp.color = textColor;
        }
        else
        {
            tmpWorld = textObj.GetComponentInChildren<TextMeshPro>();
            if (tmpWorld != null)
            {
                tmpWorld.text = displayText;
                tmpWorld.color = textColor;
            }
        }

        // Arc from source to destination
        Sequence seq = DOTween.Sequence();

        // Move to destination with an arc
        seq.Append(textObj.transform.DOMove(to, 0.8f).SetEase(Ease.InOutCubic));

        // Arc upward during first half
        Vector3 midPoint = Vector3.Lerp(from, to, 0.5f) + Vector3.up * 40f;
        seq.Join(textObj.transform.DOPunchPosition(Vector3.up * 40f, 0.8f, vibrato: 1, elasticity: 0f));

        // Fade out during second half
        seq.Insert(0.4f, DOTween.To(
            () => 1f,
            alpha =>
            {
                if (tmp != null)
                {
                    Color c = tmp.color;
                    c.a = alpha;
                    tmp.color = c;
                }
                else if (tmpWorld != null)
                {
                    Color c = tmpWorld.color;
                    c.a = alpha;
                    tmpWorld.color = c;
                }
            },
            0f, 0.4f));

        seq.OnComplete(() => Destroy(textObj));
    }

    private void AnimateFloatingObject(GameObject obj, Color startColor)
    {
        Sequence seq = DOTween.Sequence();

        // Move upward 50 units
        seq.Append(obj.transform.DOMove(obj.transform.position + Vector3.up * 50f, 1f)
            .SetEase(Ease.OutCubic));

        // Fade out
        CanvasGroup canvasGroup = obj.GetComponent<CanvasGroup>();
        if (canvasGroup == null)
            canvasGroup = obj.AddComponent<CanvasGroup>();

        seq.Join(DOTween.To(() => canvasGroup.alpha, x => canvasGroup.alpha = x, 0f, 1f)
            .SetEase(Ease.InQuad));

        // Scale up slightly at start
        seq.Join(obj.transform.DOScale(1.2f, 0.15f).SetEase(Ease.OutBack));

        seq.OnComplete(() => Destroy(obj));
    }

    private Transform GetCanvasParent()
    {
        if (worldCanvas != null)
            return worldCanvas.transform;
        return null;
    }

    private Color GetResourceColor(string resourceName)
    {
        switch (resourceName.ToLower())
        {
            case "money": return new Color(1f, 0.84f, 0f);       // Gold
            case "exp": return new Color(0.5f, 0.8f, 1f);         // Light blue
            case "hp": return new Color(1f, 0.3f, 0.3f);          // Red
            case "ep": return new Color(0.3f, 1f, 0.3f);          // Green
            case "beer": return new Color(1f, 0.65f, 0f);         // Orange
            case "bloodbag": return new Color(0.8f, 0.1f, 0.1f);  // Dark red
            case "points": return new Color(1f, 1f, 0.4f);        // Yellow
            default: return Color.white;
        }
    }

    private Vector3 GetMonsterPosition()
    {
        if (monsterPositions != null && monsterPositions.Length > 0 && monsterPositions[0] != null)
            return monsterPositions[0].position;
        return Vector3.zero;
    }

    private Vector3 GetPlayerPosition(int playerId)
    {
        if (playerPositions != null && playerId >= 0 && playerId < playerPositions.Length && playerPositions[playerId] != null)
            return playerPositions[playerId].position;
        return Vector3.zero;
    }

    // --- EventBus Handlers ---

    private void OnMonsterDamaged(MonsterDamagedEvent evt)
    {
        SpawnDamageNumber(evt.damage, GetMonsterPosition());
    }

    private void OnPlayerDamaged(PlayerDamagedEvent evt)
    {
        SpawnDamageNumber(evt.damage, GetPlayerPosition(evt.playerId));
    }

    private void OnScoreChanged(ScoreChangedEvent evt)
    {
        int delta = evt.newScore - evt.oldScore;
        if (delta > 0)
        {
            string text = $"+{delta} pts";
            SpawnFloatingText(text, GetPlayerPosition(evt.playerId), GetResourceColor("points"));
        }
    }

    private void OnMonsterDefeated(MonsterDefeatedEvent evt)
    {
        SpawnVFX("MonsterDissolve", GetMonsterPosition());
    }

    private void OnItemUsed(ItemUsedEvent evt)
    {
        if (evt.item == null) return;

        switch (evt.item.effectType)
        {
            case ItemEffectType.Grenade:
            case ItemEffectType.Bomb:
            case ItemEffectType.Dynamite:
                SpawnVFX("ExplosionHit", GetMonsterPosition());
                break;
        }
    }
}
