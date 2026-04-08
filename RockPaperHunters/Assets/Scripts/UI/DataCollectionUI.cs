using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// Data collection panel for running automated bot-only games in batch.
/// Creates GameManager configs with all bots, runs simplified game loops,
/// records results via CSVExporter, and exports to CSV file.
/// Maps from game.js data collection system (lines ~11803-11947).
/// </summary>
public class DataCollectionUI : MonoBehaviour
{
    // ------------------------------------------------------------------
    // Inspector References
    // ------------------------------------------------------------------

    [Header("Configuration")]
    [SerializeField] private TMP_InputField gameCountInput;
    [SerializeField] private TMP_Dropdown playerCountDropdown;

    [Header("Controls")]
    [SerializeField] private Button startButton;
    [SerializeField] private Button stopButton;
    [SerializeField] private Button exportButton;
    [SerializeField] private Button backButton;

    [Header("Progress")]
    [SerializeField] private Slider progressBar;
    [SerializeField] private TextMeshProUGUI progressText;
    [SerializeField] private TextMeshProUGUI summaryText;

    [Header("Data")]
    [SerializeField] private WeaponData[] availableWeapons;

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------

    private CSVExporter exporter = new CSVExporter();
    private bool isRunning;
    private bool stopRequested;
    private int totalGames;
    private int completedGames;
    private int totalPlayerRecords;
    private Coroutine runCoroutine;

    // Player count options: indices map to 2, 3, 4
    private static readonly int[] PlayerCountOptions = { 2, 3, 4 };

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    private void Start()
    {
        // Button listeners
        startButton.onClick.AddListener(OnStartClicked);
        stopButton.onClick.AddListener(OnStopClicked);
        exportButton.onClick.AddListener(OnExportClicked);
        if (backButton != null)
            backButton.onClick.AddListener(OnBackClicked);

        // Populate player count dropdown
        playerCountDropdown.ClearOptions();
        playerCountDropdown.AddOptions(new List<string> { "2 Players", "3 Players", "4 Players" });
        playerCountDropdown.value = 0;

        // Default game count
        gameCountInput.text = "100";

        // Initial UI state
        stopButton.interactable = false;
        exportButton.interactable = false;
        progressBar.value = 0;
        progressText.text = "";
        summaryText.text = "";
    }

    // ------------------------------------------------------------------
    // Controls
    // ------------------------------------------------------------------

    private void OnStartClicked()
    {
        // Parse game count
        int gameCount;
        if (!int.TryParse(gameCountInput.text, out gameCount))
        {
            summaryText.text = "Invalid game count. Enter a number between 1 and 1000.";
            return;
        }
        gameCount = Mathf.Clamp(gameCount, 1, 1000);

        int playerCount = PlayerCountOptions[playerCountDropdown.value];

        // Reset state
        exporter.Clear();
        completedGames = 0;
        totalGames = gameCount;
        totalPlayerRecords = 0;
        stopRequested = false;
        isRunning = true;

        // Update UI
        startButton.interactable = false;
        stopButton.interactable = true;
        exportButton.interactable = false;
        gameCountInput.interactable = false;
        playerCountDropdown.interactable = false;
        progressBar.value = 0;
        summaryText.text = "";

        // Start batch coroutine
        runCoroutine = StartCoroutine(RunBatchGames(gameCount, playerCount));
    }

    private void OnStopClicked()
    {
        stopRequested = true;
        stopButton.interactable = false;
    }

    private void OnExportClicked()
    {
        if (exporter.RecordCount == 0)
        {
            summaryText.text = "No data to export.";
            return;
        }

        exporter.ExportToFile();
        summaryText.text += "\nCSV exported to Desktop.";
    }

    private void OnBackClicked()
    {
        if (isRunning)
        {
            stopRequested = true;
            if (runCoroutine != null)
                StopCoroutine(runCoroutine);
            isRunning = false;
        }
        gameObject.SetActive(false);
    }

    // ------------------------------------------------------------------
    // Batch Game Runner
    // ------------------------------------------------------------------

