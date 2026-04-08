using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Full Battle UI: monster display, player stats, dice results, action buttons,
/// item usage, tame button, double damage, and battle log.
/// Reacts to EventBus battle events and drives BattleManager for player input.
/// </summary>
public class BattleUI : MonoBehaviour
{
    [Header("Root Panel")]
    [SerializeField] private GameObject battlePanel;

    [Header("Monster Display")]
    [SerializeField] private TextMeshProUGUI monsterNameText;
    [SerializeField] private TextMeshProUGUI monsterLevelText;
    [SerializeField] private TextMeshProUGUI monsterHPText;
    [SerializeField] private Slider monsterHPBar;
    [SerializeField] private TextMeshProUGUI monsterATTText;
    [SerializeField] private TextMeshProUGUI monsterEffectText;
    [SerializeField] private Image monsterSprite;

    [Header("Player Display")]
    [SerializeField] private TextMeshProUGUI playerNameText;
    [SerializeField] private TextMeshProUGUI playerHPText;
    [SerializeField] private Slider playerHPBar;
    [SerializeField] private TextMeshProUGUI playerEPText;
    [SerializeField] private TextMeshProUGUI playerAttackDiceText;
    [SerializeField] private TextMeshProUGUI playerDefenseDiceText;
    [SerializeField] private TextMeshProUGUI playerWeaponText;

    [Header("Dice Display")]
    [SerializeField] private Transform attackDiceContainer;
    [SerializeField] private Transform defenseDiceContainer;
    [SerializeField] private GameObject dicePrefab; // Prefab with TextMeshProUGUI child
    [SerializeField] private TextMeshProUGUI totalDamageText;

    [Header("Action Buttons")]
    [SerializeField] private Button attackButton;
    [SerializeField] private Button tameButton;
    [SerializeField] private Button doubleDamageButton;
    [SerializeField] private TextMeshProUGUI doubleDamageLabel;

    [Header("Item Buttons")]
    [SerializeField] private Transform itemButtonContainer;
    [SerializeField] private GameObject itemButtonPrefab; // Prefab with Button + TextMeshProUGUI

    [Header("Battle Log")]
    [SerializeField] private TextMeshProUGUI battleLogText;
    [SerializeField] private ScrollRect battleLogScrollRect;

    [Header("Result Overlay")]
    [SerializeField] private GameObject resultPanel;
    [SerializeField] private TextMeshProUGUI resultText;
    [SerializeField] private Button continueButton;

    [Header("Monster Selection")]
    [SerializeField] private GameObject monsterSelectionPanel;
    [SerializeField] private Button levelButton1;
    [SerializeField] private Button levelButton2;
    [SerializeField] private Button levelButton3;

    // State
    private BattleManager _battleManager;
    private int _currentPlayerId = -1;
    private bool _isActive;
    private List<GameObject> _spawnedDice = new List<GameObject>();
    private List<GameObject> _spawnedItemButtons = new List<GameObject>();

