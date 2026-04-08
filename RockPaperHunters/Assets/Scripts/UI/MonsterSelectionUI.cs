using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Event published when the player confirms their monster level selection before battle.
/// </summary>
public struct MonsterLevelSelectedEvent
{
    public int playerId;
    public int level;        // 1, 2, or 3
    public int beerUsed;     // Number of beers consumed for EP
    public bool usePets;     // Whether to bring pets into battle
}

/// <summary>
/// Monster level select, beer consumption for EP, and pet selection before battle.
/// Shows a modal with 3 level buttons (Lv1=2EP, Lv2=3EP, Lv3=4EP), a "Use Beer"
/// button to convert beer to EP, pet checkbox for Chain/Whip tamers, and a confirm button.
/// </summary>
public class MonsterSelectionUI : MonoBehaviour
{
    [Header("Root Panel")]
    [SerializeField] private GameObject modalPanel;

    [Header("Title")]
    [SerializeField] private TextMeshProUGUI titleText;

    [Header("Level Buttons")]
    [SerializeField] private Button level1Button;
    [SerializeField] private TextMeshProUGUI level1Text;
    [SerializeField] private Button level2Button;
    [SerializeField] private TextMeshProUGUI level2Text;
    [SerializeField] private Button level3Button;
    [SerializeField] private TextMeshProUGUI level3Text;

    [Header("Beer / EP")]
    [SerializeField] private TextMeshProUGUI epText;
    [SerializeField] private TextMeshProUGUI beerCountText;
    [SerializeField] private Button useBeerButton;
    [SerializeField] private TextMeshProUGUI useBeerButtonText;

    [Header("Pet Selection")]
    [SerializeField] private GameObject petContainer;
    [SerializeField] private Toggle usePetsToggle;
    [SerializeField] private TextMeshProUGUI petInfoText;

    [Header("Confirm")]
    [SerializeField] private Button confirmButton;
    [SerializeField] private TextMeshProUGUI confirmButtonText;

    [Header("Visual Feedback")]
    [SerializeField] private Color selectedColor = new Color(0.3f, 0.8f, 0.3f, 1f);
    [SerializeField] private Color normalColor = Color.white;

    // EP costs per monster level
    private static readonly int[] EP_COST = { 0, 2, 3, 4 }; // index 0 unused, Lv1=2, Lv2=3, Lv3=4

    // Runtime state
    private int currentPlayerId = -1;
    private int selectedLevel = -1;
    private int beerUsedThisSession;
    private int temporaryEp; // Player's EP including beer-converted EP for this session

    private void Start()
    {
        modalPanel.SetActive(false);

        // Wire button listeners
        if (level1Button != null)
            level1Button.onClick.AddListener(() => OnLevelSelected(1));
        if (level2Button != null)
            level2Button.onClick.AddListener(() => OnLevelSelected(2));
        if (level3Button != null)
            level3Button.onClick.AddListener(() => OnLevelSelected(3));
        if (useBeerButton != null)
            useBeerButton.onClick.AddListener(OnUseBeer);
        if (confirmButton != null)
            confirmButton.onClick.AddListener(OnConfirmMonster);
    }

    // ---------------------------------------------------------
    // Show / Hide
    // ---------------------------------------------------------

    public void Show(int playerId)
    {
        currentPlayerId = playerId;
        selectedLevel = -1;
        beerUsedThisSession = 0;

        var gm = GameManager.Instance;
        var player = gm.Players[playerId];

        temporaryEp = player.ep;

        modalPanel.SetActive(true);

        // Title
        if (titleText != null)
            titleText.text = $"{player.playerName} - Select Monster Level";

        // Pet section visibility
        bool hasPets = player.GetTotalPets() > 0;
        bool canUsePets = hasPets && IsTamerWeapon(player);

        if (petContainer != null)
            petContainer.SetActive(canUsePets);

        if (usePetsToggle != null)
        {
            usePetsToggle.isOn = canUsePets; // Default to using pets if available
            usePetsToggle.interactable = canUsePets;
        }

        if (petInfoText != null && canUsePets)
        {
            petInfoText.text = $"Pets: Lv1 x{player.petsLevel1}, Lv2 x{player.petsLevel2}, Lv3 x{player.petsLevel3}";
        }

        RefreshDisplay();
    }

    public void Hide()
    {
        modalPanel.SetActive(false);
        currentPlayerId = -1;
        selectedLevel = -1;
        beerUsedThisSession = 0;
    }

    // ---------------------------------------------------------
    // Level selection
    // ---------------------------------------------------------

    public void OnLevelSelected(int level)
    {
        if (level < 1 || level > 3) return;

        // Only allow selection if player has enough (temporary) EP
        if (temporaryEp < EP_COST[level]) return;

        selectedLevel = level;
        RefreshDisplay();
    }

    // ---------------------------------------------------------
    // Beer usage
    // ---------------------------------------------------------

    public void OnUseBeer()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        // Check if player has beer available (accounting for already-used this session)
        int availableBeer = CountBeerInInventory(player) - beerUsedThisSession;
        if (availableBeer <= 0) return;

