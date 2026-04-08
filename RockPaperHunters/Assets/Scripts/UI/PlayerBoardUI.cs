using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Shows one player's stats, inventory, weapon track, and action buttons.
/// Each player gets their own instance. Reacts to EventBus events.
/// </summary>
public class PlayerBoardUI : MonoBehaviour
{
    [Header("Player Identity")]
    [SerializeField] private int playerId;
    [SerializeField] private TextMeshProUGUI playerNameText;
    [SerializeField] private Image playerColorBar;

    [Header("Stat Displays")]
    [SerializeField] private TextMeshProUGUI moneyText;
    [SerializeField] private TextMeshProUGUI expText;
    [SerializeField] private TextMeshProUGUI hpText;
    [SerializeField] private TextMeshProUGUI epText;
    [SerializeField] private TextMeshProUGUI scoreText;
    [SerializeField] private TextMeshProUGUI popularityText;
    [SerializeField] private TextMeshProUGUI beerText;
    [SerializeField] private TextMeshProUGUI bloodBagText;

    [Header("Weapon Track")]
    [SerializeField] private TextMeshProUGUI weaponNameText;
    [SerializeField] private TextMeshProUGUI attackDiceText;
    [SerializeField] private TextMeshProUGUI defenseDiceText;
    [SerializeField] private TextMeshProUGUI powerLevelText;
    [SerializeField] private TextMeshProUGUI weaponTrackPosText;

    [Header("Upgrade Progress")]
    [SerializeField] private TextMeshProUGUI epUpgradeProgressText; // "0/4 beer"
    [SerializeField] private TextMeshProUGUI hpUpgradeProgressText; // "0/3 blood bags"

    [Header("Inventory")]
    [SerializeField] private Transform inventoryContainer;
    [SerializeField] private TextMeshProUGUI capacityText; // "3/6"
    [SerializeField] private GameObject inventoryItemPrefab;

    [Header("Pets")]
    [SerializeField] private TextMeshProUGUI petsText;

    [Header("Action Buttons")]
    [SerializeField] private Button upgradeAttackButton;
    [SerializeField] private Button upgradeDefenseButton;
    [SerializeField] private Button restoreHPButton;
    [SerializeField] private Button restoreEPButton;
    [SerializeField] private Button addToHPUpgradeButton;
    [SerializeField] private Button addToEPUpgradeButton;

    public void SetPlayerId(int id)
    {
        playerId = id;
        UpdateAllStats();
    }

    private void OnEnable()
    {
        EventBus.Subscribe<ResourceChangedEvent>(OnResourceChanged);
        EventBus.Subscribe<ScoreChangedEvent>(OnScoreChanged);
        EventBus.Subscribe<WeaponUpgradedEvent>(OnWeaponUpgraded);
        EventBus.Subscribe<MaxStatUpgradedEvent>(OnMaxStatUpgraded);
        EventBus.Subscribe<PopularityChangedEvent>(OnPopularityChanged);
        EventBus.Subscribe<ItemPurchasedEvent>(OnItemPurchased);
        EventBus.Subscribe<PowerTrackAdvancedEvent>(OnPowerTrackAdvanced);
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<ResourceChangedEvent>(OnResourceChanged);
        EventBus.Unsubscribe<ScoreChangedEvent>(OnScoreChanged);
        EventBus.Unsubscribe<WeaponUpgradedEvent>(OnWeaponUpgraded);
        EventBus.Unsubscribe<MaxStatUpgradedEvent>(OnMaxStatUpgraded);
        EventBus.Unsubscribe<PopularityChangedEvent>(OnPopularityChanged);
        EventBus.Unsubscribe<ItemPurchasedEvent>(OnItemPurchased);
        EventBus.Unsubscribe<PowerTrackAdvancedEvent>(OnPowerTrackAdvanced);
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
    }

    private PlayerData GetPlayer()
    {
        var gm = GameManager.Instance;
        if (gm == null || playerId >= gm.Players.Count) return null;
        return gm.Players[playerId];
    }

