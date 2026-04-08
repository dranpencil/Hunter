using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Final scores and rankings table displayed at game end.
/// Shows winner announcement, all player rankings with score breakdowns.
/// </summary>
public class GameOverUI : MonoBehaviour
{
    [Header("Root Panel")]
    [SerializeField] private GameObject panel;

    [Header("Winner Display")]
    [SerializeField] private TextMeshProUGUI winnerText;
    [SerializeField] private TextMeshProUGUI winnerScoreText;

    [Header("Rankings Table")]
    [SerializeField] private Transform rankingsContainer;
    [SerializeField] private GameObject rankingRowPrefab;

    [Header("Buttons")]
    [SerializeField] private Button returnToMenuButton;
    [SerializeField] private Button playAgainButton;

    private void Start()
    {
        panel.SetActive(false);

        if (returnToMenuButton != null)
            returnToMenuButton.onClick.AddListener(OnReturnToMenu);
        if (playAgainButton != null)
            playAgainButton.onClick.AddListener(OnReturnToMenu);
    }

    private void OnEnable()
    {
        EventBus.Subscribe<GameOverEvent>(OnGameOver);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<GameOverEvent>(OnGameOver);
    }

    private void OnGameOver(GameOverEvent e)
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        var rankings = gm.Scoring.GetRankings();
        Show(rankings);
    }

    public void Show(List<PlayerRanking> rankings)
    {
        panel.SetActive(true);

        if (rankings.Count == 0) return;

        // Winner display
        var winner = rankings[0];
        var gm = GameManager.Instance;
        var winnerPlayer = gm.Players[winner.playerId];

        winnerText.text = $"{winner.playerName} Wins!";
        winnerScoreText.text = $"{winner.score} Points";

        // Color winner text
        Color winnerColor;
        if (ColorUtility.TryParseHtmlString(winnerPlayer.color.hexCode, out winnerColor))
            winnerText.color = winnerColor;

        // Clear existing rows
        foreach (Transform child in rankingsContainer)
            Destroy(child.gameObject);

        // Create ranking rows
        foreach (var rank in rankings)
        {
            if (rankingRowPrefab == null) break;

            var row = Instantiate(rankingRowPrefab, rankingsContainer);
            var texts = row.GetComponentsInChildren<TextMeshProUGUI>();

            // Expected layout: Rank, Name, Weapon, Score, Monsters, Milestones, Popularity, Plaza, Other
            if (texts.Length >= 4)
            {
                var player = gm.Players[rank.playerId];

                texts[0].text = $"#{rank.rank}";
                texts[1].text = rank.playerName;
                texts[2].text = rank.weaponName;
                texts[3].text = rank.score.ToString();

                // Color the name
                Color playerColor;
                if (ColorUtility.TryParseHtmlString(player.color.hexCode, out playerColor))
                    texts[1].color = playerColor;

                // Score breakdown if enough text fields
                if (texts.Length >= 9)
                {
                    texts[4].text = player.scoreFromMonsters.ToString();
                    texts[5].text = player.scoreFromMilestones.ToString();
                    texts[6].text = player.scoreFromPopularity.ToString();
                    texts[7].text = player.scoreFromPlaza.ToString();
                    texts[8].text = (player.scoreFromFakeBlood + player.scoreFromOther).ToString();
                }
            }
        }
    }

    private void OnReturnToMenu()
    {
        // Clean up GameManager
        if (GameManager.Instance != null)
            Destroy(GameManager.Instance.gameObject);

        SceneManager.LoadScene("MainMenu");
    }
}
