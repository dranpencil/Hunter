using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Item grid with buy buttons, player inventory display, and money display.
/// Handles Simultaneous mode (one human, bots auto-shop) and TurnBased mode
/// (sequential human players). Listens to PhaseChangedEvent to show/hide.
/// </summary>
public class StoreUI : MonoBehaviour
{
    [Header("Root Panel")]
    [SerializeField] private GameObject storePanel;

    [Header("Store Items")]
    [SerializeField] private Transform itemGridContainer;
    [SerializeField] private GameObject itemSlotPrefab;

    [Header("Player Info")]
    [SerializeField] private TextMeshProUGUI playerNameText;
    [SerializeField] private TextMeshProUGUI moneyText;
    [SerializeField] private TextMeshProUGUI capacityText;
    [SerializeField] private Transform inventoryDisplay;
    [SerializeField] private TextMeshProUGUI inventoryText;

    [Header("Actions")]
    [SerializeField] private Button finishShoppingButton;

    [Header("Status")]
    [SerializeField] private TextMeshProUGUI statusText;

    // Runtime state
    private int currentPlayerId = -1;
    private List<ItemSlotEntry> itemSlots = new List<ItemSlotEntry>();

    /// <summary>
    /// Tracks the instantiated UI elements for each store item.
    /// </summary>
    private class ItemSlotEntry
    {
        public GameObject root;
        public Button buyButton;
        public TextMeshProUGUI nameText;
        public TextMeshProUGUI priceText;
        public TextMeshProUGUI sizeText;
        public Image iconImage;
        public ItemData itemData;
    }

    private void OnEnable()
    {
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Subscribe<ItemPurchasedEvent>(OnItemPurchased);
        EventBus.Subscribe<ResourceChangedEvent>(OnResourceChanged);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Unsubscribe<ItemPurchasedEvent>(OnItemPurchased);
        EventBus.Unsubscribe<ResourceChangedEvent>(OnResourceChanged);
    }

    private void Start()
    {
        storePanel.SetActive(false);

        if (finishShoppingButton != null)
            finishShoppingButton.onClick.AddListener(OnFinishShopping);
    }

