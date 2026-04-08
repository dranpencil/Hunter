# Rock, Paper, Hunters - Full Project Documentation

## Overview
Rock, Paper, Hunters is a strategic digital board game for 2-4 players where each player controls a Hunter and an Apprentice token, placing them on 7 different locations to gather resources, fight monsters, and score points. The game features sophisticated AI opponents, 11 unique weapons with special powers, dynamic resource management, and Firebase-based online multiplayer.

## Project Structure

### Source Files
- **game.js** (~16,060 lines) - Core game engine: BotPlayer class + Game class
- **firebase-config.js** (~340 lines) - OnlineManager class for Firebase multiplayer
- **index.html** - UI structure, modals, layout
- **style.css** - Styling, responsive layout, animations

### Data Files (CSV Lookup Tables)
- `Weapon.csv` - 11 weapons with stats, capacities, powers, preferred locations
- `Monster.csv` - 37 monsters (Levels 1-3) with HP, ATT, rewards, special effects
- `Item.csv` - 8 consumable items with prices, sizes, effects
- `exp需求組合(lv1-3).csv` - EXP/Dojo decision tables for bot AI
- `森林需求組合(lv1-3).csv` - Forest entry decision tables for bot AI
- `canned message.csv` - Pre-scripted chat messages (5 categories)

### Image Assets
- **Locations** (7): `work_site.png`, `bar.png`, `station.png`, `hospital.png`, `dojo.png`, `plaza.png`, `forest.png`
- **Weapons** (11): `bat.png`, `katana.png`, `rifle.png`, `plasma.png`, `chain.png`, `axe.png`, `whip.png`, `bow.png`, `sword.png`, `knife.png`, `gloves.png`

### Other Files
- `game_backup_before_refactor.js` - Pre-refactor backup
- `Rules_EN.htm` - English rulebook (loaded in iframe modal)

## Core Architecture

### Three Main Classes

| Class | File | Lines | Purpose |
|-------|------|-------|---------|
| **BotPlayer** | game.js | 2-1048 | AI decision-making with CSV lookup tables |
| **Game** | game.js | 1050-16060 | Game controller: all phases, mechanics, UI, online sync |
| **OnlineManager** | firebase-config.js | 2-340 | Firebase room management, state sync, heartbeat |

### Game State Management
- **Phase tracking** via `roundPhase`: `'selection'` | `'distribution'` | `'station'` | `'store'` | `'battle'` | `'nextround'` | `'capacityOverflow'` | `'gameover'`
- **Mode tracking** via `gameMode`: `'simultaneous'` (1 human local) | `'turnbased'` (2+ humans local) | `'online'` (Firebase multiplayer)
- **Player completion** via `playerCompletionStatus`: Object mapping player IDs to boolean
- **Player count**: 2-4 players with dummy token balancing
- **Automated mode** via `isAutomatedMode`: Skips all DOM updates for data collection

### Design Patterns
- **State Machine**: Round phase management
- **Strategy Pattern**: Weapon-specific behaviors and powers
- **Observer Pattern**: UI updates on state changes
- **Factory Pattern**: Dynamic player/bot creation
- **Host-Guest Pattern**: Online mode with authoritative host

## Complete Game Flow

### Startup
1. Main menu: Local Play / Online Play / Data Collection / Rulebook
2. **Local**: Player count (2-4) -> Weapon selection -> Game starts
3. **Online**: Create/Join room -> Preferences (color, weapon, name) -> Ready -> Game starts

### Round Phases

#### 1. Selection Phase
- Players secretly select locations for Hunter and Apprentice tokens
- **Simultaneous Mode** (1 human): Bots select instantly, human selects at own pace
- **Turn-Based Mode** (2+ humans): Sequential selection with status indicators
- **Online Mode**: Host runs bots, all humans select independently, host waits for all
- Forest requirements: 2+ EP and ammunition (Rifle/Plasma) - warning shown but human can proceed
- Status indicators: red circle (pending) / green circle (completed)

