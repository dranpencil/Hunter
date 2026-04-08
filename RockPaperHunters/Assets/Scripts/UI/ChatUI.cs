using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// Full chat system with real-time message display, text input, and canned message panel.
/// Canned messages use a 5-tab system with tactics+locations composition flow.
/// Keyboard shortcuts: Alt+Q toggle, number keys for tab/message selection.
/// Maps from game.js initChat() ~line 15791, toggleCannedPanel() ~line 15906.
/// </summary>
public class ChatUI : MonoBehaviour
{
    // ------------------------------------------------------------------
    // Inspector References
    // ------------------------------------------------------------------

    [Header("Chat Display")]
    [SerializeField] private ScrollRect messageScrollRect;
    [SerializeField] private Transform messageContainer;
    [SerializeField] private GameObject messagePrefab;

    [Header("Input")]
    [SerializeField] private TMP_InputField chatInputField;
    [SerializeField] private Button sendButton;

    [Header("Canned Messages")]
    [SerializeField] private GameObject cannedPanel;
    [SerializeField] private Button[] tabButtons = new Button[5];
    [SerializeField] private Transform cannedMessageList;
    [SerializeField] private GameObject cannedMessageItemPrefab;
    [SerializeField] private TextMeshProUGUI cannedPanelTitle;

    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------

    private const int MaxMessages = 50;
    private const int MaxInputLength = 100;

    // Tab names: greeting, mid-game, closing, tactics, locations
    private static readonly string[] TabNames =
    {
        "\u554F\u5019\u8A9E",   // greeting
        "\u6BD4\u8CFD\u4E2D",   // mid-game
        "\u7D50\u8A9E",         // closing
        "\u6230\u8853",         // tactics
        "\u5730\u9EDE"          // locations
    };

    // Canned messages: 8 rows x 5 columns
    // Columns: greeting(0), mid-game(1), closing(2), tactics(3), locations(4)
    private static readonly string[,] CannedMessages =
    {
        { "\u4F60\u597D",                                       // row 0
          "\u4F86\u500B\u7CBE\u5F69\u7684\u5C0D\u6C7A\u5427",
          "\u9019\u771F\u662F\u5834\u7CBE\u5F69\u7684\u6BD4\u8CFD",
          "\u6211\u8981\u53BB__\uFF0C\u8AB0\u90FD\u5225\u60F3\u8DDF\u6211\u6436",
          "\u5DE5\u5730" },

        { "\u8ACB\u591A\u591A\u6307\u6559",                    // row 1
          "\u9019\u96BB\u602A\u7378\u771F\u96E3\u7E8F",
          "\u6BD4\u5206\u5DEE\u8DDD\u4E0D\u5927\uFF0C\u771F\u662F\u9A5A\u96AA",
          "\u5C0F\u5FC3\uFF01\u6709\u4EBA\u8981\u53BB__",
          "\u9152\u5427" },

        { "\u9019\u500B\u771F\u96E3\u629C\u64C7",              // row 2
          "\u88AB\u4F60\u731C\u5230\u4E86\uFF0C\u771F\u5389\u5BB3",
          "\u597D\u73A9\uFF0C\u8981\u4E0D\u8981\u518D\u4E00\u5834\uFF1F",
          "\u9019\u8F2A__\u8B8A\u5F97\u5F88\u8A98\u4EBA\u8036",
          "\u8ECA\u7AD9" },

        { "\u6211\u662F\u65B0\u624B\uFF0C\u8ACB\u97AD\u5C0F\u529B\u4E00\u9EDE", // row 3
          "\u8B93\u6211\u9818\u5148\u4E00\u4E0B",
          "\u4E0D\u597D\u610F\u601D\u8D0F\u592A\u591A",
          "\u770B\u8D77\u4F86\u4F60\u5F88\u60F3\u53BB__\uFF0C\u563F\u563F",
          "\u91AB\u9662" },

        { "\u597D\u4E45\u4E0D\u898B",                          // row 4
          "\u770B\u8D77\u4F86\u9084\u6709\u6A5F\u6703",
          "\u8B1D\u8B1D",
          "\u5927\u5BB6\u5FEB\u53BB\u570D\u5835\u4ED6\uFF0C\u885D\u5411__",
          "\u9053\u5834" },

        { "",                                                   // row 5
          "\u5927\u5925\u9032\u653B\u56C9",
          "\u770B\u4F86\u6211\u4ECA\u5929\u7684\u904B\u6C23\u6BD4\u8F03\u597D",
          "\u8A72\u4E0D\u6703\u4F60\u60F3\u53BB__\u5427\uFF1F",
          "\u5EE3\u5834" },

        { "",                                                   // row 6
          "",
          "",
          "\u770B\u4F86\u6211\u5011\u90FD\u5F88\u60F3\u53BB__\uFF0C\u8981\u4E0D\u8F2A\u6D41\u4E00\u4E0B",
          "\u68EE\u6797" },

        { "",                                                   // row 7
          "",
          "",
          "\u5404\u4F4D\u9AD8\u62AC\u8CB4\u624B\uFF0C\u8B93\u53BB__\u4E00\u6B21\u62DC\u8A17",
          "" }
    };