    private void OnEnable()
    {
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Subscribe<BattleStartedEvent>(OnBattleStarted);
        EventBus.Subscribe<DiceRolledEvent>(OnDiceRolled);
        EventBus.Subscribe<MonsterDamagedEvent>(OnMonsterDamaged);
        EventBus.Subscribe<PlayerDamagedEvent>(OnPlayerDamaged);
        EventBus.Subscribe<MonsterDefeatedEvent>(OnMonsterDefeated);
        EventBus.Subscribe<MonsterTamedEvent>(OnMonsterTamed);
        EventBus.Subscribe<BattleEndedEvent>(OnBattleEnded);
        EventBus.Subscribe<ItemUsedEvent>(OnItemUsed);

        // Action buttons
        if (attackButton != null)
            attackButton.onClick.AddListener(OnAttackClicked);
        if (tameButton != null)
            tameButton.onClick.AddListener(OnTameClicked);
        if (doubleDamageButton != null)
            doubleDamageButton.onClick.AddListener(OnDoubleDamageClicked);
        if (continueButton != null)
            continueButton.onClick.AddListener(OnContinueClicked);

        // Monster selection buttons
        if (levelButton1 != null)
            levelButton1.onClick.AddListener(() => OnMonsterLevelSelected(1));
        if (levelButton2 != null)
            levelButton2.onClick.AddListener(() => OnMonsterLevelSelected(2));
        if (levelButton3 != null)
            levelButton3.onClick.AddListener(() => OnMonsterLevelSelected(3));
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Unsubscribe<BattleStartedEvent>(OnBattleStarted);
        EventBus.Unsubscribe<DiceRolledEvent>(OnDiceRolled);
        EventBus.Unsubscribe<MonsterDamagedEvent>(OnMonsterDamaged);
        EventBus.Unsubscribe<PlayerDamagedEvent>(OnPlayerDamaged);
        EventBus.Unsubscribe<MonsterDefeatedEvent>(OnMonsterDefeated);
        EventBus.Unsubscribe<MonsterTamedEvent>(OnMonsterTamed);
        EventBus.Unsubscribe<BattleEndedEvent>(OnBattleEnded);
        EventBus.Unsubscribe<ItemUsedEvent>(OnItemUsed);

        if (attackButton != null)
            attackButton.onClick.RemoveListener(OnAttackClicked);
        if (tameButton != null)
            tameButton.onClick.RemoveListener(OnTameClicked);
        if (doubleDamageButton != null)
            doubleDamageButton.onClick.RemoveListener(OnDoubleDamageClicked);
        if (continueButton != null)
            continueButton.onClick.RemoveListener(OnContinueClicked);

        if (levelButton1 != null)
            levelButton1.onClick.RemoveAllListeners();
        if (levelButton2 != null)
            levelButton2.onClick.RemoveAllListeners();
        if (levelButton3 != null)
            levelButton3.onClick.RemoveAllListeners();
    }

    /// <summary>
    /// Called by BattlePhase to inject the BattleManager reference.
    /// </summary>
    public void SetBattleManager(BattleManager manager)
    {
        _battleManager = manager;
    }

