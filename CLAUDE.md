# Hunter & Apprentice Board Game System Documentation

## Overview
This is a digital board game for 2-5 players where each player controls a Hunter and an Apprentice token, placing them on 7 different locations to gather resources, fight monsters, and score points.

## Game Flow
1. **Location Selection Phase**: Each player secretly selects locations for their Hunter and Apprentice
2. **Resource Distribution Phase**: Players collect resources from all locations except Forest
3. **Station Choice Phase**: Players with hunters at Station choose their desired resource
4. **Store Phase**: Players can spend money to buy items and handle capacity overflow
5. **Battle Phase**: Hunters in Forest fight monsters one at a time
6. **Next Round Phase**: All tokens return to players, then start new round

**Win Condition**: 1st player to reach 50 points wins the game.

## Player Count Configuration

The game supports 2-5 players with automatic scaling systems to maintain balance:

### Game Mode Selection
- **Quick Play**: Choose player count (2-5) and start immediately with all human players
- **Solo Play**: Configure individual player slots as Human or Bot, minimum 2 players required

### Automatic Scaling Systems
1. **Location Rewards**: Higher rewards with more players to compensate for increased competition
2. **Dummy Token Count**: Fewer dummy tokens with more players to maintain available locations
3. **Visual Displays**: Location reward displays automatically update to show current scaling (e.g., "$ 8/6/5/4" for 4+ players)

### Player Assignment
- **Weapons**: Randomly assigned from available weapon pool
- **Colors**: Unique colors automatically assigned to each player
- **Turn Order**: Sequential based on player assignment order

## Player Resources
Each player has the following resources with starting values and maximum limits:

### Basic Resources
- **Money ($)**: Start 4 (from weapon), Max 15
- **Experience (EXP)**: Start 3, Max 15
- **Health Points (HP)**: Start 4, Max starts at 4 (can be upgraded)
- **Energy Points (EP)**: Start 6, Max starts at 6 (can be upgraded)
- **Beer**: Start 0, No max (inventory limited by capacity)
- **Blood Bags**: Start 0, No max (inventory limited by capacity)
- **Score**: Start 0, No max

### Resource Upgrades
- **HP Upgrade**: Requires 3 blood bags to increase max HP by 1 (also increases current HP by 1)
- **EP Upgrade**: Requires 4 beers to increase max EP by 1 (also increases current EP by 1)
- **Max Resource**: HP and EP can be upgraded to maximum of 10
- **Milestones**: Players earn bonus points for reaching certain max levels:
  - Max HP/EP 8: +2 points (one-time bonus)
  - Max HP/EP 10: +4 points (one-time bonus)

## Locations

Location rewards scale based on the number of players in the game to maintain balance across different player counts.

### 1. Work Site
- **Resource**: Money
- **Rewards (Player Count Based)**:
  - **2 Players**: $6 with 1 token, $4 with 2+ tokens
  - **3 Players**: $7 with 1 token, $5 with 2 tokens, $4 with 3+ tokens
  - **4-5 Players**: $8 with 1 token, $6 with 2 tokens, $5 with 3 tokens, $4 with 4+ tokens
- **Special**: Only hunters earn resources

### 2. Bar
- **Resource**: Beer
- **Rewards (Player Count Based)**:
  - **2 Players**: 6 beers with 1 token, 4 beers with 2+ tokens
  - **3 Players**: 7 beers with 1 token, 5 beers with 2 tokens, 4 beers with 3+ tokens
  - **4-5 Players**: 8 beers with 1 token, 6 beers with 2 tokens, 5 beers with 3 tokens, 4 beers with 4+ tokens
- **Special**: Only hunters earn resources

### 3. Station (Wild Card)
- **Resource**: Player's choice
- **Special**: Each hunter chooses what resource to collect (Money, Beer, Blood Bags, or EXP)
- **Rewards**: Same as the chosen resource's location based on current player count

### 4. Hospital
- **Resource**: Blood Bags
- **Rewards (Player Count Based)**:
  - **2 Players**: 4 blood bags with 1 token, 2 blood bags with 2+ tokens
  - **3 Players**: 5 blood bags with 1 token, 4 blood bags with 2 tokens, 3 blood bags with 3+ tokens
  - **4-5 Players**: 6 blood bags with 1 token, 5 blood bags with 2 tokens, 4 blood bags with 3 tokens, 3 blood bags with 4+ tokens
