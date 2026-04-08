using System;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json;

/// <summary>
/// Host-authoritative network manager. Singleton MonoBehaviour.
/// Handles game state broadcast, action processing, heartbeat, and disconnect detection.
/// Maps from firebase-config.js OnlineManager + game.js handleGuestAction/pushGameState/applyRemoteGameState.
/// </summary>
public class NetworkGameManager : MonoBehaviour
{
    public static NetworkGameManager Instance { get; private set; }

    // ------------------------------------------------------------------
    // Public Properties
    // ------------------------------------------------------------------

    public bool IsHost { get; private set; }
    public bool IsOnline { get; private set; }
    public int LocalPlayerId { get; set; } = -1;

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    [Header("Heartbeat Settings")]
    [SerializeField] private float heartbeatIntervalSeconds = 5f;
    [SerializeField] private float disconnectTimeoutSeconds = 300f;
    [SerializeField] private float disconnectWarningSeconds = 240f;

    // ------------------------------------------------------------------
    // Internal State
    // ------------------------------------------------------------------

    // Heartbeat tracking: playerId -> last seen time
    private Dictionary<int, float> _lastHeartbeatTime = new Dictionary<int, float>();
    private Dictionary<int, bool> _disconnectWarned = new Dictionary<int, bool>();
    private float _nextHeartbeatSendTime;

    // Active BattleManager reference (set by BattlePhase, used for state serialization)
    private BattleManager _activeBattleManager;

    // Callback for when game state is received (used by guest)
    private Action<string> _onGameStateCallback;

    // Callback for when an action is received (used by host)
    private Action<string> _onActionCallback;

#if MIRROR
    // Mirror NetworkManager reference would be set up here
    private Mirror.NetworkManager _mirrorManager;
#endif

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void Update()
    {
        if (!IsOnline) return;

        // Send heartbeat periodically
        if (Time.time >= _nextHeartbeatSendTime)
        {
            SendHeartbeat();
            _nextHeartbeatSendTime = Time.time + heartbeatIntervalSeconds;
        }

        // Host checks for disconnected players
        if (IsHost)
        {
            CheckHeartbeats();
        }
    }

    private void OnDestroy()
    {
        if (Instance == this)
        {
            StopNetwork();
            Instance = null;
        }
    }

    // ------------------------------------------------------------------
    // Public API: Connection Management
    // ------------------------------------------------------------------

    /// <summary>
    /// Set up as host: initialize network, start listening for client actions.
    /// </summary>
    public void StartHost()
    {
        IsHost = true;
        IsOnline = true;
        _lastHeartbeatTime.Clear();
        _disconnectWarned.Clear();
        _nextHeartbeatSendTime = Time.time + heartbeatIntervalSeconds;

        Debug.Log("[NetworkGameManager] Starting as HOST");

#if MIRROR
        _mirrorManager = GetComponent<Mirror.NetworkManager>();
        if (_mirrorManager != null)
        {
            _mirrorManager.StartHost();
        }
        Mirror.NetworkServer.RegisterHandler<MirrorActionMessage>(OnMirrorActionReceived);
        Mirror.NetworkServer.RegisterHandler<MirrorHeartbeatMessage>(OnMirrorHeartbeatReceived);
#endif

        // Register local host player heartbeat
        if (LocalPlayerId >= 0)
        {
            _lastHeartbeatTime[LocalPlayerId] = Time.time;
        }
    }

    /// <summary>
    /// Connect to an existing host as a client.
    /// </summary>
    public void StartClient(string hostAddress)
    {
        IsHost = false;
        IsOnline = true;
        _nextHeartbeatSendTime = Time.time + heartbeatIntervalSeconds;

        Debug.Log($"[NetworkGameManager] Starting as CLIENT, connecting to {hostAddress}");

#if MIRROR
        _mirrorManager = GetComponent<Mirror.NetworkManager>();
        if (_mirrorManager != null)
        {
            _mirrorManager.networkAddress = hostAddress;
            _mirrorManager.StartClient();
        }
        Mirror.NetworkClient.RegisterHandler<MirrorGameStateMessage>(OnMirrorGameStateReceived);
        Mirror.NetworkClient.RegisterHandler<MirrorChatRelayMessage>(OnMirrorChatRelayReceived);
#endif
    }

