using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Initializes the Game scene. Spawns player boards, sets up initial display.
/// Attach this to a GameObject in Game.unity.
/// </summary>
public class GameSceneSetup : MonoBehaviour
{
    [Header("Player Board Setup")]
    [SerializeField] private Transform playerBoardsContainer;
    [SerializeField] private GameObject playerBoardPrefab;

    [Header("Panel References (toggle visibility per phase)")]
    [SerializeField] private GameObject selectionPanel;
    [SerializeField] private GameObject storePanel;
    [SerializeField] private GameObject battlePanel;
    [SerializeField] private GameObject gameOverPanel;

    [Header("Game Log")]
    [SerializeField] private GameLogUI gameLog;

    [Header("Board Collapse Toggle")]
    [Tooltip("Button that switches all player boards between compact and expanded views.")]
    [SerializeField] private Button toggleBoardsButton;
    [Tooltip("Label on the toggle button. Swapped between 'Expand' / 'Collapse' text when clicked.")]
    [SerializeField] private TextMeshProUGUI toggleBoardsLabel;
    [Tooltip("Label shown when boards are currently collapsed (click to expand).")]
    [SerializeField] private string expandLabelText = "Expand Boards";
    [Tooltip("Label shown when boards are currently expanded (click to collapse).")]
    [SerializeField] private string collapseLabelText = "Collapse Boards";

    private List<PlayerBoardUI> playerBoards = new List<PlayerBoardUI>();
    private bool _boardsCollapsed = true; // Default to compact, matching JS behavior.

    private void Start()
    {
        var gm = GameManager.Instance;
        if (gm == null)
        {
            Debug.LogError("GameManager not found! Make sure MainMenu scene was loaded first.");
            return;
        }

        // Hide all panels initially
        if (storePanel != null) storePanel.SetActive(false);
        if (battlePanel != null) battlePanel.SetActive(false);
        if (gameOverPanel != null) gameOverPanel.SetActive(false);

        // Spawn player boards
        SpawnPlayerBoards(gm);

        // Wire the collapse toggle. Defaults to compact mode on game start.
        if (toggleBoardsButton != null)
            toggleBoardsButton.onClick.AddListener(ToggleAllPlayerBoards);
        ApplyCollapseState();

        // Subscribe to phase changes for panel visibility
        EventBus.Subscribe<PhaseChangedEvent>(OnPhaseChanged);
    }

    private void SpawnPlayerBoards(GameManager gm)
    {
        if (playerBoardPrefab == null || playerBoardsContainer == null) return;

        foreach (var player in gm.Players)
        {
            var boardObj = Instantiate(playerBoardPrefab, playerBoardsContainer);
            var board = boardObj.GetComponent<PlayerBoardUI>();
            if (board != null)
            {
                board.SetPlayerId(player.id);
                playerBoards.Add(board);
            }
        }
    }

    /// <summary>
    /// Flip all player boards between compact and expanded views at once.
    /// Matches JS toggleAllPlayerBoards() — there's no per-player toggle.
    /// </summary>
    public void ToggleAllPlayerBoards()
    {
        _boardsCollapsed = !_boardsCollapsed;
        ApplyCollapseState();
    }

    private void ApplyCollapseState()
    {
        foreach (var board in playerBoards)
        {
            if (board != null) board.SetCompactMode(_boardsCollapsed);
        }

        if (toggleBoardsLabel != null)
            toggleBoardsLabel.text = _boardsCollapsed ? expandLabelText : collapseLabelText;
    }

    private void OnPhaseChanged(PhaseChangedEvent e)
    {
        // Refresh all player boards on every phase change
        foreach (var board in playerBoards)
        {
            board.UpdateAllStats();
        }
    }

    private void OnDestroy()
    {
        EventBus.Unsubscribe<PhaseChangedEvent>(OnPhaseChanged);
        if (toggleBoardsButton != null)
            toggleBoardsButton.onClick.RemoveListener(ToggleAllPlayerBoards);
    }
}
