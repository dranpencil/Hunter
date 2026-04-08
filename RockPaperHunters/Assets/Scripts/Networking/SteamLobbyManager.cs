using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Manages Steam lobby creation, joining, leaving, and member queries.
/// Replaces the Firebase room system from the web version.
/// All Steamworks calls are wrapped in #if STEAMWORKS; without it, a local-only
/// fallback simulates lobby behavior for testing.
/// Maps from firebase-config.js room management (create/join room, heartbeat, etc.).
/// </summary>
public class SteamLobbyManager : MonoBehaviour
{
    // ------------------------------------------------------------------
    // Public Properties
    // ------------------------------------------------------------------

    public bool IsInLobby { get; private set; }
    public string RoomCode { get; private set; }

    // ------------------------------------------------------------------
    // Internal State
    // ------------------------------------------------------------------

#if STEAMWORKS
    private Steamworks.CSteamID _currentLobbyId;
    private Steamworks.CallResult<Steamworks.LobbyCreated_t> _lobbyCreatedCallResult;
    private Steamworks.CallResult<Steamworks.LobbyEnter_t> _lobbyEnteredCallResult;
    private Steamworks.Callback<Steamworks.LobbyChatUpdate_t> _lobbyChatUpdateCallback;
    private Steamworks.Callback<Steamworks.LobbyDataUpdate_t> _lobbyDataUpdateCallback;
#endif

    // Local fallback state (used when STEAMWORKS is not defined)
    private bool _isLocalFallback;
    private Dictionary<string, string> _localLobbyData = new Dictionary<string, string>();
    private List<LobbyMemberInfo> _localMembers = new List<LobbyMemberInfo>();
    private int _localMaxPlayers;

    // Pending callbacks
    private Action<bool, string> _createLobbyCallback;
    private Action<bool> _joinLobbyCallback;

    // Static registry for local lobbies (allows simulated join)
    private static Dictionary<string, SteamLobbyManager> _localLobbyRegistry
        = new Dictionary<string, SteamLobbyManager>();

    // ------------------------------------------------------------------
    // Room Code Generation
    // ------------------------------------------------------------------

    /// <summary>
    /// Valid characters for room codes: A-Z and 2-9, excluding I and O to avoid confusion.
    /// Matches the JS version's room code generation.
    /// </summary>
    private static readonly char[] RoomCodeChars =
    {
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R',
        'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        '2', '3', '4', '5', '6', '7', '8', '9'
    };