    /// <summary>
    /// Disconnect and clean up.
    /// </summary>
    public void StopNetwork()
    {
        if (!IsOnline) return;

        Debug.Log("[NetworkGameManager] Stopping network");

#if MIRROR
        if (_mirrorManager != null)
        {
            if (IsHost)
                _mirrorManager.StopHost();
            else
                _mirrorManager.StopClient();
        }
#endif

        IsOnline = false;
        IsHost = false;
        _lastHeartbeatTime.Clear();
        _disconnectWarned.Clear();
        _activeBattleManager = null;
    }

    // ------------------------------------------------------------------
    // Public API: Game State Sync
    // ------------------------------------------------------------------

    /// <summary>
    /// Set the active BattleManager for state serialization. Called by BattlePhase.Enter().
    /// </summary>
    public void SetActiveBattleManager(BattleManager manager)
    {
        _activeBattleManager = manager;
    }

    /// <summary>
    /// Get the active BattleManager reference. Used by NetworkMessageHelper for serialization.
    /// </summary>
    public BattleManager GetActiveBattleManagerRef()
    {
        return _activeBattleManager;
    }

    /// <summary>
    /// Host serializes full game state and broadcasts to all clients.
    /// </summary>
    public void PushGameState()
    {
        if (!IsHost || !IsOnline) return;

        var gm = GameManager.Instance;
        if (gm == null) return;

        string json = NetworkMessageHelper.SerializeGameState(gm);

        Debug.Log($"[NetworkGameManager] Pushing game state ({json.Length} chars)");

#if MIRROR
        var msg = new MirrorGameStateMessage { json = json };
        Mirror.NetworkServer.SendToAll(msg);
#endif

        // Also apply locally on host (for consistency)
        // Host already has authoritative state, so no need to apply
    }

    /// <summary>
    /// Called when a client receives game state from the host. Deserializes and applies.
    /// </summary>
    public void OnGameStateReceived(string json)
    {
        if (IsHost) return; // Host does not apply remote state to itself

        var gm = GameManager.Instance;
        if (gm == null) return;

        var stateData = NetworkMessageHelper.DeserializeGameState(json);
        if (stateData == null)
        {
            Debug.LogError("[NetworkGameManager] Failed to deserialize game state");
            return;
        }

        NetworkMessageHelper.ApplyGameState(stateData, gm);

        // Update all UI after state application
        HandleGuestPhaseUpdate(stateData);

        // Invoke external callback if set
        _onGameStateCallback?.Invoke(json);
    }

    /// <summary>
    /// Register a callback for when game state is received (guest-side).
    /// </summary>
    public void OnGameStateReceivedCallback(Action<string> callback)
    {
        _onGameStateCallback = callback;
    }

    // ------------------------------------------------------------------
    // Public API: Player Actions
    // ------------------------------------------------------------------

    /// <summary>
    /// Client sends an action to the host.
    /// </summary>
    public void SendAction(ActionType actionType, int playerId, object data)
    {
        if (!IsOnline) return;

        string json = NetworkMessageHelper.SerializeAction(actionType, playerId, data);

        if (IsHost)
        {
            // Host processes action directly (local player)
            OnActionReceived(json);
        }
        else
        {
#if MIRROR
            var msg = new MirrorActionMessage { json = json };
            Mirror.NetworkClient.Send(msg);
#endif
        }
    }

    /// <summary>
    /// Host receives and processes an action from a client.
    /// </summary>
    public void OnActionReceived(string json)
    {
        if (!IsHost) return;

        var actionData = NetworkMessageHelper.DeserializeAction(json);
        if (actionData == null)
        {
            Debug.LogError("[NetworkGameManager] Failed to deserialize player action");
            return;
        }

        HandleGuestAction(actionData);
    }

