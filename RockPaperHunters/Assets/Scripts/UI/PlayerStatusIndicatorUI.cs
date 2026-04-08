using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Red/green circle indicators for player completion status during selection and store phases.
/// Resets to red at each new phase, turns green when a player confirms.
/// </summary>
public class PlayerStatusIndicatorUI : MonoBehaviour
{
    [Header("Status Indicators (one per player, max 4)")]
    [SerializeField] private Image[] statusCircles = new Image[4];

    [Header("Colors")]
    [SerializeField] private Color pendingColor = new Color(0.91f, 0.30f, 0.24f);   // Red
    [SerializeField] private Color completedColor = new Color(0.18f, 0.80f, 0.44f); // Green

    [Header("Root")]
    [SerializeField] private GameObject indicatorPanel;

    private void OnEnable()
    {
        EventBus.Subscribe<PlayerSelectionConfirmedEvent>(OnPlayerSelectionConfirmed);
        EventBus.Subscribe<PlayerFinishedShoppingEvent>(OnPlayerFinishedShopping);
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<PlayerSelectionConfirmedEvent>(OnPlayerSelectionConfirmed);
        EventBus.Unsubscribe<PlayerFinishedShoppingEvent>(OnPlayerFinishedShopping);
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
    }

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        // Show indicators during Selection and Store phases
        bool show = e.newPhase == GamePhase.Selection || e.newPhase == GamePhase.Store;
        if (indicatorPanel != null)
            indicatorPanel.SetActive(show);

        if (show)
        {
            InitializeIndicators();
            ResetAll();
        }
    }

    private void InitializeIndicators()
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        for (int i = 0; i < statusCircles.Length; i++)
        {
            if (statusCircles[i] != null)
                statusCircles[i].gameObject.SetActive(i < gm.Players.Count);
        }
    }

    private void OnPlayerSelectionConfirmed(PlayerSelectionConfirmedEvent e)
    {
        SetPlayerCompleted(e.playerId);
    }

    private void OnPlayerFinishedShopping(PlayerFinishedShoppingEvent e)
    {
        SetPlayerCompleted(e.playerId);
    }

    private void SetPlayerCompleted(int playerId)
    {
        if (playerId >= 0 && playerId < statusCircles.Length && statusCircles[playerId] != null)
        {
            statusCircles[playerId].color = completedColor;
        }
    }

    public void ResetAll()
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        for (int i = 0; i < statusCircles.Length; i++)
        {
            if (statusCircles[i] != null && i < gm.Players.Count)
            {
                statusCircles[i].color = pendingColor;

                // Color the circle border to match player color
                var outline = statusCircles[i].GetComponent<Outline>();
                if (outline != null)
                {
                    Color playerColor;
                    if (ColorUtility.TryParseHtmlString(gm.Players[i].color.hexCode, out playerColor))
                        outline.effectColor = playerColor;
                }
            }
        }
    }
}