    private IEnumerator RunBatchGames(int gameCount, int playerCount)
    {
        for (int gameId = 1; gameId <= gameCount; gameId++)
        {
            if (stopRequested) break;

            // Update progress
            completedGames = gameId - 1;
            progressBar.value = (float)completedGames / totalGames;
            progressText.text = $"Game {gameId} / {totalGames}";

            // Run one automated game
            RunSingleGame(gameId, playerCount);

            // Record data
            if (GameManager.Instance != null)
            {
                exporter.RecordGame(GameManager.Instance, gameId);
                totalPlayerRecords += playerCount;
            }

            completedGames = gameId;
            progressBar.value = (float)completedGames / totalGames;

            // Yield every few games to keep UI responsive
            if (gameId % 5 == 0)
            {
                yield return null;
            }
        }

        // Finished
        isRunning = false;
        startButton.interactable = true;
        stopButton.interactable = false;
        exportButton.interactable = exporter.RecordCount > 0;
        gameCountInput.interactable = true;
        playerCountDropdown.interactable = true;

        progressBar.value = 1f;
        progressText.text = $"Game {completedGames} / {totalGames}";
        summaryText.text = $"Collected data for {completedGames} games, {totalPlayerRecords} player records.";
    }

    // ------------------------------------------------------------------
    // Single Automated Game
    // ------------------------------------------------------------------

    private void RunSingleGame(int gameId, int playerCount)
    {
        var gm = GameManager.Instance;
        if (gm == null)
        {
            Debug.LogError("DataCollectionUI: GameManager.Instance is null.");
            return;
        }

        // Build all-bot player setups with random weapons
        var setups = BuildBotSetups(playerCount);

        // Start new game
        gm.StartNewGame(playerCount, GameMode.Simultaneous, setups);

        // Run game loop until GameOver (max 100 rounds safety)
        int maxRounds = 100;
        int roundCount = 0;

        while (gm.StateMachine.CurrentPhase != GamePhase.GameOver && roundCount < maxRounds)
        {
            roundCount++;
            RunOneRound(gm);
        }

        // If we hit max rounds, force GameOver
        if (gm.StateMachine.CurrentPhase != GamePhase.GameOver)
        {
            gm.StateMachine.TransitionTo(GamePhase.GameOver, gm);
        }
    }