    // ------------------------------------------------------------------
    // Action Processing (Host Only)
    // ------------------------------------------------------------------

    /// <summary>
    /// Process a guest's action on the host. This is the authoritative handler.
    /// Maps from game.js handleGuestAction() ~line 14530.
    /// </summary>
    private void HandleGuestAction(PlayerActionData action)
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        int pid = action.playerId;
        if (pid < 0 || pid >= gm.Players.Count)
        {
            Debug.LogWarning($"[NetworkGameManager] Invalid playerId {pid} in action");
            return;
        }

        var player = gm.Players[pid];

        Debug.Log($"[NetworkGameManager] Processing action: {action.actionType} from player {pid}");

        switch (action.actionType)
        {
            case ActionType.ConfirmSelection:
                HandleConfirmSelection(gm, player, action.data);
                break;

            case ActionType.StorePurchase:
                HandleStorePurchase(gm, player, action.data);
                break;

            case ActionType.FinishShopping:
                HandleFinishShopping(gm, player);
                break;

            case ActionType.BattleAttack:
                HandleBattleAttack(gm, player);
                break;

            case ActionType.BattleDefense:
                // Defense is handled automatically by monster attack in BattleManager
                // This action type exists for future expansion
                break;

            case ActionType.BattleTame:
                HandleBattleTame(gm, player);
                break;

            case ActionType.BattleUseItem:
                HandleBattleUseItem(gm, player, action.data);
                break;

            case ActionType.BattleUseDoubleDamage:
                HandleBattleUseDoubleDamage(gm, player);
                break;

            case ActionType.StationChoice:
                HandleStationChoice(gm, player, action.data);
                break;

            case ActionType.PlayerBoardAction:
                HandlePlayerBoardAction(gm, player, action.data);
                break;

            case ActionType.CapacityOverflowAction:
                HandleCapacityOverflowAction(gm, player, action.data);
                break;

            case ActionType.KickVote:
                HandleKickVote(gm, player, action.data);
                break;

            case ActionType.ChatMessage:
                HandleChatMessage(gm, player, action.data);
                break;

            default:
                Debug.LogWarning($"[NetworkGameManager] Unhandled action type: {action.actionType}");
                break;
        }

