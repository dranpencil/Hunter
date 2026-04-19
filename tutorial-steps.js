// =====================================================================
// tutorial-steps.js — User-editable tutorial script
// =====================================================================
// THIS IS THE ONLY FILE YOU NORMALLY EDIT to add new tutorial lessons.
// The engine (tutorial.js) reads from these three globals at runtime.
//
// To add a new lesson:
//   1. Append a new step object to TUTORIAL_STEPS below.
//   2. Add the matching `tutorial.step.<id>` row to translations.csv (EN + ZH).
//   3. Double-click convert-translations.bat to rebuild translations.js.
//   4. Refresh the browser.
//
// =====================================================================
// STEP FORMAT
// =====================================================================
//   id              — unique short slug (used as the i18n key suffix)
//   round           — which round this step belongs to (1, 2, 3, ...)
//                     Used only for organisation/grouping; not enforced.
//   phase           — 'free' | 'selection' | 'distribution' | 'station'
//                     | 'store' | 'battle' | 'next-round' | 'capacity-overflow'
//                     ('free' = before any phase has begun, e.g. welcome screen)
//   text            — { i18nKey: 'tutorial.step.foo' }   (recommended, translated)
//                     OR a plain string (English only, not translated)
//   expectedAction  — see ACTION TYPES below.
//                     Use null if the step is just text and advances on
//                     the player clicking the Next button.
//   highlight       — CSS selector(s) of the UI element(s) the player
//                     should interact with. The tutorial dims everything
//                     else and adds a glow to the highlighted elements.
//                     Omit (or use null) to skip highlighting.
//
// =====================================================================
// ACTION TYPES (matches the 18 hook points in game.js)
// =====================================================================
//   { type: 'selectCard',         tokenType: 'hunter'|'apprentice', locationId: 1..7 }
//   { type: 'confirmSelection' }
//   { type: 'buyStoreItem',       itemName: 'Beer'|'Blood Bag'|'Grenade'|'Bomb'
//                                          |'Dynamite'|'Fake Blood'|'Bullet'|'Battery' }
//   { type: 'finishShopping' }
//   { type: 'selectStationResource', resourceType: 'money'|'beer'|'bloodBag'|'exp' }
//   { type: 'selectMonsterLevel', level: 1|2|3 }
//   { type: 'confirmBattleSelection' }
//   { type: 'confirmMonsterSelection' }
//   { type: 'playerAttackMonster' }
//   { type: 'tameMonster' }
//   { type: 'useBattleItem',      itemName: 'Beer'|'Blood Bag'|'Grenade'|... }
//   { type: 'playerDefense' }
//   { type: 'upgradeWeapon',      playerId: 0, upgradeType: 'attack'|'defense' }
//   { type: 'restoreHP',          playerId: 0 }
//   { type: 'restoreEP',          playerId: 0 }
//   { type: 'addToUpgrade',       playerId: 0, upgradeType: 'hp'|'ep' }
//   { type: 'addToUpgradeFromOverflow', playerId: 0, itemName: 'Beer'|'Blood Bag' }
//   { type: 'toggleBoards' }
//
// =====================================================================
// COMMON CSS SELECTORS (for the `highlight` field)
// =====================================================================
//   '#hunter-cards [data-location-id="1"]'      — hunter Work Site card
//   '#hunter-cards [data-location-id="7"]'      — hunter Forest card
//   '#apprentice-cards [data-location-id="6"]'  — apprentice Plaza card
//   '#confirm-selection'                         — Confirm Selection button
//   '#store-items-grid .store-item-card:nth-child(1)'  — first store item
//   '.finish-shopping-btn'                       — Finish Shopping button
//   '.station-choice'                            — any station choice button
//   '.monster-choice'                            — any monster level button
//   '#battle-attack-btn'                         — battle Attack button
//   '#battle-tame-btn'                           — battle Tame button
//   '#battle-defense-btn'                        — battle Defense button
//   '.battle-item-btn'                           — any battle-use item button
//   '#toggle-boards-btn'                         — Expand / Collapse button
//   '#capacity-items .upgrade-btn'               — Upgrade in capacity overflow modal
// =====================================================================

