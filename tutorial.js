// =====================================================================
// tutorial.js — Tutorial engine
// =====================================================================
// Reads from window.TUTORIAL_STEPS, window.TUTORIAL_BOT_SCRIPTS, and
// window.TUTORIAL_PLAYER_OVERRIDES (defined in tutorial-steps.js).
//
// Exposes window.tutorialManager (singleton) to the rest of the app.
// game.js calls tutorialManager.canPerform(...) and .notifyAction(...)
// from its 15 hook points; the BotPlayer class calls .getBotMove(...).
// =====================================================================

class TutorialManager {
    constructor() {
        this.steps = window.TUTORIAL_STEPS || [];
        this.botScripts = window.TUTORIAL_BOT_SCRIPTS || {};
        this.overrides = window.TUTORIAL_PLAYER_OVERRIDES || {};
        this.currentStepIndex = 0;
        this._active = false;

        // Build an ordered list of unique logical steps. Several engine-level
        // TUTORIAL_STEPS entries can share the same i18nKey when a single
        // instruction requires multiple actions ("click grenade then finish
        // shopping" = two entries, same i18nKey). The progress indicator
        // counts ONE logical step per unique i18nKey, so the shown number
        // matches the narrative the player sees.
        this._uniqueKeys = [];
        const seen = new Set();
        for (const s of this.steps) {
            const key = this._stepLogicalKey(s);
            if (!seen.has(key)) {
                seen.add(key);
                this._uniqueKeys.push(key);
            }
        }
    }

    /**
     * Derive a stable "logical step" key for a TUTORIAL_STEPS entry. Falls
     * back to the step id (or array index) if no i18nKey is present.
     */
    _stepLogicalKey(step) {
        if (step && step.text && step.text.i18nKey) return step.text.i18nKey;
        if (step && step.id != null) return 'id:' + step.id;
        return 'idx:' + this.steps.indexOf(step);
    }

    // -----------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------

    isActive() {
        return this._active;
    }

    /**
     * Start the tutorial: spin up the customized game and show step 0.
     */
    start() {
        if (this._active) return;
        if (!window.game) {
            console.error('[Tutorial] window.game is not ready');
            return;
        }
        if (this.steps.length === 0) {
            console.error('[Tutorial] No steps defined in tutorial-steps.js');
            return;
        }

        this._active = true;
        window.game.isTutorialMode = true;
        this.currentStepIndex = 0;
        this._rollCursors = {};

        // Hide the main menu and lobby BEFORE we kick off the game so
        // that the show* methods of game don't fight us.
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'none';
        const lobby = document.getElementById('online-lobby');
        if (lobby) lobby.style.display = 'none';

        // Build the bot configuration: 1 human + 1 bot, the weapons
        // come from the overrides object (or random if not specified).
        const playerCount = 2;
        const slotTypes = ['player', 'bot'];
        const botConfig = {
            totalPlayers: playerCount,
            slotTypes: slotTypes,
            botCount: 1,
            humanPlayers: 1
        };

        // Apply weapon overrides by setting them up via the same path
        // the player-config screen uses. We pre-fill soloModeSlots so
        // startSoloGameWithConfig picks them up.
        const w0 = this.overrides.weapons ? this.overrides.weapons[0] : null;
        const w1 = this.overrides.weapons ? this.overrides.weapons[1] : null;
        if (w0 || w1) {
            window.game.soloModeSlots = window.game.soloModeSlots || [];
            for (let i = 0; i < playerCount; i++) {
                if (!window.game.soloModeSlots[i]) {
                    window.game.soloModeSlots[i] = { type: slotTypes[i], active: true, color: 'random', weapon: 'random' };
                } else {
                    window.game.soloModeSlots[i].type = slotTypes[i];
                    window.game.soloModeSlots[i].active = true;
                }
            }
            if (w0) window.game.soloModeSlots[0].weapon = w0;
            if (w1) window.game.soloModeSlots[1].weapon = w1;
        }

        // Kick off the game.
        try {
            window.game.startSoloGame();
        } catch (e) {
            console.error('[Tutorial] Failed to start tutorial game:', e);
            this.quit();
            return;
        }

        // Show the panel and render step 0.
        this.showPanel();
        this.renderCurrentStep();
    }

