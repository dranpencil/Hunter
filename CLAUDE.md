# Rock, Paper, Hunter Board Game System Documentation

## Overview
Rock, Paper, Hunter is a strategic digital board game for 2-4 players where each player controls a Hunter and an Apprentice token, placing them on 7 different locations to gather resources, fight monsters, and score points. The game features sophisticated AI opponents, 11 unique weapons with special powers, and dynamic resource management.

## Core Game Architecture

### Main Classes
- **BotPlayer** (lines 2-981): Comprehensive AI decision-making system with CSV-based lookup tables
- **Game** (lines 983-7000+): Main game controller managing all phases, mechanics, and UI

### Game State Management
- Phase tracking via `roundPhase`: 'selection', 'distribution', 'station', 'store', 'battle', 'nextround'
- Mode tracking via `gameMode`: 'simultaneous' (1 human) or 'turnbased' (2+ humans)
- Player completion tracking via `playerCompletionStatus`: Object mapping player IDs to completion status
- Dynamic player count configurations (2-4 players)
- Dummy token system for game balance across different player counts

## Game Flow

### 1. Selection Phase
- **Game Mode**: Simultaneous (1 human) or Turn-Based (2+ humans)
- **Simultaneous Mode**: All bots select instantly, human selects at own pace
- **Turn-Based Mode**: Players select sequentially with visual status indicators
- Players secretly select locations for Hunter and Apprentice tokens
- Forest requirements: 2+ EP and ammunition for Rifle/Plasma weapons
- Human players can select Forest without requirements (warning shown at confirmation)
- Bots use probabilistic entry system with weapon preferences
  - Forest entries: -100 penalty without ammunition (Rifle/Plasma)
  - Normal entries (4 base) with at least 1 ammunition
- Status indicators show player completion: 🔴 (pending) / 🟢 (completed)

### 2. Resource Distribution Phase  
- Players collect resources from all locations except Forest
- Rewards scale based on token density:
  - 2 players: [6,4] rewards
  - 3 players: [7,5,4] rewards  
  - 4 players: [8,6,5,4] rewards
- Only Hunters collect resources (exception: Bat weapon power)

### 3. Station Choice Phase
- Hunters at Station select desired resource type
- Reward amount determined by total Station token count

### 4. Store Phase
- **Game Mode**: Simultaneous (1 human) or Turn-Based (2+ humans)
- **Simultaneous Mode**: All bots shop instantly, human shops at own pace
- **Turn-Based Mode**: Players shop sequentially with visual status indicators
- Players purchase items with money
- Capacity overflow management with use/upgrade/discard options
- Items available: Beer, Blood Bag, Grenade, Bomb, Dynamite, Fake Blood, Bullets, Batteries
- Status indicators show player completion: 🔴 (pending) / 🟢 (completed)

### 5. Battle Phase
- Forest hunters fight monsters in score order (lowest score first)
- Dice-based combat with weapon damage arrays
- Monster taming available for specific weapons

### 6. Next Round Phase
- Dummy tokens rotate locations (1→2→3→4→5→6→1, skip Forest)
- Round start weapon powers activate
- Board resets for new selections

**Win Condition**: Game ends when any player reaches 50+ points, winner determined by highest score (with popularity level as tiebreaker) at round end

## Bot System AI

### Location Selection System
Bots use a **probabilistic entry system** where each location receives "entries" (like lottery tickets). Higher entries = higher selection probability. The system calculates entries based on multiple factors, then randomly selects weighted by entry count.

### Hunter Location Selection Logic (BotPlayer.selectHunterLocation)

**Base System:**
- All 7 locations start with **4 base entries**
- Unavailable locations: **-100 entries** (effectively eliminated)

**Adjustments Applied (in order):**

1. **Weapon Preference** (+2 entries)
   - Each weapon has a preferred location (Bat→Plaza, Rifle→Work Site, Chain→Bar, etc.)
   - If preferred location unavailable: redirect +2 bonus to Station (if available)
   - Exception: Plaza preference doesn't redirect