    // ------------------------------------------------------------------
    // Phase Events
    // ------------------------------------------------------------------

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        if (e.newPhase == GamePhase.Battle)
        {
            ShowBattle();
        }
        else if (_isActive)
        {
            HideBattle();
        }
    }

    // ------------------------------------------------------------------
    // Battle Events
    // ------------------------------------------------------------------

    private void OnBattleStarted(BattleStartedEvent e)
    {
        _currentPlayerId = e.playerId;
        var state = _battleManager?.GetCurrentBattleState();
        if (state == null) return;

        var gm = GameManager.Instance;
        var player = gm.Players[e.playerId];

        // Hide monster selection, show combat UI
        SetMonsterSelectionVisible(false);

        // Update monster display
        UpdateMonsterDisplay(state);

        // Update player display
        UpdatePlayerDisplay(player);

        // Set up action buttons
        RefreshActionButtons(player, state);

        // Build item buttons
        RebuildItemButtons(player);

        // Clear dice display
        ClearDiceDisplay();

        // Clear battle log for this encounter
        if (battleLogText != null)
            battleLogText.text = "";

        // Flush existing log entries from state
        foreach (var logMsg in state.battleLog)
        {
            AppendBattleLog(logMsg);
        }

        // Hide result overlay
        if (resultPanel != null)
            resultPanel.SetActive(false);
    }

    private void OnDiceRolled(DiceRolledEvent e)
    {
        if (e.playerId != _currentPlayerId) return;

        var state = _battleManager?.GetCurrentBattleState();
        if (state == null) return;

        // Display attack dice
        ShowDiceResults(attackDiceContainer, state.lastAttackDice);

        // Display total damage
        if (totalDamageText != null)
            totalDamageText.text = $"Total Damage: {e.totalDamage}";

        // Update monster HP
        UpdateMonsterHP(state);
    }

    private void OnMonsterDamaged(MonsterDamagedEvent e)
    {
        var state = _battleManager?.GetCurrentBattleState();
        if (state == null) return;
        UpdateMonsterHP(state);
        FlushBattleLog(state);
    }

    private void OnPlayerDamaged(PlayerDamagedEvent e)
    {
        if (e.playerId != _currentPlayerId) return;

        var gm = GameManager.Instance;
        var player = gm.Players[e.playerId];
        UpdatePlayerDisplay(player);

        var state = _battleManager?.GetCurrentBattleState();
        if (state == null) return;

        // Show defense dice
        if (state.lastDefenseDice != null)
        {
            ShowDiceResults(defenseDiceContainer, state.lastDefenseDice);
        }

        FlushBattleLog(state);
        RefreshActionButtons(player, state);
        RebuildItemButtons(player);
    }

    private void OnMonsterDefeated(MonsterDefeatedEvent e)
    {
        if (e.playerId != _currentPlayerId) return;
        var state = _battleManager?.GetCurrentBattleState();
        if (state != null) FlushBattleLog(state);

        ShowResult(true, $"Victory! +{e.pointsEarned} points (Lv{e.monsterLevel} monster defeated)");
    }

    private void OnMonsterTamed(MonsterTamedEvent e)
    {
        if (e.playerId != _currentPlayerId) return;
        var state = _battleManager?.GetCurrentBattleState();
        if (state != null) FlushBattleLog(state);

        ShowResult(true, $"Monster tamed! New Lv{e.monsterLevel} pet acquired!");
    }

    private void OnBattleEnded(BattleEndedEvent e)
    {
        if (e.playerId != _currentPlayerId) return;
        var state = _battleManager?.GetCurrentBattleState();
        if (state != null) FlushBattleLog(state);

        // If the battle ended in defeat and no result is shown yet
        if (!e.victory && resultPanel != null && !resultPanel.activeSelf)
        {
            ShowResult(false, "Defeated! Retreating from battle...");
        }

        // Disable all action buttons
        SetActionButtonsInteractable(false);

        // If the battle manager has more battles pending, auto-continue for bots
        // For humans, the continue button will advance
        var gm = GameManager.Instance;
        var player = gm.Players[e.playerId];
        if (player.isBot)
        {
            // Bot battles resolve instantly; no need for continue button
        }
    }

    private void OnItemUsed(ItemUsedEvent e)
    {
        if (e.playerId != _currentPlayerId) return;

        var gm = GameManager.Instance;
        var player = gm.Players[e.playerId];
        var state = _battleManager?.GetCurrentBattleState();

        // Rebuild item buttons (item was consumed)
        RebuildItemButtons(player);

        if (state != null)
        {
            UpdateMonsterHP(state);
            RefreshActionButtons(player, state);
            FlushBattleLog(state);
        }
    }

    // ------------------------------------------------------------------
    // Monster Selection
    // ------------------------------------------------------------------

    /// <summary>
    /// Show monster level selection for the given human player.
    /// Called when BattleManager is waiting for monster level input.
    /// </summary>
    public void ShowMonsterSelection(int playerId)
    {
        _currentPlayerId = playerId;
        SetMonsterSelectionVisible(true);

        var gm = GameManager.Instance;
        var player = gm.Players[playerId];

        // Enable/disable level buttons based on EP
        if (levelButton1 != null)
            levelButton1.interactable = player.ep >= 2; // Lv1 costs 2 EP
        if (levelButton2 != null)
            levelButton2.interactable = player.ep >= 3; // Lv2 costs 3 EP
        if (levelButton3 != null)
            levelButton3.interactable = player.ep >= 4; // Lv3 costs 4 EP
    }

    private void OnMonsterLevelSelected(int level)
    {
        if (_battleManager == null) return;
        _battleManager.SelectMonsterLevel(_currentPlayerId, level);
    }

    // ------------------------------------------------------------------
    // Action Button Handlers
    // ------------------------------------------------------------------

    public void OnAttackClicked()
    {
        if (_battleManager == null || _currentPlayerId < 0) return;
        _battleManager.ProcessPlayerAttack(_currentPlayerId);
    }

    public void OnTameClicked()
    {
        if (_battleManager == null || _currentPlayerId < 0) return;
        _battleManager.ProcessTame(_currentPlayerId);
    }

    public void OnDoubleDamageClicked()
    {
        if (_battleManager == null || _currentPlayerId < 0) return;
        _battleManager.ProcessDoubleDamage(_currentPlayerId);
    }

    public void OnUseItemClicked(int inventoryIndex)
    {
        if (_battleManager == null || _currentPlayerId < 0) return;
        _battleManager.ProcessItemUse(_currentPlayerId, inventoryIndex);
    }

    private void OnContinueClicked()
    {
        if (resultPanel != null)
            resultPanel.SetActive(false);

        // The BattleManager automatically advances to the next battle.
        // If waiting for this player's monster selection, show it.
        if (_battleManager != null)
        {
            var state = _battleManager.GetCurrentBattleState();
            if (state != null && state.phase == BattlePhaseStep.MonsterSelection)
            {
                var gm = GameManager.Instance;
                var player = gm.Players[state.playerId];
                if (!player.isBot)
                {
                    ShowMonsterSelection(state.playerId);
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Display Updates
    // ------------------------------------------------------------------

    private void UpdateMonsterDisplay(FullBattleState state)
    {
        if (state.monster == null) return;

        if (monsterNameText != null)
            monsterNameText.text = state.monster.monsterName;
        if (monsterLevelText != null)
            monsterLevelText.text = $"Lv {state.monsterLevel}";
        if (monsterATTText != null)
            monsterATTText.text = $"ATT: {state.monsterATT}";
        if (monsterEffectText != null)
        {
            monsterEffectText.text = state.monster.effectType != MonsterEffectType.None
                ? state.monster.effectDescription
                : "";
        }
        if (monsterSprite != null && state.monster.sprite != null)
            monsterSprite.sprite = state.monster.sprite;

        UpdateMonsterHP(state);
    }

    private void UpdateMonsterHP(FullBattleState state)
    {
        int hp = Mathf.Max(0, state.monsterCurrentHP);
        if (monsterHPText != null)
            monsterHPText.text = $"HP: {hp}/{state.monsterMaxHP}";
        if (monsterHPBar != null)
        {
            monsterHPBar.maxValue = state.monsterMaxHP;
            monsterHPBar.value = hp;
        }
    }

    private void UpdatePlayerDisplay(PlayerData player)
    {
        if (playerNameText != null)
            playerNameText.text = player.playerName;
        if (playerWeaponText != null)
            playerWeaponText.text = player.weaponData.weaponName;
        if (playerHPText != null)
            playerHPText.text = $"HP: {player.hp}/{player.maxHp}";
        if (playerHPBar != null)
        {
            playerHPBar.maxValue = player.maxHp;
            playerHPBar.value = player.hp;
        }
        if (playerEPText != null)
            playerEPText.text = $"EP: {player.ep}/{player.maxEp}";
        if (playerAttackDiceText != null)
            playerAttackDiceText.text = $"ATK Dice: {player.currentAttackDice}";
        if (playerDefenseDiceText != null)
            playerDefenseDiceText.text = $"DEF Dice: {player.currentDefenseDice}";
    }

    private void RefreshActionButtons(PlayerData player, FullBattleState state)
    {
        bool isPlayerTurn = (state.phase == BattlePhaseStep.PlayerAction) && !player.isBot;

        // Attack button always available during player action
        if (attackButton != null)
            attackButton.interactable = isPlayerTurn;

        // Tame button: visible only for Chain/Whip when monster HP <= threshold
        bool canTame = isPlayerTurn
            && GameManager.Instance.Combat.CanTame(player, state.monsterCurrentHP);
        if (tameButton != null)
        {
            tameButton.gameObject.SetActive(
                player.weaponData.weaponName == "Chain" || player.weaponData.weaponName == "Whip");
            tameButton.interactable = canTame;
        }

        // Double damage button: Knife Lv1+ only, one-time per battle
        bool canDouble = isPlayerTurn
            && state.doubleDamageAvailable
            && !state.doubleDamageUsed;
        if (doubleDamageButton != null)
        {
            doubleDamageButton.gameObject.SetActive(
                player.weaponData.weaponName == "Knife" && player.GetCurrentPowerLevel() >= 1);
            doubleDamageButton.interactable = canDouble;
        }
        if (doubleDamageLabel != null)
        {
            doubleDamageLabel.text = state.doubleDamageUsed ? "Used" : "Double Damage";
        }
    }

    private void RebuildItemButtons(PlayerData player)
    {
        // Clear existing item buttons
        foreach (var btn in _spawnedItemButtons)
        {
            if (btn != null) Destroy(btn);
        }
        _spawnedItemButtons.Clear();

        if (itemButtonContainer == null || itemButtonPrefab == null) return;

        var state = _battleManager?.GetCurrentBattleState();
        bool isPlayerTurn = state != null
            && state.phase == BattlePhaseStep.PlayerAction
            && !player.isBot;

        for (int i = 0; i < player.inventory.Count; i++)
        {
            var item = player.inventory[i];

            // Only show usable battle items
            if (!IsBattleUsableItem(item.effectType)) continue;

            var btnObj = Instantiate(itemButtonPrefab, itemButtonContainer);
            _spawnedItemButtons.Add(btnObj);

            var label = btnObj.GetComponentInChildren<TextMeshProUGUI>();
            if (label != null)
            {
                label.text = GetItemDisplayName(item);
            }

            var button = btnObj.GetComponent<Button>();
            if (button != null)
            {
                int capturedIndex = i; // Capture for lambda
                button.onClick.AddListener(() => OnUseItemClicked(capturedIndex));
                button.interactable = isPlayerTurn;
            }
        }
    }

    private bool IsBattleUsableItem(ItemEffectType effect)
    {
        switch (effect)
        {
            case ItemEffectType.Grenade:
            case ItemEffectType.Bomb:
            case ItemEffectType.Dynamite:
            case ItemEffectType.Beer:
            case ItemEffectType.BloodBag:
            case ItemEffectType.FakeBlood:
                return true;
            default:
                return false;
        }
    }

    private string GetItemDisplayName(ItemData item)
    {
        switch (item.effectType)
        {
            case ItemEffectType.Grenade: return "Grenade (1 dmg)";
            case ItemEffectType.Bomb: return "Bomb (2 dmg)";
            case ItemEffectType.Dynamite: return "Dynamite (3 dmg)";
            case ItemEffectType.Beer: return "Beer (+1 EP)";
            case ItemEffectType.BloodBag: return "Blood Bag (+1 HP)";
            case ItemEffectType.FakeBlood: return "Fake Blood";
            default: return item.itemName;
        }
    }

    // ------------------------------------------------------------------
    // Dice Display
    // ------------------------------------------------------------------

    private void ClearDiceDisplay()
    {
        foreach (var die in _spawnedDice)
        {
            if (die != null) Destroy(die);
        }
        _spawnedDice.Clear();

        if (totalDamageText != null)
            totalDamageText.text = "";
    }

    private void ShowDiceResults(Transform container, int[] results)
    {
        if (container == null || dicePrefab == null || results == null) return;

        // Clear existing dice in this container
        var toRemove = new List<GameObject>();
        foreach (var die in _spawnedDice)
        {
            if (die != null && die.transform.parent == container)
                toRemove.Add(die);
        }
        foreach (var die in toRemove)
        {
            _spawnedDice.Remove(die);
            Destroy(die);
        }

        // Spawn new dice
        foreach (int result in results)
        {
            var dieObj = Instantiate(dicePrefab, container);
            _spawnedDice.Add(dieObj);

            var label = dieObj.GetComponentInChildren<TextMeshProUGUI>();
            if (label != null)
            {
                label.text = result.ToString();
            }
        }
    }

    // ------------------------------------------------------------------
    // Battle Log
    // ------------------------------------------------------------------

    /// <summary>
    /// Flush any new log entries from the battle state that haven't been displayed.
    /// </summary>
    private int _lastFlushedLogIndex = 0;

    private void FlushBattleLog(FullBattleState state)
    {
        if (state == null) return;
        for (int i = _lastFlushedLogIndex; i < state.battleLog.Count; i++)
        {
            AppendBattleLog(state.battleLog[i]);
        }
        _lastFlushedLogIndex = state.battleLog.Count;
    }

    private void AppendBattleLog(string message)
    {
        if (battleLogText == null) return;

        if (battleLogText.text.Length > 0)
            battleLogText.text += "\n";
        battleLogText.text += message;

        // Scroll to bottom
        if (battleLogScrollRect != null)
        {
            Canvas.ForceUpdateCanvases();
            battleLogScrollRect.verticalNormalizedPosition = 0f;
        }
    }

    // ------------------------------------------------------------------
    // Result Display
    // ------------------------------------------------------------------

    private void ShowResult(bool victory, string message)
    {
        if (resultPanel != null)
            resultPanel.SetActive(true);
        if (resultText != null)
        {
            resultText.text = message;
            resultText.color = victory ? Color.green : Color.red;
        }
        if (continueButton != null)
            continueButton.gameObject.SetActive(true);

        SetActionButtonsInteractable(false);
    }

    private void SetActionButtonsInteractable(bool interactable)
    {
        if (attackButton != null) attackButton.interactable = interactable;
        if (tameButton != null) tameButton.interactable = interactable;
        if (doubleDamageButton != null) doubleDamageButton.interactable = interactable;

        foreach (var btnObj in _spawnedItemButtons)
        {
            if (btnObj != null)
            {
                var btn = btnObj.GetComponent<Button>();
                if (btn != null) btn.interactable = interactable;
            }
        }
    }

    // ------------------------------------------------------------------
    // Show / Hide
    // ------------------------------------------------------------------

    public void ShowBattle()
    {
        _isActive = true;
        _lastFlushedLogIndex = 0;

        if (battlePanel != null)
            battlePanel.SetActive(true);
        if (resultPanel != null)
            resultPanel.SetActive(false);

        SetMonsterSelectionVisible(false);
        ClearDiceDisplay();

        if (battleLogText != null)
            battleLogText.text = "";
    }

    public void HideBattle()
    {
        _isActive = false;
        _currentPlayerId = -1;

        if (battlePanel != null)
            battlePanel.SetActive(false);
        if (monsterSelectionPanel != null)
            monsterSelectionPanel.SetActive(false);
        if (resultPanel != null)
            resultPanel.SetActive(false);

        ClearDiceDisplay();

        foreach (var btn in _spawnedItemButtons)
        {
            if (btn != null) Destroy(btn);
        }
        _spawnedItemButtons.Clear();
    }

    private void SetMonsterSelectionVisible(bool visible)
    {
        if (monsterSelectionPanel != null)
            monsterSelectionPanel.SetActive(visible);
    }

    // ------------------------------------------------------------------
    // Update (poll for monster selection prompt)
    // ------------------------------------------------------------------

    private void Update()
    {
        if (!_isActive || _battleManager == null) return;

        // Check if BattleManager is waiting for human input on monster selection
        var state = _battleManager.GetCurrentBattleState();
        if (state != null
            && state.phase == BattlePhaseStep.MonsterSelection
            && _battleManager.WaitingForPlayerInput)
        {
            var gm = GameManager.Instance;
            var player = gm.Players[state.playerId];
            if (!player.isBot && state.playerId != _currentPlayerId)
            {
                ShowMonsterSelection(state.playerId);
            }
            // Also show if we returned from a continue click and current player matches
            if (!player.isBot && monsterSelectionPanel != null && !monsterSelectionPanel.activeSelf)
            {
                ShowMonsterSelection(state.playerId);
            }
        }
    }
}