    private void RunOneRound(GameManager gm)
    {
        // --- Selection Phase ---
        // All bots select their locations
        foreach (var bot in gm.Bots)
        {
            var player = gm.Players[bot.PlayerId];
            player.selectedHunterCard = bot.SelectHunterLocation(gm);
            player.selectedApprenticeCard = bot.SelectApprenticeLocation(gm);
            gm.PlayerCompletionStatus[player.id] = true;
        }

        // --- Distribution Phase ---
        // Place tokens
        foreach (var player in gm.Players)
        {
            if (player.selectedHunterCard.HasValue)
                player.hunterLocation = player.selectedHunterCard.Value;
            if (player.selectedApprenticeCard.HasValue)
                player.apprenticeLocation = player.selectedApprenticeCard.Value;
        }

        // Update popularity
        foreach (var player in gm.Players)
        {
            gm.Popularity.UpdatePopularity(player);
            gm.Popularity.CheckPlazaAndAloneBonuses(player);
        }

        // Distribute normal resources
        gm.Resources.DistributeNormalResources();

        // --- Station Phase ---
        var stationHunters = gm.GetHuntersAtLocation(LocationId.Station);
        if (stationHunters.Count > 0)
        {
            int stationTokenCount = gm.CountTokensAtLocation(LocationId.Station);
            int[] rewards;
            switch (gm.PlayerCount)
            {
                case 2: rewards = gm.config.rewardScale2Players; break;
                case 3: rewards = gm.config.rewardScale3Players; break;
                case 4: rewards = gm.config.rewardScale4Players; break;
                default: rewards = gm.config.rewardScale2Players; break;
            }
            int densityIndex = Mathf.Clamp(stationTokenCount - 1, 0, rewards.Length - 1);
            int rewardAmount = rewards[densityIndex];

            foreach (var player in stationHunters)
            {
                // Bot picks resource with lowest ratio
                ResourceType choice = BotChooseStationResource(player);
                gm.Resources.ApplyResource(player, choice, rewardAmount);
            }
        }

        // --- Store Phase ---
        foreach (var bot in gm.Bots)
        {
            bot.DoShopping(gm);
        }

        // --- Battle Phase ---
        var forestHunters = gm.GetHuntersAtLocation(LocationId.Forest);
        if (forestHunters.Count > 0)
        {
            // Sort by score ascending
            forestHunters.Sort((a, b) =>
            {
                int cmp = a.score.CompareTo(b.score);
                if (cmp != 0) return cmp;
                return a.weaponData.priority.CompareTo(b.weaponData.priority);
            });

            // Use BattleManager to auto-resolve all bot battles
            var battleManager = new BattleManager(gm);
            battleManager.StartBattlePhase();

            // BattleManager runs bot battles synchronously in StartBattlePhase -> StartNextBattle
            // since all players are bots, it completes immediately
        }

        // --- Next Round ---
        // Check win condition
        if (gm.CheckWinCondition())
        {
            gm.StateMachine.TransitionTo(GamePhase.GameOver, gm);
            return;
        }

        // Rotate dummy tokens
        gm.RotateDummyTokens();

        // Advance round
        gm.AdvanceRound();

        // Apply round-start weapon powers
        gm.Weapons.ApplyRoundStartPowers();

        // Update bot stages
        foreach (var bot in gm.Bots)
        {
            bot.UpdateStage(gm.Players[bot.PlayerId]);
        }

        // Reset for next round
        foreach (var player in gm.Players)
        {
            player.hunterLocation = null;
            player.apprenticeLocation = null;
            player.selectedHunterCard = null;
            player.selectedApprenticeCard = null;
        }

        gm.ResetPlayerCompletionStatus();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private List<PlayerSetup> BuildBotSetups(int playerCount)
    {
        var setups = new List<PlayerSetup>();
        var usedWeapons = new HashSet<string>();

        // Shuffle weapons
        var shuffled = new List<WeaponData>(availableWeapons);
        for (int i = shuffled.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            var temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }

        int weaponIdx = 0;
        string[] colorNames = { "Red", "Blue", "Green", "Purple", "Orange", "Teal" };
        string[] colorHexes = { "#E74C3C", "#3498DB", "#2ECC71", "#9B59B6", "#E67E22", "#1ABC9C" };

        for (int i = 0; i < playerCount; i++)
        {
            var setup = new PlayerSetup();
            setup.playerName = $"Bot {i + 1}";
            setup.isBot = true;
            setup.color = new PlayerColor(colorNames[i % colorNames.Length], colorHexes[i % colorHexes.Length]);

            // Assign unique random weapon
            while (weaponIdx < shuffled.Count && usedWeapons.Contains(shuffled[weaponIdx].weaponName))
                weaponIdx++;

            if (weaponIdx < shuffled.Count)
            {
                setup.weaponName = shuffled[weaponIdx].weaponName;
                usedWeapons.Add(setup.weaponName);
                weaponIdx++;
            }
            else
            {
                setup.weaponName = shuffled[0].weaponName;
            }

            setups.Add(setup);
        }

        return setups;
    }

    private ResourceType BotChooseStationResource(PlayerData player)
    {
        float moneyRatio = (float)player.money / player.maxMoney;
        float expRatio = (float)player.exp / player.maxExp;
        float hpRatio = (float)player.hp / player.maxHp;
        float epRatio = (float)player.ep / player.maxEp;

        float minRatio = Mathf.Min(moneyRatio, Mathf.Min(expRatio, Mathf.Min(hpRatio, epRatio)));

        if (minRatio == moneyRatio) return ResourceType.Money;
        if (minRatio == expRatio) return ResourceType.Exp;
        if (minRatio == epRatio) return ResourceType.Beer;
        return ResourceType.BloodBag;
    }
}