    private void OnResourceChanged(ResourceChangedEvent e)
    {
        if (e.playerId != playerId) return;
        UpdateResourceDisplay(e.resourceName);
    }

    private void OnScoreChanged(ScoreChangedEvent e)
    {
        if (e.playerId != playerId) return;
        if (scoreText != null) scoreText.text = e.newScore.ToString();
    }

    private void OnWeaponUpgraded(WeaponUpgradedEvent e)
    {
        if (e.playerId != playerId) return;
        UpdateWeaponDisplay();
    }

    private void OnMaxStatUpgraded(MaxStatUpgradedEvent e)
    {
        if (e.playerId != playerId) return;
        UpdateAllStats();
    }

    private void OnPopularityChanged(PopularityChangedEvent e)
    {
        if (e.playerId != playerId) return;
        var player = GetPlayer();
        if (player == null) return;
        if (popularityText != null)
            popularityText.text = $"Pt:{player.pointToken} Rw:{player.rewardToken}";
    }

    private void OnItemPurchased(ItemPurchasedEvent e)
    {
        if (e.playerId != playerId) return;
        UpdateInventoryDisplay();
    }

    private void OnPowerTrackAdvanced(PowerTrackAdvancedEvent e)
    {
        if (e.playerId != playerId) return;
        UpdateWeaponDisplay();
    }

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        UpdateButtonStates();
    }

    public void UpdateAllStats()
    {
        var player = GetPlayer();
        if (player == null) return;

        if (playerNameText != null) playerNameText.text = player.playerName;

        // Color bar
        if (playerColorBar != null)
        {
            Color color;
            if (ColorUtility.TryParseHtmlString(player.color.hexCode, out color))
                playerColorBar.color = color;
        }

        // Resources
        if (moneyText != null) moneyText.text = $"{player.money}/{player.maxMoney}";
        if (expText != null) expText.text = $"{player.exp}/{player.maxExp}";
        if (hpText != null) hpText.text = $"{player.hp}/{player.maxHp}";
        if (epText != null) epText.text = $"{player.ep}/{player.maxEp}";
        if (scoreText != null) scoreText.text = player.score.ToString();
        if (beerText != null) beerText.text = player.beer.ToString();
        if (bloodBagText != null) bloodBagText.text = player.bloodBag.ToString();

        // Popularity
        if (popularityText != null)
            popularityText.text = $"Pt:{player.pointToken} Rw:{player.rewardToken}";

        // Upgrade progress
        if (epUpgradeProgressText != null)
            epUpgradeProgressText.text = $"{player.epUpgradeProgress}/4";
        if (hpUpgradeProgressText != null)
            hpUpgradeProgressText.text = $"{player.hpUpgradeProgress}/3";

        // Pets
        if (petsText != null)
            petsText.text = $"L1:{player.petsLevel1} L2:{player.petsLevel2} L3:{player.petsLevel3}";

        UpdateWeaponDisplay();
        UpdateInventoryDisplay();
        UpdateButtonStates();
    }

    private void UpdateResourceDisplay(string resource)
    {
        var player = GetPlayer();
        if (player == null) return;

        switch (resource)
        {
            case "money":
                if (moneyText != null) moneyText.text = $"{player.money}/{player.maxMoney}";
                break;
            case "exp":
                if (expText != null) expText.text = $"{player.exp}/{player.maxExp}";
                break;
            case "hp":
                if (hpText != null) hpText.text = $"{player.hp}/{player.maxHp}";
                break;
            case "ep":
                if (epText != null) epText.text = $"{player.ep}/{player.maxEp}";
                break;
            case "beer":
                if (beerText != null) beerText.text = player.beer.ToString();
                if (epUpgradeProgressText != null)
                    epUpgradeProgressText.text = $"{player.epUpgradeProgress}/4";
                break;
            case "bloodBag":
                if (bloodBagText != null) bloodBagText.text = player.bloodBag.ToString();
                if (hpUpgradeProgressText != null)
                    hpUpgradeProgressText.text = $"{player.hpUpgradeProgress}/3";
                break;
        }

        UpdateButtonStates();
    }

    private void UpdateWeaponDisplay()
    {
        var player = GetPlayer();
        if (player == null) return;

        if (weaponNameText != null) weaponNameText.text = player.weaponData.weaponName;
        if (attackDiceText != null) attackDiceText.text = $"ATK: {player.currentAttackDice}d";
        if (defenseDiceText != null) defenseDiceText.text = $"DEF: {player.currentDefenseDice}d";
        if (powerLevelText != null) powerLevelText.text = $"Lv{player.GetCurrentPowerLevel()}";
        if (weaponTrackPosText != null) weaponTrackPosText.text = $"Track: {player.powerTrackPosition}";
    }

    public void UpdateInventoryDisplay()
    {
        var player = GetPlayer();
        if (player == null) return;

        // Clear existing items
        if (inventoryContainer != null)
        {
            foreach (Transform child in inventoryContainer)
                Destroy(child.gameObject);

            // Spawn item entries
            foreach (var item in player.inventory)
            {
                if (inventoryItemPrefab != null)
                {
                    var obj = Instantiate(inventoryItemPrefab, inventoryContainer);
                    var label = obj.GetComponentInChildren<TextMeshProUGUI>();
                    if (label != null) label.text = $"{item.itemName} ({item.size})";
                }
            }
        }

        if (capacityText != null)
            capacityText.text = $"{player.GetInventoryUsedCapacity()}/{player.maxInventoryCapacity}";
    }

    private void UpdateButtonStates()
    {
        var player = GetPlayer();
        var gm = GameManager.Instance;
        if (player == null || gm == null) return;

        bool isPlayerTurn = !player.isBot; // Bots can't use buttons
        bool canAct = isPlayerTurn && gm.StateMachine.CurrentPhase != GamePhase.Selection;

        // Upgrade attack: needs enough EXP
        if (upgradeAttackButton != null)
            upgradeAttackButton.interactable = canAct && player.exp >= player.weaponData.reqExpAttack;

        // Upgrade defense: needs enough EXP
        if (upgradeDefenseButton != null)
            upgradeDefenseButton.interactable = canAct && player.exp >= player.weaponData.reqExpDefense;

        // Restore HP: needs blood bag in inventory and HP < max
        if (restoreHPButton != null)
        {
            bool hasBB = false;
            foreach (var item in player.inventory)
                if (item.effectType == ItemEffectType.BloodBag) { hasBB = true; break; }
            restoreHPButton.interactable = canAct && hasBB && player.hp < player.maxHp;
        }

        // Restore EP: needs beer in inventory and EP < max
        if (restoreEPButton != null)
        {
            bool hasBeer = false;
            foreach (var item in player.inventory)
                if (item.effectType == ItemEffectType.Beer) { hasBeer = true; break; }
            restoreEPButton.interactable = canAct && hasBeer && player.ep < player.maxEp;
        }

        // HP upgrade: needs blood bags and maxHP < 10
        if (addToHPUpgradeButton != null)
            addToHPUpgradeButton.interactable = canAct && player.bloodBag > 0 && player.maxHp < 10;

        // EP upgrade: needs beer and maxEP < 10
        if (addToEPUpgradeButton != null)
            addToEPUpgradeButton.interactable = canAct && player.beer > 0 && player.maxEp < 10;
    }

    // Button click handlers (wire in Inspector)
    public void OnUpgradeAttackClicked()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Weapons.TryUpgradeAttack(GetPlayer());
    }

    public void OnUpgradeDefenseClicked()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Weapons.TryUpgradeDefense(GetPlayer());
    }

    public void OnRestoreHPClicked()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Scoring.TryRestoreHP(GetPlayer());
    }

    public void OnRestoreEPClicked()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Scoring.TryRestoreEP(GetPlayer());
    }

    public void OnAddToHPUpgrade()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Scoring.TryUpgradeHP(GetPlayer());
    }

    public void OnAddToEPUpgrade()
    {
        var gm = GameManager.Instance;
        if (gm != null) gm.Scoring.TryUpgradeEP(GetPlayer());
    }
}
