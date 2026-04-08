using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Singleton audio manager handling music playback and SFX pooling.
/// Subscribes to game events to auto-play contextual sounds.
/// </summary>
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }

    [Header("Audio Sources")]
    [SerializeField] private AudioSource musicSource;
    [SerializeField] private int sfxPoolSize = 8;

    [Header("SFX Library")]
    [SerializeField] private SFXLibrary sfxLibrary;

    [Header("Music Clips")]
    [SerializeField] private AudioClip menuMusic;
    [SerializeField] private AudioClip gameMusic;
    [SerializeField] private AudioClip battleMusic;
    [SerializeField] private AudioClip victoryFanfare;

    private AudioSource[] sfxPool;
    private float musicVolume = 1f;
    private float sfxVolume = 1f;
    private Coroutine crossfadeCoroutine;

    private const string MusicVolumeKey = "MusicVolume";
    private const string SFXVolumeKey = "SFXVolume";

    // Cached event handlers to allow unsubscription
    private Action<PhaseChangedEvent> onPhaseChanged;
    private Action<DiceRolledEvent> onDiceRolled;
    private Action<MonsterDamagedEvent> onMonsterDamaged;
    private Action<PlayerDamagedEvent> onPlayerDamaged;
    private Action<MonsterDefeatedEvent> onMonsterDefeated;
    private Action<MonsterTamedEvent> onMonsterTamed;
    private Action<ItemPurchasedEvent> onItemPurchased;
    private Action<ItemUsedEvent> onItemUsed;
    private Action<ScoreChangedEvent> onScoreChanged;
    private Action<WeaponUpgradedEvent> onWeaponUpgraded;
    private Action<PowerTrackAdvancedEvent> onPowerTrackAdvanced;
    private Action<PlayerSelectionConfirmedEvent> onPlayerSelectionConfirmed;
    private Action<TokenPlacedEvent> onTokenPlaced;
    private Action<ChatMessageEvent> onChatMessage;
    private Action<GameOverEvent> onGameOver;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        InitializeSFXPool();
        LoadVolumesFromPrefs();
        CacheEventHandlers();
    }

    private void InitializeSFXPool()
    {
        sfxPool = new AudioSource[sfxPoolSize];
        for (int i = 0; i < sfxPoolSize; i++)
        {
            var go = new GameObject($"SFX_Source_{i}");
            go.transform.SetParent(transform);
            sfxPool[i] = go.AddComponent<AudioSource>();
            sfxPool[i].playOnAwake = false;
        }
    }

    private void LoadVolumesFromPrefs()
    {
        musicVolume = PlayerPrefs.GetFloat(MusicVolumeKey, 1f);
        sfxVolume = PlayerPrefs.GetFloat(SFXVolumeKey, 1f);

        if (musicSource != null)
            musicSource.volume = musicVolume;
    }

    private void CacheEventHandlers()
    {
        onPhaseChanged = HandlePhaseChanged;
        onDiceRolled = e => PlaySFX("dice_roll");
        onMonsterDamaged = e => PlaySFX("attack_hit");
        onPlayerDamaged = e => PlaySFX("player_hit");
        onMonsterDefeated = e => PlaySFX("monster_defeat");
        onMonsterTamed = e => PlaySFX("tame_success");
        onItemPurchased = e => PlaySFX("purchase");
        onItemUsed = HandleItemUsed;
        onScoreChanged = e => PlaySFX("score_gain");
        onWeaponUpgraded = e => PlaySFX("upgrade");
        onPowerTrackAdvanced = e => PlaySFX("level_up");
        onPlayerSelectionConfirmed = e => PlaySFX("card_confirm");
        onTokenPlaced = e => PlaySFX("token_place");
        onChatMessage = e => PlaySFX("chat_ping");
        onGameOver = HandleGameOver;
    }

    private void OnEnable()
    {
        EventBus.Subscribe(onPhaseChanged);
        EventBus.Subscribe(onDiceRolled);
        EventBus.Subscribe(onMonsterDamaged);
        EventBus.Subscribe(onPlayerDamaged);
        EventBus.Subscribe(onMonsterDefeated);
        EventBus.Subscribe(onMonsterTamed);
        EventBus.Subscribe(onItemPurchased);
        EventBus.Subscribe(onItemUsed);
        EventBus.Subscribe(onScoreChanged);
        EventBus.Subscribe(onWeaponUpgraded);
        EventBus.Subscribe(onPowerTrackAdvanced);
        EventBus.Subscribe(onPlayerSelectionConfirmed);
        EventBus.Subscribe(onTokenPlaced);
        EventBus.Subscribe(onChatMessage);
        EventBus.Subscribe(onGameOver);
    }

    private void OnDisable()
    {
        EventBus.Unsubscribe(onPhaseChanged);
        EventBus.Unsubscribe(onDiceRolled);
        EventBus.Unsubscribe(onMonsterDamaged);
        EventBus.Unsubscribe(onPlayerDamaged);
        EventBus.Unsubscribe(onMonsterDefeated);
        EventBus.Unsubscribe(onMonsterTamed);
        EventBus.Unsubscribe(onItemPurchased);
        EventBus.Unsubscribe(onItemUsed);
        EventBus.Unsubscribe(onScoreChanged);
        EventBus.Unsubscribe(onWeaponUpgraded);
        EventBus.Unsubscribe(onPowerTrackAdvanced);
        EventBus.Unsubscribe(onPlayerSelectionConfirmed);
        EventBus.Unsubscribe(onTokenPlaced);
        EventBus.Unsubscribe(onChatMessage);
        EventBus.Unsubscribe(onGameOver);
    }

    // --- Event Handlers ---

    private void HandlePhaseChanged(PhaseChangedEvent e)
    {
        PlaySFX("phase_transition");

        switch (e.newPhase)
        {
            case GamePhase.Battle:
                PlayMusic(battleMusic);
                break;
            case GamePhase.GameOver:
                PlayMusic(victoryFanfare, false);
                break;
            default:
                // Only switch to gameMusic if not already playing it
                if (musicSource == null || musicSource.clip != gameMusic)
                    PlayMusic(gameMusic);
                break;
        }
    }

    private void HandleItemUsed(ItemUsedEvent e)
    {
        if (e.item == null)
        {
            PlaySFX("item_use");
            return;
        }

        switch (e.item.effectType)
        {
            case ItemEffectType.Grenade:
            case ItemEffectType.Bomb:
            case ItemEffectType.Dynamite:
                PlaySFX("explosion");
                break;
            default:
                PlaySFX("item_use");
                break;
        }
    }

    private void HandleGameOver(GameOverEvent e)
    {
        StopMusic(0.3f);
        PlayMusic(victoryFanfare, false);
    }

    // --- Music ---

    /// <summary>
    /// Crossfade to a new music clip over 0.5 seconds.
    /// </summary>
    public void PlayMusic(AudioClip clip, bool loop = true)
    {
        if (clip == null) return;
        if (musicSource == null) return;

        // Skip if already playing the same clip
        if (musicSource.clip == clip && musicSource.isPlaying)
            return;

        if (crossfadeCoroutine != null)
            StopCoroutine(crossfadeCoroutine);

        crossfadeCoroutine = StartCoroutine(CrossfadeMusic(clip, loop, 0.5f));
    }

    /// <summary>
    /// Fade out and stop current music.
    /// </summary>
    public void StopMusic(float fadeTime = 0.5f)
    {
        if (musicSource == null) return;

        if (crossfadeCoroutine != null)
            StopCoroutine(crossfadeCoroutine);

        crossfadeCoroutine = StartCoroutine(FadeOutMusic(fadeTime));
    }

    private IEnumerator CrossfadeMusic(AudioClip newClip, bool loop, float duration)
    {
        float halfDuration = duration * 0.5f;

        // Fade out current music
        if (musicSource.isPlaying)
        {
            float startVolume = musicSource.volume;
            float elapsed = 0f;
            while (elapsed < halfDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                musicSource.volume = Mathf.Lerp(startVolume, 0f, elapsed / halfDuration);
                yield return null;
            }
            musicSource.Stop();
        }

        // Switch clip and fade in
        musicSource.clip = newClip;
        musicSource.loop = loop;
        musicSource.volume = 0f;
        musicSource.Play();

        float fadeInElapsed = 0f;
        while (fadeInElapsed < halfDuration)
        {
            fadeInElapsed += Time.unscaledDeltaTime;
            musicSource.volume = Mathf.Lerp(0f, musicVolume, fadeInElapsed / halfDuration);
            yield return null;
        }

        musicSource.volume = musicVolume;
        crossfadeCoroutine = null;
    }

    private IEnumerator FadeOutMusic(float duration)
    {
        if (!musicSource.isPlaying)
        {
            crossfadeCoroutine = null;
            yield break;
        }

        float startVolume = musicSource.volume;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            musicSource.volume = Mathf.Lerp(startVolume, 0f, elapsed / duration);
            yield return null;
        }

        musicSource.Stop();
        musicSource.volume = 0f;
        crossfadeCoroutine = null;
    }

    // --- SFX ---

    /// <summary>
    /// Play a named SFX from the SFXLibrary on the first available pool source.
    /// </summary>
    public void PlaySFX(string sfxName)
    {
        if (sfxLibrary == null) return;

        AudioClip clip;
        float volumeScale;
        if (!sfxLibrary.TryGetClip(sfxName, out clip, out volumeScale))
            return;

        AudioSource source = GetAvailableSFXSource();
        if (source == null) return;

        source.pitch = 1f;
        source.volume = sfxVolume * volumeScale;
        source.clip = clip;
        source.Play();
    }

    /// <summary>
    /// Play a named SFX with randomized pitch for variety.
    /// </summary>
    public void PlaySFXPitchVaried(string sfxName, float minPitch = 0.9f, float maxPitch = 1.1f)
    {
        if (sfxLibrary == null) return;

        AudioClip clip;
        float volumeScale;
        if (!sfxLibrary.TryGetClip(sfxName, out clip, out volumeScale))
            return;

        AudioSource source = GetAvailableSFXSource();
        if (source == null) return;

        source.pitch = UnityEngine.Random.Range(minPitch, maxPitch);
        source.volume = sfxVolume * volumeScale;
        source.clip = clip;
        source.Play();
    }

    private AudioSource GetAvailableSFXSource()
    {
        if (sfxPool == null) return null;

        // Find a source that is not currently playing
        for (int i = 0; i < sfxPool.Length; i++)
        {
            if (!sfxPool[i].isPlaying)
                return sfxPool[i];
        }

        // All sources busy - steal the first one
        return sfxPool[0];
    }

    // --- Volume Controls ---

    /// <summary>
    /// Set music volume (0-1) and save to PlayerPrefs.
    /// </summary>
    public void SetMusicVolume(float vol)
    {
        musicVolume = Mathf.Clamp01(vol);
        PlayerPrefs.SetFloat(MusicVolumeKey, musicVolume);
        PlayerPrefs.Save();

        if (musicSource != null && crossfadeCoroutine == null)
            musicSource.volume = musicVolume;
    }

    /// <summary>
    /// Set SFX volume (0-1) and save to PlayerPrefs.
    /// </summary>
    public void SetSFXVolume(float vol)
    {
        sfxVolume = Mathf.Clamp01(vol);
        PlayerPrefs.SetFloat(SFXVolumeKey, sfxVolume);
        PlayerPrefs.Save();
    }
}
