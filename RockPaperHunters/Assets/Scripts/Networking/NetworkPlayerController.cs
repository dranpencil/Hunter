using UnityEngine;
using Newtonsoft.Json;

/// <summary>
/// Per-player network controller. Each networked human player has one of these.
/// Provides Command methods (client -> server) and Rpc methods (server -> client).
/// Maps from game.js pushAction() pattern and guest action types.
/// </summary>
public class NetworkPlayerController : MonoBehaviour
{
    // ------------------------------------------------------------------
    // Properties
    // ------------------------------------------------------------------

    public int PlayerId { get; set; } = -1;
    public bool IsLocalPlayer { get; set; }

    // ------------------------------------------------------------------
    // Client -> Server Commands
    // Each Cmd method packages the data and sends via NetworkGameManager.
    // With Mirror, these would be [Command] methods on a NetworkBehaviour.
    // ------------------------------------------------------------------

    /// <summary>
    /// Confirm hunter and apprentice location selections.
    /// </summary>
    public void CmdConfirmSelection(int hunterLoc, int apprenticeLoc)
    {
        if (!IsLocalPlayer) return;

        var payload = new SelectionActionPayload
        {
            hunterLocation = hunterLoc,
            apprenticeLocation = apprenticeLoc
        };

#if MIRROR
        CmdConfirmSelectionMirror(hunterLoc, apprenticeLoc);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.ConfirmSelection, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Purchase an item from the store.
    /// </summary>
    public void CmdPurchaseItem(string itemName)
    {
        if (!IsLocalPlayer) return;

        var payload = new StorePurchasePayload { itemName = itemName };

#if MIRROR
        CmdPurchaseItemMirror(itemName);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.StorePurchase, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Signal that this player is done shopping.
    /// </summary>
    public void CmdFinishShopping()
    {
        if (!IsLocalPlayer) return;

#if MIRROR
        CmdFinishShoppingMirror();
#else
        NetworkGameManager.Instance?.SendAction(ActionType.FinishShopping, PlayerId, null);
#endif
    }

    /// <summary>
    /// Attack the current monster in battle.
    /// </summary>
    public void CmdBattleAttack()
    {
        if (!IsLocalPlayer) return;

#if MIRROR
        CmdBattleAttackMirror();
#else
        NetworkGameManager.Instance?.SendAction(ActionType.BattleAttack, PlayerId, null);
#endif
    }

    /// <summary>
    /// Attempt to tame the current monster.
    /// </summary>
    public void CmdBattleTame()
    {
        if (!IsLocalPlayer) return;

#if MIRROR
        CmdBattleTameMirror();
#else
        NetworkGameManager.Instance?.SendAction(ActionType.BattleTame, PlayerId, null);
#endif
    }

    /// <summary>
    /// Use an item during battle.
    /// </summary>
    public void CmdBattleUseItem(int itemIndex)
    {
        if (!IsLocalPlayer) return;

        var payload = new BattleItemPayload { itemIndex = itemIndex };

#if MIRROR
        CmdBattleUseItemMirror(itemIndex);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.BattleUseItem, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Activate Knife double damage before attacking.
    /// </summary>
    public void CmdBattleUseDoubleDamage()
    {
        if (!IsLocalPlayer) return;

#if MIRROR
        CmdBattleUseDoubleDamageMirror();
#else
        NetworkGameManager.Instance?.SendAction(ActionType.BattleUseDoubleDamage, PlayerId, null);
#endif
    }

    /// <summary>
    /// Choose a resource type at the Station.
    /// </summary>
    public void CmdStationChoice(int resourceType)
    {
        if (!IsLocalPlayer) return;

        var payload = new StationChoicePayload { resourceType = resourceType };

#if MIRROR
        CmdStationChoiceMirror(resourceType);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.StationChoice, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Perform a player board action (upgrade weapon, restore HP/EP, use item, etc.).
    /// </summary>
    public void CmdPlayerBoardAction(string action, string param)
    {
        if (!IsLocalPlayer) return;

        var payload = new PlayerBoardActionPayload
        {
            action = action,
            param = param ?? ""
        };

#if MIRROR
        CmdPlayerBoardActionMirror(action, param ?? "");
#else
        NetworkGameManager.Instance?.SendAction(ActionType.PlayerBoardAction, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Send a chat message.
    /// </summary>
    public void CmdChatMessage(string message)
    {
        if (!IsLocalPlayer) return;

        var gm = GameManager.Instance;
        string senderName = "Player";
        if (gm != null && PlayerId >= 0 && PlayerId < gm.Players.Count)
        {
            senderName = gm.Players[PlayerId].playerName;
        }

        var chatData = new ChatMessageData
        {
            senderId = PlayerId,
            senderName = senderName,
            message = message,
            timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

#if MIRROR
        CmdChatMessageMirror(JsonConvert.SerializeObject(chatData));
#else
        NetworkGameManager.Instance?.SendAction(ActionType.ChatMessage, PlayerId, chatData);
#endif
    }

    /// <summary>
    /// Submit a kick vote for a target player.
    /// </summary>
    public void CmdKickVote(int targetId, bool vote)
    {
        if (!IsLocalPlayer) return;

        var payload = new KickVotePayload
        {
            targetId = targetId,
            vote = vote
        };

#if MIRROR
        CmdKickVoteMirror(targetId, vote);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.KickVote, PlayerId, payload);
#endif
    }

    /// <summary>
    /// Handle capacity overflow resolution.
    /// </summary>
    public void CmdCapacityOverflowAction(string action, int itemIndex)
    {
        if (!IsLocalPlayer) return;

        var payload = new CapacityOverflowPayload
        {
            action = action,
            itemIndex = itemIndex
        };

#if MIRROR
        CmdCapacityOverflowActionMirror(action, itemIndex);
#else
        NetworkGameManager.Instance?.SendAction(ActionType.CapacityOverflowAction, PlayerId, payload);
#endif
    }

    // ------------------------------------------------------------------
    // Server -> Client RPCs
    // ------------------------------------------------------------------

    /// <summary>
    /// Receive updated game state from host.
    /// </summary>
    public void RpcUpdateGameState(string json)
    {
#if MIRROR
        // With Mirror, this would be [ClientRpc]
#endif
        if (!IsLocalPlayer) return;
        NetworkGameManager.Instance?.OnGameStateReceived(json);
    }

    /// <summary>
    /// Receive a chat message relayed from host.
    /// </summary>
    public void RpcChatMessage(string json)
    {
#if MIRROR
        // With Mirror, this would be [ClientRpc]
#endif
        var chatData = JsonConvert.DeserializeObject<ChatMessageData>(json);
        if (chatData != null)
        {
            EventBus.Publish(new ChatMessageEvent
            {
                senderId = chatData.senderId,
                message = chatData.message
            });
        }
    }

    /// <summary>
    /// Receive notification that a player was disconnected.
    /// </summary>
    public void RpcPlayerDisconnected(int disconnectedPlayerId)
    {
#if MIRROR
        // With Mirror, this would be [ClientRpc]
#endif
        EventBus.Publish(new PlayerDisconnectedEvent { playerId = disconnectedPlayerId });
    }

    /// <summary>
    /// Receive kick vote started notification.
    /// </summary>
    public void RpcKickVoteStarted(int[] targetPlayerIds)
    {
#if MIRROR
        // With Mirror, this would be [ClientRpc]
#endif
        EventBus.Publish(new KickVoteStartedEvent { targetPlayerIds = targetPlayerIds });
    }

    /// <summary>
    /// Receive kick vote result notification.
    /// </summary>
    public void RpcKickVoteEnded(int[] kickedPlayerIds)
    {
#if MIRROR
        // With Mirror, this would be [ClientRpc]
#endif
        EventBus.Publish(new KickVoteEndedEvent { kickedPlayerIds = kickedPlayerIds });
    }

    // ------------------------------------------------------------------
    // Mirror Command Implementations (compiled only with MIRROR defined)
    // ------------------------------------------------------------------

#if MIRROR
    [Mirror.Command]
    private void CmdConfirmSelectionMirror(int hunterLoc, int apprenticeLoc)
    {
        var payload = new SelectionActionPayload
        {
            hunterLocation = hunterLoc,
            apprenticeLocation = apprenticeLoc
        };
        NetworkGameManager.Instance?.SendAction(ActionType.ConfirmSelection, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdPurchaseItemMirror(string itemName)
    {
        var payload = new StorePurchasePayload { itemName = itemName };
        NetworkGameManager.Instance?.SendAction(ActionType.StorePurchase, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdFinishShoppingMirror()
    {
        NetworkGameManager.Instance?.SendAction(ActionType.FinishShopping, PlayerId, null);
    }

    [Mirror.Command]
    private void CmdBattleAttackMirror()
    {
        NetworkGameManager.Instance?.SendAction(ActionType.BattleAttack, PlayerId, null);
    }

    [Mirror.Command]
    private void CmdBattleTameMirror()
    {
        NetworkGameManager.Instance?.SendAction(ActionType.BattleTame, PlayerId, null);
    }

    [Mirror.Command]
    private void CmdBattleUseItemMirror(int itemIndex)
    {
        var payload = new BattleItemPayload { itemIndex = itemIndex };
        NetworkGameManager.Instance?.SendAction(ActionType.BattleUseItem, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdBattleUseDoubleDamageMirror()
    {
        NetworkGameManager.Instance?.SendAction(ActionType.BattleUseDoubleDamage, PlayerId, null);
    }

    [Mirror.Command]
    private void CmdStationChoiceMirror(int resourceType)
    {
        var payload = new StationChoicePayload { resourceType = resourceType };
        NetworkGameManager.Instance?.SendAction(ActionType.StationChoice, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdPlayerBoardActionMirror(string action, string param)
    {
        var payload = new PlayerBoardActionPayload { action = action, param = param };
        NetworkGameManager.Instance?.SendAction(ActionType.PlayerBoardAction, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdChatMessageMirror(string chatJson)
    {
        var chatData = JsonConvert.DeserializeObject<ChatMessageData>(chatJson);
        NetworkGameManager.Instance?.SendAction(ActionType.ChatMessage, PlayerId, chatData);
    }

    [Mirror.Command]
    private void CmdKickVoteMirror(int targetId, bool vote)
    {
        var payload = new KickVotePayload { targetId = targetId, vote = vote };
        NetworkGameManager.Instance?.SendAction(ActionType.KickVote, PlayerId, payload);
    }

    [Mirror.Command]
    private void CmdCapacityOverflowActionMirror(string action, int itemIndex)
    {
        var payload = new CapacityOverflowPayload { action = action, itemIndex = itemIndex };
        NetworkGameManager.Instance?.SendAction(ActionType.CapacityOverflowAction, PlayerId, payload);
    }

    [Mirror.ClientRpc]
    private void RpcUpdateGameStateMirror(string json)
    {
        RpcUpdateGameState(json);
    }

    [Mirror.ClientRpc]
    private void RpcChatMessageMirror(string json)
    {
        RpcChatMessage(json);
    }

    [Mirror.ClientRpc]
    private void RpcPlayerDisconnectedMirror(int disconnectedPlayerId)
    {
        RpcPlayerDisconnected(disconnectedPlayerId);
    }

    [Mirror.ClientRpc]
    private void RpcKickVoteStartedMirror(int[] targetPlayerIds)
    {
        RpcKickVoteStarted(targetPlayerIds);
    }

    [Mirror.ClientRpc]
    private void RpcKickVoteEndedMirror(int[] kickedPlayerIds)
    {
        RpcKickVoteEnded(kickedPlayerIds);
    }
#endif
}
