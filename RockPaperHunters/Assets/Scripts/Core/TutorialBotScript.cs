using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Scripted bot moves per tutorial round. Mirrors TUTORIAL_BOT_SCRIPTS in
/// tutorial-steps.js. <see cref="TutorialManager.GetBotMove"/> looks entries
/// up here and returns the scripted value, letting the tutorial play out
/// deterministically regardless of the AI's usual probabilistic choices.
///
/// Fields of the returned object depend on moveType:
///   hunterLocation      → LocationId
///   apprenticeLocation  → LocationId
///   stationChoice       → ResourceType
///   storeBuys           → List&lt;string&gt; item names
///   battleAction        → string ("attack" | "tame" | "useItem:Grenade" | …)
/// </summary>
[CreateAssetMenu(fileName = "TutorialBotScript", menuName = "RockPaperHunters/Tutorial Bot Script")]
public class TutorialBotScript : ScriptableObject
{
    [Serializable]
    public class RoundEntry
    {
        public int round;
        public string moveType;
        [Tooltip("Payload is encoded as a string. Consumer (bot AI hook site) parses it into the right type for its move.")]
        public string payload;
    }

    [SerializeField] private List<RoundEntry> entries = new List<RoundEntry>();

    /// <summary>
    /// Return the scripted payload for (round, moveType), or null if not
    /// scripted (bot AI should run normally).
    /// </summary>
    public string Lookup(int round, string moveType)
    {
        foreach (var e in entries)
        {
            if (e.round == round && e.moveType == moveType) return e.payload;
        }
        return null;
    }
}
