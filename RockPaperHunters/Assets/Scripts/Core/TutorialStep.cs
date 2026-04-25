using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// One instruction in the tutorial. Mirrors a TUTORIAL_STEPS entry in
/// tutorial-steps.js. Multiple consecutive steps can share the same
/// <see cref="i18nKey"/> when a single instruction requires more than one
/// action ("click grenade THEN finish shopping"); the UI collapses them
/// into a single logical progress step for display.
/// </summary>
[Serializable]
public class TutorialStep
{
    [Tooltip("Short id, typically used as the i18n suffix (tutorial.step.<id>).")]
    public string id;

    [Tooltip("Organisational only — not enforced by the engine.")]
    public int round;
    public string phase;

    [Tooltip("Translation key to look up step text. Takes precedence over the inline text below.")]
    public string i18nKey;

    [Tooltip("Inline fallback text, used only when i18nKey is empty.")]
    [TextArea] public string inlineText;

    [Tooltip("What action the player must perform to advance this step. Null = text-only; advances via Next button.")]
    public TutorialExpectedAction expectedAction;

    [Tooltip("CSS-style selectors of elements to highlight. In Unity, interpret as GameObject names / paths.")]
    public List<string> highlightTargets = new List<string>();
}

/// <summary>
/// Describes which action the current step expects. Extend
/// <see cref="Matches"/> if you need parameter-level matching (e.g. "must
/// buy Grenade specifically" vs. "buy any item").
/// </summary>
[Serializable]
public class TutorialExpectedAction
{
    [Tooltip("Action type identifier, e.g. confirmSelection, buyStoreItem, playerAttackMonster. Must match what the hook site passes to Blocks / Notify.")]
    public string type;

    [Tooltip("Optional expected param — used by Matches() for param-level gating. Meaning depends on the action type.")]
    public string expectedParam;

    public virtual bool Matches(object actionParams)
    {
        // No expected param = accept any matching action type.
        if (string.IsNullOrEmpty(expectedParam)) return true;

        // If the caller passed a string param, compare directly.
        if (actionParams is string s) return s == expectedParam;

        // If they passed null, no param match possible.
        if (actionParams == null) return false;

        // Fallback: ToString comparison so dropdown-indexed params still work.
        return actionParams.ToString() == expectedParam;
    }
}

/// <summary>
/// Scripted override for a forced monster encounter during the tutorial.
/// BattleManager should check <see cref="TutorialManager.GetForcedMonster"/>
/// before drawing a random monster.
/// </summary>
[Serializable]
public class TutorialForcedMonster
{
    public int round;
    public int level;
    [Tooltip("Optional exact monster id; if 0, the engine may pick any monster matching effectType.")]
    public int monsterId;
    [Tooltip("Optional effect filter.")]
    public MonsterEffectType effectType;
}

/// <summary>
/// One scripted dice roll. Ordered per category: CombatSystem.RollDice should
/// call <see cref="TutorialManager.ConsumeForcedRoll"/> and use the returned
/// int[] instead of generating random values. Categories match the JS
/// tutorial: "attack", "defense", "other".
/// </summary>
[Serializable]
public class TutorialForcedRoll
{
    public string category;
    public int[] values;
}