2. **Resource-Based Adjustments**
   - **Hospital (HP-based)**:
     - HP ≤ 50%: +2 entries
     - HP 50-99%: +1 entry
   - **Bar (EP-based)**:
     - EP < required for Forest: +2 entries
     - EP < max: +1 entry
   - **Work Site (Capacity-based)**:
     - Available capacity > 4: +2 entries
     - Available capacity 3-4: +1 entry
     - Available capacity ≤ 2: no bonus

3. **Dojo Adjustment** (CSV table-based)
   - Lookup based on: attack dice, defense dice, weapon power track level
   - Power track determines table: positions 1-2→lv1 table, 3-6→lv2 table, 7→lv3 table
   - Adds variable entries based on table value

4. **Plaza Adjustment**
   - If bot hasn't visited Plaza in 2+ rounds: +2 entries

5. **Forest Adjustments** (most complex)
   - **Bonuses:**
     - EP at maximum: +3 entries
     - Has Grenade: +2 entries
     - Has Bomb: +4 entries
     - Has Dynamite: +6 entries
     - Has lowest score: +4 entries
   - **Penalties:**
     - HP < 50%: -3 entries
     - **Rifle with 0 bullets AND money < 2: -100 entries**
     - **Plasma with 0 batteries AND money < 2: -100 entries**
   - **CSV Table Lookup:** Adds variable entries based on attack/defense dice + power track level

**Selection Process:**
1. Calculate total of all positive entries
2. Generate random number × total
3. Subtract entries from each location until random ≤ 0
4. First location to bring random ≤ 0 is selected

### Apprentice Location Selection Logic (BotPlayer.selectApprenticeLocation)