- **Special**: Only hunters earn resources

### 5. Dojo
- **Resource**: Experience (EXP)
- **Rewards (Player Count Based)**:
  - **2 Players**: 4 EXP with 1 token, 2 EXP with 2+ tokens
  - **3 Players**: 5 EXP with 1 token, 4 EXP with 2 tokens, 3 EXP with 3+ tokens
  - **4-5 Players**: 6 EXP with 1 token, 5 EXP with 2 tokens, 4 EXP with 3 tokens, 3 EXP with 4+ tokens
- **Special**: Only hunters earn resources

### 6. Plaza
- **Resource**: Score (Victory Points)
- **Rewards (Player Count Based)**:
  - **2 Players**: 4 points with 1 token, 2 points with 2+ tokens
  - **3 Players**: 5 points with 1 token, 4 points with 2 tokens, 3 points with 3+ tokens
  - **4-5 Players**: 6 points with 1 token, 5 points with 2 tokens, 4 points with 3 tokens, 3 points with 4+ tokens
- **Special**: Only hunters earn points

### 7. Forest (Monster Hunt)
- **Resource**: Various (from defeating monsters)
- **Entry Cost**: 2/3/4 EP for Level 1/2/3 monsters
- **Special**: Hunters fight monsters in turn-based combat
- **Restriction**: Hunters cannot enter if player has less than 2 EP
- **Exception**: Both hunter and apprentice can go to Forest together
- **Apprentice Bonus**: If apprentice also in Forest, monster HP reduced by 1 (minimum 1)

## Weapon System
Each player is assigned a weapon at the start of the game.

### Weapon Properties
- **Initial Money**: Starting money based on weapon
- **Capacity**: Maximum inventory size for items
- **Attack Dice**: Number of dice rolled for attacks (max 7)
- **Defense Dice**: Number of dice rolled for defense (max 6)
- **Damage Array**: Damage values for dice rolls 1-6
- **Req Exp Attack**: EXP cost to upgrade attack dice (flat rate per level)
- **Priority**: Battle order priority (lower number = fights first when scores are tied)

### Dice Upgrades
- **Attack Dice**: Costs weapon's reqExpAttack value per upgrade (e.g., Bat = 4 EXP per level)
- **Defense Dice**: Always costs 3 EXP per upgrade

### Sample Weapons
- **Bat**: 4$ start, 6 capacity, damage [0,0,0,1,1,1], 4 EXP per attack upgrade
- **Katana**: 4$ start, 4 capacity, damage [0,0,1,1,1,1], 5 EXP per attack upgrade

## Monster Combat System

### Monster Levels
- **Level 1**: Costs 2 EP to fight, 2-4 HP, 1-3 ATT
- **Level 2**: Costs 3 EP to fight, 5-7 HP, 2-4 ATT
- **Level 3**: Costs 4 EP to fight, 10-13 HP, 3-5 ATT

### Combat Mechanics
1. **Player Turn**: 
   - Use items before attacking (optional)
   - Roll attack dice, calculate damage using weapon's damage array
2. **Monster Turn**: Attack with fixed ATT value
3. **Player Defense**: 
   - Use items before defending (optional)
   - Roll defense dice (1-3 = 0 defense, 4-6 = 1 defense each)
4. **Damage Taken**: When player takes damage from monster, gain EXP equal to damage

### Combat Items Usage
- Items can be used at battle start and between attack/defense phases
- **Combat Items**: Grenade (-1 monster HP), Bomb (-2 monster HP), Dynamite (-3 monster HP), Fake Blood (bonus points)
- **Recovery Items**: Beer (+1 EP), Blood Bag (+1 HP) - only if not at maximum

### Monster Defeat
- **Victory**: Earn money, beer (energy), blood bags, and score based on monster
- **Defeat**: HP set to 1, EP unchanged, no score penalty

## Store System

### Store Phase
- Occurs after all players complete location selection
- Each player shops individually
- Can buy multiple items until choosing to finish
- After all players shop, must resolve capacity overflow

### Items Available
1. **Beer** (Size: 1, $2) - Gain 1 beer
2. **Blood Bag** (Size: 1, $2) - Gain 1 blood bag
3. **Grenade** (Size: 2, $2) - Reduce monster HP by 1 (combat only)
4. **Bomb** (Size: 3, $4) - Reduce monster HP by 2 (combat only)
5. **Dynamite** (Size: 4, $6) - Reduce monster HP by 3 (combat only)
6. **Fake Blood** (Size: 2, $2) - Gain bonus points equal to monster level when defeating it

