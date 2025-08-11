# Hunter & Apprentice Board Game System Documentation

## Overview
Hunter & Apprentice is a strategic digital board game for 2-5 players where each player controls a Hunter and an Apprentice token, placing them on 7 different locations to gather resources, fight monsters, and score points. The game features sophisticated AI opponents, 11 unique weapons with special powers, and dynamic resource management.

## Core Game Architecture

### Main Classes
- **BotPlayer** (lines 2-981): Comprehensive AI decision-making system with CSV-based lookup tables
- **Game** (lines 983-7000+): Main game controller managing all phases, mechanics, and UI

### Game State Management
- Phase tracking via `roundPhase`: 'selection', 'distribution', 'station', 'store', 'battle', 'nextround'
- Dynamic player count configurations (2-5 players)
- Dummy token system for game balance across different player counts

## Game Flow

### 1. Selection Phase
- Players secretly select locations for Hunter and Apprentice tokens
- Forest requires 2+ EP and appropriate ammunition (Rifle/Plasma weapons)
- Bots use probabilistic entry system with weapon preferences

### 2. Resource Distribution Phase  
- Players collect resources from all locations except Forest
- Rewards scale based on token density:
  - 2 players: [6,4] rewards
  - 3 players: [7,5,4] rewards  
  - 4+ players: [8,6,5,4] rewards
- Only Hunters collect resources (exception: Bat weapon power)

### 3. Station Choice Phase
- Hunters at Station select desired resource type
- Reward amount determined by total Station token count

### 4. Store Phase
- Players purchase items with money
- Capacity overflow management with use/upgrade/discard options
- Items available: Beer, Blood Bag, Grenade, Bomb, Dynamite, Fake Blood, Bullets, Batteries

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

### Hunter Decision Logic (BotPlayer class)
- **Base Entries**: 4 entries per location
- **Weapon Preference**: +2 entries for preferred location
- **Resource Adjustments**: Dynamic based on HP/EP ratios, capacity
- **CSV Lookup Tables**: Stage-based Dojo and Forest requirements

### Apprentice Decision Logic
- Social-aware following of other players' choices
- Highest score player gets additional preference weight
- Forest coordination prevents solo apprentice placement

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
- Lv2: +1 blood bag, +1 EP at round start
- Lv3: Re-roll successful hits until miss, sum all damage

**Katana**
- Lv1: Trade beer for blood bags
- Lv2: +1 EXP at round start
- Lv3: Instant kill if attack dice total > 27

**Rifle**
- Lv1: Uses bullets ($2 each), 1 per attack
- Lv2: +2$ at round start
- Lv3: Store prices -1$

**Plasma**
- Lv1: Uses batteries ($3 each), 1 per attack
- Lv2: +3$ at round start
- Lv3: Infinite ammunition

**Chain**
- Lv1: Can tame monsters at HP < 4
- Lv2: +2 beer at round start
- Lv3: Pet damage x2

**Axe**
- Lv1: Deal 1 damage when taking damage
- Lv2: +2 blood bags at round start
- Lv3: Deal equal damage when taking damage

**Whip**
- Lv1: Taming costs -1 EP
- Lv2: +2 beer at round start
- Lv3: Taming costs 0 EP

**Bow**
- Lv1: +16% dodge chance
- Lv2: +2 EXP at round start
- Lv3: Damage x2

**Sword**
- Lv1: Start game with +1 defense die
- Lv2: +1 EXP at round start
- Lv3: +1 point per die showing 1

**Knife**
- Lv1: Popularity token doesn't decrease
- Lv2: Can triple damage once per battle
- Lv3: Battle rewards x2
- Special: Only receives popularity track resources when token moves up (exception: at max level 5)

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

### Bot System Enhancements
- Tactical item usage during combat phases
- CSV-based decision tables for consistency
- Weapon-specific resource priorities
- Stage-based Forest entry requirements
- Automatic capacity overflow resolution

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

### Testing Considerations
- Bot decision consistency across stages
- Resource distribution scaling with player counts
- Combat item usage optimization
- Weapon power interactions
- UI synchronization with game state

## Data Collection System

### CSV Data Export
- **Automated Game Running**: Configurable batch processing (1-1000 games, 2-5 players)
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
*Game Version: 1.1 - Data Collection System*
*Technical Stack: Vanilla JavaScript ES6, HTML5, CSS3*
*Data Export: CSV format with comprehensive game metrics*
- add to memory.
- to memorize
- to memorize