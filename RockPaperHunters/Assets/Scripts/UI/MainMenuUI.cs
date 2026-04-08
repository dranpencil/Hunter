using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Title screen with main menu and local play setup.
/// Handles player count selection, weapon assignment, and game start.
/// </summary>
public class MainMenuUI : MonoBehaviour
{
    [Header("Main Menu Panel")]
    [SerializeField] private GameObject mainMenuPanel;
    [SerializeField] private Button localPlayButton;
    [SerializeField] private Button onlinePlayButton;
    [SerializeField] private Button dataCollectionButton;
    [SerializeField] private Button rulebookButton;

    [Header("Local Play Setup Panel")]
    [SerializeField] private GameObject localSetupPanel;
    [SerializeField] private Button[] playerCountButtons; // 2, 3, 4 player buttons
    [SerializeField] private TextMeshProUGUI playerCountText;
    [SerializeField] private Button backButton;
    [SerializeField] private Button startGameButton;

    [Header("Player Slots (4 max)")]
    [SerializeField] private GameObject[] playerSlotPanels;
    [SerializeField] private TMP_Dropdown[] slotTypeDropdowns;    // Player / Bot / Closed
    [SerializeField] private TMP_Dropdown[] weaponDropdowns;       // Weapon selection per slot
    [SerializeField] private TMP_InputField[] nameInputs;          // Player name per slot

    [Header("Data")]
    [SerializeField] private WeaponData[] availableWeapons;

    private int selectedPlayerCount = 2;

    private void Start()
    {
        ShowMainMenu();

        localPlayButton.onClick.AddListener(OnLocalPlayClicked);
        backButton.onClick.AddListener(ShowMainMenu);
        startGameButton.onClick.AddListener(OnStartGameClicked);

        for (int i = 0; i < playerCountButtons.Length; i++)
        {
            int count = i + 2; // 2, 3, 4
            playerCountButtons[i].onClick.AddListener(() => SetPlayerCount(count));
        }

        // Populate weapon dropdowns
        PopulateWeaponDropdowns();
    }

    private void ShowMainMenu()
    {
        mainMenuPanel.SetActive(true);
        localSetupPanel.SetActive(false);
    }

    public void OnLocalPlayClicked()
    {
        mainMenuPanel.SetActive(false);
        localSetupPanel.SetActive(true);
        SetPlayerCount(2);
    }

    public void OnOnlinePlayClicked()
    {
        SceneManager.LoadScene("Lobby");
    }

    public void OnDataCollectionClicked()
    {
        // TODO: Open data collection panel
    }

    public void OnRulebookClicked()
    {
        // TODO: Open rulebook viewer
    }

    private void SetPlayerCount(int count)
    {
        selectedPlayerCount = count;
        playerCountText.text = $"{count} Players";

        // Highlight selected button
        for (int i = 0; i < playerCountButtons.Length; i++)
        {
            var colors = playerCountButtons[i].colors;
            colors.normalColor = (i + 2 == count) ? new Color(0.2f, 0.6f, 0.9f) : Color.white;
            playerCountButtons[i].colors = colors;
        }

        // Show/hide player slots
        for (int i = 0; i < playerSlotPanels.Length; i++)
        {
            playerSlotPanels[i].SetActive(i < count);

            if (i < count)
            {
                // First slot is always "Player", rest default to "Bot"
                if (i == 0)
                {
                    slotTypeDropdowns[i].value = 0; // Player
                    slotTypeDropdowns[i].interactable = false; // First player must be human
                }
                else
                {
                    slotTypeDropdowns[i].value = 1; // Bot
                    slotTypeDropdowns[i].interactable = true;
                }

                // Set default names
                nameInputs[i].text = (slotTypeDropdowns[i].value == 0) ? $"Player {i + 1}" : $"Bot {i + 1}";

                // Set random weapon
                weaponDropdowns[i].value = 0; // "Random"
            }
        }
    }

    private void PopulateWeaponDropdowns()
    {
        var options = new List<string> { "Random" };
        foreach (var w in availableWeapons)
        {
            options.Add(w.weaponName);
        }

        foreach (var dropdown in weaponDropdowns)
        {
            dropdown.ClearOptions();
            dropdown.AddOptions(options);
        }
    }

    private void OnStartGameClicked()
    {
        // Build player setups
        var setups = new List<PlayerSetup>();
        var usedWeapons = new HashSet<string>();
        var availableWeaponList = new List<WeaponData>(availableWeapons);

        // Shuffle available weapons for random assignment
        for (int i = availableWeaponList.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            var temp = availableWeaponList[i];
            availableWeaponList[i] = availableWeaponList[j];
            availableWeaponList[j] = temp;
        }
        int randomIndex = 0;

        for (int i = 0; i < selectedPlayerCount; i++)
        {
            var setup = new PlayerSetup();
            setup.isBot = slotTypeDropdowns[i].value == 1;
            setup.playerName = string.IsNullOrEmpty(nameInputs[i].text)
                ? (setup.isBot ? $"Bot {i + 1}" : $"Player {i + 1}")
                : nameInputs[i].text;

            // Weapon selection
            if (weaponDropdowns[i].value == 0) // Random
            {
                // Find an unused random weapon
                while (randomIndex < availableWeaponList.Count && usedWeapons.Contains(availableWeaponList[randomIndex].weaponName))
                    randomIndex++;

                if (randomIndex < availableWeaponList.Count)
                {
                    setup.weaponName = availableWeaponList[randomIndex].weaponName;
                    usedWeapons.Add(setup.weaponName);
                    randomIndex++;
                }
            }
            else
            {
                setup.weaponName = availableWeapons[weaponDropdowns[i].value - 1].weaponName;
                usedWeapons.Add(setup.weaponName);
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

        // Start the game
        GameManager.Instance.StartNewGame(selectedPlayerCount, mode, setups);
        SceneManager.LoadScene("Game");
    }
}