### Capacity Management
- Items have sizes that count against weapon capacity
- Can temporarily exceed capacity while shopping
- Must resolve capacity overflow after shopping phase
- **Overflow Options**:
  - **Beer/Blood Bag**: Use (restore resource), Upgrade (add to upgrade progress), or Discard
  - **Other Items**: Discard only

## Popularity Track System

Each player has a popularity track with 6 levels (0-5), each having points and rewards:
- **Level 5**: 5 points / 5 score points
- **Level 4**: 4 points / 4 EXP  
- **Level 3**: 3 points / 3 Blood Bags
- **Level 2**: 2 points / 2 Money
- **Level 1**: 1 point / 1 Beer
- **Level 0**: 0 points / No reward

### Track Tokens
- **Point Token**: Tracks highest level reached for point collection
- **Reward Token**: Moves up/down based on hunter placement, determines rewards

### Movement Rules
- **Reward Token**: Moves up if hunter is alone at location, down if not alone
- **Point Token**: Follows reward token upward (never moves down)
- **Forest Exception**: No popularity track changes if hunter is in Forest
- **Level 5 Exception**: If reward token is already at level 5 and would move up, it stays at level 5 but player still receives all rewards
- **Rewards**: Given for reward token level and all levels below
- **Points**: Only awarded once per level when point token moves up

## Dummy Token System

The game includes dummy tokens that create strategic obstacles and affect resource distribution. The number of dummy tokens varies based on player count:

### Initial Placement (Player Count Based)
- **2 Players**: 3 dummy tokens at locations 2, 4, and 6 (Bar, Hospital, Plaza)
- **3 Players**: 2 dummy tokens at locations 2 and 5 (Bar, Dojo)
- **4 Players**: 1 dummy token at location 3 (Station)
- **5 Players**: 0 dummy tokens

### Movement Rules
- **Next Round Phase**: Dummy tokens move to the next location ID in sequence
- **Movement Pattern**: 2→3→4→5→6→1→2→3... (continuous cycle)
- **Forest Skip**: When a dummy would move to location 7 (Forest), it skips directly to location 1 (Work Site)
- **Wrap Around**: After location 6, tokens move to location 1, creating endless cycle

### Game Effects
- **Location Blocking**: Players cannot select locations occupied by dummy tokens
- **Resource Reduction**: Dummy tokens count toward total token count, forcing lower reward amounts
- **No Popularity Impact**: Since players can't go to dummy locations, no popularity track effects

## Location Selection Rules
- **General Rule**: Hunter and apprentice cannot select the same location
- **Forest Exception**: Both hunter and apprentice can go to Forest together
- **Dummy Token Restriction**: Players cannot select locations with dummy tokens
- **EP Restrictions**: 
  - Forest requires 2+ EP for hunters

## Forest Battle Order
When multiple hunters enter Forest, battle order is determined by:
1. **Score** (lowest fights first)
2. **Weapon Priority** (lowest number fights first, if scores tied)

## Turn Order Summary
1. **Location Selection**: Both players select hunter and apprentice locations
2. **Popularity Track Update**: Move tokens based on hunter placement (except Forest)
3. **Store Phase**: Players buy items in order
4. **Capacity Check**: Resolve overflow with use/upgrade/discard options
5. **Token Placement**: Place all tokens on board
6. **Special Locations**: Resolve Station choices and Forest battles (in order)
7. **Resource Distribution**: Collect resources from standard locations
8. **Next Round**: Clear selections, move dummy tokens, and start again

## Key Strategic Elements
- **Player Count Scaling**: Rewards increase with more players to maintain balance (e.g., Work Site: $6/4 for 2p, $8/6/5/4 for 4-5p)
- **Dynamic Dummy Tokens**: Token count decreases as player count increases (3 tokens for 2p, 0 tokens for 5p)
- **Location Competition**: More players means more competition for solo placement bonuses
- **Reward Tier Strategy**: Understanding when you'll get tier 1 vs tier 2+ rewards based on player count
- **Plaza Scaling**: Guaranteed points scale from 4/2 (2p) to 6/5/4/3 (4-5p)
- Manage inventory capacity vs. item benefits
- Time HP/EP upgrades for maximum benefit and milestone bonuses
- Combat items can turn difficult monster battles
- Popularity track rewards for strategic hunter placement
- Forest apprentice bonus for coordinated team placement
- Consider weapon priority for Forest battle order advantage
- Track dummy token movement patterns for future planning (when applicable)