        // Check if EP is at max already
        if (temporaryEp >= player.maxEp) return;

        beerUsedThisSession++;
        temporaryEp++;

        RefreshDisplay();
    }

    // ---------------------------------------------------------
    // Confirm
    // ---------------------------------------------------------

    public void OnConfirmMonster()
    {
        if (currentPlayerId < 0 || selectedLevel < 1) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        // Validate EP (with beer conversion)
        if (temporaryEp < EP_COST[selectedLevel]) return;

        // Actually consume the beers from inventory
        int beersToRemove = beerUsedThisSession;
        for (int i = player.inventory.Count - 1; i >= 0 && beersToRemove > 0; i--)
        {
            if (player.inventory[i].effectType == ItemEffectType.Beer)
            {
                var beerItem = player.inventory[i];
                player.inventory.RemoveAt(i);
                beersToRemove--;

                EventBus.Publish(new ItemUsedEvent { playerId = currentPlayerId, item = beerItem });
            }
        }

        // Apply the EP gained from beer
        if (beerUsedThisSession > 0)
        {
            gm.Resources.ChangeResource(player, "ep", beerUsedThisSession);

            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName} used {beerUsedThisSession} beer for +{beerUsedThisSession} EP",
                logType = GameLogType.Action
            });
        }

        // Determine pet usage
        bool usePets = false;
        if (petContainer != null && petContainer.activeSelf && usePetsToggle != null)
        {
            usePets = usePetsToggle.isOn;
        }

        // Publish the selection event
        EventBus.Publish(new MonsterLevelSelectedEvent
        {
            playerId = currentPlayerId,
            level = selectedLevel,
            beerUsed = beerUsedThisSession,
            usePets = usePets
        });

        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} chose Level {selectedLevel} monster" +
                      (usePets ? " (with pets)" : ""),
            logType = GameLogType.Action
        });

        Hide();
    }

    // ---------------------------------------------------------
    // Display refresh
    // ---------------------------------------------------------

    private void RefreshDisplay()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        // EP display (showing temporary EP with beer conversions)
        if (epText != null)
        {
            string beerNote = beerUsedThisSession > 0
                ? $" (+{beerUsedThisSession} from beer)"
                : "";
            epText.text = $"EP: {temporaryEp}/{player.maxEp}{beerNote}";
        }

        // Beer count
        int availableBeer = CountBeerInInventory(player) - beerUsedThisSession;
        if (beerCountText != null)
            beerCountText.text = $"Beer: {availableBeer}";

        // Use beer button
        if (useBeerButton != null)
        {
            bool canUseBeer = availableBeer > 0 && temporaryEp < player.maxEp;
            useBeerButton.interactable = canUseBeer;
        }
        if (useBeerButtonText != null)
            useBeerButtonText.text = "Use Beer (+1 EP)";

        // Level buttons — show EP cost and enable/disable based on EP
        UpdateLevelButton(level1Button, level1Text, 1);
        UpdateLevelButton(level2Button, level2Text, 2);
        UpdateLevelButton(level3Button, level3Text, 3);

        // Confirm button — enabled only when a valid level is selected
        if (confirmButton != null)
        {
            bool canConfirm = selectedLevel >= 1 && temporaryEp >= EP_COST[selectedLevel];
            confirmButton.interactable = canConfirm;
        }

        if (confirmButtonText != null)
        {
            if (selectedLevel >= 1)
                confirmButtonText.text = $"Confirm (Lv{selectedLevel}, -{EP_COST[selectedLevel]} EP)";
            else
                confirmButtonText.text = "Select a level";
        }
    }

    private void UpdateLevelButton(Button button, TextMeshProUGUI text, int level)
    {
        if (button == null) return;

        int cost = EP_COST[level];
        bool hasEnoughEp = temporaryEp >= cost;

        button.interactable = hasEnoughEp;

        // Visual selection feedback
        var colors = button.colors;
        if (selectedLevel == level)
        {
            colors.normalColor = selectedColor;
            colors.highlightedColor = selectedColor;
        }
        else
        {
            colors.normalColor = normalColor;
            colors.highlightedColor = normalColor;
        }
        button.colors = colors;

        if (text != null)
        {
            string epLabel = hasEnoughEp ? $"{cost} EP" : $"{cost} EP (need more EP)";
            text.text = $"Level {level}\n{epLabel}";
        }
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    /// <summary>
    /// Count how many Beer items the player has in their inventory.
    /// </summary>
    private int CountBeerInInventory(PlayerData player)
    {
        int count = 0;
        foreach (var item in player.inventory)
        {
            if (item.effectType == ItemEffectType.Beer)
                count++;
        }
        return count;
    }

    /// <summary>
    /// Check if the player's weapon supports pet taming (Chain or Whip).
    /// </summary>
    private bool IsTamerWeapon(PlayerData player)
    {
        string weapon = player.weaponData.weaponName;
        return weapon == "Chain" || weapon == "Whip";
    }
}