    /**
     * User-initiated quit: ask for confirmation before tearing down the
     * tutorial. Called by the Quit button in the tutorial panel.
     * Automatic teardowns (final-step completion, internal errors) still
     * call quit() directly, skipping the confirmation.
     */
    requestQuit() {
        if (!this._active) return;
        const msg = (typeof t === 'function') ? t('tutorial.quitConfirm')
            : 'Are you sure you want to quit the tutorial? Your progress will be lost.';
        if (confirm(msg)) {
            this.quit();
        }
    }

    /**
     * Stop the tutorial: fully discard state and return to main menu.
     * Triggered by the Quit button OR by completing the final step.
     */
    quit() {
        this._active = false;
        if (window.game) {
            window.game.isTutorialMode = false;
        }
        this.currentStepIndex = 0;
        this._rollCursors = {};
        if (this._highlightRetryTimer) {
            clearTimeout(this._highlightRetryTimer);
            this._highlightRetryTimer = null;
        }
        this.hidePanel();
        this.clearBlockedAndHighlight();

        // Tear down any in-progress game state by going back to main menu.
        if (window.game && typeof window.game.exitToMainMenu === 'function') {
            try { window.game.exitToMainMenu(); } catch (e) { /* ignore */ }
        } else if (window.game && typeof window.game.showMainMenu === 'function') {
            try { window.game.showMainMenu(); } catch (e) { /* ignore */ }
        }
    }

    // -----------------------------------------------------------------
    // Step gating & advancement
    // -----------------------------------------------------------------

    getCurrentStep() {
        return this.steps[this.currentStepIndex] || null;
    }

    /**
     * Returns true if the action with given type+params is the one the
     * current step is waiting for. game.js hooks call this BEFORE
     * executing, and bail out (return early) if false.
     */
    canPerform(actionType, params) {
        if (!this._active) return true;   // not in tutorial: always allow
        const step = this.getCurrentStep();
        if (!step) return true;           // tutorial finished: allow
        const expected = step.expectedAction;
        if (!expected) return false;      // step waits for Next button click only
        if (expected.type !== actionType) return false;
        // Check every key in expected (other than 'type') matches.
        for (const key of Object.keys(expected)) {
            if (key === 'type') continue;
            if (params == null) return false;
            // Loose equality so locationId="1" matches locationId=1.
            // eslint-disable-next-line eqeqeq
            if (expected[key] != params[key]) return false;
        }
        return true;
    }

    /**
     * Hooks call this AFTER successfully performing an action. If the
     * action matches the current step's expectedAction, advance.
     */
    notifyAction(actionType, params) {
        if (!this._active) return;
        if (!this.canPerform(actionType, params)) return;
        this.advance();
    }

    /**
     * Manual advance, used by the Next button on text-only steps.
     */
    advanceFromButton() {
        if (!this._active) return;
        const step = this.getCurrentStep();
        if (step && step.expectedAction) return; // not a text-only step
        this.advance();
    }

    advance() {
        this.currentStepIndex++;
        if (this.currentStepIndex >= this.steps.length) {
            // Tutorial complete!
            this.renderCompletion();
            return;
        }
        this.renderCurrentStep();
    }

    // -----------------------------------------------------------------
    // Bot scripting + monster forcing (consumed by BotPlayer / game.js)
    // -----------------------------------------------------------------

    /**
     * Returns the bot's scripted move for the current round, or null
     * to fall through to the regular AI.
     *   moveType: 'hunterLocation' | 'apprenticeLocation' | 'stationChoice'
     *           | 'storeBuys' | 'battleAction'
     */
    getBotMove(round, moveType) {
        if (!this._active) return null;
        const script = this.botScripts[round];
        if (!script) return null;
        return script[moveType] != null ? script[moveType] : null;
    }