#### 2. Resource Distribution Phase
- Players collect resources from all locations except Forest
- Rewards scale by token density per player count:
  - 2 players: [6,4]
  - 3 players: [7,5,4]
  - 4 players: [8,6,5,4]
- Only Hunters collect (exception: Bat Lv1 power for Apprentice)

#### 3. Station Choice Phase
- Hunters at Station select resource type (money/beer/blood bag/exp)
- Reward amount determined by total Station token count

#### 4. Store Phase
- Same mode system as Selection Phase (simultaneous/turn-based/online)
- Items: Beer ($2), Blood Bag ($2), Grenade ($2), Bomb ($4), Dynamite ($6), Fake Blood ($2), Bullets ($2), Batteries ($2)
- Capacity overflow triggers use/upgrade/discard modal

#### 5. Battle Phase
- Forest hunters fight monsters in score order (lowest first)
- Player selects monster level (1/2/3), can use beer for EP, select pets
- Dice-based combat with weapon damage arrays
- Monster taming available for Chain/Whip weapons
- Bot AI uses tactical item optimization

#### 6. Next Round Phase
- Dummy tokens rotate: locations 1->2->3->4->5->6->1 (skip Forest)
- Round-start weapon powers activate
- Win check: any player >= 50 points -> game ends at round completion
- Winner = highest score (popularity level as tiebreaker)

## Online Multiplayer System (Firebase)

### Firebase Structure
```
/rooms/{roomCode}
  ├── hostId, status, playerCount, humanPlayerCount
  ├── players/  { joinOrder, preferredColor/Weapon/Name, isReady }
  ├── config/   { humanSlots, weapons, colors, playerNames }
  ├── gameState/ { roundPhase, players[], dummyTokens, battleLog, ... }
  ├── actions/  { type, playerId, data, timestamp }
  ├── chat/     { senderId, message, timestamp }
  ├── heartbeat/ { [playerId]: timestamp }
  └── kickVote/ { targetIds, votes, voterIds, ... }
```

### Host-Guest Architecture
- **Host**: Authoritative game state manager. Runs all game logic, broadcasts state via `pushGameState()`, listens for guest actions via `listenForActions()`
- **Guest**: Receives state via `applyRemoteGameState()`, sends only own actions via `pushAction()`. Guest actions: selection confirm, store purchases, battle choices, upgrades, item usage, station choice, kick votes
- **State sync**: Host serializes full game state -> Firebase -> Guest applies and updates UI + button states

### Room Management
- 4-character room codes (A-Z, 2-9, excluding I/O/0/1)
- Heartbeat: 5s interval write, 300s disconnect timeout, 240s warning
- `onDisconnect().remove()` for cleanup on network failure
- Room deletion: 60s after game ends

### Online Action Flow (Guest -> Host)
Guest calls function -> sends `pushAction({type, playerId, data})` -> returns immediately.
Host receives via `listenForActions()` -> `handleGuestAction()` -> processes -> `pushGameState()` -> Guest receives updated state.

Action types: `confirm_selection`, `store_purchase`, `finish_shopping`, `battle_attack`, `battle_defense`, `battle_tame`, `battle_use_item`, `battle_use_double_damage`, `station_choice`, `player_board_action` (addToUpgrade, upgradeWeapon, restoreHP, restoreEP, useItem), `capacity_overflow_action`, `kick_vote`

## Chat System (Lines ~15790-16024)

### Real-Time Chat
- Firebase-backed with sender name in player color
- 100 character limit, last 50 messages in DOM
- Enter key to send from input

### Canned Message System
- 5 tabs: greeting (tab 0), mid-game (tab 1), closing (tab 2), tactics (tab 3), locations (tab 4)
- Tab 3 (tactics) stores pending message with `__` placeholder -> switches to tab 4
- Tab 4 (locations) replaces `__` in pending message -> sends composed message
- Context-aware default tab: gameover->tab 2, round 1 selection->tab 0, selection->tab 3, else->tab 1