    // ---------------------------------------------------------
    // Event handlers
    // ---------------------------------------------------------

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        if (e.newPhase == GamePhase.Store)
        {
            EnterStorePhase();
        }
        else
        {
            HideStore();
        }
    }

    private void OnItemPurchased(ItemPurchasedEvent e)
    {
        if (e.playerId == currentPlayerId)
            RefreshDisplay();
    }

    private void OnResourceChanged(ResourceChangedEvent e)
    {
        if (e.playerId == currentPlayerId)
            RefreshDisplay();
    }

    // ---------------------------------------------------------
    // Store phase entry
    // ---------------------------------------------------------

    private void EnterStorePhase()
    {
        var gm = GameManager.Instance;

        if (gm.Mode == GameMode.Simultaneous)
        {
            // Bots auto-shop immediately
            RunBotShopping();

            // Find the single human player and show store for them
            int humanId = FindFirstHumanNotFinished();
            if (humanId >= 0)
            {
                ShowStore(humanId);
            }
            else
            {
                // All done (all bots game) — no UI needed, completion check
                // will happen in StorePhase.Update via AllPlayersCompleted
                HideStore();
            }
        }
        else if (gm.Mode == GameMode.TurnBased)
        {
            // Bots shop first
            RunBotShopping();

            // Start with the first human player
            int humanId = FindFirstHumanNotFinished();
            if (humanId >= 0)
            {
                ShowStore(humanId);
            }
            else
            {
                HideStore();
            }
        }
        else // Online
        {
            // In online mode, show store for the local human player.
            // Bots are handled by the host. For now, find first non-bot.
            int humanId = FindFirstHumanNotFinished();
            if (humanId >= 0)
            {
                ShowStore(humanId);
            }
        }
    }

    // ---------------------------------------------------------
    // Show / Hide
    // ---------------------------------------------------------

    public void ShowStore(int playerId)
    {
        currentPlayerId = playerId;
        storePanel.SetActive(true);

        BuildItemGrid();
        RefreshDisplay();

        if (finishShoppingButton != null)
            finishShoppingButton.interactable = true;
    }

    public void HideStore()
    {
        storePanel.SetActive(false);
        currentPlayerId = -1;
    }

    // ---------------------------------------------------------
    // Item grid construction
    // ---------------------------------------------------------

    private void BuildItemGrid()
    {
        // Clear previous slots
        foreach (var slot in itemSlots)
        {
            if (slot.root != null)
                Destroy(slot.root);
        }
        itemSlots.Clear();

        var gm = GameManager.Instance;
        if (currentPlayerId < 0 || currentPlayerId >= gm.Players.Count) return;

        var player = gm.Players[currentPlayerId];

        foreach (var item in gm.allItems)
        {
            // Filter ammo items based on weapon requirements
            if (!ShouldShowItem(player, item))
                continue;

            var slot = CreateItemSlot(player, item);
            itemSlots.Add(slot);
        }
    }

    /// <summary>
    /// Determine whether a given item should appear in the store for this player.
    /// Bullets only shown to Rifle Lv1+. Batteries only to Plasma Lv1+ (but not Lv3 infinite).
    /// </summary>
    private bool ShouldShowItem(PlayerData player, ItemData item)
    {
        if (item.effectType == ItemEffectType.Bullets)
        {
            // Only Rifle with power level >= 1
            return player.weaponData.weaponName == "Rifle"
                && player.GetCurrentPowerLevel() >= 1;
        }

        if (item.effectType == ItemEffectType.Batteries)
        {
            // Plasma Lv1+ but NOT Lv3 (infinite ammo, no need to buy)
            if (player.weaponData.weaponName != "Plasma") return false;
            int powerLevel = player.GetCurrentPowerLevel();
            return powerLevel >= 1 && powerLevel < 3;
        }

        return true;
    }

    private ItemSlotEntry CreateItemSlot(PlayerData player, ItemData item)
    {
        var entry = new ItemSlotEntry();
        entry.itemData = item;

        if (itemSlotPrefab != null)
        {
            entry.root = Instantiate(itemSlotPrefab, itemGridContainer);

            // Locate child components by name convention
            entry.nameText = FindChildTMP(entry.root, "ItemName");
            entry.priceText = FindChildTMP(entry.root, "ItemPrice");
            entry.sizeText = FindChildTMP(entry.root, "ItemSize");
            entry.buyButton = FindChildButton(entry.root, "BuyButton");
            entry.iconImage = FindChildImage(entry.root, "ItemIcon");
        }
        else
        {
            // Fallback: create a simple button if no prefab is assigned
            entry.root = new GameObject($"Item_{item.itemName}");
            entry.root.transform.SetParent(itemGridContainer, false);

            var layout = entry.root.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 8;
            layout.childAlignment = TextAnchor.MiddleLeft;

            // Name label
            var nameObj = new GameObject("ItemName");
            nameObj.transform.SetParent(entry.root.transform, false);
            entry.nameText = nameObj.AddComponent<TextMeshProUGUI>();
            entry.nameText.fontSize = 16;

            // Price label
            var priceObj = new GameObject("ItemPrice");
            priceObj.transform.SetParent(entry.root.transform, false);
            entry.priceText = priceObj.AddComponent<TextMeshProUGUI>();
            entry.priceText.fontSize = 16;

            // Size label
            var sizeObj = new GameObject("ItemSize");
            sizeObj.transform.SetParent(entry.root.transform, false);
            entry.sizeText = sizeObj.AddComponent<TextMeshProUGUI>();
            entry.sizeText.fontSize = 16;

            // Buy button
            var btnObj = new GameObject("BuyButton");
            btnObj.transform.SetParent(entry.root.transform, false);
            btnObj.AddComponent<Image>();
            entry.buyButton = btnObj.AddComponent<Button>();
            var btnText = new GameObject("Text");
            btnText.transform.SetParent(btnObj.transform, false);
            var tmp = btnText.AddComponent<TextMeshProUGUI>();
            tmp.text = "Buy";
            tmp.fontSize = 14;
        }

        // Wire the buy button
        if (entry.buyButton != null)
        {
            var capturedItem = item;
            entry.buyButton.onClick.AddListener(() => OnBuyItem(capturedItem));
        }

        // Set icon if available
        if (entry.iconImage != null && item.icon != null)
            entry.iconImage.sprite = item.icon;

        return entry;
    }

    // ---------------------------------------------------------
    // Display refresh
    // ---------------------------------------------------------

    private void RefreshDisplay()
    {
        var gm = GameManager.Instance;
        if (currentPlayerId < 0 || currentPlayerId >= gm.Players.Count) return;

        var player = gm.Players[currentPlayerId];

        // Player header
        if (playerNameText != null)
            playerNameText.text = $"{player.playerName} ({player.weaponData.weaponName})";

        // Money
        if (moneyText != null)
            moneyText.text = $"Money: ${player.money}";

        // Capacity
        int used = player.GetInventoryUsedCapacity();
        int max = player.maxInventoryCapacity;
        if (capacityText != null)
            capacityText.text = $"Capacity: {used}/{max}";

        // Inventory summary
        if (inventoryText != null)
            inventoryText.text = BuildInventoryString(player);

        // Update each item slot
        foreach (var slot in itemSlots)
        {
            UpdateItemSlot(player, slot);
        }

        // Status text
        if (statusText != null)
        {
            int completed = 0;
            int total = gm.Players.Count;
            foreach (var kvp in gm.PlayerCompletionStatus)
            {
                if (kvp.Value) completed++;
            }
            statusText.text = $"Shopping: {completed}/{total} players finished";
        }
    }

    private void UpdateItemSlot(PlayerData player, ItemSlotEntry slot)
    {
        var item = slot.itemData;
        int effectivePrice = GameManager.Instance.Resources.GetEffectivePrice(player, item);

        if (slot.nameText != null)
            slot.nameText.text = item.itemName;

        if (slot.priceText != null)
        {
            if (effectivePrice < item.price)
                slot.priceText.text = $"${effectivePrice} <s>${item.price}</s>";
            else
                slot.priceText.text = $"${effectivePrice}";
        }

        if (slot.sizeText != null)
            slot.sizeText.text = item.size > 0 ? $"Size: {item.size}" : "Size: 0";

        // Enable/disable buy button
        if (slot.buyButton != null)
        {
            bool canAfford = player.money >= effectivePrice;
            // Allow buying even if it would exceed capacity (triggers overflow later)
            // but disable if cannot afford
            slot.buyButton.interactable = canAfford;
        }
    }

    private string BuildInventoryString(PlayerData player)
    {
        if (player.inventory.Count == 0)
            return "Empty";

        // Count items by name
        var counts = new Dictionary<string, int>();
        foreach (var item in player.inventory)
        {
            if (counts.ContainsKey(item.itemName))
                counts[item.itemName]++;
            else
                counts[item.itemName] = 1;
        }

        var parts = new List<string>();
        foreach (var kvp in counts)
        {
            parts.Add(kvp.Value > 1 ? $"{kvp.Key} x{kvp.Value}" : kvp.Key);
        }
        return string.Join(", ", parts);
    }

    // ---------------------------------------------------------
    // Actions
    // ---------------------------------------------------------

    public void OnBuyItem(ItemData item)
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        bool success = gm.Resources.TryPurchaseItem(player, item);
        if (success)
        {
            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName} bought {item.itemName}",
                logType = GameLogType.Action
            });

            // RefreshDisplay is called via OnItemPurchased event handler
        }
    }

    public void OnFinishShopping()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;

        // Mark current player as finished
        gm.PlayerCompletionStatus[currentPlayerId] = true;
        EventBus.Publish(new PlayerFinishedShoppingEvent { playerId = currentPlayerId });

        EventBus.Publish(new GameLogEvent
        {
            message = $"{gm.Players[currentPlayerId].playerName} finished shopping",
            logType = GameLogType.Action
        });

        // Check for capacity overflow before truly finishing
        var player = gm.Players[currentPlayerId];
        if (gm.Resources.IsOverCapacity(player))
        {
            int overflow = player.GetInventoryUsedCapacity() - player.maxInventoryCapacity;
            EventBus.Publish(new CapacityOverflowEvent
            {
                playerId = currentPlayerId,
                overflow = overflow
            });
        }

        if (gm.Mode == GameMode.TurnBased)
        {
            // Advance to next human player
            int nextHuman = FindNextHumanNotFinished(currentPlayerId + 1);
            if (nextHuman >= 0)
            {
                ShowStore(nextHuman);
                return;
            }
        }

        // Simultaneous or last player in TurnBased — hide store
        HideStore();

        // AllPlayersCompleted check happens in StorePhase.Update
    }

    // ---------------------------------------------------------
    // Bot shopping
    // ---------------------------------------------------------

    private void RunBotShopping()
    {
        var gm = GameManager.Instance;

        foreach (var player in gm.Players)
        {
            if (!player.isBot) continue;
            if (gm.PlayerCompletionStatus.ContainsKey(player.id) && gm.PlayerCompletionStatus[player.id])
                continue;

            var botAI = new BotShoppingAI(player.id, gm);
            botAI.DoShopping(gm);

            // Check capacity overflow for bots
            if (gm.Resources.IsOverCapacity(player))
            {
                // Bots auto-resolve overflow by discarding cheapest items
                AutoResolveOverflow(player);
            }
        }
    }

    /// <summary>
    /// Auto-resolve capacity overflow for bots by discarding the cheapest/smallest items.
    /// </summary>
    private void AutoResolveOverflow(PlayerData player)
    {
        while (player.GetInventoryUsedCapacity() > player.maxInventoryCapacity && player.inventory.Count > 0)
        {
            // Find the item with the lowest price (tiebreak by smallest size)
            int worstIndex = 0;
            for (int i = 1; i < player.inventory.Count; i++)
            {
                var current = player.inventory[i];
                var worst = player.inventory[worstIndex];
                if (current.price < worst.price ||
                    (current.price == worst.price && current.size < worst.size))
                {
                    worstIndex = i;
                }
            }
            player.inventory.RemoveAt(worstIndex);
        }
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    private int FindFirstHumanNotFinished()
    {
        return FindNextHumanNotFinished(0);
    }

    private int FindNextHumanNotFinished(int startIndex)
    {
        var gm = GameManager.Instance;
        for (int i = startIndex; i < gm.Players.Count; i++)
        {
            if (gm.Players[i].isBot) continue;
            if (gm.PlayerCompletionStatus.ContainsKey(i) && gm.PlayerCompletionStatus[i]) continue;
            return i;
        }
        return -1;
    }

    private TextMeshProUGUI FindChildTMP(GameObject parent, string childName)
    {
        var t = parent.transform.Find(childName);
        return t != null ? t.GetComponent<TextMeshProUGUI>() : null;
    }

    private Button FindChildButton(GameObject parent, string childName)
    {
        var t = parent.transform.Find(childName);
        return t != null ? t.GetComponent<Button>() : null;
    }

    private Image FindChildImage(GameObject parent, string childName)
    {
        var t = parent.transform.Find(childName);
        return t != null ? t.GetComponent<Image>() : null;
    }
}