    /// <summary>
    /// Generate a 4-character room code using the allowed character set.
    /// </summary>
    public static string GenerateRoomCode()
    {
        char[] code = new char[4];
        for (int i = 0; i < 4; i++)
        {
            code[i] = RoomCodeChars[UnityEngine.Random.Range(0, RoomCodeChars.Length)];
        }
        return new string(code);
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    private void OnDestroy()
    {
        if (IsInLobby)
        {
            LeaveLobby();
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /// <summary>
    /// Create a new lobby with the specified max player count.
    /// Callback receives (success, roomCode).
    /// </summary>
    public void CreateLobby(int maxPlayers, Action<bool, string> callback)
    {
        if (IsInLobby)
        {
            Debug.LogWarning("[SteamLobbyManager] Already in a lobby. Leave first.");
            callback?.Invoke(false, null);
            return;
        }

        _createLobbyCallback = callback;
        RoomCode = GenerateRoomCode();

#if STEAMWORKS
        if (SteamManager.Instance != null && SteamManager.Instance.IsInitialized)
        {
            var apiCall = Steamworks.SteamMatchmaking.CreateLobby(
                Steamworks.ELobbyType.k_ELobbyTypePublic,
                maxPlayers
            );

            _lobbyCreatedCallResult = Steamworks.CallResult<Steamworks.LobbyCreated_t>.Create(OnLobbyCreated);
            _lobbyCreatedCallResult.Set(apiCall);

            // Register for lobby updates
            _lobbyChatUpdateCallback = Steamworks.Callback<Steamworks.LobbyChatUpdate_t>.Create(OnLobbyChatUpdate);
            _lobbyDataUpdateCallback = Steamworks.Callback<Steamworks.LobbyDataUpdate_t>.Create(OnLobbyDataUpdate);

            Debug.Log($"[SteamLobbyManager] Creating Steam lobby (max {maxPlayers} players)...");
            return;
        }
#endif

        // Local fallback: simulate lobby creation
        _isLocalFallback = true;
        _localMaxPlayers = maxPlayers;
        _localLobbyData.Clear();
        _localMembers.Clear();
        IsInLobby = true;

        // Add the local player as the first member
        string localId = SteamManager.Instance != null
            ? SteamManager.Instance.GetSteamId()
            : "LocalHost";
        string localName = SteamManager.Instance != null
            ? SteamManager.Instance.GetPlayerName()
            : "Host";

        _localMembers.Add(new LobbyMemberInfo
        {
            steamId = localId,
            playerName = localName,
            isHost = true
        });

        // Register in local registry for simulated joins
        _localLobbyRegistry[RoomCode] = this;

        Debug.Log($"[SteamLobbyManager] Local lobby created with code: {RoomCode}");
        _createLobbyCallback?.Invoke(true, RoomCode);
        _createLobbyCallback = null;
    }

    /// <summary>
    /// Join an existing lobby by room code.
    /// Callback receives (success).
    /// </summary>
    public void JoinLobby(string roomCode, Action<bool> callback)
    {
        if (IsInLobby)
        {
            Debug.LogWarning("[SteamLobbyManager] Already in a lobby. Leave first.");
            callback?.Invoke(false);
            return;
        }

        _joinLobbyCallback = callback;
        RoomCode = roomCode.ToUpper();

#if STEAMWORKS
        if (SteamManager.Instance != null && SteamManager.Instance.IsInitialized)
        {
            // Search for lobbies with matching room code
            Steamworks.SteamMatchmaking.AddRequestLobbyListStringFilter(
                "roomCode", RoomCode,
                Steamworks.ELobbyComparison.k_ELobbyComparisonEqual
            );
            Steamworks.SteamMatchmaking.AddRequestLobbyListResultCountFilter(1);

            var apiCall = Steamworks.SteamMatchmaking.RequestLobbyList();
            var lobbyListCallResult = Steamworks.CallResult<Steamworks.LobbyMatchList_t>.Create(OnLobbyListReceived);
            lobbyListCallResult.Set(apiCall);

            Debug.Log($"[SteamLobbyManager] Searching for lobby with code: {RoomCode}...");
            return;
        }
#endif

        // Local fallback: look up lobby in registry
        if (_localLobbyRegistry.ContainsKey(RoomCode))
        {
            var hostLobby = _localLobbyRegistry[RoomCode];

            // Check if lobby has room
            if (hostLobby._localMembers.Count >= hostLobby._localMaxPlayers)
            {
                Debug.LogWarning($"[SteamLobbyManager] Lobby {RoomCode} is full.");
                _joinLobbyCallback?.Invoke(false);
                _joinLobbyCallback = null;
                return;
            }

            _isLocalFallback = true;
            IsInLobby = true;

            string localId = SteamManager.Instance != null
                ? SteamManager.Instance.GetSteamId()
                : "LocalGuest_" + UnityEngine.Random.Range(1000, 9999);
            string localName = SteamManager.Instance != null
                ? SteamManager.Instance.GetPlayerName()
                : "Guest";

            hostLobby._localMembers.Add(new LobbyMemberInfo
            {
                steamId = localId,
                playerName = localName,
                isHost = false
            });

            Debug.Log($"[SteamLobbyManager] Joined local lobby: {RoomCode}");
            _joinLobbyCallback?.Invoke(true);
            _joinLobbyCallback = null;
        }
        else
        {
            Debug.LogWarning($"[SteamLobbyManager] No local lobby found with code: {RoomCode}");
            _joinLobbyCallback?.Invoke(false);
            _joinLobbyCallback = null;
        }
    }

    /// <summary>
    /// Leave the current lobby.
    /// </summary>
    public void LeaveLobby()
    {
        if (!IsInLobby) return;

#if STEAMWORKS
        if (!_isLocalFallback)
        {
            Steamworks.SteamMatchmaking.LeaveLobby(_currentLobbyId);
            _currentLobbyId = Steamworks.CSteamID.Nil;
            Debug.Log("[SteamLobbyManager] Left Steam lobby.");
        }
#endif

        if (_isLocalFallback)
        {
            // Remove from local registry if we're the host
            if (_localLobbyRegistry.ContainsKey(RoomCode) && _localLobbyRegistry[RoomCode] == this)
            {
                _localLobbyRegistry.Remove(RoomCode);
            }
            _localMembers.Clear();
            _localLobbyData.Clear();
        }

        IsInLobby = false;
        RoomCode = null;
        _isLocalFallback = false;

        Debug.Log("[SteamLobbyManager] Left lobby.");
    }

    /// <summary>
    /// Set metadata on the current lobby. Only the host should call this.
    /// </summary>
    public void SetLobbyData(string key, string value)
    {
        if (!IsInLobby) return;

#if STEAMWORKS
        if (!_isLocalFallback)
        {
            Steamworks.SteamMatchmaking.SetLobbyData(_currentLobbyId, key, value);
            return;
        }
#endif

        // Local fallback
        _localLobbyData[key] = value;
    }

    /// <summary>
    /// Get metadata from the current lobby.
    /// </summary>
    public string GetLobbyData(string key)
    {
        if (!IsInLobby) return null;

#if STEAMWORKS
        if (!_isLocalFallback)
        {
            return Steamworks.SteamMatchmaking.GetLobbyData(_currentLobbyId, key);
        }
#endif

        // Local fallback
        return _localLobbyData.ContainsKey(key) ? _localLobbyData[key] : null;
    }

    /// <summary>
    /// Returns a list of all members in the current lobby.
    /// </summary>
    public List<LobbyMemberInfo> GetLobbyMembers()
    {
        var members = new List<LobbyMemberInfo>();

        if (!IsInLobby) return members;

#if STEAMWORKS
        if (!_isLocalFallback)
        {
            int memberCount = Steamworks.SteamMatchmaking.GetNumLobbyMembers(_currentLobbyId);
            var hostId = Steamworks.SteamMatchmaking.GetLobbyOwner(_currentLobbyId);

            for (int i = 0; i < memberCount; i++)
            {
                var memberId = Steamworks.SteamMatchmaking.GetLobbyMemberByIndex(_currentLobbyId, i);
                string name = Steamworks.SteamFriends.GetFriendPersonaName(memberId);

                members.Add(new LobbyMemberInfo
                {
                    steamId = memberId.ToString(),
                    playerName = name,
                    isHost = memberId == hostId
                });
            }
            return members;
        }
#endif

        // Local fallback
        members.AddRange(_localMembers);
        return members;
    }

    /// <summary>
    /// Get the number of members currently in the lobby.
    /// </summary>
    public int GetMemberCount()
    {
        if (!IsInLobby) return 0;

#if STEAMWORKS
        if (!_isLocalFallback)
        {
            return Steamworks.SteamMatchmaking.GetNumLobbyMembers(_currentLobbyId);
        }
#endif

        return _localMembers.Count;
    }

    // ------------------------------------------------------------------
    // Steamworks Callbacks
    // ------------------------------------------------------------------

#if STEAMWORKS
    private void OnLobbyCreated(Steamworks.LobbyCreated_t result, bool ioFailure)
    {
        if (ioFailure || result.m_eResult != Steamworks.EResult.k_EResultOK)
        {
            Debug.LogError($"[SteamLobbyManager] Failed to create lobby: {result.m_eResult}");
            IsInLobby = false;
            _createLobbyCallback?.Invoke(false, null);
            _createLobbyCallback = null;
            return;
        }

        _currentLobbyId = new Steamworks.CSteamID(result.m_ulSteamIDLobby);
        IsInLobby = true;

        // Set the room code as lobby metadata for lookup
        Steamworks.SteamMatchmaking.SetLobbyData(_currentLobbyId, "roomCode", RoomCode);
        Steamworks.SteamMatchmaking.SetLobbyData(_currentLobbyId, "gameName", "RockPaperHunters");

        Debug.Log($"[SteamLobbyManager] Steam lobby created. ID: {_currentLobbyId}, Code: {RoomCode}");
        _createLobbyCallback?.Invoke(true, RoomCode);
        _createLobbyCallback = null;
    }

    private void OnLobbyListReceived(Steamworks.LobbyMatchList_t result, bool ioFailure)
    {
        if (ioFailure || result.m_nLobbiesMatching == 0)
        {
            Debug.LogWarning($"[SteamLobbyManager] No lobby found with code: {RoomCode}");
            _joinLobbyCallback?.Invoke(false);
            _joinLobbyCallback = null;
            return;
        }

        // Join the first matching lobby
        var lobbyId = Steamworks.SteamMatchmaking.GetLobbyByIndex(0);
        var apiCall = Steamworks.SteamMatchmaking.JoinLobby(lobbyId);

        _lobbyEnteredCallResult = Steamworks.CallResult<Steamworks.LobbyEnter_t>.Create(OnLobbyEntered);
        _lobbyEnteredCallResult.Set(apiCall);
    }

    private void OnLobbyEntered(Steamworks.LobbyEnter_t result, bool ioFailure)
    {
        if (ioFailure || result.m_EChatRoomEnterResponse != (uint)Steamworks.EChatRoomEnterResponse.k_EChatRoomEnterResponseSuccess)
        {
            Debug.LogError($"[SteamLobbyManager] Failed to join lobby: {result.m_EChatRoomEnterResponse}");
            _joinLobbyCallback?.Invoke(false);
            _joinLobbyCallback = null;
            return;
        }

        _currentLobbyId = new Steamworks.CSteamID(result.m_ulSteamIDLobby);
        IsInLobby = true;

        // Register for lobby updates
        _lobbyChatUpdateCallback = Steamworks.Callback<Steamworks.LobbyChatUpdate_t>.Create(OnLobbyChatUpdate);
        _lobbyDataUpdateCallback = Steamworks.Callback<Steamworks.LobbyDataUpdate_t>.Create(OnLobbyDataUpdate);

        Debug.Log($"[SteamLobbyManager] Joined Steam lobby: {_currentLobbyId}");
        _joinLobbyCallback?.Invoke(true);
        _joinLobbyCallback = null;
    }

    private void OnLobbyChatUpdate(Steamworks.LobbyChatUpdate_t update)
    {
        // Handle member join/leave events
        var changeFlags = (Steamworks.EChatMemberStateChange)update.m_rgfChatMemberStateChange;

        if (changeFlags.HasFlag(Steamworks.EChatMemberStateChange.k_EChatMemberStateChangeEntered))
        {
            Debug.Log("[SteamLobbyManager] A player joined the lobby.");
        }
        else if (changeFlags.HasFlag(Steamworks.EChatMemberStateChange.k_EChatMemberStateChangeLeft) ||
                 changeFlags.HasFlag(Steamworks.EChatMemberStateChange.k_EChatMemberStateChangeDisconnected))
        {
            Debug.Log("[SteamLobbyManager] A player left the lobby.");
        }
    }

    private void OnLobbyDataUpdate(Steamworks.LobbyDataUpdate_t update)
    {
        // Lobby metadata was updated
        Debug.Log("[SteamLobbyManager] Lobby data updated.");
    }
#endif
}

/// <summary>
/// Information about a lobby member.
/// </summary>
[Serializable]
public class LobbyMemberInfo
{
    public string steamId;
    public string playerName;
    public bool isHost;
}
