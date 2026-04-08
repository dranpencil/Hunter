using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

/// <summary>
/// Exports game data to CSV for analysis. Maps from game.js lines ~11803-11947.
/// 18 data points per player per game.
/// </summary>
public class CSVExporter
{
    private readonly List<string[]> _rows = new List<string[]>();
    private int _gameId;

    private static readonly string[] Headers =
    {
        "game_id", "player_count", "rounds", "player_id", "weapon",
        "level", "score", "rank", "weapon_track_pos",
        "defeated_lv1", "defeated_lv2", "defeated_lv3",
        "score_monsters", "score_milestones", "score_popularity",
        "score_plaza", "score_fakeblood", "score_other"
    };

    public void RecordGame(GameManager gm, int gameId)
    {
        _gameId = gameId;
        var rankings = gm.Scoring.GetRankings();

        foreach (var player in gm.Players)
        {
            int rank = 0;
            foreach (var r in rankings)
            {
                if (r.playerId == player.id) { rank = r.rank; break; }
            }

            _rows.Add(new string[]
            {
                gameId.ToString(),
                gm.PlayerCount.ToString(),
                gm.CurrentRound.ToString(),
                player.id.ToString(),
                player.weaponData.weaponName,
                player.GetCurrentPowerLevel().ToString(),
                player.score.ToString(),
                rank.ToString(),
                player.powerTrackPosition.ToString(),
                player.monstersDefeated.level1.ToString(),
                player.monstersDefeated.level2.ToString(),
                player.monstersDefeated.level3.ToString(),
                player.scoreFromMonsters.ToString(),
                player.scoreFromMilestones.ToString(),
                player.scoreFromPopularity.ToString(),
                player.scoreFromPlaza.ToString(),
                player.scoreFromFakeBlood.ToString(),
                player.scoreFromOther.ToString()
            });
        }
    }

    public void ExportToFile(string path = null)
    {
        if (path == null)
        {
            string desktop = System.Environment.GetFolderPath(System.Environment.SpecialFolder.Desktop);
            path = Path.Combine(desktop, $"RPH_data_{System.DateTime.Now:yyyyMMdd_HHmmss}.csv");
        }

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", Headers));

        foreach (var row in _rows)
        {
            sb.AppendLine(string.Join(",", row));
        }

        File.WriteAllText(path, sb.ToString());
        Debug.Log($"CSV exported to: {path}");
    }

    public void Clear()
    {
        _rows.Clear();
        _gameId = 0;
    }

    public int RecordCount => _rows.Count;
}
