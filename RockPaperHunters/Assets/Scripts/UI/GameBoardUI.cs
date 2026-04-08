using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Manages the 7 location columns on the game board.
/// Displays tokens at their locations after selection phase reveals.
/// Shows dummy token positions.
/// </summary>
public class GameBoardUI : MonoBehaviour
{
    [Header("Location Columns (7 locations, indexed 0-6)")]
    [SerializeField] private Transform[] locationSlots = new Transform[7];
    [SerializeField] private TextMeshProUGUI[] locationNameLabels = new TextMeshProUGUI[7];
    [SerializeField] private Image[] locationBackgrounds = new Image[7];

    [Header("Token Prefabs")]
    [SerializeField] private GameObject hunterTokenPrefab;
    [SerializeField] private GameObject apprenticeTokenPrefab;
    [SerializeField] private GameObject dummyTokenPrefab;

    [Header("Round Display")]
    [SerializeField] private TextMeshProUGUI roundText;
    [SerializeField] private TextMeshProUGUI phaseText;

    // Track spawned tokens for cleanup
    private List<GameObject> spawnedTokens = new List<GameObject>();
    private List<GameObject> dummyTokenObjects = new List<GameObject>();

    private void OnEnable()
    {
        EventBus.Subscribe<TokenPlacedEvent>(OnTokenPlaced);
        EventBus.Subscribe<DummyTokensMovedEvent>(OnDummyTokensMoved);
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Subscribe<RoundStartedEvent>(OnRoundStarted);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<TokenPlacedEvent>(OnTokenPlaced);
        EventBus.Unsubscribe<DummyTokensMovedEvent>(OnDummyTokensMoved);
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Unsubscribe<RoundStartedEvent>(OnRoundStarted);
    }

    private void Start()
    {
        // Set location names
        var gm = GameManager.Instance;
        if (gm != null && gm.allLocations != null)
        {
            for (int i = 0; i < gm.allLocations.Length && i < locationNameLabels.Length; i++)
            {
                if (locationNameLabels[i] != null)
                    locationNameLabels[i].text = gm.allLocations[i].locationName;
            }
        }

        // Initial dummy token display
        UpdateDummyTokenDisplay();
    }

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        if (phaseText != null)
            phaseText.text = e.newPhase.ToString();

        // Clear player tokens at start of selection phase
        if (e.newPhase == GamePhase.Selection)
            ClearPlayerTokens();
    }

    private void OnRoundStarted(RoundStartedEvent e)
    {
        if (roundText != null)
            roundText.text = $"Round {e.roundNumber}";
    }

    private void OnTokenPlaced(TokenPlacedEvent e)
    {
        int slotIndex = (int)e.location - 1; // LocationId starts at 1
        if (slotIndex < 0 || slotIndex >= locationSlots.Length) return;

        var prefab = e.isHunter ? hunterTokenPrefab : apprenticeTokenPrefab;
        if (prefab == null) return;

        var token = Instantiate(prefab, locationSlots[slotIndex]);
        spawnedTokens.Add(token);

        // Color the token to match player
        var gm = GameManager.Instance;
        if (gm != null && e.playerId < gm.Players.Count)
        {
            var playerColor = gm.Players[e.playerId].color;
            Color color;
            if (ColorUtility.TryParseHtmlString(playerColor.hexCode, out color))
            {
                var img = token.GetComponent<Image>();
                if (img != null) img.color = color;
            }

            // Set label
            var label = token.GetComponentInChildren<TextMeshProUGUI>();
            if (label != null)
            {
                string type = e.isHunter ? "H" : "A";
                label.text = $"P{e.playerId + 1}{type}";
            }
        }
    }

    private void OnDummyTokensMoved(DummyTokensMovedEvent e)
    {
        UpdateDummyTokenDisplay();
    }

    private void UpdateDummyTokenDisplay()
    {
        // Clear existing dummy tokens
        foreach (var obj in dummyTokenObjects)
        {
            if (obj != null) Destroy(obj);
        }
        dummyTokenObjects.Clear();

        var gm = GameManager.Instance;
        if (gm == null || dummyTokenPrefab == null) return;

        foreach (var pos in gm.DummyTokenPositions)
        {
            int slotIndex = (int)pos - 1;
            if (slotIndex < 0 || slotIndex >= locationSlots.Length) continue;

            var dummy = Instantiate(dummyTokenPrefab, locationSlots[slotIndex]);
            dummyTokenObjects.Add(dummy);
        }
    }

    private void ClearPlayerTokens()
    {
        foreach (var token in spawnedTokens)
        {
            if (token != null) Destroy(token);
        }
        spawnedTokens.Clear();
    }
}