        // After processing any action, push updated state to all clients
        PushGameState();
    }

    private void HandleConfirmSelection(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<SelectionActionPayload>(dataJson);
        if (payload == null) return;

        player.selectedHunterCard = (LocationId)payload.hunterLocation;
        player.selectedApprenticeCard = (LocationId)payload.apprenticeLocation;
        gm.PlayerCompletionStatus[player.id] = true;

        EventBus.Publish(new PlayerSelectionConfirmedEvent { playerId = player.id });

        // Check if all players have confirmed
        if (gm.AllPlayersCompleted())
        {
            EventBus.Publish(new AllPlayersSelectedEvent());
        }
    }

    private void HandleStorePurchase(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<StorePurchasePayload>(dataJson);
        if (payload == null) return;

        var item = gm.GetItemByName(payload.itemName);
        if (item == null)
        {
            Debug.LogWarning($"[NetworkGameManager] Item not found: {payload.itemName}");
            return;
        }

        bool success = gm.Resources.TryPurchaseItem(player, item);
        if (success)
        {
            EventBus.Publish(new GameLogEvent
            {
                message = $"{player.playerName} purchased {item.itemName}",
                logType = GameLogType.Action
            });
        }
    }

    private void HandleFinishShopping(GameManager gm, PlayerData player)
    {
        gm.PlayerCompletionStatus[player.id] = true;

        EventBus.Publish(new PlayerFinishedShoppingEvent { playerId = player.id });

        // Check capacity overflow
        if (gm.Resources.IsOverCapacity(player))
        {
            EventBus.Publish(new CapacityOverflowEvent
            {
                playerId = player.id,
                overflow = player.GetInventoryUsedCapacity() - player.maxInventoryCapacity
            });
        }
    }

    private void HandleBattleAttack(GameManager gm, PlayerData player)
    {
        if (_activeBattleManager == null) return;
        _activeBattleManager.ProcessPlayerAttack(player.id);
    }

    private void HandleBattleTame(GameManager gm, PlayerData player)
    {
        if (_activeBattleManager == null) return;
        _activeBattleManager.ProcessTame(player.id);
    }

    private void HandleBattleUseItem(GameManager gm, PlayerData player, string dataJson)
    {
        if (_activeBattleManager == null) return;

        var payload = JsonConvert.DeserializeObject<BattleItemPayload>(dataJson);
        if (payload == null) return;

        _activeBattleManager.ProcessItemUse(player.id, payload.itemIndex);
    }

    private void HandleBattleUseDoubleDamage(GameManager gm, PlayerData player)
    {
        if (_activeBattleManager == null) return;
        _activeBattleManager.ProcessDoubleDamage(player.id);
    }

    private void HandleStationChoice(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<StationChoicePayload>(dataJson);
        if (payload == null) return;

        EventBus.Publish(new StationChoiceMadeEvent
        {
            playerId = player.id,
            chosenResource = (ResourceType)payload.resourceType
        });
    }

    private void HandlePlayerBoardAction(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<PlayerBoardActionPayload>(dataJson);
        if (payload == null) return;

        switch (payload.action)
        {
            case "addToUpgradeEP":
                gm.Scoring.TryUpgradeEP(player);
                break;

            case "addToUpgradeHP":
                gm.Scoring.TryUpgradeHP(player);
                break;

            case "upgradeAttack":
                gm.Weapons.TryUpgradeAttack(player);
                break;

            case "upgradeDefense":
                gm.Weapons.TryUpgradeDefense(player);
                break;

            case "restoreHP":
                gm.Scoring.TryRestoreHP(player);
                break;

            case "restoreEP":
                gm.Scoring.TryRestoreEP(player);
                break;

            case "useItem":
                // Parse item index from param
                if (int.TryParse(payload.param, out int itemIdx))
                {
                    if (itemIdx >= 0 && itemIdx < player.inventory.Count)
                    {
                        var item = player.inventory[itemIdx];
                        player.inventory.RemoveAt(itemIdx);
                        EventBus.Publish(new ItemUsedEvent { playerId = player.id, item = item });
                    }
                }
                break;

            default:
                Debug.LogWarning($"[NetworkGameManager] Unknown board action: {payload.action}");
                break;
        }
    }

    private void HandleCapacityOverflowAction(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<CapacityOverflowPayload>(dataJson);
        if (payload == null) return;

        switch (payload.action)
        {
            case "use":
                if (payload.itemIndex >= 0 && payload.itemIndex < player.inventory.Count)
                {
                    var item = player.inventory[payload.itemIndex];
                    // Apply item effect based on type
                    switch (item.effectType)
                    {
                        case ItemEffectType.Beer:
                            gm.Resources.ChangeResource(player, "ep", 1);
                            break;
                        case ItemEffectType.BloodBag:
                            gm.Resources.ChangeResource(player, "hp", 1);
                            break;
                    }
                    player.inventory.RemoveAt(payload.itemIndex);
                    EventBus.Publish(new ItemUsedEvent { playerId = player.id, item = item });
                }
                break;

            case "upgrade":
                if (payload.itemIndex >= 0 && payload.itemIndex < player.inventory.Count)
                {
                    var item = player.inventory[payload.itemIndex];
                    if (item.effectType == ItemEffectType.Beer)
                    {
                        gm.Scoring.TryUpgradeEP(player);
                    }
                    else if (item.effectType == ItemEffectType.BloodBag)
                    {
                        gm.Scoring.TryUpgradeHP(player);
                    }
                }
                break;

            case "discard":
                if (payload.itemIndex >= 0 && payload.itemIndex < player.inventory.Count)
                {
                    player.inventory.RemoveAt(payload.itemIndex);
                }
                break;
        }
    }

    private void HandleKickVote(GameManager gm, PlayerData player, string dataJson)
    {
        var payload = JsonConvert.DeserializeObject<KickVotePayload>(dataJson);
        if (payload == null) return;

        // Publish vote event for the kick vote system to process
        // The kick vote system is typically managed by a separate UI/manager
        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} voted to {(payload.vote ? "kick" : "keep")} player {payload.targetId}",
            logType = GameLogType.System
        });

        // Actual kick vote tallying would be handled by a KickVoteManager
        // that subscribes to these events. For now, relay the vote.
    }

    private void HandleChatMessage(GameManager gm, PlayerData player, string dataJson)
    {
        var chatData = JsonConvert.DeserializeObject<ChatMessageData>(dataJson);
        if (chatData == null)
        {
            // Fallback: treat dataJson as raw message string
            chatData = new ChatMessageData
            {
                senderId = player.id,
                senderName = player.playerName,
                message = dataJson.Trim('"'),
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
        }

        // Publish locally on host
        EventBus.Publish(new ChatMessageEvent
        {
            senderId = chatData.senderId,
            message = chatData.message
        });

        // Relay to all clients
        string relayJson = JsonConvert.SerializeObject(chatData);

#if MIRROR
        var msg = new MirrorChatRelayMessage { json = relayJson };
        Mirror.NetworkServer.SendToAll(msg);
#endif
    }

    // ------------------------------------------------------------------
    // Guest Phase Update (Client Only)
    // ------------------------------------------------------------------

    /// <summary>
    /// After receiving and applying remote state, update UI and button states.
    /// Maps from game.js handleGuestPhaseUpdate() ~line 13461.
    /// </summary>
    private void HandleGuestPhaseUpdate(GameStateData stateData)
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        // Publish resource changed events for all players so UI updates
        foreach (var playerState in stateData.players)
        {
            if (playerState.id < gm.Players.Count)
            {
                EventBus.Publish(new ResourceChangedEvent
                {
                    playerId = playerState.id,
                    resourceName = "all",
                    oldValue = 0,
                    newValue = 0
                });
            }
        }

        // Phase-specific UI updates are handled by the existing EventBus subscribers
        // since ApplyGameState already triggers PhaseChangedEvent when phase differs
    }

    // ------------------------------------------------------------------
    // Heartbeat System
    // ------------------------------------------------------------------

    private void SendHeartbeat()
    {
        if (LocalPlayerId < 0) return;

        if (IsHost)
        {
            // Host updates its own heartbeat locally
            _lastHeartbeatTime[LocalPlayerId] = Time.time;
        }
        else
        {
#if MIRROR
            var msg = new MirrorHeartbeatMessage { playerId = LocalPlayerId };
            Mirror.NetworkClient.Send(msg);
#endif
        }
    }

    /// <summary>
    /// Host checks all players' heartbeats and disconnects timed-out players.
    /// </summary>
    private void CheckHeartbeats()
    {
        if (!IsHost) return;

        var gm = GameManager.Instance;
        if (gm == null) return;

        float currentTime = Time.time;
        List<int> playersToDisconnect = null;

        foreach (var player in gm.Players)
        {
            if (player.isBot) continue; // Bots don't have heartbeats

            if (!_lastHeartbeatTime.ContainsKey(player.id))
            {
                _lastHeartbeatTime[player.id] = currentTime;
                continue;
            }

            float elapsed = currentTime - _lastHeartbeatTime[player.id];

            // Disconnect after timeout
            if (elapsed >= disconnectTimeoutSeconds)
            {
                if (playersToDisconnect == null) playersToDisconnect = new List<int>();
                playersToDisconnect.Add(player.id);
                continue;
            }

            // Warning at warning threshold
            if (elapsed >= disconnectWarningSeconds)
            {
                if (!_disconnectWarned.ContainsKey(player.id) || !_disconnectWarned[player.id])
                {
                    _disconnectWarned[player.id] = true;
                    EventBus.Publish(new GameLogEvent
                    {
                        message = $"{player.playerName} may be disconnected (no response for {(int)elapsed}s)",
                        logType = GameLogType.System
                    });
                }
            }
            else
            {
                _disconnectWarned[player.id] = false;
            }
        }

        // Process disconnections
        if (playersToDisconnect != null)
        {
            foreach (int pid in playersToDisconnect)
            {
                DisconnectPlayer(pid);
            }
        }
    }

    /// <summary>
    /// Handle a player disconnection: remove from game, clear tokens, notify others.
    /// </summary>
    private void DisconnectPlayer(int playerId)
    {
        var gm = GameManager.Instance;
        if (gm == null) return;

        if (playerId < 0 || playerId >= gm.Players.Count) return;
        var player = gm.Players[playerId];

        Debug.Log($"[NetworkGameManager] Player {player.playerName} (id={playerId}) disconnected");

        // Mark as bot so AI takes over
        player.isBot = true;

        // Create a bot to control the disconnected player
        gm.Bots.Add(new BotPlayer(player.id, gm));

        // Clear heartbeat tracking
        _lastHeartbeatTime.Remove(playerId);
        _disconnectWarned.Remove(playerId);

        EventBus.Publish(new PlayerDisconnectedEvent { playerId = playerId });
        EventBus.Publish(new GameLogEvent
        {
            message = $"{player.playerName} has disconnected. AI takes over.",
            logType = GameLogType.System
        });

        // If the disconnected player was blocking phase progress, mark them as complete
        if (gm.PlayerCompletionStatus.ContainsKey(playerId) && !gm.PlayerCompletionStatus[playerId])
        {
            gm.PlayerCompletionStatus[playerId] = true;

            if (gm.AllPlayersCompleted())
            {
                if (gm.StateMachine.CurrentPhase == GamePhase.Selection)
                {
                    EventBus.Publish(new AllPlayersSelectedEvent());
                }
            }
        }

        PushGameState();
    }

    /// <summary>
    /// Register a player's heartbeat (called when host receives heartbeat from client).
    /// </summary>
    public void RegisterHeartbeat(int playerId)
    {
        _lastHeartbeatTime[playerId] = Time.time;
    }

    // ------------------------------------------------------------------
    // Mirror Message Types (compiled only with MIRROR defined)
    // ------------------------------------------------------------------

