using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Local lobby UI: create room (player count, human count, timer), host preferences,
/// waiting room with player list and ready system, join room placeholder.
/// Maps from game.js lobby flow. Online/Steam networking to be added later.
/// </summary>
public class LobbyUI : MonoBehaviour
{
    // ------------------------------------------------------------------
    // Panels
    // ------------------------------------------------------------------

    [Header("Panels")]
    [SerializeField] private GameObject mainLobbyPanel;
    [SerializeField] private GameObject createRoomPanel;
    [SerializeField] private GameObject joinRoomPanel;
    [SerializeField] private GameObject waitingRoomPanel;

    // ------------------------------------------------------------------
    // Main Lobby (Create / Join / Back)
    // ------------------------------------------------------------------

    [Header("Main Lobby")]
    [SerializeField] private Button createRoomButton;
    [SerializeField] private Button joinRoomButton;
    [SerializeField] private Button backToMenuButton;

    // ------------------------------------------------------------------
    // Create Room Settings
    // ------------------------------------------------------------------

    [Header("Create Room - Game Settings")]
    [SerializeField] private Button[] playerCountButtons;   // 2, 3, 4
    [SerializeField] private TextMeshProUGUI playerCountLabel;
    [SerializeField] private TMP_Dropdown humanCountDropdown;
    [SerializeField] private TMP_Dropdown timerDropdown;

    [Header("Create Room - Host Preferences")]
    [SerializeField] private TMP_InputField hostNameInput;
    [SerializeField] private TMP_Dropdown hostColorDropdown;
    [SerializeField] private TMP_Dropdown hostWeaponDropdown;

    [Header("Create Room - Buttons")]
    [SerializeField] private Button createConfirmButton;
    [SerializeField] private Button createBackButton;

    // ------------------------------------------------------------------
    // Join Room
    // ------------------------------------------------------------------

    [Header("Join Room")]
    [SerializeField] private TMP_InputField roomCodeInput;
    [SerializeField] private TextMeshProUGUI joinErrorText;
    [SerializeField] private Button joinConfirmButton;
    [SerializeField] private Button joinBackButton;

    // ------------------------------------------------------------------
    // Waiting Room
    // ------------------------------------------------------------------

    [Header("Waiting Room")]
    [SerializeField] private TextMeshProUGUI roomCodeDisplay;
    [SerializeField] private Transform playerListContainer;
    [SerializeField] private GameObject playerListEntryPrefab;
    [SerializeField] private Button readyButton;
    [SerializeField] private TextMeshProUGUI readyButtonText;
    [SerializeField] private Button startGameButton;
    [SerializeField] private Button waitingBackButton;

    // ------------------------------------------------------------------
    // Data
    // ------------------------------------------------------------------

    [Header("Data")]
    [SerializeField] private WeaponData[] availableWeapons;

    // ------------------------------------------------------------------
    // Color definitions (matching GameManager.AvailableColors)
    // ------------------------------------------------------------------

    private static readonly string[] ColorNames = { "Red", "Blue", "Green", "Purple", "Orange", "Teal" };
    private static readonly string[] ColorHexCodes = { "#E74C3C", "#3498DB", "#2ECC71", "#9B59B6", "#E67E22", "#1ABC9C" };

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------

    private int selectedPlayerCount = 2;
    private int selectedHumanCount = 1;
    private int selectedTimerSeconds = 60;
    private bool isHost = true;
    private bool isReady;

    // Waiting room player data
    private List<LobbyPlayer> lobbyPlayers = new List<LobbyPlayer>();
    private List<GameObject> playerListEntries = new List<GameObject>();

    // Timer options: value in seconds, 0 = disabled
    private static readonly int[] TimerOptions = { 30, 60, 120, 180, 0 };
    private static readonly string[] TimerLabels = { "30s", "60s", "120s", "180s", "Disabled" };

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    private void Start()
    {
        // Main lobby buttons
        createRoomButton.onClick.AddListener(ShowCreateRoom);
        joinRoomButton.onClick.AddListener(ShowJoinRoom);
        backToMenuButton.onClick.AddListener(BackToMainMenu);

        // Create room buttons
        createConfirmButton.onClick.AddListener(OnCreateRoomConfirmed);
        createBackButton.onClick.AddListener(ShowMainLobby);

        // Player count buttons
        for (int i = 0; i < playerCountButtons.Length; i++)
        {
            int count = i + 2;
            playerCountButtons[i].onClick.AddListener(() => SetPlayerCount(count));
        }

        // Join room buttons
        joinConfirmButton.onClick.AddListener(OnJoinRoomConfirmed);
        joinBackButton.onClick.AddListener(ShowMainLobby);

        // Waiting room buttons
        readyButton.onClick.AddListener(OnReadyClicked);
        startGameButton.onClick.AddListener(OnStartGameClicked);
        waitingBackButton.onClick.AddListener(LeaveWaitingRoom);

        // Populate dropdowns
        PopulateColorDropdown();
        PopulateWeaponDropdown();
        PopulateTimerDropdown();

        // Set defaults
        hostNameInput.text = "Player 1";

        ShowMainLobby();
    }