## Game Log System
The game features a comprehensive logging system that displays on the left side of the screen, providing a complete history of all game events.

### Log Features
- **Fixed Position**: 300px wide panel on the left side of the screen
- **Auto-Scroll**: Automatically scrolls to show newest entries
- **Color-Coded Categories**: Different border colors for easy identification
- **Entry Limit**: Maintains last 100 entries to prevent memory issues
- **Clear Function**: Players can clear the log at any time
- **Responsive Design**: Hides on screens smaller than 1400px width

### Message Categories
1. **🔄 Round Start** (Orange border)
   - New game initialization
   - Round number announcements

2. **📍 Selection** (Purple border)
   - Hunter and apprentice location selections
   - Shows both human player and bot choices

3. **💰 Resource Gain** (Green border)
   - Resources earned from locations
   - Station resource choices
   - Popularity track rewards

4. **🛒 Store Purchase** (Orange border)
   - Human player item purchases with prices
   - Bot purchasing decisions and item lists

5. **⚔️ Battle** (Red border)
   - All monster combat messages
   - Attack rolls, damage dealt, defeats
   - Battle outcomes and rewards

6. **📝 System** (Gray border)
   - General system messages
   - Game state changes

### Technical Implementation
- **HTML**: Fixed position panel with scrollable content area
- **CSS**: Color-coded styling with fade-in animations
- **JavaScript**: `addLogEntry(message, category)` function integrates throughout game code
- **Memory Management**: Automatic cleanup of old entries
- **Integration**: All major game events automatically logged

The game log provides players with a complete audit trail of all game actions, making it easier to track resource changes, strategic decisions, and battle outcomes throughout the entire game.

## Bot System
The game features a comprehensive AI bot system that enables solo play with intelligent virtual opponents. Bots make strategic decisions using probabilistic algorithms and stage-based progression.

### Bot Player Architecture
The bot system is implemented through the `BotPlayer` class with four integrated subsystems:

#### 1. Hunter Subsystem (Location Selection)
**Purpose**: Decides where the bot's hunter token should be placed each round.

**Decision Algorithm**:
- **Base Entries**: Each available location starts with 5 entries
- **Weapon Preferences**: +2 entries for weapon's preferred location (from Weapon.csv)
- **Resource Shortages**: Adjustments based on bot's current resource needs
- **Unavailable Locations**: -100 entries (effectively removes from consideration)

**Resource-Based Adjustments**:
- **Hospital**: +2 entries if HP ≤ half, +1 if below max, 0 if full
- **Bar**: +2 entries if EP below stage requirement, +1 if below max, 0 if full
- **Work Site**: +1 entry if capacity 3-4, +2 entries if capacity 4+
- **Dojo**: Uses CSV lookup tables based on current attack/defense dice and stage
- **Plaza**: +2 entries if bot hasn't visited Plaza for 2+ rounds
- **Forest**: Complex calculation using CSV tables, HP thresholds, and combat items

**Probability Calculation**: All entry values are summed to create weighted probability distribution for final location selection.

#### 2. Apprentice Subsystem (Social Placement)
**Purpose**: Decides where the bot's apprentice token should be placed after hunter placement.

**Decision Logic**:
- **Base Entries**: 5 entries for all locations except hunter's chosen location
- **Social Awareness**: +2 entries for other players' weapon preferred locations
- **Highest Scorer Bonus**: +1 additional entry for the leading player's preferred location
- **Forest Coordination**: +1 entry for Forest if hunter is also going to Forest
- **Probability Selection**: Uses same weighted random selection as hunter subsystem

#### 3. Resource Management Subsystem
**Money Management**:
- **Weapon-Specific Priorities**: Rifle/Plasma bots prioritize bullets/batteries (minimum 3)
- **Standard Priority Order**: Dynamite > Bomb > Grenade > Fake Blood > Blood Bag > Beer
- **Budget Constraints**: Only purchases items the bot can afford
- **Capacity Awareness**: Considers inventory space when making purchases

