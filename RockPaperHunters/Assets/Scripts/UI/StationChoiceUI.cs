using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Modal for choosing resource type at Station.
/// Shown when a human player's hunter is at Station.
/// </summary>
public class StationChoiceUI : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private GameObject modalPanel;
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private TextMeshProUGUI rewardAmountText;
    [SerializeField] private Button moneyButton;
    [SerializeField] private Button beerButton;
    [SerializeField] private Button bloodBagButton;
    [SerializeField] private Button expButton;

    private int currentPlayerId;

    private void OnEnable()
    {
        EventBus.Subscribe<StationChoiceRequestedEvent>(OnStationChoiceRequested);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<StationChoiceRequestedEvent>(OnStationChoiceRequested);
    }

    private void Start()
    {
        modalPanel.SetActive(false);

        moneyButton.onClick.AddListener(() => OnResourceChosen(ResourceType.Money));
        beerButton.onClick.AddListener(() => OnResourceChosen(ResourceType.Beer));
        bloodBagButton.onClick.AddListener(() => OnResourceChosen(ResourceType.BloodBag));
        expButton.onClick.AddListener(() => OnResourceChosen(ResourceType.Exp));
    }

    private void OnStationChoiceRequested(StationChoiceRequestedEvent e)
    {
        Show(e.playerId, e.rewardAmount);
    }

    public void Show(int playerId, int rewardAmount)
    {
        currentPlayerId = playerId;
        modalPanel.SetActive(true);

        var gm = GameManager.Instance;
        var player = gm.Players[playerId];

        titleText.text = $"{player.playerName} - Station Choice";
        rewardAmountText.text = $"You will receive {rewardAmount} of your chosen resource";
    }

    public void OnResourceChosen(ResourceType type)
    {
        modalPanel.SetActive(false);

        EventBus.Publish(new StationChoiceMadeEvent
        {
            playerId = currentPlayerId,
            chosenResource = type
        });
    }
}
