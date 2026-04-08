using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Selection cards for hunter/apprentice placement during the selection phase.
/// Players pick one location for hunter and one for apprentice, then confirm.
/// Forest: apprentice can only go if hunter is also going to Forest.
/// Same location can't be selected for both tokens (except Forest).
/// </summary>
public class SelectionPhaseUI : MonoBehaviour
{
    [Header("Card Containers")]
    [SerializeField] private Transform hunterCardsContainer;
    [SerializeField] private Transform apprenticeCardsContainer;

    [Header("Card Prefab")]
    [SerializeField] private GameObject locationCardPrefab;

    [Header("Confirm Button")]
    [SerializeField] private Button confirmButton;
    [SerializeField] private TextMeshProUGUI confirmButtonText;

    [Header("Status")]
    [SerializeField] private TextMeshProUGUI phaseStatusText;
    [SerializeField] private TextMeshProUGUI playerTurnText;

    [Header("Root Panel")]
    [SerializeField] private GameObject selectionPanel;

    // Runtime card references
    private List<LocationCardUI> hunterCards = new List<LocationCardUI>();
    private List<LocationCardUI> apprenticeCards = new List<LocationCardUI>();

    private int selectedHunterLocation = -1;
    private int selectedApprenticeLocation = -1;
    private int currentSelectingPlayerId = -1;

