using System;
using UnityEngine;

/// <summary>
/// ScriptableObject that maps SFX names to AudioClips.
/// Create via Assets > Create > RockPaperHunters > SFX Library.
/// </summary>
[CreateAssetMenu(fileName = "SFXLibrary", menuName = "RockPaperHunters/SFX Library")]
public class SFXLibrary : ScriptableObject
{
    [Serializable]
    public struct SFXEntry
    {
        public string name;
        public AudioClip clip;
        [Range(0f, 1f)]
        public float volumeScale;
    }

    [SerializeField] private SFXEntry[] entries;

    private void OnEnable()
    {
        // Ensure default volumeScale of 1 for entries that haven't been set
        if (entries == null) return;
        for (int i = 0; i < entries.Length; i++)
        {
            if (entries[i].volumeScale <= 0f)
            {
                var entry = entries[i];
                entry.volumeScale = 1f;
                entries[i] = entry;
            }
        }
    }

    /// <summary>
    /// Returns the AudioClip matching the given name, or null if not found.
    /// </summary>
    public AudioClip GetClip(string name)
    {
        if (entries == null) return null;

        for (int i = 0; i < entries.Length; i++)
        {
            if (entries[i].name == name)
                return entries[i].clip;
        }

        Debug.LogWarning($"[SFXLibrary] Clip not found: {name}");
        return null;
    }

    /// <summary>
    /// Returns the full SFXEntry for volumeScale access.
    /// Returns a default entry with volumeScale=1 if not found.
    /// </summary>
    public SFXEntry GetEntry(string name)
    {
        if (entries != null)
        {
            for (int i = 0; i < entries.Length; i++)
            {
                if (entries[i].name == name)
                    return entries[i];
            }
        }

        Debug.LogWarning($"[SFXLibrary] Entry not found: {name}");
        return new SFXEntry { name = name, clip = null, volumeScale = 1f };
    }

    /// <summary>
    /// Attempts to get the clip and volume for a given SFX name.
    /// Returns true if found, false otherwise.
    /// </summary>
    public bool TryGetClip(string name, out AudioClip clip, out float volume)
    {
        if (entries != null)
        {
            for (int i = 0; i < entries.Length; i++)
            {
                if (entries[i].name == name)
                {
                    clip = entries[i].clip;
                    volume = entries[i].volumeScale;
                    return clip != null;
                }
            }
        }

        Debug.LogWarning($"[SFXLibrary] Clip not found: {name}");
        clip = null;
        volume = 1f;
        return false;
    }
}