### Keyboard Shortcuts
- **Alt+Q**: Toggle canned panel (state -> `'tabs'`)
- **Number keys 1-5**: Select tab when in `'tabs'` state (state -> `'messages'`)
- **Number keys 1-9**: Click Nth message when in `'messages'` state
- Ignored when chat input is focused or panel is closed
- Messages prefixed with 1-based index for visual hint

## Timer & Kick Vote System

### Phase Timers (Lines ~15175-15290)
- Per-player timers in `this.phaseTimers`
- Duration: user-selected (30s/60s/120s/180s or disabled)
- Online human players only (bots/offline skip)
- Display: "M:SS" format, warning red at <=10s
- Paused during kick votes, resumed after

### Kick Vote System (Lines ~15291-15700)
- Triggered when phase timer expires (500ms debounce for batching)
- Voters: human players not targeted
- 30-second vote countdown
- Majority wins; tied = first voter's vote as tiebreaker
- If no voters (only bots): auto-kick
- Kicked player removed from game, tokens cleared

## Bot AI System (BotPlayer Class, Lines 2-1048)

### Location Selection (Probabilistic Entry System)
Each location gets "entries" (weighted lottery tickets). Base: 4 entries per location.

**Hunter adjustments (in order)**:
1. Weapon preference: +2 entries to preferred location
2. Resource needs: HP-based (Hospital), EP-based (Bar), capacity-based (Work Site)
3. Dojo: CSV table lookup based on attack/defense dice + power track level
4. Plaza: +2 if not visited in 2+ rounds
5. Forest: complex bonuses (items, EP, lowest score) and penalties (low HP, no ammo)

**Apprentice adjustments**:
1. Other players' weapon preferences: +2 per player
2. Highest-score player: +2 additional
3. Forest coordination: +2 if hunter in Forest and popularity advantage

### Bot Stages
1. **Stage 1**: Before 2nd level 1 monster defeat
2. **Stage 2**: Before 2nd level 2 monster defeat
3. **Stage 3**: After 2nd level 2 monster defeat

### Tactical Combat AI
- Minimum items for guaranteed kills: Dynamite > Bomb > Grenade
- Recovery items to maintain max HP/EP
- Fake Blood always used for bonus points
- Weapon-specific ammo management (Rifle: 3+ bullets, Plasma: 3+ batteries)

## Weapons System (11 Weapons)

Each weapon has: unique damage array [6 values for dice 1-6], 3 power levels (track positions 1, 3, 7), preferred location, capacity, ammunition type (Rifle/Plasma only).

| Weapon | Damage | Capacity | Preferred | Key Power |
|--------|--------|----------|-----------|-----------|
| Bat | [0,0,1,1,2,2] | 7 | Plaza | Lv3: Re-roll hits, sum all |
| Katana | [0,0,0,1,2,3] | 7 | Dojo | Lv3: Instant kill if dice > 27 |
| Rifle | [0,0,0,2,2,2] | 5 | Work Site | Uses bullets; Lv3: -1$ store prices |
| Plasma | [0,0,0,0,3,3] | 5 | Work Site | Uses batteries; Lv3: Infinite ammo |
| Chain | [0,0,1,1,1,2] | 7 | Bar | Tame at HP<=3; Lv3: Pet dmg x2 |
| Axe | [0,0,0,1,2,2] | 6 | Hospital | Lv1: Counter 1 dmg; Lv3: Counter equal |
| Whip | [0,0,1,1,1,1] | 8 | Bar | Taming cost -1 EP; Lv3: 0 EP |
| Bow | [0,0,0,1,1,2] | 7 | Hospital | Lv1: +16% dodge; Lv3: Dmg x2 |
| Sword | [0,0,0,1,1,2] | 7 | Dojo | Lv3: +1 pt per die showing 1 |
| Knife | [0,0,1,1,1,1] | 8 | Plaza | Lv1: Double dmg once/battle |
| Gloves | [0,0,0,1,1,1] | 8 | Hospital | Lv3: +1 dmg [5,6] per HP lost |