#if MIRROR
    public struct MirrorGameStateMessage : Mirror.NetworkMessage
    {
        public string json;
    }

    public struct MirrorActionMessage : Mirror.NetworkMessage
    {
        public string json;
    }

    public struct MirrorHeartbeatMessage : Mirror.NetworkMessage
    {
        public int playerId;
    }

    public struct MirrorChatRelayMessage : Mirror.NetworkMessage
    {
        public string json;
    }

    private void OnMirrorGameStateReceived(MirrorGameStateMessage msg)
    {
        OnGameStateReceived(msg.json);
    }

    private void OnMirrorActionReceived(Mirror.NetworkConnectionToClient conn, MirrorActionMessage msg)
    {
        OnActionReceived(msg.json);
    }

    private void OnMirrorHeartbeatReceived(Mirror.NetworkConnectionToClient conn, MirrorHeartbeatMessage msg)
    {
        RegisterHeartbeat(msg.playerId);
    }

    private void OnMirrorChatRelayReceived(MirrorChatRelayMessage msg)
    {
        var chatData = JsonConvert.DeserializeObject<ChatMessageData>(msg.json);
        if (chatData != null)
        {
            EventBus.Publish(new ChatMessageEvent
            {
                senderId = chatData.senderId,
                message = chatData.message
            });
        }
    }
#endif
}