window.TUTORIAL_STEPS = [
    // ---------- Welcome ----------
    {
        id: 'welcome',
        round: 1,
        phase: 'free',
        text: { i18nKey: 'tutorial.step.welcome' },
        expectedAction: null,
    },

    // ---------- Round 1: intro (text-only) ----------
    {
        id: '1',
        round: 1,
        phase: 'free',
        text: { i18nKey: 'tutorial.step.1' },
        expectedAction: null,
    },
    {
        id: '2',
        round: 1,
        phase: 'free',
        text: { i18nKey: 'tutorial.step.2' },
        expectedAction: null,
    },
    {
        id: '3',
        round: 1,
        phase: 'free',
        text: { i18nKey: 'tutorial.step.3' },
        expectedAction: null,
    },

    // ---------- Round 1: selection ----------
    {
        id: '4',
        round: 1,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.4' },
        expectedAction: { type: 'toggleBoards' },
        highlight: '#toggle-boards-btn',
    },
    {
        id: '5',
        round: 1,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.5' },
        expectedAction: { type: 'selectCard', tokenType: 'hunter', locationId: 1 },
        highlight: '#hunter-cards [data-location-id="1"]',
    },
    {
        id: '6',
        round: 1,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.6' },
        expectedAction: null,
    },
    {
        id: '7',
        round: 1,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.7' },
        expectedAction: { type: 'selectCard', tokenType: 'apprentice', locationId: 4 },
        highlight: '#apprentice-cards [data-location-id="4"]',
    },
    {
        id: '8',
        round: 1,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.8' },
        expectedAction: { type: 'confirmSelection' },
        highlight: '#confirm-selection',
    },

    // ---------- Round 1: distribution (text + highlights) ----------
    {
        id: '9',
        round: 1,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.9' },
        expectedAction: null,
        highlight: '#p0-money',
    },
    {
        id: '10',
        round: 1,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.10' },
        expectedAction: null,
    },
    {
        id: '11',
        round: 1,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.11' },
        expectedAction: null,
        highlight: '#p0-inventory',
    },
    {
        id: '12',
        round: 1,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.12' },
        expectedAction: null,
        highlight: '#p0-popularity-track',
    },

    // ---------- Round 1: store ----------
    {
        id: '13',
        round: 1,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.13' },
        expectedAction: null,
        highlight: '#store-area',
    },
    // Row 14 split: buy Grenade, then finish shopping (same i18nKey)
    {
        id: '14a',
        round: 1,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.14' },
        expectedAction: { type: 'buyStoreItem', itemName: 'Grenade' },
        highlight: '#store-items-grid .store-item-card:nth-child(4)',
    },
    {
        id: '14b',
        round: 1,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.14' },
        expectedAction: { type: 'finishShopping' },
        highlight: '.finish-shopping-btn',
    },

    // ---------- Round 1: next-round recap ----------
    {
        id: '15',
        round: 1,
        phase: 'next-round',
        text: { i18nKey: 'tutorial.step.15' },
        expectedAction: null,
    },

    // ---------- Round 2: selection ----------
    {
        id: '16',
        round: 2,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.16' },
        expectedAction: { type: 'selectCard', tokenType: 'hunter', locationId: 4 },
        highlight: '#hunter-cards [data-location-id="4"]',
    },
    // Row 17 split: apprentice Dojo, then confirm (same i18nKey)
    {
        id: '17a',
        round: 2,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.17' },
        expectedAction: { type: 'selectCard', tokenType: 'apprentice', locationId: 5 },
        highlight: '#apprentice-cards [data-location-id="5"]',
    },
    {
        id: '17b',
        round: 2,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.17' },
        expectedAction: { type: 'confirmSelection' },
        highlight: '#confirm-selection',
    },

    // ---------- Round 2: distribution ----------
    {
        id: '18',
        round: 2,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.18' },
        expectedAction: null,
    },
    // Row 19 split: click HP Max three times (same i18nKey)
    {
        id: '19a',
        round: 2,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.19' },
        expectedAction: { type: 'addToUpgrade', playerId: 0, upgradeType: 'hp' },
        highlight: '#player-0-board .hp-section .upgrade-bar .small-btn',
    },
    {
        id: '19b',
        round: 2,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.19' },
        expectedAction: { type: 'addToUpgrade', playerId: 0, upgradeType: 'hp' },
        highlight: '#player-0-board .hp-section .upgrade-bar .small-btn',
    },
    {
        id: '19c',
        round: 2,
        phase: 'distribution',
        text: { i18nKey: 'tutorial.step.19' },
        expectedAction: { type: 'addToUpgrade', playerId: 0, upgradeType: 'hp' },
        highlight: '#player-0-board .hp-section .upgrade-bar .small-btn',
    },

    // ---------- Round 2: store ----------
    {
        id: '20',
        round: 2,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.20' },
        expectedAction: null,
        highlight: '#player-0-board .hp-section .stat-max',
    },
    {
        id: '21',
        round: 2,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.21' },
        expectedAction: { type: 'finishShopping' },
        highlight: '.finish-shopping-btn',
    },

    // ---------- Round 2: capacity overflow ----------
    {
        id: '22',
        round: 2,
        phase: 'capacity-overflow',
        text: { i18nKey: 'tutorial.step.22' },
        expectedAction: { type: 'addToUpgradeFromOverflow', playerId: 0, itemName: 'Blood Bag' },
        highlight: '#capacity-items .capacity-item[data-item-name="Blood Bag"] .upgrade-btn',
    },

    // ---------- Round 2: next-round recap ----------
    {
        id: '23',
        round: 2,
        phase: 'next-round',
        text: { i18nKey: 'tutorial.step.23' },
        expectedAction: null,
        highlight: '#player-0-board .hp-section .upgrade-bar, #player-0-board .collapsed-hp-section .collapsed-buttons',
    },

    // ---------- Round 3: selection ----------
    {
        id: '24',
        round: 3,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.24' },
        expectedAction: { type: 'selectCard', tokenType: 'hunter', locationId: 7 },
        highlight: '#hunter-cards [data-location-id="7"]',
    },
    {
        id: '25',
        round: 3,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.25' },
        expectedAction: null,
        highlight: '#apprentice-cards [data-location-id="7"]',
    },
    // Row 26 split: apprentice Station, then confirm (same i18nKey)
    {
        id: '26a',
        round: 3,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.26' },
        expectedAction: { type: 'selectCard', tokenType: 'apprentice', locationId: 3 },
        highlight: '#apprentice-cards [data-location-id="3"]',
    },
    {
        id: '26b',
        round: 3,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.26' },
        expectedAction: { type: 'confirmSelection' },
        highlight: '#confirm-selection',
    },

    // ---------- Round 3: store ----------
    // Row 27 split: click EP Max twice (same i18nKey)
    {
        id: '27a',
        round: 3,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.27' },
        expectedAction: { type: 'addToUpgrade', playerId: 0, upgradeType: 'ep' },
        highlight: '#player-0-board .ep-section .upgrade-bar .small-btn',
    },
    {
        id: '27b',
        round: 3,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.27' },
        expectedAction: { type: 'addToUpgrade', playerId: 0, upgradeType: 'ep' },
        highlight: '#player-0-board .ep-section .upgrade-bar .small-btn',
    },
    {
        id: '28',
        round: 3,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.28' },
        expectedAction: { type: 'upgradeWeapon', playerId: 0, upgradeType: 'defense' },
        highlight: '#player-0-board button[onclick*="\'defense\'"]',
    },
    // Row 29 split: buy Fake Blood, then finish shopping (same i18nKey)
    {
        id: '29a',
        round: 3,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.29' },
        expectedAction: { type: 'buyStoreItem', itemName: 'Fake Blood' },
        highlight: '#store-items-grid .store-item-card:nth-child(3)',
    },
    {
        id: '29b',
        round: 3,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.29' },
        expectedAction: { type: 'finishShopping' },
        highlight: '.finish-shopping-btn',
    },

    // ---------- Round 3: battle ----------
    // Row 30 split: pick level 1 + confirm battle
    {
        id: '30a',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.30' },
        expectedAction: { type: 'selectMonsterLevel', level: 1 },
        highlight: '.monster-choice:nth-child(1)',
    },
    {
        id: '30b',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.30' },
        expectedAction: { type: 'confirmBattleSelection' },
        highlight: '.confirm-battle-btn',
    },
    {
        id: '31',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.31' },
        expectedAction: { type: 'confirmMonsterSelection' },
        highlight: '#monster-selection-modal button[onclick*="confirmMonsterSelection"]',
    },
    {
        id: '32',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.32' },
        expectedAction: { type: 'playerAttackMonster' },
        highlight: '#battle-attack-btn',
    },
    {
        id: '33',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.33' },
        expectedAction: { type: 'playerDefense' },
        highlight: '#battle-defense-btn',
    },
    {
        id: '34',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.34' },
        expectedAction: null,
    },
    {
        id: '35',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.35' },
        expectedAction: null,
    },
    // Row 36 split: use Fake Blood, then tame (same i18nKey)
    {
        id: '36a',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.36' },
        expectedAction: null,
        highlight: '#battle-tame-btn',
    },
    {
        id: '36-1',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.36-1' },
        expectedAction: { type: 'useBattleItem', itemName: 'Fake Blood' },
        highlight: '#battle-item-buttons .battle-item-btn:nth-child(6)',
    },
    {
        id: '36b',
        round: 3,
        phase: 'battle',
        text: { i18nKey: 'tutorial.step.36-1' },
        expectedAction: { type: 'tameMonster' },
        highlight: '#battle-tame-btn',
    },

    // ---------- Round 3: next-round recap ----------
    {
        id: '37',
        round: 3,
        phase: 'next-round',
        text: { i18nKey: 'tutorial.step.37' },
        expectedAction: null,
    },
    {
        id: '38',
        round: 3,
        phase: 'next-round',
        text: { i18nKey: 'tutorial.step.38' },
        expectedAction: null,
        highlight: '#player-0-board .weapon-power-section',
    },
    {
        id: '39',
        round: 3,
        phase: 'next-round',
        text: { i18nKey: 'tutorial.step.39' },
        expectedAction: null,
        highlight: '#player-0-board .pet-section-compact',
    },

    // ---------- Round 4: selection ----------
    // Row 40 split: hunter Station → apprentice Plaza → confirm (same i18nKey)
    {
        id: '40a',
        round: 4,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.40' },
        expectedAction: { type: 'selectCard', tokenType: 'hunter', locationId: 3 },
        highlight: '#hunter-cards [data-location-id="3"]',
    },
    {
        id: '40b',
        round: 4,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.40' },
        expectedAction: { type: 'selectCard', tokenType: 'apprentice', locationId: 6 },
        highlight: '#apprentice-cards [data-location-id="6"]',
    },
    {
        id: '40c',
        round: 4,
        phase: 'selection',
        text: { i18nKey: 'tutorial.step.40' },
        expectedAction: { type: 'confirmSelection' },
        highlight: '#confirm-selection',
    },

    // ---------- Round 4: station ----------
    {
        id: '41',
        round: 4,
        phase: 'station',
        text: { i18nKey: 'tutorial.step.41' },
        expectedAction: { type: 'selectStationResource', resourceType: 'exp' },
        highlight: '.station-choice[onclick*="exp"]',
    },

    // ---------- Round 4: store recap ----------
    {
        id: '42',
        round: 4,
        phase: 'store',
        text: { i18nKey: 'tutorial.step.42' },
        expectedAction: null,
        highlight: '#player-0-board .popularity-section',
    },

    // ---------- Epilogue ----------
    {
        id: '43',
        round: 4,
        phase: 'free',
        text: { i18nKey: 'tutorial.step.43' },
        expectedAction: null,
    },
];