## Combat System

### Monster Stats (from Monster.csv)
- **Level 1**: 2-3 HP, 1-3 ATT, 2 EP cost, ~3 EXP reward
- **Level 2**: 5-7 HP, 2-4 ATT, 3 EP cost, ~7 EXP reward
- **Level 3**: 10-13 HP, 3-5 ATT, 4 EP cost, ~14 EXP reward
- 37 unique monsters with special effects (damage caps, dodge, first strike, etc.)

### Combat Flow
1. Player selects monster level, pays EP cost
2. Player attacks: roll attack dice, apply weapon damage array
3. If monster survives: monster counter-attacks (ATT value = damage to player)
4. Player gains EXP equal to damage taken
5. Victory: points + money + resources based on monster level
6. Taming option (Chain/Whip): capture instead of kill if HP <= threshold

### Combat Items
- **Grenade**: 1 damage, size 2, $2
- **Bomb**: 2 damage, size 3, $4
- **Dynamite**: 3 damage, size 4, $6
- **Fake Blood**: Bonus points = monster level, size 1, $2

## Resource System

| Resource | Max | Purpose |
|----------|-----|---------|
| Money | 15 | Store purchases |
| EXP | 15 | Weapon upgrades (attack/defense dice) |
| HP | 10 (upgradeable) | Combat survival; 3 Blood Bags = +1 max |
| EP | 10 (upgradeable) | Forest entry, taming; 4 Beer = +1 max |

### Scoring Sources
- **Monsters**: Points from defeated monsters
- **Milestones**: HP/EP at 8 (+2 pts) and 10 (+4 pts)
- **Popularity**: Track advancement (points = level reached)
- **Plaza**: 3 points if hunter alone at Plaza
- **Fake Blood**: Bonus points equal to monster level
- **Other**: Weapon-specific bonuses (Knife alone bonus, Sword die bonus, etc.)

### Popularity Track
- **Point Token**: Permanent highest position (0-5), scores on advancement
- **Reward Token**: Current position, affects resource distribution priority
- Moves up if hunter alone at location, down if crowded (Knife Lv1+ exemption)
- Forest placement = no change

## Location System (7 Locations)

| # | Location | Rewards | Special |
|---|----------|---------|---------|
| 1 | Work Site | Money | Scales by density |
| 2 | Bar | Beer | Scales by density |
| 3 | Station | Player's choice | Resource type selection |
| 4 | Hospital | Blood Bags | Scales by density |
| 5 | Dojo | EXP | Scales by density |
| 6 | Plaza | Points | Scales by density |
| 7 | Forest | Combat | Hunt monsters, no resource collection |

Dummy tokens for balance: 2 players (Bar + Dojo), 3 players (Station), 4 players (none)

## Data Collection System (Lines ~11803-11947)

### Automated Game Running
- Batch processing: 1-1000 games, 2-4 players
- `isAutomatedMode`: Complete DOM bypass, 0ms delays
- Progress bar with stop button

### CSV Export (18 Data Points Per Player)
`game_id`, `player_count`, `rounds`, `player_id`, `weapon`, `level`, `score`, `rank`, `weapon_track_pos`, `defeated_lv1`, `defeated_lv2`, `defeated_lv3`, `score_monsters`, `score_milestones`, `score_popularity`, `score_plaza`, `score_fakeblood`, `score_other`

### Ranking
- Primary: Highest score
- Tiebreaker: Popularity track level (0-5)
- Shared ranks for identical score AND level

## UI Systems