**Resource Usage**:
- **EP Management**: Uses beer to maintain stage-appropriate EP levels, excess goes to upgrades
- **HP Management**: Uses blood bags for recovery first, then upgrades
- **EXP Management**: Alternates between attack and defense dice upgrades with preference tracking

**Automatic Capacity Overflow Handling**:
1. Use blood bags for HP recovery (if HP < max)
2. Use beer for EP recovery (if EP < max)  
3. Upgrade HP with 3 blood bags (if max HP < 10)
4. Upgrade EP with 4 beers (if max EP < 10)
5. Discard items as last resort (largest first, non-combat preferred)

#### 4. Battle Management Subsystem
**Monster Selection**:
- **Stage-Based Progression**: 
  - Stage 1: Fight Level 1 monsters (advance after defeating 2)
  - Stage 2: Fight Level 2 monsters (advance after defeating 2)
  - Stage 3: Fight Level 3 monsters
- **EP Budget Management**: Selects highest affordable level if insufficient EP
- **Pet Integration**: Chain/Whip bots automatically bring their highest level pet

**Combat Strategy**:
- **Item Optimization**: Uses minimal combat items for sure kills (Dynamite > Bomb > Grenade)
- **Fake Blood Usage**: Always uses all Fake Blood for bonus points
- **Battle Simulation**: Full turn-based combat with dice rolling
- **Weapon Powers**: Handles all weapon abilities (Axe retaliation, etc.)

**Post-Battle Management**:
- **Automatic Recovery**: Uses items to restore HP/EP to maximum
- **Automatic Upgrades**: Uses excess resources for HP/EP/dice upgrades
- **Milestone Bonuses**: Automatically detects and applies milestone rewards
- **Pet Taming**: Chain/Whip bots attempt to tame defeated monsters

### Stage Progression System
Bots track their progression through three distinct stages:

- **Stage 1**: Target Level 1 monsters, focus on basic resource accumulation
- **Stage 2**: Target Level 2 monsters, intermediate resource management  
- **Stage 3**: Target Level 3 monsters, advanced optimization strategies

Stage advancement occurs automatically after defeating 2 monsters of the current stage's level.

### Solo Play Mode
**UI Features**:
- **5 Player Slots**: First slot defaults to human player, others start closed
- **Flexible Configuration**: Each slot can be toggled between Player/Bot/Closed
- **Minimum Requirement**: At least 2 players required to start
- **Ready Button**: Disabled until minimum player count is met

**Game Integration**:
- **Automatic Decisions**: Bots make all decisions without human intervention
- **UI Hiding**: Bot-specific UI elements are hidden during bot turns
- **Status Messages**: Clear indication when bots are making decisions
- **Comprehensive Logging**: All bot actions are logged to the game log

### Bot Behavior Examples

**Early Game Bot (Stage 1)**:
- Prioritizes resource accumulation locations (Work Site, Bar, Hospital)
- Fights Level 1 monsters when EP allows
- Uses basic resource management
- Focuses on building up attack/defense dice

**Mid Game Bot (Stage 2)**:  
- More strategic location selection based on current needs
- Fights Level 2 monsters consistently
- Efficient item usage and capacity management
- Begins serious HP/EP upgrade investments

**Late Game Bot (Stage 3)**:
- Optimized decision-making with full CSV table utilization
- Targets Level 3 monsters exclusively
- Advanced resource optimization
- Maximizes milestone bonuses and scoring opportunities

### Technical Implementation
- **CSV Integration**: Uses data tables for probabilistic decision making
- **Weapon-Specific Logic**: Each weapon type has customized behavior patterns
- **Memory Management**: Bots track their own progression and preferences
- **Error Handling**: Robust fallback systems prevent bot decision failures
- **Performance Optimization**: Efficient algorithms minimize processing time

### Bot vs Human Balance
Bots are designed to provide challenging but fair opponents:
- **Strategic Depth**: Use same game rules and constraints as human players
- **Probabilistic Decisions**: Avoid perfect play through weighted randomization
- **Adaptive Difficulty**: Stage progression provides natural difficulty scaling
- **Transparency**: All bot actions are logged for player visibility

The bot system transforms the game from multiplayer-only to a comprehensive single-player experience with intelligent AI opponents that provide meaningful strategic challenges.

## Memories
- add to memory