// =====================================================================
// BOT SCRIPTS — one entry per round
// =====================================================================
// The scripted bot follows these moves instead of using normal AI.
// The bot is always player id 1 (player 0 is the human).
//
// Per-round fields (all optional — omitted means "use AI fallback"):
//   hunterLocation     — 1..7 (Work Site=1, Bar=2, Station=3, Hospital=4,
//                              Dojo=5, Plaza=6, Forest=7)
//   apprenticeLocation — 1..7
//   stationChoice      — 'money'|'beer'|'bloodBag'|'exp' (used only if hunter at Station)
//   storeBuys          — array of item names to buy in order, e.g. ['Beer', 'Grenade']
//   battleAction       — 'attack' (other actions can be added later)
// =====================================================================

window.TUTORIAL_BOT_SCRIPTS = {
    1: {
        hunterLocation: 4,        // Hospital (narrative: "opponent's Hunter went to the Hospital")
        apprenticeLocation: 6,    // Plaza
        storeBuys: [],
    },
    2: {
        hunterLocation: 2,        // Bar (narrative: "opponent went to the Bar and obtained 6 Beers")
        apprenticeLocation: 5,    // Dojo
        storeBuys: [],
    },
    3: {
        hunterLocation: 6,        // Plaza
        apprenticeLocation: 2,    // Bar
        storeBuys: [],
    },
    4: {
        hunterLocation: 5,        // Dojo
        apprenticeLocation: 3,    // Station (narrative: "caught by the opponent's Apprentice")
        storeBuys: [],
    },
};