    private void OnEnable()
    {
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Subscribe<PlayerSelectionConfirmedEvent>(OnPlayerConfirmed);
        EventBus.Subscribe<AllPlayersSelectedEvent>(OnAllSelected);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        EventBus.Unsubscribe<PlayerSelectionConfirmedEvent>(OnPlayerConfirmed);
        EventBus.Unsubscribe<AllPlayersSelectedEvent>(OnAllSelected);
    }

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        if (e.newPhase == GamePhase.Selection)
            ShowSelectionUI();
        else
            HideSelectionUI();
    }

    public void ShowSelectionUI()
    {
        selectionPanel.SetActive(true);

        var gm = GameManager.Instance;
        phaseStatusText.text = $"Round {gm.CurrentRound} - Selection Phase";

        // Build cards if not yet created
        if (hunterCards.Count == 0)
            BuildCards();

        // Determine which player selects first
        if (gm.Mode == GameMode.Simultaneous)
        {
            // Find the human player
            foreach (var p in gm.Players)
            {
                if (!p.isBot)
                {
                    StartSelectionForPlayer(p.id);
                    break;
                }
            }
            // Bots select immediately
            RunBotSelections();
        }
        else // TurnBased
        {
            StartSelectionForPlayer(0);
        }
    }

    public void HideSelectionUI()
    {
        selectionPanel.SetActive(false);
    }

    private void BuildCards()
    {
        var gm = GameManager.Instance;

        // Clear existing
        foreach (Transform child in hunterCardsContainer) Destroy(child.gameObject);
        foreach (Transform child in apprenticeCardsContainer) Destroy(child.gameObject);
        hunterCards.Clear();
        apprenticeCards.Clear();

        for (int i = 0; i < gm.allLocations.Length; i++)
        {
            var loc = gm.allLocations[i];

            // Hunter card
            var hunterCardObj = Instantiate(locationCardPrefab, hunterCardsContainer);
            var hunterCard = hunterCardObj.GetComponent<LocationCardUI>();
            hunterCard.Setup(loc, true, OnHunterCardClicked);
            hunterCards.Add(hunterCard);

            // Apprentice card
            var apprenticeCardObj = Instantiate(locationCardPrefab, apprenticeCardsContainer);
            var apprenticeCard = apprenticeCardObj.GetComponent<LocationCardUI>();
            apprenticeCard.Setup(loc, false, OnApprenticeCardClicked);
            apprenticeCards.Add(apprenticeCard);
        }
    }

    private void StartSelectionForPlayer(int playerId)
    {
        currentSelectingPlayerId = playerId;
        selectedHunterLocation = -1;
        selectedApprenticeLocation = -1;

        var gm = GameManager.Instance;
        var player = gm.Players[playerId];

        playerTurnText.text = $"{player.playerName}'s Turn ({player.weaponData.weaponName})";
        confirmButton.interactable = false;

        ResetAllCards();
        SetApprenticeForestEnabled(false);
    }

    private void ResetAllCards()
    {
        foreach (var card in hunterCards)
        {
            card.SetSelected(false);
            card.SetDisabled(false);
        }
        foreach (var card in apprenticeCards)
        {
            card.SetSelected(false);
            card.SetDisabled(false);
        }
    }

    private void OnHunterCardClicked(LocationId locationId)
    {
        int locIndex = (int)locationId - 1;

        // Deselect previous
        if (selectedHunterLocation >= 0)
        {
            hunterCards[selectedHunterLocation].SetSelected(false);
            int prevLocId = selectedHunterLocation + 1;
            if (prevLocId != 7)
                apprenticeCards[selectedHunterLocation].SetDisabled(false);
        }

        // Select new
        selectedHunterLocation = locIndex;
        hunterCards[locIndex].SetSelected(true);

        // Disable same location for apprentice (except Forest)
        if ((int)locationId != 7)
        {
            apprenticeCards[locIndex].SetDisabled(true);
            if (selectedApprenticeLocation == locIndex)
            {
                apprenticeCards[locIndex].SetSelected(false);
                selectedApprenticeLocation = -1;
            }
        }

        // Forest apprentice logic
        SetApprenticeForestEnabled(locationId == LocationId.Forest);
        if (locationId != LocationId.Forest && selectedApprenticeLocation == 6)
        {
            apprenticeCards[6].SetSelected(false);
            selectedApprenticeLocation = -1;
        }

        UpdateConfirmButton();
    }

    private void OnApprenticeCardClicked(LocationId locationId)
    {
        int locIndex = (int)locationId - 1;

        // Deselect previous
        if (selectedApprenticeLocation >= 0)
        {
            apprenticeCards[selectedApprenticeLocation].SetSelected(false);
            int prevLocId = selectedApprenticeLocation + 1;
            if (prevLocId != 7)
                hunterCards[selectedApprenticeLocation].SetDisabled(false);
        }

        // Select new
        selectedApprenticeLocation = locIndex;
        apprenticeCards[locIndex].SetSelected(true);

        // Disable same location for hunter (except Forest)
        if ((int)locationId != 7)
        {
            hunterCards[locIndex].SetDisabled(true);
            if (selectedHunterLocation == locIndex)
            {
                hunterCards[locIndex].SetSelected(false);
                selectedHunterLocation = -1;
            }
        }

        UpdateConfirmButton();
    }

    private void SetApprenticeForestEnabled(bool enabled)
    {
        if (apprenticeCards.Count > 6)
            apprenticeCards[6].SetDisabled(!enabled);
    }

    private void UpdateConfirmButton()
    {
        confirmButton.interactable = selectedHunterLocation >= 0 && selectedApprenticeLocation >= 0;
    }

    public void OnConfirmClicked()
    {
        if (selectedHunterLocation < 0 || selectedApprenticeLocation < 0) return;

        var gm = GameManager.Instance;
        var player = gm.Players[currentSelectingPlayerId];

        LocationId hunterLoc = (LocationId)(selectedHunterLocation + 1);
        LocationId apprenticeLoc = (LocationId)(selectedApprenticeLocation + 1);

        player.selectedHunterCard = hunterLoc;
        player.selectedApprenticeCard = apprenticeLoc;
        player.locationSelections[hunterLoc].hunter++;
        player.locationSelections[apprenticeLoc].apprentice++;

        gm.PlayerCompletionStatus[currentSelectingPlayerId] = true;
        EventBus.Publish(new PlayerSelectionConfirmedEvent { playerId = currentSelectingPlayerId });

        // TurnBased: move to next human
        if (gm.Mode == GameMode.TurnBased)
        {
            int next = FindNextHumanPlayer(currentSelectingPlayerId + 1);
            if (next >= 0)
            {
                StartSelectionForPlayer(next);
                return;
            }
            RunBotSelections();
        }

        if (gm.AllPlayersCompleted())
            EventBus.Publish(new AllPlayersSelectedEvent());
    }

    private void RunBotSelections()
    {
        var gm = GameManager.Instance;
        foreach (var player in gm.Players)
        {
            if (!player.isBot) continue;
            if (gm.PlayerCompletionStatus.ContainsKey(player.id) && gm.PlayerCompletionStatus[player.id])
                continue;

            // Use bot AI for location selection
            var bot = gm.GetBot(player.id);
            if (bot != null)
            {
                bot.UpdateStage(player);
                player.selectedHunterCard = bot.SelectHunterLocation(gm);
                player.selectedApprenticeCard = bot.SelectApprenticeLocation(gm);
            }
            else
            {
                // Fallback random if bot instance not found
                player.selectedHunterCard = (LocationId)Random.Range(1, 8);
                do
                {
                    player.selectedApprenticeCard = (LocationId)Random.Range(1, 7);
                } while (player.selectedApprenticeCard == player.selectedHunterCard);
            }

            gm.PlayerCompletionStatus[player.id] = true;
            EventBus.Publish(new PlayerSelectionConfirmedEvent { playerId = player.id });
        }

        if (gm.AllPlayersCompleted())
            EventBus.Publish(new AllPlayersSelectedEvent());
    }

    private int FindNextHumanPlayer(int startIndex)
    {
        var gm = GameManager.Instance;
        for (int i = startIndex; i < gm.Players.Count; i++)
        {
            if (!gm.Players[i].isBot) return i;
        }
        return -1;
    }

    private void OnPlayerConfirmed(PlayerSelectionConfirmedEvent e) { }
    private void OnAllSelected(AllPlayersSelectedEvent e) { }
}
