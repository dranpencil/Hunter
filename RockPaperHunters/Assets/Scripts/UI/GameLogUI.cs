using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Scrolling game log display. Appends colored messages based on log type.
/// </summary>
public class GameLogUI : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private ScrollRect scrollRect;
    [SerializeField] private TextMeshProUGUI logText;
    [SerializeField] private int maxLines = 200;

    private int _lineCount;

    private void OnEnable()
    {
        EventBus.Subscribe<GameLogEvent>(OnGameLog);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<GameLogEvent>(OnGameLog);
    }

    private void Start()
    {
        if (logText != null)
            logText.text = "";
        _lineCount = 0;
    }

    private void OnGameLog(GameLogEvent e)
    {
        AddLog(e.message, e.logType);
    }

    public void AddLog(string message, GameLogType type)
    {
        if (logText == null) return;

        string colorHex = GetColorForType(type);
        string formatted = $"<color={colorHex}>{message}</color>\n";

        logText.text += formatted;
        _lineCount++;

        // Trim old lines if too many
        if (_lineCount > maxLines)
        {
            string text = logText.text;
            int firstNewline = text.IndexOf('\n');
            if (firstNewline >= 0)
            {
                logText.text = text.Substring(firstNewline + 1);
                _lineCount--;
            }
        }

        // Scroll to bottom next frame
        if (scrollRect != null)
            Canvas.ForceUpdateCanvases();
        if (scrollRect != null)
            scrollRect.verticalNormalizedPosition = 0f;
    }

    private string GetColorForType(GameLogType type)
    {
        switch (type)
        {
            case GameLogType.System: return "#FFD700";  // Gold
            case GameLogType.Action: return "#87CEEB";  // Sky blue
            case GameLogType.Battle: return "#FF6B6B";  // Red
            case GameLogType.Score:  return "#98FB98";  // Pale green
            default:                return "#FFFFFF";   // White
        }
    }

    public void Clear()
    {
        if (logText != null)
            logText.text = "";
        _lineCount = 0;
    }
}
