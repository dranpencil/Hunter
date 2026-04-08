using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Modal for use/upgrade/discard when player is over item capacity.
/// Shows all items in inventory with Use/Discard buttons.
/// Use Beer -> restore 1 EP (if not max). Use Blood Bag -> restore 1 HP (if not max).
/// Upgrade buttons for HP (3 blood bags) and EP (4 beers).
/// Modal stays open until player is at or under capacity, then auto-closes.
/// </summary>
public class CapacityOverflowUI : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private GameObject modalPanel;
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private TextMeshProUGUI overflowText;
    [SerializeField] private TextMeshProUGUI capacityText;
    [SerializeField] private Transform itemListContainer;
    [SerializeField] private GameObject itemRowPrefab;

    [Header("Upgrade Buttons")]
    [SerializeField] private Button upgradeHpButton;
    [SerializeField] private TextMeshProUGUI upgradeHpText;
    [SerializeField] private Button upgradeEpButton;
    [SerializeField] private TextMeshProUGUI upgradeEpText;

    private int currentPlayerId = -1;
    private List<OverflowItemRow> itemRows = new List<OverflowItemRow>();

    /// <summary>
    /// Tracks the instantiated UI elements for each inventory item row.
    /// </summary>
    private class OverflowItemRow
    {
        public GameObject root;
        public TextMeshProUGUI nameText;
        public TextMeshProUGUI sizeText;
        public Button useButton;
        public TextMeshProUGUI useButtonText;
        public Button discardButton;
        public int inventoryIndex;
    }

    private void OnEnable()
    {
        EventBus.Subscribe<CapacityOverflowEvent>(OnCapacityOverflow);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<CapacityOverflowEvent>(OnCapacityOverflow);
    }

    private void Start()
    {
        modalPanel.SetActive(false);

        if (upgradeHpButton != null)
            upgradeHpButton.onClick.AddListener(OnUpgradeHp);
        if (upgradeEpButton != null)
            upgradeEpButton.onClick.AddListener(OnUpgradeEp);
    }

    // ---------------------------------------------------------
    // Event handler
    // ---------------------------------------------------------

    private void OnCapacityOverflow(CapacityOverflowEvent e)
    {
        Show(e.playerId);
    }

    // ---------------------------------------------------------
    // Show / Hide / Refresh
    // ---------------------------------------------------------

    public void Show(int playerId)
    {
        currentPlayerId = playerId;
        modalPanel.SetActive(true);
        RebuildItemList();
        RefreshDisplay();
    }

    private void Hide()
    {
        modalPanel.SetActive(false);
        currentPlayerId = -1;
    }

    /// <summary>
    /// Check if the player is now at or under capacity and auto-close if so.
    /// </summary>
    private void CheckAndClose()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        if (!gm.Resources.IsOverCapacity(player))
        {
            Hide();
        }
        else
        {
            // Still over capacity — refresh the UI
            RebuildItemList();
            RefreshDisplay();
        }
    }

    private void RebuildItemList()
    {
        // Destroy existing rows
        foreach (var row in itemRows)
        {
            if (row.root != null)
                Destroy(row.root);
        }
        itemRows.Clear();

        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        for (int i = 0; i < player.inventory.Count; i++)
        {
            var item = player.inventory[i];
            var row = CreateItemRow(item, i);
            itemRows.Add(row);
        }
    }

    private OverflowItemRow CreateItemRow(ItemData item, int index)
    {
        var row = new OverflowItemRow();
        row.inventoryIndex = index;

        if (itemRowPrefab != null)
        {
            row.root = Instantiate(itemRowPrefab, itemListContainer);
            row.nameText = FindChildTMP(row.root, "ItemName");
            row.sizeText = FindChildTMP(row.root, "ItemSize");
            row.useButton = FindChildButton(row.root, "UseButton");
            row.discardButton = FindChildButton(row.root, "DiscardButton");
            row.useButtonText = row.useButton != null
                ? row.useButton.GetComponentInChildren<TextMeshProUGUI>()
                : null;
        }
        else
        {
            // Fallback: create simple row
            row.root = new GameObject($"OverflowItem_{index}");
            row.root.transform.SetParent(itemListContainer, false);

            var layout = row.root.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 8;
            layout.childAlignment = TextAnchor.MiddleLeft;

            // Name
            var nameObj = new GameObject("ItemName");
            nameObj.transform.SetParent(row.root.transform, false);
            row.nameText = nameObj.AddComponent<TextMeshProUGUI>();
            row.nameText.fontSize = 14;

            // Size
            var sizeObj = new GameObject("ItemSize");
            sizeObj.transform.SetParent(row.root.transform, false);
            row.sizeText = sizeObj.AddComponent<TextMeshProUGUI>();
            row.sizeText.fontSize = 14;

            // Use button
            var useBtnObj = new GameObject("UseButton");
            useBtnObj.transform.SetParent(row.root.transform, false);
            useBtnObj.AddComponent<Image>();
            row.useButton = useBtnObj.AddComponent<Button>();
            var useTxtObj = new GameObject("Text");
            useTxtObj.transform.SetParent(useBtnObj.transform, false);
            row.useButtonText = useTxtObj.AddComponent<TextMeshProUGUI>();
            row.useButtonText.text = "Use";
            row.useButtonText.fontSize = 12;

            // Discard button
            var discardBtnObj = new GameObject("DiscardButton");
            discardBtnObj.transform.SetParent(row.root.transform, false);
            discardBtnObj.AddComponent<Image>();
            row.discardButton = discardBtnObj.AddComponent<Button>();
            var discardTxtObj = new GameObject("Text");
            discardTxtObj.transform.SetParent(discardBtnObj.transform, false);
            var discardTmp = discardTxtObj.AddComponent<TextMeshProUGUI>();
            discardTmp.text = "Discard";
            discardTmp.fontSize = 12;
        }

        // Wire buttons with captured index
        int capturedIndex = index;
        if (row.useButton != null)
            row.useButton.onClick.AddListener(() => OnUseItem(capturedIndex));
        if (row.discardButton != null)
            row.discardButton.onClick.AddListener(() => OnDiscard(capturedIndex));

        return row;
    }

    private void RefreshDisplay()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        int used = player.GetInventoryUsedCapacity();
        int max = player.maxInventoryCapacity;
        int overflow = used - max;

        if (titleText != null)
            titleText.text = $"{player.playerName} - Capacity Overflow";

        if (overflowText != null)
            overflowText.text = $"You are {overflow} unit{(overflow != 1 ? "s" : "")} over capacity!";

        if (capacityText != null)
            capacityText.text = $"Capacity: {used}/{max}";

        // Update each item row
        for (int i = 0; i < itemRows.Count && i < player.inventory.Count; i++)
        {
            var row = itemRows[i];
            var item = player.inventory[i];

            if (row.nameText != null)
                row.nameText.text = item.itemName;
            if (row.sizeText != null)
                row.sizeText.text = $"Size: {item.size}";

            // Use button: only usable for Beer (EP not max) and Blood Bag (HP not max)
            bool canUse = CanUseItem(player, item);
            if (row.useButton != null)
                row.useButton.interactable = canUse;

            if (row.useButtonText != null)
            {
                switch (item.effectType)
                {
                    case ItemEffectType.Beer:
                        row.useButtonText.text = $"Use (+1 EP)";
                        break;
                    case ItemEffectType.BloodBag:
                        row.useButtonText.text = $"Use (+1 HP)";
                        break;
                    default:
                        row.useButtonText.text = "Use";
                        break;
                }
            }
        }

        // Upgrade HP button: need 3 blood bags in inventory
        RefreshUpgradeButtons(player);
    }

    private void RefreshUpgradeButtons(PlayerData player)
    {
        int bloodBagCount = CountItemInInventory(player, ItemEffectType.BloodBag);
        int beerCount = CountItemInInventory(player, ItemEffectType.Beer);

        // HP upgrade: 3 blood bags -> +1 max HP
        if (upgradeHpButton != null)
        {
            bool canUpgradeHp = bloodBagCount >= 3;
            upgradeHpButton.interactable = canUpgradeHp;
            upgradeHpButton.gameObject.SetActive(bloodBagCount > 0);
        }
        if (upgradeHpText != null)
            upgradeHpText.text = $"Upgrade Max HP (3 Blood Bags) [{bloodBagCount}/3]";

        // EP upgrade: 4 beers -> +1 max EP
        if (upgradeEpButton != null)
        {
            bool canUpgradeEp = beerCount >= 4;
            upgradeEpButton.interactable = canUpgradeEp;
            upgradeEpButton.gameObject.SetActive(beerCount > 0);
        }
        if (upgradeEpText != null)
            upgradeEpText.text = $"Upgrade Max EP (4 Beers) [{beerCount}/4]";
    }

    // ---------------------------------------------------------
    // Actions
    // ---------------------------------------------------------

    public void OnUseItem(int index)
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        if (index < 0 || index >= player.inventory.Count) return;

        var item = player.inventory[index];

        if (!CanUseItem(player, item)) return;

        // Apply item effect
        switch (item.effectType)
        {
            case ItemEffectType.Beer:
                gm.Resources.ChangeResource(player, "ep", 1);
                break;

            case ItemEffectType.BloodBag:
                gm.Resources.ChangeResource(player, "hp", 1);
                break;

            default:
                // Other items cannot be "used" during overflow resolution
                return;
        }

        // Remove the item from inventory
        player.inventory.RemoveAt(index);

        EventBus.Publish(new ItemUsedEvent { playerId = currentPlayerId, item = item });
        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} used {item.itemName}",
            logType = GameLogType.Action
        });

        CheckAndClose();
    }

    public void OnUpgradeHp()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        // Consume 3 blood bags from inventory
        int removed = 0;
        for (int i = player.inventory.Count - 1; i >= 0 && removed < 3; i--)
        {
            if (player.inventory[i].effectType == ItemEffectType.BloodBag)
            {
                player.inventory.RemoveAt(i);
                removed++;
            }
        }

        if (removed < 3) return; // Should not happen if button was properly disabled

        // Increase max HP
        player.maxHp++;
        player.hp = Mathf.Min(player.hp, player.maxHp); // Ensure current HP does not exceed new max

        EventBus.Publish(new MaxStatUpgradedEvent
        {
            playerId = currentPlayerId,
            stat = "hp",
            newMax = player.maxHp
        });

        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} upgraded max HP to {player.maxHp}",
            logType = GameLogType.Action
        });

        CheckAndClose();
    }

    public void OnUpgradeEp()
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        // Consume 4 beers from inventory
        int removed = 0;
        for (int i = player.inventory.Count - 1; i >= 0 && removed < 4; i--)
        {
            if (player.inventory[i].effectType == ItemEffectType.Beer)
            {
                player.inventory.RemoveAt(i);
                removed++;
            }
        }

        if (removed < 4) return;

        // Increase max EP
        player.maxEp++;
        player.ep = Mathf.Min(player.ep, player.maxEp);

        EventBus.Publish(new MaxStatUpgradedEvent
        {
            playerId = currentPlayerId,
            stat = "ep",
            newMax = player.maxEp
        });

        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} upgraded max EP to {player.maxEp}",
            logType = GameLogType.Action
        });

        CheckAndClose();
    }

    public void OnDiscard(int index)
    {
        if (currentPlayerId < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentPlayerId];

        if (index < 0 || index >= player.inventory.Count) return;

        var discardedItem = player.inventory[index];
        player.inventory.RemoveAt(index);

        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} discarded {discardedItem.itemName}",
            logType = GameLogType.Action
        });

        CheckAndClose();
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    private bool CanUseItem(PlayerData player, ItemData item)
    {
        switch (item.effectType)
        {
            case ItemEffectType.Beer:
                return player.ep < player.maxEp;
            case ItemEffectType.BloodBag:
                return player.hp < player.maxHp;
            default:
                return false;
        }
    }

    private int CountItemInInventory(PlayerData player, ItemEffectType type)
    {
        int count = 0;
        foreach (var item in player.inventory)
        {
            if (item.effectType == type)
                count++;
        }
        return count;
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
}