    private const int RowCount = 8;
    private const int ColCount = 5;

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------

    private enum CannedState { Closed, Tabs, Messages }
    private CannedState cannedState = CannedState.Closed;
    private int selectedTab = -1;
    private string pendingMessage;

    private int messageCount;
    private List<GameObject> messageObjects = new List<GameObject>();

    // Local player info (set during init)
    private int localPlayerId;

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    private void OnEnable()
    {
        EventBus.Subscribe<ChatMessageEvent>(OnChatMessageReceived);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe<ChatMessageEvent>(OnChatMessageReceived);
    }

    private void Start()
    {
        InitChat();
    }

    private void Update()
    {
        HandleKeyboardShortcuts();
        HandleEnterKey();
    }

    // ------------------------------------------------------------------
    // Initialization
    // ------------------------------------------------------------------

    public void InitChat()
    {
        // Character limit on input
        if (chatInputField != null)
        {
            chatInputField.characterLimit = MaxInputLength;
        }

        // Send button
        if (sendButton != null)
        {
            sendButton.onClick.AddListener(SendMessage);
        }

        // Tab buttons
        for (int i = 0; i < tabButtons.Length && i < ColCount; i++)
        {
            int tabIndex = i;
            if (tabButtons[i] != null)
            {
                tabButtons[i].onClick.AddListener(() => OnCannedTabSelected(tabIndex));

                // Set tab label
                var label = tabButtons[i].GetComponentInChildren<TextMeshProUGUI>();
                if (label != null)
                    label.text = $"{tabIndex + 1}. {TabNames[tabIndex]}";
            }
        }

        // Hide canned panel initially
        if (cannedPanel != null)
            cannedPanel.SetActive(false);

        cannedState = CannedState.Closed;
        pendingMessage = null;
        messageCount = 0;

        // Determine local player (first non-bot, or player 0)
        if (GameManager.Instance != null)
        {
            localPlayerId = 0;
            foreach (var p in GameManager.Instance.Players)
            {
                if (!p.isBot)
                {
                    localPlayerId = p.id;
                    break;
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Keyboard Shortcuts
    // ------------------------------------------------------------------

    private void HandleKeyboardShortcuts()
    {
        // Ignore when input field is focused
        if (chatInputField != null && chatInputField.isFocused) return;

        // Alt+Q: Toggle canned panel
        if (Input.GetKey(KeyCode.LeftAlt) && Input.GetKeyDown(KeyCode.Q))
        {
            ToggleCannedPanel();
            return;
        }

        if (cannedState == CannedState.Closed) return;

        // Number keys 1-5: Select tab when in Tabs state
        if (cannedState == CannedState.Tabs)
        {
            for (int i = 0; i < 5; i++)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1 + i))
                {
                    OnCannedTabSelected(i);
                    return;
                }
            }
        }

        // Number keys 1-9: Select message when in Messages state
        if (cannedState == CannedState.Messages)
        {
            for (int i = 0; i < 9; i++)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1 + i))
                {
                    OnCannedMessageSelected(i);
                    return;
                }
            }
        }
    }

    private void HandleEnterKey()
    {
        if (chatInputField == null) return;
        if (!chatInputField.isFocused) return;

        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            SendMessage();
        }
    }

    // ------------------------------------------------------------------
    // Send Message
    // ------------------------------------------------------------------

    public void SendMessage()
    {
        if (chatInputField == null) return;

        string text = chatInputField.text.Trim();
        if (string.IsNullOrEmpty(text)) return;

        // Publish chat event
        EventBus.Publish(new ChatMessageEvent
        {
            senderId = localPlayerId,
            message = text
        });

        // Clear input
        chatInputField.text = "";
        chatInputField.ActivateInputField();
    }

    private void SendCannedMessage(string text)
    {
        if (string.IsNullOrEmpty(text)) return;

        EventBus.Publish(new ChatMessageEvent
        {
            senderId = localPlayerId,
            message = text
        });
    }

    // ------------------------------------------------------------------
    // Receive Message
    // ------------------------------------------------------------------

    private void OnChatMessageReceived(ChatMessageEvent e)
    {
        DisplayMessage(e.senderId, e.message);
    }

    private void DisplayMessage(int senderId, string text)
    {
        if (messageContainer == null || messagePrefab == null) return;

        // Enforce max message limit
        while (messageObjects.Count >= MaxMessages)
        {
            var oldest = messageObjects[0];
            messageObjects.RemoveAt(0);
            if (oldest != null)
                Destroy(oldest);
        }

        // Create message entry
        var msgObj = Instantiate(messagePrefab, messageContainer);
        messageObjects.Add(msgObj);

        var tmpText = msgObj.GetComponentInChildren<TextMeshProUGUI>();
        if (tmpText != null)
        {
            string senderName = "Unknown";
            string senderColor = "#FFFFFF";

            if (GameManager.Instance != null && senderId >= 0 && senderId < GameManager.Instance.Players.Count)
            {
                var player = GameManager.Instance.Players[senderId];
                senderName = player.playerName;
                senderColor = player.color.hexCode;
            }

            tmpText.text = $"<color={senderColor}>{senderName}</color>: {text}";
        }

        messageCount++;

        // Scroll to bottom
        if (messageScrollRect != null)
        {
            Canvas.ForceUpdateCanvases();
            messageScrollRect.verticalNormalizedPosition = 0f;
        }
    }

    // ------------------------------------------------------------------
    // Canned Panel State Machine
    // ------------------------------------------------------------------

    public void ToggleCannedPanel()
    {
        if (cannedState == CannedState.Closed)
        {
            // Open -> show tabs
            cannedState = CannedState.Tabs;
            ShowCannedTabs();
        }
        else
        {
            // Close
            cannedState = CannedState.Closed;
            pendingMessage = null;
            if (cannedPanel != null)
                cannedPanel.SetActive(false);
        }
    }

    private void ShowCannedTabs()
    {
        if (cannedPanel != null)
            cannedPanel.SetActive(true);

        // Show tab buttons, hide message list
        for (int i = 0; i < tabButtons.Length; i++)
        {
            if (tabButtons[i] != null)
                tabButtons[i].gameObject.SetActive(true);
        }

        ClearCannedMessageList();

        if (cannedPanelTitle != null)
            cannedPanelTitle.text = "Select a category:";

        cannedState = CannedState.Tabs;
    }

    public void OnCannedTabSelected(int tabIndex)
    {
        if (tabIndex < 0 || tabIndex >= ColCount) return;

        selectedTab = tabIndex;
        cannedState = CannedState.Messages;

        ShowCannedMessages(tabIndex);
    }

    private void ShowCannedMessages(int tabIndex)
    {
        if (cannedPanel != null)
            cannedPanel.SetActive(true);

        // Hide tab buttons
        for (int i = 0; i < tabButtons.Length; i++)
        {
            if (tabButtons[i] != null)
                tabButtons[i].gameObject.SetActive(false);
        }

        ClearCannedMessageList();

        if (cannedPanelTitle != null)
            cannedPanelTitle.text = TabNames[tabIndex];

        // Populate messages for this tab
        int displayIndex = 0;
        for (int row = 0; row < RowCount; row++)
        {
            string msg = CannedMessages[row, tabIndex];
            if (string.IsNullOrEmpty(msg)) continue;

            displayIndex++;
            CreateCannedMessageItem(displayIndex, msg, row);
        }
    }

    private void CreateCannedMessageItem(int displayNumber, string text, int rowIndex)
    {
        if (cannedMessageList == null) return;

        GameObject itemObj;
        if (cannedMessageItemPrefab != null)
        {
            itemObj = Instantiate(cannedMessageItemPrefab, cannedMessageList);
        }
        else
        {
            // Fallback: create a simple button
            itemObj = new GameObject($"CannedMsg_{displayNumber}");
            itemObj.transform.SetParent(cannedMessageList, false);
            var rt = itemObj.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(300, 30);
        }

        // Set display text with 1-based index prefix
        var label = itemObj.GetComponentInChildren<TextMeshProUGUI>();
        if (label != null)
        {
            label.text = $"{displayNumber}. {text}";
        }

        // Add click handler
        var button = itemObj.GetComponent<Button>();
        if (button == null)
            button = itemObj.AddComponent<Button>();

        int capturedRow = rowIndex;
        int capturedDisplayNum = displayNumber - 1; // 0-based for selection
        button.onClick.AddListener(() => OnCannedMessageClicked(capturedRow));
    }

    public void OnCannedMessageSelected(int messageIndex)
    {
        // messageIndex is 0-based (from keyboard: key 1 => index 0)
        // Find the Nth non-empty message in the current tab
        int count = 0;
        for (int row = 0; row < RowCount; row++)
        {
            string msg = CannedMessages[row, selectedTab];
            if (string.IsNullOrEmpty(msg)) continue;

            if (count == messageIndex)
            {
                OnCannedMessageClicked(row);
                return;
            }
            count++;
        }
    }

    private void OnCannedMessageClicked(int rowIndex)
    {
        if (selectedTab < 0 || selectedTab >= ColCount) return;

        string msg = CannedMessages[rowIndex, selectedTab];
        if (string.IsNullOrEmpty(msg)) return;

        if (selectedTab == 3) // Tactics tab
        {
            // Store as pending message (has __ placeholder), switch to locations tab
            pendingMessage = msg;
            selectedTab = 4;
            cannedState = CannedState.Messages;
            ShowCannedMessages(4);
        }
        else if (selectedTab == 4 && !string.IsNullOrEmpty(pendingMessage)) // Locations tab with pending
        {
            // Replace __ in pending message with location name
            string locationName = msg;
            string composed = pendingMessage.Replace("__", locationName);
            SendCannedMessage(composed);

            // Close panel
            pendingMessage = null;
            cannedState = CannedState.Closed;
            if (cannedPanel != null)
                cannedPanel.SetActive(false);
        }
        else
        {
            // Normal message: send directly
            SendCannedMessage(msg);

            // Close panel
            cannedState = CannedState.Closed;
            pendingMessage = null;
            if (cannedPanel != null)
                cannedPanel.SetActive(false);
        }
    }

    private void ClearCannedMessageList()
    {
        if (cannedMessageList == null) return;

        for (int i = cannedMessageList.childCount - 1; i >= 0; i--)
        {
            Destroy(cannedMessageList.GetChild(i).gameObject);
        }
    }

    // ------------------------------------------------------------------
    // Context-Aware Default Tab
    // ------------------------------------------------------------------

    /// <summary>
    /// Opens the canned panel with a context-aware default tab selection.
    /// Call this instead of ToggleCannedPanel() when you want smart defaults.
    /// </summary>
    public void OpenCannedPanelContextAware()
    {
        int defaultTab = GetContextDefaultTab();

        cannedState = CannedState.Tabs;
        if (cannedPanel != null)
            cannedPanel.SetActive(true);

        ShowCannedTabs();

        // Auto-select the default tab
        OnCannedTabSelected(defaultTab);
    }

    private int GetContextDefaultTab()
    {
        if (GameManager.Instance == null) return 1;

        var phase = GameManager.Instance.StateMachine.CurrentPhase;
        int round = GameManager.Instance.CurrentRound;

        // gameover -> closing (tab 2)
        if (phase == GamePhase.GameOver)
            return 2;

        // round 1 selection -> greeting (tab 0)
        if (phase == GamePhase.Selection && round == 1)
            return 0;

        // selection phase -> tactics (tab 3)
        if (phase == GamePhase.Selection)
            return 3;

        // default -> mid-game (tab 1)
        return 1;
    }
}