    /**
     * Returns a forced monster for the given level, or null for random.
     * Accepts two forms in overrides.forcedMonsters[round]:
     *   - Full monster object (spread-copied as-is)
     *   - Compact spec { level, effectId } — looked up from window.game.monsters
     *     by effectId (the 1-based row number in Monster.csv)
     */
    getForcedMonster(level) {
        if (!this._active) return null;
        const round = (window.game && window.game.currentRound) || 1;
        const fm = this.overrides.forcedMonsters;
        if (!fm) return null;
        const m = fm[round];
        if (!m || m.level !== level) return null;

        // Full monster object (has `hp`): return a copy
        if (typeof m.hp === 'number') return { ...m };

        // Compact spec: look up by effectId from the game's monster table
        if (typeof m.effectId === 'number' && window.game && window.game.monsters) {
            const pool = window.game.monsters[level] || [];
            const found = pool.find(x => x.effectId === m.effectId);
            if (found) return { ...found };
        }
        return null;
    }

    /**
     * Tutorial-mode dice override. Called by game.rollDice(numDice, category).
     * Returns an array of dice values from the current round's queue for the
     * given category (e.g. 'attack', 'defense'), or null to fall through to
     * random rolling. Each call pops one entry from the queue.
     */
    consumeForcedRoll(category) {
        if (!this._active) return null;
        const round = (window.game && window.game.currentRound) || 1;
        const fr = this.overrides.forcedRolls;
        if (!fr) return null;
        const roundQueues = fr[round];
        if (!roundQueues) return null;
        const queue = roundQueues[category];
        if (!Array.isArray(queue) || queue.length === 0) return null;

        // Track per-round-per-category cursors so the queue isn't mutated
        // in-place (user's overrides object stays pristine across reruns).
        if (!this._rollCursors) this._rollCursors = {};
        const cursorKey = round + ':' + category;
        const idx = this._rollCursors[cursorKey] || 0;
        if (idx >= queue.length) return null;

        this._rollCursors[cursorKey] = idx + 1;
        const rolls = queue[idx];
        return Array.isArray(rolls) ? rolls.slice() : null;
    }

    // -----------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------

    showPanel() {
        const panel = document.getElementById('tutorial-panel');
        if (panel) panel.style.display = 'flex';
    }

    hidePanel() {
        const panel = document.getElementById('tutorial-panel');
        if (panel) panel.style.display = 'none';
    }

    renderCurrentStep() {
        const step = this.getCurrentStep();
        if (!step) return;

        // Resolve the step text.
        const textEl = document.getElementById('tutorial-step-text');
        if (textEl) {
            let txt = '';
            if (step.text) {
                if (typeof step.text === 'string') {
                    txt = step.text;
                } else if (step.text.i18nKey && typeof t === 'function') {
                    txt = t(step.text.i18nKey);
                }
            }
            textEl.textContent = txt;
        }

        // Update the "Step X / Y" progress indicator. Collapses split steps
        // (multiple engine entries sharing one i18nKey) into a single logical
        // step so the number matches the narrative.
        const progressEl = document.getElementById('tutorial-progress');
        if (progressEl) {
            const currentKey = this._stepLogicalKey(step);
            const logicalIndex = this._uniqueKeys.indexOf(currentKey);
            const current = logicalIndex >= 0 ? logicalIndex + 1 : 0;
            const total = this._uniqueKeys.length;
            if (current > 0 && total > 0 && typeof t === 'function') {
                progressEl.textContent = t('tutorial.progress', current, total);
            } else if (current > 0 && total > 0) {
                progressEl.textContent = 'Step ' + current + ' / ' + total;
            } else {
                progressEl.textContent = '';
            }
        }

        // Show / hide the Next button — only for text-only steps.
        const nextBtn = document.getElementById('tutorial-next-btn');
        if (nextBtn) {
            nextBtn.style.display = step.expectedAction ? 'none' : 'inline-block';
        }

        // Apply highlight / blocked classes after a tick so the DOM
        // reflects the current phase (e.g. cards exist) before we tag
        // them. Polls for up to ~3s so slow phase transitions (e.g. the
        // 2s next-round → selection delay) still catch the target.
        this._scheduleHighlight();
    }