**Base System:**
- All locations (except hunter's) start with **4 base entries**
- Hunter's location: **0 entries** (cannot overlap)
- Unavailable locations: **-100 entries**

**Social-Aware Adjustments:**

1. **Other Players' Preferences** (+2 entries each)
   - For EACH other player (excluding self):
   - Add +2 entries to that player's weapon preferred location
   - Example: If 2 other players prefer Plaza, Plaza gets +4 total

2. **Highest Score Player Bonus** (+2 additional entries)
   - Find player with highest score (excluding self)
   - Add +2 extra entries to that player's preferred location
   - Creates "follow the leader" behavior

3. **Forest Coordination Logic**
   - **If Hunter is IN Forest:**
     - Check all other players (excluding self)
     - For each player: check if `popularityLevel === popularityRewardLevel`
     - If NO other player has matching popularity tokens: +2 entries
     - If ANY other player has matching tokens: no bonus
     - Encourages Forest when bot can capitalize on popularity rewards without competition
   - **If Hunter is NOT in Forest:**
     - Forest entries = -100 (prevents solo apprentice Forest entry)

**Design Principles:**
- **Probabilistic**: Adds variety and unpredictability to bot behavior
- **Resource-driven**: Prioritizes locations based on current needs (HP, EP, capacity)
- **Combat-ready**: Strong Forest bonuses when prepared (items, full EP, ammunition available or money to buy)
- **Safety-first**: Heavy penalties for Forest without resources to fight
- **Social apprentice**: Follows other players to maximize resource competition and strategic positioning
- **Adaptive scaling**: CSV tables adjust Dojo/Forest preferences as weapons grow stronger
- **Weapon synergy**: Each weapon's preferred location guides both hunter and apprentice decisions

### Resource Management AI
- Priority order: Money → EP → HP → EXP
- Weapon-specific item priorities (e.g., Rifle needs 3+ bullets)
- Automatic capacity overflow resolution

### Bot Stages
1. **Stage 1**: Before 2nd level 1 monster
2. **Stage 2**: Before 2nd level 2 monster
3. **Stage 3**: After 2nd level 2 monster

### Tactical Combat AI
- Uses minimum items needed for guaranteed kills
- Prioritizes efficiency: Dynamite > Bomb > Grenade
- Recovery item usage to maintain max HP/EP
- Fake Blood always used for bonus points

## Combat System

### Battle Mechanics
- Dice-based combat with weapon-specific damage arrays
- Attack dice vs defense dice system
- Monster HP and attack values vary by level
- EXP gained equal to damage taken

### Monster System
- **Level 1**: 2 HP, 3 ATT, 2 EP cost
- **Level 2**: 3 HP, 4 ATT, 3 EP cost
- **Level 3**: 4 HP, 5 ATT, 4 EP cost
- Random selection from monster pools per level

### Combat Items
- **Grenade**: 1 damage, size 2, $2
- **Bomb**: 2 damage, size 3, $4
- **Dynamite**: 3 damage, size 4, $6
- **Fake Blood**: Bonus points = monster level

## Weapons System

### 11 Unique Weapons
Each weapon features:
- Unique damage array (dice rolls 1-6)
- 3 power levels (positions 1, 3, 7 on track)
- Preferred location for bot AI
- Special ammunition requirements (Rifle/Plasma)

### Notable Weapon Powers

**Bat**
- Lv1: Apprentice gets +1 resource when sharing location with hunters
- Lv2: +1 HP or +1 EP at round start (player choice)
- Lv3: Re-roll successful hits until miss, sum all damage

**Katana**
- Lv1: None
- Lv2: +2 EXP when hunter is alone at location
- Lv3: Instant kill if attack dice total > 27

**Rifle**
- Lv1: Uses bullets ($2 each), 1 per attack
- Lv2: +2$ at round start
- Lv3: Store prices -1$

**Plasma**
- Lv1: Uses batteries ($2 each), 1 per attack
- Lv2: +2$ at round start
- Lv3: Infinite ammunition

**Chain**
- Lv1: Can tame monsters at HP ≤ 3
- Lv2: +2 beer at round start
- Lv3: Pet damage x2

**Axe**
- Lv1: Deal 1 damage when taking damage (no EXP from monster damage)
- Lv2: +1 blood bag at round start
- Lv3: Deal equal damage when taking damage

**Whip**
- Lv1: Taming costs -1 EP
- Lv2: +2 beer at round start
- Lv3: Taming costs 0 EP

**Bow**
- Lv1: +16% dodge chance
- Lv2: +1 EXP at round start
- Lv3: Damage x2

**Sword**
- Lv1: None
- Lv2: +2 EXP when hunter is alone at location
- Lv3: +1 point per die showing 1

**Knife**
- Lv1: Can double damage once per battle
- Lv2: +2 points when hunter is alone at location
- Lv3: +2 points at the start of a round

**Gloves**
- Lv1: +1 damage [5,6] when taking damage (per attack)
- Lv2: +2 blood bags at round start
- Lv3: +1 damage [5,6] per HP lost (overrides Lv1)

## Resource Management

### Resource Types
- **Money**: Max 15, used for store purchases
- **EXP**: Max 15, used for weapon upgrades
- **HP**: Max 10 (upgradeable), combat survival
- **EP**: Max 10 (upgradeable), Forest entry and taming

### Capacity System
- Weapon-specific inventory limits
- Overflow management with use/upgrade/discard options
- Bot automatic overflow resolution

### Scoring Sources
- Plaza location (crowd-dependent)
- Monster victory rewards
- Milestone bonuses (8 and 10 max HP/EP)
- Weapon-specific bonuses

## Technical Implementation

### UI Update System
- `updateResourceDisplay()`: Player stats and resources
- `updateInventoryDisplay()`: Inventory with use buttons
- `updateLocationDisplays()`: Dynamic reward text
- `addLogEntry()`: Comprehensive action logging

### Design Patterns
- **State Machine**: Round phase management
- **Strategy Pattern**: Weapon-specific behaviors
- **Observer Pattern**: UI updates on state changes
- **Factory Pattern**: Dynamic player/bot creation

### Data Structures
- Player objects with nested weapon, resources, inventory
- Location arrays with dynamic reward calculation
- CSV-based lookup tables for bot decisions
- Token tracking system for board state

## Recent Improvements

### Game Mode System (Latest Session)
- **Simultaneous Mode**: Activated when there is exactly 1 human player
  - All bots select/shop instantly (complete immediately)
  - Human player takes their time without waiting for turn order
  - Phase progresses when all players complete their actions
  - Used for both Selection Phase and Store Phase
- **Turn-Based Mode**: Activated when there are 2+ human players
  - Players select/shop sequentially in turn order
  - Each player's turn is clearly indicated
  - Phase progresses after all players complete in sequence
  - Used for both Selection Phase and Store Phase

### Player Status Indicators
- **Visual Status Panel**: Shows all players with real-time completion status
  - Player names displayed in their assigned player colors
  - Status shown with emoji indicators: 🔴 (pending) / 🟢 (completed)
  - Clean text-only design without background boxes
  - Appears during Selection and Store phases
  - Automatically hidden when phase completes
- **Status Tracking**: Internal `playerCompletionStatus` object tracks each player
- **Automatic Reset**: Status resets at the start of each new round

### Selection Phase Updates
- **Mode Detection**: Automatically determines mode based on human player count
- **Simultaneous Mode Flow**:
  - All bots triggered immediately upon phase start
  - Human player sees location cards and selects at their own pace
  - Bot status indicators turn green instantly
  - Phase ends when human completes selection
- **Turn-Based Mode Flow**:
  - Players select sequentially in turn order
  - Current player indicator shows whose turn it is
  - Status indicators turn green as each player completes
  - Phase ends after last player confirms

### Store Phase Updates
- **Mode Detection**: Uses same mode determination as Selection Phase
- **Simultaneous Mode Flow**:
  - All bots shop automatically using priority-based purchasing
  - Human player sees store interface and shops at their own pace
  - Bot status indicators turn green after shopping completes
  - Phase ends when human clicks "Finish Shopping"
- **Turn-Based Mode Flow**:
  - Players shop sequentially in turn order
  - Store interface updates for each player's turn
  - Status indicators turn green as each player finishes
  - Phase ends after last player completes shopping

### Game Balance Changes (Latest Session)
- **Player Count**: Changed from 2-5 to 2-4 players maximum
- **Dummy Tokens**: 2-player games now start at Bar and Dojo
- **Forest Selection**: Human players can now select Forest without meeting requirements
  - Warning popup shows at confirmation stage (not during selection)
  - Lists missing EP/ammunition requirements
  - Reminds players about Store phase opportunities
  - Allows strategic planning ahead

### Bot System Enhancements
- Tactical item usage during combat phases
- CSV-based decision tables for consistency
- Weapon-specific resource priorities
- Stage-based Forest entry requirements
- Automatic capacity overflow resolution
- Forest selection logic: -100 entry penalty without ammunition

### Bug Fixes
- Fixed double resource distribution issue
- Fixed Station resource distribution
- Bot display updates synchronized with actions
- Ammunition display updates for all players
- Score and milestone checkbox updates
- Weapon power advancement for bots
- Pet display updates when bots tame

### UI Improvements
- Real-time inventory updates with usage buttons
- Dynamic location rewards based on player count
- Comprehensive game logging system
- Player color assignment system
- Battle action chronological ordering

## Development Notes

### Key Functions
- `startResourceDistribution()` (line 6446): Handles resource phase
- `executeBotBattle()` (line 3233): Bot combat automation
- `handleBotTacticalItemUsage()` (line 4854): Bot tactical decisions
- `distributeStationResources()` (line 3825): Station reward distribution
- `handleCapacityOverflow()` (line 6754): Overflow management
- `initializePlayerStatusIndicators()` (line 1873): Creates status indicator UI elements
- `updatePlayerStatus()` (line 1921): Updates individual player completion status
- `checkAllPlayersComplete()` (line 1941): Checks if all players finished current phase
- `updateCurrentPlayerSimultaneous()` (line 2126): Handles simultaneous selection start
- `confirmSelectionSimultaneous()` (line 3346): Handles simultaneous selection completion
- `enterStorePhaseSimultaneous()` (line 8022): Handles simultaneous store start
- `finishShoppingSimultaneous()` (line 8868): Handles simultaneous shopping completion

### Testing Considerations
- Bot decision consistency across stages
- Resource distribution scaling with player counts
- Combat item usage optimization
- Weapon power interactions
- UI synchronization with game state

## Data Collection System

### CSV Data Export
- **Automated Game Running**: Configurable batch processing (1-1000 games, 2-4 players)
- **Performance Optimized**: 0ms delays, DOM updates skipped in automated mode
- **15 Data Points Per Player**:
  - `game_id`, `player_count`, `rounds`, `player_id`, `weapon`, `level`, `score`, `rank`
  - `weapon_track_pos`, `defeated_lv1`, `defeated_lv2`, `defeated_lv3`
  - `score_monsters`, `score_milestones`, `score_popularity`, `score_plaza`, `score_fakeblood`, `score_other`

### Score Tracking System
- **Score Sources**: Comprehensive tracking by source type
  - `scoreFromMonsters`: Points from defeated monsters
  - `scoreFromMilestones`: HP/EP milestone bonuses (8→+2pts, 10→+4pts)
  - `scoreFromPopularity`: Popularity track advancement and reward tokens
  - `scoreFromPlaza`: Plaza location scoring (3 points if alone)
  - `scoreFromFakeBlood`: Bonus points from Fake Blood items
  - `scoreFromOther`: Weapon-specific bonuses and miscellaneous sources

### Ranking System
- **Primary Sort**: Highest score wins
- **Tiebreaker**: Popularity track level (0-5)
- **Shared Ranks**: Players with identical score AND level share same rank
- **Winner Logic**: Game ends at round completion, winner = rank 1 player

### Popularity Track Logic
- **Point Token**: Permanent position (0-5) representing highest reached level
- **Reward Token**: Current position affecting resource rewards
- **Movement Rules**: 
  - Up if hunter alone at location
  - Down if crowded (except Knife Lv1+ power)
  - Forest placement = no change
- **Scoring**: Point advancement awards points equal to level reached

### Technical Implementation
- **`processPopularityTrackLogic()`**: Game logic separated from DOM updates
- **`calculatePlayerRankings()`**: Ranking calculation with tiebreaker handling
- **`determineWinner()`**: Proper winner selection using ranking system
- **DOM Protection**: All UI updates wrapped with `isAutomatedMode` checks

### Data Collection Functions
- **`recordGameData()`**: Collects 15 data points per player
- **`exportToCSV()`**: Automatic CSV download with timestamp
- **`runAutomatedGames()`**: Batch processing with progress tracking
- **`startDataCollection()`**: UI entry point for automated collection

### Performance Features
- **DOM Avoidance**: Complete UI bypass during automated games
- **Speed Optimization**: Minimal delays between phases
- **Error Handling**: Protected against null DOM references
- **Memory Efficiency**: Game state reset between automated runs

## Future Enhancements
- Network multiplayer support
- Additional weapons and powers
- New locations and resources
- Advanced bot difficulty levels
- Achievement system
- Real-time statistics dashboard

---
*Last Updated: Current session*
*Game Version: 1.2 - Simultaneous/Turn-Based Mode System*
*Technical Stack: Vanilla JavaScript ES6, HTML5, CSS3*
*Data Export: CSV format with comprehensive game metrics*
- add to memory.
- to memorize
- to memorize
- add to memory.
- to memorize
- to memorize