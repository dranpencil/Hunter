# Hunter & Apprentice Board Game System Documentation

## Overview
This is a digital board game for 2 players where each player controls a Hunter and an Apprentice token, placing them on 7 different locations to gather resources, fight monsters, and score points.

## Game Flow
1. **Location Selection Phase**: Each player secretly selects locations for their Hunter and Apprentice
2. **Resource Distribution Phase**: Players collect resources from all locations except Forest
3. **Station Choice Phase**: Players with hunters at Station choose their desired resource
4. **Store Phase**: Players can spend money to buy items and handle capacity overflow
5. **Battle Phase**: Hunters in Forest fight monsters one at a time
6. **Next Round Phase**: All tokens return to players, then start new round

**Win Condition**: 1st player to reach 50 points wins the game.

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

### 1. Work Site
- **Resource**: Money
- **Rewards**: 6$ with 1 token, 4$ with 2+ tokens
- **Special**: Only hunters earn resources

### 2. Bar
- **Resource**: Beer
- **Rewards**: 6 beers with 1 token, 4 beers with 2+ tokens
- **Special**: Only hunters earn resources

### 3. Station (Wild Card)
- **Resource**: Player's choice
- **Special**: Each hunter chooses what resource to collect (Money, Beer, Blood Bags, or EXP)
- **Rewards**: Same as the chosen resource's location

### 4. Hospital
- **Resource**: Blood Bags
- **Rewards**: 4 blood bags with 1 token, 2 with 2+ tokens
- **Special**: Only hunters earn resources

### 5. Dojo
- **Resource**: Experience (EXP)
- **Rewards**: 4 EXP with 1 token, 2 EXP with 2+ tokens
- **Special**: Only hunters earn resources

### 6. Plaza
- **Resource**: Score (Victory Points)
- **Entry Cost**: 1 EP for hunters (apprentices enter free)
- **Rewards**: 3 points with 1 token, 0 points with 2+ tokens
- **Special**: Only hunters earn points
- **Restriction**: Hunters cannot enter if player has less than 1 EP

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

The game includes 3 dummy tokens that create strategic obstacles and affect resource distribution:

### Initial Placement
- 3 dummy tokens start at locations 2, 4, and 6 (Bar, Hospital, Plaza)

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
- Plaza now provides guaranteed points (4 solo/2 crowded) with no EP cost
- Dummy tokens create dynamic obstacles that force location adaptation
- Manage inventory capacity vs. item benefits
- Time HP/EP upgrades for maximum benefit and milestone bonuses
- Risk/reward of solo placement (more resources) vs. crowded locations
- Combat items can turn difficult monster battles
- Popularity track rewards for strategic hunter placement
- Forest apprentice bonus for coordinated team placement
- Consider weapon priority for Forest battle order advantage
- Track dummy token movement patterns for future planning

## Memories
- add to memory
- hi