    renderCompletion() {
        const textEl = document.getElementById('tutorial-step-text');
        if (textEl && typeof t === 'function') {
            textEl.textContent = t('tutorial.completed');
        }
        const nextBtn = document.getElementById('tutorial-next-btn');
        if (nextBtn) nextBtn.style.display = 'none';
        const progressEl = document.getElementById('tutorial-progress');
        if (progressEl) progressEl.textContent = '';

        this.clearBlockedAndHighlight();
        // Auto-quit after a short pause so the user can read the message.
        setTimeout(() => this.quit(), 4000);
    }

    /**
     * Schedule applyHighlight() with bounded polling. The first attempt
     * fires at 200ms (same as before). If the selector matches nothing,
     * we retry every 150ms up to 3s total — enough to cover the 2s
     * startNextRoundPhase delay before the new selection cards mount.
     * Exits silently if the step advances or tutorial quits mid-wait.
     */
    _scheduleHighlight() {
        if (this._highlightRetryTimer) {
            clearTimeout(this._highlightRetryTimer);
            this._highlightRetryTimer = null;
        }
        const stepAtSchedule = this.currentStepIndex;
        const maxWaitMs = 3000;
        const intervalMs = 150;
        const start = Date.now();

        const tryApply = () => {
            this._highlightRetryTimer = null;
            if (!this._active) return;
            if (this.currentStepIndex !== stepAtSchedule) return;
            if (this.applyHighlight()) return;
            if (Date.now() - start >= maxWaitMs) return;
            this._highlightRetryTimer = setTimeout(tryApply, intervalMs);
        };

        this._highlightRetryTimer = setTimeout(tryApply, 200);
    }

    /**
     * Add .tutorial-highlight to the element(s) the player should click.
     * All other buttons remain enabled — wrong actions are caught by
     * tutorialBlocks() and surfaced via showWarning() instead.
     * Returns true if the step required no highlight or the selector
     * matched at least one element; false if the selector matched zero
     * elements (signals _scheduleHighlight to retry).
     */
    applyHighlight() {
        const step = this.getCurrentStep();
        if (!step) return true;

        // Wipe previous highlight state only (no longer block anything).
        this.clearBlockedAndHighlight();

        if (!step.highlight) return true;
        const targets = document.querySelectorAll(step.highlight);
        if (targets.length === 0) return false;
        targets.forEach(el => el.classList.add('tutorial-highlight'));
        return true;
    }

    clearBlockedAndHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        // Defensive: also strip any leftover .tutorial-blocked from earlier versions.
        document.querySelectorAll('.tutorial-blocked').forEach(el => el.classList.remove('tutorial-blocked'));
    }

    // -----------------------------------------------------------------
    // Warning toast — shown when the player clicks something other than
    // the expected action. The action is silently blocked; this just
    // tells the player to follow the instruction.
    // -----------------------------------------------------------------

    showWarning() {
        // Throttle so spamming clicks doesn't pile up timers.
        if (this._warningTimer) {
            clearTimeout(this._warningTimer);
        }
        let toast = document.getElementById('tutorial-warning-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tutorial-warning-toast';
            toast.className = 'tutorial-warning-toast';
            document.body.appendChild(toast);
        }
        const msg = (typeof t === 'function') ? t('tutorial.warningFollow') : 'Please follow the instruction.';
        toast.textContent = msg;
        toast.classList.add('visible');
        this._warningTimer = setTimeout(() => {
            toast.classList.remove('visible');
            this._warningTimer = null;
        }, 2200);
    }
}

// -----------------------------------------------------------------
// Boot the singleton
// -----------------------------------------------------------------
window.tutorialManager = new TutorialManager();

// If the language changes mid-tutorial, re-render the current step so
// the panel text picks up the new translation.
window.addEventListener('languagechange', () => {
    if (window.tutorialManager && window.tutorialManager.isActive()) {
        window.tutorialManager.renderCurrentStep();
    }
});
