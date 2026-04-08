using UnityEngine;
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

    private List<PlayerBoardUI> playerBoards = new List<PlayerBoardUI>();

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
    }
}