    // ------------------------------------------------------------------
    // Panel Navigation
    // ------------------------------------------------------------------

    private void ShowMainLobby()
    {
        mainLobbyPanel.SetActive(true);
        createRoomPanel.SetActive(false);
        joinRoomPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
    }

    private void ShowCreateRoom()
    {
        mainLobbyPanel.SetActive(false);
        createRoomPanel.SetActive(true);
        joinRoomPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);

        isHost = true;
        SetPlayerCount(2);
    }

    private void ShowJoinRoom()
    {
        mainLobbyPanel.SetActive(false);
        createRoomPanel.SetActive(false);
        joinRoomPanel.SetActive(true);
        waitingRoomPanel.SetActive(false);

        isHost = false;
        roomCodeInput.text = "";
        if (joinErrorText != null)
            joinErrorText.text = "";
    }

    private void ShowWaitingRoom()
    {
        mainLobbyPanel.SetActive(false);
        createRoomPanel.SetActive(false);
        joinRoomPanel.SetActive(false);
        waitingRoomPanel.SetActive(true);

        isReady = false;
        UpdateReadyButtonVisual();
        UpdateStartButtonState();
    }

    private void BackToMainMenu()
    {
        SceneManager.LoadScene("MainMenu");
    }

    // ------------------------------------------------------------------
    // Create Room Setup
    // ------------------------------------------------------------------

    private void SetPlayerCount(int count)
    {
        selectedPlayerCount = count;
        playerCountLabel.text = $"{count} Players";

        // Highlight selected button
        for (int i = 0; i < playerCountButtons.Length; i++)
        {
            var colors = playerCountButtons[i].colors;
            colors.normalColor = (i + 2 == count) ? new Color(0.2f, 0.6f, 0.9f) : Color.white;
            playerCountButtons[i].colors = colors;
        }

        // Update human count dropdown: options from 1 to playerCount
        UpdateHumanCountDropdown();
    }

    private void UpdateHumanCountDropdown()
    {
        humanCountDropdown.ClearOptions();
        var options = new List<string>();
        for (int i = 1; i <= selectedPlayerCount; i++)
        {
            options.Add(i.ToString());
        }
        humanCountDropdown.AddOptions(options);
        humanCountDropdown.value = 0; // Default: 1 human
        selectedHumanCount = 1;

        humanCountDropdown.onValueChanged.RemoveAllListeners();
        humanCountDropdown.onValueChanged.AddListener((val) =>
        {
            selectedHumanCount = val + 1;
        });
    }

    private void PopulateColorDropdown()
    {
        hostColorDropdown.ClearOptions();
        hostColorDropdown.AddOptions(new List<string>(ColorNames));
    }

    private void PopulateWeaponDropdown()
    {
        var options = new List<string> { "Random" };
        if (availableWeapons != null)
        {
            foreach (var w in availableWeapons)
            {
                options.Add(w.weaponName);
            }
        }
        hostWeaponDropdown.ClearOptions();
        hostWeaponDropdown.AddOptions(options);
    }

    private void PopulateTimerDropdown()
    {
        timerDropdown.ClearOptions();
        timerDropdown.AddOptions(new List<string>(TimerLabels));
        timerDropdown.value = 1; // Default: 60s
        selectedTimerSeconds = 60;

        timerDropdown.onValueChanged.RemoveAllListeners();
        timerDropdown.onValueChanged.AddListener((val) =>
        {
            selectedTimerSeconds = TimerOptions[val];
        });
    }

    // ------------------------------------------------------------------
    // Create Room -> Waiting Room
    // ------------------------------------------------------------------

    private void OnCreateRoomConfirmed()
    {
        isHost = true;

        // Build lobby player list
        lobbyPlayers.Clear();

        string hostName = string.IsNullOrWhiteSpace(hostNameInput.text) ? "Player 1" : hostNameInput.text;
        int colorIndex = hostColorDropdown.value;
        int weaponIndex = hostWeaponDropdown.value;
        string weaponName = weaponIndex == 0 ? "Random" : availableWeapons[weaponIndex - 1].weaponName;

        // Add host as first player
        lobbyPlayers.Add(new LobbyPlayer
        {
            playerName = hostName,
            colorName = ColorNames[colorIndex],
            colorHex = ColorHexCodes[colorIndex],
            weaponName = weaponName,
            isBot = false,
            isReady = false,
            isHost = true
        });

        // Add other human slots (unready)
        for (int i = 1; i < selectedHumanCount; i++)
        {
            lobbyPlayers.Add(new LobbyPlayer
            {
                playerName = $"Player {i + 1}",
                colorName = ColorNames[(colorIndex + i) % ColorNames.Length],
                colorHex = ColorHexCodes[(colorIndex + i) % ColorHexCodes.Length],
                weaponName = "Random",
                isBot = false,
                isReady = false,
                isHost = false
            });
        }

        // Add bot slots (auto-ready)
        int botCount = selectedPlayerCount - selectedHumanCount;
        for (int i = 0; i < botCount; i++)
        {
            int botColorIdx = (colorIndex + selectedHumanCount + i) % ColorNames.Length;
            lobbyPlayers.Add(new LobbyPlayer
            {
                playerName = $"Bot {i + 1}",
                colorName = ColorNames[botColorIdx],
                colorHex = ColorHexCodes[botColorIdx],
                weaponName = "Random",
                isBot = true,
                isReady = true,
                isHost = false
            });
        }

        // Generate room code (placeholder for online)
        string roomCode = GenerateRoomCode();
        if (roomCodeDisplay != null)
            roomCodeDisplay.text = $"Room: {roomCode}";

        ShowWaitingRoom();
        RefreshPlayerList();
    }

    // ------------------------------------------------------------------
    // Join Room -> Waiting Room
    // ------------------------------------------------------------------

    private void OnJoinRoomConfirmed()
    {
        string code = roomCodeInput.text.Trim().ToUpper();
        if (string.IsNullOrEmpty(code) || code.Length != 4)
        {
            if (joinErrorText != null)
                joinErrorText.text = "Please enter a valid 4-character room code.";
            return;
        }

        // For local mode, joining just navigates to waiting room with placeholder data.
        // Online joining will be implemented with Steam networking.
        isHost = false;

        lobbyPlayers.Clear();
        lobbyPlayers.Add(new LobbyPlayer
        {
            playerName = "Host",
            colorName = ColorNames[0],
            colorHex = ColorHexCodes[0],
            weaponName = "Random",
            isBot = false,
            isReady = true,
            isHost = true
        });
        lobbyPlayers.Add(new LobbyPlayer
        {
            playerName = "Player 2",
            colorName = ColorNames[1],
            colorHex = ColorHexCodes[1],
            weaponName = "Random",
            isBot = false,
            isReady = false,
            isHost = false
        });

        if (roomCodeDisplay != null)
            roomCodeDisplay.text = $"Room: {code}";

        ShowWaitingRoom();
        RefreshPlayerList();
    }

    // ------------------------------------------------------------------
    // Waiting Room
    // ------------------------------------------------------------------

    private void RefreshPlayerList()
    {
        // Clear existing entries
        foreach (var entry in playerListEntries)
        {
            if (entry != null) Destroy(entry);
        }
        playerListEntries.Clear();

        // Create entries for each player
        foreach (var lp in lobbyPlayers)
        {
            if (playerListEntryPrefab == null || playerListContainer == null) continue;

            var entryObj = Instantiate(playerListEntryPrefab, playerListContainer);
            playerListEntries.Add(entryObj);

            // Try to find text components in the prefab
            var texts = entryObj.GetComponentsInChildren<TextMeshProUGUI>();
            if (texts.Length >= 1)
            {
                string statusIcon = lp.isReady ? "<color=green>\u25CF</color>" : "<color=red>\u25CF</color>";
                string hostTag = lp.isHost ? " [Host]" : "";
                string botTag = lp.isBot ? " (Bot)" : "";

                Color color;
                ColorUtility.TryParseHtmlString(lp.colorHex, out color);

                texts[0].text = $"{statusIcon} <color={lp.colorHex}>{lp.playerName}</color>{hostTag}{botTag} - {lp.weaponName}";
            }
        }

        UpdateStartButtonState();
    }

    public void OnReadyClicked()
    {
        isReady = !isReady;
        UpdateReadyButtonVisual();

        // Update the local player's ready state in the lobby list
        // In local mode, find the non-host human or the host
        foreach (var lp in lobbyPlayers)
        {
            if (isHost && lp.isHost)
            {
                lp.isReady = isReady;
                break;
            }
            else if (!isHost && !lp.isHost && !lp.isBot)
            {
                lp.isReady = isReady;
                break;
            }
        }

        RefreshPlayerList();
    }

    private void UpdateReadyButtonVisual()
    {
        if (readyButtonText != null)
        {
            readyButtonText.text = isReady ? "Not Ready" : "Ready";
        }

        var btnColors = readyButton.colors;
        btnColors.normalColor = isReady ? new Color(0.8f, 0.3f, 0.3f) : new Color(0.2f, 0.7f, 0.3f);
        readyButton.colors = btnColors;
    }

    private void UpdateStartButtonState()
    {
        // Start button only visible for host
        startGameButton.gameObject.SetActive(isHost);

        if (!isHost) return;

        // Enable only when all players are ready
        bool allReady = true;
        foreach (var lp in lobbyPlayers)
        {
            if (!lp.isReady)
            {
                allReady = false;
                break;
            }
        }

        startGameButton.interactable = allReady;
    }

    public void OnStartGameClicked()
    {
        if (!isHost) return;

        // Verify all ready
        foreach (var lp in lobbyPlayers)
        {
            if (!lp.isReady) return;
        }

        // Build PlayerSetup list
        var setups = new List<PlayerSetup>();
        var usedWeapons = new HashSet<string>();

        // Build a shuffled list for random weapon assignment
        var shuffledWeapons = new List<WeaponData>();
        if (availableWeapons != null)
            shuffledWeapons.AddRange(availableWeapons);
        for (int i = shuffledWeapons.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            var temp = shuffledWeapons[i];
            shuffledWeapons[i] = shuffledWeapons[j];
            shuffledWeapons[j] = temp;
        }
        int randomIdx = 0;

        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            var lp = lobbyPlayers[i];
            var setup = new PlayerSetup();
            setup.playerName = lp.playerName;
            setup.isBot = lp.isBot;

            // Color
            for (int c = 0; c < ColorNames.Length; c++)
            {
                if (ColorNames[c] == lp.colorName)
                {
                    setup.color = new PlayerColor(ColorNames[c], ColorHexCodes[c]);
                    break;
                }
            }

            // Weapon
            if (lp.weaponName == "Random")
            {
                while (randomIdx < shuffledWeapons.Count &&
                       usedWeapons.Contains(shuffledWeapons[randomIdx].weaponName))
                {
                    randomIdx++;
                }
                if (randomIdx < shuffledWeapons.Count)
                {
                    setup.weaponName = shuffledWeapons[randomIdx].weaponName;
                    usedWeapons.Add(setup.weaponName);
                    randomIdx++;
                }
                else
                {
                    setup.weaponName = shuffledWeapons[0].weaponName; // fallback
                }
            }
            else
            {
                setup.weaponName = lp.weaponName;
                usedWeapons.Add(lp.weaponName);
            }

            setups.Add(setup);
        }

        // Determine game mode
        int humanCount = 0;
        foreach (var s in setups)
        {
            if (!s.isBot) humanCount++;
        }
        GameMode mode = humanCount <= 1 ? GameMode.Simultaneous : GameMode.TurnBased;

        // Apply timer setting to config
        if (GameManager.Instance != null && GameManager.Instance.config != null)
        {
            GameManager.Instance.config.defaultPhaseTimeSeconds = selectedTimerSeconds;
        }

        // Start game
        GameManager.Instance.StartNewGame(lobbyPlayers.Count, mode, setups);
        SceneManager.LoadScene("Game");
    }

    private void LeaveWaitingRoom()
    {
        lobbyPlayers.Clear();
        ShowMainLobby();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude I, O, 0, 1
        var code = new char[4];
        for (int i = 0; i < 4; i++)
        {
            code[i] = chars[Random.Range(0, chars.Length)];
        }
        return new string(code);
    }

    public void UpdatePlayerList()
    {
        RefreshPlayerList();
    }
}

/// <summary>
/// Data for a player slot in the lobby waiting room.
/// </summary>
public class LobbyPlayer
{
    public string playerName;
    public string colorName;
    public string colorHex;
    public string weaponName;
    public bool isBot;
    public bool isReady;
    public bool isHost;
}
