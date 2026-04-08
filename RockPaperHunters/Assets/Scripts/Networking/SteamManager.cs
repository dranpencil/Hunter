using UnityEngine;

/// <summary>
/// Singleton that handles Steamworks SDK initialization, callbacks, and shutdown.
/// Wraps all Steamworks.NET calls in #if STEAMWORKS so the project compiles without it.
/// Maps from the Steam integration layer replacing firebase-config.js OnlineManager.
/// </summary>
public class SteamManager : MonoBehaviour
{
    public static SteamManager Instance { get; private set; }

    [SerializeField] private uint appId = 480; // Spacewar test app ID for development

    /// <summary>
    /// Whether the Steam API has been successfully initialized.
    /// </summary>
    public bool IsInitialized { get; private set; }

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

    private void Start()
    {
        Init();
    }

    private void Update()
    {
#if STEAMWORKS
        if (IsInitialized)
        {
            Steamworks.SteamAPI.RunCallbacks();
        }
#endif
    }

    private void OnApplicationQuit()
    {
        Shutdown();
    }

    private void OnDestroy()
    {
        if (Instance == this)
        {
            Shutdown();
            Instance = null;
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /// <summary>
    /// Initialize the Steamworks API. Must be called before any other Steam calls.
    /// In non-STEAMWORKS builds, this sets IsInitialized to true as a local fallback.
    /// </summary>
    public void Init()
    {
        if (IsInitialized) return;

#if STEAMWORKS
        try
        {
            // Ensure steam_appid.txt exists for development (not needed in release builds)
            if (!Steamworks.SteamAPI.Init())
            {
                Debug.LogError("[SteamManager] SteamAPI.Init() failed. Make sure Steam is running " +
                               "and steam_appid.txt contains the correct App ID.");
                IsInitialized = false;
                return;
            }

            IsInitialized = true;
            Debug.Log($"[SteamManager] Steam initialized successfully. AppId: {appId}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[SteamManager] Exception during Steam initialization: {e.Message}");
            IsInitialized = false;
        }
#else
        // Without Steamworks, run in local-only mode
        IsInitialized = true;
        Debug.Log("[SteamManager] Running without Steamworks (local mode). Steam features are simulated.");
#endif
    }

    /// <summary>
    /// Returns the local player's Steam ID as a string.
    /// Falls back to "LocalPlayer" if Steam is not available.
    /// </summary>
    public string GetSteamId()
    {
#if STEAMWORKS
        if (IsInitialized)
        {
            return Steamworks.SteamUser.GetSteamID().ToString();
        }
#endif
        return "LocalPlayer_" + SystemInfo.deviceUniqueIdentifier.Substring(0, 8);
    }

    /// <summary>
    /// Returns the local player's Steam persona name.
    /// Falls back to "Player" if Steam is not available.
    /// </summary>
    public string GetPlayerName()
    {
#if STEAMWORKS
        if (IsInitialized)
        {
            return Steamworks.SteamFriends.GetPersonaName();
        }
#endif
        return "Player";
    }

    /// <summary>
    /// Shut down the Steamworks API. Called on application quit.
    /// </summary>
    public void Shutdown()
    {
        if (!IsInitialized) return;

#if STEAMWORKS
        Steamworks.SteamAPI.Shutdown();
        Debug.Log("[SteamManager] Steam shut down.");
#endif

        IsInitialized = false;
    }
}