### Modal Dialogs
1. **Station Modal**: Resource type selection for Station hunters
2. **Monster Modal**: Level selection, pet choice, beer consumption, battle confirm
3. **Battle UI**: Player vs Monster stats, attack/tame/defense/item buttons, battle log
4. **Store**: Item grid with prices/capacity, player inventory, money display
5. **Capacity Overflow**: Use/upgrade/discard items when over capacity
6. **Forest Failure**: Warning for insufficient EP/ammo (human can proceed)
7. **Kick Vote**: Target name, live tally, 30s timer, vote buttons
8. **Data Collection**: Game count input, player count select
9. **Game Stats**: Final scores, rankings, weapon levels
10. **Disconnect**: Notification with return-to-menu button
11. **Rulebook**: iframe loading Rules_EN.htm

### Player Boards
- **Expanded view**: Full stats, inventory grid, weapon track, upgrade buttons, restore buttons
- **Collapsed view**: Compact stats, upgrade buttons, inventory counters
- Toggle between views with button
- Button states managed by `shouldDisablePlayerButtons()` and `refreshAllPlayerButtonStates()`

### Layout
- CSS Grid/Flexbox responsive layout
- Left: Player boards (2x2 grid) + Game board (7 location columns) + Status
- Right: Selection cards + Store + Battle UI + Status panel
- Split game log (top 50%) / chat (bottom 50%) when online

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `BotPlayer.selectHunterLocation()` | ~106 | Bot hunter location AI |
| `BotPlayer.selectApprenticeLocation()` | ~324 | Bot apprentice location AI |
| `Game.init()` | ~2436 | UI initialization |
| `createPlayerBoards()` | ~3796 | Render player board HTML |
| `createPlayerBoardHTML()` | ~3812 | Expanded board template |
| `createCollapsedPlayerBoardHTML()` | ~4039 | Collapsed board template |
| `shouldDisablePlayerButtons()` | ~5416 | Button enable/disable logic per mode |
| `refreshAllPlayerButtonStates()` | ~5447 | Re-evaluate all button states |
| `updateResourceDisplay()` | ~5376 | Update all player stats/inventory |
| `startResourceDistribution()` | ~11284 | Resource distribution phase |
| `distributeStationResources()` | ~7035 | Station resource handling |
| `enterStorePhase()` | ~10298 | Store phase dispatch |
| `handleCapacityOverflow()` | ~6754 | Overflow management |
| `addToUpgrade()` | ~7460 | HP/EP upgrade with items |
| `upgradeWeapon()` | ~7667 | Attack/defense dice upgrade with EXP |
| `startBattlePhase()` | ~11655 | Battle phase orchestration |
| `executeBotBattle()` | ~3233 | Bot combat AI |
| `handleBotTacticalItemUsage()` | ~4854 | Bot item optimization |
| `nextRound()` | ~5208 | End-of-round processing |
| `applyRemoteGameState()` | ~13332 | Guest state sync from host |
| `handleGuestPhaseUpdate()` | ~13461 | Guest UI updates per phase |
| `handleGuestAction()` | ~14530 | Host processes guest actions |
| `serializeGameState()` | ~13200 | Serialize state for Firebase |
| `initChat()` | ~15791 | Chat system + keyboard shortcuts |
| `toggleCannedPanel()` | ~15906 | Canned message panel toggle |
| `triggerKickVote()` | ~15293 | Start kick vote process |
| `initPhaseTimers()` | ~15175 | Phase timer setup |
| `recordGameData()` | ~11803 | Data collection per game |
| `exportToCSV()` | ~11837 | CSV file generation |

## Technical Stack
- **Frontend**: Vanilla JavaScript ES6, HTML5, CSS3
- **Backend**: Firebase Realtime Database (hosting/auth not used)
- **Dependencies**: Firebase SDK v9.23.0 (compat mode) only - no other libraries
- **Data Export**: CSV format with comprehensive game metrics

---
*Last Updated: 2025-03-18*
*Game Version: 1.3 - Online Multiplayer with Chat & Kick System*