// =====================================================================
// PLAYER OVERRIDES — applied once at tutorial start
// =====================================================================
// weapons          — { 0: 'Bat', 1: 'Knife' }  (player 0 = human, player 1 = bot)
// initialResources — optional per-player overrides of starting resources
// forcedMonsters   — optional per-round forced monster (skips random selection)
//                    Compact form:  { 3: { level: 1, effectId: 8 } }
//                                   (looks up monster row 8 from Monster.csv)
//                    Full form:     { 3: { level: 1, hp: 3, att: 2, money: 0,
//                                          energy: 2, blood: 1, effect: '...',
//                                          effectId: 8, pts: 2 } }
// forcedRolls      — optional per-round dice-roll queues, keyed by category:
//                    { 3: { attack: [[4, 4]], defense: [[4]] } }
//                    Each inner array is ONE rollDice() call's result; the queue
//                    advances one entry per call of that category.
// startingPowerLevel — optional weapon power-track position to start at
// =====================================================================

window.TUTORIAL_PLAYER_OVERRIDES = {
    // Whip so taming at HP <= 1 works (tutorial narrative says "only 1 HP remaining")
    weapons: { 0: 'Katana', 1: 'Sword' },

    // Round 3 encounter is the 8th monster in Monster.csv:
    //   level 1, HP 3, ATT 2, money 0, energy 2, blood 1, effect "這回合其他怪獸+1血", pts 2
    forcedMonsters: {
        3: { level: 1, effectId: 8 },
    },

    // Round 3 dice rolls:
    //   attack:  two dice -> [4, 4] with Whip dmg array [0,0,1,1,1,1] = 2 damage
    //   defense: one die  -> [4] blocks 1 of the monster's ATT 2 = player takes 1
    forcedRolls: {
        3: {
            attack:  [[4, 4]],
            defense: [[4]],
        },
    },
    // initialResources: {},      // example: { 0: { money: 4, ep: 6, hp: 4, exp: 3 } }
    // startingPowerLevel: {},    // example: { 0: 1, 1: 1 }
};
