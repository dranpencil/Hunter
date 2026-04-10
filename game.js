// Bot system for AI players
class BotPlayer {
    constructor(playerId, weapon) {
        this.playerId = playerId;
        this.weapon = weapon;
        this.monstersDefeated = { lv1: 0, lv2: 0, lv3: 0 };
        this.roundsSinceLastPlaza = 0;
        this.preferAttackDiceNext = false; // Track EXP upgrade preference
        
        // CSV data tables for decision making
        this.weaponPreferences = {};
        this.dojoTable = {};
        this.forestTable = {};
        
        this.loadCSVData();
    }
    
    loadCSVData() {
        // Load weapon preferences from CSV data
        const weaponData = {
            'Bat': 'plaza',
            'Katana': 'dojo', 
            'Rifle': 'work site',
            'Plasma': 'work site',
            'Chain': 'bar',
            'Axe': 'hospital',
            'Whip': 'bar',
            'Bow': 'plaza',
            'Sword': 'dojo',
            'Knife': 'plaza',
            'Gloves': 'hospital'
        };
        this.weaponPreferences = weaponData;
        
        // Load dojo requirement tables (attack dice as rows, defense dice as columns)
        this.dojoTable = {
            1: { // Level 1 (exp需求組合(lv1).csv)
                2: [1, 1, 0, 0, 0, 0, 0], // Attack dice 2
                3: [0, 0, 0, 0, 0, 0, 0], // Attack dice 3
                4: [0, 0, 0, 0, 0, 0, 0], // Attack dice 4
                5: [0, 0, 0, 0, 0, 0, 0], // Attack dice 5
                6: [0, 0, 0, 0, 0, 0, 0], // Attack dice 6
                7: [0, 0, 0, 0, 0, 0, 0]  // Attack dice 7
            },
            2: { // Level 2 (exp需求組合(lv2).csv)
                2: [1, 1, 1, 1, 0, 0, 0],
                3: [1, 1, 1, 1, 0, 0, 0],
                4: [1, 1, 1, 1, 0, 0, 0],
                5: [0, 0, 0, 0, 0, 0, 0],
                6: [0, 0, 0, 0, 0, 0, 0],
                7: [0, 0, 0, 0, 0, 0, 0]
            },
            3: { // Level 3 (exp需求組合(lv3).csv)
                2: [1, 1, 1, 1, 1, 1, 0],
                3: [1, 1, 1, 1, 1, 1, 0],
                4: [1, 1, 1, 1, 1, 1, 0],
                5: [1, 1, 1, 1, 1, 1, 0],
                6: [1, 1, 1, 1, 1, 1, 0],
                7: [0, 0, 0, 0, 0, 0, 0]
            }
        };
        
        // Load forest requirement tables (attack dice as rows, defense dice as columns)
        this.forestTable = {
            1: { // Level 1 (森林需求組合(lv1).csv)
                2: [-1, 0, 0, 1, 2, 3, 4],
                3: [0, 1, 1, 2, 3, 4, 5],
                4: [1, 2, 3, 4, 5, 6, 7],
                5: [2, 3, 4, 5, 6, 7, 8],
                6: [3, 4, 5, 6, 7, 8, 9],
                7: [4, 5, 6, 7, 8, 9, 10]
            },
            2: { // Level 2 (森林需求組合(lv2).csv)
                2: [-4, -2, 0, 1, 1, 1, 1],
                3: [-2, 0, 1, 1, 2, 2, 2],
                4: [0, 1, 1, 2, 3, 3, 3],
                5: [1, 2, 3, 4, 4, 4, 4],
                6: [2, 3, 4, 5, 5, 5, 5],
                7: [3, 4, 5, 6, 6, 6, 6]
            },
            3: { // Level 3 (森林需求組合(lv3).csv)
                2: [-6, -4, -2, -1, -1, -1, -1],
                3: [-4, -2, -1, 0, 0, 0, 0],
                4: [-2, -1, 0, 1, 1, 1, 1],
                5: [-1, 0, 1, 2, 2, 2, 2],
                6: [0, 1, 2, 2, 2, 2, 2],
                7: [1, 2, 2, 3, 3, 3, 3]
            }
        };
    }
    
    
    getRequiredEP() {
        // Minimum EP requirement for forest (now only 1 EP to tame any monster)
        let baseRequirement = 1;

        // Chain/Whip weapons might want extra EP for pet summoning
        if (this.weapon.name === 'Chain' || this.weapon.name === 'Whip') {
            baseRequirement += 1; // Extra EP for bringing a pet
        }

        return baseRequirement;
    }
    
    // Hunter subsystem: probabilistic location selection
    selectHunterLocation(gameState, availableLocations) {
        const player = gameState.players[this.playerId];
        const entries = {};
        
        // Initialize all locations with 4 base entries
        for (let i = 1; i <= 7; i++) {
            entries[i] = 4;
        }
        
        // Apply availability check (-100 for unavailable locations)
        for (let locationId = 1; locationId <= 7; locationId++) {
            if (!availableLocations.includes(locationId)) {
                entries[locationId] -= 100;
            }
        }
        
        // Weapon preference (+2 entries)
        const preferredLocation = this.getLocationIdByName(this.weapon.preferLocation);
        if (preferredLocation) {
            if (entries[preferredLocation] > -95) {
                // Preferred location is available, apply bonus normally
                entries[preferredLocation] += 2;
            } else if (preferredLocation !== 6 && entries[3] > -95) {
                // Preferred location is blocked (not Plaza), but Station is available
                // Redirect preference bonus to Station
                entries[3] += 2;
            }
        }
        
        // Resource-based adjustments
        this.adjustEntriesForResources(entries, player, gameState);
        
        // Calculate probabilities and select location
        return this.selectLocationByProbability(entries);
    }
    
    adjustEntriesForResources(entries, player, gameState) {
        // Hospital adjustments based on HP
        const hpRatio = player.resources.hp / player.maxResources.hp;
        if (hpRatio <= 0.5) {
            entries[4] += 2; // Hospital
        } else if (hpRatio < 1.0) {
            entries[4] += 1;
        }
        
        // Bar adjustments based on EP
        const requiredEP = this.getRequiredEP();
        if (player.resources.ep < requiredEP) {
            entries[2] += 2; // Bar
        } else if (player.resources.ep < player.maxResources.ep) {
            entries[2] += 1;
        }
        
        // Work Site adjustments based on capacity
        const availableCapacity = this.weapon.capacity - this.calculateUsedCapacity(player);
        if (availableCapacity <= 2) {
            // No change
        } else if (availableCapacity < 4) {
            entries[1] += 1; // Work Site
        } else {
            entries[1] += 2;
        }
        
        // Dojo adjustments based on attack/defense dice and weapon power track
        // Determine which table to use based on weapon power track position
        let dojoTableLevel = 1;
        if (player.weapon.powerTrackPosition >= 7) {
            dojoTableLevel = 3; // Position 7: use lv3 table
        } else if (player.weapon.powerTrackPosition >= 3) {
            dojoTableLevel = 2; // Position 3-6: use lv2 table
        } else {
            dojoTableLevel = 1; // Position 1-2: use lv1 table
        }
        
        const dojoEntries = this.getTableValue(this.dojoTable, player.weapon.currentAttackDice, player.weapon.currentDefenseDice, dojoTableLevel);
        if (dojoEntries > 0) {
            entries[5] += dojoEntries; // Dojo
        }
        
        // Plaza adjustments based on rounds since last visit
        if (this.roundsSinceLastPlaza >= 2) {
            entries[6] += 2; // Plaza
        }
        
        // Forest adjustments
        this.adjustForestEntries(entries, player, gameState);
    }
    
    adjustForestEntries(entries, player, gameState) {
        // Full EP bonus
        if (player.resources.ep === player.maxResources.ep) {
            entries[7] += 3; // Changed from +1 to +3
        }
        
        // Combat item bonuses (updated values)
        const grenades = player.inventory.filter(item => item.name === 'Grenade').length;
        const bombs = player.inventory.filter(item => item.name === 'Bomb').length;
        const dynamites = player.inventory.filter(item => item.name === 'Dynamite').length;
        
        if (grenades > 0) entries[7] += 2; // Changed from +1 to +2
        if (bombs > 0) entries[7] += 4; // Changed from +2 to +4
        if (dynamites > 0) entries[7] += 6; // Changed from +3 to +6
        
        // Check if bot has the lowest score
        if (gameState && gameState.players) {
            const scores = gameState.players.map(p => p.score || 0);
            const botScore = player.score || 0;
            const lowestScore = Math.min(...scores);
            if (botScore <= lowestScore) {
                entries[7] += 4; // Changed from +1 to +4 for having lowest score
            }
        }
        
        // Ammunition penalty for Rifle/Plasma weapons (only if can't buy ammo)
        if (player.weapon.name === 'Rifle') {
            const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
            if (bullets === 0 && player.resources.money < 2) {
                entries[7] -= 100; // Strong penalty: no bullets AND can't afford to buy
            }
        } else if (player.weapon.name === 'Plasma') {
            // Level 3 has infinite batteries - no penalty needed
            if (player.weapon.powerTrackPosition < 7) {
                const batteries = player.inventory.filter(item => item.name === 'Battery').length;
                if (batteries === 0 && player.resources.money < 2) {
                    entries[7] -= 100; // Strong penalty: no batteries AND can't afford to buy
                }
            }
        }
        
        // HP penalty
        if (player.resources.hp / player.maxResources.hp < 0.5) {
            entries[7] -= 3;
        }
        
        // Table-based adjustment using weapon power track
        // Determine which table to use based on weapon power track position
        let forestTableLevel = 1;
        if (player.weapon.powerTrackPosition >= 7) {
            forestTableLevel = 3; // Position 7: use lv3 table
        } else if (player.weapon.powerTrackPosition >= 3) {
            forestTableLevel = 2; // Position 3-6: use lv2 table
        } else {
            forestTableLevel = 1; // Position 1-2: use lv1 table
        }
        
        const forestEntries = this.getTableValue(this.forestTable, player.weapon.currentAttackDice, player.weapon.currentDefenseDice, forestTableLevel);
        entries[7] += forestEntries;
    }
    
    getTableValue(table, attackDice, defenseDice, tableLevel = 1) {
        // Use provided tableLevel (default to 1 if not specified)
        const level = tableLevel;
        const levelTable = table[level];
        if (!levelTable || !levelTable[attackDice]) {
            return 0;
        }
        
        const defenseIndex = Math.min(defenseDice, levelTable[attackDice].length - 1);
        return levelTable[attackDice][defenseIndex] || 0;
    }
    
    selectLocationByProbability(entries) {
        // Calculate total valid entries (ignore negative values)
        let totalEntries = 0;
        const validEntries = {};
        
        for (const [locationId, entryCount] of Object.entries(entries)) {
            if (entryCount > 0) {
                validEntries[locationId] = entryCount;
                totalEntries += entryCount;
            }
        }
        
        if (totalEntries === 0) {
            // Fallback: select any available location
            const availableLocations = Object.keys(entries).filter(id => entries[id] > -95);
            return availableLocations.length > 0 ? parseInt(availableLocations[0]) : 1;
        }
        
        // Select based on probability
        let random = Math.random() * totalEntries;
        for (const [locationId, entryCount] of Object.entries(validEntries)) {
            random -= entryCount;
            if (random <= 0) {
                return parseInt(locationId);
            }
        }
        
        // Fallback
        return parseInt(Object.keys(validEntries)[0]);
    }
    
    getLocationIdByName(locationName) {
        const locationMap = {
            'work site': 1,
            'bar': 2,
            'station': 3,
            'hospital': 4,
            'dojo': 5,
            'plaza': 6,
            'forest': 7
        };
        return locationMap[locationName.toLowerCase()];
    }
    
    calculateUsedCapacity(player) {
        return player.inventory.reduce((total, item) => total + (item.size || 1), 0);
    }
    
    updateRoundsSinceLastPlaza(selectedLocation) {
        if (selectedLocation === 6) { // Plaza
            this.roundsSinceLastPlaza = 0;
        } else {
            this.roundsSinceLastPlaza++;
        }
    }
    
    // Apprentice subsystem: social-aware location selection
    selectApprenticeLocation(gameState, availableLocations, hunterLocation) {
        const entries = {};
        
        // Initialize all available locations (except hunter's location) with 4 base entries
        for (let i = 1; i <= 7; i++) {
            if (i !== hunterLocation && availableLocations.includes(i)) {
                entries[i] = 4;
            } else {
                entries[i] = 0; // Not available or hunter's location
            }
        }
        
        // Apply availability check (-100 for completely unavailable locations)
        for (let locationId = 1; locationId <= 7; locationId++) {
            if (!availableLocations.includes(locationId)) {
                entries[locationId] = -100;
            }
        }
        
        // Check all other players' preferred locations (+2 entries each)
        this.adjustEntriesForOtherPlayersPreferences(entries, gameState);
        
        // Highest score player gets +1 additional entry for their preferred location
        this.adjustEntriesForHighestScorePlayer(entries, gameState);
        
        // Forest coordination logic
        if (hunterLocation === 7 && entries[7] > -95) { // Hunter is in forest
            // Check if any other player has both point token and reward token at same level
            let otherPlayerHasMatchingTokens = false;

            for (let i = 0; i < gameState.players.length; i++) {
                if (i === this.playerId) continue; // Skip self

                const otherPlayer = gameState.players[i];
                const pointLevel = otherPlayer.popularityLevel || 0;
                const rewardLevel = otherPlayer.popularityRewardLevel || 0;

                // Check if this player's point token equals their reward token
                if (pointLevel === rewardLevel) {
                    otherPlayerHasMatchingTokens = true;
                    break;
                }
            }

            // +2 entries if NO other player has matching point/reward tokens
            if (!otherPlayerHasMatchingTokens) {
                entries[7] += 2;
            }
        } else if (hunterLocation !== 7 && entries[7] > -95) { // Hunter is NOT in forest
            entries[7] = -100; // Prevent apprentice from going to forest alone
        }
        
        // Calculate probabilities and select location
        return this.selectLocationByProbability(entries);
    }
    
    adjustEntriesForOtherPlayersPreferences(entries, gameState) {
        // Loop through all players except this bot
        for (let i = 0; i < gameState.players.length; i++) {
            if (i === this.playerId) {
                continue; // Skip self
            }
            
            const otherPlayer = gameState.players[i];
            const otherWeapon = otherPlayer.weapon;
            
            if (otherWeapon && otherWeapon.preferLocation) {
                const preferredLocationName = otherWeapon.preferLocation;
                const preferredLocationId = this.getLocationIdByName(preferredLocationName);
                
                // +2 entries for each other player's preferred location (skip unavailable)
                if (preferredLocationId && entries[preferredLocationId] > -95) {
                    entries[preferredLocationId] += 2;
                }
            }
        }
    }
    
    adjustEntriesForHighestScorePlayer(entries, gameState) {
        // Find the player with the highest score
        let highestScore = -1;
        let highestScorePlayer = null;
        
        for (let i = 0; i < gameState.players.length; i++) {
            if (i === this.playerId) {
                continue; // Skip self
            }
            
            const player = gameState.players[i];
            if (player.score > highestScore) {
                highestScore = player.score;
                highestScorePlayer = player;
            }
        }
        
        // Give +2 additional entry to highest scoring player's preferred location
        if (highestScorePlayer && highestScorePlayer.weapon) {
            const preferredLocationName = highestScorePlayer.weapon.preferLocation;
            const preferredLocationId = this.getLocationIdByName(preferredLocationName);

            if (preferredLocationId && entries[preferredLocationId] > -95) {
                entries[preferredLocationId] += 2;
            }
        }
    }
    
    // Resource Management subsystem
    manageResources(gameState) {
        const player = gameState.players[this.playerId];
        
        // Manage resources in order: Money → EP → HP → EXP
        this.manageMoney(player, gameState);
        this.manageEP(player);
        this.manageHP(player);
        this.manageEXP(player);
    }
    
    manageMoney(player, gameState) {
        let itemPriority = [];
        
        // Weapon-specific item priorities
        if (this.weapon.name === 'Rifle') {
            // Rifle: Bullet highest priority, buy at least 3
            const currentBullets = player.inventory.filter(item => item.name === 'Bullet').length;
            if (currentBullets < 3) {
                // Prioritize bullets until we have at least 3
                itemPriority = [
                    { name: 'Bullet', price: 2, size: 0 },
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            } else {
                // After having 3+ bullets, use normal priority
                itemPriority = [
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Bullet', price: 2, size: 0 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            }
        } else if (this.weapon.name === 'Plasma') {
            // Plasma: Battery highest priority, buy at least 3
            const currentBatteries = player.inventory.filter(item => item.name === 'Battery').length;
            if (currentBatteries < 3) {
                // Prioritize batteries until we have at least 3
                itemPriority = [
                    { name: 'Battery', price: 2, size: 0 }, // Plasma Lv1: batteries cost $2
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            } else {
                // After having 3+ batteries, use normal priority
                itemPriority = [
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Battery', price: 2, size: 0 }, // Plasma Lv1: batteries cost $2
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            }
        } else {
            // Default priority for other weapons
            itemPriority = [
                { name: 'Dynamite', price: 6, size: 4 },
                { name: 'Bomb', price: 4, size: 3 },
                { name: 'Grenade', price: 2, size: 2 },
                { name: 'Fake Blood', price: 2, size: 2 },
                { name: 'Blood Bag', price: 2, size: 1 },
                { name: 'Beer', price: 2, size: 1 }
            ];
        }
        
        // Calculate available capacity
        let availableCapacity = this.weapon.capacity - this.calculateUsedCapacity(player);
        
        // Try to buy items in priority order
        for (const item of itemPriority) {
            // Special handling for Rifle/Plasma minimum requirements
            let shouldBuy = true;
            if (this.weapon.name === 'Rifle' && item.name === 'Bullet') {
                const currentBullets = player.inventory.filter(i => i.name === 'Bullet').length;
                if (currentBullets >= 3 && itemPriority.indexOf(item) === 0) {
                    // Skip buying more bullets if we already have 3+ and this is the priority phase
                    continue;
                }
            } else if (this.weapon.name === 'Plasma' && item.name === 'Battery') {
                const currentBatteries = player.inventory.filter(i => i.name === 'Battery').length;
                if (currentBatteries >= 3 && itemPriority.indexOf(item) === 0) {
                    // Skip buying more batteries if we already have 3+ and this is the priority phase
                    continue;
                }
            }
            
            while (player.resources.money >= item.price && availableCapacity >= item.size && shouldBuy) {
                // Buy the item
                player.resources.money -= item.price;
                player.inventory.push({
                    name: item.name,
                    size: item.size,
                    type: this.getItemType(item.name)
                });
                availableCapacity -= item.size;
                
                console.log(`Bot ${this.playerId + 1} bought ${item.name}`);
                
                // For Rifle/Plasma, stop after reaching minimum requirement in priority phase
                if (this.weapon.name === 'Rifle' && item.name === 'Bullet') {
                    const bulletCount = player.inventory.filter(i => i.name === 'Bullet').length;
                    if (bulletCount >= 3 && itemPriority.indexOf(item) === 0) {
                        break;
                    }
                } else if (this.weapon.name === 'Plasma' && item.name === 'Battery') {
                    const batteryCount = player.inventory.filter(i => i.name === 'Battery').length;
                    if (batteryCount >= 3 && itemPriority.indexOf(item) === 0) {
                        break;
                    }
                }
            }
        }
    }
    
    manageEP(player) {
        const requiredEP = this.getRequiredEP();
        let beerCount = player.resources.beer;
        
        // First priority: recover EP to required level
        const epNeeded = Math.max(0, requiredEP - player.resources.ep);
        const epRecovery = Math.min(epNeeded, Math.min(beerCount, player.maxResources.ep - player.resources.ep));
        
        if (epRecovery > 0) {
            player.resources.ep += epRecovery;
            player.resources.beer -= epRecovery;
            beerCount -= epRecovery;
            console.log(`Bot ${this.playerId + 1} used ${epRecovery} beer to recover EP`);
        }
        
        // Second priority: upgrade EP with remaining beer
        if (beerCount > 0 && player.maxResources.ep < 10) {
            const upgradesNeeded = 4; // 4 beers per EP upgrade
            const possibleUpgrades = Math.floor(beerCount / upgradesNeeded);
            const maxUpgrades = 10 - player.maxResources.ep; // Can't exceed max of 10
            const actualUpgrades = Math.min(possibleUpgrades, maxUpgrades);
            
            if (actualUpgrades > 0) {
                const beersUsed = actualUpgrades * upgradesNeeded;
                player.resources.beer -= beersUsed;
                player.maxResources.ep += actualUpgrades;
                player.resources.ep += actualUpgrades; // Also increase current EP
                console.log(`Bot ${this.playerId + 1} upgraded max EP by ${actualUpgrades}`);
            }
        }
    }
    
    manageHP(player) {
        let bloodBagCount = player.resources.bloodBag;
        
        // First priority: recover HP to maximum
        const hpRecovery = Math.min(bloodBagCount, player.maxResources.hp - player.resources.hp);
        
        if (hpRecovery > 0) {
            player.resources.hp += hpRecovery;
            player.resources.bloodBag -= hpRecovery;
            bloodBagCount -= hpRecovery;
            console.log(`Bot ${this.playerId + 1} used ${hpRecovery} blood bags to recover HP`);
        }
        
        // Second priority: upgrade HP with remaining blood bags
        if (bloodBagCount > 0 && player.maxResources.hp < 10) {
            const upgradesNeeded = 3; // 3 blood bags per HP upgrade
            const possibleUpgrades = Math.floor(bloodBagCount / upgradesNeeded);
            const maxUpgrades = 10 - player.maxResources.hp; // Can't exceed max of 10
            const actualUpgrades = Math.min(possibleUpgrades, maxUpgrades);
            
            if (actualUpgrades > 0) {
                const bloodBagsUsed = actualUpgrades * upgradesNeeded;
                player.resources.bloodBag -= bloodBagsUsed;
                player.maxResources.hp += actualUpgrades;
                player.resources.hp += actualUpgrades; // Also increase current HP
                console.log(`Bot ${this.playerId + 1} upgraded max HP by ${actualUpgrades}`);
            }
        }
    }
    
    manageEXP(player) {
        const attackUpgradeCost = this.weapon.reqExpAttack;
        const defenseUpgradeCost = this.weapon.reqExpDefense;
        
        // Special case: If attack dice is maxed at 7, spend ALL EXP on defense dice
        if (player.weapon.currentAttackDice >= 7) {
            while (player.resources.exp >= defenseUpgradeCost && player.weapon.currentDefenseDice < 6) {
                player.resources.exp -= defenseUpgradeCost;
                player.weapon.currentDefenseDice += 1;
                console.log(`Bot ${this.playerId + 1} upgraded defense dice to ${player.weapon.currentDefenseDice} (attack maxed)`);
            }
            return; // Don't proceed with normal logic
        }
        
        // Normal logic when attack dice is not maxed
        // Determine upgrade choice based on EXP amount and preference flag
        let shouldUpgradeAttack = false;
        
        if (this.preferAttackDiceNext) {
            // Force attack dice upgrade regardless of EXP amount
            shouldUpgradeAttack = true;
            this.preferAttackDiceNext = false; // Reset flag after use
        } else if (player.resources.exp > 3) {
            shouldUpgradeAttack = true;
        } else {
            shouldUpgradeAttack = false;
            this.preferAttackDiceNext = true; // Set flag for next time
        }
        
        if (shouldUpgradeAttack) {
            // Try to upgrade attack dice
            if (player.resources.exp >= attackUpgradeCost && player.weapon.currentAttackDice < 7) {
                player.resources.exp -= attackUpgradeCost;
                player.weapon.currentAttackDice += 1;
                console.log(`Bot ${this.playerId + 1} upgraded attack dice to ${player.weapon.currentAttackDice}`);
            }
        } else {
            // Try to upgrade defense dice
            if (player.resources.exp >= defenseUpgradeCost && player.weapon.currentDefenseDice < 6) {
                player.resources.exp -= defenseUpgradeCost;
                player.weapon.currentDefenseDice += 1;
                console.log(`Bot ${this.playerId + 1} upgraded defense dice to ${player.weapon.currentDefenseDice}`);
            }
        }
    }
    
    // Automatic capacity overflow handling for bots
    handleBotCapacityOverflow(player, game) {
        const getInventorySize = (player) => {
            return player.inventory.reduce((total, item) => total + item.size, 0);
        };
        
        const logActions = [];
        
        // Keep processing until capacity is met
        while (getInventorySize(player) > player.maxInventoryCapacity) {
            let actionTaken = false;
            
            // Priority 1: Use blood bags to recover HP if not at max
            const bloodBags = player.inventory.filter(item => item.name === 'Blood Bag');
            if (bloodBags.length > 0 && player.resources.hp < player.maxResources.hp) {
                const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
                const recoveryAmount = Math.min(1, player.maxResources.hp - player.resources.hp);
                
                player.resources.hp += recoveryAmount;
                player.inventory.splice(bloodBagIndex, 1);
                player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                
                logActions.push(t('botAction.usedBloodBag', recoveryAmount));
                actionTaken = true;
                continue;
            }

            // Priority 2: Use beer to recover EP if not at max
            const beers = player.inventory.filter(item => item.name === 'Beer');
            if (beers.length > 0 && player.resources.ep < player.maxResources.ep) {
                const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                const recoveryAmount = Math.min(1, player.maxResources.ep - player.resources.ep);

                player.resources.ep += recoveryAmount;
                player.inventory.splice(beerIndex, 1);
                player.resources.beer = Math.max(0, player.resources.beer - 1);

                logActions.push(t('botAction.usedBeer', recoveryAmount));
                actionTaken = true;
                continue;
            }
            
            // Priority 3: Upgrade HP with blood bags (need 3 for upgrade)
            const bloodBagsForUpgrade = player.inventory.filter(item => item.name === 'Blood Bag');
            if (bloodBagsForUpgrade.length >= 3 && player.maxResources.hp < 10) {
                // Remove 3 blood bags
                for (let i = 0; i < 3; i++) {
                    const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
                    player.inventory.splice(bloodBagIndex, 1);
                    player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                }
                
                // Upgrade HP
                player.maxResources.hp++;
                player.resources.hp++; // Also increase current HP
                
                // Check for milestone bonuses
                const hpMilestones = [
                    { value: 6, points: 2, key: 'hp6' },
                    { value: 8, points: 3, key: 'hp8' },
                    { value: 10, points: 4, key: 'hp10' }
                ];
                let milestoneAwarded = false;
                for (const m of hpMilestones) {
                    if (player.maxResources.hp === m.value) {
                        if (game.checkAndAwardMilestone(player, 'hp', m.value, m.points, m.key)) {
                            logActions.push(t('botAction.upgradedHpMilestone', player.maxResources.hp, m.points));
                            milestoneAwarded = true;
                        }
                        break;
                    }
                }
                if (!milestoneAwarded) {
                    logActions.push(t('botAction.upgradedHp', player.maxResources.hp));
                }
                
                actionTaken = true;
                continue;
            }
            
            // Priority 4: Upgrade EP with beer (need 4 for upgrade)
            const beersForUpgrade = player.inventory.filter(item => item.name === 'Beer');
            if (beersForUpgrade.length >= 4 && player.maxResources.ep < 10) {
                // Remove 4 beers
                for (let i = 0; i < 4; i++) {
                    const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                    player.inventory.splice(beerIndex, 1);
                    player.resources.beer = Math.max(0, player.resources.beer - 1);
                }
                
                // Upgrade EP
                player.maxResources.ep++;
                player.resources.ep++; // Also increase current EP
                
                // Check for milestone bonuses
                if (player.maxResources.ep === 8 && !player.milestones.ep8) {
                    game.addScore(player.id, 2, 'milestone');
                    player.milestones.ep8 = true;
                    if (!game.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-8`);
                        if (checkbox) checkbox.checked = true;
                    }
                    logActions.push(t('botAction.upgradedEpMilestone', player.maxResources.ep, 2));
                } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                    game.addScore(player.id, 4, 'milestone');
                    player.milestones.ep10 = true;
                    if (!game.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    logActions.push(t('botAction.upgradedEpMilestone', player.maxResources.ep, 4));
                } else {
                    logActions.push(t('botAction.upgradedEp', player.maxResources.ep));
                }
                
                actionTaken = true;
                continue;
            }
            
            // Priority 5: Discard items (last resort) - prioritize largest items first
            if (!actionTaken) {
                // Find the largest item that's not essential (combat items last)
                let itemToDiscard = null;
                let maxSize = 0;
                let discardIndex = -1;
                
                for (let i = 0; i < player.inventory.length; i++) {
                    const item = player.inventory[i];
                    // Prioritize non-combat items for discard
                    if ((item.name === 'Beer' || item.name === 'Blood Bag') && item.size >= maxSize) {
                        itemToDiscard = item;
                        maxSize = item.size;
                        discardIndex = i;
                    }
                }
                
                // If no beer/blood bags, discard any item
                if (!itemToDiscard && player.inventory.length > 0) {
                    for (let i = 0; i < player.inventory.length; i++) {
                        const item = player.inventory[i];
                        if (item.size >= maxSize) {
                            itemToDiscard = item;
                            maxSize = item.size;
                            discardIndex = i;
                        }
                    }
                }
                
                if (itemToDiscard && discardIndex >= 0) {
                    player.inventory.splice(discardIndex, 1);
                    
                    // Update resource counts if applicable
                    if (itemToDiscard.name === 'Beer') {
                        player.resources.beer = Math.max(0, player.resources.beer - 1);
                    } else if (itemToDiscard.name === 'Blood Bag') {
                        player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                    }
                    
                    logActions.push(t('botAction.discarded', game.getItemDisplayName(itemToDiscard.name)));
                    actionTaken = true;
                }
            }
            
            // Safety break - if no action could be taken, break to prevent infinite loop
            if (!actionTaken) {
                console.warn(`Bot ${player.name} couldn't resolve capacity overflow automatically`);
                break;
            }
        }
        
        // Log all actions taken
        if (logActions.length > 0) {
            const actionsList = logActions.join(', ');
            game.addLogEntryT('log.botCapacityOverflow', [player, actionsList], 'system', player);
        }
        
        return logActions.length > 0;
    }
    
    getItemType(itemName) {
        const combatItems = ['Grenade', 'Bomb', 'Dynamite'];
        const resourceItems = ['Beer', 'Blood Bag'];
        const specialItems = ['Fake Blood'];
        const ammoItems = ['Bullet', 'Battery'];
        
        if (combatItems.includes(itemName)) return 'combat';
        if (resourceItems.includes(itemName)) return 'resource';
        if (specialItems.includes(itemName)) return 'special';
        if (ammoItems.includes(itemName)) return 'ammo';
        return 'unknown';
    }
    
    // Battle Management subsystem
    manageBattle(gameState, monster) {
        const player = gameState.players[this.playerId];
        
        console.log(`Bot ${this.playerId + 1} entering battle with ${monster.name} (HP: ${monster.hp})`);
        
        // Select and bring pet if using Chain/Whip
        let selectedPet = null;
        if (this.weapon.name === 'Chain' || this.weapon.name === 'Whip') {
            selectedPet = this.selectPet(player);
            if (selectedPet) {
                console.log(`Bot ${this.playerId + 1} brought pet: ${selectedPet.name} (Damage: ${selectedPet.damage})`);
            }
        }
        
        // Calculate sure damage at battle start
        let sureDamage = this.calculateSureDamage(player);
        
        // Pre-battle: use items if sure damage >= monster HP
        if (sureDamage >= monster.hp) {
            this.useCombatItems(player, monster, sureDamage);
            this.useAllFakeBlood(player);
            return { victory: true, usedItems: true };
        }
        
        return {
            victory: false,
            usedItems: false,
            selectedPet: selectedPet,
            sureDamage: sureDamage
        };
    }
    
    // Called after each player attack to check if items can finish the monster
    checkPostAttackItems(gameState, monster) {
        const player = gameState.players[this.playerId];
        let sureDamage = this.calculateSureDamage(player);
        
        if (sureDamage >= monster.hp) {
            // Try taming first if using Chain/Whip
            if ((this.weapon.name === 'Chain' || this.weapon.name === 'Whip') && this.canTameMonster(monster)) {
                if (this.attemptTaming(player, monster)) {
                    this.useAllFakeBlood(player);
                    return { tamed: true, usedItems: true };
                }
            }
            
            // If taming failed or not applicable, use items to kill
            this.useCombatItems(player, monster, sureDamage);
            this.useAllFakeBlood(player);
            return { victory: true, usedItems: true };
        }
        
        return { victory: false, usedItems: false };
    }
    
    calculateSureDamage(player) {
        const grenades = player.inventory.filter(item => item.name === 'Grenade').length;
        const bombs = player.inventory.filter(item => item.name === 'Bomb').length;
        const dynamites = player.inventory.filter(item => item.name === 'Dynamite').length;
        
        return grenades * 1 + bombs * 2 + dynamites * 3;
    }
    
    useCombatItems(player, monster, sureDamage) {
        let remainingHP = monster.hp;
        let itemsUsed = [];
        
        // Use minimal items to avoid waste
        // Start with most efficient items (highest damage first)
        
        // Use dynamites first (3 damage each)
        const dynamites = player.inventory.filter(item => item.name === 'Dynamite').length;
        const dynamitesToUse = Math.min(dynamites, Math.ceil(remainingHP / 3));
        
        for (let i = 0; i < dynamitesToUse && remainingHP > 0; i++) {
            const itemIndex = player.inventory.findIndex(item => item.name === 'Dynamite');
            if (itemIndex >= 0) {
                player.inventory.splice(itemIndex, 1);
                remainingHP -= 3;
                itemsUsed.push('Dynamite');
            }
        }
        
        // Use bombs next (2 damage each)
        if (remainingHP > 0) {
            const bombs = player.inventory.filter(item => item.name === 'Bomb').length;
            const bombsToUse = Math.min(bombs, Math.ceil(remainingHP / 2));
            
            for (let i = 0; i < bombsToUse && remainingHP > 0; i++) {
                const itemIndex = player.inventory.findIndex(item => item.name === 'Bomb');
                if (itemIndex >= 0) {
                    player.inventory.splice(itemIndex, 1);
                    remainingHP -= 2;
                    itemsUsed.push('Bomb');
                }
            }
        }
        
        // Use grenades last (1 damage each)
        if (remainingHP > 0) {
            const grenades = player.inventory.filter(item => item.name === 'Grenade').length;
            const grenadesToUse = Math.min(grenades, remainingHP);
            
            for (let i = 0; i < grenadesToUse && remainingHP > 0; i++) {
                const itemIndex = player.inventory.findIndex(item => item.name === 'Grenade');
                if (itemIndex >= 0) {
                    player.inventory.splice(itemIndex, 1);
                    remainingHP -= 1;
                    itemsUsed.push('Grenade');
                }
            }
        }
        
        monster.hp = Math.max(0, remainingHP);
        
        if (itemsUsed.length > 0) {
            console.log(`Bot ${this.playerId + 1} used items: ${itemsUsed.join(', ')} - Monster HP now: ${monster.hp}`);
        }
    }
    
    useAllFakeBlood(player) {
        const fakeBloodItems = player.inventory.filter(item => item.name === 'Fake Blood');
        
        if (fakeBloodItems.length > 0) {
            // Remove all fake blood items from inventory
            player.inventory = player.inventory.filter(item => item.name !== 'Fake Blood');
            console.log(`Bot ${this.playerId + 1} used ${fakeBloodItems.length} Fake Blood for bonus points`);
        }
    }
    
    canTameMonster(monster) {
        // Chain weapon can tame monsters with HP <= 3
        if (this.weapon.name === 'Chain') {
            return monster.hp <= 3;
        }
        
        // Whip weapon has different taming rules (if applicable)
        if (this.weapon.name === 'Whip') {
            return monster.hp <= 3; // Assuming similar rule
        }
        
        return false;
    }
    
    attemptTaming(player, monster) {
        if (this.canTameMonster(monster)) {
            // Add monster as pet (simplified - actual implementation may vary)
            console.log(`Bot ${this.playerId + 1} tamed ${monster.name}!`);
            
            // Add to pets collection (assuming player has pets array)
            if (!player.pets) {
                player.pets = [];
            }
            
            player.pets.push({
                name: monster.name,
                damage: monster.att,
                hp: monster.hp,
                level: monster.level
            });
            
            return true;
        }
        
        return false;
    }
    
    selectPet(player) {
        if (!player.pets || player.pets.length === 0) {
            return null;
        }
        
        // Select pet with highest damage
        let bestPet = null;
        let highestDamage = 0;
        
        for (const pet of player.pets) {
            if (pet.damage > highestDamage) {
                highestDamage = pet.damage;
                bestPet = pet;
            }
        }
        
        return bestPet;
    }
}

class Game {
    constructor() {
        this.weapons = [
            { name: 'Bat', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 3, 
              lv1Power: '徒弟在資源區域撞其他獵人+1區域資源', lv2Power: '回合開始+1ep或+1hp', lv3Power: '命中的骰子再骰1次，傷害為所有傷害加總', preferLocation: 'plaza' },
            { name: 'Katana', reqExpAttack: 5, reqExpDefense: 3, capacity: 4, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 1, 1, 1, 1], priority: 8,
              lv1Power: '無', lv2Power: '單獨存在區域+2經驗', lv3Power: '攻擊骰總點數大於27則一擊必殺', preferLocation: 'dojo' },
            { name: 'Rifle', reqExpAttack: 6, reqExpDefense: 3, capacity: 8, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 2, 2], priority: 10,
              lv1Power: '可購買子彈:2$，每次戰鬥花費1子彈', lv2Power: '回合開始+2$', lv3Power: '商店價格-1$', preferLocation: 'work site' },
            { name: 'Plasma', reqExpAttack: 7, reqExpDefense: 3, capacity: 8, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 2, 2, 2], priority: 11,
              lv1Power: '可購買電池:2$，每次戰鬥花費1電池', lv2Power: '回合開始+2$', lv3Power: '回合開始+2exp', preferLocation: 'work site' },
            { name: 'Chain', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 6,
              lv1Power: '怪獸於血量3以下即可收服', lv2Power: '回合開始+2啤酒', lv3Power: '寵物攻擊x2', preferLocation: 'bar' },
            { name: 'Axe', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 4,
              lv1Power: '玩家受傷時反擊怪獸受1點傷害(受傷時獲得經驗-1)', lv2Power: '回合開始+1血袋', lv3Power: '玩家受傷時反擊怪獸受一樣的傷害', preferLocation: 'hospital' },
            { name: 'Whip', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 5,
              lv1Power: '寵物和收服怪獸體力-1', lv2Power: '回合開始+2啤酒', lv3Power: '寵物和收服不耗體力', preferLocation: 'bar' },
            { name: 'Bow', reqExpAttack: 5, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 0, 3], priority: 1,
              lv1Power: '閃避率+16%', lv2Power: '單獨存在區域+2經驗', lv3Power: '傷害x2', preferLocation: 'plaza' },
            { name: 'Sword', reqExpAttack: 5, reqExpDefense: 3, capacity: 4, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 2], priority: 9,
              lv1Power: '無', lv2Power: '單獨存在區域+2經驗', lv3Power: '打敗怪獸+X分(X=怪獸等級)', preferLocation: 'dojo' },
            { name: 'Knife', reqExpAttack: 3, reqExpDefense: 3, capacity: 10, initialMoney: 8, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 2,
              lv1Power: '打敗怪獸資源x2', lv2Power: '單獨存在區域+2分', lv3Power: '可將一次的攻擊力x2', preferLocation: 'plaza' },
            { name: 'Gloves', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 7,
              lv1Power: '基礎攻擊力=1，當hp少於一半時攻擊力+1', lv2Power: '回合開始+1血袋', lv3Power: '每次遭受攻擊而扣血，攻擊力+1', preferLocation: 'hospital' }
        ];
        
        this.locations = [
            { id: 1, name: 'Work Site', resource: 'money', rewards: [6, 4] }, // Will be updated based on player count
            { id: 2, name: 'Bar', resource: 'beer', rewards: [6, 4] }, // Will be updated based on player count
            { id: 3, name: 'Station', resource: null, rewards: [] },
            { id: 4, name: 'Hospital', resource: 'bloodBag', rewards: [4, 2] }, // Will be updated based on player count
            { id: 5, name: 'Dojo', resource: 'exp', rewards: [4, 2] }, // Will be updated based on player count
            { id: 6, name: 'Plaza', resource: 'score', rewards: [4, 2] }, // Will be updated based on player count
            { id: 7, name: 'Forest', resource: null, rewards: [] }
        ];
        // Initialize game properties (will be set up when player count is selected)
        this.playerCount = 0;
        this.players = [];
        this.playerColors = null;
        this.dummyTokens = [];
        this.currentPlayerIndex = 0;
        this.currentRound = 1;
        this.roundPhase = 'setup'; // 'setup', 'selection', 'distribution', 'station', 'store', 'battle', 'nextround'
        this.gameMode = null; // 'simultaneous' or 'turnbased' or 'online'
        this.playerCompletionStatus = {}; // Track which players have completed current phase
        this.suppressAlerts = false; // Suppress alerts when processing remote player actions
        this.storePhaseCompleted = false; // Prevent duplicate store completion checks
        this.stationChoices = {}; // Store station choices for each player
        this.pendingStationPlayer = null; // Track which player needs to choose
        this.stationTotalCount = 0; // Track total count at station
        this.monsters = this.loadMonsters(); // Load monster data
        this.currentBattle = null; // Track ongoing monster battle
        this.boardsCollapsed = false; // Track collapsed/expanded state of player boards

        // Monster selection system
        this.defeatedMonsters = new Set(); // Track defeated monster IDs
        this.currentSelectedMonster = null; // Current monster shown to player
        this.monsterSelectionEPSpent = 0; // Track EP spent on changing monsters
        this.playerShownMonsters = {}; // Track shown monsters per player during current selection

        // Monster effect system
        this.activeMonsterEffects = []; // Track all active effects in the round
        this.currentMonsterEffect = null; // Track the selected monster's effect
        this.roundEffectsApplied = false; // Track if round-wide effects have been applied
        this.forestPlayersThisRound = new Set(); // Track which players are in forest this round
        this.storeItems = this.loadStoreItems(); // Load store items
        this.currentStorePlayer = null; // Track current shopping player
        this.bots = []; // Array to hold bot instances
        this.botCount = 0; // Number of bots in the game
        
        // Selection phase batching
        this.pendingSelectionLogs = []; // Store selection messages to display after all players select
        
        // Data collection and automation properties
        this.isAutomatedMode = false; // Flag for automated game running
        this.isDataCollectionMode = false; // Flag for data collection mode
        this.collectedGameData = []; // Store all collected game data
        this.currentGameId = null; // Track current game ID
        this.automatedGamesTotal = 0; // Total games to run
        this.automatedGamesCompleted = 0; // Games completed so far
        this.automatedPlayerCount = 2; // Player count for automated games
        
        // Online multiplayer properties
        this.isOnlineMode = false;
        this.isHost = false;
        this.localPlayerId = null; // Which player ID this client controls
        this.onlineManager = null;
        this.lastAppliedStateVersion = 0;
        this.guestBattleActionQueue = []; // Queue of guest battle actions to process
        this.waitingForGuestAction = false; // Whether host is waiting for guest input
        this.onlineBattleState = null; // Battle state synced to Firebase
        this.guestBattleEnding = false; // Guard: true while guest sees victory/defeat for 3s

        // Chat properties
        this.pendingTacticsMessage = null;
        this.cannedMessages = [
            ['你好', '這個真難抉擇', '這真是場精彩的比賽', '我要去__，誰都別想跟我搶', '工地'],
            ['來個精彩的對決吧', '這隻怪獸真難纏', '看來我今天的運氣比較好', '小心！有人要去__', '酒吧'],
            ['請多多指教', '被你猜到了，真厲害', '比分差距不大，真是驚險', '這輪__變得很誘人耶', '車站'],
            ['我是新手，請鞭小力一點', '讓我領先一下', '不好意思贏太多', '看起來你很想去__，嘿嘿', '醫院'],
            ['好久不見', '看起來還有機會', '謝謝', '大家快去圍堵他，衝向__', '道場'],
            ['', '大夥進攻囉', '好玩，要不要再一場？', '該不會你想去__吧？', '廣場'],
            ['', '', '', '看來我們都很想去__，要不輪流一下', '森林'],
            ['', '', '', '各位高抬貴手，讓去__一次拜託', ''],
        ];
        this.cannedTabNames = ['問候語', '比賽中', '結語', '戰術', '地點'];

        // Phase timer properties (online mode only)
        this.phaseTimeLimit = 60; // seconds, default 1 min
        this.phaseTimers = {}; // map of playerId -> { remaining, intervalId, running }
        this.phaseTimersPaused = false; // true during kick vote
        this.kickVote = null; // current vote state
        this.expiredTimerPlayers = []; // accumulates players whose timer hits 0
        this.expiredTimerDebounce = null; // debounce timeout for bundled expiry

        // Solo play mode configuration
        this.soloModeSlots = [
            { type: 'player', active: true, color: 'random', weapon: 'random' },
            { type: 'closed', active: false, color: 'random', weapon: 'random' },
            { type: 'closed', active: false, color: 'random', weapon: 'random' },
            { type: 'closed', active: false, color: 'random', weapon: 'random' }
        ];
        
        this.showMainMenu();
    }
    
    showMainMenu() {
        // Hide all screens
        const selectionScreen = document.getElementById('player-count-selection');
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');
        const gameLog = document.getElementById('game-log-section');
        
        if (selectionScreen) selectionScreen.style.display = 'none';
        if (playerBoards) playerBoards.style.display = 'none';
        if (gameBoard) gameBoard.style.display = 'none';
        if (playerArea) playerArea.style.display = 'none';
        if (gameStatus) gameStatus.style.display = 'none';
        if (gameLog) gameLog.style.display = 'none';
        
        // Show main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'flex';

        // Apply translations to static DOM (handles both first load and language switches)
        const self = this;
        if (window.i18n && typeof window.i18n.onReady === 'function') {
            window.i18n.onReady(function () {
                self.applyTranslationsToDOM();
            });
        }
    }

    showLocalPlay() {
        // Hide main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'none';

        // Show player configuration screen
        this.showPlayerCountSelection();
        this.applyTranslationsToDOM();
    }

    showOnlinePlay() {
        // Hide main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'none';

        // Show online lobby
        const lobby = document.getElementById('online-lobby');
        if (lobby) lobby.style.display = 'flex';

        // Show the online menu (create/join choice)
        this.showOnlineMenu();
        this.applyTranslationsToDOM();
    }

    showOnlineMenu() {
        document.getElementById('online-menu').style.display = 'block';
        document.getElementById('create-room-view').style.display = 'none';
        document.getElementById('join-room-view').style.display = 'none';
        document.getElementById('waiting-room-host').style.display = 'none';
        document.getElementById('waiting-room-guest').style.display = 'none';
    }

    backFromOnlineLobby() {
        document.getElementById('online-lobby').style.display = 'none';
        this.showMainMenu();
    }

    backToOnlineMenu() {
        this.showOnlineMenu();
    }

    showCreateRoom() {
        document.getElementById('online-menu').style.display = 'none';
        document.getElementById('create-room-view').style.display = 'block';
    }

    showJoinRoom() {
        document.getElementById('online-menu').style.display = 'none';
        document.getElementById('join-room-view').style.display = 'block';
        document.getElementById('join-error').style.display = 'none';
    }

    updateHumanPlayerOptions() {
        const totalCount = parseInt(document.getElementById('online-player-count').value);
        const humanSelect = document.getElementById('online-human-count');
        const currentHuman = parseInt(humanSelect.value);

        humanSelect.innerHTML = '';
        for (let i = 2; i <= totalCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === Math.min(currentHuman, totalCount)) option.selected = true;
            humanSelect.appendChild(option);
        }
    }

    async createOnlineRoom() {
        const playerCount = parseInt(document.getElementById('online-player-count').value);
        const maxHumans = playerCount; // All slots open for human players

        // Read phase time limit setting
        this.phaseTimeLimit = parseInt(document.getElementById('online-phase-timer').value);

        // Initialize OnlineManager
        this.onlineManager = new OnlineManager();
        this.isOnlineMode = true;
        this.isHost = true;
        this.onlinePlayerCount = playerCount;

        try {
            const roomCode = await this.onlineManager.createRoom(playerCount, maxHumans);

            // Store phase time limit in room data
            this.onlineManager.roomRef.child('phaseTimeLimit').set(this.phaseTimeLimit);

            // Show waiting room
            document.getElementById('create-room-view').style.display = 'none';
            document.getElementById('waiting-room-host').style.display = 'block';
            document.getElementById('room-code-display').textContent = roomCode;
            document.getElementById('host-guest-joined').style.display = 'none';
            document.getElementById('waiting-status-text').textContent = t('lobby.waiting.spinner');

            // Update player count display
            document.getElementById('human-count').textContent = '1';
            document.getElementById('human-total').textContent = playerCount;
            this.updateWaitingRoomComposition(1, playerCount);

            // Build dynamic player slot list (all slots open)
            this.buildWaitingRoomSlots(playerCount);

            // Build preference UI for host
            this.buildOnlinePreferenceUI('host');

            // Listen for players to join
            this.onlineManager.listenForPlayers((players) => {
                const connectedCount = Object.keys(players).length;
                console.log(`Players connected: ${connectedCount}/${playerCount}`);

                document.getElementById('human-count').textContent = connectedCount;
                this.updateWaitingRoomComposition(connectedCount, playerCount);

                // Update slot list with player names and picks
                this.updateWaitingRoomSlots(players, 'player-slot-list', playerCount);

                // Refresh preference dropdowns to disable taken options
                this.refreshOnlinePreferenceDropdowns(players, 'host');

                // Show Start button once at least 1 guest has joined
                if (connectedCount >= 2) {
                    if (connectedCount >= playerCount) {
                        document.getElementById('waiting-status-text').textContent = t('online.allConnected');
                        document.querySelector('#waiting-room-host .waiting-status').style.display = 'none';
                    } else {
                        const remaining = playerCount - connectedCount;
                        document.getElementById('waiting-status-text').textContent =
                            t('lobby.composition.waitingMore', remaining, remaining > 1 ? 's' : '');
                    }
                    document.getElementById('host-guest-joined').style.display = 'block';

                    // Check if all players are ready
                    const allReady = Object.values(players).every(p => p.isReady === true);
                    const startBtn = document.querySelector('#host-guest-joined .ready-btn');
                    if (startBtn) {
                        startBtn.disabled = !allReady;
                    }
                    const readyCount = Object.values(players).filter(p => p.isReady === true).length;
                    const totalCount = Object.keys(players).length;
                    if (allReady) {
                        document.getElementById('guest-joined-text').textContent =
                            connectedCount >= playerCount ? t('lobby.composition.allConnected') : t('lobby.composition.connectedHumans', connectedCount);
                    } else {
                        document.getElementById('guest-joined-text').textContent =
                            t('lobby.composition.waitingReady', readyCount, totalCount);
                    }
                } else {
                    document.getElementById('waiting-status-text').textContent = t('lobby.waiting.spinner');
                    document.getElementById('host-guest-joined').style.display = 'none';
                    document.querySelector('#waiting-room-host .waiting-status').style.display = 'flex';
                }
            });

            // Set up disconnect handlers
            this.setupOnlineDisconnectHandlers();

        } catch (error) {
            console.error('Error creating room:', error);
            alert(t('alert.failCreateRoom'));
            this.isOnlineMode = false;
            this.onlineManager = null;
        }
    }

    buildWaitingRoomSlots(playerCount) {
        const slotList = document.getElementById('player-slot-list');
        slotList.innerHTML = '';
        for (let i = 0; i < playerCount; i++) {
            const li = document.createElement('li');
            li.className = i === 0 ? 'player-slot connected' : 'player-slot pending';
            const label = i === 0 ? 'Host (you)' : `Slot ${i + 1} (open)`;
            const icon = i === 0 ? '&#x2705;' : '&#x23F3;';
            li.innerHTML = `${label} <span class="slot-status">${icon}</span>`;
            slotList.appendChild(li);
        }
    }

    updateWaitingRoomComposition(connectedCount, playerCount) {
        const botCount = playerCount - connectedCount;
        let text;
        if (botCount > 0) {
            text = t('lobby.composition.mixed', connectedCount, botCount, playerCount);
        } else {
            text = t('lobby.composition.allHumans', connectedCount, playerCount);
        }
        document.getElementById('game-composition').textContent = text;
    }

    copyRoomCode() {
        const code = document.getElementById('room-code-display').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.querySelector('.copy-code-btn');
            btn.textContent = t('lobby.waiting.copied');
            setTimeout(() => { btn.textContent = t('lobby.waiting.copyCode'); }, 2000);
        });
    }

    async joinOnlineRoom() {
        const codeInput = document.getElementById('room-code-input');
        const code = codeInput.value.trim().toUpperCase();
        const errorEl = document.getElementById('join-error');

        if (code.length !== 4) {
            errorEl.textContent = t('alert.invalidRoomCode');
            errorEl.style.display = 'block';
            return;
        }

        // Initialize OnlineManager
        this.onlineManager = new OnlineManager();
        this.isOnlineMode = true;
        this.isHost = false;

        try {
            const room = await this.onlineManager.joinRoom(code);

            // Read phase time limit from room data
            if (room.phaseTimeLimit !== undefined && room.phaseTimeLimit !== null) {
                this.phaseTimeLimit = room.phaseTimeLimit;
            }

            // Show guest waiting room
            document.getElementById('join-room-view').style.display = 'none';
            document.getElementById('waiting-room-guest').style.display = 'block';
            document.getElementById('guest-room-code').textContent = code;

            // Set player count display
            const totalPlayers = room.playerCount || 2;
            document.getElementById('guest-human-total').textContent = totalPlayers;

            // Build preference UI for guest
            this.buildOnlinePreferenceUI('guest');

            // Listen for players to update guest slot list and preferences
            this.onlineManager.listenForPlayers((players) => {
                const connectedCount = Object.keys(players).length;
                document.getElementById('guest-human-count').textContent = connectedCount;
                this.updateWaitingRoomSlots(players, 'guest-player-slot-list', totalPlayers);
                this.refreshOnlinePreferenceDropdowns(players, 'guest');
            });

            // Listen for game start
            this.onlineManager.listenForGameStart(() => {
                console.log('Game started by host!');
                // Listen for config first, then game state
                this.onlineManager.listenForConfig((config) => {
                    if (config && config.weapons) {
                        this.initOnlineGameAsGuest(config);
                    }
                });
            });

            // Set up disconnect handlers
            this.setupOnlineDisconnectHandlers();

        } catch (error) {
            console.error('Error joining room:', error);
            errorEl.textContent = error.message || 'Failed to join room.';
            errorEl.style.display = 'block';
            this.isOnlineMode = false;
            this.onlineManager = null;
        }
    }

    async cancelOnlineRoom() {
        if (this.onlineManager) {
            await this.onlineManager.deleteRoom();
            this.onlineManager = null;
        }
        this.isOnlineMode = false;
        this.isHost = false;
        this.showOnlineMenu();
    }

    async leaveOnlineRoom() {
        if (this.onlineManager) {
            this.onlineManager.cleanup();
            // Remove self from room's player list
            if (this.onlineManager.roomRef) {
                await this.onlineManager.roomRef.child(`players/${this.onlineManager.localId}`).remove();
            }
            this.onlineManager = null;
        }
        this.isOnlineMode = false;
        this.showOnlineMenu();
    }

    setupOnlineDisconnectHandlers() {
        if (!this.onlineManager) return;

        this.onlineManager.onConnectionWarning = (playerId) => {
            const bar = document.getElementById('online-connection-bar');
            if (bar) {
                bar.className = 'online-connection-bar warning';
                document.getElementById('connection-status-text').textContent =
                    `Warning: A player may be disconnecting...`;
            }
        };

        this.onlineManager.onPlayerDisconnected = (disconnectedFirebaseId) => {
            // Find which game player this Firebase ID maps to
            // If the player was already kicked (converted to bot), ignore the disconnect
            const gamePlayerId = this.onlinePlayerMap ? this.onlinePlayerMap[disconnectedFirebaseId] : undefined;
            if (gamePlayerId !== undefined) {
                const player = this.players.find(p => p.id === gamePlayerId);
                if (player && player.isBot) {
                    // Player was already kicked and replaced by bot — ignore disconnect
                    console.log(`Ignoring disconnect for kicked player ${player.name} (now bot)`);
                    return;
                }
            }
            const modal = document.getElementById('disconnect-modal');
            if (modal) {
                document.getElementById('disconnect-message').textContent =
                    `A player has disconnected. The game cannot continue.`;
                modal.style.display = 'flex';
            }
        };
    }

    handleDisconnectAcknowledge() {
        document.getElementById('disconnect-modal').style.display = 'none';
        document.getElementById('online-connection-bar').style.display = 'none';
        if (this.onlineManager) {
            this.onlineManager.cleanup();
            this.onlineManager = null;
        }
        this.isOnlineMode = false;
        this.isHost = false;

        // Reset and go back to main menu
        this.exitToMainMenu();
    }

    showOnlineConnectionBar() {
        const bar = document.getElementById('online-connection-bar');
        if (bar) {
            bar.style.display = 'flex';
            bar.className = 'online-connection-bar';
            document.getElementById('connection-status-text').textContent = t('connection.connected');
            document.getElementById('connection-role-text').textContent =
                this.isHost ? 'Host' : 'Guest';
        }
    }

    // ==================== ONLINE GAME INITIALIZATION ====================

    async startOnlineGame() {
        // Host starts the game - configure weapons, slots, etc.
        const playerCount = this.onlinePlayerCount || parseInt(document.getElementById('online-player-count').value);

        // Get connected players and assign slots by join order
        const snapshot = await this.onlineManager.roomRef.child('players').once('value');
        const players = snapshot.val();
        const sortedPlayers = Object.entries(players).sort((a, b) => a[1].joinOrder - b[1].joinOrder);
        const humanPlayerCount = sortedPlayers.length;

        // Build preferences map from player data: { slotIndex: { color, weapon } }
        const preferences = {};
        const humanSlots = {};
        sortedPlayers.forEach(([playerId, data], index) => {
            humanSlots[playerId] = index;
            preferences[index] = {
                color: data.preferredColor || 'random',
                weapon: data.preferredWeapon || 'random'
            };
        });

        // Resolve weapons and colors respecting preferences
        const assignedWeapons = this.resolveOnlineWeapons(playerCount, preferences);
        this.playerColors = this.resolveOnlineColors(playerCount, preferences);

        // Build player names map from preferences
        const playerNames = {};
        sortedPlayers.forEach(([playerId, data], index) => {
            playerNames[playerId] = data.preferredName || (index === 0 ? 'Host' : `Player ${index + 1}`);
        });

        // Build config to share with all players
        const config = {
            humanSlots: humanSlots,
            playerCount: playerCount,
            humanPlayerCount: humanPlayerCount,
            weapons: assignedWeapons.map(w => this.weapons.findIndex(ww => ww.name === w.name)),
            colors: this.playerColors,
            playerNames: playerNames
        };

        await this.onlineManager.setConfig(config);
        await this.onlineManager.startGame();

        // Initialize game locally as host
        this.initOnlineGameAsHost(config, assignedWeapons);
    }

    initOnlineGameAsHost(config, assignedWeapons) {
        this.localPlayerId = config.humanSlots[this.onlineManager.localId];
        this.currentPlayerIndex = this.localPlayerId;
        // Map Firebase IDs → game player IDs (used to identify kicked players on disconnect)
        this.onlinePlayerMap = { ...config.humanSlots };

        // Hide lobby, show game
        document.getElementById('online-lobby').style.display = 'none';
        this.showOnlineConnectionBar();

        // Initialize game
        this.playerCount = config.playerCount;
        this.showGameLog();
        this.addLogEntryT('log.onlineGameStarted', [config.playerCount], 'round-start');
        this.addLogEntryT('log.roundStarted', [this.currentRound || 1], 'round-start');

        this.updateLocationRewards();
        this.setupDummyTokens(config.playerCount);

        // Create players: human slots from config, rest are bots
        const humanSlotSet = new Set(Object.values(config.humanSlots));
        const slotTypes = [];
        for (let i = 0; i < config.playerCount; i++) {
            slotTypes.push(humanSlotSet.has(i) ? 'player' : 'bot');
        }

        const botConfiguration = {
            humanPlayers: config.humanPlayerCount,
            botCount: config.playerCount - config.humanPlayerCount,
            slotTypes: slotTypes
        };

        this.createPlayers(config.playerCount, assignedWeapons, botConfiguration);

        // Override names for online human players
        for (const [playerId, slot] of Object.entries(config.humanSlots)) {
            this.players[slot].name = config.playerNames[playerId];
        }

        // Set game mode to 'online'
        this.gameMode = 'online';

        // Show game UI
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');

        if (playerBoards) playerBoards.style.display = 'grid';
        if (gameBoard) gameBoard.style.display = 'grid';
        if (playerArea) playerArea.style.display = 'block';
        if (gameStatus) gameStatus.style.display = 'block';

        this.createPlayerBoards();
        const playerBoardsContainer = document.getElementById('player-boards-container');
        playerBoardsContainer.className = `player-boards players-${config.playerCount}`;

        this.roundPhase = 'selection';
        this.pendingSelectionLogs = [];
        this.playerCompletionStatus = {};
        this.players.forEach(player => {
            this.playerCompletionStatus[player.id] = false;
        });

        this.init();
        this.updateLocationDisplays();

        // Listen for guest actions
        this.onlineManager.listenForActions((action) => {
            this.handleGuestAction(action);
        });

        // Initialize chat
        this.initChat();

        // Start selection phase - host sees cards, bots select instantly
        this.startOnlineSelectionPhase();
    }

    initOnlineGameAsGuest(config) {
        this.localPlayerId = config.humanSlots[this.onlineManager.localId];
        this.currentPlayerIndex = this.localPlayerId;
        this.onlinePlayerMap = { ...config.humanSlots };

        // Hide lobby, show game
        document.getElementById('online-lobby').style.display = 'none';
        document.getElementById('waiting-room-guest').style.display = 'none';
        this.showOnlineConnectionBar();

        // Reconstruct weapons from indices
        const assignedWeapons = config.weapons.map(idx => this.weapons[idx]);
        this.playerColors = config.colors;

        // Initialize game
        this.playerCount = config.playerCount;
        this.showGameLog();
        this.addLogEntryT('log.onlineGameStarted', [config.playerCount], 'round-start');
        this.addLogEntryT('log.roundStarted', [1], 'round-start');

        this.updateLocationRewards();
        this.setupDummyTokens(config.playerCount);

        // Create players same as host
        const humanSlotSet = new Set(Object.values(config.humanSlots));
        const slotTypes = [];
        for (let i = 0; i < config.playerCount; i++) {
            slotTypes.push(humanSlotSet.has(i) ? 'player' : 'bot');
        }

        const botConfiguration = {
            humanPlayers: config.humanPlayerCount,
            botCount: config.playerCount - config.humanPlayerCount,
            slotTypes: slotTypes
        };

        this.createPlayers(config.playerCount, assignedWeapons, botConfiguration);

        // Override names for online human players
        for (const [playerId, slot] of Object.entries(config.humanSlots)) {
            this.players[slot].name = config.playerNames[playerId];
        }

        this.gameMode = 'online';

        // Show game UI
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');

        if (playerBoards) playerBoards.style.display = 'grid';
        if (gameBoard) gameBoard.style.display = 'grid';
        if (playerArea) playerArea.style.display = 'block';
        if (gameStatus) gameStatus.style.display = 'block';

        this.createPlayerBoards();
        const playerBoardsContainer = document.getElementById('player-boards-container');
        playerBoardsContainer.className = `player-boards players-${config.playerCount}`;

        this.roundPhase = 'init'; // Set to 'init' so first state update triggers phase transition logic (including timer init)
        this.pendingSelectionLogs = [];
        this.playerCompletionStatus = {};
        this.players.forEach(player => {
            this.playerCompletionStatus[player.id] = false;
        });

        this.initGuestUI();

        // Initialize chat
        this.initChat();

        // Listen for game state updates from host
        this.onlineManager.listenForGameState((state) => {
            this.applyRemoteGameState(state);
        });
    }

    initGuestUI() {
        // Initialize UI elements but guest waits for host state
        // Hide "Current Player" text — not needed in online mode
        document.querySelector('.current-player').style.display = 'none';

        this.initializePlayerStatusIndicators();
        this.initializeLocationCards();
        this.setupEventListeners();
        this.updateResourceDisplay();
        this.updateLocationDisplays();
        this.updateLocationCardStates();
        this.updateDummyTokenDisplay();
        this.applyPlayerNameColors();

        this.players.forEach(player => {
            this.updatePopularityTrackDisplay(player.id);
        });

        this.updateStatusMessage();
        this.disableBotPlayerButtons();

        // Guest shows selection cards for their own selections
        this.createLocationCards();
        document.getElementById('status-message').textContent = t('status.selectLocationsBare');
        const confirmBtn = document.getElementById('confirm-selection');
        if (confirmBtn) confirmBtn.textContent = t('status.selectBothLocations');
    }

    showRulebook() {
        const modal = document.getElementById('rules-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Pick the rulebook file matching the current language and reload the iframe
            const iframe = modal.querySelector('iframe');
            if (iframe) {
                const lang = (typeof getLanguage === 'function') ? getLanguage() : 'en';
                const targetFile = (lang === 'zh') ? 'Rules_ZH.htm' : 'Rules_EN.htm';
                iframe.src = targetFile;
            }
        }
    }

    hideRulebook() {
        const modal = document.getElementById('rules-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showLanguageModal() {
        const modal = document.getElementById('language-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.zIndex = '9999';
        }
    }

    hideLanguageModal() {
        const modal = document.getElementById('language-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    selectLanguage(lang) {
        if (typeof setLanguage === 'function') {
            setLanguage(lang);
        }
        this.hideLanguageModal();
        // Refresh static text on the page
        this.applyTranslationsToDOM();
    }

    /**
     * Walk all elements with data-i18n / data-i18n-title attributes
     * and update their textContent / title to the current language.
     * Also fires onLanguageChanged hook for runtime UI refresh.
     */
    applyTranslationsToDOM() {
        if (typeof t !== 'function') return;

        // textContent
        const textNodes = document.querySelectorAll('[data-i18n]');
        textNodes.forEach(function (el) {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const value = t(key);
            // If the value contains HTML tags, use innerHTML; otherwise textContent (safer)
            if (/<[a-z][^>]*>/i.test(value)) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        });

        // title (tooltip)
        const titleNodes = document.querySelectorAll('[data-i18n-title]');
        titleNodes.forEach(function (el) {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = t(key);
        });

        // placeholder
        const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderNodes.forEach(function (el) {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key);
        });
    }

    /**
     * Hook called by i18n.js when the language is switched at runtime.
     * Re-renders any dynamic UI that doesn't use data-i18n.
     */
    onLanguageChanged(lang) {
        this.applyTranslationsToDOM();
        // If we're in mid-game, refresh the dynamic displays
        try {
            // Re-render every player board so weapon names, labels, and tooltips update
            if (typeof this.refreshPlayerBoard === 'function' && this.players && this.players.length > 0) {
                this.players.forEach(p => {
                    try { this.refreshPlayerBoard(p.id); } catch (e) { /* ignore individual board errors */ }
                });
            }
            if (typeof this.updateResourceDisplay === 'function' && this.players && this.players.length > 0) {
                this.updateResourceDisplay();
            }
            if (typeof this.refreshAllPlayerButtonStates === 'function' && this.players && this.players.length > 0) {
                this.refreshAllPlayerButtonStates();
            }
            // Re-render the location reward info (overrides data-i18n with player-count specific text)
            if (typeof this.forceLocationDisplayUpdate === 'function' && this.playerCount > 0) {
                this.forceLocationDisplayUpdate();
            }
            // Re-render player config slot UI if visible
            const setupScreen = document.getElementById('player-count-selection');
            if (setupScreen && setupScreen.style.display !== 'none' && typeof this.updateSoloPlayerSlotsDisplay === 'function') {
                try { this.updateSoloPlayerSlotsDisplay(); } catch (e) { /* ignore */ }
            }
            // Re-render battle item buttons if a battle is in progress
            if (this.currentBattle && typeof this.updateBattleItemButtons === 'function') {
                this.updateBattleItemButtons();
            }
            // Re-render battle phase / monster rewards if a battle is in progress
            if (this.currentBattle) {
                if (typeof this.updateBattlePhase === 'function') {
                    try { this.updateBattlePhase(); } catch (e) { /* ignore */ }
                }
                if (typeof this.updateMonsterRewards === 'function' && this.currentBattle.monster) {
                    try { this.updateMonsterRewards(this.currentBattle.monster); } catch (e) { /* ignore */ }
                }
            }
            // Re-render capacity overflow modal if visible
            const capacityModal = document.getElementById('capacity-modal');
            if (capacityModal && capacityModal.style.display !== 'none' && this.currentOverflowPlayer != null && typeof this.showCapacityOverflowModal === 'function') {
                try { this.showCapacityOverflowModal(this.currentOverflowPlayer); } catch (e) { /* ignore */ }
            }
            // Re-render game stats if visible
            const statsOverlay = document.getElementById('game-stats-overlay');
            if (statsOverlay && statsOverlay.style.display !== 'none' && typeof this.showGameStats === 'function') {
                try { this.showGameStats(); } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    backToModeSelection() {
        // Go back to main menu
        this.showMainMenu();
    }
    
    showPlayerCountSelection() {
        const selectionScreen = document.getElementById('player-count-selection');
        selectionScreen.style.display = 'flex';
        
        // Hide the main game area
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');
        
        if (playerBoards) playerBoards.style.display = 'none';
        if (gameBoard) gameBoard.style.display = 'none';
        if (playerArea) playerArea.style.display = 'none';
        if (gameStatus) gameStatus.style.display = 'none';
        
        // Directly show Solo Play mode (no mode selection needed)
        this.showSoloPlayMode();
    }
    
    
    initializeGame(playerCount) {
        // Reset defeated monsters for new game
        this.defeatedMonsters.clear();
        this.currentSelectedMonster = null;
        this.monsterSelectionEPSpent = 0;
        
        // Show game log
        this.showGameLog();
        
        // Log game start
        this.addLogEntryT('log.gameStarted', [playerCount], 'round-start');
        
        // Log first round start
        this.addLogEntryT('log.roundStarted', [this.currentRound], 'round-start');
        
        // Update location rewards based on player count
        this.updateLocationRewards();
        
        // Set up dummy tokens based on player count
        this.setupDummyTokens(playerCount);
        
        // Randomly assign weapons to players
        const assignedWeapons = this.getRandomWeapons(playerCount);
        console.log('Assigned weapons:', assignedWeapons);
        
        // Randomly assign colors to players
        this.playerColors = this.getRandomPlayerColors(playerCount);
        console.log('Assigned colors:', this.playerColors);
        
        // For now, create all human players (bot integration can be added later via UI)
        // TODO: Add bot configuration UI
        const botConfiguration = null; // Future: { humanPlayers: 1, botCount: playerCount - 1 }
        
        // Create players
        this.createPlayers(playerCount, assignedWeapons, botConfiguration);
        
        // Create player boards
        this.createPlayerBoards();
        
        // Set player board grid class
        const playerBoardsContainer = document.getElementById('player-boards-container');
        playerBoardsContainer.className = `player-boards players-${playerCount} collapsed`;
        
        
        // Initialize the game UI
        this.roundPhase = 'selection';
        this.pendingSelectionLogs = []; // Clear any pending logs
        this.init();
        
        // Ensure location displays are updated after UI initialization
        // Remove this one since we're calling it properly later
    }
    
    
    addScore(playerId, points, source = 'other') {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.score += points;
            
            // Track score by source for data analysis
            switch(source) {
                case 'monster':
                    player.scoreFromMonsters += points;
                    break;
                case 'milestone':
                    player.scoreFromMilestones += points;
                    break;
                case 'popularity':
                    player.scoreFromPopularity += points;
                    break;
                case 'plaza':
                    player.scoreFromPlaza += points;
                    break;
                case 'fakeblood':
                    player.scoreFromFakeBlood += points;
                    break;
                default:
                    player.scoreFromOther += points;
                    break;
            }
        }
    }
    


    getLocationRewards(locationName) {
        // Return default 2-player rewards if player count not set yet
        if (!this.playerCount || this.playerCount === 2) {
            switch (locationName) {
                case 'work':
                case 'bar':
                    return [6, 4];
                case 'hospital':
                case 'dojo':
                    return [4, 2];
                case 'plaza':
                    return [5, 2]; // Updated from [4, 2] to [5, 2]
                default:
                    return [];
            }
        }
        
        // 3-player rewards
        if (this.playerCount === 3) {
            switch (locationName) {
                case 'work':
                case 'bar':
                    return [7, 5, 4]; // 7 with 1 token, 5 with 2 tokens, 4 with 3+ tokens
                case 'hospital':
                case 'dojo':
                    return [5, 4, 3]; // 5 with 1 token, 4 with 2 tokens, 3 with 3+ tokens
                case 'plaza':
                    return [5, 3, 2]; // Updated to [5, 3, 2]
                default:
                    return [];
            }
        }
        
        // 4-player rewards
        if (this.playerCount >= 4) {
            switch (locationName) {
                case 'work':
                case 'bar':
                    return [8, 6, 5, 4]; // 8 with 1 token, 6 with 2 tokens, 5 with 3 tokens, 4 with 4+ tokens
                case 'hospital':
                case 'dojo':
                    return [6, 5, 4, 3]; // 6 with 1 token, 5 with 2 tokens, 4 with 3 tokens, 3 with 4+ tokens
                case 'plaza':
                    return [6, 4, 3, 2]; // Updated from [6, 5, 4, 3] to [6, 4, 3, 2]
                default:
                    return [];
            }
        }
        
        return [];
    }
    
    updateLocationRewards() {
        // Update rewards based on current player count
        this.locations.forEach(location => {
            switch (location.id) {
                case 1: // Work Site
                    location.rewards = this.getLocationRewards('work');
                    break;
                case 2: // Bar
                    location.rewards = this.getLocationRewards('bar');
                    break;
                case 4: // Hospital
                    location.rewards = this.getLocationRewards('hospital');
                    break;
                case 5: // Dojo
                    location.rewards = this.getLocationRewards('dojo');
                    break;
                case 6: // Plaza
                    location.rewards = this.getLocationRewards('plaza');
                    break;
            }
        });
        
        // Note: updateLocationDisplays() will be called later when DOM is ready
    }
    
    updateLocationDisplays() {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;
        // Update reward display text based on current player count
        console.log('=== UPDATING LOCATION DISPLAYS ===');
        console.log('Player count:', this.playerCount);
        console.log('Total players in game:', this.players ? this.players.length : 'undefined');
        console.log('Locations array:', this.locations.map(l => ({ id: l.id, name: l.name, rewards: l.rewards })));
        
        // First, let's see what elements exist on the page
        const allRewardElements = document.querySelectorAll('.reward-info');
        console.log('All .reward-info elements found:', allRewardElements.length);
        allRewardElements.forEach((el, index) => {
            console.log(`Element ${index}:`, el.textContent, el.parentElement?.getAttribute('data-location'));
        });
        
        this.locations.forEach(location => {
            const rewardElement = document.querySelector(`[data-location="${location.id}"] .reward-info`);
            console.log(`Looking for element: [data-location="${location.id}"] .reward-info`);
            console.log('Found element:', rewardElement);
            
            if (!rewardElement) {
                console.warn(`Could not find reward element for location ${location.id}`);
                return;
            }
            
            let displayText = '';

            switch (location.id) {
                case 1: // Work Site
                    displayText = this.getRewardDisplayText(t('common.money'), location.rewards);
                    break;
                case 2: // Bar
                    displayText = this.getRewardDisplayText(t('common.beer'), location.rewards);
                    break;
                case 3: // Station
                    displayText = t('location.station.reward');
                    break;
                case 4: // Hospital
                    displayText = this.getRewardDisplayText(t('common.bloodBag'), location.rewards);
                    break;
                case 5: // Dojo
                    displayText = this.getRewardDisplayText(t('common.exp'), location.rewards);
                    break;
                case 6: // Plaza
                    displayText = this.getRewardDisplayText(t('common.score'), location.rewards);
                    break;
                case 7: // Forest
                    displayText = t('location.forest.reward');
                    break;
            }
            
            console.log(`Setting location ${location.id} (${location.name}) to: ${displayText}`);
            console.log('Current element text before update:', rewardElement.textContent);
            rewardElement.textContent = displayText;
            console.log('Current element text after update:', rewardElement.textContent);
            
            // Force a direct update by also setting innerHTML
            rewardElement.innerHTML = displayText;
        });
        
        // Also try a more direct approach to ensure updates work
        this.forceLocationDisplayUpdate();
        console.log('Location display update completed');
    }
    
    forceLocationDisplayUpdate() {
        console.log('=== FORCE UPDATING DISPLAYS ===');
        
        // Direct element updates with more aggressive selectors
        const updates = [
            { selector: '[data-location="1"] .reward-info', text: this.getRewardDisplayText(t('common.money'), this.locations.find(l => l.id === 1)?.rewards || [6, 4]) },
            { selector: '[data-location="2"] .reward-info', text: this.getRewardDisplayText(t('common.beer'), this.locations.find(l => l.id === 2)?.rewards || [6, 4]) },
            { selector: '[data-location="4"] .reward-info', text: this.getRewardDisplayText(t('common.bloodBag'), this.locations.find(l => l.id === 4)?.rewards || [4, 2]) },
            { selector: '[data-location="5"] .reward-info', text: this.getRewardDisplayText(t('common.exp'), this.locations.find(l => l.id === 5)?.rewards || [4, 2]) },
            { selector: '[data-location="6"] .reward-info', text: this.getRewardDisplayText(t('common.score'), this.locations.find(l => l.id === 6)?.rewards || [4, 2]) }
        ];
        
        updates.forEach(update => {
            const element = document.querySelector(update.selector);
            if (element) {
                console.log(`Force updating ${update.selector} to: ${update.text}`);
                element.textContent = update.text;
                element.innerHTML = update.text;
                // Also try setting the innerText
                element.innerText = update.text;
            } else {
                console.warn(`Could not find element: ${update.selector}`);
            }
        });
    }
    
    getRewardDisplayText(resourceName, rewards) {
        if (!rewards || rewards.length === 0) return resourceName;
        
        if (this.playerCount === 2) {
            return `${resourceName} ${rewards[0]}/${rewards[1]}`;
        } else if (this.playerCount === 3) {
            return `${resourceName} ${rewards[0]}/${rewards[1]}/${rewards[2]}`;
        } else if (this.playerCount >= 4) {
            return `${resourceName} ${rewards[0]}/${rewards[1]}/${rewards[2]}/${rewards[3]}`;
        }
        
        return resourceName;
    }
    
    getRewardAmount(location, totalCount) {
        // Handle player count-based reward calculation
        const rewards = location.rewards;
        if (!rewards || rewards.length === 0) return 0;
        
        // For 2 players: rewards[0] for 1 token, rewards[1] for 2+ tokens
        if (this.playerCount === 2) {
            return totalCount === 1 ? rewards[0] : rewards[1];
        }
        
        // For 3 players: rewards[0] for 1 token, rewards[1] for 2 tokens, rewards[2] for 3+ tokens
        if (this.playerCount === 3) {
            if (totalCount === 1) return rewards[0];
            if (totalCount === 2) return rewards[1];
            return rewards[2];
        }
        
        // For 4+ players: rewards[0] for 1 token, rewards[1] for 2 tokens, rewards[2] for 3 tokens, rewards[3] for 4+ tokens
        if (this.playerCount >= 4) {
            if (totalCount === 1) return rewards[0];
            if (totalCount === 2) return rewards[1];
            if (totalCount === 3) return rewards[2];
            return rewards[3];
        }
        
        // Fallback to 2-player logic
        return totalCount === 1 ? rewards[0] : rewards[1];
    }
    
    setupDummyTokens(playerCount) {
        switch (playerCount) {
            case 2:
                // 2 dummy tokens at Bar (2) and Dojo (5)
                this.dummyTokens = [2, 5];
                break;
            case 3:
                // 1 dummy token at Station (3)
                this.dummyTokens = [3];
                break;
            case 4:
                // No dummy tokens
                this.dummyTokens = [];
                break;
        }
        console.log(`Initialized dummy tokens for ${playerCount} players at locations:`, this.dummyTokens);
    }
    
    createPlayers(playerCount, assignedWeapons, botConfiguration = null) {
        this.players = [];
        this.bots = [];
        this.botCount = botConfiguration ? botConfiguration.botCount : 0;
        
        for (let i = 0; i < playerCount; i++) {
            const playerId = i;
            const weapon = assignedWeapons[i];
            let isBot = false;
            let playerName = '';
            
            // Handle solo mode configuration
            if (botConfiguration && botConfiguration.slotTypes) {
                isBot = botConfiguration.slotTypes[i] === 'bot';
                playerName = isBot ? `Bot ${i + 1}` : `Player ${i + 1}`;
            } else if (botConfiguration && botConfiguration.humanPlayers !== undefined) {
                // Legacy bot configuration
                isBot = i >= botConfiguration.humanPlayers;
                playerName = isBot ? `Bot ${playerId - botConfiguration.humanPlayers + 1}` : `Player ${playerId + 1}`;
            } else {
                // No bot configuration - all human players
                playerName = `Player ${playerId + 1}`;
            }
            
            const player = {
                id: playerId,
                name: playerName,
                isBot: isBot,
                tokens: {
                    hunter: null,
                    apprentice: null
                },
                selectedCards: {
                    hunter: null,
                    apprentice: null
                },
                resources: {
                    money: weapon.initialMoney,
                    exp: 3,
                    hp: 4,
                    ep: 6,
                    beer: 0,
                    bloodBag: 0
                },
                upgradeProgress: {
                    ep: 0,  // beer for EP upgrade (0/4)
                    hp: 0   // blood bags for HP upgrade (0/3)
                },
                milestones: {
                    ep8: false,  // Max EP 8 milestone (2 points)
                    ep10: false, // Max EP 10 milestone (4 points)
                    hp6: false,  // Max HP 6 milestone (2 points)
                    hp8: false,  // Max HP 8 milestone (3 points)
                    hp10: false  // Max HP 10 milestone (4 points)
                },
                score: 0,
                // Track score sources for data analysis
                scoreFromMonsters: 0,
                scoreFromMilestones: 0,
                scoreFromPopularity: 0,
                scoreFromPlaza: 0,
                scoreFromFakeBlood: 0,
                scoreFromOther: 0,
                maxResources: {
                    money: 15,
                    exp: 15,
                    hp: 4,
                    ep: 6
                },
                weapon: {
                    ...weapon,
                    currentAttackDice: weapon.attackDice,
                    currentDefenseDice: weapon.defenseDice, // All weapons start with their base defense dice
                    attackLevel: 1,
                    defenseLevel: 1,
                    powerTrackPosition: 1 // Start at position 1
                },
                maxInventoryCapacity: weapon.capacity,
                inventory: [], // Array to hold purchased items
                popularityTrack: {
                    pointToken: 0,  // Current level of point token (0-5)
                    rewardToken: 0, // Current level of reward token (0-5)
                    levelReached: [false, false, false, false, false, false] // Track which point levels have been collected
                },
                color: this.playerColors[playerId + 1],
                pets: {
                    level1: 0,
                    level2: 0,
                    level3: 0
                },
                // Game statistics tracking
                hunterAloneCount: 0,
                apprenticeWithHuntersCount: 0,
                monstersDefeated: { level1: 0, level2: 0, level3: 0 },
                locationSelections: {
                    1: { hunter: 0, apprentice: 0 }, // Work Site
                    2: { hunter: 0, apprentice: 0 }, // Bar
                    3: { hunter: 0, apprentice: 0 }, // Station
                    4: { hunter: 0, apprentice: 0 }, // Hospital
                    5: { hunter: 0, apprentice: 0 }, // Dojo
                    6: { hunter: 0, apprentice: 0 }, // Plaza
                    7: { hunter: 0, apprentice: 0 }  // Forest
                }
            };
            
            this.players.push(player);
            
            // Create bot instance if this player is a bot
            if (isBot) {
                const botInstance = new BotPlayer(playerId, weapon);
                this.bots.push(botInstance);
                console.log(`Created bot instance for player ${playerId + 1} with weapon ${weapon.name}`);
            }
        }
        
        // Verify all players have unique colors (should always pass now)
        const playerColorNames = this.players.map(p => p.color.name);
        console.log('✅ Players created with unique colors:', playerColorNames);
        
        console.log('Created players:', this.players);
        if (this.bots.length > 0) {
            console.log(`Created ${this.bots.length} bot instances`);
        }
    }
    
    // Bot integration methods
    getBotForPlayer(playerId) {
        return this.bots.find(bot => bot.playerId === playerId);
    }
    
    handleBotLocationSelection(playerId) {
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Bot ${playerId} starting location selection - Round ${this.currentRound}`);
        }
        const bot = this.getBotForPlayer(playerId);
        if (!bot) return;
        
        const player = this.players[playerId];
        
        // Get available locations (not occupied by dummy tokens and meeting requirements)
        const availableLocations = [1, 2, 3, 4, 5, 6, 7].filter(locationId => {
            // Filter out dummy token locations
            if (this.dummyTokens.includes(locationId)) {
                return false;
            }
            
            // Filter out Forest if player doesn't meet requirements
            if (locationId === 7) {
                // Check EP requirement
                if (player.resources.ep < 2) {
                    return false;
                }
                
                // Check ammunition requirement
                if (!this.hasRequiredAmmunition(player)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Bot selects hunter location
        const hunterLocation = bot.selectHunterLocation(this, availableLocations);
        player.selectedCards.hunter = hunterLocation;
        
        // Update bot's plaza tracking
        bot.updateRoundsSinceLastPlaza(hunterLocation);
        
        // Bot selects apprentice location
        const apprenticeAvailableLocations = availableLocations.filter(id => 
            id !== hunterLocation || id === 7 // Apprentice can't go to same location except Forest
        );
        const apprenticeLocation = bot.selectApprenticeLocation(this, apprenticeAvailableLocations, hunterLocation);
        player.selectedCards.apprentice = apprenticeLocation;

        // Track location selections for statistics
        player.locationSelections[hunterLocation].hunter++;
        player.locationSelections[apprenticeLocation].apprentice++;

        console.log(`Bot ${playerId + 1} selected: Hunter→${hunterLocation}, Apprentice→${apprenticeLocation}`);

        // Store bot selection for batch logging
        this.pendingSelectionLogs.push({
            key: 'log.playerSelected',
            args: [player, this.locationTArg(hunterLocation), this.locationTArg(apprenticeLocation)],
            type: 'selection',
            player: player
        });
        
        // Update UI to show bot selections
        this.updateLocationCardStates();
        this.updateSelectionDisplay();
        this.checkSelectionComplete();

        // Handle completion based on game mode
        if (this.gameMode === 'online') {
            // In online mode, bot completion is handled by startOnlineSelectionPhase
            // No additional action needed here
        } else if (this.gameMode === 'simultaneous') {
            // In simultaneous mode, mark bot as complete
            this.updatePlayerStatus(playerId, true);

            // Check if all players are complete
            if (this.checkAllPlayersComplete()) {
                console.log('All players completed selections (simultaneous mode)');
                // Add all pending logs
                this.pendingSelectionLogs.forEach(log => {
                    if (log.key) {
                        this.addLogEntryT(log.key, log.args || [], log.type, log.player);
                    } else {
                        this.addLogEntry(log.message, log.type, log.player);
                    }
                });
                this.pendingSelectionLogs = [];

                this.hidePlayerStatusIndicators();
                this.startResourceDistribution();
            }
        } else {
            // Turn-based mode: auto-confirm for bot
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] Auto-confirming bot selection for player ${playerId}`);
                setTimeout(() => {
                    this.confirmSelection();
                }, this.getDelay(100));
            } else {
                // In regular games, also auto-confirm for bot players after a short delay
                console.log(`Auto-confirming bot ${playerId + 1} selection`);
                setTimeout(() => {
                    this.confirmSelection();
                }, 1500); // Give human player time to see bot selection
            }
        }
    }
    
    handleBotResourceManagement(playerId) {
        const bot = this.getBotForPlayer(playerId);
        if (!bot) return;
        
        bot.manageResources(this);
        console.log(`Bot ${playerId + 1} completed resource management`);
        
        // Update UI to reflect resource changes
        this.updateResourceDisplay();
    }
    
    handleBotBattle(playerId, monster) {
        const bot = this.getBotForPlayer(playerId);
        if (!bot) return null;
        
        const battleResult = bot.manageBattle(this, monster);
        
        if (battleResult.victory || battleResult.tamed) {
            // Monster defeated successfully
        }
        
        return battleResult;
    }
    
    handleBotPostAttack(playerId, monster) {
        const bot = this.getBotForPlayer(playerId);
        if (!bot) return null;
        
        return bot.checkPostAttackItems(this, monster);
    }
    
    // Testing method: Enable bots for existing players
    enableBotsForTesting(botPlayerIds = [1]) {
        console.log('Enabling bot mode for testing...', botPlayerIds);
        
        for (const playerId of botPlayerIds) {
            if (playerId < this.players.length) {
                const player = this.players[playerId];
                const weapon = player.weapon;
                
                // Mark player as bot
                player.isBot = true;
                player.name = `Bot ${playerId + 1}`;
                
                // Create bot instance
                const botInstance = new BotPlayer(playerId, weapon);
                this.bots.push(botInstance);
                
                console.log(`Enabled bot for player ${playerId + 1} with weapon ${weapon.name}`);
                
                // Update UI
                const nameElement = document.getElementById(`player-${playerId}-name`);
                if (nameElement) {
                    nameElement.innerHTML = nameElement.innerHTML.replace(/Player \d+/, player.name);
                }
            }
        }
        
        this.botCount = this.bots.length;
        console.log(`Bot system active with ${this.botCount} bots`);
    }
    
    // Initialize game UI after player creation
    init() {
        try {
            // Determine game mode based on number of human players (skip if online)
            if (this.gameMode !== 'online') {
                const humanCount = this.players.filter(p => !p.isBot).length;
                this.gameMode = humanCount === 1 ? 'simultaneous' : 'turnbased';
            }
            console.log(`Game mode set to: ${this.gameMode}`);

            // Initialize player completion status (all start as not complete)
            this.players.forEach(player => {
                this.playerCompletionStatus[player.id] = false;
            });

            // IMMEDIATELY handle bot detection before any other UI operations
            const currentPlayer = this.players[this.currentPlayerIndex];

        if (currentPlayer && currentPlayer.isBot) {
            console.log('First round: Immediately hiding cards for bot player');
            const cardSelection = document.querySelector('.card-selection');
            const confirmButton = document.getElementById('confirm-selection');
            if (cardSelection) cardSelection.style.display = 'none';
            if (confirmButton) confirmButton.style.display = 'none';

            // Bot selection will be handled by updateCurrentPlayer()
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] First round bot selection will be handled by updateCurrentPlayer`);
            }
        }

        // Hide "Current Player" text in simultaneous/online modes
        if (this.gameMode !== 'turnbased') {
            document.querySelector('.current-player').style.display = 'none';
        }

        // Initialize player status indicators
        this.initializePlayerStatusIndicators();

        // Initialize location cards
        this.initializeLocationCards();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update displays
        this.updateResourceDisplay();
        this.updateCurrentPlayer();
        this.updateLocationCardStates();
        this.updateDummyTokenDisplay();
        
        // Apply player colors to names and levels
        this.applyPlayerNameColors();
        
        // Initialize popularity track display for all players
        this.players.forEach(player => {
            this.updatePopularityTrackDisplay(player.id);
        });
        
        // Update status message
        this.updateStatusMessage();
        
        // Disable buttons for bot players after all initialization
        this.disableBotPlayerButtons();
        
        console.log('Game UI initialized successfully');
        } catch (error) {
            console.error('CRITICAL ERROR in init():', error);
            console.error('Error stack:', error.stack);
        }
    }

    // Player Status Indicator Functions
    initializePlayerStatusIndicators() {
        if (this.isAutomatedMode) return; // Skip in automated mode

        const panel = document.getElementById('player-status-panel');
        if (!panel) return;

        // Clear existing player status indicators (preserve phase-title)
        panel.querySelectorAll('.player-status').forEach(el => el.remove());

        // Ensure phase-title element exists
        if (!document.getElementById('phase-title')) {
            const titleDiv = document.createElement('div');
            titleDiv.id = 'phase-title';
            panel.prepend(titleDiv);
        }

        // Create status indicator for each player
        this.players.forEach(player => {
            const playerColors = this.getPlayerColors(player.id);

            const statusDiv = document.createElement('div');
            statusDiv.className = 'player-status pending';
            statusDiv.dataset.playerId = player.id;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = this.getPlayerDisplayName(player);
            nameSpan.style.color = playerColors.background; // Set player color for name

            const iconSpan = document.createElement('span');
            iconSpan.className = 'status-icon';
            iconSpan.textContent = '🔴'; // Red light (pending)

            statusDiv.appendChild(nameSpan);
            statusDiv.appendChild(iconSpan);

            // Add phase timer display for human players in online mode (skip if no time limit)
            if (this.isOnlineMode && !player.isBot && this.phaseTimeLimit > 0) {
                const timerSpan = document.createElement('span');
                timerSpan.className = 'phase-timer';
                timerSpan.dataset.playerId = player.id;
                timerSpan.textContent = this.formatTime(this.phaseTimeLimit * 1000);
                statusDiv.appendChild(timerSpan);
            }

            panel.appendChild(statusDiv);
        });
    }

    setPhaseTitle(text) {
        const titleEl = document.getElementById('phase-title');
        if (titleEl) {
            titleEl.textContent = text;
        }
    }

    /**
     * Translate an internal English location name to the current language.
     * Internal names are used as identifiers throughout the code; this helper
     * is for display purposes only.
     */
    getLocationDisplayName(internalName) {
        const map = {
            'Work Site': 'location.workSite',
            'Bar': 'location.bar',
            'Station': 'location.station',
            'Hospital': 'location.hospital',
            'Dojo': 'location.dojo',
            'Plaza': 'location.plaza',
            'Forest': 'location.forest'
        };
        const key = map[internalName];
        return key ? t(key) : internalName;
    }

    /**
     * Translate an internal English weapon name to the current language.
     */
    getWeaponDisplayName(internalName) {
        if (!internalName) return '';
        const key = 'weapon.' + internalName.toLowerCase() + '.name';
        const translated = t(key);
        // If missing, fall back to internal name
        return (translated && translated.indexOf('[MISSING') !== 0) ? translated : internalName;
    }

    /**
     * Translate a monster's effect description from its effectId or fallback to its raw text.
     */
    getMonsterEffectDisplay(monster) {
        if (!monster) return '';
        // Map effect text to translation key (the existing Chinese text in monster.effect)
        const textToKey = {
            '無': 'monster.effect.none',
            '血減半時，攻擊力+1': 'monster.effect.attackUpHalfHP',
            '偷走玩家2金幣': 'monster.effect.stealMoney',
            '死亡時，玩家及在森林裡的玩家-1血(不會導致玩家血歸零)': 'monster.effect.deathDamageAll',
            '玩家受傷無法獲得經驗': 'monster.effect.noExpFromDamage',
            '玩家無法一次給予怪獸超過2點傷害': 'monster.effect.damageCap2',
            '玩家防禦力1以上先攻': 'monster.effect.firstStrike1',
            '這回合其他怪獸+1血': 'monster.effect.otherMonstersPlus1HP',
            '不在森林的玩家-1血(不會導致玩家血歸零)': 'monster.effect.damageNonForest1HP',
            '每次玩家攻擊-1體力': 'monster.effect.drainEP',
            '遭受攻擊後若沒有死亡+1血': 'monster.effect.healAfterSurviving',
            '不怕手榴彈': 'monster.effect.immuneGrenades',
            '玩家無法一次給予怪獸超過4點傷害': 'monster.effect.damageCap4',
            '不怕手榴彈、炸彈、炸藥': 'monster.effect.immuneAllExplosives',
            '玩家防禦力3以上先攻': 'monster.effect.firstStrike3',
            '玩家防禦力2以上先攻': 'monster.effect.firstStrike2',
            '需要+1體力收服': 'monster.effect.extraTamingCost',
            '玩家受傷最多獲得3經驗': 'monster.effect.maxExp3',
            '不在森林的玩家-2經驗': 'monster.effect.reduceNonForestExp',
            '不在森林的玩家-2血': 'monster.effect.damageNonForest2HP',
            '不在森林的玩家-2分': 'monster.effect.reduceNonForestPts',
            '玩家無法一次給予怪獸超過6點傷害': 'monster.effect.damageCap6',
            '玩家防禦力4以上先攻': 'monster.effect.firstStrike4',
            '玩家受傷最多獲得4經驗': 'monster.effect.maxExp4'
        };
        const key = textToKey[monster.effect];
        if (!key) return monster.effect || '';
        const translated = t(key);
        return (translated && translated.indexOf('[MISSING') !== 0 && translated.indexOf('[UNTRANSLATED') !== 0) ? translated : monster.effect;
    }

    /**
     * Translate an internal English resource name (money/exp/hp/ep/beer/bloodBag) to the current language.
     */
    getResourceDisplayName(internalName) {
        const map = {
            'money': 'common.money',
            'exp': 'common.exp',
            'hp': 'common.hp',
            'ep': 'common.ep',
            'beer': 'common.beer',
            'bloodBag': 'common.bloodBag'
        };
        const key = map[internalName];
        return key ? t(key) : internalName;
    }

    /**
     * Translate a weapon power description (Lv1/Lv2/Lv3) to the current language.
     */
    getWeaponPowerDesc(weaponName, level) {
        if (!weaponName || !level) return '';
        const key = 'weapon.' + weaponName.toLowerCase() + '.lv' + level;
        const translated = t(key);
        return (translated && translated.indexOf('[MISSING') !== 0) ? translated : '';
    }

    /**
     * Translate an internal English item name to the current language.
     */
    getItemDisplayName(internalName) {
        if (!internalName) return '';
        const map = {
            'Beer': 'item.beer.name',
            'Blood Bag': 'item.bloodBag.name',
            'Grenade': 'item.grenade.name',
            'Bomb': 'item.bomb.name',
            'Dynamite': 'item.dynamite.name',
            'Fake Blood': 'item.fakeBlood.name',
            'Bullet': 'item.bullet.name',
            'Battery': 'item.battery.name'
        };
        const key = map[internalName];
        return key ? t(key) : internalName;
    }

    /**
     * Translate a raw player name string (e.g. "Player 1" or "Bot 2") into the
     * localized display form. Used when only the string is available, not the
     * full player object.
     */
    _translatePlayerName(rawName) {
        if (!rawName) return '';
        return this.getPlayerDisplayName({ name: rawName });
    }

    /**
     * Translate a player's display name. Internal names are stored as
     * "Player N" / "Bot N" — this swaps "Player" / "Bot" for the localized
     * version while keeping the number.
     */
    getPlayerDisplayName(player) {
        if (!player || !player.name) return '';
        const parts = player.name.split(' ');
        if (parts.length >= 2 && (parts[0] === 'Player' || parts[0] === 'Bot')) {
            const prefix = parts[0] === 'Bot' ? t('common.bot') : t('common.player');
            return prefix + ' ' + parts.slice(1).join(' ');
        }
        return player.name;
    }

    showPlayerStatusIndicators(titleOnly = false) {
        if (this.isAutomatedMode) return;
        const panel = document.getElementById('player-status-panel');
        if (panel) {
            panel.style.display = 'flex';
            // Show/hide individual player status divs based on titleOnly
            const statusDivs = panel.querySelectorAll('.player-status');
            statusDivs.forEach(div => {
                div.style.display = titleOnly ? 'none' : 'flex';
            });
        }
    }

    hidePlayerStatusIndicators() {
        if (this.isAutomatedMode) return;
        const panel = document.getElementById('player-status-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    updatePlayerStatus(playerId, isComplete) {
        if (this.isAutomatedMode) return;

        this.playerCompletionStatus[playerId] = isComplete;

        const statusDiv = document.querySelector(`.player-status[data-player-id="${playerId}"]`);
        if (!statusDiv) return;

        const iconSpan = statusDiv.querySelector('.status-icon');
        if (isComplete) {
            statusDiv.classList.remove('pending');
            statusDiv.classList.add('completed');
            if (iconSpan) iconSpan.textContent = '🟢'; // Green light
        } else {
            statusDiv.classList.remove('completed');
            statusDiv.classList.add('pending');
            if (iconSpan) iconSpan.textContent = '🔴'; // Red light
        }
    }

    checkAllPlayersComplete() {
        return this.players.every(player => this.playerCompletionStatus[player.id] === true);
    }

    resetPlayerCompletionStatus() {
        this.players.forEach(player => {
            this.playerCompletionStatus[player.id] = false;
            if (!this.isAutomatedMode) {
                this.updatePlayerStatus(player.id, false);
            }
        });
    }

    disableBotPlayerButtons() {
        // Disable buttons for bot players after initialization
        this.players.forEach(player => {
            if (player.isBot) {
                const playerId = player.id;
                const disabledTitle = 'Cannot interact with bot player board';
                
                // Disable HP upgrade button
                const hpUpgradeBtn = document.getElementById(`p${playerId}-hp-upgrade-btn`);
                if (hpUpgradeBtn) {
                    hpUpgradeBtn.disabled = true;
                    hpUpgradeBtn.title = disabledTitle;
                }
                
                // Disable EP upgrade button
                const epUpgradeBtn = document.getElementById(`p${playerId}-ep-upgrade-btn`);
                if (epUpgradeBtn) {
                    epUpgradeBtn.disabled = true;
                    epUpgradeBtn.title = disabledTitle;
                }
                
                // Disable attack and defense dice upgrade buttons
                const playerBoard = document.getElementById(`player-${playerId}-board`);
                if (playerBoard) {
                    // Find attack dice button
                    const attackBtns = playerBoard.querySelectorAll(`button[onclick*="upgradeWeapon(${playerId}, 'attack')"]`);
                    attackBtns.forEach(btn => {
                        btn.disabled = true;
                        btn.title = disabledTitle;
                    });
                    
                    // Find defense dice button
                    const defenseBtns = playerBoard.querySelectorAll(`button[onclick*="upgradeWeapon(${playerId}, 'defense')"]`);
                    defenseBtns.forEach(btn => {
                        btn.disabled = true;
                        btn.title = disabledTitle;
                    });
                }
            }
        });
    }
    
    setupEventListeners() {
        // Confirm selection button
        const confirmButton = document.getElementById('confirm-selection');
        if (confirmButton) {
            confirmButton.onclick = () => this.confirmSelection();
        }
        
        // New game button  
        const newGameButton = document.getElementById('new-game-btn');
        if (newGameButton) {
            newGameButton.onclick = () => {
                // Reset game and show main menu
                this.showMainMenu();
            };
        }
        
        console.log('Event listeners set up');
    }
    
    initializeLocationCards() {
        // Use the modern card creation system instead
        this.createLocationCards();
        console.log('Location cards initialized using createLocationCards()');
    }
    
    // Old card creation system removed - now using createLocationCards() consistently
    
    hasRequiredAmmunition(player) {
        if (player.weapon.name === 'Rifle') {
            const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
            return bullets > 0;
        } else if (player.weapon.name === 'Plasma') {
            // Level 3 has infinite batteries
            if (player.weapon.powerTrackPosition >= 7) {
                return true;
            }
            const batteries = player.inventory.filter(item => item.name === 'Battery').length;
            return batteries > 0;
        }
        // Other weapons don't need ammunition
        return true;
    }
    
    updateLocationCardStates() {
        const hunterCards = document.querySelectorAll('#hunter-cards .location-card');
        const apprenticeCards = document.querySelectorAll('#apprentice-cards .location-card');
        
        [...hunterCards, ...apprenticeCards].forEach(card => {
            const locationId = parseInt(card.dataset.location);
            const tokenType = card.dataset.tokenType;
            
            // Reset classes
            card.classList.remove('selected', 'disabled');
            card.title = '';
            
            const currentPlayer = this.players[this.currentPlayerIndex];
            
            // Check if selected
            if (currentPlayer.selectedCards[tokenType] === locationId) {
                card.classList.add('selected');
            }
            
            // Check if disabled
            if (!this.isLocationAvailable(locationId, tokenType)) {
                card.classList.add('disabled');
                
                if (this.dummyTokens.includes(locationId)) {
                    card.title = 'Location occupied by dummy token';
                } else if (locationId === 7 && tokenType === 'hunter') {
                    if (currentPlayer.resources.ep < 2) {
                        card.title = 'Need 2+ EP for Forest';
                    } else if (!this.hasRequiredAmmunition(currentPlayer)) {
                        if (currentPlayer.weapon.name === 'Rifle') {
                            card.title = 'Need bullets for Rifle in Forest';
                        } else if (currentPlayer.weapon.name === 'Plasma') {
                            card.title = 'Need batteries for Plasma in Forest';
                        } else {
                            card.title = 'Need ammunition for Forest';
                        }
                    } else {
                        card.title = 'Forest not available';
                    }
                } else {
                    card.title = 'Location not available';
                }
            }
        });
    }
    
    updateSelectionDisplay() {
        if (this.isAutomatedMode) return;
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Update current player display
        document.getElementById('current-player-name').textContent = this.getPlayerDisplayName(currentPlayer);
        
        // Update selection status
        const hunterSelection = currentPlayer.selectedCards.hunter;
        const apprenticeSelection = currentPlayer.selectedCards.apprentice;
        
        console.log(`Player ${currentPlayer.id + 1} selections: Hunter=${hunterSelection}, Apprentice=${apprenticeSelection}`);
    }
    
    checkSelectionComplete() {
        if (this.isAutomatedMode) return;
        const currentPlayer = this.players[this.currentPlayerIndex];
        const confirmButton = document.getElementById('confirm-selection');
        
        const isComplete = currentPlayer.selectedCards.hunter !== null && 
                          currentPlayer.selectedCards.apprentice !== null;
        
        confirmButton.disabled = !isComplete;
        
        if (isComplete) {
            confirmButton.textContent = t('status.confirmSelection');
        } else {
            confirmButton.textContent = t('status.selectBothLocations');
        }
    }
    
    updateCurrentPlayer() {
        // Branch based on game mode
        if (this.gameMode === 'online') {
            return; // Online mode handles its own phase flow
        } else if (this.gameMode === 'simultaneous') {
            this.updateCurrentPlayerSimultaneous();
        } else {
            this.updateCurrentPlayerTurnBased();
        }
    }

    updateCurrentPlayerSimultaneous() {
        // In simultaneous mode, all players act at once
        if (this.roundPhase !== 'selection') return;

        // Show status indicators
        this.showPlayerStatusIndicators();
        this.setPhaseTitle(t('phase.selection'));

        // Reset completion status
        this.resetPlayerCompletionStatus();

        // Find human player and show their cards
        const humanPlayer = this.players.find(p => !p.isBot);
        if (humanPlayer && !this.isAutomatedMode) {
            this.showLocationCardsForHuman();
            const playerNameElement = document.getElementById('current-player-name');
            if (playerNameElement) {
                playerNameElement.textContent = humanPlayer.name;
            }
        }

        // Trigger ALL bots immediately (no delays in simultaneous mode)
        this.players.forEach((player, index) => {
            if (player.isBot) {
                // Execute bot selection immediately
                setTimeout(() => {
                    this.handleBotLocationSelection(index);
                }, this.getDelay(50 * (index + 1))); // Small stagger for visual effect only
            }
        });

        // Refresh button states for all players
        this.refreshAllPlayerButtonStates();
    }

    updateCurrentPlayerTurnBased() {
        // Turn-based mode: existing sequential logic
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Show status indicators (for first player only)
        if (this.currentPlayerIndex === 0 && this.roundPhase === 'selection') {
            this.showPlayerStatusIndicators();
            this.setPhaseTitle(t('phase.selection'));
            this.resetPlayerCompletionStatus();
        }

        // Skip UI updates in automated mode
        if (!this.isAutomatedMode) {
            const playerNameElement = document.getElementById('current-player-name');
            if (playerNameElement) {
                playerNameElement.textContent = currentPlayer.name;
            }
        }

        // Check if current player is a bot
        if (currentPlayer.isBot) {
            if (!this.isAutomatedMode) {
                console.log(`${currentPlayer.name} is a bot, making automatic selections...`);
                // Hide location cards for bot turns
                this.hideLocationCardsForBot();
            }

            // Bot selection will handle its own confirmation
            setTimeout(() => {
                this.handleBotLocationSelection(this.currentPlayerIndex);
            }, this.getDelay(200));
        } else if (!this.isAutomatedMode) {
            // Show location cards for human players
            this.showLocationCardsForHuman();
        }

        // Refresh button states for all players
        this.refreshAllPlayerButtonStates();
    }
    
    hideLocationCardsForBot() {
        const cardSelection = document.querySelector('.card-selection');
        const confirmButton = document.getElementById('confirm-selection');
        
        if (cardSelection) {
            cardSelection.style.display = 'none';
        }
        
        if (confirmButton) {
            confirmButton.style.display = 'none';
        }
        
        // Show a message that bot is selecting
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.innerHTML = t('status.botThinking', this.getPlayerDisplayName(this.players[this.currentPlayerIndex]));
        }
    }
    
    showLocationCardsForHuman() {
        const cardSelection = document.querySelector('.card-selection');
        const confirmButton = document.getElementById('confirm-selection');
        
        if (cardSelection) {
            cardSelection.style.display = 'grid';
        }
        
        if (confirmButton) {
            confirmButton.style.display = 'inline-block';
        }
    }
    
    updateStatusMessage() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const statusElement = document.getElementById('status-message');
        
        if (statusElement) {
            if (currentPlayer.isBot) {
                statusElement.textContent = t('status.botSelecting', this.getPlayerDisplayName(currentPlayer));
            } else {
                statusElement.textContent = t('status.selectLocationsPrompt', this.getPlayerDisplayName(currentPlayer));
            }
        }
    }
    
    updateDummyTokenDisplay() {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;
        // Clear existing dummy tokens from board
        document.querySelectorAll('.dummy-token').forEach(token => token.remove());
        
        // Add dummy tokens to board locations
        this.dummyTokens.forEach(locationId => {
            const locationElement = document.querySelector(`[data-location="${locationId}"] .token-slots`);
            if (locationElement) {
                const dummyToken = document.createElement('div');
                dummyToken.className = 'dummy-token';
                dummyToken.textContent = 'DUMMY';
                locationElement.appendChild(dummyToken);
            }
        });
        
        console.log('Dummy tokens displayed at locations:', this.dummyTokens);
    }
    
    updateResourceDisplay() {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;

        this.players.forEach(player => {
            const playerId = player.id;

            // Update resource values
            const elements = {
                money: document.getElementById(`p${playerId}-money`),
                exp: document.getElementById(`p${playerId}-exp`),
                hp: document.getElementById(`p${playerId}-hp`),
                ep: document.getElementById(`p${playerId}-ep`),
                score: document.getElementById(`p${playerId}-score`)
            };

            Object.entries(elements).forEach(([resource, element]) => {
                if (element) {
                    if (resource === 'score') {
                        element.textContent = player.score;
                    } else {
                        element.textContent = player.resources[resource];
                    }
                }
            });

            // Update max resource displays (expanded board)
            const maxElements = {
                hp: document.querySelector(`#p${playerId}-hp + .resource-max`),
                ep: document.querySelector(`#p${playerId}-ep + .resource-max`)
            };

            if (maxElements.hp) {
                maxElements.hp.textContent = `/${player.maxResources.hp}`;
            }
            if (maxElements.ep) {
                maxElements.ep.textContent = `/${player.maxResources.ep}`;
            }

            // Update expanded board restore buttons
            this.updateExpandedRestoreButtons(playerId);

            // Update collapsed board display
            this.updateCollapsedBoardDisplay(player);
        });
    }

    updateCollapsedBoardDisplay(player) {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;

        const collapsedBoard = document.getElementById(`player-${player.id}-board`);
        if (!collapsedBoard || !collapsedBoard.classList.contains('collapsed')) return;

        // Update max HP/EP displays
        const hpMaxElement = collapsedBoard.querySelector('.collapsed-hp-section .stat-max');
        if (hpMaxElement) {
            hpMaxElement.textContent = `/${player.maxResources.hp}`;
        }

        const epMaxElement = collapsedBoard.querySelector('.collapsed-ep-section .stat-max');
        if (epMaxElement) {
            epMaxElement.textContent = `/${player.maxResources.ep}`;
        }

        // Update restore button states
        this.updateRestoreButtons(player, collapsedBoard);

        // Update popularity track
        const popularityElement = document.getElementById(`p${player.id}-popularity-collapsed`);
        if (popularityElement) {
            popularityElement.textContent = `${player.popularityTrack.pointToken}/${player.popularityTrack.rewardToken}`;
        }

        // Update upgrade progress buttons
        const buttonsDisabled = this.shouldDisablePlayerButtons(player.id);
        const hpMaxed = player.maxResources.hp >= 10;
        const epMaxed = player.maxResources.ep >= 10;

        const hpUpgradeBtn = collapsedBoard.querySelector('.collapsed-hp-section .upgrade-btn');
        if (hpUpgradeBtn) {
            hpUpgradeBtn.textContent = t('board.upgradeProgress', player.upgradeProgress.hp, 3);
            hpUpgradeBtn.disabled = buttonsDisabled || hpMaxed || !player.inventory.some(item => item.name === 'Blood Bag');
        }

        const epUpgradeBtn = collapsedBoard.querySelector('.collapsed-ep-section .upgrade-btn');
        if (epUpgradeBtn) {
            epUpgradeBtn.textContent = t('board.upgradeProgress', player.upgradeProgress.ep, 4);
            epUpgradeBtn.disabled = buttonsDisabled || epMaxed || !player.inventory.some(item => item.name === 'Beer');
        }

        // Update weapon upgrade buttons
        const attackMaxed = player.weapon.currentAttackDice >= 7;
        const defenseMaxed = player.weapon.currentDefenseDice >= 6;
        const canUpgradeAttack = !buttonsDisabled && player.resources.exp >= player.weapon.reqExpAttack && !attackMaxed;
        const canUpgradeDefense = !buttonsDisabled && player.resources.exp >= (player.weapon.reqExpDefense || 3) && !defenseMaxed;

        const attackUpgradeBtn = collapsedBoard.querySelector(`button[onclick*="upgradeWeapon(${player.id}, 'attack')"]`);
        if (attackUpgradeBtn) {
            attackUpgradeBtn.disabled = !canUpgradeAttack;
        }

        const defenseUpgradeBtn = collapsedBoard.querySelector(`button[onclick*="upgradeWeapon(${player.id}, 'defense')"]`);
        if (defenseUpgradeBtn) {
            defenseUpgradeBtn.disabled = !canUpgradeDefense;
        }

        // Update inventory counters
        const bloodBagCount = player.inventory.filter(item => item.name === 'Blood Bag').length;
        const beerCount = player.inventory.filter(item => item.name === 'Beer').length;

        const bloodBagCounter = document.getElementById(`p${player.id}-bloodbag-count`);
        if (bloodBagCounter) {
            bloodBagCounter.textContent = `🩸 ${bloodBagCount}`;
        }

        const beerCounter = document.getElementById(`p${player.id}-beer-count`);
        if (beerCounter) {
            beerCounter.textContent = `🍺 ${beerCount}`;
        }
    }

    updateRestoreButtons(player, collapsedBoard) {
        const buttonsDisabled = this.shouldDisablePlayerButtons(player.id);
        const hasBloodBag = player.inventory.some(item => item.name === 'Blood Bag');
        const hasBeer = player.inventory.some(item => item.name === 'Beer');
        const hpFull = player.resources.hp >= player.maxResources.hp;
        const epFull = player.resources.ep >= player.maxResources.ep;

        // Update HP restore button
        const hpRestoreBtn = collapsedBoard.querySelector('.hp-restore');
        if (hpRestoreBtn) {
            hpRestoreBtn.disabled = buttonsDisabled || !hasBloodBag || hpFull;
            if (!hasBloodBag) {
                hpRestoreBtn.title = 'No Blood Bag available';
            } else if (hpFull) {
                hpRestoreBtn.title = 'HP is already full';
            } else {
                hpRestoreBtn.title = 'Restore HP using Blood Bag';
            }
        }

        // Update EP restore button
        const epRestoreBtn = collapsedBoard.querySelector('.ep-restore');
        if (epRestoreBtn) {
            epRestoreBtn.disabled = buttonsDisabled || !hasBeer || epFull;
            if (!hasBeer) {
                epRestoreBtn.title = 'No Beer available';
            } else if (epFull) {
                epRestoreBtn.title = 'EP is already full';
            } else {
                epRestoreBtn.title = 'Restore EP using Beer';
            }
        }
    }

    updateExpandedRestoreButtons(playerId) {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const buttonsDisabled = this.shouldDisablePlayerButtons(playerId);
        const hasBloodBag = player.inventory.some(item => item.name === 'Blood Bag');
        const hasBeer = player.inventory.some(item => item.name === 'Beer');
        const hpFull = player.resources.hp >= player.maxResources.hp;
        const epFull = player.resources.ep >= player.maxResources.ep;

        // Update HP restore button
        const hpRestoreBtn = document.getElementById(`p${playerId}-hp-restore-btn`);
        if (hpRestoreBtn) {
            hpRestoreBtn.disabled = buttonsDisabled || !hasBloodBag || hpFull;
            if (!hasBloodBag) {
                hpRestoreBtn.title = 'No Blood Bag available';
            } else if (hpFull) {
                hpRestoreBtn.title = 'HP is already full';
            } else {
                hpRestoreBtn.title = 'Restore HP using Blood Bag';
            }
        }

        // Update EP restore button
        const epRestoreBtn = document.getElementById(`p${playerId}-ep-restore-btn`);
        if (epRestoreBtn) {
            epRestoreBtn.disabled = buttonsDisabled || !hasBeer || epFull;
            if (!hasBeer) {
                epRestoreBtn.title = 'No Beer available';
            } else if (epFull) {
                epRestoreBtn.title = 'EP is already full';
            } else {
                epRestoreBtn.title = 'Restore EP using Beer';
            }
        }
    }
    
    // Duplicate methods removed - using the main confirmSelection method below
    
    proceedToNextPhase() {
        console.log('All players have selected locations, proceeding to next phase...');
        this.roundPhase = 'distribution';
        
        // For now, just show a message that selection is complete
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = t('status.allPlayersSelected');
        }
        
        // Hide location selection UI
        const confirmButton = document.getElementById('confirm-selection');
        if (confirmButton) confirmButton.style.display = 'none';
        
        // TODO: Implement resource distribution phase
        console.log('Selection phase complete. Resource distribution not yet implemented.');
    }
    
    // Method to handle missing game state methods
    
    loadStoreItems() {
        // Return basic store items - this can be expanded later
        return [
            { name: 'Beer', price: 2, size: 1 },
            { name: 'Blood Bag', price: 2, size: 1 },
            { name: 'Fake Blood', price: 2, size: 2 },
            { name: 'Grenade', price: 2, size: 2 },
            { name: 'Bomb', price: 4, size: 3 },
            { name: 'Dynamite', price: 6, size: 4 },
            { name: 'Bullet', price: 2, size: 1 },
            { name: 'Battery', price: 2, size: 1 }
        ];
    }
    
    // Solo Play Mode Methods (simplified)
    showSoloPlayMode() {
        // Now directly shows the solo play section since it's the only option
        this.updateSoloModeUI();
    }
    
    
    toggleSlotType(slotIndex) {
        if (!this.soloModeSlots[slotIndex].active) return;
        
        const slot = this.soloModeSlots[slotIndex];
        slot.type = slot.type === 'player' ? 'bot' : 'player';
        
        this.updateSoloModeUI();
    }
    
    activateSlot(slotIndex) {
        const slot = this.soloModeSlots[slotIndex];
        
        if (!slot.active) {
            // Activate the slot
            slot.active = true;
            slot.type = 'player'; // Default to player when activated
            slot.color = 'random'; // Reset to random when activated
            slot.weapon = 'random'; // Reset to random when activated
        } else {
            // Deactivate the slot (close it)
            slot.active = false;
            slot.type = 'closed';
        }
        
        this.updateSoloModeUI();
    }
    
    changeSlotColor(slotIndex, color) {
        if (this.soloModeSlots[slotIndex]) {
            this.soloModeSlots[slotIndex].color = color;
            console.log(`Slot ${slotIndex + 1} color changed to: ${color}`);
            // Update the UI to reflect the color change
            this.updateSoloModeUI();
        }
    }
    
    changeSlotWeapon(slotIndex, weapon) {
        if (this.soloModeSlots[slotIndex]) {
            this.soloModeSlots[slotIndex].weapon = weapon;
            console.log(`Slot ${slotIndex + 1} weapon changed to: ${weapon}`);
            // Update the UI to reflect the weapon change
            this.updateSoloModeUI();
        }
    }
    
    // ==================== SHARED OPTION DEFINITIONS ====================

    getAllColorOptions() {
        return [
            { value: 'random', label: t('color.random'), bg: 'linear-gradient(90deg, #e67e22, #27ae60, #3498db, #9b59b6)', border: '#666' },
            { value: 'orange', label: t('color.orange'), bg: '#e67e22', border: '#d35400' },
            { value: 'green', label: t('color.green'), bg: '#27ae60', border: '#229954' },
            { value: 'blue', label: t('color.blue'), bg: '#3498db', border: '#2980b9' },
            { value: 'purple', label: t('color.purple'), bg: '#9b59b6', border: '#8e44ad' },
            { value: 'red', label: t('color.red'), bg: '#e74c3c', border: '#c0392b' },
            { value: 'yellow', label: t('color.yellow'), bg: '#f5f50a', border: '#828205' },
            { value: 'black', label: t('color.black'), bg: '#000000', border: '#333333' }
        ];
    }

    getAllWeaponOptions() {
        return [
            { value: 'random', label: t('weaponSelect.random') },
            { value: 'Bat', label: t('weapon.bat.name') },
            { value: 'Katana', label: t('weapon.katana.name') },
            { value: 'Rifle', label: t('weapon.rifle.name') },
            { value: 'Plasma', label: t('weapon.plasma.name') },
            { value: 'Chain', label: t('weapon.chain.name') },
            { value: 'Axe', label: t('weapon.axe.name') },
            { value: 'Whip', label: t('weapon.whip.name') },
            { value: 'Bow', label: t('weapon.bow.name') },
            { value: 'Sword', label: t('weapon.sword.name') },
            { value: 'Knife', label: t('weapon.knife.name') },
            { value: 'Gloves', label: t('weapon.gloves.name') }
        ];
    }

    // ==================== ONLINE PREFERENCE UI ====================

    buildOnlinePreferenceUI(role) {
        const containerId = role === 'host' ? 'host-preference-selectors' : 'guest-preference-selectors';
        const container = document.getElementById(containerId);
        if (!container) return;

        const allColorOptions = this.getAllColorOptions();
        const allWeaponOptions = this.getAllWeaponOptions();

        const defaultName = role === 'host' ? t('preferences.host') : t('common.player') + (this.onlineManager.localJoinOrder + 1);
        const selectedColor = allColorOptions.find(opt => opt.value === 'random');
        container.innerHTML = `
            <h3>${t('preferences.title')}</h3>
            <div class="online-preference-row">
                <div class="slot-option">
                    <label>${t('preferences.name')}</label>
                    <input type="text" class="slot-name-input" id="${role}-pref-name"
                           value="${defaultName}" maxlength="12"
                           onchange="game.updateOnlinePreference('name', this.value, '${role}')">
                </div>
                <div class="slot-option">
                    <label>${t('preferences.color')}</label>
                    <div class="color-select-wrapper">
                        <span class="color-indicator" id="${role}-pref-color-indicator" style="background: ${selectedColor.bg}; border: 2px solid ${selectedColor.border};"></span>
                        <select class="slot-color-select" id="${role}-pref-color" onchange="game.updateOnlinePreference('color', this.value, '${role}')">
                            ${allColorOptions.map(opt =>
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="slot-option">
                    <label>${t('preferences.weapon')}</label>
                    <select class="slot-weapon-select" id="${role}-pref-weapon" onchange="game.updateOnlinePreference('weapon', this.value, '${role}')">
                        ${allWeaponOptions.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    toggleGuestReady() {
        if (!this.onlineManager || !this.onlineManager.roomRef) return;
        const localId = this.onlineManager.localId;
        this.guestIsReady = !this.guestIsReady;
        this.onlineManager.roomRef.child(`players/${localId}`).update({ isReady: this.guestIsReady });

        const readyBtn = document.getElementById('guest-ready-btn');
        const statusText = document.getElementById('guest-ready-status');
        const prefSection = document.getElementById('guest-preference-selectors');
        if (this.guestIsReady) {
            if (readyBtn) {
                readyBtn.textContent = t('preferences.notReady');
                readyBtn.classList.add('ready-active');
            }
            if (statusText) statusText.textContent = t('preferences.waitingHost');
            // Lock preference inputs
            if (prefSection) {
                prefSection.querySelectorAll('input, select').forEach(el => el.disabled = true);
            }
        } else {
            if (readyBtn) {
                readyBtn.textContent = t('lobby.guest.ready');
                readyBtn.classList.remove('ready-active');
            }
            if (statusText) statusText.textContent = t('lobby.guest.statusText');
            // Unlock preference inputs
            if (prefSection) {
                prefSection.querySelectorAll('input, select').forEach(el => el.disabled = false);
            }
        }
    }

    updateOnlinePreference(type, value, role) {
        if (!this.onlineManager || !this.onlineManager.roomRef) return;
        const localId = this.onlineManager.localId;
        if (type === 'name') {
            this.onlineManager.roomRef.child(`players/${localId}`).update({ preferredName: value });
            return;
        }
        const key = type === 'color' ? 'preferredColor' : 'preferredWeapon';
        this.onlineManager.roomRef.child(`players/${localId}`).update({ [key]: value });

        // Update color indicator if color changed
        if (type === 'color') {
            const allColorOptions = this.getAllColorOptions();
            const colorOpt = allColorOptions.find(opt => opt.value === value);
            if (colorOpt) {
                const indicator = document.getElementById(`${role}-pref-color-indicator`);
                if (indicator) {
                    indicator.style.background = colorOpt.bg;
                    indicator.style.borderColor = colorOpt.border;
                }
            }
        }
    }

    refreshOnlinePreferenceDropdowns(players, role) {
        const localId = this.onlineManager.localId;
        const allColorOptions = this.getAllColorOptions();
        const allWeaponOptions = this.getAllWeaponOptions();

        // Collect picks from OTHER players
        const takenColors = [];
        const takenWeapons = [];
        for (const [playerId, data] of Object.entries(players)) {
            if (playerId === localId) continue;
            if (data.preferredColor && data.preferredColor !== 'random') {
                takenColors.push(data.preferredColor);
            }
            if (data.preferredWeapon && data.preferredWeapon !== 'random') {
                takenWeapons.push(data.preferredWeapon);
            }
        }

        const localData = players[localId];
        const myColor = localData ? (localData.preferredColor || 'random') : 'random';
        const myWeapon = localData ? (localData.preferredWeapon || 'random') : 'random';

        // Check for race condition: someone else took our pick
        let needReset = false;
        if (myColor !== 'random' && takenColors.includes(myColor)) {
            this.onlineManager.roomRef.child(`players/${localId}`).update({ preferredColor: 'random' });
            needReset = true;
        }
        if (myWeapon !== 'random' && takenWeapons.includes(myWeapon)) {
            this.onlineManager.roomRef.child(`players/${localId}`).update({ preferredWeapon: 'random' });
            needReset = true;
        }
        if (needReset) return; // Will re-fire via listener

        // Update color dropdown
        const colorSelect = document.getElementById(`${role}-pref-color`);
        if (colorSelect) {
            const currentColor = colorSelect.value;
            colorSelect.innerHTML = allColorOptions.map(opt => {
                const taken = opt.value !== 'random' && opt.value !== currentColor && takenColors.includes(opt.value);
                return `<option value="${opt.value}" ${taken ? 'disabled' : ''} ${opt.value === myColor ? 'selected' : ''}>${opt.label}${taken ? ' ' + t('preferences.takenSuffix') : ''}</option>`;
            }).join('');
        }

        // Update weapon dropdown
        const weaponSelect = document.getElementById(`${role}-pref-weapon`);
        if (weaponSelect) {
            const currentWeapon = weaponSelect.value;
            weaponSelect.innerHTML = allWeaponOptions.map(opt => {
                const taken = opt.value !== 'random' && opt.value !== currentWeapon && takenWeapons.includes(opt.value);
                return `<option value="${opt.value}" ${taken ? 'disabled' : ''} ${opt.value === myWeapon ? 'selected' : ''}>${opt.label}${taken ? ' ' + t('preferences.takenSuffix') : ''}</option>`;
            }).join('');
        }

        // Update color indicator
        const colorOpt = allColorOptions.find(opt => opt.value === myColor);
        if (colorOpt) {
            const indicator = document.getElementById(`${role}-pref-color-indicator`);
            if (indicator) {
                indicator.style.background = colorOpt.bg;
                indicator.style.borderColor = colorOpt.border;
            }
        }
    }

    updateWaitingRoomSlots(players, slotListId, totalSlots) {
        const slotList = document.getElementById(slotListId);
        if (!slotList) return;

        const allColorOptions = this.getAllColorOptions();
        const sortedPlayers = Object.entries(players).sort((a, b) => a[1].joinOrder - b[1].joinOrder);

        slotList.innerHTML = '';
        for (let i = 0; i < totalSlots; i++) {
            const li = document.createElement('li');
            if (i < sortedPlayers.length) {
                const [playerId, data] = sortedPlayers[i];
                const isHost = data.joinOrder === 0;
                const isSelf = playerId === this.onlineManager.localId;
                let label = data.preferredName || (isHost ? t('preferences.host') : t('common.player') + ' ' + (i + 1));
                if (isSelf) label += ' ' + t('preferences.youSuffix');

                li.className = 'player-slot connected';

                // Build picks display — always show color + weapon for every connected player
                const prefColor = data.preferredColor || 'random';
                const prefWeapon = data.preferredWeapon || 'random';
                const colorOpt = allColorOptions.find(opt => opt.value === prefColor);
                const colorDot = colorOpt
                    ? `<span class="slot-color-dot" style="background: ${colorOpt.bg}; border: 1px solid ${colorOpt.border};"></span>`
                    : `<span class="slot-color-dot" style="background: linear-gradient(90deg, #e67e22, #27ae60, #3498db, #9b59b6); border: 1px solid #666;"></span>`;
                const colorLabel = colorOpt ? colorOpt.label : t('color.random');
                const weaponLabel = prefWeapon !== 'random' ? this.getWeaponDisplayName(prefWeapon) : t('weaponSelect.random');
                const picksHtml = `<span class="slot-picks">${colorDot} ${colorLabel} · ${weaponLabel}</span>`;

                const readyIcon = data.isReady ? '&#x2705;' : '&#x1F534;';
                li.innerHTML = `${label} <span class="slot-status">${readyIcon}</span>${picksHtml}`;
            } else {
                li.className = 'player-slot pending';
                li.innerHTML = `${t('preferences.slotOpenSimple', i + 1)} <span class="slot-status">&#x23F3;</span>`;
            }
            slotList.appendChild(li);
        }
    }

    // ==================== ONLINE WEAPON/COLOR RESOLUTION ====================

    resolveOnlineWeapons(playerCount, preferences) {
        const availableWeapons = [...this.weapons];
        const selectedWeapons = new Array(playerCount).fill(null);

        // Pass 1: assign explicit (non-random) picks
        for (const [slotIndex, pref] of Object.entries(preferences)) {
            const idx = parseInt(slotIndex);
            if (pref.weapon && pref.weapon !== 'random') {
                const weapon = this.weapons.find(w => w.name === pref.weapon);
                if (weapon) {
                    selectedWeapons[idx] = weapon;
                    const availIdx = availableWeapons.findIndex(w => w.name === weapon.name);
                    if (availIdx !== -1) availableWeapons.splice(availIdx, 1);
                }
            }
        }

        // Pass 2: fill remaining slots from leftover pool
        for (let i = 0; i < playerCount; i++) {
            if (!selectedWeapons[i]) {
                const randomIndex = Math.floor(Math.random() * availableWeapons.length);
                selectedWeapons[i] = availableWeapons.splice(randomIndex, 1)[0];
            }
        }

        console.log('Resolved online weapons:', selectedWeapons.map(w => w.name));
        return selectedWeapons;
    }

    resolveOnlineColors(playerCount, preferences) {
        const colorPalette = [
            { background: '#e67e22', border: '#d35400', name: 'orange' },
            { background: '#27ae60', border: '#229954', name: 'green' },
            { background: '#3498db', border: '#2980b9', name: 'blue' },
            { background: '#9b59b6', border: '#8e44ad', name: 'purple' },
            { background: '#e74c3c', border: '#c0392b', name: 'red' },
            { background: '#f5f50a', border: '#828205', name: 'yellow' },
            { background: '#000000', border: '#333333', name: 'black' }
        ];
        const availableColors = [...colorPalette];
        const playerColors = {};

        // Pass 1: assign explicit picks
        for (const [slotIndex, pref] of Object.entries(preferences)) {
            const idx = parseInt(slotIndex);
            if (pref.color && pref.color !== 'random') {
                const color = colorPalette.find(c => c.name === pref.color);
                if (color) {
                    playerColors[idx + 1] = color;
                    const availIdx = availableColors.findIndex(c => c.name === color.name);
                    if (availIdx !== -1) availableColors.splice(availIdx, 1);
                }
            }
        }

        // Pass 2: fill remaining
        for (let i = 0; i < playerCount; i++) {
            if (!playerColors[i + 1]) {
                const randomIndex = Math.floor(Math.random() * availableColors.length);
                playerColors[i + 1] = availableColors.splice(randomIndex, 1)[0];
            }
        }

        console.log('Resolved online colors:', Object.values(playerColors).map(c => c.name));
        return playerColors;
    }

    updateSoloModeUI() {
        const slots = document.querySelectorAll('#solo-play-section .player-slot');

        const allColorOptions = this.getAllColorOptions();
        const allWeaponOptions = this.getAllWeaponOptions();

        // Get all currently selected colors and weapons (excluding 'random')
        const selectedColors = this.soloModeSlots
            .filter(slot => slot.active && slot.color !== 'random')
            .map(slot => slot.color);

        const selectedWeapons = this.soloModeSlots
            .filter(slot => slot.active && slot.weapon !== 'random')
            .map(slot => slot.weapon);
        
        slots.forEach((slotElement, index) => {
            const slot = this.soloModeSlots[index];

            // Reset classes
            slotElement.classList.remove('active', 'closed', 'bot');

            if (slot.active) {
                slotElement.classList.add('active');
                if (slot.type === 'bot') {
                    slotElement.classList.add('bot');
                }

                // Filter color options to exclude colors selected by other slots
                const availableColorOptions = allColorOptions.filter(opt => {
                    // Always include 'random' option
                    if (opt.value === 'random') return true;
                    // Include the current slot's selected color
                    if (opt.value === slot.color) return true;
                    // Exclude colors selected by other slots
                    return !selectedColors.includes(opt.value) ||
                           this.soloModeSlots.findIndex(s => s.color === opt.value) === index;
                });

                // Build color dropdown with visual indicator
                const selectedColor = allColorOptions.find(opt => opt.value === slot.color);
                const colorDropdown = `
                    <div class="color-select-wrapper">
                        <span class="color-indicator" style="background: ${selectedColor.bg}; border: 2px solid ${selectedColor.border};"></span>
                        <select class="slot-color-select" onchange="game.changeSlotColor(${index}, this.value)">
                            ${availableColorOptions.map(opt =>
                                `<option value="${opt.value}"
                                         ${slot.color === opt.value ? 'selected' : ''}>
                                    ${opt.label}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                `;
                
                // Filter weapon options to exclude weapons selected by other slots
                const availableWeaponOptions = allWeaponOptions.filter(opt => {
                    // Always include 'random' option
                    if (opt.value === 'random') return true;
                    // Include the current slot's selected weapon
                    if (opt.value === slot.weapon) return true;
                    // Exclude weapons selected by other slots
                    return !selectedWeapons.includes(opt.value) ||
                           this.soloModeSlots.findIndex(s => s.weapon === opt.value) === index;
                });

                // Build weapon dropdown
                const weaponDropdown = `
                    <select class="slot-weapon-select" onchange="game.changeSlotWeapon(${index}, this.value)">
                        ${availableWeaponOptions.map(opt =>
                            `<option value="${opt.value}" ${slot.weapon === opt.value ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                `;
                
                // Update content for active slot
                slotElement.innerHTML = `
                    <div class="slot-header">
                        <span class="slot-number">${index + 1}</span>
                        <span class="slot-type">${slot.type === 'player' ? t('common.player') : t('common.bot')}</span>
                    </div>
                    <div class="slot-options">
                        <div class="slot-option">
                            <label>${t('preferences.color')}</label>
                            ${colorDropdown}
                        </div>
                        <div class="slot-option">
                            <label>${t('preferences.weapon')}</label>
                            ${weaponDropdown}
                        </div>
                    </div>
                    <div class="slot-buttons">
                        <button class="slot-toggle" onclick="game.toggleSlotType(${index})">
                            ${slot.type === 'player' ? t('setup.changeToBot') : t('setup.changeToPlayer')}
                        </button>
                        ${index > 0 ? `<button class="slot-remove" onclick="game.activateSlot(${index})">${t('setup.remove')}</button>` : ''}
                    </div>
                `;
            } else {
                slotElement.classList.add('closed');

                // Update content for closed slot
                slotElement.innerHTML = `
                    <span class="slot-number">${index + 1}</span>
                    <span class="slot-status">${t('setup.slot.closed')}</span>
                    <button class="slot-activate" onclick="game.activateSlot(${index})">${t('setup.addPlayer')}</button>
                `;
            }
        });

        // Update ready button state
        const activeSlots = this.soloModeSlots.filter(slot => slot.active);
        const readyButton = document.getElementById('solo-ready-btn');

        if (activeSlots.length >= 2) {
            readyButton.disabled = false;
            readyButton.textContent = t('setup.readyWithCount', activeSlots.length);
        } else {
            readyButton.disabled = true;
            readyButton.textContent = t('setup.readyNeedMore');
        }
    }
    
    startSoloGameWithConfig(botConfiguration) {
        // Direct configuration-based game start for automated mode
        const playerCount = botConfiguration.totalPlayers;
        
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting automated game: ${playerCount} total players (all bots)`);
        }
        
        // Skip UI setup if in automated mode
        if (!this.isAutomatedMode) {
            // Hide selection screen
            const selectionScreen = document.getElementById('player-count-selection');
            if (selectionScreen) selectionScreen.style.display = 'none';
            
            // Show game elements
            this.showGameLog();
            const playerBoards = document.getElementById('player-boards-container');
            const gameBoard = document.querySelector('.game-board');
            const playerArea = document.querySelector('.player-area');
            const gameStatus = document.querySelector('.game-status');
            
            if (playerBoards) playerBoards.style.display = 'grid';
            if (gameBoard) gameBoard.style.display = 'grid';
            if (playerArea) playerArea.style.display = 'block';
            if (gameStatus) gameStatus.style.display = 'block';
        }
        
        // Initialize the game
        this.playerCount = playerCount;
        
        // Log game start
        if (!this.isAutomatedMode) {
            this.addLogEntryT('log.gameStarted', [playerCount], 'round-start');
            this.addLogEntryT('log.roundStarted', [this.currentRound || 1], 'round-start');
        }
        
        // Update location rewards based on player count
        this.updateLocationRewards();
        this.setupDummyTokens(playerCount);
        
        const assignedWeapons = this.getRandomWeapons(playerCount);
        this.playerColors = this.getRandomPlayerColors(playerCount);
        
        // Create players with bot configuration
        this.createPlayers(playerCount, assignedWeapons, botConfiguration);

        // Set game mode (needed for selection/store phase branching)
        const humanCount = this.players.filter(p => !p.isBot).length;
        this.gameMode = humanCount === 1 ? 'simultaneous' : 'turnbased';

        // Initialize player completion status
        this.players.forEach(player => {
            this.playerCompletionStatus[player.id] = false;
        });

        // Start the game
        this.roundPhase = 'selection';
        this.currentPlayerIndex = 0;
        this.pendingSelectionLogs = []; // Clear any pending logs
        
        // Start with bot selections if first player is a bot
        if (this.players[0].isBot) {
            setTimeout(() => {
                this.handleBotLocationSelection(0);
            }, this.getDelay(500));
        } else if (!this.isAutomatedMode) {
            this.createLocationCards();
            this.updateStatusMessage();
        }
    }
    
    startSoloGame() {
        // Count active slots and determine configuration
        const activeSlots = this.soloModeSlots.filter(slot => slot.active);
        const playerCount = activeSlots.length;
        
        // Create bot configuration
        const humanPlayers = activeSlots.filter(slot => slot.type === 'player').length;
        const botCount = activeSlots.filter(slot => slot.type === 'bot').length;
        
        console.log(`Starting solo game: ${playerCount} total players (${humanPlayers} human, ${botCount} bots)`);
        
        // Hide solo play UI
        const selectionScreen = document.getElementById('player-count-selection');
        selectionScreen.style.display = 'none';
        
        // Show game log
        this.showGameLog();
        
        // Show main game area
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');
        
        if (playerBoards) playerBoards.style.display = 'grid';
        if (gameBoard) gameBoard.style.display = 'grid';
        if (playerArea) playerArea.style.display = 'block';
        if (gameStatus) gameStatus.style.display = 'block';
        
        // Initialize the game with bot configuration
        this.playerCount = playerCount;
        
        // Log game start (same as initializeGame)
        this.addLogEntryT('log.gameStarted', [playerCount], 'round-start');
        this.addLogEntryT('log.roundStarted', [this.currentRound || 1], 'round-start');
        
        // Update location rewards based on player count
        this.updateLocationRewards();
        
        this.setupDummyTokens(playerCount);
        
        // Use selected weapons/colors from slots instead of random
        const assignedWeapons = this.getSelectedWeapons();
        console.log('Assigned weapons:', assignedWeapons.map(w => w.name));
        
        this.playerColors = this.getSelectedColors();
        console.log('Assigned colors:', Object.values(this.playerColors).map(c => c.name));
        
        // Create bot configuration based on slot types
        const botConfiguration = {
            humanPlayers: 0,
            botCount: 0,
            slotTypes: activeSlots.map(slot => slot.type)
        };
        
        // Create players with proper bot configuration
        this.createPlayers(playerCount, assignedWeapons, botConfiguration);
        this.createPlayerBoards();
        
        const playerBoardsContainer = document.getElementById('player-boards-container');
        playerBoardsContainer.className = `player-boards players-${playerCount} collapsed`;
        
        this.roundPhase = 'selection';
        this.pendingSelectionLogs = []; // Clear any pending logs
        this.init();
        
        // Force immediate update of main game board location displays (same as Quick Play)
        console.log('Solo game: Forcing location display update after game start...');
        console.log('Solo game: Player count is now:', this.playerCount);
        
        // Call multiple times to ensure it works
        this.updateLocationDisplays();
        setTimeout(() => {
            console.log('Solo game: Attempting location display update with delay...');
            this.updateLocationDisplays();
        }, this.getDelay(100));
        setTimeout(() => {
            console.log('Solo game: Final attempt at location display update...');
            this.updateLocationDisplays();
        }, this.getDelay(1000));
    }
    
    createPlayerBoards() {
        const container = document.getElementById('player-boards-container');
        container.innerHTML = ''; // Clear existing content

        // Default to collapsed view
        this.boardsCollapsed = true;
        container.classList.add('collapsed');

        this.players.forEach(player => {
            const playerBoard = this.createCollapsedPlayerBoardHTML(player);
            container.appendChild(playerBoard);
        });

        // Show the toggle button with correct label
        const toggleBtn = document.getElementById('toggle-boards-btn');
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
            toggleBtn.textContent = t('status.toggleBoardsExpand');
        }
    }
    
    createPlayerBoardHTML(player) {
        const board = document.createElement('div');
        board.className = 'player-board';
        board.id = `player-${player.id}-board`;

        // Add player color as a border
        if (player.color) {
            board.style.borderColor = player.color.border;
            board.style.borderWidth = '3px';
            board.style.borderStyle = 'solid';
        }

        // Check if buttons should be disabled
        const buttonsDisabled = this.shouldDisablePlayerButtons(player.id);
        const disabledAttr = buttonsDisabled ? ' disabled' : '';
        const disabledTitle = buttonsDisabled ? ` title="${t('tooltip.botBoard')}"` : '';

        // Check if upgrade buttons should be disabled (max reached or no items)
        const hpUpgradeDisabled = buttonsDisabled || player.maxResources.hp >= 10 || !player.inventory.some(item => item.name === 'Blood Bag');
        const hpUpgradeAttr = hpUpgradeDisabled ? ' disabled' : '';
        const hpUpgradeTitle = hpUpgradeDisabled ?
            (player.maxResources.hp >= 10 ? ` title="${t('tooltip.hpMax10')}"` : ` title="${t('tooltip.botBoard')}"`) : '';

        const epUpgradeDisabled = buttonsDisabled || player.maxResources.ep >= 10 || !player.inventory.some(item => item.name === 'Beer');
        const epUpgradeAttr = epUpgradeDisabled ? ' disabled' : '';
        const epUpgradeTitle = epUpgradeDisabled ?
            (player.maxResources.ep >= 10 ? ` title="${t('tooltip.epMax10')}"` : ` title="${t('tooltip.botBoard')}"`) : '';

        // Check if restore buttons should be disabled (no items or already full)
        const hpRestoreDisabled = buttonsDisabled || player.resources.hp >= player.maxResources.hp || !player.inventory.some(item => item.name === 'Blood Bag');
        const hpRestoreAttr = hpRestoreDisabled ? ' disabled' : '';
        const epRestoreDisabled = buttonsDisabled || player.resources.ep >= player.maxResources.ep || !player.inventory.some(item => item.name === 'Beer');
        const epRestoreAttr = epRestoreDisabled ? ' disabled' : '';

        // Check if weapon upgrade buttons should be disabled (not enough EXP or maxed)
        const attackMaxed = player.weapon.currentAttackDice >= 7;
        const defenseMaxed = player.weapon.currentDefenseDice >= 6;
        const attackUpgradeDisabled = buttonsDisabled || attackMaxed || player.resources.exp < player.weapon.reqExpAttack;
        const attackUpgradeAttr = attackUpgradeDisabled ? ' disabled' : '';
        const defenseUpgradeDisabled = buttonsDisabled || defenseMaxed || player.resources.exp < (player.weapon.reqExpDefense || 3);
        const defenseUpgradeAttr = defenseUpgradeDisabled ? ' disabled' : '';

        board.innerHTML = `
            <!-- Left Column: HP and EP sections -->
            <div class="board-left-section">
                <!-- HP Section -->
                <div class="hp-section">
                    <div class="stat-header">
                        <span class="stat-label">HP</span>
                        <span class="stat-value" id="p${player.id}-hp">${player.resources.hp}</span>
                        <span class="stat-max">/${player.maxResources.hp}</span>
                        <button class="small-btn" onclick="game.restoreHP(${player.id})"${hpRestoreAttr} id="p${player.id}-hp-restore-btn">+🩸</button>
                    </div>
                    <div class="upgrade-section">
                        <div class="upgrade-bar">
                            <span>${t('board.upgrade')}</span>
                            <span id="p${player.id}-hp-progress">${player.upgradeProgress.hp}/3</span>
                            <button class="small-btn" onclick="game.addToUpgrade(${player.id}, 'hp')"${hpUpgradeAttr}${hpUpgradeTitle}>${t('board.maxUpgrade')}</button>
                        </div>
                        <div class="milestones">
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-6" disabled> ${t('board.milestone6Hp')}</label>
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-8" disabled> ${t('board.milestone8Hp')}</label>
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-10" disabled> ${t('board.milestone10Hp')}</label>
                        </div>
                    </div>
                </div>

                <!-- EP Section -->
                <div class="ep-section">
                    <div class="stat-header">
                        <span class="stat-label">EP</span>
                        <span class="stat-value" id="p${player.id}-ep">${player.resources.ep}</span>
                        <span class="stat-max">/${player.maxResources.ep}</span>
                        <button class="small-btn" onclick="game.restoreEP(${player.id})"${epRestoreAttr} id="p${player.id}-ep-restore-btn">+🍺</button>
                    </div>
                    <div class="upgrade-section">
                        <div class="upgrade-bar">
                            <span>${t('board.upgrade')}</span>
                            <span id="p${player.id}-ep-progress">${player.upgradeProgress.ep}/4</span>
                            <button class="small-btn" onclick="game.addToUpgrade(${player.id}, 'ep')"${epUpgradeAttr}${epUpgradeTitle}>${t('board.maxUpgrade')}</button>
                        </div>
                        <div class="milestones">
                            <label><input type="checkbox" id="p${player.id}-ep-milestone-8" disabled> ${t('board.milestone8Ep')}</label>
                            <label><input type="checkbox" id="p${player.id}-ep-milestone-10" disabled> ${t('board.milestone10Ep')}</label>
                        </div>
                    </div>
                </div>

                <!-- Money Section -->
                <div class="money-section">
                    <div class="stat-header">
                        <span class="stat-label">$</span>
                        <span class="stat-value" id="p${player.id}-money">${player.resources.money}</span>
                        <span class="stat-max">/15</span>
                    </div>
                </div>

                <!-- Capacity Section -->
                <div class="resources-compact">
                    <div class="resource-row">
                        <span class="resource-label">${t('common.capacity')}</span>
                        <span id="p${player.id}-capacity">${player.weapon.capacity}</span>
                    </div>
                </div>

                <!-- Inventory Section -->
                <div class="inventory-compact">
                    <h4>${t('common.inventory')}</h4>
                    <div class="inventory-items" id="p${player.id}-inventory">
                        <!-- Inventory items will be displayed here -->
                    </div>
                </div>
            </div>
            <!-- Center Column: Weapon Section -->
            <div class="board-center-section">
                <div class="weapon-header">
                    <h3 id="p${player.id}-weapon-name">${this.getWeaponDisplayName(player.weapon.name)}</h3>
                    <img id="p${player.id}-weapon-image" class="weapon-image" src="${player.weapon.name.toLowerCase()}.png" alt="${player.weapon.name}">
                    <div class="damage-grid" id="p${player.id}-damage-grid">
                        <!-- Damage grid will be populated by JavaScript -->
                    </div>
                </div>

                <div class="dice-stats">
                    <!-- EXP Counter directly in dice-stats -->
                    <div class="stat-header exp-header">
                        <span class="stat-label">EXP</span>
                        <span class="stat-value" id="p${player.id}-exp">${player.resources.exp}</span>
                        <span class="stat-max">/15</span>
                    </div>
                    <div class="dice-stat">
                        <span>${t('board.attackDice')}</span>
                        <span id="p${player.id}-attack-dice">${player.weapon.currentAttackDice}</span>
                        <button class="small-btn" onclick="game.upgradeWeapon(${player.id}, 'attack')"${attackUpgradeAttr}${disabledTitle}>⚔️</button>
                        <span class="cost">(<span id="p${player.id}-req-exp-attack">${player.weapon.reqExpAttack}</span>EXP)</span>
                    </div>
                    <div class="dice-stat">
                        <span>${t('board.defenseDice')}</span>
                        <span id="p${player.id}-defense-dice">${player.weapon.currentDefenseDice}</span>
                        <button class="small-btn" onclick="game.upgradeWeapon(${player.id}, 'defense')"${defenseUpgradeAttr}${disabledTitle}>🛡️</button>
                        <span class="cost">(<span id="p${player.id}-req-exp-defense">3</span>EXP)</span>
                    </div>
                </div>

                <div class="weapon-ammo" style="display: ${player.weapon.name === 'Rifle' || player.weapon.name === 'Plasma' ? 'block' : 'none'};">
                    <div class="stat rifle-bullets" id="p${player.id}-bullets-stat" style="display: ${player.weapon.name === 'Rifle' ? 'block' : 'none'};">
                        <span>${t('battle.bullets')}</span>
                        <span id="p${player.id}-bullet-count">0/6</span>
                    </div>
                    <div class="stat plasma-batteries" id="p${player.id}-batteries-stat" style="display: ${player.weapon.name === 'Plasma' ? 'block' : 'none'};">
                        <span>${t('battle.batteries')}</span>
                        <span id="p${player.id}-battery-count">0/6</span>
                    </div>
                </div>

                <div class="weapon-power-section">
                    <h4>${t('board.weaponPowerTrack')}</h4>
                    <div class="weapon-power-track">
                        <div class="track-space" data-position="1"></div>
                        <div class="track-space" data-position="2"></div>
                        <div class="track-space upgrade-space" data-position="3">⬆️</div>
                        <div class="track-space" data-position="4"></div>
                        <div class="track-space" data-position="5"></div>
                        <div class="track-space" data-position="6"></div>
                        <div class="track-space upgrade-space" data-position="7">⬆️</div>
                        <div class="track-token" id="p${player.id}-power-token"></div>
                    </div>
                    <div class="power-levels">
                        <div class="power-level active" id="p${player.id}-power-lv1" data-tooltip="${this.getWeaponPowerDesc(player.weapon.name, 1)}">
                            <div class="power-title">${t('board.lv1')}</div>
                            <div class="power-desc" id="p${player.id}-power-desc-1">${this.getWeaponPowerDesc(player.weapon.name, 1)}</div>
                        </div>
                        <div class="power-level" id="p${player.id}-power-lv2" data-tooltip="${this.getWeaponPowerDesc(player.weapon.name, 2)}">
                            <div class="power-title">${t('board.lv2')}</div>
                            <div class="power-desc" id="p${player.id}-power-desc-2">${this.getWeaponPowerDesc(player.weapon.name, 2)}</div>
                        </div>
                        <div class="power-level" id="p${player.id}-power-lv3" data-tooltip="${this.getWeaponPowerDesc(player.weapon.name, 3)}">
                            <div class="power-title">${t('board.lv3')}</div>
                            <div class="power-desc" id="p${player.id}-power-desc-3">${this.getWeaponPowerDesc(player.weapon.name, 3)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Player info, Popularity, Pet -->
            <div class="board-right-section">
                <div class="player-info-compact">
                    <h3 id="player-${player.id}-name">
                        ${player.color ? `<span class="player-color-indicator" style="background-color: ${player.color.background}; border-color: ${player.color.border};"></span>` : ''}
                        ${this.getPlayerDisplayName(player)}
                    </h3>
                    <div class="score-display">
                        <span>${t('board.score')}</span>
                        <span id="p${player.id}-score">${player.score}</span>
                    </div>
                </div>

                <div class="popularity-section">
                    <h4>${t('board.popularityTrack')}</h4>
                    <div class="popularity-track-compact" id="p${player.id}-popularity-track">
                        <!-- Popularity track will be displayed here -->
                    </div>
                </div>

                <div class="pet-section-compact">
                    <h4>${t('board.pet')}</h4>
                    <div class="pet-display">
                        <div class="pet-row">
                            <span>${t('board.lv1')}:</span>
                            <span id="p${player.id}-pet-lv1">${player.pets?.level1 || 0}</span>
                        </div>
                        <div class="pet-row">
                            <span>${t('board.lv2')}:</span>
                            <span id="p${player.id}-pet-lv2">${player.pets?.level2 || 0}</span>
                        </div>
                        <div class="pet-row">
                            <span>${t('board.lv3')}:</span>
                            <span id="p${player.id}-pet-lv3">${player.pets?.level3 || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return board;
    }

    createCollapsedPlayerBoardHTML(player) {
        const board = document.createElement('div');
        board.className = 'player-board collapsed';
        board.id = `player-${player.id}-board`;

        // Add player color as a border
        if (player.color) {
            board.style.borderColor = player.color.border;
            board.style.borderWidth = '3px';
            board.style.borderStyle = 'solid';
        }

        // Check if buttons should be disabled
        const buttonsDisabled = this.shouldDisablePlayerButtons(player.id);
        const disabledAttr = buttonsDisabled ? ' disabled' : '';
        const disabledTitle = buttonsDisabled ? ` title="${t('tooltip.botBoard')}"` : '';

        // Check if upgrade buttons should be disabled (max reached or no items)
        const hpUpgradeDisabled = buttonsDisabled || player.maxResources.hp >= 10 || !player.inventory.some(item => item.name === 'Blood Bag');
        const hpUpgradeAttr = hpUpgradeDisabled ? ' disabled' : '';
        const hpUpgradeTitle = hpUpgradeDisabled ?
            (player.maxResources.hp >= 10 ? ` title="${t('tooltip.hpMax10')}"` : ` title="${t('tooltip.botBoard')}"`) : '';

        const epUpgradeDisabled = buttonsDisabled || player.maxResources.ep >= 10 || !player.inventory.some(item => item.name === 'Beer');
        const epUpgradeAttr = epUpgradeDisabled ? ' disabled' : '';
        const epUpgradeTitle = epUpgradeDisabled ?
            (player.maxResources.ep >= 10 ? ` title="${t('tooltip.epMax10')}"` : ` title="${t('tooltip.botBoard')}"`) : '';

        // Check if restore buttons should be disabled
        const hpRestoreDisabled = buttonsDisabled || player.resources.hp >= player.maxResources.hp || !player.inventory.some(item => item.name === 'Blood Bag');
        const hpRestoreAttr = hpRestoreDisabled ? ' disabled' : '';
        const hpRestoreTitle = hpRestoreDisabled ?
            (player.resources.hp >= player.maxResources.hp ? ` title="${t('tooltip.hpFull')}"` : !player.inventory.some(item => item.name === 'Blood Bag') ? ` title="${t('tooltip.noBloodBag')}"` : ` title="${t('tooltip.botBoard')}"`) : ` title="${t('tooltip.restoreHP')}"`;

        const epRestoreDisabled = buttonsDisabled || player.resources.ep >= player.maxResources.ep || !player.inventory.some(item => item.name === 'Beer');
        const epRestoreAttr = epRestoreDisabled ? ' disabled' : '';
        const epRestoreTitle = epRestoreDisabled ?
            (player.resources.ep >= player.maxResources.ep ? ` title="${t('tooltip.epFull')}"` : !player.inventory.some(item => item.name === 'Beer') ? ` title="${t('tooltip.noBeer')}"` : ` title="${t('tooltip.botBoard')}"`) : ` title="${t('tooltip.restoreEP')}"`;

        // Check if weapon upgrade buttons should be disabled (not enough EXP or maxed)
        const attackMaxed = player.weapon.currentAttackDice >= 7;
        const defenseMaxed = player.weapon.currentDefenseDice >= 6;
        const attackUpgradeDisabled = buttonsDisabled || attackMaxed || player.resources.exp < player.weapon.reqExpAttack;
        const attackUpgradeAttr = attackUpgradeDisabled ? ' disabled' : '';
        const defenseUpgradeDisabled = buttonsDisabled || defenseMaxed || player.resources.exp < (player.weapon.reqExpDefense || 3);
        const defenseUpgradeAttr = defenseUpgradeDisabled ? ' disabled' : '';

        // Calculate current inventory size for capacity display
        const currentInventorySize = this.getInventorySize(player);

        board.innerHTML = `
            <!-- Player Name and Score Header -->
            <div class="collapsed-header">
                <h3 class="collapsed-player-name">
                    ${player.color ? `<span class="player-color-indicator" style="background-color: ${player.color.background}; border-color: ${player.color.border};"></span>` : ''}
                    ${this.getPlayerDisplayName(player)}
                </h3>
                <div class="collapsed-score">
                    <span class="score-label">${t('board.score')}</span>
                    <span class="score-value" id="p${player.id}-score">${player.score}</span>
                </div>
                <div class="collapsed-weapon">
                    <span id="p${player.id}-weapon-name">${this.getWeaponDisplayName(player.weapon.name)}</span>
                </div>
            </div>

            <!-- Left Column: HP and EP -->
            <div class="collapsed-left-col">
                <!-- HP Section -->
                <div class="collapsed-hp-section">
                    <div class="collapsed-stat-header">
                        <span class="stat-label">HP</span>
                        <span class="stat-value" id="p${player.id}-hp">${player.resources.hp}</span>
                        <span class="stat-max">/${player.maxResources.hp}</span>
                        <span class="inventory-counter" id="p${player.id}-bloodbag-count">🩸 ${player.inventory.filter(item => item.name === 'Blood Bag').length}</span>
                    </div>
                    <div class="collapsed-buttons">
                        <button class="collapsed-btn upgrade-btn" onclick="game.addToUpgrade(${player.id}, 'hp')"${hpUpgradeAttr}${hpUpgradeTitle}>${t('board.upgradeProgress', player.upgradeProgress.hp, 3)}</button>
                        <button class="collapsed-btn restore-btn hp-restore" onclick="game.restoreHP(${player.id})"${hpRestoreAttr}${hpRestoreTitle}>+🩸</button>
                    </div>
                </div>

                <!-- EP Section -->
                <div class="collapsed-ep-section">
                    <div class="collapsed-stat-header">
                        <span class="stat-label">EP</span>
                        <span class="stat-value" id="p${player.id}-ep">${player.resources.ep}</span>
                        <span class="stat-max">/${player.maxResources.ep}</span>
                        <span class="inventory-counter" id="p${player.id}-beer-count">🍺 ${player.inventory.filter(item => item.name === 'Beer').length}</span>
                    </div>
                    <div class="collapsed-buttons">
                        <button class="collapsed-btn upgrade-btn" onclick="game.addToUpgrade(${player.id}, 'ep')"${epUpgradeAttr}${epUpgradeTitle}>${t('board.upgradeProgress', player.upgradeProgress.ep, 4)}</button>
                        <button class="collapsed-btn restore-btn ep-restore" onclick="game.restoreEP(${player.id})"${epRestoreAttr}${epRestoreTitle}>+🍺</button>
                    </div>
                </div>

                <!-- Money and Capacity -->
                <div class="collapsed-resources">
                    <div class="collapsed-resource-row">
                        <span class="resource-label">$</span>
                        <span class="resource-value" id="p${player.id}-money">${player.resources.money}</span>
                        <span class="resource-max">/15</span>
                    </div>
                    <div class="collapsed-resource-row">
                        <span class="resource-label">${t('common.capacity')}</span>
                        <span class="resource-value" id="p${player.id}-capacity">${currentInventorySize}/${player.maxInventoryCapacity}</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: EXP and Dice -->
            <div class="collapsed-right-col">
                <!-- EXP and Dice Section -->
                <div class="collapsed-exp-section">
                    <div class="collapsed-stat-header">
                        <span class="stat-label">EXP</span>
                        <span class="stat-value" id="p${player.id}-exp">${player.resources.exp}</span>
                        <span class="stat-max">/15</span>
                    </div>
                    <!-- Attack Dice -->
                    <div class="collapsed-dice-row">
                        <span class="dice-icon">⚔️</span>
                        <span class="dice-value" id="p${player.id}-attack-dice">${player.weapon.currentAttackDice}</span>
                        <button class="collapsed-btn upgrade-btn" onclick="game.upgradeWeapon(${player.id}, 'attack')"${attackUpgradeAttr}${disabledTitle}>${t('board.upgradeShort')} (<span id="p${player.id}-req-exp-attack">${player.weapon.reqExpAttack}</span>)</button>
                    </div>
                    <!-- Defense Dice -->
                    <div class="collapsed-dice-row">
                        <span class="dice-icon">🛡️</span>
                        <span class="dice-value" id="p${player.id}-defense-dice">${player.weapon.currentDefenseDice}</span>
                        <button class="collapsed-btn upgrade-btn" onclick="game.upgradeWeapon(${player.id}, 'defense')"${defenseUpgradeAttr}${disabledTitle}>${t('board.upgradeShort')} (<span id="p${player.id}-req-exp-defense">${player.weapon.reqExpDefense || 3}</span>)</button>
                    </div>
                </div>

                <!-- Popularity Track -->
                <div class="collapsed-popularity-section">
                    <span class="popularity-label">${t('board.popularity')}</span>
                    <span class="popularity-value" id="p${player.id}-popularity-collapsed">${player.popularityTrack.pointToken}/${player.popularityTrack.rewardToken}</span>
                </div>

                <!-- Pet Display -->
                <div class="collapsed-pet-section">
                    <span class="pet-label">${t('board.petLabel')}</span>
                    <div class="collapsed-pet-counts">
                        <span class="pet-count-item">${t('board.lv1')}: <span id="p${player.id}-pet-lv1">${player.pets?.level1 || 0}</span></span>
                        <span class="pet-count-item">${t('board.lv2')}: <span id="p${player.id}-pet-lv2">${player.pets?.level2 || 0}</span></span>
                        <span class="pet-count-item">${t('board.lv3')}: <span id="p${player.id}-pet-lv3">${player.pets?.level3 || 0}</span></span>
                    </div>
                </div>
            </div>
        `;

        return board;
    }

    restoreHP(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Only allow interacting with own player in online mode
        if (this.gameMode === 'online' && playerId !== this.localPlayerId && !this.suppressAlerts) return;

        // Online non-host: send action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'player_board_action',
                playerId: playerId,
                data: { action: 'restoreHP' }
            });
            return;
        }

        // Check if HP is already full
        if (player.resources.hp >= player.maxResources.hp) {
            if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.hpFull'));
            return;
        }

        // Check if player has blood bag
        const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
        if (bloodBagIndex === -1) {
            if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.noBloodBag'));
            return;
        }

        // Use blood bag to restore 1 HP
        player.inventory.splice(bloodBagIndex, 1);
        this.modifyResource(playerId, 'hp', 1);
        this.addLogEntryT('log.usedBloodBag', [player, player.resources.hp, player.maxResources.hp], 'system', player);

        // Update displays
        this.updateResourceDisplay(playerId);
        this.updateInventoryDisplay(playerId);

        // Refresh the player board to update button states
        if (this.boardsCollapsed) {
            this.refreshPlayerBoard(playerId);
        }

        // Refresh store display if in store phase to update capacity warnings
        // But don't re-show the store if the player already finished shopping
        if (this.roundPhase === 'store') {
            if (this.gameMode === 'online') {
                // Only refresh store for the local player, not remote players, and only if still shopping
                if (player.id === this.localPlayerId && !this.playerCompletionStatus[this.localPlayerId]) {
                    this.showStoreForPlayer(player);
                }
            } else if (this.gameMode === 'simultaneous') {
                this.showStoreForPlayer(player);
            } else {
                this.showStore();
            }
        }

        // Online host: push state so all players see the update
        if (this.gameMode === 'online' && this.isHost) {
            this.pushOnlineBoardUpdate();
        }
    }

    restoreEP(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Only allow interacting with own player in online mode
        if (this.gameMode === 'online' && playerId !== this.localPlayerId && !this.suppressAlerts) return;

        // Online non-host: send action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'player_board_action',
                playerId: playerId,
                data: { action: 'restoreEP' }
            });
            return;
        }

        // Check if EP is already full
        if (player.resources.ep >= player.maxResources.ep) {
            if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.epFull'));
            return;
        }

        // Check if player has beer
        const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
        if (beerIndex === -1) {
            if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.noBeer'));
            return;
        }

        // Use beer to restore 1 EP
        player.inventory.splice(beerIndex, 1);
        this.modifyResource(playerId, 'ep', 1);
        this.addLogEntryT('log.usedBeer', [player, player.resources.ep, player.maxResources.ep], 'system', player);

        // Update displays
        this.updateResourceDisplay(playerId);
        this.updateInventoryDisplay(playerId);

        // Refresh the player board to update button states
        if (this.boardsCollapsed) {
            this.refreshPlayerBoard(playerId);
        }

        // Refresh store display if in store phase to update capacity warnings
        // But don't re-show the store if the player already finished shopping
        if (this.roundPhase === 'store') {
            if (this.gameMode === 'online') {
                // Only refresh store for the local player, not remote players, and only if still shopping
                if (player.id === this.localPlayerId && !this.playerCompletionStatus[this.localPlayerId]) {
                    this.showStoreForPlayer(player);
                }
            } else if (this.gameMode === 'simultaneous') {
                this.showStoreForPlayer(player);
            } else {
                this.showStore();
            }
        }

        // Online host: push state so all players see the update
        if (this.gameMode === 'online' && this.isHost) {
            this.pushOnlineBoardUpdate();
        }
    }

    refreshPlayerBoard(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const container = document.getElementById('player-boards-container');
        const oldBoard = document.getElementById(`player-${playerId}-board`);

        if (!oldBoard || !container) return;

        // Create new board based on current collapse state
        const newBoard = this.boardsCollapsed ?
            this.createCollapsedPlayerBoardHTML(player) :
            this.createPlayerBoardHTML(player);

        // Replace old board with new one
        container.replaceChild(newBoard, oldBoard);

        // Update common displays for this player
        this.updateResourceDisplay(playerId);

        // Only update expanded-view elements if not collapsed
        if (!this.boardsCollapsed) {
            this.updateInventoryDisplay(playerId);
            this.updateDamageGrid(playerId);
            this.updatePopularityTrackDisplay(playerId);
            if (typeof this.updatePowerTrackPosition === 'function') {
                this.updatePowerTrackPosition(playerId);
            }
            this.updateMilestoneCheckboxes(playerId);
        }
    }

    toggleAllPlayerBoards() {
        // Toggle the collapse state
        this.boardsCollapsed = !this.boardsCollapsed;

        const container = document.getElementById('player-boards-container');
        if (!container) return;

        // Toggle the collapsed class on the container
        if (this.boardsCollapsed) {
            container.classList.add('collapsed');
        } else {
            container.classList.remove('collapsed');
        }

        // Replace all player boards with new versions
        this.players.forEach(player => {
            const oldBoard = document.getElementById(`player-${player.id}-board`);
            if (!oldBoard) return;

            const newBoard = this.boardsCollapsed ?
                this.createCollapsedPlayerBoardHTML(player) :
                this.createPlayerBoardHTML(player);

            container.replaceChild(newBoard, oldBoard);

            // Update common displays for this player
            this.updateResourceDisplay(player.id);

            // Only update expanded-view elements if not collapsed
            if (!this.boardsCollapsed) {
                this.updateInventoryDisplay(player.id);
                this.updateDamageGrid(player.id);
                this.updatePopularityTrackDisplay(player.id);
                if (typeof this.updatePowerTrackPosition === 'function') {
                    this.updatePowerTrackPosition(player.id);
                }
                this.updateMilestoneCheckboxes(player.id);
            }
        });

        // Update the toggle button text
        const toggleBtn = document.getElementById('toggle-boards-btn');
        if (toggleBtn) {
            toggleBtn.textContent = this.boardsCollapsed ? t('status.toggleBoardsExpand') : t('status.toggleBoards');
        }
    }

    getRandomWeapons(count) {
        // Create a copy of weapons array to avoid modifying original
        const availableWeapons = [...this.weapons];
        const selectedWeapons = [];
        
        for (let i = 0; i < count; i++) {
            // Get random index from remaining weapons
            const randomIndex = Math.floor(Math.random() * availableWeapons.length);
            // Remove and add the selected weapon
            selectedWeapons.push(availableWeapons.splice(randomIndex, 1)[0]);
        }
        
        console.log('Randomly assigned weapons:', selectedWeapons.map(w => w.name));
        return selectedWeapons;
    }
    
    getSelectedWeapons() {
        const activeSlots = this.soloModeSlots.filter(slot => slot.active);
        const availableWeapons = [...this.weapons];
        const selectedWeapons = [];
        
        // First pass: assign non-random selections
        const nonRandomSelections = [];
        activeSlots.forEach((slot, index) => {
            if (slot.weapon !== 'random') {
                // Find the weapon object
                const weapon = this.weapons.find(w => w.name === slot.weapon);
                if (weapon) {
                    selectedWeapons[index] = weapon;
                    nonRandomSelections.push(weapon.name);
                    // Remove from available weapons
                    const availIndex = availableWeapons.findIndex(w => w.name === weapon.name);
                    if (availIndex !== -1) {
                        availableWeapons.splice(availIndex, 1);
                    }
                }
            }
        });
        
        // Second pass: assign random weapons from remaining pool
        activeSlots.forEach((slot, index) => {
            if (slot.weapon === 'random' && !selectedWeapons[index]) {
                if (availableWeapons.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableWeapons.length);
                    selectedWeapons[index] = availableWeapons[randomIndex];
                    availableWeapons.splice(randomIndex, 1);
                } else {
                    // If no weapons left, use a random weapon from full list (shouldn't happen with 11 weapons and max 4 players)
                    const randomIndex = Math.floor(Math.random() * this.weapons.length);
                    selectedWeapons[index] = this.weapons[randomIndex];
                }
            }
        });
        
        console.log('Selected weapons:', selectedWeapons.map(w => w.name));
        return selectedWeapons;
    }
    
    getSelectedColors() {
        const activeSlots = this.soloModeSlots.filter(slot => slot.active);
        const colorPalette = [
            { background: '#e67e22', border: '#d35400', name: 'orange' },
            { background: '#27ae60', border: '#229954', name: 'green' },
            { background: '#3498db', border: '#2980b9', name: 'blue' },
            { background: '#9b59b6', border: '#8e44ad', name: 'purple' },
            { background: '#e74c3c', border: '#c0392b', name: 'red' },
            { background: '#f5f50a', border: '#828205', name: 'yellow' },
            { background: '#000000', border: '#333333', name: 'black' }
        ];
        
        const availableColors = [...colorPalette];
        const playerColors = {};
        
        // First pass: assign non-random selections
        const nonRandomSelections = [];
        activeSlots.forEach((slot, index) => {
            if (slot.color !== 'random') {
                const color = colorPalette.find(c => c.name === slot.color);
                if (color) {
                    playerColors[index + 1] = color;
                    nonRandomSelections.push(color.name);
                    // Remove from available colors
                    const availIndex = availableColors.findIndex(c => c.name === color.name);
                    if (availIndex !== -1) {
                        availableColors.splice(availIndex, 1);
                    }
                }
            }
        });
        
        // Second pass: assign random colors from remaining pool
        activeSlots.forEach((slot, index) => {
            if (slot.color === 'random' && !playerColors[index + 1]) {
                if (availableColors.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableColors.length);
                    playerColors[index + 1] = availableColors[randomIndex];
                    availableColors.splice(randomIndex, 1);
                } else {
                    // If no colors left, use a random color from full palette
                    const randomIndex = Math.floor(Math.random() * colorPalette.length);
                    playerColors[index + 1] = colorPalette[randomIndex];
                }
            }
        });
        
        console.log('Selected colors:', Object.values(playerColors).map(c => c.name));
        return playerColors;
    }
    
    // Duplicate init() function removed - was overriding the main init() function
    
    get currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    createLocationCards() {
        const hunterCardsContainer = document.getElementById('hunter-cards');
        const apprenticeCardsContainer = document.getElementById('apprentice-cards');
        
        if (!hunterCardsContainer || !apprenticeCardsContainer) {
            console.error('Card containers not found!');
            return;
        }
        
        console.log(`Creating location cards for ${this.currentPlayer.name}, dummy tokens at:`, this.dummyTokens);
        
        // Clear existing cards
        hunterCardsContainer.innerHTML = '';
        apprenticeCardsContainer.innerHTML = '';
        
        // Create cards for each location
        this.locations.forEach(location => {
            // Hunter card
            const hunterCard = this.createCard(location, 'hunter');
            hunterCardsContainer.appendChild(hunterCard);
            
            // Apprentice card
            const apprenticeCard = this.createCard(location, 'apprentice');
            apprenticeCardsContainer.appendChild(apprenticeCard);
        });
        
        // Force containers to be visible
        hunterCardsContainer.style.display = 'flex';
        apprenticeCardsContainer.style.display = 'flex';
        
        console.log('Cards created and forced visible - Hunter:', hunterCardsContainer.children.length, 'Apprentice:', apprenticeCardsContainer.children.length);

        // Update Forest button status based on EP and ammunition
        this.updateForestButtonStatus();

        // Sync apprentice forest card state with current hunter selection
        if (this.currentPlayer && this.currentPlayer.selectedCards) {
            const hunterSelection = this.currentPlayer.selectedCards.hunter;
            const apprenticeForestCard = document.querySelector(`#apprentice-cards .location-card[data-location-id="7"]`);

            if (apprenticeForestCard) {
                if (hunterSelection === 7) {
                    // Hunter has Forest selected -> enable apprentice Forest
                    apprenticeForestCard.classList.remove('disabled');
                    apprenticeForestCard.title = 'Hunter is going to Forest';
                    apprenticeForestCard.style.cursor = 'pointer';
                    // Set default enabled card styling
                    apprenticeForestCard.style.backgroundColor = '#ecf0f1';
                    apprenticeForestCard.style.color = '#2c3e50';
                    apprenticeForestCard.style.border = '3px solid #95a5a6';
                    apprenticeForestCard.style.opacity = '1';
                    apprenticeForestCard.style.pointerEvents = '';
                } else {
                    // Hunter hasn't selected Forest (or selected something else) -> keep apprentice Forest disabled (match dummy-blocked styling)
                    apprenticeForestCard.classList.add('disabled');
                    apprenticeForestCard.title = 'Forest only available if Hunter selects Forest';
                    apprenticeForestCard.style.cursor = 'not-allowed';
                    apprenticeForestCard.style.pointerEvents = 'none';
                    // Apply same styling as dummy-blocked cards
                    apprenticeForestCard.style.backgroundColor = '#7f8c8d';
                    apprenticeForestCard.style.borderColor = '#95a5a6';
                    apprenticeForestCard.style.opacity = '0.5';
                }
            }
        }
    }
    
    createCard(location, tokenType) {
        const card = document.createElement('div');
        card.className = `location-card ${tokenType}-card`;
        card.dataset.locationId = location.id;
        card.dataset.location = location.id; // Add data-location attribute for Forest button queries
        card.dataset.tokenType = tokenType;

        // Create location icon mapping
        const locationIcons = {
            'Work Site': 'work_site.png',
            'Station': 'station.png',
            'Dojo': 'dojo.png',
            'Plaza': 'plaza.png',
            'Bar': 'bar.png',
            'Hospital': 'hospital.png',
            'Forest': 'forest.png'
        };

        // Add icon image
        const icon = document.createElement('img');
        icon.src = locationIcons[location.name] || '';
        icon.alt = location.name;
        icon.className = 'location-icon';
        card.appendChild(icon);

        // Add location name text
        const nameSpan = document.createElement('span');
        nameSpan.textContent = this.getLocationDisplayName(location.name);
        card.appendChild(nameSpan);

        // Force basic styling to ensure visibility, but allow CSS classes to override
        card.style.width = '150px';
        card.style.height = '50px';
        card.style.borderRadius = '8px';
        card.style.display = 'flex';
        card.style.flexDirection = 'row';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.gap = '6px';
        card.style.fontWeight = 'bold';
        // Don't set cursor here - let CSS handle it based on disabled state
        card.style.margin = '5px';
        card.style.textAlign = 'center';
        card.style.fontSize = '12px';
        card.style.transition = 'all 0.3s ease';
        
        // Check if location has a dummy token - disable for both hunters and apprentices
        let isDisabled = false;
        
        // Check dummy tokens (locations 2, 4, 6 initially)
        const hasDummyToken = this.dummyTokens && Array.isArray(this.dummyTokens) && this.dummyTokens.includes(location.id);
        
        console.log(`${this.currentPlayer.name} - ${tokenType} card for location ${location.id}: hasDummyToken=${hasDummyToken}, dummyTokens=`, this.dummyTokens);
        
        if (hasDummyToken) {
            console.log(`DISABLING: ${this.currentPlayer.name}'s ${tokenType} card for location ${location.id}`);
            card.classList.add('disabled');
            card.title = 'Location occupied by dummy token';
            isDisabled = true;
        } else if (!this.dummyTokens) {
            console.error('WARNING: dummyTokens is not defined!');
        }
        // Check Forest requirements for hunter cards (only if not already disabled by dummy token)
        else if (tokenType === 'hunter' && location.id === 7) {
            if (this.currentPlayer.resources.ep < 2) { // Forest requires at least 2 EP
                card.classList.add('disabled');
                card.title = 'Requires at least 2 EP';
                isDisabled = true;
            }
            // Note: Ammunition requirement removed - players can enter without ammo but will get warning popup
        }
        // Check Forest for apprentice cards - disabled by default, only enabled when hunter selects it
        else if (tokenType === 'apprentice' && location.id === 7) {
            card.classList.add('disabled');
            card.title = 'Forest only available if Hunter selects Forest';
            isDisabled = true;
        }
        
        // Only set default colors if not disabled
        if (!isDisabled && !card.classList.contains('selected')) {
            card.style.backgroundColor = '#ecf0f1';
            card.style.color = '#2c3e50';
            card.style.border = '3px solid #95a5a6';
            card.style.cursor = 'pointer';
        }
        
        // Bind the click handler with proper context
        card.addEventListener('click', this.selectCard.bind(this, location.id, tokenType));
        
        return card;
    }
    
    updateForestButtonStatus() {
        // Update Forest button enable/disable status based on current player's EP and ammunition
        if (this.roundPhase !== 'selection' || !this.currentPlayer) return;
        
        const forestCards = document.querySelectorAll('.hunter-card[data-location="7"]');
        forestCards.forEach(card => {
            // Check EP requirement
            const hasEnoughEP = this.currentPlayer.resources.ep >= 2;
            
            // Check ammunition for Rifle and Plasma weapons
            let hasAmmo = true;
            if (this.currentPlayer.weapon.name === 'Rifle') {
                const bulletCount = this.currentPlayer.inventory.filter(inv => inv.name === 'Bullet').length;
                hasAmmo = bulletCount > 0 || this.currentPlayer.weapon.powerTrackPosition >= 7; // Rifle Lv3 has infinite ammo
            } else if (this.currentPlayer.weapon.name === 'Plasma') {
                const batteryCount = this.currentPlayer.inventory.filter(inv => inv.name === 'Battery').length;
                hasAmmo = batteryCount > 0;
            }
            
            // Update card status
            if (!hasEnoughEP) {
                card.classList.add('disabled');
                card.title = 'Requires at least 2 EP';
                card.style.backgroundColor = '#ecf0f1';
                card.style.color = '#95a5a6';
                card.style.border = '3px solid #bdc3c7';
                card.style.cursor = 'not-allowed';
            } else if (!hasAmmo) {
                // Note: Players can still enter without ammo but will get warning popup
                card.classList.remove('disabled');
                card.title = 'Warning: No ammunition available';
                card.style.cursor = 'pointer';
            } else {
                card.classList.remove('disabled');
                card.title = '';
                card.style.cursor = 'pointer';
            }
            
            // Apply appropriate colors if not selected
            if (!card.classList.contains('selected') && !card.classList.contains('disabled')) {
                card.style.backgroundColor = '#ecf0f1';
                card.style.color = '#2c3e50';
                card.style.border = '3px solid #95a5a6';
            }
        });
    }
    
    getRandomPlayerColors(playerCount = 2) {
        // Define available color palette - ensure we have enough colors
        const colorPalette = [
            { background: '#e67e22', border: '#d35400', name: 'Orange' },
            { background: '#27ae60', border: '#229954', name: 'Green' },
            { background: '#3498db', border: '#2980b9', name: 'Blue' },
            { background: '#9b59b6', border: '#8e44ad', name: 'Purple' },
            { background: '#e74c3c', border: '#c0392b', name: 'Red' },
            { background: '#f5f50a', border: '#828205', name: 'Yellow' },
            { background: '#000000', border: '#333333', name: 'Black' }
        ];
        
        // Ensure we have enough colors for the player count
        if (playerCount > colorPalette.length) {
            console.error(`Not enough colors for ${playerCount} players! Max supported: ${colorPalette.length}`);
            playerCount = colorPalette.length;
        }
        
        console.log(`Assigning ${playerCount} unique colors from palette:`, colorPalette.map(c => c.name));
        
        // Use a more robust method to ensure unique colors
        const selectedColors = [];
        const availableColors = [...colorPalette];
        
        // Select random colors without replacement
        for (let i = 0; i < playerCount; i++) {
            const randomIndex = Math.floor(Math.random() * availableColors.length);
            const selectedColor = availableColors.splice(randomIndex, 1)[0];
            selectedColors.push(selectedColor);
            console.log(`Player ${i + 1} assigned:`, selectedColor.name);
        }
        
        // Build the player colors object
        const playerColors = {};
        for (let i = 0; i < playerCount; i++) {
            playerColors[i + 1] = selectedColors[i];
        }
        
        // Final verification (this should always pass now)
        const assignedColorNames = selectedColors.map(c => c.name);
        const uniqueColorNames = [...new Set(assignedColorNames)];
        
        if (assignedColorNames.length !== uniqueColorNames.length) {
            console.error('❌ CRITICAL ERROR: Duplicate colors detected!');
            console.error('This should never happen with the new algorithm');
        } else {
            console.log('✅ All players guaranteed unique colors:', assignedColorNames);
        }
        
        return playerColors;
    }
    
    getPlayerColors(playerId) {
        // Return the randomly assigned colors for this game
        // Note: playerColors uses 1-based indexing while playerId is 0-based
        return this.playerColors[playerId + 1] || {
            background: '#f39c12',
            border: '#e67e22'
        };
    }
    
    applyPlayerNameColors() {
        // Apply randomized colors to player name headers and level display
        this.players.forEach(player => {
            const playerColors = this.getPlayerColors(player.id);
            const nameElement = document.getElementById(`player-${player.id}-name`);
            if (nameElement) {
                nameElement.style.color = playerColors.background;
                nameElement.style.textShadow = `1px 1px 2px ${playerColors.border}`;
                console.log(`Applied color ${playerColors.background} to player ${player.id} name`);
                
                // Also apply color to level display within the name element
                const levelElement = nameElement.querySelector('.level-display');
                if (levelElement) {
                    levelElement.style.color = playerColors.background;
                }
            }
        });
    }
    
    selectCard(locationId, tokenType) {
        if (this.roundPhase !== 'selection') return;
        
        console.log(`Attempting to select location ${locationId} for ${tokenType}`);
        
        // Check if this card is disabled (already selected by the other token type)
        const clickedCard = document.querySelector(`#${tokenType}-cards .location-card[data-location-id="${locationId}"]`);
        if (clickedCard.classList.contains('disabled')) {
            console.log(`Location ${locationId} is disabled for ${tokenType} - blocking selection`);
            return; // Don't allow selection of disabled cards
        }
        
        // Get current player's colors
        const playerColors = this.getPlayerColors(this.currentPlayer.id);
        
        // Get the previous selection for this token type
        const previousSelection = this.currentPlayer.selectedCards[tokenType];
        
        // Deselect previous card of same token type
        const cards = document.querySelectorAll(`#${tokenType}-cards .location-card`);
        cards.forEach(card => {
            card.classList.remove('selected');
            // Skip resetting colors for disabled cards (they have their own styling)
            if (!card.classList.contains('disabled')) {
                // Reset to default colors
                card.style.backgroundColor = '#ecf0f1';
                card.style.color = '#2c3e50';
                card.style.border = '3px solid #95a5a6';
            }
        });
        
        // If there was a previous selection, re-enable it in the other token type's cards (except Forest)
        if (previousSelection !== null && previousSelection !== 7) { // Don't re-enable Forest since it's always allowed
            const otherTokenType = tokenType === 'hunter' ? 'apprentice' : 'hunter';
            const previousCardInOtherSet = document.querySelector(`#${otherTokenType}-cards .location-card[data-location-id="${previousSelection}"]`);
            if (previousCardInOtherSet) {
                previousCardInOtherSet.classList.remove('disabled');
                // Restore default enabled card styling
                previousCardInOtherSet.style.backgroundColor = '#ecf0f1';
                previousCardInOtherSet.style.color = '#2c3e50';
                previousCardInOtherSet.style.border = '3px solid #95a5a6';
                previousCardInOtherSet.style.opacity = '1';
                previousCardInOtherSet.style.cursor = 'pointer';
                previousCardInOtherSet.style.pointerEvents = '';
            }
        }
        
        // Select new card
        const selectedCard = document.querySelector(`#${tokenType}-cards .location-card[data-location-id="${locationId}"]`);
        selectedCard.classList.add('selected');
        // Apply player's colors
        selectedCard.style.backgroundColor = playerColors.background;
        selectedCard.style.color = 'white';
        selectedCard.style.border = `3px solid ${playerColors.border}`;
        
        // Disable the same location in the other token type's cards, except for Forest (location 7)
        if (locationId !== 7) { // Forest exception - allow both hunter and apprentice in Forest
            const otherTokenType = tokenType === 'hunter' ? 'apprentice' : 'hunter';
            const sameCardInOtherSet = document.querySelector(`#${otherTokenType}-cards .location-card[data-location-id="${locationId}"]`);
            if (sameCardInOtherSet) {
                sameCardInOtherSet.classList.add('disabled');
                // Apply same styling as dummy-blocked cards
                sameCardInOtherSet.style.backgroundColor = '#7f8c8d';
                sameCardInOtherSet.style.borderColor = '#95a5a6';
                sameCardInOtherSet.style.opacity = '0.5';
                sameCardInOtherSet.style.cursor = 'not-allowed';
                sameCardInOtherSet.style.pointerEvents = 'none';
            }
        }
        
        // Update player's selection
        this.currentPlayer.selectedCards[tokenType] = locationId;

        // Special handling for Forest: Enable/disable apprentice Forest based on hunter selection
        if (tokenType === 'hunter') {
            const apprenticeForestCard = document.querySelector(`#apprentice-cards .location-card[data-location-id="7"]`);
            if (apprenticeForestCard) {
                if (locationId === 7) {
                    // Hunter selected Forest -> enable apprentice Forest
                    apprenticeForestCard.classList.remove('disabled');
                    apprenticeForestCard.title = 'Hunter is going to Forest';
                    apprenticeForestCard.style.cursor = 'pointer';
                    // Set default enabled card styling
                    apprenticeForestCard.style.backgroundColor = '#ecf0f1';
                    apprenticeForestCard.style.color = '#2c3e50';
                    apprenticeForestCard.style.border = '3px solid #95a5a6';
                    apprenticeForestCard.style.opacity = '1';
                    apprenticeForestCard.style.pointerEvents = '';
                } else {
                    // Hunter selected non-Forest -> disable apprentice Forest (match dummy-blocked styling)
                    apprenticeForestCard.classList.add('disabled');
                    apprenticeForestCard.title = 'Forest only available if Hunter selects Forest';
                    apprenticeForestCard.style.cursor = 'not-allowed';
                    apprenticeForestCard.style.pointerEvents = 'none';
                    // Apply same styling as dummy-blocked cards
                    apprenticeForestCard.style.backgroundColor = '#7f8c8d';
                    apprenticeForestCard.style.borderColor = '#95a5a6';
                    apprenticeForestCard.style.opacity = '0.5';

                    // If apprentice currently has Forest selected, deselect it
                    if (this.currentPlayer.selectedCards.apprentice === 7) {
                        this.currentPlayer.selectedCards.apprentice = null;
                        const selectedApprenticeCard = document.querySelector(`#apprentice-cards .location-card[data-location-id="7"]`);
                        if (selectedApprenticeCard) {
                            selectedApprenticeCard.classList.remove('selected');
                            selectedApprenticeCard.style.backgroundColor = '#ecf0f1';
                            selectedApprenticeCard.style.color = '#2c3e50';
                            selectedApprenticeCard.style.border = '3px solid #95a5a6';
                        }
                    }
                }
            }
        }

        // Check if both selections are made
        this.checkSelectionComplete();
    }
    
    // Removed duplicate - using the version at line 1917
    
    getLocationName(locationId) {
        const location = this.locations.find(loc => loc.id === locationId);
        return location ? this.getLocationDisplayName(location.name) : '';
    }

    /**
     * Returns a translation-key marker for a location's translated display name.
     * Used inside addLogEntryT args so guests re-translate locally.
     */
    locationTArg(locationId) {
        const map = { 1: 'location.workSite', 2: 'location.bar', 3: 'location.station', 4: 'location.hospital', 5: 'location.dojo', 6: 'location.plaza', 7: 'location.forest' };
        const key = map[locationId];
        return key ? this.tArg(key) : '';
    }
    
    confirmSelection() {
        // Branch based on game mode
        if (this.gameMode === 'online') {
            this.confirmSelectionOnline();
        } else if (this.gameMode === 'simultaneous') {
            this.confirmSelectionSimultaneous();
        } else {
            this.confirmSelectionTurnBased();
        }
    }

    confirmSelectionSimultaneous() {
        // In simultaneous mode, find the human player (there's only one)
        const humanPlayer = this.players.find(p => !p.isBot);
        if (!humanPlayer) return;

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Confirming selection for human player - Round ${this.currentRound}`);
        }

        if (humanPlayer.selectedCards.hunter === null || humanPlayer.selectedCards.apprentice === null) {
            console.log(`[DEBUG] Human player selections incomplete`);
            return;
        }

        // Check Forest requirements warning
        if (humanPlayer.selectedCards.hunter === 7) {
            let warningMessages = [];
            let canGetInStore = false;
            
            // Check EP requirement
            if (humanPlayer.resources.ep < 2) {
                warningMessages.push(t('forestWarn.needEP', humanPlayer.resources.ep));
                canGetInStore = true;
            }

            // Check ammunition requirement for Rifle/Plasma
            if (!this.hasRequiredAmmunition(humanPlayer)) {
                if (humanPlayer.weapon.name === 'Rifle') {
                    const bulletCount = humanPlayer.inventory.filter(item => item.name === 'Bullet').length;
                    warningMessages.push(t('forestWarn.needBullets', bulletCount));
                    canGetInStore = true;
                } else if (humanPlayer.weapon.name === 'Plasma') {
                    const batteryCount = humanPlayer.inventory.filter(item => item.name === 'Battery').length;
                    warningMessages.push(t('forestWarn.needBatteries', batteryCount));
                    canGetInStore = true;
                }
            }

            // Show warning if any requirements are missing
            if (warningMessages.length > 0) {
                let fullMessage = t('forestWarn.title') + '\n\n';
                fullMessage += t('forestWarn.intro') + '\n\n';
                fullMessage += warningMessages.join('\n');
                fullMessage += '\n\n';

                if (canGetInStore) {
                    fullMessage += t('forestWarn.canBuy') + '\n';
                    fullMessage += t('forestWarn.canUseItems') + '\n\n';
                }

                fullMessage += t('forestWarn.proceed');

                if (!confirm(fullMessage)) {
                    console.log('Player canceled Forest entry during confirmation');
                    return; // Player canceled, don't confirm selection
                }
            }
        }

        // Store the selection message for batch logging later
        this.pendingSelectionLogs.push({
            key: 'log.playerSelected',
            args: [humanPlayer, this.locationTArg(humanPlayer.selectedCards.hunter), this.locationTArg(humanPlayer.selectedCards.apprentice)],
            type: 'selection',
            player: humanPlayer
        });

        // Track location selections for statistics
        const hunterLocation = humanPlayer.selectedCards.hunter;
        const apprenticeLocation = humanPlayer.selectedCards.apprentice;
        humanPlayer.locationSelections[hunterLocation].hunter++;
        humanPlayer.locationSelections[apprenticeLocation].apprentice++;

        // Mark human player as complete
        this.updatePlayerStatus(humanPlayer.id, true);

        // Check if all players are complete
        if (this.checkAllPlayersComplete()) {
            // All players (human + bots) have completed
            console.log('All players completed selections (simultaneous mode)');

            // Add all pending selection logs to the game log
            for (const logEntry of this.pendingSelectionLogs) {
                if (logEntry.key) {
                    this.addLogEntryT(logEntry.key, logEntry.args || [], logEntry.type, logEntry.player);
                } else {
                    if (logEntry.key) {
                this.addLogEntryT(logEntry.key, logEntry.args || [], logEntry.type, logEntry.player);
            } else {
                this.addLogEntry(logEntry.message, logEntry.type, logEntry.player);
            }
                }
            }

            // Clear pending logs for next round
            this.pendingSelectionLogs = [];

            // Hide status indicators and proceed to next phase
            this.hidePlayerStatusIndicators();
            this.startResourceDistribution();
        }
    }

    confirmSelectionTurnBased() {
        // Turn-based mode: existing sequential logic
        // Check if we have a valid current player
        if (!this.currentPlayer || this.currentPlayerIndex >= this.players.length) {
            console.log(`[DEBUG] confirmSelection called with invalid currentPlayer: ${this.currentPlayerIndex}/${this.players.length}`);
            return;
        }

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Confirming selection for player ${this.currentPlayerIndex} - Round ${this.currentRound}`);
        }
        console.log(`[DEBUG] confirmSelection called for player ${this.currentPlayerIndex}`);

        if (this.currentPlayer.selectedCards.hunter === null || this.currentPlayer.selectedCards.apprentice === null) {
            console.log(`[DEBUG] Player ${this.currentPlayerIndex} selections incomplete: H=${this.currentPlayer.selectedCards.hunter}, A=${this.currentPlayer.selectedCards.apprentice}`);
            return;
        }

        // Check Forest requirements warning for human players
        if (!this.currentPlayer.isBot && this.currentPlayer.selectedCards.hunter === 7) {
            let warningMessages = [];
            let canGetInStore = false;

            // Check EP requirement
            if (this.currentPlayer.resources.ep < 2) {
                warningMessages.push(t('forestWarn.needEP', this.currentPlayer.resources.ep));
                canGetInStore = true;
            }

            // Check ammunition requirement for Rifle/Plasma
            if (!this.hasRequiredAmmunition(this.currentPlayer)) {
                if (this.currentPlayer.weapon.name === 'Rifle') {
                    const bulletCount = this.currentPlayer.inventory.filter(item => item.name === 'Bullet').length;
                    warningMessages.push(t('forestWarn.needBullets', bulletCount));
                    canGetInStore = true;
                } else if (this.currentPlayer.weapon.name === 'Plasma') {
                    const batteryCount = this.currentPlayer.inventory.filter(item => item.name === 'Battery').length;
                    warningMessages.push(t('forestWarn.needBatteries', batteryCount));
                    canGetInStore = true;
                }
            }

            // Show warning if any requirements are missing
            if (warningMessages.length > 0) {
                let fullMessage = t('forestWarn.title') + '\n\n';
                fullMessage += t('forestWarn.intro') + '\n\n';
                fullMessage += warningMessages.join('\n');
                fullMessage += '\n\n';

                if (canGetInStore) {
                    fullMessage += t('forestWarn.canBuy') + '\n';
                    fullMessage += t('forestWarn.canUseItems') + '\n\n';
                }

                fullMessage += t('forestWarn.proceed');

                if (!confirm(fullMessage)) {
                    console.log('Player canceled Forest entry during confirmation');
                    return; // Player canceled, don't confirm selection
                }
            }
        }

        // Store the selection message for batch logging later (only for human players, bots already added theirs)
        if (!this.currentPlayer.isBot) {
            this.pendingSelectionLogs.push({
                key: 'log.playerSelected',
                args: [this.currentPlayer, this.locationTArg(this.currentPlayer.selectedCards.hunter), this.locationTArg(this.currentPlayer.selectedCards.apprentice)],
                type: 'selection',
                player: this.currentPlayer
            });
        }

        // Track location selections for statistics (only for human players, bots already tracked in handleBotSelection)
        if (!this.currentPlayer.isBot) {
            const hunterLocation = this.currentPlayer.selectedCards.hunter;
            const apprenticeLocation = this.currentPlayer.selectedCards.apprentice;
            this.currentPlayer.locationSelections[hunterLocation].hunter++;
            this.currentPlayer.locationSelections[apprenticeLocation].apprentice++;
        }

        // Update status indicator for this player
        this.updatePlayerStatus(this.currentPlayer.id, true);

        // Move to next player
        this.currentPlayerIndex++;

        if (this.currentPlayerIndex >= this.players.length) {
            // All players have made selections, log all selections together
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] All players completed selections, moving to resource distribution`);
            }

            // Add all pending selection logs to the game log
            for (const logEntry of this.pendingSelectionLogs) {
                if (logEntry.key) {
                    this.addLogEntryT(logEntry.key, logEntry.args || [], logEntry.type, logEntry.player);
                } else {
                    if (logEntry.key) {
                this.addLogEntryT(logEntry.key, logEntry.args || [], logEntry.type, logEntry.player);
            } else {
                this.addLogEntry(logEntry.message, logEntry.type, logEntry.player);
            }
                }
            }

            // Clear pending logs for next round
            this.pendingSelectionLogs = [];

            // Hide status indicators
            this.hidePlayerStatusIndicators();

            this.startResourceDistribution();
        } else {
            // Next player's turn
            console.log(`Switching to ${this.players[this.currentPlayerIndex].name}, dummy tokens still at:`, this.dummyTokens);
            this.currentPlayer.selectedCards.hunter = null;
            this.currentPlayer.selectedCards.apprentice = null;
            this.createLocationCards();
            this.updateCurrentPlayer();  // This will handle bot/human UI switching
            this.updateLocationCardStates();
            this.updateStatusMessage();

            // Refresh button states for turn-based mode
            this.refreshAllPlayerButtonStates();
        }
    }
    
    resolveRound() {
        this.roundPhase = 'resolution';
        
        // Clear the board (but not dummy tokens)
        document.querySelectorAll('.token:not(.dummy-token)').forEach(token => token.remove());
        
        
        // Place all tokens based on selections
        this.players.forEach(player => {
            // Place hunter
            if (player.selectedCards.hunter) {
                this.placeToken(player.id, 'hunter', player.selectedCards.hunter);
            }
            
            // Place apprentice
            if (player.selectedCards.apprentice) {
                this.placeToken(player.id, 'apprentice', player.selectedCards.apprentice);
            }
        });
        
        // Resources already distributed in startResourceDistribution()
        // this.distributeResources(); // REMOVED: This was causing double resource distribution
        
        // Update UI for resolution phase
        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'block';
        document.getElementById('status-message').textContent = t('status.roundComplete');
        document.querySelector('.card-selection').style.display = 'none';
    }
    
    placeToken(playerId, tokenType, locationId) {
        // Update player's token position
        const player = this.players.find(p => p.id === playerId);
        player.tokens[tokenType] = locationId;
        
        // Skip DOM operations in automated mode
        if (this.isAutomatedMode) return;
        
        const location = document.querySelector(`.location[data-location="${locationId}"] .token-slots`);
        if (!location) return;
        
        const token = document.createElement('div');
        token.className = `token ${tokenType} player-${playerId}`;
        token.textContent = tokenType[0].toUpperCase();
        
        // Apply player colors to the token
        const playerColors = this.getPlayerColors(playerId);
        token.style.backgroundColor = playerColors.background;
        token.style.border = `2px solid ${playerColors.border}`;
        token.style.color = 'white';
        
        location.appendChild(token);
    }
    
    nextRound() {
        // Move dummy tokens to next locations
        this.moveDummyTokens();

        // Reset for next round
        this.roundPhase = 'selection';
        this.currentPlayerIndex = 0;
        this.pendingSelectionLogs = []; // Clear any pending logs
        this.resetPlayerCompletionStatus(); // Reset player completion status for new round

        // Clear selections
        this.players.forEach(player => {
            player.selectedCards.hunter = null;
            player.selectedCards.apprentice = null;
        });
        
        // Reset UI
        document.getElementById('confirm-selection').style.display = 'block';
        document.getElementById('next-player').style.display = 'none';
        document.querySelector('.card-selection').style.display = 'grid';
        
        this.createLocationCards();
        this.updateUI();
        this.updateCurrentPlayer(); // Fix: Handle bot detection for round transitions
        this.updateDummyTokenDisplay();
    }
    
    moveDummyTokens() {
        // Move each dummy token to the next location
        for (let i = 0; i < this.dummyTokens.length; i++) {
            let currentLocation = this.dummyTokens[i];
            let nextLocation = currentLocation + 1;
            
            // Handle movement pattern: 1→2→3→4→5→6→1 (skip 7/Forest)
            if (nextLocation === 7) {
                nextLocation = 1; // Skip Forest, go to Work Site
            } else if (nextLocation > 6) {
                nextLocation = 1; // This shouldn't happen, but just in case
            }
            
            this.dummyTokens[i] = nextLocation;
        }
        
        console.log('Dummy tokens moved to locations:', this.dummyTokens);
    }
    
    updateDummyTokenDisplay() {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;
        // Remove existing dummy tokens from display
        document.querySelectorAll('.dummy-token').forEach(token => token.remove());
        
        // Add dummy tokens to their current locations
        this.dummyTokens.forEach(locationId => {
            const location = document.querySelector(`[data-location="${locationId}"] .token-slots`);
            if (location) {
                const dummyToken = document.createElement('div');
                dummyToken.className = 'token dummy-token';
                dummyToken.textContent = 'D';
                dummyToken.title = 'Dummy Token';
                location.appendChild(dummyToken);
            }
        });
    }
    
    setupEventListeners() {
        document.getElementById('confirm-selection').addEventListener('click', () => this.confirmSelection());
        document.getElementById('next-player').addEventListener('click', () => this.nextRound());
    }
    
    resetMilestoneCheckboxes() {
        // Reset all milestone checkboxes for all players
        this.players.forEach(player => {
            const checkboxIds = [
                `p${player.id}-hp-milestone-6`, `p${player.id}-hp-milestone-8`, `p${player.id}-hp-milestone-10`,
                `p${player.id}-ep-milestone-8`, `p${player.id}-ep-milestone-10`
            ];

            checkboxIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
        });
    }

    updateMilestoneCheckboxes(playerId) {
        // Skip UI updates in automated mode
        if (this.isAutomatedMode) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Update HP milestones
        const hp6Checkbox = document.getElementById(`p${playerId}-hp-milestone-6`);
        const hp8Checkbox = document.getElementById(`p${playerId}-hp-milestone-8`);
        const hp10Checkbox = document.getElementById(`p${playerId}-hp-milestone-10`);

        if (hp6Checkbox) hp6Checkbox.checked = player.maxResources.hp >= 6;
        if (hp8Checkbox) hp8Checkbox.checked = player.maxResources.hp >= 8;
        if (hp10Checkbox) hp10Checkbox.checked = player.maxResources.hp >= 10;

        // Update EP milestones
        const ep8Checkbox = document.getElementById(`p${playerId}-ep-milestone-8`);
        const ep10Checkbox = document.getElementById(`p${playerId}-ep-milestone-10`);

        if (ep8Checkbox) ep8Checkbox.checked = player.maxResources.ep >= 8;
        if (ep10Checkbox) ep10Checkbox.checked = player.maxResources.ep >= 10;
    }
    
    resetGame() {
        // Confirm before restarting
        if (confirm(t('alert.confirmNewGame'))) {
            this.resetMilestoneCheckboxes();
            location.reload();
        }
    }
    
    updateUI() {
        // Update current player display
        document.getElementById('current-player-name').textContent = this.getPlayerDisplayName(this.currentPlayer);
        
        // Update status message
        if (this.roundPhase === 'selection') {
            document.getElementById('status-message').textContent =
                t('status.selectLocationsPrompt', this.getPlayerDisplayName(this.currentPlayer));
        }
        
        // Reset confirm button
        document.getElementById('confirm-selection').disabled = true;
        
        // Update location card states based on EP
        this.updateLocationCardStates();
    }
    
    updateLocationCardStates() {
        // Update restrictions for all location cards
        const allCards = document.querySelectorAll('.location-card');
        
        allCards.forEach(card => {
            const locationId = parseInt(card.dataset.locationId);
            const tokenType = card.dataset.tokenType;
            
            // Remove disabled class first
            card.classList.remove('disabled');
            card.title = '';
            
            // Check dummy tokens FIRST (applies to both hunter and apprentice)
            if (this.dummyTokens && this.dummyTokens.includes(locationId)) {
                card.classList.add('disabled');
                card.title = 'Location occupied by dummy token';
            }
            // Show Forest requirements as tooltip for hunter cards (but don't disable)
            else if (tokenType === 'hunter' && locationId === 7) { // Forest
                if (this.currentPlayer.resources.ep < 2) {
                    card.title = 'Requires at least 2 EP (can be obtained in Store phase)';
                } else if (!this.hasRequiredAmmunition(this.currentPlayer)) {
                    if (this.currentPlayer.weapon.name === 'Rifle') {
                        card.title = 'Rifle needs bullets for Forest (can be purchased in Store phase)';
                    } else if (this.currentPlayer.weapon.name === 'Plasma') {
                        card.title = 'Plasma needs batteries for Forest (can be purchased in Store phase)';
                    }
                }
            }
        });
    }
    
    updateResourceDisplay() {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;

        this.players.forEach(player => {
            const prefix = `p${player.id}`;
            const moneyEl = document.getElementById(`${prefix}-money`);
            const expEl = document.getElementById(`${prefix}-exp`);
            const hpEl = document.getElementById(`${prefix}-hp`);
            const epEl = document.getElementById(`${prefix}-ep`);
            const scoreEl = document.getElementById(`${prefix}-score`);

            if (moneyEl) moneyEl.textContent = player.resources.money;
            if (expEl) expEl.textContent = player.resources.exp;
            if (hpEl) hpEl.textContent = player.resources.hp;
            if (epEl) epEl.textContent = player.resources.ep;
            if (scoreEl) scoreEl.textContent = player.score;

            // Update max values for HP and EP since they can change
            if (player.maxResources) {
                const hpMaxElement = document.querySelector(`#player-${player.id}-board .hp-section .stat-max`);
                const epMaxElement = document.querySelector(`#player-${player.id}-board .ep-section .stat-max`);
                if (hpMaxElement) hpMaxElement.textContent = `/${player.maxResources.hp}`;
                if (epMaxElement) epMaxElement.textContent = `/${player.maxResources.ep}`;
            }

            // Only update expanded-view elements if boards are not collapsed
            if (!this.boardsCollapsed) {
                // Update inventory display
                this.updateInventoryDisplay(player.id);

                // Update weapon power display
                this.updateWeaponPowerDisplay(player.id);

                // Update damage grid display
                this.updateDamageGrid(player.id);
            }
        });
    }
    
    shouldDisablePlayerButtons(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return true;

        // Always disable bot buttons
        if (player.isBot) return true;

        // Always disable when game is over
        if (this.roundPhase === 'gameover') return true;

        // In simultaneous mode, human players are always enabled
        if (this.gameMode === 'simultaneous') return false;

        // In online mode, only enable the local player's buttons
        if (this.gameMode === 'online') {
            return playerId !== this.localPlayerId;
        }

        // In turn-based mode, only enable current player's buttons
        if (this.gameMode === 'turnbased') {
            if (this.roundPhase === 'selection') {
                return playerId !== this.currentPlayer?.id;
            } else if (this.roundPhase === 'store') {
                return playerId !== this.currentStorePlayer;
            }
        }

        // Default: don't disable in other phases
        return false;
    }

    refreshAllPlayerButtonStates() {
        // Update button disabled states for all players without re-rendering boards
        this.players.forEach(player => {
            const shouldDisable = this.shouldDisablePlayerButtons(player.id);
            const disabledTitle = shouldDisable ? 'Cannot interact with this player board' : '';

            if (shouldDisable) {
                // Disable ALL buttons for bots / non-local players
                const board = document.getElementById(`player-${player.id}-board`);
                if (board) {
                    board.querySelectorAll('button').forEach(btn => {
                        btn.disabled = true;
                        btn.title = disabledTitle;
                    });
                }
            } else {
                // For the local/active player, apply resource-based button states
                this.updatePlayerButtonStates(player);
            }
        });
    }

    updatePlayerButtonStates(player) {
        const playerId = player.id;
        const hasBloodBag = player.inventory.some(item => item.name === 'Blood Bag');
        const hasBeer = player.inventory.some(item => item.name === 'Beer');
        const hpFull = player.resources.hp >= player.maxResources.hp;
        const epFull = player.resources.ep >= player.maxResources.ep;
        const hpMaxed = player.maxResources.hp >= 10;
        const epMaxed = player.maxResources.ep >= 10;
        const attackMaxed = player.weapon.currentAttackDice >= 7;
        const defenseMaxed = player.weapon.currentDefenseDice >= 6;
        const canUpgradeAttack = player.resources.exp >= player.weapon.reqExpAttack && !attackMaxed;
        const canUpgradeDefense = player.resources.exp >= (player.weapon.reqExpDefense || 3) && !defenseMaxed;

        // Update expanded board restore buttons
        this.updateExpandedRestoreButtons(playerId);

        // Update expanded board upgrade HP/EP buttons
        const board = document.getElementById(`player-${playerId}-board`);
        if (board) {
            // HP upgrade button (requires blood bag and not maxed)
            const hpUpgradeBtns = board.querySelectorAll(`button[onclick*="addToUpgrade(${playerId}, 'hp')"]`);
            hpUpgradeBtns.forEach(btn => { btn.disabled = hpMaxed || !hasBloodBag; });

            // EP upgrade button (requires beer and not maxed)
            const epUpgradeBtns = board.querySelectorAll(`button[onclick*="addToUpgrade(${playerId}, 'ep')"]`);
            epUpgradeBtns.forEach(btn => { btn.disabled = epMaxed || !hasBeer; });

            // Attack dice upgrade button
            const attackBtns = board.querySelectorAll(`button[onclick*="upgradeWeapon(${playerId}, 'attack')"]`);
            attackBtns.forEach(btn => { btn.disabled = !canUpgradeAttack; });

            // Defense dice upgrade button
            const defenseBtns = board.querySelectorAll(`button[onclick*="upgradeWeapon(${playerId}, 'defense')"]`);
            defenseBtns.forEach(btn => { btn.disabled = !canUpgradeDefense; });
        }

        // Update collapsed board
        this.updateCollapsedBoardDisplay(player);
    }

    disableAllPlayerButtons() {
        // Disable all buttons for all players when game ends
        this.players.forEach(player => {
            const playerId = player.id;
            const disabledTitle = 'Game is over - cannot interact with player boards';

            // Get the player board (works for both expanded and collapsed)
            const playerBoard = document.getElementById(`player-${playerId}-board`);
            if (!playerBoard) return;

            // Disable ALL buttons in the player board
            const allButtons = playerBoard.querySelectorAll('button');
            allButtons.forEach(btn => {
                btn.disabled = true;
                btn.title = disabledTitle;
            });

            // Also disable inventory use buttons
            const inventoryContainer = document.getElementById(`p${playerId}-inventory`);
            if (inventoryContainer) {
                const useButtons = inventoryContainer.querySelectorAll('button');
                useButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.title = disabledTitle;
                });
            }
        });
    }
    
    // Unified player display update function
    updatePlayerDisplay(playerId) {
        if (this.isAutomatedMode) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const prefix = `p${playerId}`;

        // Update weapon display (exists in both views)
        const weaponName = document.getElementById(`${prefix}-weapon-name`);
        if (weaponName) weaponName.textContent = this.getWeaponDisplayName(player.weapon.name);

        const weaponImage = document.getElementById(`${prefix}-weapon-image`);
        if (weaponImage) weaponImage.src = `${player.weapon.name.toLowerCase()}.png`;

        const attackDice = document.getElementById(`${prefix}-attack-dice`);
        const defenseDice = document.getElementById(`${prefix}-defense-dice`);
        if (attackDice) attackDice.textContent = player.weapon.currentAttackDice;
        if (defenseDice) defenseDice.textContent = player.weapon.currentDefenseDice;

        const reqExpAttack = document.getElementById(`${prefix}-req-exp-attack`);
        const reqExpDefense = document.getElementById(`${prefix}-req-exp-defense`);
        if (reqExpAttack) reqExpAttack.textContent = player.weapon.reqExpAttack;
        if (reqExpDefense) reqExpDefense.textContent = player.weapon.reqExpDefense;

        // Update capacity (same format for both collapsed and expanded views)
        const capacity = document.getElementById(`${prefix}-capacity`);
        if (capacity) {
            // Both views show current/max format
            capacity.textContent = `${this.getInventorySize(player)}/${player.maxInventoryCapacity}`;
        }

        // Only update expanded-view elements if boards are not collapsed
        if (!this.boardsCollapsed) {
            // Update upgrade progress (only in expanded view)
            const epProgress = document.getElementById(`${prefix}-ep-progress`);
            const hpProgress = document.getElementById(`${prefix}-hp-progress`);
            if (epProgress) epProgress.textContent = `${player.upgradeProgress.ep}/4`;
            if (hpProgress) hpProgress.textContent = `${player.upgradeProgress.hp}/3`;

            // Update restore button states
            this.updateExpandedRestoreButtons(playerId);

            // Update damage grid
            this.updateDamageGrid(playerId);

            // Update weapon power display
            this.updateWeaponPowerDisplay(playerId);
            this.updateWeaponPowerDescriptions(playerId);

            // Update ammunition displays
            this.updateBulletDisplay(playerId);
            this.updateBatteryDisplay(playerId);

            // Update inventory items
            this.updateInventoryItems(playerId);
        } else {
            // Update collapsed board when boards are collapsed
            this.updateCollapsedBoardDisplay(player);
        }
    }
    
    // Separate function for inventory items only
    updateInventoryItems(playerId) {
        if (this.isAutomatedMode) return;
        
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const inventoryContainer = document.getElementById(`p${playerId}-inventory`);
        if (!inventoryContainer) return;
        
        // Get all possible items and their current counts
        const allItems = [
            { name: 'Beer', icon: '🍺', descKey: 'inventory.beerDesc' },
            { name: 'Blood Bag', icon: '🩸', descKey: 'inventory.bloodBagDesc' },
            { name: 'Grenade', icon: '💣', descKey: 'inventory.grenadeDesc' },
            { name: 'Bomb', icon: '💥', descKey: 'inventory.bombDesc' },
            { name: 'Dynamite', icon: '🧨', descKey: 'inventory.dynamiteDesc' },
            { name: 'Fake Blood', icon: '🩹', descKey: 'inventory.fakeBloodDesc' }
        ];
        
        // Count current items in inventory
        const itemCounts = {};
        player.inventory.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
        
        // Check if buttons should be disabled for this player
        const buttonsDisabled = this.shouldDisablePlayerButtons(playerId);
        
        // Display all items with their counts (0 if not owned)
        // Note: Beer and Blood Bag no longer have Use buttons - restore buttons are now in HP/EP sections
        const htmlContent = allItems
            .map(item => {
                const count = itemCounts[item.name] || 0;

                return `<div class="inventory-item-counter" title="${t(item.descKey)}">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-count" id="p${playerId}-${item.name.replace(' ', '')}-count">${count}</span>
                </div>`;
            }).join('');
        
        inventoryContainer.innerHTML = htmlContent;
    }
    
    // Legacy compatibility - will be removed after refactoring all calls
    updateInventoryDisplay(playerId) {
        this.updatePlayerDisplay(playerId);
    }
    
    modifyResource(playerId, resourceType, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const oldValue = player.resources[resourceType];
        const newValue = oldValue + amount;
        const maxValue = player.maxResources[resourceType];
        const cappedValue = Math.max(0, Math.min(newValue, maxValue));
        
        // Log and notify if resources were lost due to cap
        if (amount > 0 && newValue > maxValue) {
            const lostAmount = newValue - maxValue;
            console.log(`${player.name} lost ${lostAmount} ${resourceType} due to max cap of ${maxValue}`);
            if (resourceType === 'money' || resourceType === 'exp') {
                const localizedResource = this.getResourceDisplayName(resourceType);
                this.addLogEntryT('log.maxResourceReached', [player, localizedResource, maxValue, lostAmount], 'system', player);
                // Show alert for human players only
                if (!player.isBot && !this.isAutomatedMode) {
                    alert(t('alert.maxResource', this.getPlayerDisplayName(player), localizedResource, maxValue, lostAmount));
                }
            }
        }
        
        player.resources[resourceType] = cappedValue;
        
        this.updateResourceDisplay();
    }
    
    addItemToInventory(playerId, itemName, quantity = 1) {
        console.log(`Adding ${quantity} ${itemName} to player ${playerId}'s inventory`);
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }
        
        // Find item data from storeItems or create basic item structure
        let itemData = this.storeItems?.find(item => item.name === itemName);
        if (!itemData) {
            // Create basic item structure based on Item.csv data
            const itemDefaults = {
                'Beer': { name: 'Beer', size: 1, price: 2, effect: 'gain 1 Energy', icon: '🍺' },
                'Blood Bag': { name: 'Blood Bag', size: 1, price: 2, effect: 'gain 1 Blood', icon: '🩸' },
                'Grenade': { name: 'Grenade', size: 2, price: 2, effect: "reduce 1 monster's HP", icon: '💣' },
                'Bomb': { name: 'Bomb', size: 3, price: 4, effect: "reduce 2 monster's HP", icon: '💥' },
                'Dynamite': { name: 'Dynamite', size: 4, price: 6, effect: "reduce 3 monster's HP", icon: '🧨' },
                'Fake Blood': { name: 'Fake Blood', size: 2, price: 2, effect: "when defeating the monster gain points equal to monster's level", icon: '🩹' }
            };
            itemData = itemDefaults[itemName] || { name: itemName, size: 1, price: 0, effect: 'unknown', icon: '❓' };
        }
        
        console.log(`Item data:`, itemData);
        
        // Add the specified quantity of items
        for (let i = 0; i < quantity; i++) {
            player.inventory.push({...itemData});
        }
        
        console.log(`Player ${playerId} inventory after adding:`, player.inventory);
        
        // Update displays
        this.updateAllDisplays(playerId);
    }
    
    // Helper function to check and award milestones
    checkAndAwardMilestone(player, resourceType, value, points, milestoneKey) {
        if (player.milestones[milestoneKey]) return false;
        
        player.milestones[milestoneKey] = true;
        this.addScore(player.id, points, 'milestone');
        
        if (!this.isAutomatedMode) {
            const checkbox = document.getElementById(`p${player.id}-${resourceType}-milestone-${value}`);
            if (checkbox) checkbox.checked = true;
        }
        
        console.log(`Player ${player.id} reached ${resourceType.toUpperCase()} max ${value} milestone - awarded ${points} points`);
        return true;
    }
    
    levelUpMaxResource(playerId, resourceType, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Only HP and EP can be leveled up
        if (resourceType !== 'hp' && resourceType !== 'ep') return;

        // Prevent upgrading beyond 10
        if (player.maxResources[resourceType] >= 10) {
            console.log(`Cannot upgrade ${resourceType} - already at maximum (10)`);
            return;
        }

        // Apply the upgrade but cap at 10
        player.maxResources[resourceType] = Math.min(10, player.maxResources[resourceType] + amount);
        // Also increase current value by the same amount
        player.resources[resourceType] += amount;

        // Log the upgrade
        if (!this.isAutomatedMode) {
            this.addLogEntryT('log.maxResourceUpgraded', [player, this.getResourceDisplayName(resourceType), player.maxResources[resourceType]], 'system', player);
        }
        
        // Make sure current doesn't exceed max (though it shouldn't with this logic)
        if (player.resources[resourceType] > player.maxResources[resourceType]) {
            player.resources[resourceType] = player.maxResources[resourceType];
        }
        
        // Check milestones and award points
        const maxValue = player.maxResources[resourceType];
        
        if (resourceType === 'hp') {
            // HP milestones: 6 (2 pts), 8 (3 pts), 10 (4 pts)
            if (maxValue >= 6) this.checkAndAwardMilestone(player, 'hp', 6, 2, 'hp6');
            if (maxValue >= 8) this.checkAndAwardMilestone(player, 'hp', 8, 3, 'hp8');
            if (maxValue >= 10) this.checkAndAwardMilestone(player, 'hp', 10, 4, 'hp10');
        } else if (resourceType === 'ep') {
            // EP milestones: 8 (2 pts), 10 (4 pts)
            if (maxValue >= 8) this.checkAndAwardMilestone(player, 'ep', 8, 2, 'ep8');
            if (maxValue >= 10) this.checkAndAwardMilestone(player, 'ep', 10, 4, 'ep10');
        }
        
        // Disable upgrade button if at maximum (10)
        if (maxValue >= 10) {
            const upgradeButton = document.getElementById(`p${playerId}-${resourceType}-upgrade-btn`);
            if (upgradeButton) {
                upgradeButton.disabled = true;
                upgradeButton.title = `${resourceType.toUpperCase()} is at maximum (10)`;
            }
        }
        
        // Update Forest button if EP was upgraded for current player during selection phase
        if (resourceType === 'ep' && this.roundPhase === 'selection' && player.id === this.currentPlayer?.id) {
            this.updateLocationCardStates();
        }
        
        this.updateResourceDisplay();
    }
    
    distributeResources() {
        // This function is deprecated - using new flow instead
        this.startResourceDistribution();
    }
    
    handleForestEncounters(forestHunters) {
        // Route to online version if in online mode
        if (this.gameMode === 'online' && this.isHost) {
            this.handleForestEncountersOnline(forestHunters);
            return;
        }

        // In the new flow, this function handles battles during battle phase
        if (forestHunters.length === 0) {
            this.endRound();
            return;
        }

        // Handle one hunter at a time
        this.currentMonsterPlayer = forestHunters[0];
        this.remainingForestHunters = forestHunters.slice(1);

        // Show battle phase title (no red/green indicators)
        const battlePlayer = this.players.find(p => p.id === this.currentMonsterPlayer);
        if (battlePlayer && !this.isAutomatedMode) {
            this.showPlayerStatusIndicators(true);
            this.setPhaseTitle(t('phase.battle', this.getPlayerDisplayName(battlePlayer)));
        }

        // Reset shown monsters pool for this player (fresh start for each player)
        this.playerShownMonsters[this.currentMonsterPlayer] = new Set();

        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        
        // Check if current player is a bot
        if (player.isBot) {
            this.handleBotMonsterSelection(player);
            return;
        }
        
        document.getElementById('monster-modal-title').textContent = t('monster.chooseTitle', this.getPlayerDisplayName(player));

        // Reset selected pets, beer consumption, overflow EP, and monster level
        this.selectedMonsterLevel = null;
        this.selectedPets = { level1: 0, level2: 0, level3: 0 };
        this.selectedBeerConsumption = 0;
        this.overflowEP = 0;

        // Clear monster button selection state
        document.querySelectorAll('.monster-choice').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Update pet selection UI
        this.updatePetSelectionUI();
        
        document.getElementById('monster-modal').style.display = 'flex';
    }
    
    calculateAttackExpectedValue(player) {
        // Calculate expected damage per attack
        const weapon = player.weapon;
        let damageSum = 0;
        for (let i = 0; i < weapon.damage.length; i++) {
            damageSum += weapon.damage[i];
        }
        const expectedDamagePerDie = damageSum / 6;
        const attackDice = weapon.currentAttackDice || weapon.attackDice;
        return expectedDamagePerDie * attackDice;
    }
    
    calculateDefenseExpectedValue(player) {
        // Most weapons have 50% chance of successful defense (rolls 4,5,6)
        const defenseDice = player.weapon.currentDefenseDice || player.weapon.defenseDice;
        return 0.5 * defenseDice;
    }
    
    calculateSureDamage(player) {
        // Calculate guaranteed damage from items
        let sureDamage = 0;
        player.inventory.forEach(item => {
            if (item.name === 'Dynamite') sureDamage += 3;
            else if (item.name === 'Bomb') sureDamage += 2;
            else if (item.name === 'Grenade') sureDamage += 1;
        });
        return sureDamage;
    }
    
    selectOptimalMonsterLevel(player, attackExpectedValue, defenseExpectedValue, sureDamage) {
        // Monster average stats
        const monsterStats = {
            1: { hp: 3, attack: 2 },
            2: { hp: 6, attack: 3 },
            3: { hp: 11, attack: 4 }
        };
        
        // Check if this is first time fighting (no monsters defeated yet)
        const isFirstTime = !player.monstersDefeated || 
            (player.monstersDefeated.level1 === 0 && 
             player.monstersDefeated.level2 === 0 && 
             player.monstersDefeated.level3 === 0);
        
        if (isFirstTime) {
            console.log(`Bot ${player.name}: First monster fight, selecting level 1`);
            return 1;
        }
        
        // Try levels from highest to lowest
        for (let level = 3; level >= 1; level--) {
            const monster = monsterStats[level];
            let monsterHP = monster.hp;
            let botHP = player.resources.hp;
            let rounds = 0;
            const maxRounds = 20; // Prevent infinite loops
            
            console.log(`Bot ${player.name}: Evaluating level ${level} monster`);
            
            // Simulate battle rounds
            while (monsterHP > 0 && botHP > 0 && rounds < maxRounds) {
                rounds++;
                
                // Bot attack phase
                monsterHP -= attackExpectedValue;
                
                // Check if items can finish the monster (only use if can kill)
                if (monsterHP > 0 && monsterHP <= sureDamage) {
                    monsterHP -= sureDamage;
                    sureDamage = 0; // Items used
                }
                
                if (monsterHP <= 0) {
                    console.log(`Bot ${player.name}: Can defeat level ${level} monster in ${rounds} rounds`);
                    return level;
                }
                
                // Monster attack phase
                const monsterDamage = Math.max(0, monster.attack - defenseExpectedValue);
                botHP -= monsterDamage;
                
                if (botHP <= 0) {
                    console.log(`Bot ${player.name}: Would die to level ${level} monster`);
                    break; // Try lower level
                }
            }
            
            if (rounds >= maxRounds) {
                console.log(`Bot ${player.name}: Battle simulation exceeded max rounds for level ${level}`);
            }
        }
        
        // Default to level 1 if all else fails
        console.log(`Bot ${player.name}: Defaulting to level 1 monster`);
        return 1;
    }
    
    findOptimalItemCombination(player, targetDamage, monster = null) {
        // Find the minimal item combination to deal at least targetDamage
        const combatItems = [];

        // Check for item restrictions if monster is provided
        let restrictedItems = [];
        if (monster && monster.effectId) {
            const restriction = this.applyBattleEffect(monster.effectId, { monster: monster, playerId: player.id }, 'checkItemRestriction');
            if (restriction && restriction.restrictedItems) {
                restrictedItems = restriction.restrictedItems;
            }
        }

        // Count available items (excluding restricted ones)
        player.inventory.forEach(item => {
            if (item.name === 'Dynamite' && !restrictedItems.includes('Dynamite')) {
                combatItems.push({ name: 'Dynamite', damage: 3 });
            } else if (item.name === 'Bomb' && !restrictedItems.includes('Bomb')) {
                combatItems.push({ name: 'Bomb', damage: 2 });
            } else if (item.name === 'Grenade' && !restrictedItems.includes('Grenade')) {
                combatItems.push({ name: 'Grenade', damage: 1 });
            }
        });
        
        if (combatItems.length === 0) return null;
        
        // Sort by damage (highest first for efficiency)
        combatItems.sort((a, b) => b.damage - a.damage);
        
        // Check if total item damage can kill the monster
        const totalItemDamage = combatItems.reduce((sum, item) => sum + item.damage, 0);
        if (totalItemDamage < targetDamage) {
            // Cannot kill with available items - return null (save items)
            return null;
        }

        // Find combination to kill - use largest items first, allow overkill
        const combination = [];
        let remainingDamage = targetDamage;

        for (const item of combatItems) {
            if (remainingDamage <= 0) break;
            combination.push(item);
            remainingDamage -= item.damage;
        }

        return combination;
    }
    
    handleBotMonsterSelection(player) {
        // Initialize monster tracking if not set
        if (!player.monstersDefeated) {
            player.monstersDefeated = { level1: 0, level2: 0, level3: 0 };
        }
        
        // Calculate expected values for combat
        const attackExpectedValue = this.calculateAttackExpectedValue(player);
        const defenseExpectedValue = this.calculateDefenseExpectedValue(player);
        const sureDamage = this.calculateSureDamage(player);
        
        console.log(`Bot ${player.name} combat calculations:`, {
            attackExpectedValue,
            defenseExpectedValue,
            sureDamage,
            currentHP: player.resources.hp
        });
        
        // Use expected value calculation to select monster level
        let selectedLevel = this.selectOptimalMonsterLevel(
            player,
            attackExpectedValue,
            defenseExpectedValue,
            sureDamage
        );
        
        // Check EP requirements
        const epRequirement = selectedLevel + 1; // Level 1 = 2 EP, Level 2 = 3 EP, Level 3 = 4 EP
        if (player.resources.ep < epRequirement) {
            // Bot doesn't have enough EP, select highest level it can afford
            if (player.resources.ep >= 4) selectedLevel = 3;
            else if (player.resources.ep >= 3) selectedLevel = 2;
            else if (player.resources.ep >= 2) selectedLevel = 1;
            else {
                // Not enough EP for any monster
                console.warn(`Bot ${player.name} doesn't have enough EP for any monster`);
                selectedLevel = 1;
            }
        }
        
        // Set selections
        this.selectedMonsterLevel = selectedLevel;
        this.selectedPets = { level1: 0, level2: 0, level3: 0 };
        
        // Select pets if bot has Chain/Whip weapon
        if (player.weapon.name === 'Chain' || player.weapon.name === 'Whip') {
            // Bring highest level pet available
            const availablePets = player.pets;
            if (availablePets.level3 > 0) {
                this.selectedPets.level3 = 1;
            } else if (availablePets.level2 > 0) {
                this.selectedPets.level2 = 1;
            } else if (availablePets.level1 > 0) {
                this.selectedPets.level1 = 1;
            }
        }
        
        // Calculate total EP cost
        const monsterEPCost = selectedLevel + 1;
        let petEPCost = 0;
        
        // Calculate pet costs (considering Whip power levels)
        if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 7) {
            petEPCost = 0; // Level 3 Whip: pets cost 0 EP
        } else {
            petEPCost += this.selectedPets.level1 * 2;
            petEPCost += this.selectedPets.level2 * 3;
            petEPCost += this.selectedPets.level3 * 4;
        }
        
        const totalEPCost = monsterEPCost + petEPCost;
        
        // Log bot's selection
        const petInfo = [];
        if (this.selectedPets.level1 > 0) petInfo.push(t('battle.petCount', this.selectedPets.level1, 1));
        if (this.selectedPets.level2 > 0) petInfo.push(t('battle.petCount', this.selectedPets.level2, 2));
        if (this.selectedPets.level3 > 0) petInfo.push(t('battle.petCount', this.selectedPets.level3, 3));

        const petText = petInfo.length > 0 ? t('battle.withPetsSuffix', petInfo.join(', ')) : '';
        this.addLogEntryT('log.botChoseMonster', [player, selectedLevel, petText, totalEPCost], 'battle', player);
        
        // Deduct EP
        this.modifyResource(player.id, 'ep', -totalEPCost);

        // Select random available monster from the level
        let selectedMonster = this.selectRandomAvailableMonster(selectedLevel, player.id);
        if (!selectedMonster) {
            console.error(`No available monsters found for level ${selectedLevel}`);
            return;
        }

        // Bot monster switching: avoid monsters that attack first when defense is insufficient
        const defenseCount = player.weapon.currentDefenseDice || 0;
        if (!this.playerShownMonsters[player.id]) {
            this.playerShownMonsters[player.id] = new Set();
        }
        this.playerShownMonsters[player.id].add(selectedMonster.index);

        while (selectedMonster && selectedMonster.effectId &&
               this.checkBattleOrder(selectedMonster.effectId, defenseCount) &&
               player.resources.ep > 0) {
            // Monster would attack first — spend 1 EP to try another
            this.modifyResource(player.id, 'ep', -1);
            this.addLogEntryT('log.botChangedMonster', [player, defenseCount], 'battle', player);

            const newMonster = this.selectRandomAvailableMonster(selectedLevel, player.id);
            if (!newMonster) {
                // No more monsters available — must fight current one
                this.addLogEntryT('log.botNoMoreMonsters', [player], 'battle', player);
                break;
            }

            this.playerShownMonsters[player.id].add(newMonster.index);
            selectedMonster = newMonster;
        }

        // Store original HP and apply apprentice bonus if applicable
        selectedMonster.maxHp = selectedMonster.hp;

        // Apply other monsters HP bonus if active (effects 8, 16, 33)
        const hpBonus = this.activeMonsterEffects.find(effect => effect.type === 'otherMonstersHPBonus');
        if (hpBonus) {
            selectedMonster.hp += hpBonus.value;
            selectedMonster.maxHp += hpBonus.value;
            console.log(`Other monster HP bonus applied: +${hpBonus.value} HP (${selectedMonster.maxHp - hpBonus.value} -> ${selectedMonster.maxHp})`);
        }

        // Check if player's apprentice is also in Forest for -1 HP bonus
        if (player.tokens.apprentice === 7) { // Forest location
            selectedMonster.hp = Math.max(1, selectedMonster.hp - 1);
            console.log(`${player.name}'s apprentice in Forest - monster HP reduced by 1 (${selectedMonster.maxHp} -> ${selectedMonster.hp})`);
        }

        // Register this monster's effects for subsequent battles
        if (selectedMonster.effectId) {
            this.currentMonsterEffect = selectedMonster.effectId;
            this.activeMonsterEffects.push(selectedMonster.effectId);
            this.applySelectionEffect(selectedMonster.effectId, player.id);
            this.applyRoundEffect(selectedMonster.effectId);
        }

        console.log(`Bot ${player.name} selected Level ${selectedLevel} monster:`, selectedMonster);
        console.log('Selected pets:', this.selectedPets);
        console.log('About to call startMonsterBattle...');

        // Start battle immediately (bots skip monster selection UI)
        this.startMonsterBattle(player.id, selectedMonster, this.selectedPets);
        console.log('startMonsterBattle called for bot');
    }
    
    handleBotBattle(player, battle) {
        console.log('=== handleBotBattle called ===');
        console.log('Player:', player.name);
        console.log('Battle:', battle);

        // Hide battle UI for bot (host only sees status message)
        document.getElementById('monster-battle').style.display = 'none';

        // Show status message
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.innerHTML = t('status.botBattling', this.getPlayerDisplayName(player), battle.monster.level);
        }
        
        // Log battle start
        this.addLogEntryT('log.botEntersBattle', [player, battle.monster.level, battle.monster.hp, battle.monster.att], 'battle', player);
        
        console.log('About to start executeBotBattle with 1000ms delay');
        // Auto-battle with delay for visualization
        setTimeout(() => {
            console.log('Executing bot battle now...');
            this.executeBotBattle(player, battle);
        }, this.getDelay(1000));
    }
    
    executeBotBattle(player, battle) {
        console.log('=== executeBotBattle called ===');
        console.log('Player:', player.name);
        console.log('Battle:', battle);
        console.log('Monster:', battle.monster);
        
        const monster = battle.monster;
        let battleActions = [];
        
        console.log('Step 1: Calculating combat items...');
        // Calculate sure damage from combat items
        let sureKillDamage = 0;
        let grenades = player.inventory.filter(item => item.name === 'Grenade').length;
        let bombs = player.inventory.filter(item => item.name === 'Bomb').length;
        let dynamites = player.inventory.filter(item => item.name === 'Dynamite').length;
        
        sureKillDamage = grenades * 1 + bombs * 2 + dynamites * 3;
        console.log('Combat items calculated. Sure kill damage:', sureKillDamage);
        
        console.log('Step 2: Checking if can kill with items alone...');
        // Use combat items strategically
        if (sureKillDamage >= monster.hp) {
            console.log('Can kill with items alone. Monster HP:', monster.hp);
            // Can kill with items alone - use minimal items
            let remainingHP = monster.hp;
            let itemsUsed = [];
            
            console.log('Using dynamites...');
            // Use items efficiently (largest first to minimize waste)
            while (remainingHP > 0 && dynamites > 0) {
                const dynamiteIndex = player.inventory.findIndex(item => item.name === 'Dynamite');
                if (dynamiteIndex >= 0) {
                    player.inventory.splice(dynamiteIndex, 1);
                    remainingHP -= 3;
                    itemsUsed.push('Dynamite');
                    dynamites--;
                    console.log('Used dynamite. Remaining HP:', remainingHP);
                } else {
                    console.log('No dynamite found in inventory, breaking loop');
                    break; // Exit loop if no dynamite found
                }
            }
            
            console.log('Using bombs...');
            while (remainingHP > 0 && bombs > 0) {
                const bombIndex = player.inventory.findIndex(item => item.name === 'Bomb');
                if (bombIndex >= 0) {
                    player.inventory.splice(bombIndex, 1);
                    remainingHP -= 2;
                    itemsUsed.push('Bomb');
                    bombs--;
                    console.log('Used bomb. Remaining HP:', remainingHP);
                } else {
                    console.log('No bomb found in inventory, breaking loop');
                    break; // Exit loop if no bomb found
                }
            }
            
            console.log('Using grenades...');
            while (remainingHP > 0 && grenades > 0) {
                const grenadeIndex = player.inventory.findIndex(item => item.name === 'Grenade');
                if (grenadeIndex >= 0) {
                    player.inventory.splice(grenadeIndex, 1);
                    remainingHP -= 1;
                    itemsUsed.push('Grenade');
                    grenades--;
                    console.log('Used grenade. Remaining HP:', remainingHP);
                } else {
                    console.log('No grenade found in inventory, breaking loop');
                    break; // Exit loop if no grenade found
                }
            }
            
            // Use all Fake Blood for bonus points
            const fakeBloodCount = player.inventory.filter(item => item.name === 'Fake Blood').length;
            for (let i = 0; i < fakeBloodCount; i++) {
                const fakeBloodIndex = player.inventory.findIndex(item => item.name === 'Fake Blood');
                if (fakeBloodIndex >= 0) {
                    player.inventory.splice(fakeBloodIndex, 1);
                    battle.bonusPts += monster.level;
                    itemsUsed.push('Fake Blood');
                }
            }
            
            battleActions.push(`used ${itemsUsed.join(', ')} to kill monster instantly`);
            
            console.log('Monster killed with items. Applying victory rewards...');
            // Apply victory rewards
            this.applyBotVictoryRewards(player, monster, battle, battleActions);
            console.log('Victory rewards applied.');
            
            // Log all battle actions (entries are either {k,a} structured or plain strings)
            battleActions.forEach(action => {
                this.flushBattleAction(action, player);
            });

            // Update displays after all battle changes
            this.updateResourceDisplay();
            this.updateInventoryDisplayOld();
            this.updateInventoryDisplay(player.id);

            // Force a complete UI refresh for bot players
            if (player.isBot) {
                setTimeout(() => {
                    this.updateResourceDisplay();
                    this.updateInventoryDisplayOld();
                    this.updateInventoryDisplay(player.id);
                }, this.getDelay(100));
            }
            
            // Continue to next battle or end battle phase
            setTimeout(() => {
                if (this.gameMode === 'online' && this.isHost) {
                    if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                        this.handleForestEncountersOnline(this.remainingForestHunters);
                    } else {
                        this.playerShownMonsters = {};
                        this.endRoundOnline();
                    }
                } else {
                    if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                        this.handleForestEncounters(this.remainingForestHunters);
                    } else {
                        this.playerShownMonsters = {};
                        this.endRound();
                    }
                }
            }, this.getDelay(2000));

            console.log('Ending executeBotBattle with instant kill.');
            return;
        }
        
        console.log('Step 3: Starting full battle simulation...');
        // Simulate full battle
        let currentPlayerHP = player.resources.hp;
        let currentMonsterHP = monster.hp;
        console.log('Initial state - Player HP:', currentPlayerHP, 'Monster HP:', currentMonsterHP);
        let battleRound = 1;

        // Check if monster attacks first based on defense
        let monsterAttacksFirst = false;
        if (monster.effectId) {
            const defenseCount = player.weapon?.currentDefenseDice || 0;
            monsterAttacksFirst = this.checkBattleOrder(monster.effectId, defenseCount);
            if (monsterAttacksFirst) {
                battleActions.push(`⚠️ Monster attacks first! (${player.name}'s defense: ${defenseCount})`);
            }
        }

        // Check ammunition - if entrance fee paid (ammunitionConsumed = true), bot can attack
        let canAttack = true;
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            // If ammunition not consumed yet, check and consume
            if (!battle.ammunitionConsumed) {
                const bulletIndex = player.inventory.findIndex(item => item.name === 'Bullet');
                if (bulletIndex === -1) {
                    canAttack = false;
                    battleActions.push({k:'battle.noBullets', a:[this.getPlayerDisplayName(player)]});
                    currentPlayerHP = 0;
                    battleActions.push({k:'battle.defeatedNoAmmo', a:[this.getPlayerDisplayName(player)]});
                } else {
                    // Consume one bullet as entrance fee
                    player.inventory.splice(bulletIndex, 1);
                    battle.ammunitionConsumed = true;
                    battleActions.push({k:'battle.usesBullet', a:[this.getPlayerDisplayName(player)]});
                }
            }
            // If ammunitionConsumed is true, bot can attack freely
        } else if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            // If ammunition not consumed yet, check and consume
            if (!battle.ammunitionConsumed) {
                const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
                if (batteryIndex === -1) {
                    canAttack = false;
                    battleActions.push({k:'battle.noBatteries', a:[this.getPlayerDisplayName(player)]});
                    currentPlayerHP = 0;
                    battleActions.push({k:'battle.defeatedNoAmmo', a:[this.getPlayerDisplayName(player)]});
                } else {
                    // Consume one battery as entrance fee
                    player.inventory.splice(batteryIndex, 1);
                    battle.ammunitionConsumed = true;
                    battleActions.push({k:'battle.usesBattery', a:[this.getPlayerDisplayName(player)]});
                }
            }
            // If ammunitionConsumed is true, bot can attack freely
        }
        
        while (currentPlayerHP > 0 && currentMonsterHP > 0 && canAttack) {
            battleActions.push(`--- Round ${battleRound} ---`);

            // MONSTER ATTACKS FIRST (if effect active)
            if (monsterAttacksFirst) {
                const monsterDamage = monster.att;

                // Bot defense
                const defenseDice = player.weapon.currentDefenseDice;
                const defenseRolls = [];
                for (let i = 0; i < defenseDice; i++) {
                    defenseRolls.push(Math.floor(Math.random() * 6) + 1);
                }

                let defense = 0;
                // Bow Level 1 Power: 3,4,5,6 = 1 defense (+16% dodge)
                let defenseThreshold = 4;
                if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 1) {
                    defenseThreshold = 3;
                }
                defenseRolls.forEach(roll => {
                    if (roll >= defenseThreshold) defense++;
                });

                const finalDamage = Math.max(0, monsterDamage - defense);
                currentPlayerHP -= finalDamage;

                // Bot gains EXP equal to damage taken (unless Axe or monster effect prevents it)
                let expGained = 0;
                if (finalDamage > 0) {
                    if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                        expGained = Math.max(0, finalDamage - 1);
                        if (expGained > 0) {
                            player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                        }
                        battleActions.push({k:'battle.monsterFirstAttackAxe', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                    } else {
                    const damageEffect = this.applyBattleEffect(monster, 'playerDamaged', player);
                    if (damageEffect && damageEffect.noEXP) {
                        battleActions.push({k:'battle.monsterFirstAttackNoExp', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage]});
                    } else if (damageEffect && damageEffect.maxEXP) {
                        expGained = Math.min(finalDamage, damageEffect.maxEXP);
                        player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                        battleActions.push({k:'battle.monsterFirstAttackCapped', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                    } else {
                        expGained = finalDamage;
                        player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                        battleActions.push({k:'battle.monsterFirstAttack', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                    }
                    }
                } else {
                    battleActions.push({k:'battle.monsterFirstAttackPlain', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage]});
                }

                // Axe retaliation (if player survives)
                if (player.weapon.name === 'Axe' && finalDamage > 0 && currentPlayerHP > 0) {
                    let retaliationDamage;
                    if (player.weapon.powerTrackPosition >= 7) {
                        retaliationDamage = finalDamage;
                        battleActions.push({k:'battle.axeLv3Counter', a:[this.getPlayerDisplayName(player), retaliationDamage]});
                    } else {
                        retaliationDamage = 1;
                        battleActions.push({k:'battle.axeLv1Counter', a:[this.getPlayerDisplayName(player), retaliationDamage]});
                    }
                    const axeDamageCap = this.applyBattleEffect(monster, 'damageCap');
                    if (axeDamageCap !== null) {
                        retaliationDamage = Math.min(retaliationDamage, axeDamageCap);
                    }
                    currentMonsterHP -= retaliationDamage;
                    if (currentMonsterHP <= 0) {
                        battleActions.push({k:'battle.axeKill', a:[]});
                        break;
                    }
                }

                if (currentPlayerHP <= 0) {
                    battleActions.push({k:'battle.playerDefeated', a:[this.getPlayerDisplayName(player)]});
                    break;
                }
            }

            // Bot's turn - attack (either first or after monster)
            const attackDice = player.weapon.currentAttackDice;
            const attackRolls = [];
            for (let i = 0; i < attackDice; i++) {
                attackRolls.push(Math.floor(Math.random() * 6) + 1);
            }
            
            let playerDamage = this.calculateDamage(player.id, attackRolls);
            
            // Ammunition already consumed at battle start - no per-attack consumption
            
            // Add pet damage if present
            let petDamage = 0;
            Object.entries(battle.petsUsed).forEach(([level, count]) => {
                if (count > 0) {
                    const levelNum = parseInt(level.replace('level', ''));
                    petDamage += count * levelNum;
                }
            });
            
            let totalDamage = playerDamage + petDamage;
            
            // Apply damage cap if monster has such an effect
            const damageCap = this.applyBattleEffect(monster, 'damageCap');
            if (damageCap !== null) {
                const originalDamage = totalDamage;
                totalDamage = Math.min(totalDamage, damageCap);
                if (originalDamage > damageCap) {
                    battleActions.push({k:'battle.damageCap', a:[damageCap, originalDamage]});
                }
            }
            
            currentMonsterHP -= totalDamage;

            // Apply player attack effects (EP loss for effects 10, 19, 29)
            this.applyBattleEffect(monster, 'playerAttack', player);

            // Apply monster damaged effects (HP gain for effect 11) - only if monster survives
            if (totalDamage > 0 && currentMonsterHP > 0) {
                monster.hp = currentMonsterHP;  // sync damage before effect
                this.applyBattleEffect(monster, 'monsterDamaged', player);
                currentMonsterHP = monster.hp;  // read back after effect
            }

            battleActions.push({k:'battle.playerAttacks', a:[this.getPlayerDisplayName(player), attackRolls.join(', '), playerDamage, petDamage > 0 ? t('battle.petDamageSuffix', petDamage) : '', totalDamage]});


            // Tactical item usage: Check if bot can finish monster with items
            if (currentMonsterHP > 0) {
                const itemCombination = this.findOptimalItemCombination(player, currentMonsterHP, monster);
                if (itemCombination && itemCombination.length > 0) {
                    // Use items to finish the monster
                    let itemDamage = 0;
                    const itemsUsed = [];
                    
                    for (const itemUse of itemCombination) {
                        // Find and remove item from inventory
                        const itemIndex = player.inventory.findIndex(item => item.name === itemUse.name);
                        if (itemIndex >= 0) {
                            player.inventory.splice(itemIndex, 1);
                            itemDamage += itemUse.damage;
                            itemsUsed.push(itemUse.name);
                        }
                    }
                    
                    // Apply damage cap to item damage as well
                    let finalItemDamage = itemDamage;
                    const itemDamageCap = this.applyBattleEffect(monster, 'damageCap');
                    const localizedItemsUsed = itemsUsed.map(n => this.getItemDisplayName(n)).join(', ');
                    if (itemDamageCap !== null) {
                        finalItemDamage = Math.min(itemDamage, itemDamageCap);
                        if (itemDamage > itemDamageCap) {
                            battleActions.push({k:'battle.itemsUsedCapped', a:[this.getPlayerDisplayName(player), localizedItemsUsed, finalItemDamage, itemDamage]});
                        } else {
                            battleActions.push({k:'battle.itemsUsedDamage', a:[this.getPlayerDisplayName(player), localizedItemsUsed, finalItemDamage]});
                        }
                    } else {
                        battleActions.push({k:'battle.itemsUsedDamage', a:[this.getPlayerDisplayName(player), localizedItemsUsed, finalItemDamage]});
                    }
                    currentMonsterHP -= finalItemDamage;
                }
            }
            
            if (currentMonsterHP <= 0) {
                battleActions.push({k:'battle.monsterDefeatedSimple', a:[]});
                break;
            }

            // MONSTER'S TURN (only if it didn't attack first)
            if (!monsterAttacksFirst) {
                const monsterDamage = monster.att;
            
            // Bot defense
            const defenseDice = player.weapon.currentDefenseDice;
            const defenseRolls = [];
            for (let i = 0; i < defenseDice; i++) {
                defenseRolls.push(Math.floor(Math.random() * 6) + 1);
            }
            
            let defense = 0;
            // Bow Level 1 Power: 3,4,5,6 = 1 defense (+16% dodge)
            let defenseThreshold = 4;
            if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 1) {
                defenseThreshold = 3;
            }
            defenseRolls.forEach(roll => {
                if (roll >= defenseThreshold) defense++;
            });

            const finalDamage = Math.max(0, monsterDamage - defense);
            currentPlayerHP -= finalDamage;

            // Bot gains EXP equal to damage taken (unless monster effect prevents it)
            let expGained = 0;
            if (finalDamage > 0) {
                if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                    expGained = Math.max(0, finalDamage - 1);
                    if (expGained > 0) {
                        player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                    }
                    battleActions.push({k:'battle.monsterAttackAxe', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                } else {
                const damageEffect = this.applyBattleEffect(monster, 'playerDamaged', player);
                if (damageEffect && damageEffect.noEXP) {
                    battleActions.push({k:'battle.monsterAttackNoExp', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage]});
                } else if (damageEffect && damageEffect.maxEXP) {
                    expGained = Math.min(finalDamage, damageEffect.maxEXP);
                    player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                    battleActions.push({k:'battle.monsterAttackCapped', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                } else {
                    expGained = finalDamage;
                    player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + expGained);
                    battleActions.push({k:'battle.monsterAttackExp', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage, expGained]});
                }
                }
            } else {
                battleActions.push({k:'battle.monsterAttackPlain', a:[monsterDamage, this.getPlayerDisplayName(player), defenseRolls.join(', '), defense, finalDamage]});
            }
            
            // Sword Level 3 Power nerfed: only works on attack dice, not defense
            
            // Axe retaliation (if player survives)
            if (player.weapon.name === 'Axe' && finalDamage > 0 && currentPlayerHP > 0) {
                let retaliationDamage;
                if (player.weapon.powerTrackPosition >= 7) {
                    // Level 3: Deal same damage to monster (overrides Level 1)
                    retaliationDamage = finalDamage;
                    battleActions.push({k:'battle.axeLv3Counter', a:[this.getPlayerDisplayName(player), retaliationDamage]});
                } else {
                    // Level 1: Deal 1 damage to monster when HP decreases
                    retaliationDamage = 1;
                    battleActions.push({k:'battle.axeLv1Counter', a:[this.getPlayerDisplayName(player), retaliationDamage]});
                }
                // Apply damage cap to Axe retaliation
                const retaliationCap = this.applyBattleEffect(monster, 'damageCap');
                if (retaliationCap !== null) {
                    const originalRetaliation = retaliationDamage;
                    retaliationDamage = Math.min(retaliationDamage, retaliationCap);
                    if (originalRetaliation > retaliationCap && player.weapon.powerTrackPosition >= 7) {
                        battleActions.push({k:'battle.axeCounterCapped', a:[retaliationCap]});
                    }
                }
                currentMonsterHP -= retaliationDamage;
                
                if (currentMonsterHP <= 0) {
                    battleActions.push({k:'battle.axeKill', a:[]});
                    break;
                }
            }
            } // End of monster turn (if !monsterAttacksFirst)

            battleRound++;
            
            // Safety break to prevent infinite battles
            if (battleRound > 20) {
                battleActions.push({k:'battle.timeout', a:[]});
                currentPlayerHP = 0;
                break;
            }
        }
        
        // Apply battle results
        if (currentPlayerHP <= 0) {
            // Bot lost
            player.resources.hp = 1; // Set HP to 1 on defeat
            battleActions.push({k:'battle.survivedWith1HP', a:[this.getPlayerDisplayName(player)]});
        } else {
            // Bot won - update HP after battle
            player.resources.hp = currentPlayerHP;
            this.applyBotVictoryRewards(player, monster, battle, battleActions);
        }
        
        // Log all battle actions (entries are either {k,a} structured or plain strings)
        battleActions.forEach(action => {
            this.flushBattleAction(action, player);
        });
        
        // Update displays after all battle changes
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(player.id);
        
        // Force a complete UI refresh for bot players
        if (player.isBot) {
            setTimeout(() => {
                this.updateResourceDisplay();
                this.updateInventoryDisplayOld();
                this.updateInventoryDisplay(player.id);
            }, this.getDelay(100));
        }
        
        // Continue to next battle or end battle phase
        setTimeout(() => {
            if (this.gameMode === 'online' && this.isHost) {
                if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                    this.handleForestEncountersOnline(this.remainingForestHunters);
                } else {
                    this.playerShownMonsters = {};
                    this.endRoundOnline();
                }
            } else {
                if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                    this.handleForestEncounters(this.remainingForestHunters);
                } else {
                    this.playerShownMonsters = {};
                    this.endRound();
                }
            }
        }, this.getDelay(2000));
    }
    
    applyBotVictoryRewards(player, monster, battle, battleActions) {
        // Track monsters defeated for statistics
        if (!player.monstersDefeated) {
            player.monstersDefeated = { level1: 0, level2: 0, level3: 0 };
        }
        
        player.monstersDefeated[`level${monster.level}`]++;
        battleActions.push({k:'battle.totalDefeated', a:[this.getPlayerDisplayName(player), player.monstersDefeated.level1, player.monstersDefeated.level2, player.monstersDefeated.level3]});
        
        // Knife Lv1 Power: defeating a monster doubles non-point rewards
        const knifeMultiplier = (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 1) ? 2 : 1;

        // Apply monster rewards
        const finalMoney = monster.money * knifeMultiplier;
        const finalEnergy = monster.energy * knifeMultiplier;
        const finalBlood = monster.blood * knifeMultiplier;

        if (knifeMultiplier === 2 && (monster.money + monster.energy + monster.blood) > 0) {
            battleActions.push({k:'battle.knifeLv1Doubled', a:[]});
        }

        // Apply resource caps (money max 15, others handled by items)
        player.resources.money = Math.min(player.maxResources.money, player.resources.money + finalMoney);
        player.resources.beer += finalEnergy; // Monster data uses 'energy' not 'beer'
        player.resources.bloodBag += finalBlood; // Monster data uses 'blood' not 'bloodBag'
        // Split the points between monster and fake blood sources
        this.addScore(player.id, monster.pts, 'monster');
        if (battle.bonusPts > 0) {
            this.addScore(player.id, battle.bonusPts, 'fakeblood');
        }

        // Sword Lv3 Power: +X bonus points where X = monster level (categorized as 'other')
        if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 7) {
            this.addScore(player.id, monster.level, 'other');
            battleActions.push({k:'battle.swordLv3Bonus', a:[monster.level]});
        }
        
        // Add items to inventory
        if (finalEnergy > 0) {
            for (let i = 0; i < finalEnergy; i++) {
                player.inventory.push({ name: 'Beer', size: 1, effect: 'gain_1_energy' });
            }
        }
        if (finalBlood > 0) {
            for (let i = 0; i < finalBlood; i++) {
                player.inventory.push({ name: 'Blood Bag', size: 1, effect: 'gain_1_blood' });
            }
        }
        
        let rewardText = t('battle.victoryGained', finalMoney);
        if (finalEnergy > 0) rewardText += t('battle.victoryGainedBeer', finalEnergy);
        if (finalBlood > 0) rewardText += t('battle.victoryGainedBlood', finalBlood);
        rewardText += t('battle.victoryGainedPoints', monster.pts + battle.bonusPts);

        battleActions.push(rewardText);
        
        // Advance weapon power track based on monster level
        this.advanceWeaponPowerTrack(player.id, monster.level, battleActions);
        
        // Automatically manage resources after battle victory
        const botPlayer = new BotPlayer(player.id, player.weapon);
        botPlayer.handleBotCapacityOverflow(player, this);
        
        // Try to tame monster if Chain/Whip weapon
        if ((player.weapon.name === 'Chain' || player.weapon.name === 'Whip') && this.canTameMonster(player, monster)) {
            if (!player.pets) {
                player.pets = { level1: 0, level2: 0, level3: 0 };
            }
            player.pets[`level${monster.level}`]++;
            battleActions.push({k:'battle.tameAsPet', a:[this.getPlayerDisplayName(player), monster.level]});
            
            // Update pet display to show new pet
            this.updatePetDisplay();
        }
        
        // Auto-use items for recovery and upgrades
        this.handleBotItemUsage(player, battleActions);
    }
    
    handleBotItemUsage(player, battleActions) {
        const actions = [];
        
        // Priority 1: Recover HP with blood bags
        while (player.resources.hp < player.maxResources.hp) {
            const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
            if (bloodBagIndex >= 0) {
                player.inventory.splice(bloodBagIndex, 1);
                player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                player.resources.hp = Math.min(player.maxResources.hp, player.resources.hp + 1);
                actions.push(t('botAction.usedBloodBag', 1));
            } else {
                break;
            }
        }

        // Priority 2: Recover EP with beer
        while (player.resources.ep < player.maxResources.ep) {
            const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
            if (beerIndex >= 0) {
                player.inventory.splice(beerIndex, 1);
                player.resources.beer = Math.max(0, player.resources.beer - 1);
                player.resources.ep = Math.min(player.maxResources.ep, player.resources.ep + 1);
                actions.push(t('botAction.usedBeer', 1));
            } else {
                break;
            }
        }
        
        // Priority 3: Upgrade HP (need 3 blood bags)
        const bloodBags = player.inventory.filter(item => item.name === 'Blood Bag');
        while (bloodBags.length >= 3 && player.maxResources.hp < 10) {
            // Remove 3 blood bags
            for (let i = 0; i < 3; i++) {
                const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
                if (bloodBagIndex >= 0) {
                    player.inventory.splice(bloodBagIndex, 1);
                    player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                }
            }
            
            player.maxResources.hp++;
            player.resources.hp++;
            
            // Check for milestone bonuses
            if (player.maxResources.hp === 6 && !player.milestones.hp6) {
                this.addScore(player.id, 2, 'milestone');
                player.milestones.hp6 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-hp-milestone-6`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(t('botAction.upgradedHpMilestone', player.maxResources.hp, 2));
            } else if (player.maxResources.hp === 8 && !player.milestones.hp8) {
                this.addScore(player.id, 3, 'milestone');
                player.milestones.hp8 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-hp-milestone-8`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(t('botAction.upgradedHpMilestone', player.maxResources.hp, 3));
            } else if (player.maxResources.hp === 10 && !player.milestones.hp10) {
                this.addScore(player.id, 4, 'milestone');
                player.milestones.hp10 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-hp-milestone-10`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(t('botAction.upgradedHpMilestone', player.maxResources.hp, 4));
            } else {
                actions.push(t('botAction.upgradedHp', player.maxResources.hp));
            }
            
            bloodBags.splice(0, 3); // Update local array
        }
        
        // Priority 4: Upgrade EP (need 4 beers)
        const beers = player.inventory.filter(item => item.name === 'Beer');
        while (beers.length >= 4 && player.maxResources.ep < 10) {
            // Remove 4 beers
            for (let i = 0; i < 4; i++) {
                const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                if (beerIndex >= 0) {
                    player.inventory.splice(beerIndex, 1);
                    player.resources.beer = Math.max(0, player.resources.beer - 1);
                }
            }
            
            player.maxResources.ep++;
            player.resources.ep++;
            
            // Check for milestone bonuses
            if (player.maxResources.ep === 8 && !player.milestones.ep8) {
                this.addScore(player.id, 2, 'milestone');
                player.milestones.ep8 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-ep-milestone-8`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(t('botAction.upgradedEpMilestone', player.maxResources.ep, 2));
            } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                this.addScore(player.id, 4, 'milestone');
                player.milestones.ep10 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(t('botAction.upgradedEpMilestone', player.maxResources.ep, 4));
            } else {
                actions.push(t('botAction.upgradedEp', player.maxResources.ep));
            }
            
            beers.splice(0, 4); // Update local array
        }
        
        // Priority 5: Upgrade attack/defense dice with EXP
        const botPlayer = new BotPlayer(player.id, player.weapon);
        botPlayer.manageEXP(player);
        
        // Log all actions
        if (actions.length > 0) {
            battleActions.push({k:'battle.autoManaged', a:[actions.join(', ')]});
        }
    }
    
    canTameMonster(player, monster) {
        // Chain weapon can tame monsters with HP <= 3
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 1) {
            return monster.hp <= 3;
        }

        // Whip weapon can tame monsters based on power level
        if (player.weapon.name === 'Whip') {
            if (player.weapon.powerTrackPosition >= 7) {
                return monster.hp <= 6; // Level 3: Can tame monsters with HP <= 6
            } else if (player.weapon.powerTrackPosition >= 4) {
                return monster.hp <= 4; // Level 2: Can tame monsters with HP <= 4
            } else if (player.weapon.powerTrackPosition >= 1) {
                return monster.hp <= 2; // Level 1: Can tame monsters with HP <= 2
            }
        }

        // Standard taming: any weapon can tame at monster HP = 1
        return monster.hp <= 1;
    }
    
    showStationModal() {
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Processing station phase with ${this.pendingStationPlayers ? this.pendingStationPlayers.length : 0} players`);
        }
        
        if (this.pendingStationPlayers.length === 0) {
            // All station choices made, distribute station resources and proceed to store phase
            this.distributeStationResources();
            this.enterStorePhase();
            return;
        }
        
        const playerId = this.pendingStationPlayers[0];
        const player = this.players.find(p => p.id === playerId);
        
        // Check if current player is a bot (should always be true in automated mode)
        if (player.isBot) {
            this.handleBotStationSelection(player);
            return;
        }
        
        // Update modal with correct amounts based on total count and player count
        const workSite = this.locations.find(l => l.id === 1);
        const bar = this.locations.find(l => l.id === 2);
        const hospital = this.locations.find(l => l.id === 4);
        const dojo = this.locations.find(l => l.id === 5);
        
        const moneyAmount = this.getRewardAmount(workSite, this.stationTotalCount);
        const beerAmount = this.getRewardAmount(bar, this.stationTotalCount);
        const bloodBagAmount = this.getRewardAmount(hospital, this.stationTotalCount);
        const expAmount = this.getRewardAmount(dojo, this.stationTotalCount);
        
        document.getElementById('money-amount').textContent = moneyAmount;
        document.getElementById('beer-amount').textContent = beerAmount;
        document.getElementById('bloodBag-amount').textContent = bloodBagAmount;
        document.getElementById('exp-amount').textContent = expAmount;
        
        document.getElementById('station-modal-title').textContent = t('station.modalTitle', this.getPlayerDisplayName(player));
        document.getElementById('station-modal').style.display = 'flex';
        this.pendingStationPlayer = playerId;
    }
    
    selectStationResource(resourceType) {
        if (this.pendingStationPlayer === null) return;

        if (this.gameMode === 'online' && !this.isHost) {
            this.selectStationResourceOnline(resourceType);
            return;
        }

        this.stationChoices[this.pendingStationPlayer] = resourceType;
        document.getElementById('station-modal').style.display = 'none';

        // Remove this player from pending list
        this.pendingStationPlayers.shift();

        if (this.gameMode === 'online') {
            // Online host: continue processing station
            if (this.pendingStationPlayers.length === 0) {
                this.distributeStationResources();
                this.enterStorePhaseOnline();
            } else {
                this.processOnlineStationPhase();
            }
        } else {
            // Show modal for next player or complete distribution
            this.showStationModal();
        }
    }
    
    handleBotStationSelection(player) {
        // Find bot's weapon preferred resource
        let preferredResource = null;
        
        // Map weapon preferred locations to Station resources
        const locationToResource = {
            1: 'money',     // Work Site -> Money
            2: 'beer',      // Bar -> Beer  
            4: 'bloodBag',  // Hospital -> Blood Bags
            5: 'exp'        // Dojo -> EXP
        };
        
        if (player.weapon && player.weapon.preferLocation) {
            preferredResource = locationToResource[player.weapon.preferLocation];
        }
        
        let selectedResource;
        
        if (preferredResource) {
            // Choose the same resource as the bot's preferred location
            selectedResource = preferredResource;
            this.addLogEntryT('log.botStationPreferred', [player, preferredResource], 'resource-gain', player);
        } else {
            // Choose randomly from available options
            const availableResources = ['money', 'beer', 'bloodBag', 'exp'];
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            selectedResource = availableResources[randomIndex];
            this.addLogEntryT('log.botStationRandom', [player, selectedResource], 'resource-gain', player);
        }
        
        // Apply the selection
        this.stationChoices[player.id] = selectedResource;
        
        // Remove this player from pending list
        this.pendingStationPlayers.shift();

        // Continue to next player or complete distribution
        setTimeout(() => {
            if (this.gameMode === 'online') {
                if (this.pendingStationPlayers.length === 0) {
                    this.distributeStationResources();
                    this.enterStorePhaseOnline();
                } else {
                    this.processOnlineStationPhase();
                }
            } else {
                this.showStationModal();
            }
        }, this.getDelay(500));
    }
    
    distributeStationResources() {
        // Handle station resources
        Object.entries(this.stationChoices).forEach(([playerId, resourceType]) => {
            const player = this.players.find(p => p.id === parseInt(playerId));
            if (!player) return;
            
            // Determine reward amount based on station total count using dynamic scaling
            let rewardAmount;
            let locationRewards;
            
            // Get the appropriate reward array based on resource type
            if (resourceType === 'money') {
                locationRewards = this.getLocationRewards('work');
            } else if (resourceType === 'beer') {
                locationRewards = this.getLocationRewards('bar');
            } else if (resourceType === 'bloodBag') {
                locationRewards = this.getLocationRewards('hospital');
            } else if (resourceType === 'exp') {
                locationRewards = this.getLocationRewards('dojo');
            }
            
            // Calculate reward based on player count and token count
            rewardAmount = this.getRewardAmount({ rewards: locationRewards }, this.stationTotalCount);
            
            console.log(`Station resource distribution: Player ${player.name} chose ${resourceType}`);
            console.log(`  - Station total count: ${this.stationTotalCount}`);
            console.log(`  - Location rewards array: [${locationRewards}]`);
            console.log(`  - Calculated reward amount: ${rewardAmount}`);
            
            if (resourceType === 'money' || resourceType === 'exp') {
                this.modifyResource(parseInt(playerId), resourceType, rewardAmount);
                const resourceKey = resourceType === 'money' ? 'common.money' : 'common.exp';
                this.addLogEntryT(
                    'log.receivedFromLocation',
                    [player, rewardAmount, this.tArg(resourceKey), this.tArg('location.station')],
                    'resource-gain',
                    player
                );
            } else if (resourceType === 'beer' || resourceType === 'bloodBag') {
                player.resources[resourceType] += rewardAmount;
                // Also add items to inventory
                const itemName = resourceType === 'beer' ? 'Beer' : 'Blood Bag';
                this.addItemToInventory(parseInt(playerId), itemName, rewardAmount);
                const itemKey = resourceType === 'beer' ? 'item.beer.name' : 'item.bloodBag.name';
                this.addLogEntryT(
                    'log.receivedFromLocation',
                    [player, rewardAmount, this.tArg(itemKey), this.tArg('location.station')],
                    'resource-gain',
                    player
                );
            }
        });
        
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
    }
    
    // Unified update dispatcher - replaces multiple update calls
    updateAllDisplays(playerId = null) {
        if (this.isAutomatedMode) return;
        
        // Update resource display once
        this.updateResourceDisplay();
        
        // Update player-specific displays
        if (playerId !== null) {
            // Update specific player
            this.updatePlayerDisplay(playerId);
        } else {
            // Update all players
            this.players.forEach(player => {
                this.updatePlayerDisplay(player.id);
            });
        }
    }
    
    // Legacy compatibility - will be removed after refactoring
    updateInventoryDisplayOld() {
        this.players.forEach(player => {
            this.updatePlayerDisplay(player.id);
        });
    }

    updateDamageGrid(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.weapon || !player.weapon.damage) return;
        
        const damageGridElement = document.getElementById(`p${playerId}-damage-grid`);
        if (!damageGridElement) return;
        
        // Dice pip symbols for 1-6
        const dicePips = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        // Create damage grid HTML
        let gridHTML = '';
        for (let i = 0; i < 6; i++) {
            const diceValue = i + 1;
            const damageValue = player.weapon.damage[i];
            gridHTML += `
                <div class="damage-cell">
                    <div class="dice-pip">${dicePips[i]}</div>
                    <div class="damage-value">${damageValue}</div>
                </div>
            `;
        }
        
        damageGridElement.innerHTML = gridHTML;
    }
    
    updateBulletDisplay(playerId) {
        if (this.isAutomatedMode) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const bulletStat = document.getElementById(`p${playerId}-bullets-stat`);
        const bulletCount = document.getElementById(`p${playerId}-bullet-count`);

        // Return early if elements don't exist (e.g., in collapsed view)
        if (!bulletStat || !bulletCount) return;

        // Show bullet display only for Rifle players with Level 1 power
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
            bulletCount.textContent = `${bullets}/6`;
            bulletStat.style.display = 'flex';
        } else {
            bulletStat.style.display = 'none';
        }
    }

    updateBatteryDisplay(playerId) {
        if (this.isAutomatedMode) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const batteryStat = document.getElementById(`p${playerId}-batteries-stat`);
        const batteryCount = document.getElementById(`p${playerId}-battery-count`);

        // Return early if elements don't exist (e.g., in collapsed view)
        if (!batteryStat || !batteryCount) return;

        // Show battery display only for Plasma players with Level 1 power
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                // Level 3: Infinite battery
                batteryCount.textContent = '∞/∞';
            } else {
                const batteries = player.inventory.filter(item => item.name === 'Battery').length;
                batteryCount.textContent = `${batteries}/6`;
            }
            batteryStat.style.display = 'flex';
        } else {
            batteryStat.style.display = 'none';
        }
    }
    
    getPopularityLevelPoints(level) {
        // Return the point value for each popularity level
        const pointMap = {
            0: 0,   // Lv0 = 0 points
            1: 1,   // Lv1 = 1 point
            2: 2,   // Lv2 = 2 points
            3: 4,   // Lv3 = 4 points
            4: 7,   // Lv4 = 7 points
            5: 11   // Lv5 = 11 points
        };
        return pointMap[level] || 0;
    }
    
    processPopularityTrackLogic() {
        // This function contains only the game logic, no DOM updates
        // Can be called in both interactive and automated modes
        
        // Count tokens at each location
        const locationCounts = {};
        this.locations.forEach(loc => {
            locationCounts[loc.id] = 0;
        });
        
        // Count all tokens at each location
        this.players.forEach(player => {
            if (player.tokens.hunter) {
                locationCounts[player.tokens.hunter]++;
            }
            if (player.tokens.apprentice) {
                locationCounts[player.tokens.apprentice]++;
            }
        });
        
        // Update each player's popularity track
        this.players.forEach(player => {
            const hunterLocation = player.tokens.hunter;
            if (!hunterLocation) return;
            
            // Skip popularity track update if hunter is in Forest (location 7)
            if (hunterLocation === 7) {
                if (!this.isAutomatedMode) {
                    console.log(`Player ${player.id}'s hunter is in Forest - popularity track does not change`);
                }
                return;
            }
            
            const oldRewardLevel = player.popularityTrack.rewardToken;
            
            // Check if hunter is alone at location
            const isAlone = locationCounts[hunterLocation] === 1;
            
            // Move reward token up or down
            let shouldGiveRewards = false;
            let tokenMoved = false;
            
            if (isAlone) {
                // Sword and Katana Level 2 Power: +2 EXP when hunter is alone
                if ((player.weapon.name === 'Sword' || player.weapon.name === 'Katana' || player.weapon.name === 'Bow') &&
                    player.weapon.powerTrackPosition >= 3) {
                    this.modifyResource(player.id, 'exp', 2);
                    if (!this.isAutomatedMode) {
                        console.log(`${player.weapon.name} Lv2 Power: ${player.name} receives +2 EXP for being alone at location`);
                    }
                }

                // Knife Lv2 Power: +2 points when hunter is alone at location
                if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 3) {
                    this.addScore(player.id, 2, 'other');
                    if (!this.isAutomatedMode) {
                        console.log(`Knife Lv2 Power: ${player.name} receives +2 points for being alone at location`);
                        this.addLogEntryT('log.knifeLv2Alone', [player], 'power', player);
                    }
                }
                
                const oldRewardLevel = player.popularityTrack.rewardToken;
                player.popularityTrack.rewardToken = Math.min(5, player.popularityTrack.rewardToken + 1);
                
                // Check if token actually moved
                if (player.popularityTrack.rewardToken > oldRewardLevel) {
                    tokenMoved = true;
                }
                
                // Special case: if player was already at level 5 and would move up, still give rewards
                if (oldRewardLevel === 5 && player.popularityTrack.rewardToken === 5) {
                    shouldGiveRewards = true;
                    if (!this.isAutomatedMode) {
                        console.log(`Player ${player.id} was already at max popularity level 5 - still receives all rewards`);
                    }
                }
            } else {
                // Reward token goes down for crowded locations
                const beforeMove = player.popularityTrack.rewardToken;
                player.popularityTrack.rewardToken = Math.max(0, player.popularityTrack.rewardToken - 1);
                if (player.popularityTrack.rewardToken < beforeMove) {
                    tokenMoved = true; // Token moved down
                }
            }
            
            const newRewardLevel = player.popularityTrack.rewardToken;
            
            // Knife weapon: receives rewards like other weapons (removed special restriction)
            if (player.weapon.name === 'Knife') {
                if (newRewardLevel > 0 || shouldGiveRewards) {
                    this.distributePopularityRewards(player.id, shouldGiveRewards ? 5 : newRewardLevel);
                    if (!this.isAutomatedMode) {
                        console.log(`Knife weapon: ${player.name} receives popularity rewards at level ${newRewardLevel}`);
                    }
                }
            } else {
                // Normal weapons: distribute rewards as usual
                if (newRewardLevel > 0 || shouldGiveRewards) {
                    this.distributePopularityRewards(player.id, shouldGiveRewards ? 5 : newRewardLevel);
                }
            }
            
            // Update point token if reward token is higher
            if (newRewardLevel > player.popularityTrack.pointToken) {
                const oldPointLevel = player.popularityTrack.pointToken;
                player.popularityTrack.pointToken = newRewardLevel;
                
                // Give points for newly reached level
                if (!player.popularityTrack.levelReached[newRewardLevel]) {
                    player.popularityTrack.levelReached[newRewardLevel] = true;
                    const points = this.getPopularityLevelPoints(newRewardLevel);
                    this.addScore(player.id, points, 'popularity'); // Add correct point value for level

                    // Add log entry for level up
                    this.addLogEntryT('log.popularityLevelUp', [player, newRewardLevel, points], 'level-up', player);
                }
            }
        });
    }

    updatePopularityTrackDisplay(playerId) {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const trackElement = document.getElementById(`p${playerId}-popularity-track`);
        // Only return early if element doesn't exist AND boards are not collapsed
        if (!trackElement && !this.boardsCollapsed) return;
        
        // Define track levels with rewards
        const trackLevels = [
            { level: 5, points: 11, reward: '5🏆' },
            { level: 4, points: 7, reward: '4⭐' },
            { level: 3, points: 4, reward: '3🩸' },
            { level: 2, points: 2, reward: '2💰' },
            { level: 1, points: 1, reward: '1🍺' },
            { level: 0, points: 0, reward: '' }
        ];
        
        // Create track HTML
        let trackHTML = '<div class="track-levels">';
        
        trackLevels.forEach(level => {
            const hasPointToken = player.popularityTrack.pointToken === level.level;
            const hasRewardToken = player.popularityTrack.rewardToken === level.level;
            
            trackHTML += `
                <div class="track-level">
                    <div class="level-number">${t('popularity.lvShort', level.level)}</div>
                    <div class="level-section">
                        ${level.level === 5 ? `<div class="section-label">${t('popularity.points')}</div>` : ''}
                        <div class="section-value">${level.level === 0 ? '' : level.points}</div>
                        ${hasPointToken ? `<div class="track-token point-token" style="background-color: ${player.color?.background || '#f39c12'}; border-color: ${player.color?.border || '#f39c12'}; left: 35%;"></div>` : ''}
                    </div>
                    <div class="level-section">
                        ${level.level === 5 ? `<div class="section-label">${t('popularity.reward')}</div>` : ''}
                        <div class="section-value">${level.reward}</div>
                        ${hasRewardToken ? `<div class="track-token reward-token" style="background-color: ${player.color?.background || '#27ae60'}; border-color: ${player.color?.border || '#27ae60'}; left: 65%;"></div>` : ''}
                    </div>
                </div>
            `;
        });
        
        trackHTML += '</div>';

        // Update expanded track only if element exists
        if (trackElement) {
            trackElement.innerHTML = trackHTML;
        }

        // Also update collapsed popularity display if in collapsed mode
        if (this.boardsCollapsed) {
            const collapsedPopElement = document.getElementById(`p${playerId}-popularity-collapsed`);
            if (collapsedPopElement) {
                collapsedPopElement.textContent = `${player.popularityTrack.pointToken}/${player.popularityTrack.rewardToken}`;
            }
        }
    }
    
    updatePopularityTrack() {
        // Always run the game logic
        this.processPopularityTrackLogic();
        
        // Skip DOM updates in automated mode to avoid DOM errors
        if (this.isAutomatedMode) return;
        
        // Update DOM displays for all players
        this.players.forEach(player => {
            // Update level display
            const levelElement = document.getElementById(`p${player.id}-level`);
            if (levelElement) {
                levelElement.textContent = player.popularityTrack.pointToken;
            }
            
            // Update popularity track display
            this.updatePopularityTrackDisplay(player.id);
        });
        
        // Update resource display to show new scores
        this.updateResourceDisplay();
    }
    
    distributePopularityRewards(playerId, rewardLevel) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Define rewards for each level
        const levelRewards = {
            5: { score: 5 },
            4: { exp: 4 },
            3: { bloodBag: 3 },
            2: { money: 2 },
            1: { beer: 1 }
        };
        
        // Give rewards for current level and all levels below
        for (let level = rewardLevel; level >= 1; level--) {
            const rewards = levelRewards[level];
            if (!rewards) continue;
            
            // Add resources
            if (rewards.money) {
                this.modifyResource(playerId, 'money', rewards.money);
            }
            if (rewards.exp) {
                this.modifyResource(playerId, 'exp', rewards.exp);
            }
            if (rewards.beer) {
                // Add beer to inventory
                for (let i = 0; i < rewards.beer; i++) {
                    this.addItemToInventory(playerId, 'Beer');
                }
            }
            if (rewards.bloodBag) {
                // Add blood bags to inventory
                for (let i = 0; i < rewards.bloodBag; i++) {
                    this.addItemToInventory(playerId, 'Blood Bag');
                }
            }
            if (rewards.score) {
                this.addScore(player.id, rewards.score, 'popularity');
            }
        }
    }
    
    addToUpgrade(playerId, upgradeType) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Online non-host: send action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'player_board_action',
                playerId: playerId,
                data: { action: 'addToUpgrade', upgradeType: upgradeType }
            });
            return;
        }

        // Check if already at maximum
        if (player.maxResources[upgradeType] >= 10) {
            if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.maxUpgrade', upgradeType.toUpperCase()));
            return;
        }

        const itemName = upgradeType === 'ep' ? 'Beer' : 'Blood Bag';
        const requiredAmount = upgradeType === 'ep' ? 4 : 3; // EP needs 4 beers, HP needs 3 blood bags

        // Check if player has the item in inventory and upgrade isn't full
        const itemIndex = player.inventory.findIndex(item => item.name === itemName);
        if (itemIndex !== -1 && player.upgradeProgress[upgradeType] < requiredAmount) {
            // Remove item from inventory
            player.inventory.splice(itemIndex, 1);
            player.upgradeProgress[upgradeType]++;

            // Check if upgrade is complete
            if (player.upgradeProgress[upgradeType] === requiredAmount) {
                this.levelUpMaxResource(playerId, upgradeType, 1);
                player.upgradeProgress[upgradeType] = 0;
                // Log entry handled by levelUpMaxResource
            }

            // Update all displays
            this.updateInventoryDisplayOld();
            this.players.forEach(player => {
                this.updateInventoryDisplay(player.id);
            });
            this.updateResourceDisplay();

            // Refresh collapsed board if in collapsed mode
            if (this.boardsCollapsed) {
                this.refreshPlayerBoard(playerId);
            }

            // Refresh store display if in store phase to update capacity warnings
            if (this.roundPhase === 'store') {
                if (this.gameMode === 'online') {
                    // Only refresh store for the local player, not remote players
                    if (player.id === this.localPlayerId) {
                        this.showStoreForPlayer(player);
                    }
                } else if (this.gameMode === 'simultaneous') {
                    this.showStoreForPlayer(player);
                } else {
                    this.showStore();
                }
            }

            // Update location card states if in selection phase and EP was upgraded
            if (this.roundPhase === 'selection' && upgradeType === 'ep' && player.id === this.currentPlayer.id) {
                this.updateLocationCardStates();
            }

            // Online host: push state so all players see the update
            if (this.gameMode === 'online' && this.isHost) {
                this.pushOnlineBoardUpdate();
            }
        }
    }
    
    Item(playerId, itemType) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        if (itemType === 'beer' && player.resources.beer > 0) {
            // Recover 1 EP
            if (player.resources.ep < player.maxResources.ep) {
                player.resources.beer--;
                this.modifyResource(playerId, 'ep', 1);
                this.updateInventoryDisplayOld();
                this.players.forEach(p => {
                    this.updateInventoryDisplay(p.id);
                });
                alert(t('alert.usedBeer', player.name));
            } else {
                alert(t('alert.epAlreadyMax', player.name));
            }
        } else if (itemType === 'bloodBag' && player.resources.bloodBag > 0) {
            // Recover 1 HP
            if (player.resources.hp < player.maxResources.hp) {
                player.resources.bloodBag--;
                this.modifyResource(playerId, 'hp', 1);
                this.updateInventoryDisplayOld();
                this.players.forEach(p => {
                    this.updateInventoryDisplay(p.id);
                });
                alert(t('alert.usedBloodBag', player.name));
            } else {
                alert(t('alert.hpAlreadyMax', player.name));
            }
        } else {
            if (player.resources[itemType] === 0) {
                alert(t('alert.noItemType', player.name, itemType === 'bloodBag' ? 'blood bags' : itemType));
            }
        }
    }
    
    rollDice(numDice) {
        const results = [];
        for (let i = 0; i < numDice; i++) {
            results.push(Math.floor(Math.random() * 6) + 1);
        }
        return results;
    }
    
    calculateDamage(playerId, diceRolls) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return 0;
        
        let totalDamage = 0;
        diceRolls.forEach(roll => {
            // roll is 1-6, array index is 0-5
            let baseDamage = player.weapon.damage[roll - 1];
            
            // Gloves Powers: Enhance damage on dice that already deal damage (5,6)
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 1 && this.currentBattle) {
                if (baseDamage > 0) {
                    // Level 1: +1 attack when HP is below half of max HP
                    if (player.resources.hp < player.maxResources.hp / 2) {
                        baseDamage += 1;
                    }
                    // Level 3: +1 attack for each time damaged (cumulative, stacks with Lv1)
                    if (player.weapon.powerTrackPosition >= 7) {
                        baseDamage += this.currentBattle.glovesPowerLevel;
                    }
                }
            }
            
            totalDamage += baseDamage;
        });
        
        return totalDamage;
    }
    
    performCombat(attackerId, defenderId) {
        const attacker = this.players.find(p => p.id === attackerId);
        const defender = this.players.find(p => p.id === defenderId);
        
        if (!attacker || !defender) return null;
        
        // Roll attack dice
        const attackRolls = this.rollDice(attacker.weapon.currentAttackDice);
        const attackDamage = this.calculateDamage(attackerId, attackRolls);
        
        // Roll defense dice
        const defenseRolls = this.rollDice(defender.weapon.currentDefenseDice);
        const defenseDamage = this.calculateDamage(defenderId, defenseRolls);
        
        // Calculate final damage (attack - defense, minimum 0)
        const finalDamage = Math.max(0, attackDamage - defenseDamage);
        
        // Apply damage to defender's HP
        if (finalDamage > 0) {
            this.modifyResource(defenderId, 'hp', -finalDamage);
        }
        
        const result = {
            attacker: attacker.name,
            defender: defender.name,
            attackRolls,
            defenseRolls,
            attackDamage,
            defenseDamage,
            finalDamage,
            defenderHP: defender.resources.hp
        };
        
        // Display combat results
        this.displayCombatResults(result);
        
        return result;
    }
    
    displayCombatResults(result) {
        const resultsDiv = document.getElementById('combat-results');
        const resultHTML = `
            <div class="combat-result">
                <h4>${result.attacker} attacks ${result.defender}!</h4>
                <p><strong>Attack Rolls:</strong> [${result.attackRolls.join(', ')}] = ${result.attackDamage} damage</p>
                <p><strong>Defense Rolls:</strong> [${result.defenseRolls.join(', ')}] = ${result.defenseDamage} defense</p>
                <p><strong>Final Damage:</strong> ${result.finalDamage}</p>
                <p><strong>${result.defender} HP:</strong> ${result.defenderHP}</p>
            </div>
        `;
        resultsDiv.innerHTML = resultHTML;
        
        // Show combat section
        document.getElementById('combat-section').style.display = 'block';
        
        this.updateResourceDisplay();
    }
    
    upgradeWeapon(playerId, upgradeType) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        // Online non-host: send action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'player_board_action',
                playerId: playerId,
                data: { action: 'upgradeWeapon', upgradeType: upgradeType }
            });
            return;
        }

        let upgraded = false;

        if (upgradeType === 'attack') {
            // Check if already at max attack dice (7)
            if (player.weapon.currentAttackDice >= 7) {
                if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.attackDiceMax', player.name));
                return false;
            }

            const requiredExp = player.weapon.reqExpAttack; // Flat cost per level
            if (player.resources.exp >= requiredExp) {
                player.resources.exp -= requiredExp;
                player.weapon.attackLevel++;
                player.weapon.currentAttackDice++;
                this.updateResourceDisplay();
                this.updateInventoryDisplayOld();
                this.players.forEach(player => {
                    this.updateInventoryDisplay(player.id);
                }); // Update weapon display immediately
                upgraded = true;
            }
            // Insufficient EXP - silently fail (button should be disabled)
        } else if (upgradeType === 'defense') {
            // Check if already at max defense dice (6)
            if (player.weapon.currentDefenseDice >= 6) {
                if (!this.suppressAlerts && (this.isHost || this.gameMode !== 'online')) alert(t('alert.defenseDiceMax', player.name));
                return false;
            }

            const requiredExp = player.weapon.reqExpDefense; // Defense cost from weapon data
            if (player.resources.exp >= requiredExp) {
                player.resources.exp -= requiredExp;
                player.weapon.defenseLevel++;
                player.weapon.currentDefenseDice++;
                this.updateResourceDisplay();
                this.updateInventoryDisplayOld();
                this.players.forEach(player => {
                    this.updateInventoryDisplay(player.id);
                }); // Update weapon display immediately
                upgraded = true;
            }
            // Insufficient EXP - silently fail (button should be disabled)
        }

        // Online host: push state so all players see the update
        if (upgraded && this.gameMode === 'online' && this.isHost) {
            this.pushOnlineBoardUpdate();
        }

        return upgraded;
    }
    
    loadMonsters() {
        // Load monster data from Monster.csv
        // Since we can't directly read CSV files in browser, we'll use the parsed data
        // Effect IDs correspond to the order in Monster.csv
        const monsterData = [
            { level: 1, hp: 4, att: 1, money: 3, energy: 1, blood: 0, effect: "無", effectId: 1, pts: 2 },
            { level: 1, hp: 4, att: 1, money: 0, energy: 3, blood: 0, effect: "血減半時，攻擊力+1", effectId: 2, pts: 3 },
            { level: 1, hp: 4, att: 2, money: 2, energy: 1, blood: 0, effect: "偷走玩家2金幣", effectId: 3, pts: 4 },
            { level: 1, hp: 3, att: 2, money: 0, energy: 1, blood: 1, effect: "死亡時，玩家及在森林裡的玩家-1血(不會導致玩家血歸零)", effectId: 4, pts: 3 },
            { level: 1, hp: 3, att: 1, money: 0, energy: 0, blood: 1, effect: "玩家受傷無法獲得經驗", effectId: 5, pts: 2 },
            { level: 1, hp: 3, att: 2, money: 0, energy: 0, blood: 1, effect: "玩家無法一次給予怪獸超過2點傷害", effectId: 6, pts: 4 },
            { level: 1, hp: 3, att: 1, money: 1, energy: 1, blood: 0, effect: "玩家防禦力1以上先攻", effectId: 7, pts: 2 },
            { level: 1, hp: 3, att: 2, money: 0, energy: 2, blood: 1, effect: "這回合其他怪獸+1血", effectId: 8, pts: 2 },
            { level: 1, hp: 3, att: 3, money: 2, energy: 1, blood: 0, effect: "不在森林的玩家-1血", effectId: 9, pts: 4 },
            { level: 1, hp: 2, att: 3, money: 0, energy: 1, blood: 1, effect: "每次玩家攻擊-1體力", effectId: 10, pts: 3 },
            { level: 1, hp: 2, att: 3, money: 0, energy: 2, blood: 0, effect: "遭受攻擊後若沒有死亡+1血", effectId: 11, pts: 4 },
            { level: 1, hp: 2, att: 3, money: 3, energy: 0, blood: 0, effect: "不怕手榴彈", effectId: 12, pts: 3 },
            { level: 2, hp: 7, att: 2, money: 3, energy: 1, blood: 0, effect: "不在森林的玩家-1血", effectId: 13, pts: 7 },
            { level: 2, hp: 7, att: 2, money: 0, energy: 3, blood: 0, effect: "玩家無法一次給予怪獸超過4點傷害", effectId: 14, pts: 8 },
            { level: 2, hp: 7, att: 2, money: 2, energy: 1, blood: 0, effect: "不怕手榴彈、炸彈", effectId: 15, pts: 8 },
            { level: 2, hp: 7, att: 3, money: 2, energy: 2, blood: 1, effect: "這回合其他怪獸+1血", effectId: 16, pts: 6 },
            { level: 2, hp: 6, att: 2, money: 1, energy: 2, blood: 0, effect: "玩家防禦力3以上先攻", effectId: 17, pts: 6 },
            { level: 2, hp: 6, att: 3, money: 2, energy: 0, blood: 1, effect: "玩家防禦力2以上先攻", effectId: 18, pts: 7 },
            { level: 2, hp: 6, att: 4, money: 3, energy: 1, blood: 0, effect: "每次玩家攻擊-1體力", effectId: 19, pts: 8 },
            { level: 2, hp: 6, att: 3, money: 0, energy: 3, blood: 1, effect: "需要+1體力收服", effectId: 20, pts: 6 },
            { level: 2, hp: 5, att: 4, money: 2, energy: 1, blood: 0, effect: "玩家防禦力2以上先攻", effectId: 21, pts: 8 },
            { level: 2, hp: 5, att: 4, money: 2, energy: 0, blood: 1, effect: "玩家受傷最多獲得2經驗", effectId: 22, pts: 7 },
            { level: 2, hp: 5, att: 4, money: 0, energy: 2, blood: 1, effect: "不在森林的玩家-2經驗", effectId: 23, pts: 7 },
            { level: 2, hp: 5, att: 3, money: 2, energy: 2, blood: 0, effect: "血減半時，攻擊力+1", effectId: 24, pts: 6 },
            { level: 3, hp: 13, att: 3, money: 0, energy: 0, blood: 3, effect: "不在森林的玩家-2血", effectId: 25, pts: 15 },
            { level: 3, hp: 12, att: 3, money: 1, energy: 3, blood: 0, effect: "血減半時，攻擊力+1", effectId: 26, pts: 15 },
            { level: 3, hp: 12, att: 4, money: 0, energy: 1, blood: 2, effect: "玩家防禦力3以上先攻", effectId: 27, pts: 16 },
            { level: 3, hp: 11, att: 3, money: 2, energy: 2, blood: 0, effect: "不在森林的玩家-2分", effectId: 28, pts: 14 },
            { level: 3, hp: 11, att: 5, money: 2, energy: 1, blood: 1, effect: "每次玩家攻擊-1體力", effectId: 29, pts: 16 },
            { level: 3, hp: 11, att: 4, money: 1, energy: 3, blood: 0, effect: "玩家無法一次給予怪獸超過6點傷害", effectId: 30, pts: 15 },
            { level: 3, hp: 11, att: 4, money: 2, energy: 2, blood: 0, effect: "死亡時，玩家及在森林裡的玩家-1血(不會導致玩家血歸零)", effectId: 31, pts: 15 },
            { level: 3, hp: 11, att: 5, money: 1, energy: 0, blood: 2, effect: "玩家防禦力4以上先攻", effectId: 32, pts: 16 },
            { level: 3, hp: 10, att: 4, money: 3, energy: 1, blood: 0, effect: "這回合其他怪獸+1血", effectId: 33, pts: 14 },
            { level: 3, hp: 10, att: 4, money: 4, energy: 0, blood: 0, effect: "玩家受傷最多獲得4經驗", effectId: 34, pts: 14 },
            { level: 3, hp: 10, att: 4, money: 0, energy: 4, blood: 0, effect: "玩家防禦力3以上先攻", effectId: 35, pts: 14 },
            { level: 3, hp: 10, att: 5, money: 2, energy: 1, blood: 0, effect: "不怕手榴彈、炸彈、炸藥", effectId: 36, pts: 16 }
        ];

        // Organize by level and add index for unique identification
        const organized = { 1: [], 2: [], 3: [] };
        monsterData.forEach((monster, index) => {
            monster.index = index; // Add unique index for tracking
            organized[monster.level].push(monster);
        });

        return organized;
    }
    
    // Monster Effect System Functions
    applySelectionEffect(effectId, playerId) {
        // Apply effects that trigger when a monster is selected
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        switch(effectId) {
            case 3: // Player loses 2 money
                const moneyLoss = Math.min(player.resources.money, 2);
                if (moneyLoss > 0) {
                    this.modifyResource(player.id, 'money', -moneyLoss);
                    this.showEffectNotificationT('effect.stealMoney.notify', [moneyLoss, player]);
                }
                break;
                
            case 14: // Player needs 1 extra EP to select
                // This is handled in the selection phase by adding to EP cost
                break;
                
            case 30: // Player needs 2 extra EP to select
                // This is handled in the selection phase by adding to EP cost
                break;
        }
    }
    
    applyRoundEffect(effectId) {
        // Apply effects that affect all players for the round

        switch(effectId) {
            case 8: // Other monsters gain +1 HP this round
            case 16: // Other monsters gain +1 HP this round
            case 33: // Other monsters gain +1 HP this round
                // Only add the bonus once (check if it already exists)
                const hpBonusExists = this.activeMonsterEffects.some(effect => effect.type === 'otherMonstersHPBonus');
                if (!hpBonusExists) {
                    this.activeMonsterEffects.push({ type: 'otherMonstersHPBonus', value: 1 });
                    this.showEffectNotificationT('effect.boostOthers.notify', []);
                }
                break;
                
            case 9: // Players not in forest lose 1 HP
            case 13: // Players not in forest lose 1 HP
                const affectedPlayers9 = [];
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id) && p.resources.hp > 1) {
                        this.modifyResource(p.id, 'hp', -1);
                        affectedPlayers9.push(p.name);
                    }
                });
                if (affectedPlayers9.length > 0) {
                    this.showEffectNotificationT('effect.damageNonForest1.notify', [affectedPlayers9.join(', ')]);
                }
                break;
                
            case 23: // Players not in forest lose 2 EXP
                const affectedPlayers23 = [];
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id)) {
                        p.resources.exp = Math.max(0, p.resources.exp - 2);
                        affectedPlayers23.push(p.name);
                        // Update resource display for affected player
                        this.updateResourceDisplay(p.id);
                    }
                });
                if (affectedPlayers23.length > 0) {
                    this.showEffectNotificationT('effect.drainExpNonForest.notify', [affectedPlayers23.join(', ')]);
                }
                break;
                
            case 25: // Players not in forest lose 2 HP
                const affectedPlayers25 = [];
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id)) {
                        const hpLoss = Math.min(p.resources.hp - 1, 2);
                        if (hpLoss > 0) {
                            this.modifyResource(p.id, 'hp', -hpLoss);
                            affectedPlayers25.push(`${p.name} (-${hpLoss} HP)`);
                        }
                    }
                });
                if (affectedPlayers25.length > 0) {
                    this.showEffectNotificationT('effect.damageNonForest2.notify', [affectedPlayers25.join(', ')]);
                }
                break;
                
            case 28: // Players not in forest lose 2 points
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id)) {
                        p.score = Math.max(0, p.score - 2);
                        this.addLogEntryT('log.lostPoints', [p], 'effect', p);
                    }
                });
                break;
        }
    }
    
    checkBattleOrder(effectId, defenseCount) {
        // Check if monster attacks first based on player's defense
        const defense = defenseCount || 0;
        
        switch(effectId) {
            case 7: // Monster attacks first if defense < 1
                return defense < 1;
                
            case 17: // Monster attacks first if defense < 3
            case 27: // Monster attacks first if defense < 3
            case 35: // Monster attacks first if defense < 3
                return defense < 3;
                
            case 18: // Monster attacks first if defense < 2
            case 21: // Monster attacks first if defense < 2
                return defense < 2;
                
            case 32: // Monster attacks first if defense < 4
                return defense < 4;
                
            default:
                return false; // Normal order (player attacks first)
        }
    }
    
    // Overloaded version for simple damage cap queries
    applyBattleEffect(monsterOrEffectId, battleOrContext, context) {
        // Handle overloaded calls for damage cap
        if (typeof monsterOrEffectId === 'object' && battleOrContext === 'damageCap') {
            const monster = monsterOrEffectId;
            const effectId = monster.effectId;

            switch(effectId) {
                case 6: return 2;   // 2 damage cap
                case 14: return 4;  // 4 damage cap
                case 30: return 6;  // 6 damage cap
                default: return null;
            }
        }

        // Handle new call pattern: (monster, contextString, player)
        if (typeof monsterOrEffectId === 'object' && typeof battleOrContext === 'string' && context) {
            const monster = monsterOrEffectId;
            const effectId = monster.effectId;
            const contextStr = battleOrContext;
            const player = context;

            // Handle different contexts
            switch(effectId) {
                case 10: // Player loses 1 EP per attack
                case 19: // Player loses 1 EP per attack
                case 29: // Player loses 1 EP per attack
                    if (contextStr === 'playerAttack') {
                        const epLoss = Math.min(player.resources.ep, 1);
                        if (epLoss > 0) {
                            this.modifyResource(player.id, 'ep', -epLoss);
                            this.logBattleActionT('battle.monsterEffectDrainEP', [player], player);
                        }
                    }
                    break;

                case 11: // Monster gains +1 HP when attacked but not defeated
                    if (contextStr === 'monsterDamaged' && monster.hp > 0) {
                        monster.hp += 1;
                        monster.maxHp = Math.max(monster.maxHp, monster.hp);
                        this.logBattleActionT('battle.monsterEffectHeal', [monster.hp], player);
                    }
                    break;

                case 5: // Player gains no EXP from damage
                    if (contextStr === 'playerDamaged') {
                        return { noEXP: true };
                    }
                    break;

                case 22: // Player gains max 2 EXP from damage
                    if (contextStr === 'playerDamaged') {
                        return { maxEXP: 2 };
                    }
                    break;

                case 34: // Player gains max 4 EXP from damage
                    if (contextStr === 'playerDamaged') {
                        return { maxEXP: 4 };
                    }
                    break;
            }
            return;
        }

        // Original implementation for complex battle effects (old call pattern)
        const effectId = monsterOrEffectId;
        const battle = battleOrContext;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;
        
        switch(effectId) {
            case 2: // Attack +1 when HP < half
            case 24: // Attack +1 when HP < half
            case 26: // Attack +1 when HP < half
                if (context === 'monsterAttack' && monster.hp <= Math.floor(monster.maxHp / 2)) {
                    return { attackBonus: 1 };
                }
                break;
                
            case 5: // Player gains no EXP from damage
                if (context === 'playerDamaged') {
                    return { noEXP: true };
                }
                break;
                
            // Damage cap cases handled in overloaded version above
                
            case 22: // Player gains max 2 EXP from damage
                if (context === 'playerDamaged') {
                    return { maxEXP: 2 };
                }
                break;
                
            case 34: // Player gains max 4 EXP from damage
                if (context === 'playerDamaged') {
                    return { maxEXP: 4 };
                }
                break;
                
            case 10: // Player loses 1 EP per attack
            case 19: // Player loses 1 EP per attack
            case 29: // Player loses 1 EP per attack
                if (context === 'playerAttack') {
                    const epLoss = Math.min(player.resources.ep, 1);
                    if (epLoss > 0) {
                        this.modifyResource(player.id, 'ep', -epLoss);
                        this.logBattleActionT('battle.monsterEffectDrainEP', [player], player);
                    }
                }
                break;
                
            case 11: // Monster gains +1 HP when attacked but not defeated
                if (context === 'monsterDamaged' && monster.hp > 0) {
                    monster.hp += 1;
                    monster.maxHp = Math.max(monster.maxHp, monster.hp);
                    this.logBattleActionT('battle.monsterEffectHeal', [monster.hp], player);
                }
                break;
                
            case 12: // No grenades allowed
                if (context === 'checkItemRestriction') {
                    return { restrictedItems: ['Grenade'] };
                }
                break;
                
            case 15: // No grenades or bombs allowed
                if (context === 'checkItemRestriction') {
                    return { restrictedItems: ['Grenade', 'Bomb'] };
                }
                break;
                
            case 36: // No grenades, bombs, or dynamite allowed
                if (context === 'checkItemRestriction') {
                    return { restrictedItems: ['Grenade', 'Bomb', 'Dynamite'] };
                }
                break;
                
            case 20: // +1 EP cost to tame
                if (context === 'checkTamingCost') {
                    return { extraEPCost: 1 };
                }
                break;
        }
        
        return {};
    }
    
    applyDeathEffect(effectId, defeaterPlayerId) {
        // Apply effects when a monster is defeated
        switch(effectId) {
            case 4: // Forest players lose 1 HP (won't cause HP to become zero)
            case 31: // Forest players lose 1 HP (won't cause HP to become zero)
                const affectedPlayers = [];
                this.forestPlayersThisRound.forEach(playerId => {
                    const player = this.players.find(p => p.id === playerId);
                    if (player && player.resources.hp > 1) {
                        this.modifyResource(playerId, 'hp', -1);
                        affectedPlayers.push(player.name);
                    }
                });
                if (affectedPlayers.length > 0) {
                    this.showEffectNotificationT('effect.deathCurse', [affectedPlayers.join(', ')]);
                }
                break;
        }
    }
    
    cleanupRoundEffects() {
        // Clean up all round effects after forest battles complete
        this.activeMonsterEffects = [];
        this.currentMonsterEffect = null;
        this.roundEffectsApplied = false;
        this.forestPlayersThisRound.clear();
    }
    
    getExtraEPCost(effectId) {
        // Get extra EP cost for selecting a monster
        switch(effectId) {
            // Removed cases 6, 14, 30 - these monsters now only have damage cap, no EP cost
            default:
                return 0;
        }
    }
    
    showEffectNotification(message, effectDescription) {
        // Add to log (but skip in automated mode for performance)
        if (!this.isAutomatedMode) {
            this.addLogEntryT('battle.monsterEffectMessage', [message], 'effect');
        }
    }

    /**
     * Translation-aware version: pass an i18n key + args, the wrapper "Monster Effect: {0}"
     * receives a translatable inner-key marker so the inner text translates locally too.
     */
    showEffectNotificationT(innerKey, innerArgs) {
        if (this.isAutomatedMode) return;
        // Embed an inner translation marker as the {0} arg of the wrapper key.
        const marker = this.tArg(innerKey, ...innerArgs);
        this.addLogEntryT('battle.monsterEffectMessage', [marker], 'effect');
    }

    selectRandomAvailableMonster(level, playerId = null) {
        // Get all monsters of the specified level
        const monsters = this.monsters[level] || [];

        // Filter out defeated monsters (permanent, game-wide)
        // and shown monsters for this player (temporary, per-player)
        const availableMonsters = monsters.filter(monster => {
            const monsterId = `L${level}-${monster.index}`;

            // First check: Remove permanently defeated monsters
            if (this.defeatedMonsters.has(monsterId)) {
                return false;
            }

            // Second check: Remove monsters shown to this player (if playerId provided)
            if (playerId !== null && this.playerShownMonsters[playerId]) {
                if (this.playerShownMonsters[playerId].has(monster.index)) {
                    return false;
                }
            }

            return true;
        });

        if (availableMonsters.length === 0) {
            console.warn(`No available monsters for level ${level} for player ${playerId}`);
            return null;
        }

        // Select random monster from available ones
        const randomIndex = Math.floor(Math.random() * availableMonsters.length);
        return { ...availableMonsters[randomIndex] }; // Return a copy
    }

    showMonsterSelectionUI(monster, playerId) {
        const player = this.players.find(p => p.id === playerId);

        // Reset beer consumption tracking for monster selection modal
        this.monsterSelectBeerConsumption = 0;
        this.monsterSelectOverflowEP = 0;

        // Update all display elements with monster data
        document.getElementById('monster-level-display').textContent = monster.level;

        // Special HP display: show original HP and battle HP if apprentice is in Forest
        const originalHp = monster.maxHp || monster.hp; // Use maxHp if available, otherwise current hp
        const battleHp = monster.hp; // This should be the actual HP they'll face in battle

        const hpDisplay = document.getElementById('monster-hp-display');
        if (player && player.tokens.apprentice === 7 && originalHp !== battleHp) {
            // Apprentice is in Forest and HP is reduced - show both values
            hpDisplay.innerHTML = `${originalHp} → ${battleHp}`;
            hpDisplay.classList.add('hp-bonus');
        } else {
            // Normal display
            hpDisplay.textContent = monster.hp;
            hpDisplay.classList.remove('hp-bonus');
        }

        document.getElementById('monster-att-display').textContent = monster.att;
        document.getElementById('monster-money-display').textContent = monster.money;
        document.getElementById('monster-energy-display').textContent = monster.energy;
        document.getElementById('monster-blood-display').textContent = monster.blood;
        document.getElementById('monster-pts-display').textContent = monster.pts;
        document.getElementById('monster-effect-display').textContent = this.getMonsterEffectDisplay(monster);

        // Initialize beer consumption section
        const beerSection = document.getElementById('monster-select-beer-section');
        const beerCount = player ? player.inventory.filter(i => i.name === 'Beer').length : 0;

        if (beerCount > 0) {
            beerSection.style.display = 'block';
            document.getElementById('monster-select-beers-count').textContent = beerCount;
            document.getElementById('monster-select-beers-to-consume').textContent = 0;
            document.getElementById('monster-select-ep-display').textContent = player.resources.ep;
            document.getElementById('monster-select-max-ep').textContent = player.maxResources.ep;
        } else {
            beerSection.style.display = 'none';
        }

        // Update Change button state
        this.updateChangeButtonState(playerId, monster.level);

        // Show the modal
        document.getElementById('monster-selection-modal').style.display = 'flex';
    }

    changeMonster() {
        // Online guest: send action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'battle_change_monster',
                playerId: this.localPlayerId
            });
            return;
        }

        const playerId = this.currentMonsterPlayer;
        const player = this.players.find(p => p.id === playerId);

        // Check effective EP (regular + overflow from beers)
        const effectiveEP = player.resources.ep + (this.monsterSelectOverflowEP || 0);
        if (!player || effectiveEP <= 0) {
            console.log('Player has no EP to change monster');
            return;
        }

        // Deduct 1 EP - use overflow first, then regular EP
        if (this.monsterSelectOverflowEP > 0) {
            this.monsterSelectOverflowEP -= 1;
        } else {
            player.resources.ep -= 1;
        }
        this.monsterSelectionEPSpent += 1;

        // Select new random monster of the same level (filtering by player's shown monsters)
        const currentMonsterLevel = this.currentSelectedMonster.level;
        const newMonster = this.selectRandomAvailableMonster(currentMonsterLevel, playerId);

        if (newMonster) {
            // Track that this new monster was shown to this player
            if (!this.playerShownMonsters[playerId]) {
                this.playerShownMonsters[playerId] = new Set();
            }
            this.playerShownMonsters[playerId].add(newMonster.index);

            // Apply the same bonuses as the original monster selection
            newMonster.maxHp = newMonster.hp;

            // Apply other monsters HP bonus if active (effects 8, 16, 33)
            const hpBonus = this.activeMonsterEffects.find(effect => effect.type === 'otherMonstersHPBonus');
            if (hpBonus) {
                newMonster.hp += hpBonus.value;
                newMonster.maxHp += hpBonus.value;
                console.log(`Other monster HP bonus applied: +${hpBonus.value} HP (${newMonster.maxHp - hpBonus.value} -> ${newMonster.maxHp})`);
            }

            // Check if player's apprentice is also in Forest for -1 HP bonus
            if (player.tokens.apprentice === 7) { // Forest location
                newMonster.hp = Math.max(1, newMonster.hp - 1);
                console.log(`${player.name}'s apprentice in Forest - new monster HP reduced by 1 (${newMonster.maxHp} -> ${newMonster.hp})`);
            }

            this.currentSelectedMonster = newMonster;
            this.showMonsterSelectionUI(newMonster, playerId);

            // Update resource display to show EP reduction
            this.updateResourceDisplay();

            this.addLogEntryT('log.spentEpChangeMonster', [player], 'system', player);
        } else {
            // No monsters left in available pool - refund EP
            player.resources.ep += 1;
            this.monsterSelectionEPSpent -= 1;

            // Update resource display to show EP refund
            this.updateResourceDisplay();

            // Show UI with disabled button and message
            this.showMonsterSelectionUI(this.currentSelectedMonster, playerId);

            if (!this.isAutomatedMode) {
                alert(t('alert.noMoreMonsters'));
            }

            this.addLogEntryT('log.changeRefunded', [player], 'system', player);
        }
    }

    updateChangeButtonState(playerId, monsterLevel) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Check how many monsters are still available for this player at this level
        const monstersAtLevel = this.monsters[monsterLevel] || [];
        const availableCount = monstersAtLevel.filter(m => {
            const monsterId = `L${monsterLevel}-${m.index}`;
            // Filter out defeated monsters
            if (this.defeatedMonsters.has(monsterId)) {
                return false;
            }
            // Filter out monsters shown to this player
            if (this.playerShownMonsters[playerId] && this.playerShownMonsters[playerId].has(m.index)) {
                return false;
            }
            return true;
        }).length;

        // Calculate effective EP (regular + overflow from beers)
        const effectiveEP = player.resources.ep + (this.monsterSelectOverflowEP || 0);

        // Enable/disable Change button based on effective EP and available monsters
        const changeButton = document.getElementById('change-monster-btn');
        if (effectiveEP <= 0) {
            changeButton.disabled = true;
            changeButton.textContent = t('monster.changeNoEP');
        } else if (availableCount === 0) {
            changeButton.disabled = true;
            changeButton.textContent = t('monster.changeNoMore');
        } else {
            changeButton.disabled = false;
            changeButton.textContent = t('monster.changeButton');
        }
    }

    adjustBeerInMonsterSelection(delta) {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        if (!player) return;

        const beerCount = player.inventory.filter(i => i.name === 'Beer').length;

        // Store previous consumption amount
        const previousConsumption = this.monsterSelectBeerConsumption || 0;

        // Calculate max beers that can be consumed (remaining + already consumed = original total)
        const maxConsumable = beerCount + previousConsumption;

        // Calculate new selected count (min 0, max available beers)
        const newConsumption = Math.max(0, Math.min(maxConsumable, previousConsumption + delta));

        // Calculate actual delta to apply
        const actualDelta = newConsumption - previousConsumption;

        if (actualDelta > 0) {
            // Consume more beers
            for (let i = 0; i < actualDelta; i++) {
                const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                if (beerIndex !== -1) {
                    player.inventory.splice(beerIndex, 1);
                    // If EP is at max, add to overflow instead
                    if (player.resources.ep >= player.maxResources.ep) {
                        this.monsterSelectOverflowEP = (this.monsterSelectOverflowEP || 0) + 1;
                    } else {
                        player.resources.ep = Math.min(player.resources.ep + 1, player.maxResources.ep);
                    }
                }
            }
        } else if (actualDelta < 0) {
            // Restore beers
            for (let i = 0; i < Math.abs(actualDelta); i++) {
                player.inventory.push({ name: 'Beer', size: 1 });
                // If overflow exists, reduce it first
                if (this.monsterSelectOverflowEP > 0) {
                    this.monsterSelectOverflowEP -= 1;
                } else {
                    player.resources.ep = Math.max(0, player.resources.ep - 1);
                }
            }
        }

        // Update selected consumption tracker
        this.monsterSelectBeerConsumption = newConsumption;

        // Update resource and inventory displays
        this.updateResourceDisplay(player.id);
        this.updateInventoryDisplay(player.id);

        // Update beer consumption UI
        const currentBeerCount = player.inventory.filter(i => i.name === 'Beer').length;
        document.getElementById('monster-select-beers-count').textContent = currentBeerCount;
        document.getElementById('monster-select-beers-to-consume').textContent = this.monsterSelectBeerConsumption;

        // Show overflow EP in '10+2/10' format
        if (this.monsterSelectOverflowEP > 0) {
            document.getElementById('monster-select-ep-display').textContent = `${player.resources.ep}+${this.monsterSelectOverflowEP}`;
        } else {
            document.getElementById('monster-select-ep-display').textContent = player.resources.ep;
        }

        // Update Change button state
        this.updateChangeButtonState(this.currentMonsterPlayer, this.currentSelectedMonster.level);
    }

    confirmMonsterSelection() {
        // Hide the monster selection modal
        document.getElementById('monster-selection-modal').style.display = 'none';

        // Online guest: send fight action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'battle_fight',
                playerId: this.localPlayerId
            });
            document.getElementById('status-message').textContent = t('status.startingBattle');
            return;
        }

        // Continue with battle using the selected monster
        const playerId = this.currentMonsterPlayer;
        const player = this.players.find(p => p.id === playerId);
        const monster = this.currentSelectedMonster;
        
        if (!monster) {
            console.error('No monster selected for battle');
            return;
        }
        
        if (!player) {
            console.error('Player not found for battle');
            return;
        }

        // Check if monster requires extra EP (effects 6, 14, 30)
        const extraEPCost = this.getExtraEPCost(monster.effectId);
        if (extraEPCost > 0) {
            // Check if player can afford extra EP
            if (player.resources.ep >= extraEPCost) {
                this.modifyResource(playerId, 'ep', -extraEPCost);
                this.showEffectNotificationT('effect.extraEPCost', [player, extraEPCost]);
            } else {
                // Player can't afford extra EP - cannot fight this monster
                if (!this.isAutomatedMode) {
                    alert(t('alert.needExtraEP', extraEPCost));
                    // Show the monster selection modal again
                    document.getElementById('monster-selection-modal').style.display = 'flex';
                }
                return;
            }
        }

        // Apply monster effects when confirmed
        if (monster.effectId) {
            // Store the current monster effect
            this.currentMonsterEffect = monster.effectId;
            this.activeMonsterEffects.push(monster.effectId);
            
            // Apply selection-time effects
            this.applySelectionEffect(monster.effectId, playerId);

            // Apply round-wide effects
            this.applyRoundEffect(monster.effectId);

            // Apply effects to other monsters already in play
            if ([8, 16, 33].includes(monster.effectId)) {
                // This round other monsters get +1 HP
                console.log(`Monster effect ${monster.effectId}: Other monsters this round get +1 HP`);
                // This will be handled during each player's battle
            }
        }

        // Start the battle
        this.startMonsterBattle(playerId, monster, this.selectedPets);
    }

    markMonsterDefeated(monster) {
        const monsterId = `L${monster.level}-${monster.index}`;
        this.defeatedMonsters.add(monsterId);
        console.log(`Monster ${monsterId} marked as defeated`);
    }
    
    selectMonsterLevel(playerId, level) {
        this.selectedMonsterLevel = level + 1; // Level 1 = 2 EP, Level 2 = 3 EP, Level 3 = 4 EP
        this.updateTotalEPCost();

        // Highlight selected monster button
        document.querySelectorAll('.monster-choice').forEach((btn, index) => {
            if (index === level - 1) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    showMonsterLevelInfo() {
        // Show the monster level info modal
        document.getElementById('monster-level-info-modal').style.display = 'flex';
    }

    closeMonsterLevelInfo() {
        // Hide the monster level info modal
        document.getElementById('monster-level-info-modal').style.display = 'none';
    }

    confirmBattleSelection() {
        const playerId = this.currentMonsterPlayer;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const monsterLevel = this.selectedMonsterLevel - 1; // Convert back to 0-based
        const totalEPCost = parseInt(document.getElementById('total-ep-cost').textContent);

        const effectiveEP = player.resources.ep + (this.overflowEP || 0);
        if (effectiveEP < totalEPCost) {
            if (!this.isAutomatedMode) {
                alert(t('alert.needTotalEP', player.name, totalEPCost));
            }
            return;
        }

        // Online guest: send battle selection to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'battle_confirm',
                playerId: this.localPlayerId,
                data: {
                    level: this.selectedMonsterLevel,
                    pets: { ...this.selectedPets },
                    beerConsumption: this.selectedBeerConsumption
                }
            });
            document.getElementById('monster-modal').style.display = 'none';
            document.getElementById('status-message').textContent = t('status.waitingForBattle');
            return;
        }

        // Note: Beer consumption already applied by adjustBeerConsumptionInBattle()

        // Hide monster level selection modal
        document.getElementById('monster-modal').style.display = 'none';
        
        // Deduct EP for battle
        this.modifyResource(playerId, 'ep', -totalEPCost);
        this.monsterSelectionEPSpent = 0; // Reset EP spending tracker

        // Forest players already tracked at start of resource distribution
        // this.forestPlayersThisRound.add(playerId); // REMOVED - now done at start of round

        // Select random available monster from the level
        const selectedMonster = this.selectRandomAvailableMonster(monsterLevel, playerId);
        if (!selectedMonster) {
            if (!this.isAutomatedMode) {
                alert(t('alert.noMonstersLevel', monsterLevel));
            }
            return;
        }

        // Track that this monster was shown to this player
        if (!this.playerShownMonsters[playerId]) {
            this.playerShownMonsters[playerId] = new Set();
        }
        this.playerShownMonsters[playerId].add(selectedMonster.index);

        // Store original HP
        selectedMonster.maxHp = selectedMonster.hp;

        // Apply other monsters HP bonus if active (effects 8, 16, 33)
        const hpBonus = this.activeMonsterEffects.find(effect => effect.type === 'otherMonstersHPBonus');
        if (hpBonus) {
            selectedMonster.hp += hpBonus.value;
            selectedMonster.maxHp += hpBonus.value;
            console.log(`Other monster HP bonus applied: +${hpBonus.value} HP (${selectedMonster.maxHp - hpBonus.value} -> ${selectedMonster.maxHp})`);
        }

        // Check if player's apprentice is also in Forest for -1 HP bonus
        if (player.tokens.apprentice === 7) { // Forest location
            selectedMonster.hp = Math.max(1, selectedMonster.hp - 1);
            console.log(`${player.name}'s apprentice in Forest - monster HP reduced by 1 (${selectedMonster.maxHp} -> ${selectedMonster.hp})`);
        }

        // Store selected monster
        this.currentSelectedMonster = selectedMonster;
        
        // Check if this is a bot player - if so, skip monster selection UI
        if (player.isBot) {
            // Bots go directly to battle without monster selection UI
            console.log(`Bot ${player.name} skipping monster selection UI`);
            
            // For bots, apply effects immediately since they don't use the UI
            // Check if monster requires extra EP (effects 6, 14, 30)
            const extraEPCost = this.getExtraEPCost(selectedMonster.effectId);
            if (extraEPCost > 0) {
                // Deduct extra EP cost
                if (player.resources.ep >= extraEPCost) {
                    this.modifyResource(playerId, 'ep', -extraEPCost);
                    console.log(`Bot ${player.name} pays ${extraEPCost} extra EP for monster effect`);
                } else {
                    // Bot can't afford extra EP - this shouldn't happen with good bot logic
                    console.warn(`Bot ${player.name} doesn't have enough EP for extra cost`);
                }
            }

            // Apply monster effects for bots
            if (selectedMonster.effectId) {
                // Store the current monster effect
                this.currentMonsterEffect = selectedMonster.effectId;
                this.activeMonsterEffects.push(selectedMonster.effectId);
                
                // Apply selection-time effects
                this.applySelectionEffect(selectedMonster.effectId, playerId);

                // Apply round-wide effects
                this.applyRoundEffect(selectedMonster.effectId);

                // Apply effects to other monsters already in play
                if ([8, 16, 33].includes(selectedMonster.effectId)) {
                    console.log(`Monster effect ${selectedMonster.effectId}: Other monsters this round get +1 HP`);
                }
            }
            
            this.startMonsterBattle(playerId, selectedMonster, this.selectedPets);
        } else {
            // Human players see the monster selection UI
            this.showMonsterSelectionUI(selectedMonster, playerId);

            // Online host: push monster preview state so guests can spectate
            if (this.gameMode === 'online' && this.isHost) {
                this.pushMonsterPreviewToGuest(playerId, selectedMonster);
            }
        }
    }
    
    startMonsterBattle(playerId, monster, selectedPets = {level1: 0, level2: 0, level3: 0}) {
        console.log('=== startMonsterBattle called ===');
        console.log('Player ID:', playerId);
        console.log('Monster:', monster);
        console.log('Selected pets:', selectedPets);

        // Clear battle log at the start of each new battle
        document.getElementById('battle-log').innerHTML = '';

        this.currentBattle = {
            playerId,
            monster,
            turn: 'player_items', // Allow item usage at start, then attack
            bonusPts: 0, // Track Fake Blood bonus points
            petsUsed: selectedPets, // Track pets being used in this battle
            glovesPowerLevel: 0, // Track Gloves power level (damage taken)
            hasAttacked: false, // Track if player has attacked this battle
            doubleDamageUsed: false, // Track if Knife Lv1 double damage was used
            canUseDoubleDamage: false, // Track if Knife Lv3 double damage is available
            lastAttackDamage: 0, // Track last attack damage for double damage calculation
            ammunitionConsumed: false // Track if ammunition was consumed for this battle
        };
        
        console.log('Current battle set up:', this.currentBattle);
        
        // Consume ammunition at the start of battle (once per monster)
        const player = this.players.find(p => p.id === playerId);
        
        // Check and consume ammunition for Rifle
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bulletIndex = player.inventory.findIndex(item => item.name === 'Bullet');
            if (bulletIndex >= 0) {
                // Consume one bullet as entrance fee for Forest
                player.inventory.splice(bulletIndex, 1);
                this.currentBattle.ammunitionConsumed = true;
                this.addLogEntryT('battle.bulletEntranceFee', [player], 'battle', player);
                
                // Update bullet displays
                this.updateBulletDisplay(player.id);
            } else {
                // No bullets available - battle will fail
                this.addLogEntryT('battle.noBullets', [player], 'battle', player);
            }
        }
        
        // Check and consume ammunition for Plasma (unless Level 3 infinite)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
            if (batteryIndex >= 0) {
                // Consume one battery as entrance fee for Forest
                player.inventory.splice(batteryIndex, 1);
                this.currentBattle.ammunitionConsumed = true;
                this.addLogEntryT('battle.batteryEntranceFee', [player], 'battle', player);
                
                // Update battery displays
                this.updateBatteryDisplay(player.id);
            } else {
                // No batteries available - battle will fail
                this.addLogEntryT('battle.noBatteries', [player], 'battle', player);
            }
        }
        
        console.log('About to call showMonsterBattleUI...');
        this.showMonsterBattleUI();
    }
    
    showMonsterBattleUI() {
        console.log('=== showMonsterBattleUI called ===');
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
        console.log('Battle:', battle);
        console.log('Player found:', player);
        console.log('Player is bot:', player?.isBot);
        
        // Check if player exists before accessing weapon
        if (!player) {
            console.error('Player not found for battle!');
            return;
        }
        
        // Apply battle effects before combat starts
        if (battle.monster.effectId) {
            // Check if monster attacks first based on defense
            const defenseCount = player.weapon?.currentDefenseDice || 0;
            const attacksFirst = this.checkBattleOrder(battle.monster.effectId, defenseCount);
            
            if (attacksFirst) {
                console.log(`Monster effect ${battle.monster.effectId}: Monster attacks first (player defense: ${defenseCount})`);
                this.showEffectNotificationT('effect.monsterFirstStrike', []);
                // Set battle to start with monster attack
                battle.turn = 'monster_attack_first';
            }
            
            // Apply other battle effects
            this.applyBattleEffect(battle.monster.effectId, player.id);
        }
        
        // Check if player is a bot
        if (player.isBot) {
            console.log('Calling handleBotBattle for bot player');
            this.handleBotBattle(player, battle);
            return;
        }

        // In online mode, if this is a remote player's battle, show spectator view on host
        if (this.gameMode === 'online' && this.isHost && player.id !== this.localPlayerId) {
            console.log('Remote player battle - showing spectator view on host');

            // If monster attacks first, execute the first strike on host before pushing state
            if (battle.turn === 'monster_attack_first') {
                battle.turn = 'monster';
                // Push initial state so guest sees "Monster attacks first!" message
                this.pushBattleStateToGuest();
                // Execute monster attack after 1-second delay (same as local flow)
                setTimeout(() => {
                    if (this.currentBattle) {
                        this.monsterAttackPlayer();
                        this.updateHostSpectatorView();
                        this.pushBattleStateToGuest();
                    }
                }, 1000);
            } else {
                // Normal flow — push state and wait for guest actions
                this.pushBattleStateToGuest();
            }

            const battleState = this.serializeBattleState();
            if (battleState) {
                this.showBattleSpectator(battleState);
            }
            return;
        }

        console.log('Player is human, showing battle UI');
        
        document.getElementById('monster-battle').style.display = 'flex';
        document.getElementById('battle-player-name').textContent = this.getPlayerDisplayName(player);
        document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
        document.getElementById('battle-player-ep').textContent = `${player.resources.ep}/${player.maxResources.ep}`;
        
        // Update bullet display in battle UI
        const battleBulletsInfo = document.getElementById('battle-bullets-info');
        const battleBulletCount = document.getElementById('battle-bullet-count');
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
            battleBulletCount.textContent = `${bullets}/6`;
            battleBulletsInfo.style.display = 'block';
        } else {
            battleBulletsInfo.style.display = 'none';
        }
        
        // Update battery display in battle UI
        const battleBatteriesInfo = document.getElementById('battle-batteries-info');
        const battleBatteryCount = document.getElementById('battle-battery-count');
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                // Level 3: Infinite battery
                battleBatteryCount.textContent = '∞/∞';
            } else {
                const batteries = player.inventory.filter(item => item.name === 'Battery').length;
                battleBatteryCount.textContent = `${batteries}/6`;
            }
            battleBatteriesInfo.style.display = 'block';
        } else {
            battleBatteriesInfo.style.display = 'none';
        }
        
        document.getElementById('battle-monster-level').textContent = battle.monster.level;
        this.updateMonsterDisplay();
        
        // Display monster effect if present
        const effectElement = document.getElementById('battle-monster-effect');
        if (effectElement && battle.monster.effect) {
            effectElement.textContent = battle.monster.effect;
            effectElement.style.display = battle.monster.effect === '無' ? 'none' : 'block';
        }
        
        // Display monster rewards
        this.updateMonsterRewards(battle.monster);
        
        // Display pets being used
        const petInfo = document.getElementById('battle-pets-info');
        const petIcons = { 1: '🐾', 2: '🦊', 3: '🐺' };
        let petDisplay = [];
        
        if (battle.petsUsed.level1 > 0) {
            petDisplay.push(`${petIcons[1]} x${battle.petsUsed.level1} (+${battle.petsUsed.level1} ATK)`);
        }
        if (battle.petsUsed.level2 > 0) {
            petDisplay.push(`${petIcons[2]} x${battle.petsUsed.level2} (+${battle.petsUsed.level2 * 2} ATK)`);
        }
        if (battle.petsUsed.level3 > 0) {
            petDisplay.push(`${petIcons[3]} x${battle.petsUsed.level3} (+${battle.petsUsed.level3 * 4} ATK)`);
        }
        
        if (petDisplay.length > 0) {
            petInfo.innerHTML = `<p>${t('battle.petsLabel')} ${petDisplay.join(', ')}</p>`;
        } else {
            petInfo.innerHTML = '';
        }

        // Reset Knife 2x damage button for new battle
        const doubleDamageBtn = document.getElementById('battle-double-damage-btn');
        if (doubleDamageBtn) {
            doubleDamageBtn.style.display = 'none';
        }

        // Update battle phase
        this.updateBattlePhase();
        
        // Setup item buttons
        this.updateBattleItemButtons();
        
        // Setup button event listeners
        document.getElementById('battle-attack-btn').onclick = () => this.playerAttackMonster();
        document.getElementById('battle-defense-btn').onclick = () => this.playerDefense();
        document.getElementById('battle-tame-btn').onclick = () => this.tameMonster();

        // Push initial battle state so online spectators can see the battle
        if (this.gameMode === 'online' && this.isHost) {
            this.pushBattleStateToGuest();
        }
    }
    
    updateMonsterRewards(monster) {
        let rewards = [];

        if (monster.pts > 0) rewards.push(`🏆${monster.pts}`);
        if (monster.money > 0) rewards.push(`💰${monster.money}`);
        if (monster.energy > 0) rewards.push(`🍺${monster.energy}`);
        if (monster.blood > 0) rewards.push(`🩸${monster.blood}`);

        // Weapon power — text only, always shown
        rewards.push(t('battle.weaponPowerReward', monster.level));

        document.getElementById('battle-monster-rewards').textContent = rewards.join(' ');
    }
    
    updateBattlePhase() {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const attackBtn = document.getElementById('battle-attack-btn');
        const defenseBtn = document.getElementById('battle-defense-btn');
        const tameBtn = document.getElementById('battle-tame-btn');
        const doubleDamageBtn = document.getElementById('battle-double-damage-btn');
        const turnText = document.getElementById('battle-turn');
        
        // Check if taming is possible
        let canTame = false;
        let requiredEP = 1;  // Now always 1 EP regardless of monster level

        // Calculate required EP with Whip weapon reduction
        if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                // Level 3: Taming costs 0 EP
                requiredEP = 0;
            } else {
                // Level 1: Taming costs 1 less EP (1 - 1 = 0)
                requiredEP = 0;
            }
        }
        
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 1) {
            // Chain Level 1: Can tame monsters with HP < 4
            canTame = battle.monster.hp < 4 && player.resources.ep >= requiredEP;
        } else {
            // Standard taming: monster HP = 1 and player has enough EP
            canTame = battle.monster.hp === 1 && player.resources.ep >= requiredEP;
        }
        
        // Check if Rifle/Plasma player can attack
        // If entrance fee has been paid (ammunitionConsumed = true), player can always attack
        const isRifle = player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1;
        const isPlasma = player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1;
        const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
        const batteries = player.inventory.filter(item => item.name === 'Battery').length;
        
        // Can attack if:
        // 1. Not using Rifle/Plasma, OR
        // 2. Entrance fee already paid (ammunitionConsumed), OR
        // 3. Has ammunition to pay entrance fee
        const canAttack = (!isRifle || battle.ammunitionConsumed || bullets > 0) &&
                         (!isPlasma || battle.ammunitionConsumed || batteries > 0);

        // Check if player has combat items (grenade, bomb, dynamite)
        const combatItems = ['Grenade', 'Bomb', 'Dynamite'];
        const hasCombatItems = combatItems.some(itemName =>
            player.inventory.some(item => item.name === itemName)
        );

        // Check if needs ammo but has none AND hasn't paid entrance fee yet
        const needsAmmoButHasNone = ((isRifle && bullets === 0 && !battle.ammunitionConsumed) ||
                                     (isPlasma && batteries === 0 && !battle.ammunitionConsumed));
        
        if (battle.turn === 'monster_attack_first') {
            // Monster attacks first due to effect
            turnText.textContent = t('battle.monsterAttacksFirst');
            attackBtn.style.display = 'none';
            tameBtn.style.display = 'none';
            defenseBtn.style.display = 'none';
            doubleDamageBtn.style.display = 'none';
            
            // Trigger monster attack
            battle.turn = 'monster';
            setTimeout(() => this.monsterAttackPlayer(), 1000);
        } else if (battle.turn === 'player') {
            // If out of ammo, skip directly to defense phase
            if (needsAmmoButHasNone) {
                turnText.textContent = isRifle ? 'No bullets! Prepare to defend!' : 'No batteries! Prepare to defend!';
                attackBtn.style.display = 'none';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'block';
                // Change the turn to player_items so defense button works
                battle.turn = 'player_items';
            } else if (canTame) {
                turnText.textContent = t('battle.monsterWeakened');
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'block';
                tameBtn.textContent = t('battle.tameWithCost', requiredEP);
            } else {
                turnText.textContent = t('battle.yourTurn');
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'none';
            }
            
            // Only show attack button if not out of ammo
            if (!needsAmmoButHasNone) {
                attackBtn.disabled = false;
                attackBtn.title = 'Attack the monster';
            }
            
            // Hide double damage button during attack phase
            doubleDamageBtn.style.display = 'none';
            
            // Don't hide defense button if we just switched to defense phase due to no ammo
            if (!needsAmmoButHasNone) {
                defenseBtn.style.display = 'none';
            }
        } else if (battle.turn === 'player_items') {
            // Handle bot tactical item usage
            if (player.isBot) {
                this.handleBotTacticalItemUsage(player, battle);
                return;
            }
            
            // Check if this is the first turn (no attack has happened yet)
            const hasAttacked = battle.hasAttacked || false;
            if (!hasAttacked) {
                // Check if out of ammo - if so, only show defense
                if (needsAmmoButHasNone) {
                    turnText.textContent = isRifle ? 'No bullets! Use items or defend!' : 'No batteries! Use items or defend!';
                    attackBtn.style.display = 'none';
                    tameBtn.style.display = 'none';
                    defenseBtn.style.display = 'block';
                } else if (canTame) {
                    turnText.textContent = t('battle.useItemsAttackOrTame');
                    attackBtn.style.display = 'block';
                    tameBtn.style.display = 'block';
                    tameBtn.textContent = t('battle.tameWithCost', requiredEP);
                    defenseBtn.style.display = 'none';
                } else {
                    turnText.textContent = t('battle.useItemsOrAttack');
                    attackBtn.style.display = 'block';
                    tameBtn.style.display = 'none';
                    defenseBtn.style.display = 'none';
                }
            } else {
                turnText.textContent = t('battle.useItemsOrDefend');
                attackBtn.style.display = 'none';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'block';
                
                // Knife Level 3 Power: Show 2x damage button after attack
                if (battle.canUseDoubleDamage) {
                    doubleDamageBtn.style.display = 'block';
                    doubleDamageBtn.textContent = `2x Damage (+${battle.lastAttackDamage} extra)`;
                    doubleDamageBtn.onclick = () => this.useDoubleDamage();
                } else {
                    doubleDamageBtn.style.display = 'none';
                }
            }
        } else if (battle.turn === 'monster') {
            turnText.textContent = t('battle.monsterAttacksTurn');
            attackBtn.style.display = 'none';
            tameBtn.style.display = 'none';
            defenseBtn.style.display = 'none';
        } else if (battle.turn === 'player_items_after_monster') {
            // Handle bot tactical item usage
            if (player.isBot) {
                this.handleBotTacticalItemUsage(player, battle);
                return;
            }
            
            // After monster attack, player can use items before attacking
            if (needsAmmoButHasNone) {
                // Out of ammo - skip to next round
                turnText.textContent = isRifle ? 'No bullets to attack!' : 'No batteries to attack!';
                attackBtn.style.display = 'none';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'none';
                // Automatically end turn after a short delay
                setTimeout(() => {
                    this.logBattleActionT('battle.cannotAttackNoAmmo', [player], player);
                    battle.turn = 'player';
                    this.updateBattlePhase();
                }, this.getDelay(1500));
            } else if (canTame) {
                turnText.textContent = t('battle.useItemsAttackOrTame');
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'block';
                tameBtn.textContent = t('battle.tameWithCost', requiredEP);
                defenseBtn.style.display = 'none';
            } else {
                turnText.textContent = t('battle.useItemsOrAttack');
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'none';
            }
        }

        // Push battle state to guest in online mode
        if (this.gameMode === 'online' && this.isHost) {
            this.pushBattleStateToGuest();
        }
    }

    handleBotTacticalItemUsage(player, battle) {
        console.log(`Bot ${player.name} evaluating tactical item usage...`);

        const monster = battle.monster;
        let itemsUsed = [];

        // Check if bot can finish the monster with combat items
        let damageNeeded = monster.hp;

        // Check for item restrictions
        let restrictedItems = [];
        if (monster.effectId) {
            const restriction = this.applyBattleEffect(monster.effectId, battle, 'checkItemRestriction');
            if (restriction && restriction.restrictedItems) {
                restrictedItems = restriction.restrictedItems;
            }
        }

        // Check for instant kill items and prioritize efficiency (excluding restricted items)
        const combatItems = [
            { name: 'Dynamite', damage: 3, priority: 1 },
            { name: 'Bomb', damage: 2, priority: 2 },
            { name: 'Grenade', damage: 1, priority: 3 }
        ].filter(item => !restrictedItems.includes(item.name));
        
        // Find optimal item combination to finish monster
        let remainingDamage = damageNeeded;
        let itemsToUse = [];
        
        // Sort by priority (lowest first - Dynamite has highest priority)
        combatItems.sort((a, b) => a.priority - b.priority);
        
        for (const item of combatItems) {
            if (remainingDamage <= 0) break;
            
            const availableCount = player.inventory.filter(inv => inv.name === item.name).length;
            const neededCount = Math.min(availableCount, Math.ceil(remainingDamage / item.damage));
            
            if (neededCount > 0) {
                // Only use items if they contribute to finishing the monster
                const actualDamage = Math.min(neededCount * item.damage, remainingDamage);
                itemsToUse.push({ name: item.name, count: neededCount, damage: actualDamage });
                remainingDamage -= actualDamage;
            }
        }
        
        // Use items if they can kill the monster
        if (remainingDamage <= 0 && itemsToUse.length > 0) {
            console.log(`Bot ${player.name} using items to finish monster:`, itemsToUse);
            
            for (const itemUse of itemsToUse) {
                for (let i = 0; i < itemUse.count; i++) {
                    const itemIndex = player.inventory.findIndex(inv => inv.name === itemUse.name);
                    if (itemIndex >= 0) {
                        player.inventory.splice(itemIndex, 1);
                        itemsUsed.push(itemUse.name);
                        
                        // Apply item effect
                        if (itemUse.name === 'Dynamite') monster.hp -= 3;
                        else if (itemUse.name === 'Bomb') monster.hp -= 2;
                        else if (itemUse.name === 'Grenade') monster.hp -= 1;
                    }
                }
            }
            
            monster.hp = Math.max(0, monster.hp);
            const localizedItems = itemsUsed.map(n => this.getItemDisplayName(n)).join(', ');
            this.logBattleActionT('battle.itemsUsed', [player, localizedItems, monster.hp], player);
            
            // Update displays
            this.updateResourceDisplay();
            this.updateInventoryDisplayOld();
            this.updateInventoryDisplay(player.id);
            
            // Check if monster is defeated
            if (monster.hp <= 0) {
                this.logBattleActionT('battle.monsterDefeatedByItems', [], player);
                this.monsterDefeated();
                return;
            }
        }
        
        // Use Fake Blood for bonus points if available
        const fakeBloodCount = player.inventory.filter(item => item.name === 'Fake Blood').length;
        if (fakeBloodCount > 0) {
            console.log(`Bot ${player.name} using ${fakeBloodCount} Fake Blood for bonus points`);
            for (let i = 0; i < fakeBloodCount; i++) {
                const fakeBloodIndex = player.inventory.findIndex(item => item.name === 'Fake Blood');
                if (fakeBloodIndex >= 0) {
                    player.inventory.splice(fakeBloodIndex, 1);
                    battle.bonusPts += monster.level; // Fake Blood gives bonus points equal to monster level
                    itemsUsed.push('Fake Blood');
                }
            }
            if (fakeBloodCount > 0) {
                this.logBattleActionT('battle.fakeBloodBonus', [player, fakeBloodCount, fakeBloodCount * monster.level], player);
                this.updateResourceDisplay();
                this.updateInventoryDisplayOld();
                this.updateInventoryDisplay(player.id);
            }
        }
        
        // Use recovery items if needed
        this.botUseRecoveryItems(player, battle);
        
        // Proceed with battle flow based on current phase
        setTimeout(() => {
            if (battle.turn === 'player_items') {
                // After using items in post-attack phase, proceed to monster turn
                const hasAttacked = battle.hasAttacked || false;
                if (hasAttacked) {
                    battle.turn = 'monster';
                    this.updateBattlePhase();
                    setTimeout(() => this.monsterAttackPlayer(), 1000);
                } else {
                    // Bot hasn't attacked yet, proceed to attack
                    this.botAttackMonster(player, battle);
                }
            } else if (battle.turn === 'player_items_after_monster') {
                // After using items in post-monster phase, proceed to attack
                this.botAttackMonster(player, battle);
            }
        }, itemsUsed.length > 0 ? 1500 : 500);
    }
    
    botUseRecoveryItems(player, battle) {
        let itemsUsed = [];
        
        // Use Blood Bags if HP is not at max
        while (player.resources.hp < player.maxResources.hp) {
            const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
            if (bloodBagIndex === -1) break;
            
            player.inventory.splice(bloodBagIndex, 1);
            player.resources.hp = Math.min(player.maxResources.hp, player.resources.hp + 1);
            itemsUsed.push('Blood Bag');
        }
        
        // Use Beer if EP is not at max
        while (player.resources.ep < player.maxResources.ep) {
            const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
            if (beerIndex === -1) break;
            
            player.inventory.splice(beerIndex, 1);
            player.resources.ep = Math.min(player.maxResources.ep, player.resources.ep + 1);
            itemsUsed.push('Beer');
        }
        
        if (itemsUsed.length > 0) {
            const localizedRecovery = itemsUsed.map(n => this.getItemDisplayName(n)).join(', ');
            this.logBattleActionT('battle.recoveryItemsUsed', [player, localizedRecovery], player);
            this.updateResourceDisplay();
            this.updateInventoryDisplayOld();
            this.updateInventoryDisplay(player.id);
        }
    }
    
    botAttackMonster(player, battle) {
        // Proceed with bot attack logic
        battle.turn = 'player';
        this.updateBattlePhase();
        
        // Trigger bot attack after a short delay
        setTimeout(() => {
            this.attackMonster();
        }, this.getDelay(500));
    }
    
    updateBattleItemButtons() {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const itemButtonsContainer = document.getElementById('battle-item-buttons');
        
        // Clear existing buttons
        itemButtonsContainer.innerHTML = '';
        
        // Define usable battle items
        const battleItems = [
            { name: 'Beer', icon: '🍺', effectKey: 'item.beer.battleEffect' },
            { name: 'Blood Bag', icon: '🩸', effectKey: 'item.bloodBag.battleEffect' },
            { name: 'Grenade', icon: '💣', effectKey: 'item.grenade.battleEffect' },
            { name: 'Bomb', icon: '💥', effectKey: 'item.bomb.battleEffect' },
            { name: 'Dynamite', icon: '🧨', effectKey: 'item.dynamite.battleEffect' },
            { name: 'Fake Blood', icon: '🩹', effectKey: 'item.fakeBlood.battleEffect' }
        ];

        battleItems.forEach(item => {
            const itemCount = player.inventory.filter(inv => inv.name === item.name).length;
            const button = document.createElement('button');
            button.className = 'battle-item-btn';
            button.innerHTML = `${item.icon} ${this.getItemDisplayName(item.name)} (${itemCount})`;
            button.title = t(item.effectKey);

            // Check if button should be disabled
            let isDisabled = itemCount === 0 || (battle.turn !== 'player_items' && battle.turn !== 'player_items_after_monster');

            // Special case for Beer - disable if player is at max EP
            if (item.name === 'Beer' && player.resources.ep >= player.maxResources.ep) {
                isDisabled = true;
                button.title = t('tooltip.epFull');
            }

            // Special case for Blood Bag - disable if player is at max HP
            if (item.name === 'Blood Bag' && player.resources.hp >= player.maxResources.hp) {
                isDisabled = true;
                button.title = t('tooltip.hpFull');
            }

            button.disabled = isDisabled;
            button.onclick = () => this.useBattleItem(item.name);
            itemButtonsContainer.appendChild(button);
        });
    }
    
    playerAttackMonster() {
        if (!this.currentBattle || (this.currentBattle.turn !== 'player' && this.currentBattle.turn !== 'player_items' && this.currentBattle.turn !== 'player_items_after_monster')) return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
        // Check if Rifle player has paid entrance fee (ammunition)
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            // If ammunition was already consumed (entrance fee paid), allow attack
            // If not consumed yet, check for and consume ammunition
            if (!battle.ammunitionConsumed) {
                const bulletIndex = player.inventory.findIndex(item => item.name === 'Bullet');
                if (bulletIndex === -1) {
                    // No bullets available
                    alert(t('alert.noBullets'));
                    return;
                }
                // Consume ammunition on first attack if not consumed at battle start
                player.inventory.splice(bulletIndex, 1);
                battle.ammunitionConsumed = true;
                this.addLogEntryT('battle.usesBullet', [player], 'battle', player);
            }
            // Update bullet display (in case it changed from items)
            if (this.currentBattle && this.currentBattle.playerId === player.id) {
                const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
                document.getElementById('battle-bullet-count').textContent = `${bullets}/6`;
            }
            // If ammunitionConsumed is true, proceed with attack (entrance fee paid)
        }
        
        // Check if Plasma player has paid entrance fee (ammunition) - unless infinite at Level 3
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            // If ammunition was already consumed (entrance fee paid), allow attack
            // If not consumed yet, check for and consume ammunition
            if (!battle.ammunitionConsumed) {
                const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
                if (batteryIndex === -1) {
                    // No batteries available
                    alert(t('alert.noBatteries'));
                    return;
                }
                // Consume ammunition on first attack if not consumed at battle start
                player.inventory.splice(batteryIndex, 1);
                battle.ammunitionConsumed = true;
                this.addLogEntryT('battle.usesBattery', [player], 'battle', player);
            }
            // Update battery display (in case it changed from items)
            if (this.currentBattle && this.currentBattle.playerId === player.id) {
                const batteries = player.inventory.filter(item => item.name === 'Battery').length;
                document.getElementById('battle-battery-count').textContent = `${batteries}/6`;
            }
            // If ammunitionConsumed is true, proceed with attack (entrance fee paid)
        }
        
        // Player attacks
        let playerDamage = 0;
        let allRolls = [];
        let totalDicePips = 0; // Track total dice value for Katana instant kill
        let allAttackRolls = []; // Track all dice rolls for Sword Level 3 power
        
        // Check for Bat Level 3 bonus dice
        if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 7) {
            // First roll with normal attack dice
            const firstRolls = this.rollDice(player.weapon.currentAttackDice);
            const firstDamage = this.calculateDamage(battle.playerId, firstRolls);
            
            // Count how many dice hit successfully (4, 5, or 6 for Bat)
            const hitCount = firstRolls.filter(roll => roll >= 4).length;
            
            // Add first roll results
            allRolls.push(`[${firstRolls.join(', ')}]`);
            allAttackRolls.push(...firstRolls); // Track all rolls for other weapon powers
            playerDamage += firstDamage;
            totalDicePips += firstRolls.reduce((sum, roll) => sum + roll, 0);
            
            // Second roll with bonus dice (only if there were hits)
            if (hitCount > 0) {
                const bonusRolls = this.rollDice(hitCount);
                const bonusDamage = this.calculateDamage(battle.playerId, bonusRolls);
                
                allRolls.push(`[${bonusRolls.join(', ')}]`);
                allAttackRolls.push(...bonusRolls);
                playerDamage += bonusDamage;
                totalDicePips += bonusRolls.reduce((sum, roll) => sum + roll, 0);
                
                this.logBattleActionT('battle.batLv3Hits', [hitCount, bonusDamage], player);
            } else {
                this.logBattleActionT('battle.batLv3NoHits', [], player);
            }
        } else {
            // Normal attack
            const attackRolls = this.rollDice(player.weapon.currentAttackDice);
            playerDamage = this.calculateDamage(battle.playerId, attackRolls);
            totalDicePips = attackRolls.reduce((sum, roll) => sum + roll, 0);
            allRolls.push(`[${attackRolls.join(', ')}]`);
            allAttackRolls.push(...attackRolls); // Track all rolls for other weapon powers
        }
        
        
        // Bow Level 3 Power: Double player damage
        if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 7 && playerDamage > 0) {
            playerDamage *= 2;
            this.logBattleActionT('battle.bowLv3Doubled', [], player);
        }
        
        // Check for Katana Level 3 instant kill (27+ dice pips)
        if (player.weapon.name === 'Katana' && player.weapon.powerTrackPosition >= 7 && totalDicePips >= 27) {
            this.logBattleActionT('battle.katanaLv3Kill', [totalDicePips], player);
            battle.monster.hp = 0; // Instant kill
            this.monsterDefeated();
            return;
        }
        
        // Calculate pet damage
        let petDamage = battle.petsUsed.level1 * 1 + 
                       battle.petsUsed.level2 * 2 + 
                       battle.petsUsed.level3 * 4;
        
        // Chain Level 3 Power: Double pet damage
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 7 && petDamage > 0) {
            petDamage *= 2;
            this.logBattleActionT('battle.chainLv3Doubled', [], player);
        }
        
        const totalDamage = playerDamage + petDamage;
        
        // Check for damage cap effect
        let finalDamage = totalDamage;
        const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
        if (damageCap !== null) {
            finalDamage = Math.min(totalDamage, damageCap);
            if (totalDamage > damageCap) {
                this.logBattleActionT('battle.damageCap', [damageCap, totalDamage], player);
            }
        }
        
        battle.monster.hp -= finalDamage;
        battle.hasAttacked = true; // Mark that an attack has occurred

        // Apply player attack effects (EP loss for effects 10, 19, 29)
        this.applyBattleEffect(battle.monster, 'playerAttack', player);

        // Apply monster damaged effects (HP gain for effect 11) - only if monster survives
        if (finalDamage > 0 && battle.monster.hp > 0) {
            this.applyBattleEffect(battle.monster, 'monsterDamaged', player);
        }

        // Update battle UI to reflect changes (EP loss, monster HP/ATT changes)
        if (!this.isAutomatedMode) {
            this.updateMonsterDisplay();
            document.getElementById('battle-player-ep').textContent = `${player.resources.ep}/${player.maxResources.ep}`;
        }

        // Log attack
        let attackMessage = t('battle.attackRolls', this.getPlayerDisplayName(player), allRolls.join(' → '), playerDamage);
        if (petDamage > 0) {
            attackMessage += t('battle.attackPetSuffix', petDamage, totalDamage);
        }
        this.logBattleAction(attackMessage, player);
        
        if (battle.monster.hp <= 0) {
            // Monster defeated!
            this.monsterDefeated();
        } else {
            // Move to item usage phase (post-attack)
            battle.turn = 'player_items';
            
            // Knife Level 3 Power: Show 2x damage button after attack if damage was dealt
            if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 7 &&
                !battle.doubleDamageUsed && playerDamage > 0) {
                battle.lastAttackDamage = playerDamage; // Store the damage for 2x calculation
                battle.canUseDoubleDamage = true;
            }
            
            this.updateBattlePhase();
            this.updateBattleItemButtons();
        }
        
        // Update monster display
        this.updateMonsterDisplay();

        // Push battle state for online spectators (only if battle still active — monsterDefeated handles its own push)
        if (this.gameMode === 'online' && this.isHost && this.currentBattle) {
            this.pushBattleStateToGuest();
        }
    }

    getCurrentMonsterAttack() {
        if (!this.currentBattle) return 0;
        const battle = this.currentBattle;
        let monsterAttack = battle.monster.att;

        // Check for HP threshold effects (effects 2 and 24): +1 attack when HP is at half or less
        if (battle.monster.effectId === 2 || battle.monster.effectId === 24) {
            const currentHp = battle.monster.hp;
            const maxHp = battle.monster.maxHp;
            if (currentHp <= Math.floor(maxHp / 2)) {
                monsterAttack += 1;
            }
        }

        return monsterAttack;
    }

    updateMonsterDisplay() {
        if (!this.currentBattle) return;
        const battle = this.currentBattle;

        const hpElement = document.getElementById('battle-monster-hp');
        const attElement = document.getElementById('battle-monster-att');

        if (hpElement) {
            hpElement.textContent = `${Math.max(0, battle.monster.hp)}/${battle.monster.maxHp}`;
        }
        if (attElement) {
            attElement.textContent = this.getCurrentMonsterAttack();
        }
    }

    useBattleItem(itemName) {
        if (!this.currentBattle || (this.currentBattle.turn !== 'player_items' && this.currentBattle.turn !== 'player_items_after_monster')) return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
        // Find and remove item from inventory
        const itemIndex = player.inventory.findIndex(item => item.name === itemName);
        if (itemIndex === -1) return;
        
        player.inventory.splice(itemIndex, 1);
        
        // Apply item effect
        if (itemName === 'Beer') {
            // Recover 1 EP
            if (player.resources.ep < player.maxResources.ep) {
                player.resources.ep = Math.min(player.resources.ep + 1, player.maxResources.ep);
                this.logBattleActionT('battle.usesBeer', [player, player.resources.ep], player);
                // Update player EP display
                document.getElementById('battle-player-ep').textContent = `${player.resources.ep}/${player.maxResources.ep}`;
            } else {
                this.logBattleActionT('battle.beerMaxEP', [player], player);
            }
        } else if (itemName === 'Blood Bag') {
            // Recover 1 HP
            if (player.resources.hp < player.maxResources.hp) {
                player.resources.hp = Math.min(player.resources.hp + 1, player.maxResources.hp);
                this.logBattleActionT('battle.usesBloodBag', [player, player.resources.hp], player);
                // Update player HP display
                document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
            } else {
                this.logBattleActionT('battle.bloodBagMaxHP', [player], player);
            }
        } else if (itemName === 'Grenade') {
            // Check if monster is immune to grenades
            const restriction = this.applyBattleEffect(battle.monster.effectId, battle, 'checkItemRestriction');
            if (restriction && restriction.restrictedItems && restriction.restrictedItems.includes('Grenade')) {
                this.logBattleActionT('battle.grenadeImmune', [player], player);
            } else {
                // Monster -1 HP
                let grenadeDamage = 1;
                const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
                if (damageCap !== null) {
                    grenadeDamage = Math.min(grenadeDamage, damageCap);
                }
                battle.monster.hp -= grenadeDamage;
                this.logBattleActionT('battle.usesGrenade', [player, grenadeDamage], player);
            }
        } else if (itemName === 'Bomb') {
            // Check if monster is immune to bombs
            const restriction = this.applyBattleEffect(battle.monster.effectId, battle, 'checkItemRestriction');
            if (restriction && restriction.restrictedItems && restriction.restrictedItems.includes('Bomb')) {
                this.logBattleActionT('battle.bombImmune', [player], player);
            } else {
                // Monster -2 HP
                let bombDamage = 2;
                const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
                if (damageCap !== null) {
                    const originalDamage = bombDamage;
                    bombDamage = Math.min(bombDamage, damageCap);
                    if (originalDamage > damageCap) {
                        this.logBattleActionT('battle.bombCapped', [player, bombDamage, originalDamage], player);
                    } else {
                        this.logBattleActionT('battle.usesBomb', [player, bombDamage], player);
                    }
                } else {
                    this.logBattleActionT('battle.usesBomb', [player, bombDamage], player);
                }
                battle.monster.hp -= bombDamage;
            }
        } else if (itemName === 'Dynamite') {
            // Check if monster is immune to dynamite
            const restriction = this.applyBattleEffect(battle.monster.effectId, battle, 'checkItemRestriction');
            if (restriction && restriction.restrictedItems && restriction.restrictedItems.includes('Dynamite')) {
                this.logBattleActionT('battle.dynamiteImmune', [player], player);
            } else {
                // Monster -3 HP
                let dynamiteDamage = 3;
                const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
                if (damageCap !== null) {
                    const originalDamage = dynamiteDamage;
                    dynamiteDamage = Math.min(dynamiteDamage, damageCap);
                    if (originalDamage > damageCap) {
                        this.logBattleActionT('battle.dynamiteCapped', [player, dynamiteDamage, originalDamage], player);
                    } else {
                        this.logBattleActionT('battle.usesDynamite', [player, dynamiteDamage], player);
                    }
                } else {
                    this.logBattleActionT('battle.usesDynamite', [player, dynamiteDamage], player);
                }
                battle.monster.hp -= dynamiteDamage;
            }
        } else if (itemName === 'Fake Blood') {
            // Increase PTS by 2 (store in battle for later use)
            if (!battle.bonusPts) battle.bonusPts = 0;
            battle.bonusPts += 2;
            this.logBattleActionT('battle.usesFakeBlood', [player], player);
        }
        
        // Check if monster is defeated by item
        if (battle.monster.hp <= 0) {
            this.monsterDefeated();
        } else {
            // Update displays
            this.updateMonsterDisplay();
            this.updateBattleItemButtons();
            this.updateResourceDisplay();
            this.updateBattlePhase(); // Update to show tame button if applicable

            // Push battle state for online spectators
            if (this.gameMode === 'online' && this.isHost && this.currentBattle) {
                this.pushBattleStateToGuest();
            }
        }
    }

    playerDefense() {
        if (!this.currentBattle || this.currentBattle.turn !== 'player_items') return;

        const battle = this.currentBattle;

        // Move to monster turn
        battle.turn = 'monster';
        this.updateBattlePhase();

        // Push state so spectators see "Monster is attacking..."
        if (this.gameMode === 'online' && this.isHost && this.currentBattle) {
            this.pushBattleStateToGuest();
        }

        // Execute monster attack after a delay
        setTimeout(() => this.monsterAttackPlayer(), 1000);
    }
    
    monsterAttackPlayer() {
        if (!this.currentBattle || this.currentBattle.turn !== 'monster') return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
        // Calculate monster's actual attack value (including HP threshold effects)
        let monsterAttack = battle.monster.att;
        
        // Check for HP threshold effects (effects 2 and 24)
        if (battle.monster.effectId === 2 || battle.monster.effectId === 24) {
            // Monster gains +1 attack when HP is at half or less
            const currentHp = battle.monster.hp;
            const maxHp = battle.monster.maxHp;
            if (currentHp <= Math.floor(maxHp / 2)) {
                monsterAttack += 1;
                this.showEffectNotificationT('effect.monsterEnraged', [monsterAttack]);
            }
        }
        
        // Player defends
        const defenseRolls = this.rollDice(player.weapon.currentDefenseDice);
        let totalDefense = 0;
        defenseRolls.forEach(roll => {
            // Standard defense: 4,5,6 = 1 defense, 1,2,3 = 0 defense
            // Bow Level 1 Power: 3,4,5,6 = 1 defense, 1,2 = 0 defense (+16% dodge)
            let defenseThreshold = 4;
            if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 1) {
                defenseThreshold = 3;
            }

            if (roll >= defenseThreshold) totalDefense += 1;
        });
        
        const finalDamage = Math.max(0, monsterAttack - totalDefense);
        
        // Log attack
        this.logBattleActionT('battle.monsterAttack', [monsterAttack, player, defenseRolls.join(', '), totalDefense, finalDamage], player);
        
        // Sword Level 3 Power nerfed: only works on attack dice, not defense
        
        if (finalDamage > 0) {
            this.modifyResource(battle.playerId, 'hp', -finalDamage);

            // Update player HP display
            document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;

            // Player gains EXP equal to damage received (unless Axe or monster effect prevents it)
            if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                const axeEXP = Math.max(0, finalDamage - 1);
                if (axeEXP > 0) {
                    this.modifyResource(battle.playerId, 'exp', axeEXP);
                }
                this.logBattleActionT('battle.gainExpAxe', [player, axeEXP], player);
            } else {
                const damageEffect = this.applyBattleEffect(battle.monster, 'playerDamaged', player);
                if (damageEffect && damageEffect.noEXP) {
                    this.logBattleActionT('battle.gainExpNone', [player], player);
                } else if (damageEffect && damageEffect.maxEXP) {
                    const cappedEXP = Math.min(finalDamage, damageEffect.maxEXP);
                    this.modifyResource(battle.playerId, 'exp', cappedEXP);
                    this.logBattleActionT('battle.gainExpCapped', [player, cappedEXP], player);
                } else {
                    this.modifyResource(battle.playerId, 'exp', finalDamage);
                    this.logBattleActionT('battle.gainExp', [player, finalDamage], player);
                }
            }
            
            // Gloves Power: Level 3 only - increase attack for each time damaged
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 7 && finalDamage > 0) {
                // Level 3: +1 attack for each time damaged (cumulative)
                battle.glovesPowerLevel += 1;
                this.logBattleActionT('battle.glovesLv3Bonus', [battle.glovesPowerLevel], player);
            }
        }
        
        // Check if player survives
        if (player.resources.hp <= 0) {
            // Player defeated!
            this.logBattleActionT('battle.playerDefeated', [player], player);
            this.playerDefeated(battle.playerId);
        } else {
            // Player survived - check for Axe retaliation
            if (finalDamage > 0 && player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                let axeDamageToMonster;
                if (player.weapon.powerTrackPosition >= 7) {
                    // Level 3: Deal same damage to monster (overrides Level 1)
                    axeDamageToMonster = finalDamage;
                    this.logBattleActionT('battle.axeLv3Counter', [player, axeDamageToMonster], player);
                } else {
                    // Level 1: Deal 1 damage to monster when HP decreases
                    axeDamageToMonster = 1;
                    this.logBattleActionT('battle.axeLv1Counter', [player, axeDamageToMonster], player);
                }
                
                // Apply damage cap to Axe counter damage
                const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
                if (damageCap !== null) {
                    axeDamageToMonster = Math.min(axeDamageToMonster, damageCap);
                    if (axeDamageToMonster < finalDamage && player.weapon.powerTrackPosition >= 7) {
                        this.logBattleActionT('battle.axeCounterCapped', [damageCap], player);
                    }
                }
                
                battle.monster.hp -= axeDamageToMonster;
                
                // Update monster HP display
                this.updateMonsterDisplay();
                
                // Check if monster is defeated by axe retaliation
                if (battle.monster.hp <= 0) {
                    this.logBattleActionT('battle.axeKill', [], player);
                    this.monsterDefeated();
                    return;
                }
            }
            // Allow item usage before player's next attack
            battle.turn = 'player_items_after_monster';

            // Hide Knife Lv3 2x damage button during monster attack (don't clear the flag —
            // it persists until used, so it re-appears on the next player turn)
            const doubleDamageBtn = document.getElementById('battle-double-damage-btn');
            if (doubleDamageBtn) {
                doubleDamageBtn.style.display = 'none';
            }

            this.updateBattlePhase();
            this.updateBattleItemButtons();

            // Push battle state after monster attack resolves
            if (this.gameMode === 'online' && this.isHost) {
                // Update host spectator view if watching remote player's battle
                const player = this.players.find(p => p.id === battle.playerId);
                if (player && player.id !== this.localPlayerId) {
                    this.updateHostSpectatorView();
                }
                this.pushBattleStateToGuest();
            }
        }
    }
    
    useDoubleDamage() {
        if (!this.currentBattle || !this.currentBattle.canUseDoubleDamage) return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const extraDamage = battle.lastAttackDamage; // Double means original + 1x extra
        
        // Apply the extra damage immediately (with damage cap)
        const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
        let finalExtraDamage = extraDamage;
        if (damageCap !== null) {
            // The total damage (original + extra) should not exceed the cap
            // Since we already applied capped damage, we need to check if we can add more
            const alreadyDealt = battle.lastAttackDamage;
            const remainingCap = Math.max(0, damageCap - alreadyDealt);
            finalExtraDamage = Math.min(extraDamage, remainingCap);
            if (finalExtraDamage < extraDamage) {
                this.addLogEntryT('battle.doubleDamageCap', [damageCap], 'battle');
            }
        }
        battle.monster.hp -= finalExtraDamage;
        
        // Mark double damage as used for this battle
        battle.doubleDamageUsed = true;
        battle.canUseDoubleDamage = false;
        
        this.logBattleActionT('battle.knifeLv3Activate', [player, extraDamage], player);
        
        // Update monster HP display
        document.getElementById('battle-monster-hp').textContent = `${Math.max(0, battle.monster.hp)}/${battle.monster.maxHp}`;
        
        // Check if monster is defeated
        if (battle.monster.hp <= 0) {
            this.monsterDefeated();
        } else {
            // Update battle phase to hide the button
            this.updateBattlePhase();
        }
    }

    tameMonster() {
        if (!this.currentBattle || (this.currentBattle.turn !== 'player' && this.currentBattle.turn !== 'player_items' && this.currentBattle.turn !== 'player_items_after_monster')) return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;
        
        // Calculate required EP - now always 1 EP regardless of monster level
        let requiredEP = 1;
        if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                requiredEP = 0;  // Level 3: Taming costs 0 EP
            } else {
                requiredEP = 0;  // Level 1: Taming costs 1 less EP (1 - 1 = 0)
            }
        }
        
        // Check for monster effect that requires +1 EP to tame (effect 20)
        if (monster.effectId === 20) {
            requiredEP += 1;
            console.log(`Monster effect 20: Requires +1 EP to tame (total: ${requiredEP} EP)`);
            this.showEffectNotificationT('effect.extraTameCost', []);
        }
        
        // Check if taming is possible (consider Chain weapon special HP requirement)
        let canTameHP = monster.hp === 1;
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 1) {
            canTameHP = monster.hp < 4;
        }
        
        if (!canTameHP || player.resources.ep < requiredEP) {
            return;
        }
        
        // Deduct the calculated EP cost
        if (requiredEP > 0) {
            this.modifyResource(battle.playerId, 'ep', -requiredEP);
        }
        
        // Add pet to player's collection
        if (monster.level === 1) {
            player.pets.level1++;
        } else if (monster.level === 2) {
            player.pets.level2++;
        } else if (monster.level === 3) {
            player.pets.level3++;
        }
        
        this.logBattleActionT('battle.tameSuccess', [player, monster.level, requiredEP], player);
        
        // Update pet display
        this.updatePetDisplay();
        
        // Player still gets all rewards as if they defeated the monster
        this.monsterDefeated(true);
    }
    
    monsterDefeated(wasTamed = false) {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;

        this.logBattleActionT('battle.defeatMonster', [player, monster.level], player);

        // Track monsters defeated for statistics
        if (!player.monstersDefeated) {
            player.monstersDefeated = { level1: 0, level2: 0, level3: 0 };
        }
        player.monstersDefeated[`level${monster.level}`]++;

        // Mark monster as defeated so it can't be selected again
        this.markMonsterDefeated(monster);

        // Knife Lv1 Power: defeating a monster doubles non-point rewards
        const knifeMultiplier = (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 1) ? 2 : 1;
        const finalMoney = monster.money * knifeMultiplier;
        const finalEnergy = monster.energy * knifeMultiplier;
        const finalBlood = monster.blood * knifeMultiplier;
        if (knifeMultiplier === 2 && (monster.money + monster.energy + monster.blood) > 0) {
            this.logBattleActionT('battle.knifeLv1Doubled', [], player);
        }

        // Award rewards
        if (finalMoney > 0) {
            this.modifyResource(battle.playerId, 'money', finalMoney);
            this.logBattleActionT('battle.gainMoney', [finalMoney], player);
        }
        if (finalEnergy > 0) {
            player.resources.beer += finalEnergy;
            this.addItemToInventory(battle.playerId, 'Beer', finalEnergy);
            this.logBattleActionT('battle.gainBeer', [finalEnergy], player);
        }
        if (finalBlood > 0) {
            player.resources.bloodBag += finalBlood;
            this.addItemToInventory(battle.playerId, 'Blood Bag', finalBlood);
            this.logBattleActionT('battle.gainBlood', [finalBlood], player);
        }
        if (monster.pts > 0) {
            let totalScore = monster.pts;
            
            // Add Fake Blood bonus points
            if (battle.bonusPts) {
                totalScore += battle.bonusPts;
            }
            
            if (battle.bonusPts) {
                this.logBattleActionT('battle.gainScoreFakeBlood', [monster.pts, battle.bonusPts, totalScore], player);
            } else {
                this.logBattleActionT('battle.gainScoreSimple', [monster.pts], player);
            }
            
            // Score from monster battle (already split if fake blood was used)
            if (!battle.bonusPts || battle.bonusPts === 0) {
                this.addScore(battle.playerId, totalScore, 'monster');
            } else {
                // Already handled in executeBotBattle
                this.addScore(battle.playerId, totalScore - battle.bonusPts, 'monster');
                this.addScore(battle.playerId, battle.bonusPts, 'fakeblood');
            }
        }

        // Sword Lv3 Power: +X bonus points where X = monster level (categorized as 'other')
        if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 7) {
            this.addScore(battle.playerId, monster.level, 'other');
            this.logBattleActionT('battle.swordLv3Bonus', [monster.level], player);
        }

        // Advance weapon power track based on monster level
        this.advanceWeaponPowerTrack(battle.playerId, monster.level);

        // Apply death effects only if the monster was killed, not tamed
        if (!wasTamed && monster.effectId) {
            this.applyDeathEffect(monster.effectId, battle.playerId);
        }

        // Update collapsed board display immediately after rewards
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(p => {
            this.updateInventoryDisplay(p.id);
        });

        this.endMonsterBattle(true);
    }
    
    playerDefeated(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // No score penalty (removed)
        this.logBattleActionT('battle.defeatedByMonster', [player], player);
        
        // Set HP to 1
        player.resources.hp = 1;
        this.logBattleActionT('battle.playerHPSet1', [player], player);
        
        // EP doesn't change (no log message needed)
        
        this.endMonsterBattle(false);
    }
    
    endMonsterBattle(victory) {
        // Push final battle state before clearing (so guest sees result)
        if (this.gameMode === 'online' && this.isHost) {
            // Force battlePhase to 'ended' since the battle is over
            // (can't rely on isActive — playerDefeated resets HP to 1 before calling this)
            const battleState = this.serializeBattleState();
            const state = this.serializeGameState();
            state.roundPhase = 'battle';
            state.battleState = battleState;
            state.battlePhase = 'ended';
            // Preserve guestBattle flag so the guest's own battle ending goes through
            // the correct code path (guest branch, not spectator branch)
            if (battleState) {
                state.currentBattlePlayerId = battleState.playerId;
                const battlePlayer = this.players.find(p => p.id === battleState.playerId);
                state.guestBattle = battlePlayer && !battlePlayer.isBot && battleState.playerId !== this.localPlayerId;
            } else {
                state.guestBattle = false;
            }
            this.onlineManager.pushGameState(state);
        }

        this.currentBattle = null;

        setTimeout(() => {
            document.getElementById('monster-battle').style.display = 'none';
            document.getElementById('battle-log').innerHTML = '';

            if (this.gameMode === 'online' && this.isHost) {
                // Push ended state so guest hides battle UI
                const state = this.serializeGameState();
                state.roundPhase = 'battle';
                state.guestBattle = false;
                state.battlePhase = 'ended';
                state.battleState = null;
                this.onlineManager.pushGameState(state);

                // Continue with remaining forest hunters or end battle phase
                if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                    this.handleForestEncountersOnline(this.remainingForestHunters);
                } else {
                    this.playerShownMonsters = {};
                    this.endRoundOnline();
                }
            } else {
                // Continue with remaining forest hunters or end battle phase
                if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                    this.handleForestEncounters(this.remainingForestHunters);
                } else {
                    // Clean up shown monsters data (all forest battles complete)
                    this.playerShownMonsters = {};
                    this.endRound();
                }
            }
        }, 3000);

        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
    }
    
    advanceWeaponPowerTrack(playerId, monsterLevel, battleActions = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Advance power track position based on monster level (max position is 7)
        const spacesToMove = monsterLevel || 1; // Default to 1 if no level provided
        const oldPosition = player.weapon.powerTrackPosition;
        player.weapon.powerTrackPosition = Math.min(7, player.weapon.powerTrackPosition + spacesToMove);
        const actualMoved = player.weapon.powerTrackPosition - oldPosition;
        
        if (actualMoved > 0) {
            // Update UI
            this.updateWeaponPowerDisplay(playerId);
            
            // Check for power level upgrades
            const wasBelow3 = oldPosition < 3;
            const wasBelow7 = oldPosition < 7;
            
            if (wasBelow3 && player.weapon.powerTrackPosition >= 3) {
                // Just unlocked Level 2 power
                this.activateWeaponPower(playerId, 2, battleActions);
            }
            if (wasBelow7 && player.weapon.powerTrackPosition >= 7) {
                // Just unlocked Level 3 power
                this.activateWeaponPower(playerId, 3, battleActions);
            }
            
            const message = t('battle.weaponPowerAdvance', this.getPlayerDisplayName(player), actualMoved, player.weapon.powerTrackPosition);
            if (battleActions) {
                battleActions.push(message);
            } else {
                this.logBattleAction(message, player);
            }
        } else {
            const message = t('battle.weaponPowerMaxed', this.getPlayerDisplayName(player));
            if (battleActions) {
                battleActions.push(message);
            } else {
                this.logBattleAction(message, player);
            }
        }
    }
    
    updateWeaponPowerDisplay(playerId) {
        // Skip UI updates in automated mode for performance
        if (this.isAutomatedMode) return;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const token = document.getElementById(`p${playerId}-power-token`);
        // Return early if token doesn't exist (e.g., in collapsed view)
        if (!token) return;

        const position = player.weapon.powerTrackPosition;

        // Set token color to match player color
        const playerColors = this.getPlayerColors(playerId);
        token.style.backgroundColor = playerColors.background;
        token.style.border = `2px solid ${playerColors.border}`;

        // Calculate token position to center in each track space
        // With 7 spaces, each space takes up 1/7 of the track width
        // Position 1 centers at 1/14, position 2 at 3/14, etc.
        const percentage = ((position - 1) * (100/7)) + (100/14);
        token.style.left = `${percentage}%`;
        
        // Update active power levels
        for (let level = 1; level <= 3; level++) {
            const powerElement = document.getElementById(`p${playerId}-power-lv${level}`);
            if (level === 1 || (level === 2 && position >= 3) || (level === 3 && position >= 7)) {
                powerElement.classList.add('active');
            } else {
                powerElement.classList.remove('active');
            }
        }
    }
    
    updateWeaponPowerDescriptions(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.weapon) return;

        // Update power descriptions (only exist in expanded view)
        const powerDesc1 = document.getElementById(`p${playerId}-power-desc-1`);
        const powerDesc2 = document.getElementById(`p${playerId}-power-desc-2`);
        const powerDesc3 = document.getElementById(`p${playerId}-power-desc-3`);

        const desc1 = this.getWeaponPowerDesc(player.weapon.name, 1) || t('common.none');
        const desc2 = this.getWeaponPowerDesc(player.weapon.name, 2) || t('common.none');
        const desc3 = this.getWeaponPowerDesc(player.weapon.name, 3) || t('common.none');

        if (powerDesc1) {
            powerDesc1.textContent = desc1;
            powerDesc1.closest('.power-level').setAttribute('data-tooltip', desc1);
        }
        if (powerDesc2) {
            powerDesc2.textContent = desc2;
            powerDesc2.closest('.power-level').setAttribute('data-tooltip', desc2);
        }
        if (powerDesc3) {
            powerDesc3.textContent = desc3;
            powerDesc3.closest('.power-level').setAttribute('data-tooltip', desc3);
        }
    }
    
    activateWeaponPower(playerId, level, battleActions = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        if (battleActions) {
            battleActions.push({k: 'battle.unlocksWeaponPower', a: [player, level]});
        } else {
            this.logBattleActionT('battle.unlocksWeaponPower', [player, level], player);
        }
        
        // Apply power effects based on weapon and level
        const weaponName = player.weapon.name;
        
        switch (weaponName) {
            case 'Bat':
                this.applyBatPower(player, level, battleActions);
                break;
            case 'Katana':
                this.applyKatanaPower(player, level, battleActions);
                break;
            case 'Plasma':
                this.applyPlasmaPower(player, level, battleActions);
                break;
            default:
                break;
        }
    }
    
    applyBatPower(player, level, battleActions = null) {
        switch (level) {
            case 1:
                // 徒弟在資源區域撞其他獵人+1區域資源 (Apprentice gets +1 resource when bumping into other hunters in resource areas)
                player.batPower = { apprenticeBonus: true };
                const message1 = `${player.name}'s apprentice now gets bonus resources when sharing locations!`;
                if (battleActions) {
                    battleActions.push(message1);
                } else {
                    this.logBattleAction(message1, player);
                }
                break;
            case 2:
                // 回合開始+1血袋+1體力 (Start of round +1 blood bag +1 energy)
                player.batPower = { ...player.batPower, roundStart: { bloodBag: 1, energy: 1 } };
                const message2 = `${player.name} will gain +1 blood bag and +1 energy at round start!`;
                if (battleActions) {
                    battleActions.push(message2);
                } else {
                    this.logBattleAction(message2, player);
                }
                break;
            case 3:
                // 命中的骰子再骰，直到沒有骰子命中，傷害為所有傷害加總 (Re-roll hit dice until no dice hit, damage is sum of all damage)
                player.batPower = { ...player.batPower, explosiveDice: true };
                const message3 = `${player.name}'s attacks now have explosive dice - keep rolling hits!`;
                if (battleActions) {
                    battleActions.push(message3);
                } else {
                    this.logBattleAction(message3, player);
                }
                break;
        }
    }
    
    applyKatanaPower(player, level, battleActions = null) {
        switch (level) {
            case 1:
                // 1血袋換1體力 (1 blood bag converts to 1 energy)
                player.katanaPower = { bloodToEnergy: true };
                const message1 = `${player.name} can now convert blood bags to energy efficiently!`;
                if (battleActions) {
                    battleActions.push(message1);
                } else {
                    this.logBattleAction(message1, player);
                }
                break;
            case 2:
                // 打敗怪獸+2經驗 (Defeating monsters gives +2 experience)
                player.katanaPower = { ...player.katanaPower, bonusExp: 2 };
                const message2 = `${player.name} gains +2 extra experience from defeating monsters!`;
                if (battleActions) {
                    battleActions.push(message2);
                } else {
                    this.logBattleAction(message2, player);
                }
                break;
            case 3:
                // 攻擊骰總點數大於27則一擊必殺 (If attack dice total > 27, instant kill)
                player.katanaPower = { ...player.katanaPower, instantKill: 27 };
                const message3 = `${player.name} can instant kill monsters with attack dice total > 27!`;
                if (battleActions) {
                    battleActions.push(message3);
                } else {
                    this.logBattleAction(message3, player);
                }
                break;
        }
    }
    
    applyPlasmaPower(player, level, battleActions = null) {
        switch (level) {
            case 1:
                // Level 1: Needs batteries to attack
                const message1 = `${player.name}'s Plasma weapon now requires batteries to attack!`;
                if (battleActions) {
                    battleActions.push(message1);
                } else {
                    this.logBattleAction(message1, player);
                }
                break;
            case 2:
                // Level 2: +3$ at round start
                const message2 = `${player.name} will gain +3$ at round start!`;
                if (battleActions) {
                    battleActions.push(message2);
                } else {
                    this.logBattleAction(message2, player);
                }
                break;
            case 3:
                // Level 3: Infinite ammunition - batteries no longer take up space
                // Set all existing batteries to size 0
                let batteryCount = 0;
                player.inventory.forEach(item => {
                    if (item.name === 'Battery') {
                        item.size = 0;
                        batteryCount++;
                    }
                });
                
                const message3 = `${player.name}'s Plasma weapon now has infinite ammunition! Batteries no longer take up inventory space.`;
                if (batteryCount > 0) {
                    const capacityMessage = `${batteryCount} batteries in inventory now have 0 size, freeing up ${batteryCount} capacity!`;
                    if (battleActions) {
                        battleActions.push(message3);
                        battleActions.push(capacityMessage);
                    } else {
                        this.logBattleAction(message3, player);
                        this.logBattleAction(capacityMessage, player);
                    }
                } else {
                    if (battleActions) {
                        battleActions.push(message3);
                    } else {
                        this.logBattleAction(message3, player);
                    }
                }
                
                // Update inventory display to reflect the capacity change
                this.updateInventoryDisplay(player.id);
                this.updateResourceDisplay();
                break;
        }
    }
    
    logBattleAction(message, player = null) {
        const log = document.getElementById('battle-log');
        if (log) {
            const logEntry = document.createElement('div');
            logEntry.className = 'battle-log-entry';
            logEntry.textContent = message;
            log.appendChild(logEntry);
            log.scrollTop = log.scrollHeight;
        }

        // Also add to main game log
        this.addLogEntry(`⚔️ ${message}`, 'battle', player);
    }

    /**
     * Render a single bot-battle "action" entry. Entries can be:
     *  - { k, a }   structured i18n key + args (preferred — survives network sync)
     *  - 'string'   legacy plain text (host-only display)
     */
    flushBattleAction(action, player = null) {
        if (action == null) return;
        if (typeof action === 'object' && action.k) {
            // Push as a battleT-wrapped entry through logBattleActionT (without writing to battle modal)
            // We pass through addLogEntryT-style serialization so guests can re-translate.
            this.addLogEntryT('__battlePrefix__', [{ __t__: action.k, args: action.a || [] }], 'battle', player);
            return;
        }
        if (typeof action === 'string') {
            if (action.includes('---')) return;
            this.addLogEntry(`⚔️ ${action}`, 'battle', player);
        }
    }

    /**
     * Translation-aware battle log action. Uses a structured key + args so the
     * entry can be synced across the network and translated locally.
     */
    logBattleActionT(key, args, player = null) {
        if (!Array.isArray(args)) args = [];

        // Resolve special markers (player objects, item names) before local render
        const resolvedArgs = args.map((a) => this._resolveLogArg(a));

        // Render to local battle modal
        const localText = t.apply(null, [key].concat(resolvedArgs));
        const log = document.getElementById('battle-log');
        if (log) {
            const logEntry = document.createElement('div');
            logEntry.className = 'battle-log-entry';
            logEntry.textContent = localText;
            log.appendChild(logEntry);
            log.scrollTop = log.scrollHeight;
        }

        // Render to local main game log with the ⚔️ prefix
        if (!this.isAutomatedMode) {
            this.addLogEntry('⚔️ ' + localText, 'battle', player);
        }

        // Push structured entry for network sync; convert player-objects in args
        const argsForNet = args.map(function (a) {
            if (a && typeof a === 'object' && typeof a.id === 'number' && typeof a.name === 'string') {
                return { __player__: true, name: a.name };
            }
            return a;
        });
        if (!this.structuredLog) this.structuredLog = [];
        this.structuredLog.push({
            key: '__battleT__',
            args: [key, argsForNet],
            category: 'battle',
            playerId: player && typeof player.id === 'number' ? player.id : -1,
            playerColor: player && player.color && player.color.background ? player.color.background : null
        });
        if (this.structuredLog.length > 50) {
            this.structuredLog.shift();
        }
    }
    
    loadStoreItems() {
        // Load store items from Item.csv
        return [
            { name: 'Beer', size: 1, price: 2, effect: 'gain_1_energy', icon: '🍺', description: 'Restores 1 EP / Upgrade EP max' },
            { name: 'Blood Bag', size: 1, price: 2, effect: 'gain_1_blood', icon: '🩸', description: 'Restores 1 HP / Upgrade HP max' },
            { name: 'Fake Blood', size: 2, price: 2, effect: 'bonus_points_on_kill', icon: '🩹', description: '+2 points when defeating monster' },
            { name: 'Grenade', size: 2, price: 2, effect: 'reduce_1_monster_hp', icon: '💣', description: '+1 damage to monster' },
            { name: 'Bomb', size: 3, price: 4, effect: 'reduce_2_monster_hp', icon: '💥', description: '+2 damage to monster' },
            { name: 'Dynamite', size: 4, price: 6, effect: 'reduce_3_monster_hp', icon: '🧨', description: '+3 damage to monster' }
        ];
    }
    
    enterStorePhase() {
        this.roundPhase = 'store';
        this.currentStorePlayer = 0;

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting store phase - Round ${this.currentRound}`);
        }

        // Branch based on game mode
        if (this.gameMode === 'online' && this.isHost) {
            this.enterStorePhaseOnline();
        } else if (this.gameMode === 'simultaneous') {
            this.enterStorePhaseSimultaneous();
        } else {
            this.enterStorePhaseTurnBased();
        }
    }

    enterStorePhaseSimultaneous() {
        // Reset completion flag
        this.storePhaseCompleted = false;

        // Show status indicators and reset completion status
        this.showPlayerStatusIndicators();
        this.setPhaseTitle(t('phase.store'));
        this.resetPlayerCompletionStatus();

        // Trigger all bots to shop immediately
        this.players.forEach((player, index) => {
            if (player.isBot) {
                setTimeout(() => {
                    this.handleBotShopping(player);
                }, this.getDelay(50 * (index + 1)));
            }
        });

        // Show store for the human player
        const humanPlayer = this.players.find(p => !p.isBot);
        if (humanPlayer && !this.isAutomatedMode) {
            this.showStoreForPlayer(humanPlayer);
        }

        // Refresh button states for all players
        this.refreshAllPlayerButtonStates();
    }

    enterStorePhaseTurnBased() {
        // Reset completion flag
        this.storePhaseCompleted = false;

        // Show status indicators
        this.showPlayerStatusIndicators();
        this.setPhaseTitle(t('phase.store'));
        this.resetPlayerCompletionStatus();

        // Show store for first player (turn-based)
        this.showStore();

        // Refresh button states for all players
        this.refreshAllPlayerButtonStates();
    }
    
    showStore() {
        const player = this.players[this.currentStorePlayer];
        
        // Check if current player is a bot
        if (player.isBot) {
            this.handleBotShopping(player);
            return;
        }
        
        // Hide card selection and show store area for human players
        document.querySelector('.card-selection').style.display = 'none';
        document.getElementById('store-area').style.display = 'block';
        
        // Hide current player text and confirm button during store phase
        document.querySelector('.current-player').style.display = 'none';
        document.getElementById('confirm-selection').style.display = 'none';
        
        // Update store header info
        document.getElementById('store-current-player').textContent = this.getPlayerDisplayName(player);
        document.getElementById('store-player-money').textContent = player.resources.money;
        document.getElementById('store-current-capacity').textContent = this.getInventorySize(player);
        document.getElementById('store-max-capacity').textContent = player.maxInventoryCapacity;
        
        // Create store items
        const storeContainer = document.getElementById('store-items-grid');
        storeContainer.innerHTML = '';
        
        // Create items array with dynamic bullets for Rifle players
        let availableItems = [...this.storeItems];
        
        // Add bullets for Rifle players (Level 1 power)
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bulletItem = {
                name: 'Bullet',
                size: 0,
                price: 2,
                effect: 'rifle_ammo',
                icon: '🔫',
                description: 'Ammunition required for Rifle weapon',
                isSpecial: true,
                maxCount: 6
            };
            availableItems.unshift(bulletItem); // Add bullets at the beginning
        }

        // Add batteries for Plasma players (purchasable from Lv1+)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            const batteryItem = {
                name: 'Battery',
                size: 0,
                price: 2, // Level 1 power: batteries cost $2 instead of $3
                effect: 'plasma_power',
                icon: '🔋',
                description: 'Ammunition required for Plasma weapon',
                isSpecial: true,
                maxCount: 6
            };
            availableItems.unshift(batteryItem); // Add batteries at the beginning
        }

        availableItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item-card';
            if (item.isSpecial) itemElement.classList.add('special-item');
            // Add tooltip with item description
            if (item.description) {
                itemElement.title = item.description;
            }
            
            const currentSize = this.getInventorySize(player);
            let actualPrice = item.price;
            
            // Rifle Level 3 power: -1 cost for all items
            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 7) {
                actualPrice = Math.max(1, item.price - 1); // Minimum cost of 1
            }
            
            const canAfford = player.resources.money >= actualPrice;
            const exceedsCapacity = (currentSize + item.size) > player.maxInventoryCapacity;
            
            // Check if player already has max special items
            let hasMaxSpecialItems = false;
            let maxWarning = '';
            if (item.name === 'Bullet') {
                const bulletCount = player.inventory.filter(inv => inv.name === 'Bullet').length;
                hasMaxSpecialItems = bulletCount >= 6;
                maxWarning = t('store.maxBullets');
            } else if (item.name === 'Battery') {
                const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
                hasMaxSpecialItems = batteryCount >= 6;
                maxWarning = t('store.maxBatteries');
            }

            const isDisabled = !canAfford || hasMaxSpecialItems;
            const priceDisplay = actualPrice !== item.price ?
                `<span class="original-price">$${item.price}</span> $${actualPrice}` :
                `$${actualPrice}`;

            itemElement.innerHTML = `
                <div class="item-icon-large">${item.icon || '❓'}</div>
                <h4 class="item-name">${this.getItemDisplayName(item.name)}</h4>
                <div class="item-price">${priceDisplay}</div>
                <div class="item-size">${t('store.size')} ${item.size}</div>
                ${(item.name === 'Bullet' || item.name === 'Battery') ? `<div class="bullet-count">${t('store.maxLabel')} 6</div>` : ''}
                ${exceedsCapacity ? `<div class="capacity-warning">${t('store.overCapacity')}</div>` : ''}
                ${hasMaxSpecialItems ? `<div class="capacity-warning">⚠️ ${maxWarning}</div>` : ''}
                <button class="buy-btn" onclick="game.buyStoreItem('${item.name}', ${actualPrice}, ${item.size})" ${isDisabled ? 'disabled' : ''}>
                    ${t('store.buy')}
                </button>
            `;
            storeContainer.appendChild(itemElement);
        });
        
        // Update player's resources display
        this.updateResourceDisplay();
    }

    showStoreForPlayer(player) {
        // This function shows the store for a specific player (used in simultaneous mode)

        // Hide card selection and show store area for human players
        document.querySelector('.card-selection').style.display = 'none';
        document.getElementById('store-area').style.display = 'block';

        // Hide current player text and confirm button during store phase
        document.querySelector('.current-player').style.display = 'none';
        document.getElementById('confirm-selection').style.display = 'none';

        // Update store header info
        document.getElementById('store-current-player').textContent = this.getPlayerDisplayName(player);
        document.getElementById('store-player-money').textContent = player.resources.money;
        document.getElementById('store-current-capacity').textContent = this.getInventorySize(player);
        document.getElementById('store-max-capacity').textContent = player.maxInventoryCapacity;

        // Create store items
        const storeContainer = document.getElementById('store-items-grid');
        storeContainer.innerHTML = '';

        // Create items array with dynamic bullets for Rifle players
        let availableItems = [...this.storeItems];

        // Add bullets for Rifle players (Level 1 power)
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bulletItem = {
                name: 'Bullet',
                size: 0,
                price: 2,
                effect: 'rifle_ammo',
                icon: '🔫',
                description: 'Ammunition required for Rifle weapon',
                isSpecial: true,
                maxCount: 6
            };
            availableItems.unshift(bulletItem); // Add bullets at the beginning
        }

        // Add batteries for Plasma players (purchasable from Lv1+)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1) {
            const batteryItem = {
                name: 'Battery',
                size: 0,
                price: 2, // Level 1 power: batteries cost $2 instead of $3
                effect: 'plasma_power',
                icon: '🔋',
                description: 'Ammunition required for Plasma weapon',
                isSpecial: true,
                maxCount: 6
            };
            availableItems.unshift(batteryItem); // Add batteries at the beginning
        }

        availableItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item-card';
            if (item.isSpecial) itemElement.classList.add('special-item');
            // Add tooltip with item description
            if (item.description) {
                itemElement.title = item.description;
            }

            const currentSize = this.getInventorySize(player);
            let actualPrice = item.price;

            // Rifle Level 3 power: -1 cost for all items
            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 7) {
                actualPrice = Math.max(1, item.price - 1); // Minimum cost of 1
            }

            const canAfford = player.resources.money >= actualPrice;
            const exceedsCapacity = (currentSize + item.size) > player.maxInventoryCapacity;

            // Check if player already has max special items
            let hasMaxSpecialItems = false;
            let maxWarning = '';
            if (item.name === 'Bullet') {
                const bulletCount = player.inventory.filter(inv => inv.name === 'Bullet').length;
                hasMaxSpecialItems = bulletCount >= 6;
                maxWarning = t('store.maxBullets');
            } else if (item.name === 'Battery') {
                const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
                hasMaxSpecialItems = batteryCount >= 6;
                maxWarning = t('store.maxBatteries');
            }

            const isDisabled = !canAfford || hasMaxSpecialItems;
            const priceDisplay = actualPrice !== item.price ?
                `<span class="original-price">$${item.price}</span> $${actualPrice}` :
                `$${actualPrice}`;

            itemElement.innerHTML = `
                <div class="item-icon-large">${item.icon || '❓'}</div>
                <h4 class="item-name">${this.getItemDisplayName(item.name)}</h4>
                <div class="item-price">${priceDisplay}</div>
                <div class="item-size">${t('store.size')} ${item.size}</div>
                ${(item.name === 'Bullet' || item.name === 'Battery') ? `<div class="bullet-count">${t('store.maxLabel')} 6</div>` : ''}
                ${exceedsCapacity ? `<div class="capacity-warning">${t('store.overCapacity')}</div>` : ''}
                ${hasMaxSpecialItems ? `<div class="capacity-warning">⚠️ ${maxWarning}</div>` : ''}
                <button class="buy-btn" onclick="game.buyStoreItem('${item.name}', ${actualPrice}, ${item.size})" ${isDisabled ? 'disabled' : ''}>
                    ${t('store.buy')}
                </button>
            `;
            storeContainer.appendChild(itemElement);
        });

        // Update player's resources display
        this.updateResourceDisplay();
    }

    handleBotShopping(player) {
        // Skip UI updates in automated mode
        if (!this.isAutomatedMode) {
            // Only hide UI elements in turn-based mode
            // In simultaneous mode, bots shop in background while human uses the store UI
            if (this.gameMode !== 'simultaneous' && this.gameMode !== 'online') {
                // Hide store UI for bot turns
                const cardSelection = document.querySelector('.card-selection');
                const storeArea = document.getElementById('store-area');
                const currentPlayer = document.querySelector('.current-player');
                const confirmButton = document.getElementById('confirm-selection');

                if (cardSelection) cardSelection.style.display = 'none';
                if (storeArea) storeArea.style.display = 'none';
                if (currentPlayer) currentPlayer.style.display = 'none';
                if (confirmButton) confirmButton.style.display = 'none';

                // Show status message that bot is shopping
                const statusElement = document.getElementById('status-message');
                if (statusElement) {
                    statusElement.innerHTML = t('status.botShopping', this.getPlayerDisplayName(player));
                }
            }
            // In simultaneous mode, no UI changes needed - bots shop silently
        } else {
            console.log(`[${new Date().toISOString()}] Bot ${player.name} shopping - Round ${this.currentRound}`);
        }
        
        // Use the bot's money management logic to automatically purchase items
        let purchasedItems = [];
        let gameState = {
            round: this.currentRound,
            round: this.currentRound,
            availableLocations: [1, 2, 3, 4, 5, 6, 7], // All locations available for context
            otherPlayersData: this.players.filter(p => p.id !== player.id).map(p => ({
                preferredLocation: p.weapon.preferLocation,
                score: p.score
            }))
        };
        
        // Get bot's item priorities
        const botPlayer = new BotPlayer(player.id, player.weapon);
        let itemPriority = [];
        
        // Weapon-specific item priorities
        if (player.weapon.name === 'Rifle') {
            const currentBullets = player.inventory.filter(item => item.name === 'Bullet').length;
            if (currentBullets < 3) {
                itemPriority = [
                    { name: 'Bullet', price: 2, size: 0 },
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            } else {
                itemPriority = [
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            }
        } else if (player.weapon.name === 'Plasma') {
            const currentBatteries = player.inventory.filter(item => item.name === 'Battery').length;
            if (currentBatteries < 3) {
                itemPriority = [
                    { name: 'Battery', price: 2, size: 1 }, // Plasma Lv1 power: batteries cost $2
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            } else {
                itemPriority = [
                    { name: 'Dynamite', price: 6, size: 4 },
                    { name: 'Bomb', price: 4, size: 3 },
                    { name: 'Grenade', price: 2, size: 2 },
                    { name: 'Fake Blood', price: 2, size: 2 },
                    { name: 'Blood Bag', price: 2, size: 1 },
                    { name: 'Beer', price: 2, size: 1 }
                ];
            }
        } else {
            // Default priority for other weapons
            itemPriority = [
                { name: 'Dynamite', price: 6, size: 4 },
                { name: 'Bomb', price: 4, size: 3 },
                { name: 'Grenade', price: 2, size: 2 },
                { name: 'Fake Blood', price: 2, size: 2 },
                { name: 'Blood Bag', price: 2, size: 1 },
                { name: 'Beer', price: 2, size: 1 }
            ];
        }
        
        // Bot shopping logic - buy items according to priority and budget
        for (let item of itemPriority) {
            while (player.resources.money >= item.price) {
                const currentSize = this.getInventorySize(player);
                
                // Check capacity constraints
                if (currentSize + item.size > player.maxInventoryCapacity) {
                    break; // Can't buy more due to capacity
                }
                
                // Check special item limits
                if (item.name === 'Bullet') {
                    const bulletCount = player.inventory.filter(inv => inv.name === 'Bullet').length;
                    if (bulletCount >= 6) break;
                } else if (item.name === 'Battery') {
                    const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
                    if (batteryCount >= 6) break;
                }
                
                // Apply weapon discounts
                let actualPrice = item.price;
                if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 7) {
                    actualPrice = Math.max(1, item.price - 1);
                }
                
                if (player.resources.money >= actualPrice) {
                    // Purchase the item
                    player.resources.money -= actualPrice;
                    player.inventory.push({
                        name: item.name,
                        size: item.size,
                        effect: this.getItemEffect(item.name)
                    });
                    purchasedItems.push(item.name);
                } else {
                    break;
                }
            }
        }
        
        // Perform automatic resource management after shopping
        let managementActions = [];
        
        // 1. EXP Management - Check for dice upgrades
        const botForEXP = new BotPlayer(player.id, player.weapon);
        
        // Track EXP actions manually since manageEXP doesn't return them
        const expBefore = player.resources.exp;
        const attackDiceBefore = player.weapon.currentAttackDice;
        const defenseDiceBefore = player.weapon.currentDefenseDice;
        
        botForEXP.manageEXP(player);
        
        // Check what changed and create action messages
        if (player.weapon.currentAttackDice > attackDiceBefore) {
            managementActions.push(this.tArg('botAction.upgradedAttackDice', player.weapon.currentAttackDice, botForEXP.weapon.reqExpAttack));
        }
        if (player.weapon.currentDefenseDice > defenseDiceBefore) {
            managementActions.push(this.tArg('botAction.upgradedDefenseDice', player.weapon.currentDefenseDice));
        }
        
        // 2. HP/EP Recovery and Upgrades
        let hpEpActions = [];
        
        // HP Recovery: Use blood bags to restore HP if not at max
        while (player.resources.hp < player.maxResources.hp) {
            const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
            if (bloodBagIndex >= 0) {
                player.inventory.splice(bloodBagIndex, 1);
                player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                player.resources.hp = Math.min(player.maxResources.hp, player.resources.hp + 1);
                hpEpActions.push(this.tArg('botAction.usedBloodBag', 1));
            } else {
                break;
            }
        }

        // EP Recovery: Use beer to restore EP if not at max
        while (player.resources.ep < player.maxResources.ep) {
            const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
            if (beerIndex >= 0) {
                player.inventory.splice(beerIndex, 1);
                player.resources.beer = Math.max(0, player.resources.beer - 1);
                player.resources.ep = Math.min(player.maxResources.ep, player.resources.ep + 1);
                hpEpActions.push(this.tArg('botAction.usedBeer', 1));
            } else {
                break;
            }
        }
        
        // HP Upgrades: Use 3 blood bags to upgrade max HP
        const bloodBags = player.inventory.filter(item => item.name === 'Blood Bag');
        if (bloodBags.length >= 3 && player.maxResources.hp < 10) {
            const possibleUpgrades = Math.min(Math.floor(bloodBags.length / 3), 10 - player.maxResources.hp);
            for (let i = 0; i < possibleUpgrades; i++) {
                // Remove 3 blood bags
                for (let j = 0; j < 3; j++) {
                    const bloodBagIndex = player.inventory.findIndex(item => item.name === 'Blood Bag');
                    if (bloodBagIndex >= 0) {
                        player.inventory.splice(bloodBagIndex, 1);
                        player.resources.bloodBag = Math.max(0, player.resources.bloodBag - 1);
                    }
                }
                player.maxResources.hp += 1;
                player.resources.hp += 1; // Also increase current HP
                hpEpActions.push(this.tArg('botAction.upgradedHpPlus1'));
                
                // Check for milestone bonuses
                if (player.maxResources.hp === 6 && !player.milestones.hp6) {
                    this.addScore(player.id, 2, 'milestone');
                    player.milestones.hp6 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-6`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push(this.tArg('botAction.hpMilestone', 2));
                } else if (player.maxResources.hp === 8 && !player.milestones.hp8) {
                    this.addScore(player.id, 3, 'milestone');
                    player.milestones.hp8 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-8`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push(this.tArg('botAction.hpMilestone', 3));
                } else if (player.maxResources.hp === 10 && !player.milestones.hp10) {
                    this.addScore(player.id, 4, 'milestone');
                    player.milestones.hp10 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push(this.tArg('botAction.hpMilestone', 4));
                }
            }
        }
        
        // EP Upgrades: Use 4 beers to upgrade max EP
        const beers = player.inventory.filter(item => item.name === 'Beer');
        if (beers.length >= 4 && player.maxResources.ep < 10) {
            const possibleUpgrades = Math.min(Math.floor(beers.length / 4), 10 - player.maxResources.ep);
            for (let i = 0; i < possibleUpgrades; i++) {
                // Remove 4 beers
                for (let j = 0; j < 4; j++) {
                    const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                    if (beerIndex >= 0) {
                        player.inventory.splice(beerIndex, 1);
                        player.resources.beer = Math.max(0, player.resources.beer - 1);
                    }
                }
                player.maxResources.ep += 1;
                player.resources.ep += 1; // Also increase current EP
                hpEpActions.push(this.tArg('botAction.upgradedEpPlus1'));
                
                // Check for milestone bonuses
                if (player.maxResources.ep === 8 && !player.milestones.ep8) {
                    this.addScore(player.id, 2, 'milestone');
                    player.milestones.ep8 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-8`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push(this.tArg('botAction.epMilestone', 2));
                } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                    this.addScore(player.id, 4, 'milestone');
                    player.milestones.ep10 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push(this.tArg('botAction.epMilestone', 4));
                }
            }
        }
        
        if (hpEpActions.length > 0) {
            managementActions.push(...hpEpActions);
        }
        
        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(player.id);
        
        // Show what the bot bought and what resource management was performed
        setTimeout(() => {
            let statusMessages = [];
            let logMessages = [];

            // Handle purchases
            if (purchasedItems.length > 0) {
                const itemCounts = {};
                purchasedItems.forEach(item => {
                    itemCounts[item] = (itemCounts[item] || 0) + 1;
                });

                const itemList = Object.entries(itemCounts)
                    .map(([item, count]) => count > 1 ? `${this.getItemDisplayName(item)} x${count}` : this.getItemDisplayName(item))
                    .join(', ');

                statusMessages.push(t('botStore.boughtSuffix', itemList));
                logMessages.push({ key: 'log.botBought', args: [player, itemList], player: player });
            } else {
                statusMessages.push(t('botStore.boughtNothingSuffix'));
                logMessages.push({ key: 'log.botBoughtNothing', args: [player], player: player });
            }

            // Handle resource management actions
            if (managementActions.length > 0) {
                // managementActions is an array of __t__ markers; resolve to local strings for the status display,
                // but pass the raw array as the log arg so guests re-translate locally.
                const localManagementList = managementActions.map((a) => this._resolveLogArg(a)).join(', ');
                statusMessages.push(t('botStore.managedSuffix', localManagementList));
                logMessages.push({ key: 'log.botAutoManaged', args: [player, managementActions], player: player });
            }

            // Update status element (skip in automated mode)
            if (!this.isAutomatedMode) {
                const statusElement = document.getElementById('status-message');
                if (statusElement) {
                    statusElement.innerHTML = `<strong>${this.getPlayerDisplayName(player)}</strong> ${statusMessages.join('; ')}`;
                }
            }

            // Add to game log
            logMessages.forEach(logEntry => {
                if (logEntry.key) {
                    this.addLogEntryT(logEntry.key, logEntry.args || [], 'store-purchase', logEntry.player);
                } else {
                    this.addLogEntry(logEntry.msg, 'store-purchase', logEntry.player);
                }
            });

            // Handle completion based on game mode
            setTimeout(() => {
                if (this.gameMode === 'simultaneous' || this.gameMode === 'online') {
                    // In simultaneous/online mode, mark bot as complete
                    this.updatePlayerStatus(player.id, true);

                    // Trigger centralized completion check
                    this.checkStorePhaseCompletion();
                } else {
                    // Turn-based mode: proceed to next player
                    this.finishShopping();
                }
            }, this.getDelay(1500));
        }, this.getDelay(1000));
    }
    
    getItemEffect(itemName) {
        const effects = {
            'Beer': 'gain_1_energy',
            'Blood Bag': 'gain_1_blood',
            'Grenade': 'reduce_1_monster_hp',
            'Bomb': 'reduce_2_monster_hp',
            'Dynamite': 'reduce_3_monster_hp',
            'Fake Blood': 'bonus_points_on_kill',
            'Bullet': 'rifle_ammo',
            'Battery': 'plasma_power'
        };
        return effects[itemName] || 'unknown';
    }
    
    // Game Log Management
    addLogEntry(message, category = 'system', player = null) {
        // Skip logging in automated mode for performance
        if (this.isAutomatedMode) return;

        const logContainer = document.getElementById('game-log');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${category}`;
        logEntry.innerHTML = message;

        // Apply player border color if player is provided, otherwise use white
        if (player && player.color && player.color.background) {
            logEntry.style.setProperty('border-left-color', player.color.background, 'important');
        } else {
            logEntry.style.setProperty('border-left-color', 'white', 'important');
        }

        logContainer.appendChild(logEntry);

        // Auto-scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;

        // Limit log entries to prevent memory issues (keep last 100 entries)
        const logEntries = logContainer.querySelectorAll('.log-entry');
        if (logEntries.length > 100) {
            logEntries[0].remove();
        }
    }

    /**
     * Translation-aware log entry. Stores the structured key + args so the host can
     * broadcast it to guests, who then translate locally with their own language.
     *
     * @param {string} key       - i18n translation key (e.g. "log.gameStarted")
     * @param {Array}  args      - Array of arguments to substitute into the translation
     * @param {string} category  - Log category for CSS styling (default: 'system')
     * @param {object} player    - Optional player whose color tints the entry border
     */
    /**
     * Internal: convert a log entry argument into a display string in the current language.
     * Handles player markers and translation-key markers specially.
     */
    _resolveLogArg(a) {
        if (a == null) return '';
        if (Array.isArray(a)) {
            // Resolve each element and join with ", "
            return a.map((x) => this._resolveLogArg(x)).join(', ');
        }
        if (typeof a === 'object') {
            if (a.__player__) {
                return this.getPlayerDisplayName({ name: a.name });
            }
            if (a.__t__) {
                const innerArgs = (a.args || []).map((x) => this._resolveLogArg(x));
                return t.apply(null, [a.__t__].concat(innerArgs));
            }
            // Player-like object with .id and .name (host's local call site)
            if (typeof a.id === 'number' && typeof a.name === 'string') {
                return this.getPlayerDisplayName(a);
            }
        }
        return a;
    }

    /**
     * Construct a translation-key marker that addLogEntryT/logBattleActionT can embed
     * inside the args array, so the receiver translates it locally.
     */
    tArg(key, ...innerArgs) {
        return { __t__: key, args: innerArgs };
    }

    addLogEntryT(key, args, category = 'system', player = null) {
        if (!Array.isArray(args)) args = [];

        // Resolve special markers in args FIRST so the local render uses translated text too
        const resolvedArgs = args.map((a) => this._resolveLogArg(a));

        // Translate locally for immediate display on this client
        const localText = t.apply(null, [key].concat(resolvedArgs));
        this.addLogEntry(localText, category, player);

        // Store a serializable version of args for network sync
        const argsForNet = args.map(function (a) {
            if (a && typeof a === 'object' && typeof a.id === 'number' && typeof a.name === 'string') {
                return { __player__: true, name: a.name };
            }
            return a;
        });

        if (!this.structuredLog) this.structuredLog = [];
        this.structuredLog.push({
            key: key,
            args: argsForNet,
            category: category,
            playerId: player && typeof player.id === 'number' ? player.id : -1,
            playerColor: player && player.color && player.color.background ? player.color.background : null
        });
        // Keep last 50 (twice what we broadcast, so we have headroom)
        if (this.structuredLog.length > 50) {
            this.structuredLog.shift();
        }
    }

    /**
     * Render a structured log entry on the local client. Used by guests when they
     * receive the host's structured log queue. Translates the key in the local language.
     */
    renderStructuredLogEntry(entry) {
        if (this.isAutomatedMode) return;
        const logContainer = document.getElementById('game-log');
        if (!logContainer) return;

        let text;
        if (entry.key === '__battleT__') {
            // Battle log wrapper: args = [innerKey, innerArgsArray]
            const innerKey = entry.args[0];
            const innerArgs = (entry.args[1] || []).map((a) => this._resolveLogArg(a));
            const innerText = t.apply(null, [innerKey].concat(innerArgs));
            text = '⚔️ ' + innerText;
        } else {
            // Resolve special markers in each arg into local-language strings
            const args = (entry.args || []).map((a) => this._resolveLogArg(a));
            text = t.apply(null, [entry.key].concat(args));
        }

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${entry.category || 'system'}`;
        logEntry.innerHTML = text;
        if (entry.playerColor) {
            logEntry.style.setProperty('border-left-color', entry.playerColor, 'important');
        } else {
            logEntry.style.setProperty('border-left-color', 'white', 'important');
        }
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        const logEntries = logContainer.querySelectorAll('.log-entry');
        if (logEntries.length > 100) {
            logEntries[0].remove();
        }
    }
    
    clearGameLog() {
        const logContainer = document.getElementById('game-log');
        if (logContainer) {
            logContainer.innerHTML = '<div class="log-entry">Game log cleared.</div>';
        }
    }
    
    showGameLog() {
        const logSection = document.getElementById('game-log-section');
        if (logSection) {
            logSection.style.display = 'flex';
        }
    }
    
    hideGameLog() {
        const logSection = document.getElementById('game-log-section');
        if (logSection) {
            logSection.style.display = 'none';
        }
    }
    
    getEffectDescription(effect) {
        const effects = {
            'gain_1_energy': 'Gain 1 beer (same as Beer location)',
            'gain_1_blood': 'Gain 1 blood bag (same as Hospital location)',
            'reduce_1_monster_hp': 'Reduce monster HP by 1 in combat',
            'reduce_2_monster_hp': 'Reduce monster HP by 2 in combat',
            'reduce_3_monster_hp': 'Reduce monster HP by 3 in combat',
            'bonus_points_on_kill': 'When defeating monster, gain points equal to its level'
        };
        return effects[effect] || 'Unknown effect';
    }
    
    getInventorySize(player) {
        return player.inventory.reduce((total, item) => total + item.size, 0);
    }
    
    buyItem(itemIndex) {
        const player = this.players[this.currentStorePlayer];
        const item = this.storeItems[itemIndex];
        
        if (player.resources.money < item.price) {
            alert(t('alert.notEnoughMoney', player.name));
            return;
        }
        
        // Check if buying this item would exceed capacity
        const currentInventorySize = this.getInventorySize(player);
        const newTotalSize = currentInventorySize + item.size;
        const capacity = player.maxInventoryCapacity;
        
        if (newTotalSize > capacity) {
            const overflow = newTotalSize - capacity;
            const confirmed = confirm(
                `⚠️ Capacity Warning ⚠️\n\n` +
                `${player.name}, buying ${item.name} (size ${item.size}) will exceed your capacity!\n\n` +
                `Current inventory: ${currentInventorySize}/${capacity}\n` +
                `After purchase: ${newTotalSize}/${capacity} (${overflow} over capacity)\n\n` +
                `You'll need to remove items after shopping to fit within capacity.\n\n` +
                `Do you still want to buy this item?`
            );
            
            if (!confirmed) {
                return; // Player decided not to buy
            }
        }
        
        // Deduct money and add item to inventory
        player.resources.money -= item.price;
        const newItem = {...item};

        player.inventory.push(newItem);
        
        // Update display
        this.showStore();
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        
        // alert(`${player.name} bought ${item.name}!`); // Removed popup as requested
    }
    
    buyStoreItem(itemName, price, size) {
        // In online mode as guest, send purchase action to host
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'purchase',
                playerId: this.localPlayerId,
                data: { itemName }
            });
            return;
        }

        // In simultaneous/online-host mode, the human player is the one buying
        // In turn-based mode, use currentStorePlayer
        const player = (this.gameMode === 'simultaneous' || this.gameMode === 'online')
            ? this.players.find(p => p.id === this.localPlayerId) || this.players.find(p => !p.isBot)
            : this.players[this.currentStorePlayer];
        
        if (player.resources.money < price) {
            alert(t('alert.notEnoughMoney', player.name));
            return;
        }
        
        // Special check for bullets and batteries
        if (itemName === 'Bullet') {
            const bulletCount = player.inventory.filter(inv => inv.name === 'Bullet').length;
            if (bulletCount >= 6) {
                alert(t('store.maxBulletsReached', player.name));
                return;
            }
        } else if (itemName === 'Battery') {
            const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
            if (batteryCount >= 6) {
                alert(t('store.maxBatteriesReached', player.name));
                return;
            }
        }
        
        // Note: Capacity warnings are shown beneath each item in the store UI
        // Players can buy items that exceed capacity, they'll be prompted to manage overflow after shopping

        // Create item object
        const item = {
            name: itemName,
            size: size,
            price: price,
            effect: itemName === 'Bullet' ? 'rifle_ammo' : itemName === 'Battery' ? 'plasma_power' : 'unknown',
            icon: itemName === 'Bullet' ? '🔫' : itemName === 'Battery' ? '🔋' : '❓'
        };

        // Deduct money and add item to inventory
        player.resources.money -= price;
        player.inventory.push(item);
        
        // Update display
        if (this.gameMode === 'simultaneous' || this.gameMode === 'online') {
            this.showStoreForPlayer(player);
        } else {
            this.showStore();
        }
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });

        // Update bullet displays for all players
        this.players.forEach(player => {
            this.updateBulletDisplay(player.id);
        });

        // Update Forest button if buying ammunition for current player
        if (this.currentStorePlayer === this.currentPlayer?.id &&
            (itemName === 'Bullet' || itemName === 'Battery')) {
            this.updateForestButtonStatus();
        }

        // Update battery displays for all players
        this.players.forEach(player => {
            this.updateBatteryDisplay(player.id);
        });

        // Log the purchase
        const itemKeyMap = { 'Beer': 'item.beer.name', 'Blood Bag': 'item.bloodBag.name', 'Grenade': 'item.grenade.name', 'Bomb': 'item.bomb.name', 'Dynamite': 'item.dynamite.name', 'Fake Blood': 'item.fakeBlood.name', 'Bullet': 'item.bullet.name', 'Battery': 'item.battery.name' };
        const itemArg = itemKeyMap[itemName] ? this.tArg(itemKeyMap[itemName]) : itemName;
        this.addLogEntryT(
            'log.boughtItem',
            [player, itemArg, price],
            'store-purchase',
            player
        );

        // Refresh the store display to update capacity warnings and money
        if (this.gameMode === 'simultaneous' || this.gameMode === 'online') {
            this.showStoreForPlayer(player);
        } else {
            this.showStore();
        }

        // Online host: push updated state so all players see the purchase
        if (this.gameMode === 'online' && this.isHost) {
            this.pushOnlineBoardUpdate();
        }
    }
    
    finishShopping() {
        if (this.gameMode === 'online') {
            this.finishShoppingOnline();
        } else if (this.gameMode === 'simultaneous') {
            this.finishShoppingSimultaneous();
        } else {
            this.finishShoppingTurnBased();
        }
    }

    finishShoppingSimultaneous() {
        // Mark the human player as complete
        const humanPlayer = this.players.find(p => !p.isBot);
        if (humanPlayer) {
            this.updatePlayerStatus(humanPlayer.id, true);
        }

        // Hide store area immediately when human finishes (regardless of bot completion)
        if (!this.isAutomatedMode) {
            document.getElementById('store-area').style.display = 'none';
        }

        // Trigger centralized completion check
        this.checkStorePhaseCompletion();
    }

    checkStorePhaseCompletion() {
        // Guard: Only check once
        if (this.storePhaseCompleted) {
            return; // Already processed
        }

        // Check if all players are complete
        if (this.checkAllPlayersComplete()) {
            // Set flag to prevent duplicate execution
            this.storePhaseCompleted = true;

            console.log('All players completed shopping');
            this.hidePlayerStatusIndicators();

            if (this.gameMode === 'online' && this.isHost) {
                this.onlineStoreComplete();
            } else {
                // Proceed to capacity overflow check
                this.checkCapacityOverflow();
            }
        }
    }

    finishShoppingTurnBased() {
        // Mark current player as complete
        this.updatePlayerStatus(this.players[this.currentStorePlayer].id, true);

        this.currentStorePlayer++;

        if (this.currentStorePlayer >= this.players.length) {
            // All players finished shopping, hide store area
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] All players finished shopping, checking capacity overflow`);
            } else {
                document.getElementById('store-area').style.display = 'none';
            }

            this.hidePlayerStatusIndicators();

            // Check for capacity overflow
            this.checkCapacityOverflow();
        } else {
            // Next player's turn to shop
            this.showStore();
            this.refreshAllPlayerButtonStates();
        }
    }
    
    checkCapacityOverflow() {
        // Ensure store area is hidden (it should already be hidden by finishShopping)
        if (!this.isAutomatedMode) {
            const storeArea = document.getElementById('store-area');
            if (storeArea) {
                storeArea.style.display = 'none';
            }
        }

        let playersWithOverflow = [];

        this.players.forEach(player => {
            if (this.getInventorySize(player) > player.maxInventoryCapacity) {
                // If player is a bot, handle overflow automatically
                if (player.isBot) {
                    const botPlayer = new BotPlayer(player.id, player.weapon);
                    botPlayer.handleBotCapacityOverflow(player, this);

                    // Update displays after bot handles overflow
                    this.updateResourceDisplay();
                    this.updateInventoryDisplayOld();
                    this.updateInventoryDisplay(player.id);
                } else {
                    // Human players need manual overflow handling
                    playersWithOverflow.push(player.id);
                }
            }
        });

        if (playersWithOverflow.length > 0) {
            this.handleCapacityOverflow(playersWithOverflow);
        } else {
            // After capacity check, check forest readiness before battle
            this.checkForestReadiness();
        }
    }
    
    startResourceDistribution() {
        this.roundPhase = 'distribution';

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting resource distribution - Round ${this.currentRound}`);
        }

        // Clear the board (but not dummy tokens)
        if (!this.isAutomatedMode) {
            document.querySelectorAll('.token:not(.dummy-token)').forEach(token => token.remove());
        }

        // Place all tokens based on selections
        this.players.forEach(player => {
            // Place hunter
            if (player.selectedCards.hunter) {
                this.placeToken(player.id, 'hunter', player.selectedCards.hunter);
            }

            // Place apprentice
            if (player.selectedCards.apprentice) {
                this.placeToken(player.id, 'apprentice', player.selectedCards.apprentice);
            }
        });

        // Clear and populate forest players for this round (must be done AFTER placing tokens)
        this.forestPlayersThisRound.clear();
        this.players.forEach(player => {
            if (player.tokens.hunter === 7) { // Forest is location 7
                this.forestPlayersThisRound.add(player.id);
            }
        });
        
        // Track hunter alone and apprentice with hunters statistics
        this.locations.forEach(location => {
            // Count hunters at this location
            let huntersAtLocation = [];
            let apprenticesAtLocation = [];

            this.players.forEach(player => {
                if (player.tokens.hunter === location.id) {
                    huntersAtLocation.push(player);
                }
                if (player.tokens.apprentice === location.id) {
                    apprenticesAtLocation.push(player);
                }
            });

            // Track hunter alone count (only 1 hunter, no other tokens including dummies)
            if (huntersAtLocation.length === 1) {
                const totalTokens = huntersAtLocation.length + apprenticesAtLocation.length +
                                   (this.dummyTokens.includes(location.id) ? 1 : 0);
                if (totalTokens === 1) {
                    huntersAtLocation[0].hunterAloneCount++;
                }
            }

            // Track apprentice with hunters count
            if (huntersAtLocation.length > 0) {
                apprenticesAtLocation.forEach(player => {
                    // Check if there's at least one OTHER player's hunter at this location
                    const hasOtherHunters = huntersAtLocation.some(h => h.id !== player.id);
                    if (hasOtherHunters) {
                        player.apprenticeWithHuntersCount++;
                    }
                });
            }
        });

        // Update popularity track based on hunter placement
        this.updatePopularityTrack();

        // Ensure dummy tokens are displayed
        this.updateDummyTokenDisplay();

        // Distribute resources for all locations except Forest
        this.distributeNormalResources();
    }
    
    distributeNormalResources() {
        // Count tokens at each location (excluding Forest and Station)
        this.locations.forEach(location => {
            if (location.id === 3 || location.id === 7) return; // Skip Station and Forest
            
            if (!location.resource || location.rewards.length === 0) return;
            
            // Count hunters and total tokens at this location
            let hunterCount = 0;
            let totalCount = 0;
            
            this.players.forEach(player => {
                if (player.tokens.hunter === location.id) {
                    hunterCount++;
                    totalCount++;
                }
                if (player.tokens.apprentice === location.id) {
                    totalCount++;
                }
            });
            
            // Add dummy tokens to total count
            if (this.dummyTokens.includes(location.id)) {
                totalCount++;
            }
            
            if (hunterCount === 0) return; // No hunters, no resources
            
            // Determine reward amount based on total count (including dummy tokens) and player count
            const rewardAmount = this.getRewardAmount(location, totalCount);
            console.log(`Normal resource distribution: Location ${location.id} (${location.name})`);
            console.log(`  - Player count: ${this.playerCount}`);
            console.log(`  - Total tokens (incl. dummy): ${totalCount}`);
            console.log(`  - Location rewards array: [${location.rewards}]`);
            console.log(`  - Calculated reward amount: ${rewardAmount}`);
            
            // Distribute resources to hunters only
            this.players.forEach(player => {
                if (player.tokens.hunter === location.id) {
                    const playerType = player.isBot ? ' (Bot)' : '';
                    let resourceName = '';

                    const locKey = 'location.' + ({1:'workSite',2:'bar',3:'station',4:'hospital',5:'dojo',6:'plaza',7:'forest'}[location.id] || 'workSite');
                    if (location.resource === 'money' || location.resource === 'exp') {
                        this.modifyResource(player.id, location.resource, rewardAmount);
                        const resourceKey = location.resource === 'money' ? 'common.money' : 'common.exp';
                        this.addLogEntryT(
                            'log.receivedFromLocation',
                            [player, rewardAmount, this.tArg(resourceKey), this.tArg(locKey)],
                            'resource-gain',
                            player
                        );
                    } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                        player.resources[location.resource] += rewardAmount;
                        // Also add items to inventory
                        const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                        this.addItemToInventory(player.id, itemName, rewardAmount);
                        const itemKey = location.resource === 'beer' ? 'item.beer.name' : 'item.bloodBag.name';
                        this.addLogEntryT(
                            'log.receivedFromLocation',
                            [player, rewardAmount, this.tArg(itemKey), this.tArg(locKey)],
                            'resource-gain',
                            player
                        );
                    } else if (location.resource === 'score') {
                        // Plaza scoring: 3 points if alone, 0 if crowded
                        this.addScore(player.id, rewardAmount, 'plaza');
                        if (rewardAmount > 0) {
                            this.addLogEntryT(
                                'log.receivedFromLocation',
                                [player, rewardAmount, this.tArg('common.points'), this.tArg(locKey)],
                                'resource-gain',
                                player
                            );
                        }
                    }
                }
            });

            // Bat Level 1 Power: Apprentice gets +1 resource when sharing location with other hunters
            // Check for apprentices with Bat weapon at this location
            this.players.forEach(player => {
                if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 1 &&
                    player.tokens.apprentice === location.id && totalCount > 1) {

                    // Check if there's at least one other player's hunter at this location
                    let hasOtherHunter = false;
                    this.players.forEach(otherPlayer => {
                        if (otherPlayer.id !== player.id && otherPlayer.tokens.hunter === location.id) {
                            hasOtherHunter = true;
                        }
                    });

                    if (hasOtherHunter) {
                        // Give +1 resource of this location type
                        if (location.resource === 'money' || location.resource === 'exp') {
                            this.modifyResource(player.id, location.resource, 1);
                            const resourceKey = location.resource === 'money' ? 'common.money' : 'common.exp';
                            this.addLogEntryT(
                                'log.batLv1Apprentice',
                                [player, this.tArg(resourceKey)],
                                'resource-gain',
                                player
                            );
                        } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                            player.resources[location.resource] += 1;
                            const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                            this.addItemToInventory(player.id, itemName, 1);
                            const itemKey = location.resource === 'beer' ? 'item.beer.name' : 'item.bloodBag.name';
                            this.addLogEntryT(
                                'log.batLv1Apprentice',
                                [player, this.tArg(itemKey)],
                                'resource-gain',
                                player
                            );
                        }
                    }
                }
            });
        });
        
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        
        // Now handle Station choices
        this.handleStationChoices();
    }
    
    handleStationChoices() {
        // Check if anyone is at the station
        let stationHunters = [];
        let stationTotalCount = 0;
        
        this.players.forEach(player => {
            if (player.tokens.hunter === 3) { // Station is location id 3
                stationHunters.push(player.id);
                stationTotalCount++;
            }
            if (player.tokens.apprentice === 3) {
                stationTotalCount++;
            }
        });
        
        this.stationTotalCount = stationTotalCount;
        
        if (stationHunters.length > 0) {
            this.pendingStationPlayers = [...stationHunters];
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] Found ${stationHunters.length} station hunters, showing modal`);
            }
            // In online mode, station phase is handled by pushStateAfterDistribution/processOnlineStationPhase
            if (this.gameMode !== 'online') {
                this.showStationModal();
            }
        } else {
            // No station choices needed, go to store phase
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] No station players, going directly to store phase`);
            }
            if (this.gameMode !== 'online') {
                this.enterStorePhase();
            }
        }
    }

    checkForestReadiness() {
        // After store phase, before battle phase - check if Forest hunters have sufficient resources
        let forestHunters = this.players.filter(p => p.tokens.hunter === 7);

        if (forestHunters.length === 0) {
            this.startBattlePhase();
            return;
        }

        // Initialize queue and failed players tracking
        this.forestReadinessQueue = forestHunters.map(p => p.id);
        if (!this.failedForestPlayers) {
            this.failedForestPlayers = [];
        }

        // Start checking hunters one by one
        this.checkNextForestHunter();
    }

    checkNextForestHunter() {
        // Check if queue is empty
        if (this.forestReadinessQueue.length === 0) {
            this.startBattlePhase();
            return;
        }

        const playerId = this.forestReadinessQueue[0];
        const player = this.players.find(p => p.id === playerId);

        // Check Condition 1: Ammunition for Rifle/Plasma
        const lacksAmmo = (player.weapon.name === 'Rifle' && !player.inventory.some(i => i.name === 'Bullet')) ||
                         (player.weapon.name === 'Plasma' && !player.inventory.some(i => i.name === 'Battery'));

        // Check if player has combat items (can attack even without ammunition)
        const hasCombatItems = player.inventory.some(i =>
            i.name === 'Grenade' || i.name === 'Bomb' || i.name === 'Dynamite'
        );

        // Rifle/Plasma without ammo can still fight if they have combat items
        // Only truly stuck if no ammo AND no combat items
        const cannotAttack = lacksAmmo && !hasCombatItems;

        // Check Condition 2: Total EP (current EP + beers) < 2
        const beerCount = player.inventory.filter(i => i.name === 'Beer').length;
        const lacksEP = player.resources.ep + beerCount < 2;

        // Check conditions and take appropriate action
        if (cannotAttack || lacksEP) {
            // In online mode, handle remote players differently
            if (this.gameMode === 'online' && this.isHost && player.id !== this.localPlayerId && !player.isBot) {
                // Remote human player failed - auto-handle on host, push failure to guest
                this.failedForestPlayers.push(player.id);
                this.forestReadinessQueue.shift();

                // Determine failure message
                let message = '';
                if (cannotAttack && lacksEP) {
                    message = 'You had failed to fight the monster due to lack of EP and no way to attack (no ammunition or combat items).';
                } else if (cannotAttack) {
                    message = 'You had failed to fight the monster due to no way to attack (no ammunition or combat items).';
                } else {
                    message = 'You had failed to fight the monster due to lack of EP.';
                }

                // Push failure notification to guest
                const state = this.serializeGameState();
                state.roundPhase = 'battle';
                state.forestFailure = {
                    playerId: player.id,
                    message: message
                };
                this.onlineManager.pushGameState(state);

                const reasonKey = cannotAttack && lacksEP ? 'forest.failureReasonBoth' : (cannotAttack ? 'forest.failureReasonAttack' : 'forest.failureReasonEP');
                this.addLogEntryT('forest.failureLog', [player, this.tArg(reasonKey)], 'warning', player);

                // Continue to next hunter
                this.checkNextForestHunter();
            } else if (cannotAttack && lacksEP) {
                this.showForestFailureModal(player, true, true);
            } else if (cannotAttack) {
                this.showForestFailureModal(player, true, false);
            } else {
                this.showForestFailureModal(player, false, true);
            }
        } else {
            // Player is ready for battle
            this.forestReadinessQueue.shift();
            this.checkNextForestHunter();
        }
    }

    showForestFailureModal(player, cannotAttack, lacksEP) {
        // Determine message based on which conditions failed
        let message = '';
        if (cannotAttack && lacksEP) {
            message = t('forest.failureBoth');
        } else if (cannotAttack) {
            message = t('forest.failureAttackOnly');
        } else {
            message = t('forest.failureEPOnly');
        }

        // Store current player
        this.currentFailurePlayer = player.id;

        // Show modal
        document.getElementById('forest-failure-message').textContent = message;
        document.getElementById('forest-failure-modal').style.display = 'flex';
    }

    acknowledgeForestFailure() {
        // Hide modal
        document.getElementById('forest-failure-modal').style.display = 'none';

        // Guest: just dismiss the modal, host already handled the game logic
        if (this.gameMode === 'online' && !this.isHost) {
            return;
        }

        // Add player to failed list
        this.failedForestPlayers.push(this.currentFailurePlayer);

        // Move to next hunter
        this.forestReadinessQueue.shift();

        // Continue checking remaining hunters
        this.checkNextForestHunter();
    }

    startBattlePhase() {
        if (this.gameMode === 'online' && this.isHost) {
            this.startBattlePhaseOnline();
            return;
        }

        this.roundPhase = 'battle';

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting battle phase - Round ${this.currentRound}`);
        }

        // Track all Forest players (including failed ones) for monster effects
        this.forestPlayersThisRound = new Set();
        this.players.forEach(player => {
            if (player.tokens.hunter === 7) {
                this.forestPlayersThisRound.add(player.id);
            }
        });

        // Get hunters who will actually battle (excluding failed ones)
        let forestHunters = [];
        this.players.forEach(player => {
            if (player.tokens.hunter === 7 && !this.failedForestPlayers.includes(player.id)) {
                forestHunters.push(player.id);
            }
        });

        if (forestHunters.length > 0) {
            // Show battle phase panel
            if (!this.isAutomatedMode) {
                this.showPlayerStatusIndicators(true);
            }

            // Sort forest hunters by score (lowest first), then by weapon priority (lowest first)
            forestHunters.sort((a, b) => {
                const playerA = this.players.find(p => p.id === a);
                const playerB = this.players.find(p => p.id === b);
                
                // First sort by score (lowest first)
                if (playerA.score !== playerB.score) {
                    return playerA.score - playerB.score;
                }
                
                // If scores are equal, sort by weapon priority (lowest first)
                return playerA.weapon.priority - playerB.weapon.priority;
            });
            
            console.log('Forest battle order:', forestHunters.map(id => {
                const player = this.players.find(p => p.id === id);
                return `Player ${id} (Score: ${player.score}, Weapon: ${player.weapon.name}, Priority: ${player.weapon.priority})`;
            }));
            
            // Start forest battles
            this.handleForestEncounters(forestHunters);
        } else {
            // No battles, end round
            this.endRound();
        }
    }
    
    endRound() {
        // Hide battle phase panel
        this.hidePlayerStatusIndicators();

        // Route to online version if in online mode
        if (this.gameMode === 'online' && this.isHost) {
            this.endRoundOnline();
            return;
        }

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Ending round ${this.currentRound}, checking win condition`);
        }
        
        // Check for win condition before starting next round
        const hasWinner = this.checkWinCondition();
        if (hasWinner) {
            const winner = this.determineWinner();
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] Winner found: ${winner.name} with ${winner.score} points`);
            }
            this.endGame(winner);
            return;
        }
        
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] No winner yet, starting next round phase`);
        }
        
        // Start NextRound phase
        this.startNextRoundPhase();
    }
    
    checkWinCondition() {
        // Check if any player has reached 50 points to trigger end of game
        // But don't determine winner yet - that happens at end of round
        const hasWinner = this.players.some(player => player.score >= 50);
        return hasWinner;
    }

    determineWinner() {
        // Use the same ranking logic to determine the actual winner
        const rankings = this.calculatePlayerRankings();
        
        // Find the player(s) with rank 1
        const winners = this.players.filter(player => rankings[player.id] === 1);
        
        // Return the first winner (in case of ties, they all share rank 1)
        return winners[0];
    }
    
    calculatePlayerRankings() {
        // Calculate rankings based on score first, then level as tiebreaker
        const playersCopy = [...this.players];
        
        // Sort players by score (descending), then by level (descending)
        playersCopy.sort((a, b) => {
            if (a.score !== b.score) {
                return b.score - a.score; // Higher score wins
            }
            // Tiebreaker: higher level wins
            return b.popularityTrack.pointToken - a.popularityTrack.pointToken;
        });
        
        // Assign ranks, handling ties
        const rankings = {};
        let currentRank = 1;
        
        for (let i = 0; i < playersCopy.length; i++) {
            const player = playersCopy[i];
            
            if (i > 0) {
                const prevPlayer = playersCopy[i - 1];
                // Check if tied with previous player
                if (player.score !== prevPlayer.score || 
                    player.popularityTrack.pointToken !== prevPlayer.popularityTrack.pointToken) {
                    currentRank = i + 1; // New rank
                }
                // If tied, keep same rank as previous player
            }
            
            rankings[player.id] = currentRank;
        }
        
        return rankings;
    }

    recordGameData() {
        // Calculate player rankings
        const rankings = this.calculatePlayerRankings();
        
        // Collect game data for CSV export
        const gameData = [];
        
        this.players.forEach(player => {
            const data = {
                game_id: this.currentGameId || Date.now(),
                player_count: this.playerCount,
                rounds: this.currentRound,
                player_id: player.id + 1,
                weapon: player.weapon.name,
                level: player.popularityTrack.pointToken,
                score: player.score,
                rank: rankings[player.id],
                weapon_track_pos: player.weapon.powerTrackPosition,
                defeated_lv1: player.monstersDefeated ? player.monstersDefeated.level1 || 0 : 0,
                defeated_lv2: player.monstersDefeated ? player.monstersDefeated.level2 || 0 : 0,
                defeated_lv3: player.monstersDefeated ? player.monstersDefeated.level3 || 0 : 0,
                score_monsters: player.scoreFromMonsters,
                score_milestones: player.scoreFromMilestones,
                score_popularity: player.scoreFromPopularity,
                score_plaza: player.scoreFromPlaza,
                score_fakeblood: player.scoreFromFakeBlood,
                score_other: player.scoreFromOther
            };
            gameData.push(data);
        });
        
        return gameData;
    }
    
    exportToCSV(allGameData) {
        // Convert data to CSV format
        const headers = [
            'game_id', 'player_count', 'rounds', 'player_id', 'weapon', 'level', 'score', 'rank',
            'weapon_track_pos', 'defeated_lv1', 'defeated_lv2', 'defeated_lv3',
            'score_monsters', 'score_milestones', 'score_popularity', 'score_plaza',
            'score_fakeblood', 'score_other'
        ];
        
        let csv = headers.join(',') + '\n';
        
        allGameData.forEach(row => {
            const values = headers.map(header => row[header] || 0);
            csv += values.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        link.download = `game_data_${timestamp}.csv`;
        link.href = url;
        link.click();
        window.URL.revokeObjectURL(url);
    }
    
    getDelay(normalDelay) {
        // Return 0 delay when in automated mode, otherwise use normal delay
        const delay = this.isAutomatedMode ? 0 : normalDelay;
        if (this.isAutomatedMode && delay !== normalDelay) {
            console.log(`[${new Date().toISOString()}] Skipping ${normalDelay}ms delay in automated mode`);
        }
        return delay;
    }
    
    showDataCollectionModal() {
        console.log('[DEBUG] showDataCollectionModal called');
        const modal = document.getElementById('data-collection-modal');
        if (modal) {
            console.log('[DEBUG] Modal found, showing it');
            modal.style.display = 'block';
        } else {
            console.log('[DEBUG] Modal not found!');
        }
    }
    
    hideDataCollectionModal() {
        const modal = document.getElementById('data-collection-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    startDataCollection() {
        console.log('[DEBUG] startDataCollection called');
        const numGamesInput = document.getElementById('num-games');
        const playerCountSelect = document.getElementById('player-count-select');
        
        const numberOfGames = parseInt(numGamesInput.value) || 10;
        const playerCount = parseInt(playerCountSelect.value) || 2;
        
        console.log(`[DEBUG] Values: games=${numberOfGames}, players=${playerCount}`);
        console.log(`[${new Date().toISOString()}] Starting data collection: ${numberOfGames} games with ${playerCount} players`);
        
        // Completely reset game state to ensure no interference
        this.resetGameState();
        
        // Hide the modal
        this.hideDataCollectionModal();

        // Show the running overlay
        const overlay = document.getElementById('data-collection-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        // Hide any game UI that might be visible
        const playerBoards = document.getElementById('player-boards-container');
        const gameBoard = document.querySelector('.game-board');
        const playerArea = document.querySelector('.player-area');
        const gameStatus = document.querySelector('.game-status');
        const gameLog = document.getElementById('game-log-section');
        
        if (playerBoards) playerBoards.style.display = 'none';
        if (gameBoard) gameBoard.style.display = 'none';
        if (playerArea) playerArea.style.display = 'none';
        if (gameStatus) gameStatus.style.display = 'none';
        if (gameLog) gameLog.style.display = 'none';
        
        // Disable Local Play button during data collection
        const localPlayBtn = document.querySelector('.local-play-btn');
        if (localPlayBtn) localPlayBtn.disabled = true;

        // Start automated games
        this.runAutomatedGames(numberOfGames, playerCount);
    }
    
    runAutomatedGames(numberOfGames, playerCount) {
        // Initialize automation
        this.isAutomatedMode = true;
        this.isDataCollectionMode = true;
        this.automatedGamesTotal = numberOfGames;
        this.automatedGamesCompleted = 0;
        this.automatedPlayerCount = playerCount;
        this.collectedGameData = [];
        
        console.log(`Starting automated data collection: ${numberOfGames} games with ${playerCount} players`);
        this.updateDataCollectionProgress();
        
        // Start the first game
        this.startNextAutomatedGame();
    }
    
    startNextAutomatedGame() {
        if (this.automatedGamesCompleted >= this.automatedGamesTotal) {
            // All games completed, export data
            this.finishDataCollection();
            return;
        }
        
        try {
            // Reset game state for new game
            this.resetGameState();
            
            // Generate unique game ID
            this.currentGameId = `game_${this.automatedGamesCompleted + 1}_${Date.now()}`;
            
            console.log(`[AUTO] Starting game ${this.automatedGamesCompleted + 1} of ${this.automatedGamesTotal}`);
            
            // Create all bot configuration
            const botConfiguration = {
                humanPlayers: 0,
                totalPlayers: this.automatedPlayerCount
            };
            
            // Start the game with all bots
            this.startSoloGameWithConfig(botConfiguration);
        } catch (error) {
            console.error(`[AUTO] Error in game ${this.automatedGamesCompleted + 1}:`, error);
            // Try to continue with next game
            this.automatedGamesCompleted++;
            setTimeout(() => this.startNextAutomatedGame(), 100);
        }
    }
    
    resetGameState() {
        // Clear existing game state
        this.players = [];
        this.bots = [];
        this.dummyTokens = [];
        this.currentPlayerIndex = 0;
        this.currentRound = 1;
        this.roundPhase = 'setup';
        this.stationChoices = {};
        this.pendingStationPlayer = null;
        this.stationTotalCount = 0;
        this.currentBattle = null;
        this.currentStorePlayer = null;
        
        // Clear UI if not in fully automated mode
        if (!this.isAutomatedMode) {
            document.getElementById('player-boards-container').innerHTML = '';
            document.querySelectorAll('.token').forEach(token => token.remove());
        }
    }
    
    stopDataCollection() {
        if (!this.isAutomatedMode) return;
        this.automatedGamesTotal = this.automatedGamesCompleted;
    }

    finishDataCollection() {
        console.log(`[${new Date().toISOString()}] Data collection complete! Collected data from ${this.automatedGamesCompleted} games`);

        // Reset automation flags
        this.isAutomatedMode = false;
        this.isDataCollectionMode = false;

        // Reset game state completely
        this.resetGameState();

        // Update UI
        this.updateDataCollectionProgress();

        // Show completion message
        const statusElement = document.getElementById('data-collection-status');
        if (statusElement) {
            statusElement.textContent = `✅ Data collection complete! ${this.automatedGamesCompleted} games recorded.`;
        }

        // Re-enable Local Play button
        const localPlayBtn = document.querySelector('.local-play-btn');
        if (localPlayBtn) localPlayBtn.disabled = false;

        // Show results on the overlay
        this.showDataCollectionResults();
    }

    showDataCollectionResults() {
        // Aggregate data by weapon
        const weaponStats = {};
        for (const entry of this.collectedGameData) {
            const w = entry.weapon;
            if (!weaponStats[w]) {
                weaponStats[w] = { picks: 0, wins: 0 };
            }
            weaponStats[w].picks++;
            if (entry.rank === 1) {
                weaponStats[w].wins++;
            }
        }

        // Sort by picks descending
        const sorted = Object.entries(weaponStats).sort((a, b) => b[1].picks - a[1].picks);

        // Build table HTML
        let html = '<table><thead><tr><th>Weapon</th><th>Picks</th><th>Wins</th><th>Win Rate</th></tr></thead><tbody>';
        for (const [weapon, stats] of sorted) {
            const winRate = ((stats.wins / stats.picks) * 100).toFixed(1);
            html += `<tr><td>${weapon}</td><td>${stats.picks}</td><td>${stats.wins}</td><td>${winRate}%</td></tr>`;
        }
        html += '</tbody></table>';

        // Inject into results container
        const resultsContent = document.getElementById('dc-overlay-results-content');
        if (resultsContent) resultsContent.innerHTML = html;

        // Hide progress elements, show results
        const progressText = document.getElementById('dc-overlay-progress-text');
        const progressBarContainer = progressText ? progressText.nextElementSibling : null;
        const stopBtn = document.querySelector('.dc-overlay-stop-btn');
        if (progressText) progressText.style.display = 'none';
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';

        const resultsDiv = document.getElementById('dc-overlay-results');
        if (resultsDiv) resultsDiv.style.display = 'block';

        // Update title
        const title = document.querySelector('.data-collection-overlay-content h2');
        if (title) title.textContent = t('dataCollection.results');
    }

    closeDataCollectionOverlay() {
        // Hide overlay
        const overlay = document.getElementById('data-collection-overlay');
        if (overlay) overlay.style.display = 'none';

        // Reset overlay back to progress view for next run
        const progressText = document.getElementById('dc-overlay-progress-text');
        const progressBarContainer = progressText ? progressText.nextElementSibling : null;
        const stopBtn = document.querySelector('.dc-overlay-stop-btn');
        if (progressText) progressText.style.display = 'block';
        if (progressBarContainer) progressBarContainer.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'block';

        const resultsDiv = document.getElementById('dc-overlay-results');
        if (resultsDiv) resultsDiv.style.display = 'none';

        const title = document.querySelector('.data-collection-overlay-content h2');
        if (title) title.textContent = t('dataCollection.running');

        // Show the data collection modal
        this.showDataCollectionModal();
    }
    
    updateDataCollectionProgress() {
        const progressElement = document.getElementById('data-collection-progress');
        if (progressElement) {
            if (this.isAutomatedMode) {
                progressElement.style.display = 'block';
                progressElement.textContent = t('dataCollection.runningGame', this.automatedGamesCompleted + 1, this.automatedGamesTotal);
            } else {
                progressElement.style.display = 'none';
            }
        }

        // Update the overlay
        const overlayText = document.getElementById('dc-overlay-progress-text');
        const overlayBar = document.getElementById('dc-overlay-progress-bar');
        if (overlayText && this.isAutomatedMode) {
            overlayText.textContent = t('dataCollection.runningGame', this.automatedGamesCompleted + 1, this.automatedGamesTotal);
        }
        if (overlayBar && this.automatedGamesTotal > 0) {
            const pct = (this.automatedGamesCompleted / this.automatedGamesTotal) * 100;
            overlayBar.style.width = `${pct}%`;
        }
    }
    
    showGameStats() {
        const statsContent = document.getElementById('game-stats-content');
        if (!statsContent) return;

        // Calculate rankings
        const rankings = this.calculatePlayerRankings();

        // Sort players by rank
        const sortedPlayers = [...this.players].sort((a, b) => {
            return rankings[a.id] - rankings[b.id];
        });

        // Build stats HTML
        let statsHTML = '<div class="stats-grid">';

        sortedPlayers.forEach(player => {
            const locationNames = ['Work Site', 'Bar', 'Station', 'Hospital', 'Dojo', 'Plaza', 'Forest'];

            const powerLv = player.weapon.powerTrackPosition >= 7 ? 3 : player.weapon.powerTrackPosition >= 3 ? 2 : 1;
            statsHTML += `
                <div class="player-stats-card">
                    <div class="stats-card-header" style="background-color: ${player.color?.background || '#ddd'};">
                        <h3>${this.getPlayerDisplayName(player)}</h3>
                        <span class="weapon-name">${this.getWeaponDisplayName(player.weapon.name)}</span>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-section">
                            <h4>${t('gameStats.finalResults')}</h4>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.rank')}</span>
                                <span class="stat-value">#${rankings[player.id]}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.totalScore')}</span>
                                <span class="stat-value">${player.score}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.popularityLevel')}</span>
                                <span class="stat-value">${player.popularityTrack.pointToken}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.weaponPower')}</span>
                                <span class="stat-value">${t('gameStats.levelN', powerLv)}</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>${t('gameStats.combatStats')}</h4>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.defeatedMonsters')}</span>
                                <span class="stat-value">
                                    Lv1: ${player.monstersDefeated?.level1 || 0} |
                                    Lv2: ${player.monstersDefeated?.level2 || 0} |
                                    Lv3: ${player.monstersDefeated?.level3 || 0}
                                </span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>${t('gameStats.scoreBreakdown')}</h4>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromMonsters')}</span>
                                <span class="stat-value">${player.scoreFromMonsters || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromPopularity')}</span>
                                <span class="stat-value">${player.scoreFromPopularity || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromPlaza')}</span>
                                <span class="stat-value">${player.scoreFromPlaza || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromMilestones')}</span>
                                <span class="stat-value">${player.scoreFromMilestones || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromFakeBlood')}</span>
                                <span class="stat-value">${player.scoreFromFakeBlood || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.fromOther')}</span>
                                <span class="stat-value">${player.scoreFromOther || 0}</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>${t('gameStats.placementStats')}</h4>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.hunterAlone')}</span>
                                <span class="stat-value">${t('gameStats.timesN', player.hunterAloneCount)}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">${t('gameStats.apprenticeWithHunters')}</span>
                                <span class="stat-value">${t('gameStats.timesN', player.apprenticeWithHuntersCount)}</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>${t('gameStats.locationSelections')}</h4>
                            ${locationNames.map((name, index) => {
                                const locationId = index + 1;
                                const hunterCount = player.locationSelections[locationId].hunter;
                                const apprenticeCount = player.locationSelections[locationId].apprentice;
                                return `
                                    <div class="stat-row">
                                        <span class="stat-label">${this.getLocationDisplayName(name)}:</span>
                                        <span class="stat-value">H: ${hunterCount} | A: ${apprenticeCount}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        });

        statsHTML += '</div>';
        statsContent.innerHTML = statsHTML;

        // Show the stats overlay
        document.getElementById('game-stats-overlay').style.display = 'flex';
    }

    toggleGameStats() {
        const overlay = document.getElementById('game-stats-overlay');
        if (overlay) {
            overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
        }
    }

    exitToMainMenu() {
        // Reset the game and show main menu
        this.resetMilestoneCheckboxes();
        location.reload();
    }

    endGame(winner) {
        this.roundPhase = 'gameover';
        
        // Record game data if in automated mode or data collection mode
        if (this.isAutomatedMode || this.isDataCollectionMode) {
            const gameData = this.recordGameData();
            if (this.collectedGameData) {
                this.collectedGameData.push(...gameData);
            }
        }
        
        // Show game over message if not in automated mode
        if (!this.isAutomatedMode) {
            document.getElementById('status-message').textContent = 
                t('gameOver.fanfare', this.getPlayerDisplayName(winner), winner.score);
            
            // Disable all buttons when game ends
            this.disableAllPlayerButtons();
        } else {
            console.log(`Game ${this.automatedGamesCompleted + 1} complete: ${winner.name} wins with ${winner.score} points`);
        }
        
        // Handle automated mode continuation
        if (this.isAutomatedMode) {
            this.automatedGamesCompleted++;
            this.updateDataCollectionProgress();
            
            // Start next game after a brief delay
            setTimeout(() => {
                this.startNextAutomatedGame();
            }, this.getDelay(100));
            return;
        }
        
        // Show game over message for regular games
        document.getElementById('status-message').innerHTML =
            t('gameOver.fanfare', this.getPlayerDisplayName(winner), winner.score);

        // Hide game controls
        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'none';

        // Clear controls and add game end buttons
        const controls = document.querySelector('.controls');
        controls.innerHTML = '';

        // Add View Stats button
        const statsButton = document.createElement('button');
        statsButton.textContent = t('gameStats.view');
        statsButton.className = 'control-button';
        statsButton.onclick = () => this.showGameStats();
        controls.appendChild(statsButton);

        // Add Exit to Menu button
        const exitButton = document.createElement('button');
        exitButton.textContent = t('gameStats.exit');
        exitButton.className = 'control-button';
        exitButton.onclick = () => this.exitToMainMenu();
        controls.appendChild(exitButton);

        // Automatically show game stats
        this.showGameStats();
    }
    
    startNextRoundPhase() {
        this.roundPhase = 'nextround';
        
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting next round phase - Round ${this.currentRound}`);
        }
        
        // Clear all monster effects from this round
        this.cleanupRoundEffects();

        // Reset forest readiness tracking
        this.failedForestPlayers = [];
        this.forestPlayersThisRound = new Set();
        this.forestReadinessQueue = [];

        // Clear the board - bring all tokens back to players
        if (!this.isAutomatedMode) {
            document.querySelectorAll('.token').forEach(token => token.remove());
        }
        
        // Reset token positions
        this.players.forEach(player => {
            player.tokens.hunter = null;
            player.tokens.apprentice = null;
        });
        
        // Show next round transition
        document.getElementById('status-message').textContent = t('status.roundCompleteNext');
        
        // Automatically proceed to next round after a brief delay
        setTimeout(() => {
            this.startNewRound();
        }, this.getDelay(2000));
    }
    
    applyRoundStartPowers() {
        // Apply weapon power effects at round start
        this.players.forEach(player => {
            // Bat Level 2 Power: Choice of +1 HP or +1 EP at round start
            if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 3) {
                const maxHp = player.maxHP || 10;
                const maxEp = player.maxEP || 10;
                const hpFull = player.resources.hp >= maxHp;
                const epFull = player.resources.ep >= maxEp;

                if (hpFull && epFull) {
                    console.log(`Bat Lv2 Power: ${player.name} has full HP and EP, no bonus received`);
                    this.addLogEntryT('log.batLv2Power', [player], 'power', player);
                } else if (player.isBot) {
                    let choice;
                    if (hpFull) {
                        choice = 'ep';
                    } else if (epFull) {
                        choice = 'hp';
                    } else {
                        const hpRatio = player.resources.hp / maxHp;
                        const epRatio = player.resources.ep / maxEp;
                        if (hpRatio < epRatio) {
                            choice = 'hp';
                        } else if (epRatio < hpRatio) {
                            choice = 'ep';
                        } else {
                            choice = Math.random() < 0.5 ? 'hp' : 'ep';
                        }
                    }

                    if (choice === 'hp') {
                        this.modifyResource(player.id, 'hp', 1);
                        this.addLogEntryT('log.batLv2HP', [player], 'power', player);
                    } else {
                        this.modifyResource(player.id, 'ep', 1);
                        this.addLogEntryT('log.batLv2EP', [player], 'power', player);
                    }
                } else {
                    // Human player: show choice dialog
                    this.showBatPowerChoice(player.id);
                }
            }

            if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
            }

            if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 1;
                this.addItemToInventory(player.id, 'Blood Bag', 1);
            }

            if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
            }

            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 1;
                this.addItemToInventory(player.id, 'Blood Bag', 1);
            }

            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'money', 2);
            }

            if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'money', 2);
            }

            if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7) {
                this.modifyResource(player.id, 'exp', 2);
                this.addLogEntryT('log.plasmaLv3Power', [player], 'power', player);
            }
        });
    }

    startNewRound() {
        // Reset store phase completion flag for new round
        this.storePhaseCompleted = false;

        // Move dummy tokens to next locations
        this.moveDummyTokens();

        // Increment round counter
        this.currentRound++;

        // Log round start
        this.addLogEntryT('log.roundStarted', [this.currentRound], 'round-start');

        this.applyRoundStartPowers();
        
        // Update displays after applying round start effects
        this.updateResourceDisplay();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        
        // Reset for next round
        this.roundPhase = 'selection';
        this.currentPlayerIndex = (this.gameMode === 'online') ? this.localPlayerId : 0;
        this.pendingSelectionLogs = []; // Clear any pending logs

        // Clear selections and station choices
        this.stationChoices = {};
        this.players.forEach(player => {
            player.selectedCards.hunter = null;
            player.selectedCards.apprentice = null;
        });

        // Update UI for next round
        const confirmBtn = document.getElementById('confirm-selection');
        confirmBtn.style.display = 'block';
        confirmBtn.textContent = 'Select Both Locations';
        confirmBtn.disabled = true;
        document.getElementById('next-player').style.display = 'none';
        document.getElementById('status-message').textContent =
            t('status.newRoundStarted', this.getPlayerDisplayName(this.currentPlayer));
        document.querySelector('.card-selection').style.display = 'grid';
        
        // Show current player text again for the new round (only in turn-based local mode)
        if (this.gameMode === 'turnbased') {
            document.querySelector('.current-player').style.display = 'block';
        }
        
        this.createLocationCards();
        this.updateUI();
        this.updateCurrentPlayer(); // Fix: Handle bot detection for new rounds
        this.updateDummyTokenDisplay();
    }
    
    handleCapacityOverflow(overflowPlayers) {
        if (overflowPlayers.length === 0) {
            this.hidePlayerStatusIndicators();
            this.checkForestReadiness();
            return;
        }

        const playerId = overflowPlayers[0];
        const player = this.players.find(p => p.id === playerId);

        // Show phase title only (no red/green indicators)
        this.showPlayerStatusIndicators(true);
        this.setPhaseTitle(t('phase.capacityOverflow', this.getPlayerDisplayName(player)));

        // Show capacity management UI
        document.getElementById('capacity-player-name').textContent = this.getPlayerDisplayName(player);
        document.getElementById('capacity-current').textContent = this.getInventorySize(player);
        document.getElementById('capacity-max').textContent = player.maxInventoryCapacity;
        document.getElementById('capacity-excess').textContent = this.getInventorySize(player) - player.maxInventoryCapacity;
        
        // Show items for removal
        const itemsList = document.getElementById('capacity-items');
        itemsList.innerHTML = '';
        
        // Check if buttons should be disabled
        const buttonsDisabled = this.shouldDisablePlayerButtons(playerId);
        
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'capacity-item';
            
            let buttonsHTML = '';
            
            // Different buttons based on item type
            if (item.name === 'Beer' || item.name === 'Blood Bag') {
                // Beer and Blood Bag: Use, Upgrade, Discard buttons
                const canUse = (item.name === 'Beer' && player.resources.ep < player.maxResources.ep) ||
                              (item.name === 'Blood Bag' && player.resources.hp < player.maxResources.hp);
                
                const canUpgrade = (item.name === 'Beer' && player.maxResources.ep < 10) ||
                                  (item.name === 'Blood Bag' && player.maxResources.hp < 10);
                
                const useDisabled = !canUse || buttonsDisabled;
                const upgradeDisabled = !canUpgrade || buttonsDisabled;
                const discardDisabled = buttonsDisabled;
                
                const disabledTitle = buttonsDisabled ? t('tooltip.botBoard') : '';

                buttonsHTML = `
                    <button onclick="game.useItemFromOverflow(${playerId}, ${index})" class="use-btn" ${useDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : (canUse ? t('capacity.useItem') : (item.name === 'Beer' ? t('tooltip.epFull') : t('tooltip.hpFull')))}">${t('capacity.use')}</button>
                    <button onclick="game.addToUpgradeFromOverflow(${playerId}, ${index})" class="upgrade-btn" ${upgradeDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : (canUpgrade ? t('capacity.addToUpgrade') : t('capacity.maxAlready'))}">${t('capacity.upgrade')}</button>
                    <button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn" ${discardDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : t('capacity.discardItem')}">${t('capacity.discard')}</button>
                `;
            } else {
                // Grenade, Bomb, Dynamite, Fake Blood: Discard only
                const discardDisabled = buttonsDisabled;
                const disabledTitle = buttonsDisabled ? t('tooltip.botBoard') : t('capacity.discardItem');
                buttonsHTML = `<button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn" ${discardDisabled ? 'disabled' : ''} title="${disabledTitle}">${t('capacity.discard')}</button>`;
            }

            itemElement.innerHTML = `
                <span>${item.icon || '❓'} ${this.getItemDisplayName(item.name)} (${t('store.size')} ${item.size})</span>
                <div class="item-actions">
                    ${buttonsHTML}
                </div>
            `;
            itemsList.appendChild(itemElement);
        });
        
        this.remainingOverflowPlayers = overflowPlayers.slice(1);
        document.getElementById('capacity-modal').style.display = 'flex';
    }
    
    removeItem(playerId, itemIndex) {
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'capacity_overflow_choice',
                playerId: this.localPlayerId,
                data: { actionType: 'discard', itemIndex }
            });
            document.getElementById('capacity-modal').style.display = 'none';
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        player.inventory.splice(itemIndex, 1);

        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplay(playerId);

        if (this.getInventorySize(player) <= player.maxInventoryCapacity) {
            // Capacity is now fine
            document.getElementById('capacity-modal').style.display = 'none';
            this.handleCapacityOverflow(this.remainingOverflowPlayers);
        } else {
            // Still over capacity, update UI
            this.handleCapacityOverflow([playerId, ...this.remainingOverflowPlayers]);
        }
    }
    
    useItemFromOverflow(playerId, itemIndex) {
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'capacity_overflow_choice',
                playerId: this.localPlayerId,
                data: { actionType: 'use', itemIndex }
            });
            document.getElementById('capacity-modal').style.display = 'none';
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        const item = player.inventory[itemIndex];

        if (!item) return;

        // Use the same logic as useInventoryItem
        if (item.name === 'Beer') {
            if (player.resources.ep >= player.maxResources.ep) return;
            player.resources.ep = Math.min(player.resources.ep + 1, player.maxResources.ep);

            // Update Forest button status if this is the current player
            if (player.id === this.currentPlayer?.id) {
                this.updateForestButtonStatus();
            }
        } else if (item.name === 'Blood Bag') {
            if (player.resources.hp >= player.maxResources.hp) return;
            player.resources.hp = Math.min(player.resources.hp + 1, player.maxResources.hp);
        }

        // Remove item from inventory
        player.inventory.splice(itemIndex, 1);

        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplay(playerId);

        // Check if capacity is now within limits
        if (this.getInventorySize(player) <= player.maxInventoryCapacity) {
            // Capacity is now fine
            document.getElementById('capacity-modal').style.display = 'none';
            this.handleCapacityOverflow(this.remainingOverflowPlayers);
        } else {
            // Still over capacity, update UI
            this.handleCapacityOverflow([playerId, ...this.remainingOverflowPlayers]);
        }
    }
    
    addToUpgradeFromOverflow(playerId, itemIndex) {
        if (this.gameMode === 'online' && !this.isHost) {
            this.onlineManager.pushAction({
                type: 'capacity_overflow_choice',
                playerId: this.localPlayerId,
                data: { actionType: 'upgrade', itemIndex }
            });
            document.getElementById('capacity-modal').style.display = 'none';
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        const item = player.inventory[itemIndex];

        if (!item) return;

        const upgradeType = item.name === 'Beer' ? 'ep' : 'hp';
        const requiredAmount = upgradeType === 'ep' ? 4 : 3;

        // Check if can upgrade (not at max and not at upgrade limit)
        if (player.maxResources[upgradeType] >= 10) return;
        if (player.upgradeProgress[upgradeType] >= requiredAmount) return;

        // Remove item from inventory and add to upgrade progress
        player.inventory.splice(itemIndex, 1);
        player.upgradeProgress[upgradeType]++;

        // Check if upgrade is complete
        if (player.upgradeProgress[upgradeType] === requiredAmount) {
            this.levelUpMaxResource(playerId, upgradeType, 1);
            player.upgradeProgress[upgradeType] = 0;
            // Log entry handled by levelUpMaxResource
        }
        
        // Update displays
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        this.updateResourceDisplay();

        // Check if capacity is now within limits
        if (this.getInventorySize(player) <= player.maxInventoryCapacity) {
            // Capacity is now fine
            document.getElementById('capacity-modal').style.display = 'none';
            this.handleCapacityOverflow(this.remainingOverflowPlayers);
        } else {
            // Still over capacity, update UI
            this.handleCapacityOverflow([playerId, ...this.remainingOverflowPlayers]);
        }
    }
    
    useItem(playerId, itemIndex) {
        const player = this.players.find(p => p.id === playerId);
        const item = player.inventory[itemIndex];
        
        if (!item) return;
        
        // Check if item is for combat only
        const combatItems = ['reduce_1_monster_hp', 'reduce_2_monster_hp', 'reduce_3_monster_hp'];
        if (combatItems.includes(item.effect) && !this.currentBattle) {
            alert(t('alert.combatItemOnly'));
            return;
        }
        
        // Apply item effect
        const context = this.currentBattle ? { type: 'combat' } : null;
        this.applyItemEffect(playerId, item.effect, context);
        
        // Remove item from inventory
        player.inventory.splice(itemIndex, 1);
        
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        
        alert(t('alert.usedItem', player.name, item.name));
    }
    
    useInventoryItem(playerId, itemName) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Find the first item of the specified type
        const itemIndex = player.inventory.findIndex(item => item.name === itemName);
        if (itemIndex === -1) return;
        
        const item = player.inventory[itemIndex];
        
        // Check if item can be used and apply the effect
        if (itemName === 'Beer') {
            // Beer: +1 EP (only if not at max)
            if (player.resources.ep >= player.maxResources.ep) {
                console.log('Cannot use beer: EP is already at maximum');
                return;
            }
            player.resources.ep = Math.min(player.resources.ep + 1, player.maxResources.ep);
            
            // Update EP display in battle UI if in battle
            if (this.currentBattle && this.currentBattle.playerId === playerId) {
                document.getElementById('battle-player-ep').textContent = `${player.resources.ep}/${player.maxResources.ep}`;
            }
            
            // Update Forest button status if this is the current player
            if (player.id === this.currentPlayer?.id) {
                this.updateForestButtonStatus();
            }
        } else if (itemName === 'Blood Bag') {
            // Blood Bag: +1 HP (only if not at max)
            if (player.resources.hp >= player.maxResources.hp) {
                console.log('Cannot use blood bag: HP is already at maximum');
                return;
            }
            player.resources.hp = Math.min(player.resources.hp + 1, player.maxResources.hp);
        } else {
            console.log('Unknown item type:', itemName);
            return;
        }
        
        // Remove item from inventory
        player.inventory.splice(itemIndex, 1);
        
        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplay(playerId);

        // Refresh store display if in store phase to update capacity warnings
        if (this.roundPhase === 'store') {
            if (this.gameMode === 'online') {
                if (player.id === this.localPlayerId) {
                    this.showStoreForPlayer(player);
                }
            } else if (this.gameMode === 'simultaneous') {
                this.showStoreForPlayer(player);
            } else {
                this.showStore();
            }
        }
        
        // Update location card states if in selection phase and EP changed
        if (this.roundPhase === 'selection' && itemName === 'Beer' && player.id === this.currentPlayer.id) {
            this.updateLocationCardStates();
        }
    }
    
    // convertBloodBagToBeer removed - Katana no longer has Level 1 power
    
    updateStoreCapacityDisplay() {
        if (this.roundPhase !== 'store') return;
        
        const player = this.players[this.currentStorePlayer];
        if (!player) return;
        
        // Update store capacity display
        document.getElementById('store-current-capacity').textContent = this.getInventorySize(player);
        document.getElementById('store-max-capacity').textContent = player.maxInventoryCapacity;
    }
    
    applyItemEffect(playerId, effect, context = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        switch(effect) {
            case 'gain_1_energy':
                // Gain 1 beer
                player.resources.beer += 1;
                break;
            case 'gain_1_blood':
                // Gain 1 blood bag
                player.resources.bloodBag += 1;
                break;
            case 'reduce_1_monster_hp':
                // Used during combat - reduce monster HP by 1
                if (context && context.type === 'combat' && this.currentBattle) {
                    let damage = 1;
                    const damageCap = this.applyBattleEffect(this.currentBattle.monster, 'damageCap');
                    if (damageCap !== null) {
                        damage = Math.min(damage, damageCap);
                    }
                    this.currentBattle.monster.hp -= damage;
                    this.logBattleAction(`${player.name} uses Grenade! Monster takes ${damage} damage.`, player);
                    this.showMonsterBattleUI();
                }
                break;
            case 'reduce_2_monster_hp':
                // Used during combat - reduce monster HP by 2
                if (context && context.type === 'combat' && this.currentBattle) {
                    let damage = 2;
                    const damageCap = this.applyBattleEffect(this.currentBattle.monster, 'damageCap');
                    if (damageCap !== null) {
                        damage = Math.min(damage, damageCap);
                    }
                    this.currentBattle.monster.hp -= damage;
                    this.logBattleAction(`${player.name} uses Bomb! Monster takes ${damage} damage.`, player);
                    this.showMonsterBattleUI();
                }
                break;
            case 'reduce_3_monster_hp':
                // Used during combat - reduce monster HP by 3
                if (context && context.type === 'combat' && this.currentBattle) {
                    let damage = 3;
                    const damageCap = this.applyBattleEffect(this.currentBattle.monster, 'damageCap');
                    if (damageCap !== null) {
                        damage = Math.min(damage, damageCap);
                    }
                    this.currentBattle.monster.hp -= damage;
                    this.logBattleAction(`${player.name} uses Dynamite! Monster takes ${damage} damage.`, player);
                    this.showMonsterBattleUI();
                }
                break;
            case 'bonus_points_on_kill':
                // This is a passive effect that applies when defeating a monster
                // We'll need to track this buff on the player
                player.hasKillBonus = true;
                break;
        }
    }
    
    updateStoreInventoryDisplay() {
        const player = this.players[this.currentStorePlayer];
        const inventoryContainer = document.getElementById('player-inventory');
        
        if (player.inventory.length === 0) {
            inventoryContainer.innerHTML = '<p style="color: #95a5a6; text-align: center; margin-top: 50px;">No items</p>';
            return;
        }
        
        inventoryContainer.innerHTML = '';
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.innerHTML = `
                <span>${item.name} (${item.size})</span>
                <button class="use-item-btn" (${player.id}, ${index})">Use</button>
            `;
            inventoryContainer.appendChild(itemElement);
        });
    }
    
    updatePetDisplay() {
        if (this.isAutomatedMode) return;

        this.players.forEach(player => {
            // Ensure player.pets exists
            if (!player.pets) {
                player.pets = { level1: 0, level2: 0, level3: 0 };
            }

            // Update individual pet level counts in the new structure
            const lv1Element = document.getElementById(`p${player.id}-pet-lv1`);
            const lv2Element = document.getElementById(`p${player.id}-pet-lv2`);
            const lv3Element = document.getElementById(`p${player.id}-pet-lv3`);

            if (lv1Element) lv1Element.textContent = player.pets.level1 || 0;
            if (lv2Element) lv2Element.textContent = player.pets.level2 || 0;
            if (lv3Element) lv3Element.textContent = player.pets.level3 || 0;
        });
    }
    
    updatePetSelectionUI() {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        const container = document.getElementById('pet-selection-container');
        container.innerHTML = '';
        
        const petInfo = {
            1: { cost: 2, attack: 1, icon: '🐾', name: 'Level 1 Pet' },
            2: { cost: 3, attack: 2, icon: '🦊', name: 'Level 2 Pet' },
            3: { cost: 4, attack: 4, icon: '🐺', name: 'Level 3 Pet' }
        };
        
        [1, 2, 3].forEach(level => {
            const availablePets = player.pets[`level${level}`];
            if (availablePets > 0) {
                const petDiv = document.createElement('div');
                petDiv.className = 'pet-selection-row';
                petDiv.innerHTML = `
                    <span class="pet-info">
                        ${petInfo[level].icon} ${petInfo[level].name} 
                        (${petInfo[level].cost} EP, +${petInfo[level].attack} ATK)
                    </span>
                    <span class="pet-counter">
                        <button onclick="game.adjustPetSelection(${level}, -1)">-</button>
                        <span id="pet-count-${level}">0</span>/<span>${availablePets}</span>
                        <button onclick="game.adjustPetSelection(${level}, 1)">+</button>
                    </span>
                `;
                container.appendChild(petDiv);
            }
        });
        
        if (container.innerHTML === '') {
            container.innerHTML = '<p>' + t('monster.noPetsAvailable') + '</p>';
        }

        this.updateTotalEPCost();
        this.updateBeerConsumptionUI();
    }

    updateBeerConsumptionUI() {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        const beerCount = player.inventory.filter(i => i.name === 'Beer').length;

        const section = document.getElementById('beer-consumption-section');

        // Always show section
        section.style.display = 'block';

        // Update displays to show current state
        document.getElementById('available-beers-count').textContent = beerCount;
        // Show overflow EP in '10+2/10' format
        if (this.overflowEP > 0) {
            document.getElementById('current-ep-display').textContent = `${player.resources.ep}+${this.overflowEP}`;
        } else {
            document.getElementById('current-ep-display').textContent = player.resources.ep;
        }
        document.getElementById('max-ep-display').textContent = player.maxResources.ep;
        document.getElementById('beers-to-consume').textContent = this.selectedBeerConsumption || 0;
    }

    adjustPetSelection(level, delta) {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        const availablePets = player.pets[`level${level}`];
        const currentCount = this.selectedPets[`level${level}`];
        const newCount = Math.max(0, Math.min(availablePets, currentCount + delta));

        this.selectedPets[`level${level}`] = newCount;
        document.getElementById(`pet-count-${level}`).textContent = newCount;

        this.updateTotalEPCost();
    }

    adjustBeerConsumptionInBattle(delta) {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        const beerCount = player.inventory.filter(i => i.name === 'Beer').length;

        // Store previous consumption amount
        const previousConsumption = this.selectedBeerConsumption || 0;

        // Calculate max beers that can be consumed (remaining + already consumed = original total)
        const maxConsumable = beerCount + previousConsumption;

        // Calculate new selected count (min 0, max available beers)
        const newConsumption = Math.max(0, Math.min(maxConsumable, previousConsumption + delta));

        // Calculate actual delta to apply
        const actualDelta = newConsumption - previousConsumption;

        if (actualDelta > 0) {
            // Consume more beers
            for (let i = 0; i < actualDelta; i++) {
                const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
                if (beerIndex !== -1) {
                    player.inventory.splice(beerIndex, 1);
                    // If EP is at max, add to overflow instead
                    if (player.resources.ep >= player.maxResources.ep) {
                        this.overflowEP = (this.overflowEP || 0) + 1;
                    } else {
                        player.resources.ep = Math.min(player.resources.ep + 1, player.maxResources.ep);
                    }
                }
            }
        } else if (actualDelta < 0) {
            // Restore beers
            for (let i = 0; i < Math.abs(actualDelta); i++) {
                player.inventory.push({ name: 'Beer', size: 1 });
                // If overflow exists, reduce it first
                if (this.overflowEP > 0) {
                    this.overflowEP -= 1;
                } else {
                    player.resources.ep = Math.max(0, player.resources.ep - 1);
                }
            }
        }

        // Update selected consumption tracker
        this.selectedBeerConsumption = newConsumption;

        // Update resource and inventory displays
        this.updateResourceDisplay(player.id);
        this.updateInventoryDisplay(player.id);

        // Update beer consumption UI
        const currentBeerCount = player.inventory.filter(i => i.name === 'Beer').length;
        document.getElementById('available-beers-count').textContent = currentBeerCount;
        // Show overflow EP in '10+2/10' format
        if (this.overflowEP > 0) {
            document.getElementById('current-ep-display').textContent = `${player.resources.ep}+${this.overflowEP}`;
        } else {
            document.getElementById('current-ep-display').textContent = player.resources.ep;
        }
        document.getElementById('max-ep-display').textContent = player.maxResources.ep;
        document.getElementById('beers-to-consume').textContent = this.selectedBeerConsumption;

        // Refresh confirm button visibility
        this.updateTotalEPCost();
    }

    updateTotalEPCost() {
        const monsterCost = this.selectedMonsterLevel || 0;
        
        // Calculate base pet costs
        let petCost = this.selectedPets.level1 * 2 + 
                     this.selectedPets.level2 * 3 + 
                     this.selectedPets.level3 * 4;
        
        // Apply Whip weapon pet cost reduction
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        if (player && player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                // Level 3: Pet costs become 0 EP
                petCost = 0;
            } else {
                // Level 1: Pet costs reduced by 1 EP each (minimum 0)
                let reducedCost = 0;
                if (this.selectedPets.level1 > 0) {
                    reducedCost += this.selectedPets.level1 * Math.max(0, 2 - 1);
                }
                if (this.selectedPets.level2 > 0) {
                    reducedCost += this.selectedPets.level2 * Math.max(0, 3 - 1);
                }
                if (this.selectedPets.level3 > 0) {
                    reducedCost += this.selectedPets.level3 * Math.max(0, 4 - 1);
                }
                petCost = reducedCost;
            }
        }
        
        const totalCost = monsterCost + petCost;

        document.getElementById('total-ep-cost').textContent = totalCost;

        // Show/hide confirm button based on valid selection
        // Use effective EP (current EP + overflow from beers)
        const effectiveEP = player.resources.ep + (this.overflowEP || 0);
        const confirmBtn = document.querySelector('.confirm-battle-btn');
        if (this.selectedMonsterLevel && totalCost <= effectiveEP) {
            confirmBtn.style.display = 'block';
        } else {
            confirmBtn.style.display = 'none';
        }
    }
    
    showBatPowerChoice(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // In online mode, if this is the guest player and we're the host,
        // auto-choose using bot logic (simplification to avoid async wait)
        if (this.gameMode === 'online' && this.isHost && playerId !== this.localPlayerId && !player.isBot) {
            const maxHp = player.maxHP || 10;
            const maxEp = player.maxEP || 10;
            const hpFull = player.resources.hp >= maxHp;
            const epFull = player.resources.ep >= maxEp;
            if (hpFull && epFull) return;
            if (hpFull) {
                this.modifyResource(playerId, 'ep', 1);
                this.addLogEntryT('log.batLv2EPGain', [player], 'power', player);
            } else {
                this.modifyResource(playerId, 'hp', 1);
                this.addLogEntryT('log.batLv2HPGain', [player], 'power', player);
            }
            this.updateResourceDisplay();
            this.updateInventoryDisplay(playerId);
            return;
        }

        const maxHp = player.maxHP || 10;
        const maxEp = player.maxEP || 10;
        const hpFull = player.resources.hp >= maxHp;
        const epFull = player.resources.ep >= maxEp;
        
        // If both are full, no choice needed
        if (hpFull && epFull) {
            console.log(`Bat Lv2 Power: ${player.name} has full HP and EP, no bonus received`);
            this.addLogEntryT('log.batLv2Power', [player], 'power', player);
            return;
        }
        
        // Create a modal dialog for the choice
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'bat-power-dialog';
        dialog.style.cssText = `
            background: #2c3e50;
            border: 2px solid #ecf0f1;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            color: #ecf0f1;
        `;
        
        // Build button HTML based on what's available
        let buttonHtml = '';
        if (!hpFull) {
            buttonHtml += `
                <button id="bat-choose-hp" style="margin: 10px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    ❤️ +1 HP (${player.resources.hp}/${maxHp})
                </button>
            `;
        }
        if (!epFull) {
            buttonHtml += `
                <button id="bat-choose-ep" style="margin: 10px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    ⚡ +1 EP (${player.resources.ep}/${maxEp})
                </button>
            `;
        }
        
        dialog.innerHTML = `
            <h3>Bat Level 2 Power</h3>
            <p>${player.name}, choose your reward:</p>
            <div style="margin: 20px 0;">
                ${buttonHtml}
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Add event listeners
        if (!hpFull) {
            const hpBtn = document.getElementById('bat-choose-hp');
            if (hpBtn) {
                hpBtn.onclick = () => {
                    this.modifyResource(playerId, 'hp', 1);
                    console.log(`Bat Lv2 Power: ${player.name} chooses +1 HP at round start`);
                    this.addLogEntryT('log.batLv2HP', [player], 'power', player);
                    document.body.removeChild(modal);
                    this.updateResourceDisplay();
                    this.updateInventoryDisplay(playerId);
                };
            }
        }
        
        if (!epFull) {
            const epBtn = document.getElementById('bat-choose-ep');
            if (epBtn) {
                epBtn.onclick = () => {
                    this.modifyResource(playerId, 'ep', 1);
                    console.log(`Bat Lv2 Power: ${player.name} chooses +1 EP at round start`);
                    this.addLogEntryT('log.batLv2EP', [player], 'power', player);
                    document.body.removeChild(modal);
                    this.updateResourceDisplay();
                    this.updateInventoryDisplay(playerId);
                };
            }
        }
        
        // Auto-select if only one option is available
        if (hpFull && !epFull) {
            // Only EP available, auto-select it
            setTimeout(() => {
                document.getElementById('bat-choose-ep')?.click();
            }, 100);
        } else if (epFull && !hpFull) {
            // Only HP available, auto-select it
            setTimeout(() => {
                document.getElementById('bat-choose-hp')?.click();
            }, 100);
        }
    }

    // ==================== ONLINE: STATE SERIALIZATION ====================

    serializeGameState() {
        // Serialize the full game state for pushing to Firebase
        return {
            roundPhase: this.roundPhase,
            currentRound: this.currentRound,
            currentPlayerIndex: this.currentPlayerIndex,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                isBot: p.isBot,
                tokens: { ...p.tokens },
                selectedCards: { ...p.selectedCards },
                resources: { ...p.resources },
                upgradeProgress: { ...p.upgradeProgress },
                milestones: { ...p.milestones },
                score: p.score,
                scoreFromMonsters: p.scoreFromMonsters,
                scoreFromMilestones: p.scoreFromMilestones,
                scoreFromPopularity: p.scoreFromPopularity,
                scoreFromPlaza: p.scoreFromPlaza,
                scoreFromFakeBlood: p.scoreFromFakeBlood,
                scoreFromOther: p.scoreFromOther,
                maxResources: { ...p.maxResources },
                weapon: {
                    name: p.weapon.name,
                    currentAttackDice: p.weapon.currentAttackDice,
                    currentDefenseDice: p.weapon.currentDefenseDice,
                    attackLevel: p.weapon.attackLevel,
                    defenseLevel: p.weapon.defenseLevel,
                    powerTrackPosition: p.weapon.powerTrackPosition,
                    damage: [...p.weapon.damage],
                    capacity: p.weapon.capacity,
                    priority: p.weapon.priority
                },
                maxInventoryCapacity: p.maxInventoryCapacity,
                inventory: p.inventory.map(item => {
                    const serialized = {};
                    for (const [k, v] of Object.entries(item)) {
                        if (v !== undefined) serialized[k] = v;
                    }
                    return serialized;
                }),
                popularityTrack: {
                    pointToken: p.popularityTrack.pointToken,
                    rewardToken: p.popularityTrack.rewardToken,
                    levelReached: [...p.popularityTrack.levelReached]
                },
                pets: { ...p.pets },
                monstersDefeated: { ...p.monstersDefeated },
                hunterAloneCount: p.hunterAloneCount,
                apprenticeWithHuntersCount: p.apprenticeWithHuntersCount,
                locationSelections: JSON.parse(JSON.stringify(p.locationSelections))
            })),
            dummyTokens: [...this.dummyTokens],
            playerCompletionStatus: { ...this.playerCompletionStatus },
            phaseTimeLimit: this.phaseTimeLimit,
            battleLog: this.getBattleLogEntries(),
            stateVersion: 0 // Will be set by pushGameState
        };
    }

    getBattleLogEntries() {
        // Return the structured log queue (translation key + args) so guests can re-render
        // each entry in their own chosen language. Limit to last 20 to save bandwidth.
        if (!this.structuredLog) this.structuredLog = [];
        return this.structuredLog.slice(-20);
    }

    serializeBattleState() {
        if (!this.currentBattle) return null;
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);

        return {
            playerId: battle.playerId,
            playerName: player ? player.name : 'Unknown',
            playerHP: player ? player.resources.hp : 0,
            playerMaxHP: player ? player.maxResources.hp : 0,
            playerEP: player ? player.resources.ep : 0,
            playerMaxEP: player ? player.maxResources.ep : 0,
            playerInventory: player ? player.inventory.map(i => ({ name: i.name || '', icon: i.icon || '', size: i.size || 0 })) : [],
            monster: battle.monster ? {
                level: battle.monster.level || 0,
                hp: battle.monster.hp || 0,
                maxHp: battle.monster.maxHp || battle.monster.hp || 0,
                attack: battle.monster.attack || battle.monster.att || 0,
                effect: battle.monster.effect || '',
                effectId: battle.monster.effectId || 0,
                rewards: battle.monster.rewards || null
            } : null,
            turn: battle.turn,
            bonusPts: battle.bonusPts || 0,
            petsUsed: battle.petsUsed || false,
            hasAttacked: battle.hasAttacked || false,
            doubleDamageUsed: battle.doubleDamageUsed || false,
            canUseDoubleDamage: battle.canUseDoubleDamage || false,
            lastAttackDamage: battle.lastAttackDamage || 0,
            glovesPowerLevel: battle.glovesPowerLevel || 0,
            ammunitionConsumed: battle.ammunitionConsumed || false,
            battleLogHTML: document.getElementById('battle-log')?.innerHTML || '',
            monsterRewardsText: document.getElementById('battle-monster-rewards')?.textContent || '',
            isActive: battle.monster ? battle.monster.hp > 0 && (player ? player.resources.hp > 0 : true) : false
        };
    }

    applyRemoteGameState(state) {
        // Guest applies state received from host
        if (!state || !state.stateVersion) return;
        if (state.stateVersion <= this.lastAppliedStateVersion) return;
        this.lastAppliedStateVersion = state.stateVersion;

        console.log(`Applying remote state v${state.stateVersion}, phase: ${state.roundPhase}`);

        // Update round info
        this.currentRound = state.currentRound;

        // Update players
        if (state.players) {
            state.players.forEach(remotePlayer => {
                const localPlayer = this.players.find(p => p.id === remotePlayer.id);
                if (!localPlayer) return;

                // Update resources
                Object.assign(localPlayer.resources, remotePlayer.resources);
                Object.assign(localPlayer.maxResources, remotePlayer.maxResources);
                Object.assign(localPlayer.upgradeProgress, remotePlayer.upgradeProgress);
                Object.assign(localPlayer.milestones, remotePlayer.milestones);
                Object.assign(localPlayer.tokens, remotePlayer.tokens);
                Object.assign(localPlayer.selectedCards, remotePlayer.selectedCards);
                Object.assign(localPlayer.pets, remotePlayer.pets);
                Object.assign(localPlayer.monstersDefeated, remotePlayer.monstersDefeated);
                localPlayer.popularityTrack.pointToken = remotePlayer.popularityTrack.pointToken;
                localPlayer.popularityTrack.rewardToken = remotePlayer.popularityTrack.rewardToken;
                localPlayer.popularityTrack.levelReached = [...remotePlayer.popularityTrack.levelReached];
                localPlayer.score = remotePlayer.score;
                localPlayer.scoreFromMonsters = remotePlayer.scoreFromMonsters;
                localPlayer.scoreFromMilestones = remotePlayer.scoreFromMilestones;
                localPlayer.scoreFromPopularity = remotePlayer.scoreFromPopularity;
                localPlayer.scoreFromPlaza = remotePlayer.scoreFromPlaza;
                localPlayer.scoreFromFakeBlood = remotePlayer.scoreFromFakeBlood;
                localPlayer.scoreFromOther = remotePlayer.scoreFromOther;
                localPlayer.maxInventoryCapacity = remotePlayer.maxInventoryCapacity;
                localPlayer.hunterAloneCount = remotePlayer.hunterAloneCount;
                localPlayer.apprenticeWithHuntersCount = remotePlayer.apprenticeWithHuntersCount;
                if (remotePlayer.locationSelections) {
                    localPlayer.locationSelections = JSON.parse(JSON.stringify(remotePlayer.locationSelections));
                }

                // Update weapon stats
                if (remotePlayer.weapon) {
                    localPlayer.weapon.currentAttackDice = remotePlayer.weapon.currentAttackDice;
                    localPlayer.weapon.currentDefenseDice = remotePlayer.weapon.currentDefenseDice;
                    localPlayer.weapon.attackLevel = remotePlayer.weapon.attackLevel;
                    localPlayer.weapon.defenseLevel = remotePlayer.weapon.defenseLevel;
                    localPlayer.weapon.powerTrackPosition = remotePlayer.weapon.powerTrackPosition;
                    if (remotePlayer.weapon.damage) localPlayer.weapon.damage = [...remotePlayer.weapon.damage];
                    if (remotePlayer.weapon.capacity !== undefined) localPlayer.weapon.capacity = remotePlayer.weapon.capacity;
                    if (remotePlayer.weapon.priority !== undefined) localPlayer.weapon.priority = remotePlayer.weapon.priority;
                }

                // Update inventory
                localPlayer.inventory = (remotePlayer.inventory || []).map(item => {
                    // Re-resolve from store items to get full item data
                    const storeItem = this.storeItems.find(si => si.name === item.name);
                    return storeItem ? { ...storeItem } : { ...item };
                });
            });
        }

        // Update dummy tokens
        if (state.dummyTokens) {
            this.dummyTokens = [...state.dummyTokens];
        }

        // Update player completion status
        if (state.playerCompletionStatus) {
            this.playerCompletionStatus = { ...state.playerCompletionStatus };
            // Update the status indicator UI for each player
            for (const [playerId, isComplete] of Object.entries(state.playerCompletionStatus)) {
                this.updatePlayerStatus(parseInt(playerId), isComplete);
                // Stop phase timer for completed players (guest side sync)
                if (isComplete && !this.isHost) {
                    this.stopPhaseTimer(parseInt(playerId));
                }
            }
        }

        // Handle phase transitions for guest
        const prevPhase = this.roundPhase;
        this.roundPhase = state.roundPhase;

        // Update all displays
        this.updateResourceDisplay();
        this.players.forEach(p => this.updateInventoryDisplay(p.id));
        this.updateDummyTokenDisplay();
        this.players.forEach(p => this.updatePopularityTrackDisplay(p.id));
        this.updatePetDisplay();
        this.applyPlayerNameColors();

        // Refresh button states so upgrade/restore buttons reflect synced resources
        this.refreshAllPlayerButtonStates();

        // Update game log from host: each entry is a structured {key, args, category, playerColor}
        // pair. Translate locally so the guest sees everything in their own chosen language.
        if (state.battleLog && state.battleLog.length > 0) {
            const logEl = document.getElementById('game-log');
            if (logEl) {
                logEl.innerHTML = '';
                state.battleLog.forEach(entry => {
                    if (entry && typeof entry === 'object' && entry.key) {
                        // New structured format — translate locally
                        this.renderStructuredLogEntry(entry);
                        return;
                    }
                    // Backwards compat: legacy format (raw HTML or string)
                    const div = document.createElement('div');
                    if (typeof entry === 'object') {
                        div.className = entry.className || 'log-entry';
                        div.innerHTML = entry.html || '';
                        if (entry.borderColor) {
                            div.style.setProperty('border-left-color', entry.borderColor, 'important');
                        }
                    } else {
                        div.className = 'log-entry';
                        div.innerHTML = entry;
                    }
                    logEl.appendChild(div);
                });
                logEl.scrollTop = logEl.scrollHeight;
            }
        }

        // Handle phase-specific guest UI updates
        this.handleGuestPhaseUpdate(state, prevPhase);

        // Handle kick vote state from host
        this.handleGuestKickVoteState(state);

        // Handle phase time limit from host
        if (state.phaseTimeLimit !== undefined && !this.isHost) {
            this.phaseTimeLimit = state.phaseTimeLimit;
        }
    }

    handleGuestPhaseUpdate(state, prevPhase) {
        const phase = state.roundPhase;

        if (phase === 'selection' && prevPhase !== 'selection') {
            // New selection round — hide store/battle UI from previous phase
            const storeArea = document.getElementById('store-area');
            if (storeArea) storeArea.style.display = 'none';
            document.getElementById('monster-battle').style.display = 'none';

            // Hide "Current Player" text — not needed in online mode
            document.querySelector('.current-player').style.display = 'none';

            // Clear all player tokens from the board
            document.querySelectorAll('.token:not(.dummy-token)').forEach(token => token.remove());
            // Update dummy token positions
            this.updateDummyTokenDisplay();

            this.addLogEntryT('log.roundStarted', [this.currentRound], 'round-start');
            this.createLocationCards();
            this.updateLocationCardStates();
            document.getElementById('status-message').textContent = t('status.selectLocationsBare');
            // Show player status indicators
            this.initializePlayerStatusIndicators();
            this.showPlayerStatusIndicators();
            this.setPhaseTitle(t('phase.selection'));
            // Enable confirm button
            const confirmBtn = document.getElementById('confirm-selection');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = t('status.selectBothLocations');
                confirmBtn.style.display = 'inline-block';
            }
            // Show card selection UI
            const cardSelection = document.querySelector('.card-selection');
            if (cardSelection) cardSelection.style.display = 'grid';
            // Reset selections
            const localPlayer = this.players[this.localPlayerId];
            if (localPlayer) {
                localPlayer.selectedCards = { hunter: null, apprentice: null };
            }

            // Disable apprentice Forest card by default (only enabled when hunter selects Forest)
            const apprenticeForestCard = document.querySelector(`#apprentice-cards .location-card[data-location-id="7"]`);
            if (apprenticeForestCard) {
                apprenticeForestCard.classList.add('disabled');
                apprenticeForestCard.style.cursor = 'not-allowed';
                apprenticeForestCard.style.pointerEvents = 'none';
                apprenticeForestCard.style.backgroundColor = '#7f8c8d';
                apprenticeForestCard.style.borderColor = '#95a5a6';
                apprenticeForestCard.style.opacity = '0.5';
            }

            // Initialize and start local phase timers for guest
            this.initPhaseTimers();
            this.players.forEach(p => {
                if (!p.isBot) this.startPhaseTimer(p.id);
            });
        }

        // Keep status indicators visible and updated during selection/store phases
        if (phase === 'selection' || phase === 'store') {
            this.showPlayerStatusIndicators();
            if (phase === 'selection') this.setPhaseTitle(t('phase.selection'));
            else if (phase === 'store') this.setPhaseTitle(t('phase.store'));
        }

        if (phase === 'distribution') {
            // Show tokens on board
            document.querySelectorAll('.token:not(.dummy-token)').forEach(token => token.remove());
            this.players.forEach(player => {
                if (player.selectedCards.hunter) this.placeToken(player.id, 'hunter', player.selectedCards.hunter);
                if (player.selectedCards.apprentice) this.placeToken(player.id, 'apprentice', player.selectedCards.apprentice);
            });
            // Hide selection UI
            document.querySelector('.card-selection').style.display = 'none';
            document.getElementById('confirm-selection').style.display = 'none';
        }

        if (phase === 'station' && state.guestStationChoice) {
            // Only show station modal if THIS player needs to choose
            const pendingIds = state.pendingStationPlayerIds || [];
            if (pendingIds.includes(this.localPlayerId)) {
                this.showStationModalForGuest(state);
            }
        }

        if (phase === 'store') {
            if (state.guestStorePhase && !this.playerCompletionStatus[this.localPlayerId]) {
                // Show/refresh store for guest player
                const guestPlayer = this.players[this.localPlayerId];
                if (guestPlayer) {
                    this.showStoreForPlayer(guestPlayer);
                }
            }
            // Initialize guest timers when first entering store phase
            if (prevPhase !== 'store') {
                this.initPhaseTimers();
                this.players.forEach(p => {
                    if (!p.isBot) this.startPhaseTimer(p.id);
                });
            }
        }

        if (phase === 'battle') {
            // Check if guest received a forest failure notification
            if (state.forestFailure && state.forestFailure.playerId === this.localPlayerId) {
                document.getElementById('forest-failure-message').textContent = state.forestFailure.message;
                document.getElementById('forest-failure-modal').style.display = 'flex';
            }
            // Show battle phase title for guest
            const battlePlayerId = state.currentBattlePlayerId !== undefined ? state.currentBattlePlayerId : (state.battleState ? state.battleState.playerId : undefined);
            if (battlePlayerId !== undefined) {
                const battlePlayer = this.players.find(p => p.id === battlePlayerId);
                if (battlePlayer) {
                    this.showPlayerStatusIndicators(true);
                    this.setPhaseTitle(t('phase.battle', this.getPlayerDisplayName(battlePlayer)));
                    // Show the battling player's status div so their timer is visible
                    const battleStatusDiv = document.querySelector(`.player-status[data-player-id="${battlePlayerId}"]`);
                    if (battleStatusDiv) {
                        battleStatusDiv.style.display = 'flex';
                    }
                }
            }
            // Update phaseTimeLimit before battle handler uses it
            if (state.phaseTimeLimit !== undefined) {
                this.phaseTimeLimit = state.phaseTimeLimit;
            }
            this.handleGuestBattleStateUpdate(state);
        }

        if (phase === 'gameover' && state.winner !== undefined) {
            const winner = this.players.find(p => p.id === state.winner);
            if (winner) {
                this.endGameOnline(winner);
            }
        }

        if (phase === 'capacityOverflow' && state.guestOverflow) {
            // Guest needs to resolve capacity overflow — start local timer
            const guestPlayer = this.players[this.localPlayerId];
            if (guestPlayer && this.getInventorySize(guestPlayer) > guestPlayer.maxInventoryCapacity) {
                this.initPhaseTimerForPlayer(this.localPlayerId);
                this.startPhaseTimer(this.localPlayerId);
                this.handleCapacityOverflow([this.localPlayerId]);
            }
        }
    }

    // ==================== ONLINE: SELECTION PHASE ====================

    startOnlineSelectionPhase() {
        // Host: show selection UI, run bots instantly, wait for both humans
        this.roundPhase = 'selection';
        this.resetPlayerCompletionStatus();
        this.showPlayerStatusIndicators();
        this.setPhaseTitle(t('phase.selection'));

        // Initialize phase timers for this phase
        this.initPhaseTimers();

        // Hide "Current Player" text — not needed in online mode
        document.querySelector('.current-player').style.display = 'none';

        // Ensure store/battle UIs are hidden from previous phase
        const storeArea = document.getElementById('store-area');
        if (storeArea) storeArea.style.display = 'none';
        document.getElementById('monster-battle').style.display = 'none';

        // Run bot selections immediately
        const botPlayers = this.players.filter(p => p.isBot);
        botPlayers.forEach((player, i) => {
            setTimeout(() => {
                this.handleBotLocationSelection(player.id);
                this.updatePlayerStatus(player.id, true);

                // After last bot completes, push state so guest sees bot statuses & start human timers
                if (i === botPlayers.length - 1) {
                    const state = this.serializeGameState();
                    state.roundPhase = 'selection';
                    state.phaseTimeLimit = this.phaseTimeLimit;
                    this.onlineManager.pushGameState(state);

                    // Start timers for all human players
                    this.players.forEach(p => {
                        if (!p.isBot) this.startPhaseTimer(p.id);
                    });
                }
            }, 50 * (i + 1));
        });

        // Handle no-bot case: timers and state push never happen inside the forEach
        if (botPlayers.length === 0) {
            const state = this.serializeGameState();
            state.roundPhase = 'selection';
            state.phaseTimeLimit = this.phaseTimeLimit;
            this.onlineManager.pushGameState(state);

            this.players.forEach(p => {
                if (!p.isBot) this.startPhaseTimer(p.id);
            });
        }

        // Show selection UI for host
        const cardSelection = document.querySelector('.card-selection');
        if (cardSelection) cardSelection.style.display = 'grid';
        this.createLocationCards();
        this.updateLocationCardStates();
        document.getElementById('status-message').textContent = t('status.selectLocationsBare');
        const confirmBtn = document.getElementById('confirm-selection');
        if (confirmBtn) {
            confirmBtn.textContent = t('status.selectBothLocations');
            confirmBtn.disabled = true;
            confirmBtn.style.display = 'inline-block';
        }

        // Push initial state so guest can see selection phase started
        const state = this.serializeGameState();
        state.roundPhase = 'selection';
        this.onlineManager.pushGameState(state);
    }

    confirmSelectionOnline() {
        // Called when the local player (host or guest) confirms their selection
        const localPlayer = this.players[this.localPlayerId];
        if (!localPlayer) return;

        if (localPlayer.selectedCards.hunter === null || localPlayer.selectedCards.apprentice === null) {
            return;
        }

        if (this.isHost) {
            // Host confirms directly - same forest warning logic
            if (localPlayer.selectedCards.hunter === 7) {
                let warningMessages = [];
                if (localPlayer.resources.ep < 2) {
                    warningMessages.push(t('forestWarn.needEP', localPlayer.resources.ep));
                }
                if (!this.hasRequiredAmmunition(localPlayer)) {
                    if (localPlayer.weapon.name === 'Rifle') {
                        const bullets = localPlayer.inventory.filter(i => i.name === 'Bullet').length;
                        warningMessages.push(t('forestWarn.needBullets', bullets));
                    } else if (localPlayer.weapon.name === 'Plasma') {
                        const batteries = localPlayer.inventory.filter(i => i.name === 'Battery').length;
                        warningMessages.push(t('forestWarn.needBatteries', batteries));
                    }
                }
                if (warningMessages.length > 0) {
                    let msg = t('forestWarn.title') + '\n\n' + warningMessages.join('\n') + '\n\n' + t('forestWarn.proceedShort');
                    if (!confirm(msg)) return;
                }
            }

            // Track selection
            const hunterLoc = localPlayer.selectedCards.hunter;
            const apprenticeLoc = localPlayer.selectedCards.apprentice;
            localPlayer.locationSelections[hunterLoc].hunter++;
            localPlayer.locationSelections[apprenticeLoc].apprentice++;

            this.pendingSelectionLogs.push({
                key: 'log.playerSelected',
                args: [localPlayer, this.locationTArg(hunterLoc), this.locationTArg(apprenticeLoc)],
                type: 'selection',
                player: localPlayer
            });

            this.updatePlayerStatus(localPlayer.id, true);
            this.stopPhaseTimer(this.localPlayerId);

            // Push state so other players see host's status update
            const hostState = this.serializeGameState();
            hostState.roundPhase = 'selection';
            this.onlineManager.pushGameState(hostState);

            // Disable further selection UI while waiting for other players
            document.getElementById('confirm-selection').disabled = true;
            document.getElementById('status-message').textContent = t('status.waitingForOthers');
            document.querySelector('.card-selection').style.display = 'none';

            // Check if all done
            if (this.checkAllPlayersComplete()) {
                this.onlineSelectionComplete();
            }
        } else {
            // Guest sends selection to host via Firebase
            this.stopPhaseTimer(this.localPlayerId);
            this.onlineManager.pushAction({
                type: 'selection',
                playerId: this.localPlayerId,
                data: {
                    hunter: localPlayer.selectedCards.hunter,
                    apprentice: localPlayer.selectedCards.apprentice
                }
            });

            // Disable further selection UI
            document.getElementById('confirm-selection').disabled = true;
            document.getElementById('status-message').textContent = t('status.waitingForOthers');
            document.querySelector('.card-selection').style.display = 'none';
        }
    }

    onlineSelectionComplete() {
        // Host: all players have selected, proceed
        console.log('Online: All players completed selections');
        this.stopAllPhaseTimers();

        for (const logEntry of this.pendingSelectionLogs) {
            if (logEntry.key) {
                this.addLogEntryT(logEntry.key, logEntry.args || [], logEntry.type, logEntry.player);
            } else {
                this.addLogEntry(logEntry.message, logEntry.type, logEntry.player);
            }
        }
        this.pendingSelectionLogs = [];
        this.hidePlayerStatusIndicators();

        // Run distribution
        this.startResourceDistribution();

        // Push distribution state so guests can see tokens on the board
        const distState = this.serializeGameState();
        distState.roundPhase = 'distribution';
        this.onlineManager.pushGameState(distState);

        // After a delay, proceed to station/store
        setTimeout(() => {
            this.pushStateAfterDistribution();
        }, 1000);
    }

    pushOnlineBoardUpdate() {
        // Push current game state so all players see board changes
        if (!this.isHost || !this.onlineManager) return;
        const state = this.serializeGameState();
        state.roundPhase = this.roundPhase;
        // Preserve store phase flag so guests keep their store UI
        if (this.roundPhase === 'store') {
            state.guestStorePhase = true;
        }
        this.onlineManager.pushGameState(state);
    }

    pushStateAfterDistribution() {
        // Check if station choices are needed
        if (this.pendingStationPlayers && this.pendingStationPlayers.length > 0) {
            // Check if any non-host human needs to make a station choice
            const remoteHumansNeedStation = this.pendingStationPlayers.some(pid => {
                const p = this.players.find(pl => pl.id === pid);
                return p && !p.isBot && pid !== this.localPlayerId;
            });
            const state = this.serializeGameState();
            state.roundPhase = 'station';
            if (remoteHumansNeedStation) {
                state.guestStationChoice = true;
                state.stationTotalCount = this.stationTotalCount;
                state.pendingStationPlayerIds = [...this.pendingStationPlayers];
            }
            this.onlineManager.pushGameState(state);
            // Process station for host/bots, wait for remote humans if needed
            this.processOnlineStationPhase();
        } else {
            // No station needed, go to store
            this.enterStorePhaseOnline();
        }
    }

    // ==================== ONLINE: STATION PHASE ====================

    processOnlineStationPhase() {
        // Host processes station choices for bots and self
        if (!this.pendingStationPlayers || this.pendingStationPlayers.length === 0) {
            this.distributeStationResources();
            this.enterStorePhaseOnline();
            return;
        }

        const playerId = this.pendingStationPlayers[0];
        const player = this.players.find(p => p.id === playerId);

        if (player.isBot) {
            this.handleBotStationSelection(player);
            // Bot selection removes from pending and calls showStationModal
            // Override showStationModal to use our online version
            return;
        }

        if (playerId === this.localPlayerId) {
            // Host makes station choice via normal UI
            this.showStationModal();
        } else {
            // Guest needs to make choice - wait for action
            this.waitingForGuestAction = true;
        }
    }

    selectStationResourceOnline(resourceType) {
        if (this.isHost) {
            // Host selected - process normally
            this.selectStationResource(resourceType);
            // Check if we need to continue
            if (this.pendingStationPlayers.length === 0) {
                this.distributeStationResources();
                this.enterStorePhaseOnline();
            }
        } else {
            // Guest sends action
            this.onlineManager.pushAction({
                type: 'station_choice',
                playerId: this.localPlayerId,
                data: { resource: resourceType }
            });
            document.getElementById('station-modal').style.display = 'none';
        }
    }

    showStationModalForGuest(state) {
        // Guest needs to choose station resource
        const player = this.players[this.localPlayerId];
        if (!player) return;

        this.stationTotalCount = state.stationTotalCount || 3;

        const workSite = this.locations.find(l => l.id === 1);
        const bar = this.locations.find(l => l.id === 2);
        const hospital = this.locations.find(l => l.id === 4);
        const dojo = this.locations.find(l => l.id === 5);

        document.getElementById('money-amount').textContent = this.getRewardAmount(workSite, this.stationTotalCount);
        document.getElementById('beer-amount').textContent = this.getRewardAmount(bar, this.stationTotalCount);
        document.getElementById('bloodBag-amount').textContent = this.getRewardAmount(hospital, this.stationTotalCount);
        document.getElementById('exp-amount').textContent = this.getRewardAmount(dojo, this.stationTotalCount);

        document.getElementById('station-modal-title').textContent = t('station.modalTitle', this.getPlayerDisplayName(player));
        document.getElementById('station-modal').style.display = 'flex';
        this.pendingStationPlayer = this.localPlayerId;
    }

    // ==================== ONLINE: STORE PHASE ====================

    enterStorePhaseOnline() {
        this.roundPhase = 'store';
        this.currentStorePlayer = 0;
        this.storePhaseCompleted = false;
        this.resetPlayerCompletionStatus();
        this.showPlayerStatusIndicators();
        this.setPhaseTitle(t('phase.store'));

        // Initialize phase timers
        this.initPhaseTimers();

        // Bots shop immediately
        this.players.forEach((player) => {
            if (player.isBot) {
                this.handleBotShopping(player);
                this.updatePlayerStatus(player.id, true);
            }
        });

        // Show store for host
        const hostPlayer = this.players[this.localPlayerId];
        if (hostPlayer && !hostPlayer.isBot) {
            this.showStoreForPlayer(hostPlayer);
        }

        // Start timers for all human players
        this.players.forEach(p => {
            if (!p.isBot) this.startPhaseTimer(p.id);
        });

        // Push state so guest can see store
        const state = this.serializeGameState();
        state.roundPhase = 'store';
        state.guestStorePhase = true;
        state.phaseTimeLimit = this.phaseTimeLimit;
        this.onlineManager.pushGameState(state);
    }

    finishShoppingOnline() {
        if (this.isHost) {
            // Host finished shopping
            this.updatePlayerStatus(this.localPlayerId, true);
            this.stopPhaseTimer(this.localPlayerId);
            document.getElementById('store-area').style.display = 'none';

            // Push state so other players see host's status update
            const hostState = this.serializeGameState();
            hostState.roundPhase = 'store';
            hostState.guestStorePhase = true;
            this.onlineManager.pushGameState(hostState);

            // Check if all done (guest may still be shopping)
            if (this.checkAllPlayersComplete()) {
                this.onlineStoreComplete();
            }
        } else {
            // Guest sends finish signal
            this.stopPhaseTimer(this.localPlayerId);
            this.onlineManager.pushAction({
                type: 'finish_shopping',
                playerId: this.localPlayerId
            });
            document.getElementById('store-area').style.display = 'none';
            document.getElementById('status-message').textContent = t('status.waitingForOthers');
        }
    }

    onlineStoreComplete() {
        this.storePhaseCompleted = true;
        this.stopAllPhaseTimers();
        this.hidePlayerStatusIndicators();

        // Check capacity overflow
        let hostOverflow = false;
        let guestOverflow = false;

        this.players.forEach(player => {
            if (this.getInventorySize(player) > player.maxInventoryCapacity) {
                if (player.isBot) {
                    const botPlayer = new BotPlayer(player.id, player.weapon);
                    botPlayer.handleBotCapacityOverflow(player, this);
                    this.updateResourceDisplay();
                    this.updateInventoryDisplay(player.id);
                } else if (player.id === this.localPlayerId) {
                    hostOverflow = true;
                } else {
                    guestOverflow = true;
                }
            }
        });

        if (hostOverflow) {
            // Start a fresh phase timer for the host's overflow
            this.initPhaseTimerForPlayer(this.localPlayerId);
            this.startPhaseTimer(this.localPlayerId);
            this.handleCapacityOverflow([this.localPlayerId]);
            // After overflow resolved, check if guest needs overflow too
            return;
        }

        if (guestOverflow) {
            // Start a fresh phase timer for the guest's overflow
            const guestId = this.players.find(p => !p.isBot && p.id !== this.localPlayerId &&
                this.getInventorySize(p) > p.maxInventoryCapacity)?.id;
            if (guestId !== undefined) {
                this.initPhaseTimerForPlayer(guestId);
                this.startPhaseTimer(guestId);
            }
            // Push state telling guest to resolve overflow
            const state = this.serializeGameState();
            state.roundPhase = 'capacityOverflow';
            state.guestOverflow = true;
            state.phaseTimeLimit = this.phaseTimeLimit;
            this.onlineManager.pushGameState(state);
            return;
        }

        this.proceedAfterStore();
    }

    proceedAfterStore() {
        // Check forest readiness and start battle
        // checkForestReadiness -> startBattlePhase -> startBattlePhaseOnline (for online host)
        this.checkForestReadiness();
    }

    // ==================== ONLINE: BATTLE PHASE ====================

    startBattlePhaseOnline() {
        this.roundPhase = 'battle';

        this.forestPlayersThisRound = new Set();
        this.players.forEach(player => {
            if (player.tokens.hunter === 7) {
                this.forestPlayersThisRound.add(player.id);
            }
        });

        let forestHunters = [];
        this.players.forEach(player => {
            if (player.tokens.hunter === 7 && !(this.failedForestPlayers || []).includes(player.id)) {
                forestHunters.push(player.id);
            }
        });

        if (forestHunters.length > 0) {
            forestHunters.sort((a, b) => {
                const playerA = this.players.find(p => p.id === a);
                const playerB = this.players.find(p => p.id === b);
                if (playerA.score !== playerB.score) return playerA.score - playerB.score;
                return playerA.weapon.priority - playerB.weapon.priority;
            });

            this.handleForestEncountersOnline(forestHunters);
        } else {
            this.endRoundOnline();
        }
    }

    handleForestEncountersOnline(forestHunters) {
        if (forestHunters.length === 0) {
            this.endRoundOnline();
            return;
        }

        this.currentMonsterPlayer = forestHunters[0];
        this.remainingForestHunters = forestHunters.slice(1);
        this.playerShownMonsters[this.currentMonsterPlayer] = new Set();

        // Show battle phase title (no red/green indicators)
        const battlePlayer = this.players.find(p => p.id === this.currentMonsterPlayer);
        if (battlePlayer) {
            this.showPlayerStatusIndicators(true);
            this.setPhaseTitle(t('phase.battle', this.getPlayerDisplayName(battlePlayer)));
            // Show the battling player's status div so their timer is visible
            const battleStatusDiv = document.querySelector(`.player-status[data-player-id="${battlePlayer.id}"]`);
            if (battleStatusDiv) {
                battleStatusDiv.style.display = 'flex';
            }
        }

        const player = this.players.find(p => p.id === this.currentMonsterPlayer);

        if (player.isBot) {
            // Bot battles run on host
            this.handleBotMonsterSelection(player);
            return;
        }

        // Init and start a phase timer for the battling human player
        this.stopAllPhaseTimers();
        this.expiredTimerPlayers = [];
        this.phaseTimersPaused = false;
        this.phaseTimers = {};
        this.phaseTimers[player.id] = {
            remaining: this.phaseTimeLimit * 1000,
            intervalId: null,
            running: false
        };
        this.updatePhaseTimerDisplay(player.id);
        this.startPhaseTimer(player.id);

        if (player.id === this.localPlayerId && this.isHost) {
            // Host's battle - show monster modal normally
            this.selectedMonsterLevel = null;
            this.selectedPets = { level1: 0, level2: 0, level3: 0 };
            this.selectedBeerConsumption = 0;
            this.overflowEP = 0;

            document.querySelectorAll('.monster-choice').forEach(btn => btn.classList.remove('selected'));
            this.updatePetSelectionUI();
            document.getElementById('monster-modal-title').textContent = t('monster.chooseTitle', this.getPlayerDisplayName(player));
            document.getElementById('monster-modal').style.display = 'flex';

            // Push state so guests can see spectator view during monster selection
            const selectState = this.serializeGameState();
            selectState.roundPhase = 'battle';
            selectState.guestBattle = false;
            selectState.battlePhase = 'monster_select';
            selectState.currentBattlePlayerId = player.id;
            this.onlineManager.pushGameState(selectState);
        } else {
            // Guest's battle - push state telling guest to select monster
            const state = this.serializeGameState();
            state.roundPhase = 'battle';
            state.guestBattle = true;
            state.battlePhase = 'monster_select';
            state.currentBattlePlayerId = player.id;
            state.phaseTimeLimit = this.phaseTimeLimit;
            this.onlineManager.pushGameState(state);
            this.waitingForGuestAction = true;

            // Show host spectator view during guest's monster selection
            this.showMonsterSelectSpectator(player.name);
        }
    }

    handleGuestBattleStateUpdate(state) {
        if (!state.guestBattle) {
            // Not the guest's battle - spectate if there's an active battle
            if (state.battleState) {
                this.showBattleSpectator(state.battleState);
            } else if (state.battlePhase === 'monster_select' && state.currentBattlePlayerId !== undefined) {
                const battlePlayer = this.players.find(p => p.id === state.currentBattlePlayerId);
                this.showMonsterSelectSpectator(battlePlayer ? battlePlayer.name : 'Unknown');
            } else if (state.battlePhase === 'monster_preview' && state.monsterPreview) {
                const battlePlayer = this.players.find(p => p.id === state.currentBattlePlayerId);
                this.showMonsterPreviewSpectator(battlePlayer ? battlePlayer.name : 'Unknown', state.monsterPreview);
            } else {
                document.getElementById('monster-battle').style.display = 'none';
            }
            return;
        }

        if (state.currentBattlePlayerId !== this.localPlayerId) {
            // Spectating someone else's battle
            if (state.battleState) {
                this.showBattleSpectator(state.battleState);
            } else if (state.battlePhase === 'monster_select') {
                const battlePlayer = this.players.find(p => p.id === state.currentBattlePlayerId);
                this.showMonsterSelectSpectator(battlePlayer ? battlePlayer.name : 'Unknown');
            } else if (state.battlePhase === 'monster_preview' && state.monsterPreview) {
                const battlePlayer = this.players.find(p => p.id === state.currentBattlePlayerId);
                this.showMonsterPreviewSpectator(battlePlayer ? battlePlayer.name : 'Unknown', state.monsterPreview);
            }
            return;
        }

        // Guest's own battle — hide any leftover spectator UI from prior bot battles
        // BUT skip if we're in the 3-second "battle ending" delay OR if the battle just ended
        // (so the player can see the victory/defeat result before the UI closes)
        if (!this.guestBattleEnding && state.battlePhase !== 'ended') {
            document.getElementById('monster-battle').style.display = 'none';
        }

        if (state.battlePhase === 'monster_select') {
            // Guest needs to select monster level — start local timer
            this.stopAllPhaseTimers();
            this.expiredTimerPlayers = [];
            this.phaseTimersPaused = false;
            this.phaseTimers = {};
            this.phaseTimers[this.localPlayerId] = {
                remaining: this.phaseTimeLimit * 1000,
                intervalId: null,
                running: false
            };
            this.startPhaseTimer(this.localPlayerId);
            this.updatePhaseTimerDisplay(this.localPlayerId);

            const player = this.players[this.localPlayerId];
            this.currentMonsterPlayer = this.localPlayerId; // Set for confirmBattleSelection
            this.selectedMonsterLevel = null;
            this.selectedPets = { level1: 0, level2: 0, level3: 0 };
            this.selectedBeerConsumption = 0;
            this.overflowEP = 0;

            document.querySelectorAll('.monster-choice').forEach(btn => btn.classList.remove('selected'));
            this.updatePetSelectionUI();
            document.getElementById('monster-modal-title').textContent = t('monster.chooseTitle', this.getPlayerDisplayName(player));
            document.getElementById('monster-modal').style.display = 'flex';
        }

        if (state.battlePhase === 'monster_preview' && state.monsterPreview) {
            // Hide monster level modal, show monster preview with Change/Fight buttons
            document.getElementById('monster-modal').style.display = 'none';
            this.showMonsterPreviewForGuest(state.monsterPreview);
        }

        if (state.battlePhase === 'active' && state.battleState) {
            // New active battle — cancel any ending state
            this.guestBattleEnding = false;
            // Hide monster selection modals if still showing
            document.getElementById('monster-modal').style.display = 'none';
            document.getElementById('monster-selection-modal').style.display = 'none';

            // Start battle timer for guest (only if not already running)
            const existingTimer = this.phaseTimers[this.localPlayerId];
            if (!existingTimer || !existingTimer.running) {
                this.stopAllPhaseTimers();
                this.expiredTimerPlayers = [];
                this.phaseTimersPaused = false;
                this.phaseTimers = {};
                this.phaseTimers[this.localPlayerId] = {
                    remaining: this.phaseTimeLimit * 1000,
                    intervalId: null,
                    running: false
                };
                this.startPhaseTimer(this.localPlayerId);
                this.updatePhaseTimerDisplay(this.localPlayerId);
            }

            // Active battle - guest sees battle UI with controls
            this.showBattleUIForGuest(state.battleState);
        }

        if (state.battlePhase === 'ended' && !this.guestBattleEnding) {
            // Stop battle timer
            this.stopAllPhaseTimers();

            // Update the battle log with the final state (includes reward messages,
            // weapon power advance, etc. that weren't in the last 'active' push)
            if (state.battleState && state.battleState.battleLogHTML) {
                const battleLog = document.getElementById('battle-log');
                if (battleLog) {
                    battleLog.innerHTML = state.battleState.battleLogHTML;
                }
            }

            // Set guard flag so subsequent state pushes don't hide the battle UI early
            this.guestBattleEnding = true;
            // Delay hiding to let guest see the final battle result (matches host's 3s delay)
            setTimeout(() => {
                document.getElementById('monster-battle').style.display = 'none';
                document.getElementById('battle-log').innerHTML = '';
                this.guestBattleEnding = false;
            }, 3000);
        }
    }

    showBattleSpectator(battleState) {
        if (!battleState || !battleState.isActive) {
            document.getElementById('monster-battle').style.display = 'none';
            return;
        }

        // Show battle UI in read-only mode
        document.getElementById('monster-battle').style.display = 'flex';
        document.getElementById('battle-player-name').textContent = battleState.playerName;
        document.getElementById('battle-player-hp').textContent = `${battleState.playerHP}/${battleState.playerMaxHP}`;
        document.getElementById('battle-player-ep').textContent = `${battleState.playerEP}/${battleState.playerMaxEP}`;

        if (battleState.monster) {
            document.getElementById('battle-monster-level').textContent = battleState.monster.level;
            document.getElementById('battle-monster-hp').textContent = `${battleState.monster.hp}/${battleState.monster.maxHp}`;
            document.getElementById('battle-monster-att').textContent = battleState.monster.attack;
        }

        // Show monster rewards
        if (battleState.monsterRewardsText) {
            document.getElementById('battle-monster-rewards').textContent = battleState.monsterRewardsText;
        }

        // Disable all buttons for spectator
        document.getElementById('battle-attack-btn').style.display = 'none';
        document.getElementById('battle-tame-btn').style.display = 'none';
        document.getElementById('battle-defense-btn').style.display = 'none';
        document.getElementById('battle-double-damage-btn').style.display = 'none';
        document.getElementById('battle-item-buttons').innerHTML = '';

        // Show battle log
        if (battleState.battleLogHTML) {
            document.getElementById('battle-log').innerHTML = battleState.battleLogHTML;
        }

        document.getElementById('battle-turn').textContent = t('battle.watching', this._translatePlayerName(battleState.playerName));
    }

    showMonsterSelectSpectator(playerName) {
        const battleDiv = document.getElementById('monster-battle');
        battleDiv.style.display = 'flex';

        document.getElementById('battle-player-name').textContent = playerName;
        document.getElementById('battle-player-hp').textContent = '';
        document.getElementById('battle-player-ep').textContent = '';

        // Clear monster stats
        document.getElementById('battle-monster-level').textContent = '?';
        document.getElementById('battle-monster-hp').textContent = '?';
        document.getElementById('battle-monster-att').textContent = '?';
        document.getElementById('battle-monster-rewards').textContent = '';

        // Hide all buttons
        document.getElementById('battle-attack-btn').style.display = 'none';
        document.getElementById('battle-tame-btn').style.display = 'none';
        document.getElementById('battle-defense-btn').style.display = 'none';
        document.getElementById('battle-double-damage-btn').style.display = 'none';
        document.getElementById('battle-item-buttons').innerHTML = '';

        document.getElementById('battle-log').innerHTML = '';
        document.getElementById('battle-turn').textContent = t('battle.choosingMonsterLevel', this._translatePlayerName(playerName));
    }

    showMonsterPreviewSpectator(playerName, monsterPreview) {
        const battleDiv = document.getElementById('monster-battle');
        battleDiv.style.display = 'flex';

        document.getElementById('battle-player-name').textContent = playerName;
        document.getElementById('battle-player-hp').textContent = '';
        document.getElementById('battle-player-ep').textContent = '';

        // Show monster stats
        document.getElementById('battle-monster-level').textContent = monsterPreview.level;
        document.getElementById('battle-monster-hp').textContent = `${monsterPreview.hp}/${monsterPreview.maxHp || monsterPreview.hp}`;
        document.getElementById('battle-monster-att').textContent = monsterPreview.att || monsterPreview.attack;

        // Show rewards
        let rewards = [];
        if (monsterPreview.pts > 0) rewards.push(`🏆${monsterPreview.pts}`);
        if (monsterPreview.money > 0) rewards.push(`💰${monsterPreview.money}`);
        if (monsterPreview.energy > 0) rewards.push(`🍺${monsterPreview.energy}`);
        if (monsterPreview.blood > 0) rewards.push(`🩸${monsterPreview.blood}`);
        document.getElementById('battle-monster-rewards').textContent = rewards.join(' ');

        // Hide all buttons
        document.getElementById('battle-attack-btn').style.display = 'none';
        document.getElementById('battle-tame-btn').style.display = 'none';
        document.getElementById('battle-defense-btn').style.display = 'none';
        document.getElementById('battle-double-damage-btn').style.display = 'none';
        document.getElementById('battle-item-buttons').innerHTML = '';

        document.getElementById('battle-log').innerHTML = '';
        document.getElementById('battle-turn').textContent = t('battle.encounteredMonster', this._translatePlayerName(playerName), monsterPreview.level);
    }

    showBattleUIForGuest(battleState) {
        // Show full battle UI with controls for the guest
        document.getElementById('monster-battle').style.display = 'flex';
        document.getElementById('battle-player-name').textContent = battleState.playerName;
        document.getElementById('battle-player-hp').textContent = `${battleState.playerHP}/${battleState.playerMaxHP}`;
        document.getElementById('battle-player-ep').textContent = `${battleState.playerEP}/${battleState.playerMaxEP}`;

        if (battleState.monster) {
            document.getElementById('battle-monster-level').textContent = battleState.monster.level;
            document.getElementById('battle-monster-hp').textContent = `${battleState.monster.hp}/${battleState.monster.maxHp}`;
            document.getElementById('battle-monster-att').textContent = battleState.monster.attack;
        }

        // Show monster rewards
        if (battleState.monsterRewardsText) {
            document.getElementById('battle-monster-rewards').textContent = battleState.monsterRewardsText;
        }

        // Show battle log (clear first to remove entries from previous battles)
        const battleLog = document.getElementById('battle-log');
        battleLog.innerHTML = '';
        if (battleState.battleLogHTML) {
            battleLog.innerHTML = battleState.battleLogHTML;
        }

        const attackBtn = document.getElementById('battle-attack-btn');
        const defenseBtn = document.getElementById('battle-defense-btn');
        const tameBtn = document.getElementById('battle-tame-btn');
        const doubleDamageBtn = document.getElementById('battle-double-damage-btn');
        const turnText = document.getElementById('battle-turn');
        const itemBtns = document.getElementById('battle-item-buttons');

        const turn = battleState.turn;
        const hasAttacked = battleState.hasAttacked || false;

        // Reset all buttons
        attackBtn.style.display = 'none';
        defenseBtn.style.display = 'none';
        tameBtn.style.display = 'none';
        doubleDamageBtn.style.display = 'none';
        itemBtns.innerHTML = '';

        if (turn === 'monster' || turn === 'monster_attack_first') {
            // Monster's turn — no controls
            turnText.textContent = t('battle.monsterIsAttacking');
        } else if (turn === 'player_items' && hasAttacked) {
            // After attacking — show Defense button, items, and possibly double damage
            // Tame is NOT available here — must wait until after monster attacks back
            turnText.textContent = t('battle.useItemsOrDefend');
            defenseBtn.style.display = 'inline-block';
            defenseBtn.disabled = false;
            defenseBtn.onclick = () => {
                this.onlineManager.pushAction({ type: 'battle_defense', playerId: this.localPlayerId });
                defenseBtn.disabled = true;
            };

            // Show double damage button if applicable (Knife Lv3)
            if (battleState.canUseDoubleDamage && !battleState.doubleDamageUsed) {
                doubleDamageBtn.style.display = 'inline-block';
                doubleDamageBtn.textContent = `2x Damage (+${battleState.lastAttackDamage || 0} extra)`;
                doubleDamageBtn.onclick = () => {
                    this.onlineManager.pushAction({ type: 'battle_use_double_damage', playerId: this.localPlayerId });
                    doubleDamageBtn.disabled = true;
                };
            }

            // Show usable items
            this.showGuestBattleItems(battleState, itemBtns);
        } else if (turn === 'player_items' || turn === 'player_items_after_monster' || turn === 'player') {
            // Player can attack — show Attack button and items
            turnText.textContent = t('battle.yourTurn');
            attackBtn.style.display = 'inline-block';
            attackBtn.disabled = false;
            attackBtn.onclick = () => {
                this.onlineManager.pushAction({ type: 'battle_attack', playerId: this.localPlayerId });
                attackBtn.disabled = true;
            };

            // Show tame button if applicable
            if (battleState.canTame) {
                tameBtn.style.display = 'inline-block';
                tameBtn.disabled = false;
                tameBtn.onclick = () => {
                    this.onlineManager.pushAction({ type: 'battle_tame', playerId: this.localPlayerId });
                    tameBtn.disabled = true;
                };
            }

            // Show usable items
            this.showGuestBattleItems(battleState, itemBtns);
        } else {
            turnText.textContent = t('battle.waiting');
        }
    }

    showMonsterPreviewForGuest(monsterData) {
        const player = this.players[this.localPlayerId];

        // Populate the existing monster-selection-modal with received monster data
        document.getElementById('monster-level-display').textContent = monsterData.level;

        const hpDisplay = document.getElementById('monster-hp-display');
        const originalHp = monsterData.maxHp || monsterData.hp;
        const battleHp = monsterData.hp;
        if (player && player.tokens.apprentice === 7 && originalHp !== battleHp) {
            hpDisplay.innerHTML = `${originalHp} → ${battleHp}`;
            hpDisplay.classList.add('hp-bonus');
        } else {
            hpDisplay.textContent = monsterData.hp;
            hpDisplay.classList.remove('hp-bonus');
        }

        document.getElementById('monster-att-display').textContent = monsterData.att;
        document.getElementById('monster-money-display').textContent = monsterData.money;
        document.getElementById('monster-energy-display').textContent = monsterData.energy;
        document.getElementById('monster-blood-display').textContent = monsterData.blood;
        document.getElementById('monster-pts-display').textContent = monsterData.pts;
        document.getElementById('monster-effect-display').textContent = this.getMonsterEffectDisplay(monsterData);

        // Hide beer section (beer was already consumed in level selection)
        const beerSection = document.getElementById('monster-select-beer-section');
        if (beerSection) beerSection.style.display = 'none';

        // Update Change button state
        this.updateChangeButtonState(this.localPlayerId, monsterData.level);

        // Show the modal
        document.getElementById('monster-selection-modal').style.display = 'flex';
    }

    showGuestBattleItems(battleState, itemBtns) {
        // Firebase drops empty arrays (converts [] to null), so treat missing as empty
        const inventory = battleState.playerInventory || [];

        const battleItems = [
            { name: 'Beer', icon: '🍺', effectKey: 'item.beer.battleEffect' },
            { name: 'Blood Bag', icon: '🩸', effectKey: 'item.bloodBag.battleEffect' },
            { name: 'Grenade', icon: '💣', effectKey: 'item.grenade.battleEffect' },
            { name: 'Bomb', icon: '💥', effectKey: 'item.bomb.battleEffect' },
            { name: 'Dynamite', icon: '🧨', effectKey: 'item.dynamite.battleEffect' },
            { name: 'Fake Blood', icon: '🩹', effectKey: 'item.fakeBlood.battleEffect' }
        ];

        battleItems.forEach(item => {
            const itemCount = inventory.filter(inv => inv.name === item.name).length;
            const btn = document.createElement('button');
            btn.className = 'battle-item-btn';
            btn.innerHTML = `${item.icon} ${this.getItemDisplayName(item.name)} (${itemCount})`;
            btn.title = t(item.effectKey);

            let isDisabled = itemCount === 0;

            if (item.name === 'Beer' && battleState.playerEP >= battleState.playerMaxEP) {
                isDisabled = true;
                btn.title = t('tooltip.epFull');
            }
            if (item.name === 'Blood Bag' && battleState.playerHP >= battleState.playerMaxHP) {
                isDisabled = true;
                btn.title = t('tooltip.hpFull');
            }

            btn.disabled = isDisabled;
            btn.onclick = () => {
                this.onlineManager.pushAction({ type: 'battle_use_item', playerId: this.localPlayerId, data: { itemName: item.name } });
                btn.disabled = true;
            };
            itemBtns.appendChild(btn);
        });
    }

    // ==================== ONLINE: GUEST ACTION HANDLING (HOST) ====================

    handleGuestAction(action) {
        if (!this.isHost) return;
        console.log('Host received guest action:', action.type, action);

        switch (action.type) {
            case 'selection':
                this.handleGuestSelection(action);
                break;
            case 'station_choice':
                this.handleGuestStationChoice(action);
                break;
            case 'purchase':
                this.handleGuestPurchase(action);
                break;
            case 'finish_shopping':
                this.handleGuestFinishShopping(action);
                break;
            case 'capacity_overflow_choice':
                this.handleGuestCapacityChoice(action);
                break;
            case 'monster_select':
                this.handleGuestMonsterSelect(action);
                break;
            case 'battle_attack':
                this.handleGuestBattleAttack(action);
                break;
            case 'battle_use_item':
                this.handleGuestBattleItem(action);
                break;
            case 'battle_tame':
                this.handleGuestBattleTame(action);
                break;
            case 'battle_use_double_damage':
                this.handleGuestBattleDoubleDamage(action);
                break;
            case 'battle_defense':
                this.handleGuestBattleDefense(action);
                break;
            case 'battle_select_pets':
                this.handleGuestBattlePets(action);
                break;
            case 'battle_change_monster':
                this.handleGuestChangeMonster(action);
                break;
            case 'battle_confirm':
                this.handleGuestBattleConfirm(action);
                break;
            case 'battle_fight':
                this.handleGuestFightMonster(action);
                break;
            case 'bat_power_choice':
                this.handleGuestBatPowerChoice(action);
                break;
            case 'player_board_action':
                this.handleGuestBoardAction(action);
                break;
            case 'kick_vote':
                this.handleGuestKickVote(action);
                break;
            default:
                console.warn('Unknown guest action:', action.type);
        }
    }

    handleGuestKickVote(action) {
        if (!this.kickVote || this.kickVote.resolved) return;
        const vote = action.data.vote;
        this.kickVote.votes[action.playerId] = vote;
        this.kickVote.voteOrder.push(action.playerId);
        this.updateKickVoteTally();

        // Push state so all clients see updated counts
        const state = this.serializeGameState();
        state.roundPhase = this.roundPhase;
        state.kickVote = this.serializeKickVote();
        this.onlineManager.pushGameState(state);

        this.checkKickVoteCompletion();
    }

    handleGuestBoardAction(action) {
        const { action: boardAction, upgradeType } = action.data;
        const playerId = action.playerId;

        // Suppress alerts on host when processing remote player actions
        this.suppressAlerts = true;
        switch (boardAction) {
            case 'restoreHP':
                this.restoreHP(playerId);
                break;
            case 'restoreEP':
                this.restoreEP(playerId);
                break;
            case 'upgradeWeapon':
                this.upgradeWeapon(playerId, upgradeType);
                break;
            case 'addToUpgrade':
                this.addToUpgrade(playerId, upgradeType);
                break;
        }
        this.suppressAlerts = false;
    }

    handleGuestSelection(action) {
        const guestPlayer = this.players.find(p => p.id === action.playerId);
        if (!guestPlayer) return;

        guestPlayer.selectedCards.hunter = action.data.hunter;
        guestPlayer.selectedCards.apprentice = action.data.apprentice;

        // Track location selections
        guestPlayer.locationSelections[action.data.hunter].hunter++;
        guestPlayer.locationSelections[action.data.apprentice].apprentice++;

        this.pendingSelectionLogs.push({
            key: 'log.playerSelected',
            args: [guestPlayer, this.locationTArg(action.data.hunter), this.locationTArg(action.data.apprentice)],
            type: 'selection',
            player: guestPlayer
        });

        this.updatePlayerStatus(guestPlayer.id, true);
        this.stopPhaseTimer(action.playerId);

        // Push state so all players see updated status
        const state = this.serializeGameState();
        state.roundPhase = 'selection';
        this.onlineManager.pushGameState(state);

        if (this.checkAllPlayersComplete()) {
            this.onlineSelectionComplete();
        }
    }

    handleGuestStationChoice(action) {
        const guestPlayer = this.players.find(p => p.id === action.playerId);
        if (!guestPlayer) return;

        this.stationChoices[action.playerId] = action.data.resource;

        // Remove from pending list
        const idx = this.pendingStationPlayers.indexOf(action.playerId);
        if (idx >= 0) this.pendingStationPlayers.splice(idx, 1);

        this.addLogEntryT('log.guestStationChoice', [guestPlayer, action.data.resource], 'resource-gain', guestPlayer);

        this.waitingForGuestAction = false;

        // Continue processing station
        if (this.pendingStationPlayers.length === 0) {
            this.distributeStationResources();
            this.enterStorePhaseOnline();
        } else {
            this.processOnlineStationPhase();
        }
    }

    handleGuestPurchase(action) {
        const guestPlayer = this.players.find(p => p.id === action.playerId);
        if (!guestPlayer) return;

        const itemName = action.data.itemName;

        // Look up item — check storeItems first, then handle special ammo items
        let item = this.storeItems.find(i => i.name === itemName);
        if (!item) {
            // Bullets and Batteries are dynamically added for Rifle/Plasma players
            if (itemName === 'Bullet') {
                item = { name: 'Bullet', size: 0, price: 2, effect: 'rifle_ammo', icon: '🔫' };
            } else if (itemName === 'Battery') {
                item = { name: 'Battery', size: 1, price: 2, effect: 'plasma_power', icon: '🔋' };
            } else {
                return;
            }
        }

        // Validate max ammo
        if (itemName === 'Bullet' && guestPlayer.inventory.filter(i => i.name === 'Bullet').length >= 6) return;
        if (itemName === 'Battery' && guestPlayer.inventory.filter(i => i.name === 'Battery').length >= 6) return;

        // Validate purchase
        let price = item.price;
        // Rifle Lv3 discount
        if (guestPlayer.weapon.name === 'Rifle' && guestPlayer.weapon.powerTrackPosition >= 7) {
            price = Math.max(1, price - 1);
        }

        if (guestPlayer.resources.money >= price) {
            guestPlayer.resources.money -= price;
            guestPlayer.inventory.push({ ...item, price });
            const itemKeyMap = { 'Beer': 'item.beer.name', 'Blood Bag': 'item.bloodBag.name', 'Grenade': 'item.grenade.name', 'Bomb': 'item.bomb.name', 'Dynamite': 'item.dynamite.name', 'Fake Blood': 'item.fakeBlood.name', 'Bullet': 'item.bullet.name', 'Battery': 'item.battery.name' };
            const itemArg = itemKeyMap[itemName] ? this.tArg(itemKeyMap[itemName]) : itemName;
            this.addLogEntryT('log.boughtItem', [guestPlayer, itemArg, price], 'store', guestPlayer);

            // Update host UI to reflect guest's purchase
            this.updateResourceDisplay();
            this.updateInventoryDisplay(guestPlayer.id);
            if (itemName === 'Bullet') this.updateBulletDisplay(guestPlayer.id);
            if (itemName === 'Battery') this.updateBatteryDisplay(guestPlayer.id);
        }

        // Push updated state to guest
        const state = this.serializeGameState();
        state.roundPhase = 'store';
        state.guestStorePhase = true;
        this.onlineManager.pushGameState(state);
    }

    handleGuestFinishShopping(action) {
        this.updatePlayerStatus(action.playerId, true);
        this.stopPhaseTimer(action.playerId);

        // Push state so all players see updated status
        const state = this.serializeGameState();
        state.roundPhase = 'store';
        this.onlineManager.pushGameState(state);

        // Check if all done
        if (this.checkAllPlayersComplete()) {
            this.onlineStoreComplete();
        }
    }

    handleGuestCapacityChoice(action) {
        const guestPlayer = this.players.find(p => p.id === action.playerId);
        if (!guestPlayer) return;

        const { actionType, itemIndex } = action.data;

        if (actionType === 'discard') {
            guestPlayer.inventory.splice(itemIndex, 1);
        } else if (actionType === 'use') {
            const item = guestPlayer.inventory[itemIndex];
            if (item) {
                if (item.name === 'Beer') {
                    guestPlayer.resources.ep = Math.min(guestPlayer.resources.ep + 1, guestPlayer.maxResources.ep);
                } else if (item.name === 'Blood Bag') {
                    guestPlayer.resources.hp = Math.min(guestPlayer.resources.hp + 1, guestPlayer.maxResources.hp);
                }
                guestPlayer.inventory.splice(itemIndex, 1);
            }
        } else if (actionType === 'upgrade') {
            const item = guestPlayer.inventory[itemIndex];
            if (item) {
                const upgradeType = item.name === 'Beer' ? 'ep' : 'hp';
                const required = upgradeType === 'ep' ? 4 : 3;
                guestPlayer.inventory.splice(itemIndex, 1);
                guestPlayer.upgradeProgress[upgradeType]++;
                if (guestPlayer.upgradeProgress[upgradeType] === required) {
                    this.levelUpMaxResource(guestPlayer.id, upgradeType, 1);
                    guestPlayer.upgradeProgress[upgradeType] = 0;
                }
            }
        }

        // Update host UI to reflect guest's changes
        this.updateResourceDisplay();
        this.updateInventoryDisplay(guestPlayer.id);

        // Check if overflow resolved
        if (this.getInventorySize(guestPlayer) <= guestPlayer.maxInventoryCapacity) {
            // Overflow resolved, push state and proceed
            const state = this.serializeGameState();
            state.roundPhase = 'store'; // Back to normal flow
            this.onlineManager.pushGameState(state);
            this.proceedAfterStore();
        } else {
            // Still overflowing, push state so guest can continue resolving
            const state = this.serializeGameState();
            state.roundPhase = 'capacityOverflow';
            state.guestOverflow = true;
            this.onlineManager.pushGameState(state);
        }
    }

    handleGuestMonsterSelect(action) {
        const guestPlayer = this.players.find(p => p.id === action.playerId);
        if (!guestPlayer) return;

        const { level, pets, beerConsumption } = action.data;

        // Apply beer consumption
        if (beerConsumption && beerConsumption > 0) {
            for (let i = 0; i < beerConsumption; i++) {
                const beerIdx = guestPlayer.inventory.findIndex(item => item.name === 'Beer');
                if (beerIdx >= 0) {
                    guestPlayer.inventory.splice(beerIdx, 1);
                    guestPlayer.resources.ep = Math.min(guestPlayer.resources.ep + 1, guestPlayer.maxResources.ep);
                }
            }
        }

        // Deduct EP cost
        const epCost = level;
        let petCost = 0;
        if (pets) {
            petCost = (pets.level1 || 0) * 2 + (pets.level2 || 0) * 3 + (pets.level3 || 0) * 4;
        }
        // Apply taming cost reduction for Whip
        let totalEPCost = epCost + petCost;
        if (guestPlayer.weapon.name === 'Whip') {
            if (guestPlayer.weapon.powerTrackPosition >= 7) {
                totalEPCost = 0; // Lv3: Free taming
            } else if (guestPlayer.weapon.powerTrackPosition >= 1) {
                totalEPCost = Math.max(0, totalEPCost - 1); // Lv1: -1 EP
            }
        }
        guestPlayer.resources.ep -= totalEPCost;

        // Store pets for later battle start
        this.guestSelectedPets = pets || { level1: 0, level2: 0, level3: 0 };

        // Get monster (level from guest includes +1 offset for EP cost, subtract 1 for actual monster level)
        const monsterLevel = level - 1;
        const monster = this.selectRandomAvailableMonster(monsterLevel, guestPlayer.id);
        if (!monster) {
            console.warn(`No available monsters at level ${level} for guest`);
            return;
        }
        monster.maxHp = monster.hp;

        // Apply other monsters HP bonus if active (effects 8, 16, 33)
        const hpBonus = this.activeMonsterEffects.find(effect => effect.type === 'otherMonstersHPBonus');
        if (hpBonus) {
            monster.hp += hpBonus.value;
            monster.maxHp += hpBonus.value;
        }

        // Check if player's apprentice is in Forest for -1 HP bonus
        if (guestPlayer.tokens.apprentice === 7) {
            monster.hp = Math.max(1, monster.hp - 1);
        }

        // Track shown monster
        if (!this.playerShownMonsters[guestPlayer.id]) {
            this.playerShownMonsters[guestPlayer.id] = new Set();
        }
        this.playerShownMonsters[guestPlayer.id].add(monster.index);

        // Store the monster for later (change monster / fight)
        this.currentSelectedMonster = monster;
        this.currentMonsterPlayer = guestPlayer.id;
        this.monsterSelectionEPSpent = 0;

        // Push monster preview to guest (NOT starting battle yet)
        this.pushMonsterPreviewToGuest(guestPlayer.id, monster);
    }

    handleGuestBattleAttack(action) {
        // Execute attack on host using existing logic
        this.playerAttackMonster();

        // Update host spectator view and push to other players
        this.updateHostSpectatorView();
        if (this.currentBattle) {
            setTimeout(() => {
                if (this.currentBattle) {
                    this.pushBattleStateToGuest();
                }
            }, 100);
        }
    }

    handleGuestBattleItem(action) {
        this.useBattleItem(action.data.itemName);
        this.updateHostSpectatorView();
        // State push is already handled inside useBattleItem() at line 9850
        // (or inside monsterDefeated() if the item killed the monster).
    }

    handleGuestBattleTame(action) {
        this.tameMonster();

        this.updateHostSpectatorView();
        // Taming calls monsterDefeated which handles its own push
        if (this.currentBattle) {
            setTimeout(() => {
                if (this.currentBattle) {
                    this.pushBattleStateToGuest();
                }
            }, 100);
        }
    }

    handleGuestBattleDefense(action) {
        // Guest proceeds to defense — trigger monster attack
        this.playerDefense();

        this.updateHostSpectatorView();
        // Push immediate state so guest sees "Monster is attacking..."
        // monsterAttackPlayer (after 1000ms) will push again with the result
        if (this.currentBattle) {
            this.pushBattleStateToGuest();
        }
    }

    handleGuestBattleDoubleDamage(action) {
        this.useDoubleDamage();

        this.updateHostSpectatorView();
        if (this.currentBattle) {
            setTimeout(() => {
                if (this.currentBattle) {
                    this.pushBattleStateToGuest();
                }
            }, 100);
        }
    }

    handleGuestBattlePets(action) {
        this.selectedPets = action.data;
    }

    updateHostSpectatorView() {
        // Refresh the host's spectator view of a remote player's battle
        if (!this.currentBattle) {
            document.getElementById('monster-battle').style.display = 'none';
            return;
        }
        const battleState = this.serializeBattleState();
        if (battleState) {
            this.showBattleSpectator(battleState);
        }
    }

    handleGuestChangeMonster(action) {
        // Guest wants to change monster - spend EP
        const player = this.players.find(p => p.id === action.playerId);
        if (!player || player.resources.ep <= 0) return;

        player.resources.ep--;
        this.monsterSelectionEPSpent++;

        // Select new random monster of the same level
        const currentLevel = this.currentSelectedMonster.level;
        const newMonster = this.selectRandomAvailableMonster(currentLevel, player.id);

        if (newMonster) {
            if (!this.playerShownMonsters[player.id]) {
                this.playerShownMonsters[player.id] = new Set();
            }
            this.playerShownMonsters[player.id].add(newMonster.index);

            newMonster.maxHp = newMonster.hp;

            // Apply HP bonuses
            const hpBonus = this.activeMonsterEffects.find(effect => effect.type === 'otherMonstersHPBonus');
            if (hpBonus) {
                newMonster.hp += hpBonus.value;
                newMonster.maxHp += hpBonus.value;
            }
            if (player.tokens.apprentice === 7) {
                newMonster.hp = Math.max(1, newMonster.hp - 1);
            }

            this.currentSelectedMonster = newMonster;

            this.addLogEntryT('log.spentEpChangeMonster', [player], 'system', player);
            this.pushMonsterPreviewToGuest(player.id, newMonster);
        } else {
            // No more monsters — refund EP
            player.resources.ep++;
            this.monsterSelectionEPSpent--;
            // Push updated state so guest sees no change
            this.pushMonsterPreviewToGuest(player.id, this.currentSelectedMonster);
        }
    }

    handleGuestBattleConfirm(action) {
        // Guest confirmed monster selection with level, pets, beer
        this.handleGuestMonsterSelect(action);
    }

    handleGuestFightMonster(action) {
        // Guest clicked "Fight!" — start the battle
        const player = this.players.find(p => p.id === action.playerId);
        if (!player || !this.currentSelectedMonster) return;

        const monster = this.currentSelectedMonster;

        // Check if monster requires extra EP (effects 6, 14, 30)
        const extraEPCost = this.getExtraEPCost(monster.effectId);
        if (extraEPCost > 0) {
            if (player.resources.ep >= extraEPCost) {
                this.modifyResource(player.id, 'ep', -extraEPCost);
            } else {
                // Can't afford — push state back so guest can change monster
                this.pushMonsterPreviewToGuest(player.id, monster);
                return;
            }
        }

        // Apply monster effects when confirmed
        if (monster.effectId) {
            this.currentMonsterEffect = monster.effectId;
            this.activeMonsterEffects.push(monster.effectId);
            this.applySelectionEffect(monster.effectId, player.id);
            this.applyRoundEffect(monster.effectId);
        }

        const selectedPets = this.guestSelectedPets || { level1: 0, level2: 0, level3: 0 };

        // Start battle on host
        this.startMonsterBattle(player.id, monster, selectedPets);

        // Push battle state to all players
        this.waitingForGuestAction = false;
        this.pushBattleStateToGuest();
    }

    pushMonsterPreviewToGuest(playerId, monster) {
        const state = this.serializeGameState();
        state.roundPhase = 'battle';
        state.guestBattle = true;
        state.battlePhase = 'monster_preview';
        state.currentBattlePlayerId = playerId;
        state.monsterPreview = {
            level: monster.level,
            hp: monster.hp,
            maxHp: monster.maxHp || monster.hp,
            att: monster.att,
            attack: monster.att,
            money: monster.money || 0,
            energy: monster.energy || 0,
            blood: monster.blood || 0,
            pts: monster.pts || 0,
            effect: monster.effect || '',
            effectId: monster.effectId || 0
        };
        this.onlineManager.pushGameState(state);
        this.waitingForGuestAction = true;

        // Show host spectator view of monster preview
        if (this.isHost && playerId !== this.localPlayerId) {
            const battlePlayer = this.players.find(p => p.id === playerId);
            this.showMonsterPreviewSpectator(battlePlayer ? battlePlayer.name : 'Unknown', state.monsterPreview);
        }
    }

    handleGuestBatPowerChoice(action) {
        const player = this.players.find(p => p.id === action.playerId);
        if (!player) return;

        if (action.data.choice === 'hp') {
            this.modifyResource(action.playerId, 'hp', 1);
            this.addLogEntryT('log.batLv2HP', [player], 'power', player);
        } else {
            this.modifyResource(action.playerId, 'ep', 1);
            this.addLogEntryT('log.batLv2EP', [player], 'power', player);
        }

        this.updateResourceDisplay();
        this.updateInventoryDisplay(action.playerId);

        // Push state update
        const state = this.serializeGameState();
        this.onlineManager.pushGameState(state);
    }

    pushBattleStateToGuest() {
        if (!this.isHost || !this.onlineManager) return;

        const battleState = this.serializeBattleState();
        const state = this.serializeGameState();
        state.roundPhase = 'battle';
        state.battleState = battleState;

        if (battleState) {
            state.currentBattlePlayerId = battleState.playerId;
            state.battlePhase = battleState.isActive ? 'active' : 'ended';

            // Mark as guestBattle=true so the fighting remote player gets interactive controls
            const battlePlayer = this.players.find(p => p.id === battleState.playerId);
            const isRemoteHumanBattle = battlePlayer && !battlePlayer.isBot && battleState.playerId !== this.localPlayerId;
            state.guestBattle = isRemoteHumanBattle;

            // Add tame availability info for the fighting player
            if (this.currentBattle && this.currentBattle.monster && battlePlayer) {
                // Compute canTame matching the local battle logic (lines 8879-8899)
                let canTame = false;
                let requiredEP = 1;
                if (battlePlayer.weapon.name === 'Whip' && battlePlayer.weapon.powerTrackPosition >= 1) {
                    requiredEP = battlePlayer.weapon.powerTrackPosition >= 7 ? 0 : 0;
                }
                if (battlePlayer.weapon.name === 'Chain' && battlePlayer.weapon.powerTrackPosition >= 1) {
                    canTame = this.currentBattle.monster.hp < 4 && battlePlayer.resources.ep >= requiredEP;
                } else {
                    canTame = this.currentBattle.monster.hp === 1 && battlePlayer.resources.ep >= requiredEP;
                }
                state.battleState.canTame = canTame;
            }
        } else {
            state.guestBattle = false;
            state.battlePhase = 'ended';
        }

        this.onlineManager.pushGameState(state);
    }

    // ==================== ONLINE: END ROUND ====================

    endRoundOnline() {
        // Hide battle phase panel
        this.hidePlayerStatusIndicators();

        // Check win condition
        const hasWinner = this.checkWinCondition();
        if (hasWinner) {
            const winner = this.determineWinner();
            const state = this.serializeGameState();
            state.roundPhase = 'gameover';
            state.winner = winner.id;
            this.onlineManager.pushGameState(state);
            this.endGameOnline(winner);
            return;
        }

        // Process next round: cleanup, move dummy tokens, apply weapon powers
        // Do all data updates synchronously before pushing state
        this.cleanupRoundEffects();
        this.failedForestPlayers = [];
        this.forestPlayersThisRound = new Set();
        this.forestReadinessQueue = [];

        // Reset token positions
        this.players.forEach(player => {
            player.tokens.hunter = null;
            player.tokens.apprentice = null;
        });

        // Move dummy tokens and increment round
        this.moveDummyTokens();
        this.storePhaseCompleted = false;
        this.currentRound++;

        // Apply round-start weapon powers (same logic as startNewRound)
        this.applyRoundStartPowers();

        // Clear selections
        this.stationChoices = {};
        this.players.forEach(player => {
            player.selectedCards.hunter = null;
            player.selectedCards.apprentice = null;
        });

        this.roundPhase = 'selection';
        this.currentPlayerIndex = this.localPlayerId;
        this.pendingSelectionLogs = [];

        // Push state with correct dummy positions, then start selection UI
        setTimeout(() => {
            const state = this.serializeGameState();
            state.roundPhase = 'selection';
            this.onlineManager.pushGameState(state);
            this.startOnlineSelectionPhase();

            // Update local UI
            document.querySelectorAll('.token').forEach(token => token.remove());
            this.updateDummyTokenDisplay();
            this.updateResourceDisplay();
            this.players.forEach(p => this.updateInventoryDisplay(p.id));
            this.addLogEntryT('log.roundStarted', [this.currentRound], 'round-start');
        }, 1000);
    }

    // ==================== PHASE TIMER SYSTEM ====================

    formatTime(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    initPhaseTimers() {
        // Clear any existing timers
        this.stopAllPhaseTimers();
        this.expiredTimerPlayers = [];
        this.phaseTimersPaused = false;

        this.players.forEach(player => {
            if (!player.isBot) {
                this.phaseTimers[player.id] = {
                    remaining: this.phaseTimeLimit * 1000,
                    intervalId: null,
                    running: false
                };
            }
        });

        // Update display
        this.players.forEach(player => {
            if (!player.isBot) {
                this.updatePhaseTimerDisplay(player.id);
            }
        });
    }

    initPhaseTimerForPlayer(playerId) {
        // Init a fresh timer for a single player (e.g., for capacity overflow)
        this.stopPhaseTimer(playerId);
        this.phaseTimers[playerId] = {
            remaining: this.phaseTimeLimit * 1000,
            intervalId: null,
            running: false
        };
        this.updatePhaseTimerDisplay(playerId);
    }

    startPhaseTimer(playerId) {
        if (!this.isOnlineMode || this.phaseTimeLimit <= 0) return;
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.isBot) return;
        const timer = this.phaseTimers[playerId];
        if (!timer || timer.running) return;

        timer.running = true;
        timer.intervalId = setInterval(() => {
            if (this.phaseTimersPaused) return;
            timer.remaining -= 1000;
            this.updatePhaseTimerDisplay(playerId);
            if (timer.remaining <= 0) {
                timer.remaining = 0;
                this.updatePhaseTimerDisplay(playerId);
                clearInterval(timer.intervalId);
                timer.intervalId = null;
                timer.running = false;
                this.onPhaseTimerExpired(playerId);
            }
        }, 1000);
    }

    stopPhaseTimer(playerId) {
        const timer = this.phaseTimers[playerId];
        if (!timer) return;
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
        timer.running = false;
    }

    stopAllPhaseTimers() {
        for (const playerId of Object.keys(this.phaseTimers)) {
            this.stopPhaseTimer(parseInt(playerId));
        }
    }

    pauseAllPhaseTimers() {
        this.phaseTimersPaused = true;
    }

    resumeAllPhaseTimers() {
        this.phaseTimersPaused = false;
    }

    updatePhaseTimerDisplay(playerId) {
        const timerSpan = document.querySelector(`.phase-timer[data-player-id="${playerId}"]`);
        if (!timerSpan) return;
        const timer = this.phaseTimers[playerId];
        if (!timer) return;
        timerSpan.textContent = this.formatTime(timer.remaining);
        if (timer.remaining <= 10000) {
            timerSpan.classList.add('timer-warning');
        } else {
            timerSpan.classList.remove('timer-warning');
        }
    }

    removePhaseTimerDisplay(playerId) {
        const timerSpan = document.querySelector(`.phase-timer[data-player-id="${playerId}"]`);
        if (timerSpan) timerSpan.remove();
    }

    onPhaseTimerExpired(playerId) {
        // Only host handles timer expiry
        if (!this.isHost) return;

        this.expiredTimerPlayers.push(playerId);

        // Debounce: wait 500ms for other timers to also expire
        if (this.expiredTimerDebounce) clearTimeout(this.expiredTimerDebounce);
        this.expiredTimerDebounce = setTimeout(() => {
            const targets = [...this.expiredTimerPlayers];
            this.expiredTimerPlayers = [];
            this.expiredTimerDebounce = null;
            this.triggerKickVote(targets);
        }, 500);
    }

    // ==================== KICK VOTE SYSTEM ====================

    triggerKickVote(targetPlayerIds) {
        if (!this.isHost) return;

        this.pauseAllPhaseTimers();

        const targetNames = targetPlayerIds.map(id => {
            const p = this.players.find(pl => pl.id === id);
            return p ? p.name : `Player ${id + 1}`;
        });

        // Identify voters: human, non-bot, not in target list
        const voterIds = this.players
            .filter(p => !p.isBot && !targetPlayerIds.includes(p.id))
            .map(p => p.id);

        // If no voters (only bots/targets remain), auto-kick
        if (voterIds.length === 0) {
            targetPlayerIds.forEach(id => this.kickPlayer(id));
            this.resumeAllPhaseTimers();
            return;
        }

        this.kickVote = {
            targetIds: [...targetPlayerIds],
            targetNames: [...targetNames],
            votes: {},
            voterIds: [...voterIds],
            voteOrder: [],
            resolved: false,
            voteTimerRemaining: 30000,
            voteTimerIntervalId: null,
            lostVoteRight: [] // voters who lost their right by not voting in time
        };

        this.startKickVoteTimer();

        // Push state so guests see the vote modal
        const state = this.serializeGameState();
        state.roundPhase = this.roundPhase;
        state.kickVote = this.serializeKickVote();
        this.onlineManager.pushGameState(state);

        // Show modal for host if host is a voter
        if (voterIds.includes(this.localPlayerId)) {
            this.showKickVoteModal(true);
        } else if (targetPlayerIds.includes(this.localPlayerId)) {
            this.showKickVoteModal(false);
        }
    }

    serializeKickVote() {
        if (!this.kickVote) return null;
        const yesCount = Object.values(this.kickVote.votes).filter(v => v === true).length;
        const noCount = Object.values(this.kickVote.votes).filter(v => v === false).length;
        return {
            targetIds: this.kickVote.targetIds,
            targetNames: this.kickVote.targetNames,
            voterIds: this.kickVote.voterIds,
            yesCount: yesCount,
            noCount: noCount,
            voteTimerRemaining: this.kickVote.voteTimerRemaining,
            lostVoteRight: this.kickVote.lostVoteRight || []
        };
    }

    showKickVoteModal(isVoter) {
        const modal = document.getElementById('kick-vote-modal');
        if (!modal) return;

        const targetNames = this.kickVote.targetNames.join(', ');
        document.getElementById('kick-vote-title').textContent = t('kickVote.title');

        if (isVoter) {
            document.getElementById('kick-vote-message').textContent =
                t('kickVote.askVoter', targetNames);
            const yesBtn = modal.querySelector('.kick-vote-yes-btn');
            const noBtn = modal.querySelector('.kick-vote-no-btn');
            yesBtn.style.display = 'inline-block';
            noBtn.style.display = 'inline-block';
            yesBtn.disabled = false;
            noBtn.disabled = false;
        } else {
            document.getElementById('kick-vote-message').textContent =
                t('kickVote.askTarget');
            modal.querySelector('.kick-vote-yes-btn').style.display = 'none';
            modal.querySelector('.kick-vote-no-btn').style.display = 'none';
        }

        this.updateKickVoteTally();
        this.updateKickVoteTimerDisplay();
        modal.style.display = 'flex';
    }

    hideKickVoteModal() {
        const modal = document.getElementById('kick-vote-modal');
        if (modal) modal.style.display = 'none';
    }

    updateKickVoteTally() {
        if (!this.kickVote) return;
        const yesCount = Object.values(this.kickVote.votes).filter(v => v === true).length;
        const noCount = Object.values(this.kickVote.votes).filter(v => v === false).length;
        const yesEl = document.getElementById('kick-vote-yes-count');
        const noEl = document.getElementById('kick-vote-no-count');
        if (yesEl) yesEl.textContent = yesCount;
        if (noEl) noEl.textContent = noCount;
    }

    updateKickVoteTimerDisplay() {
        if (!this.kickVote) return;
        const el = document.getElementById('kick-vote-timer-display');
        if (el) el.textContent = this.formatTime(this.kickVote.voteTimerRemaining);
    }

    startKickVoteTimer() {
        if (!this.kickVote) return;
        this.kickVote.voteTimerIntervalId = setInterval(() => {
            this.kickVote.voteTimerRemaining -= 1000;
            this.updateKickVoteTimerDisplay();

            if (this.kickVote.voteTimerRemaining <= 0) {
                // All remaining non-voted voters lose their right
                const nonVoted = this.kickVote.voterIds.filter(
                    id => !(id in this.kickVote.votes) && !(this.kickVote.lostVoteRight || []).includes(id)
                );
                nonVoted.forEach(id => {
                    if (!this.kickVote.lostVoteRight) this.kickVote.lostVoteRight = [];
                    this.kickVote.lostVoteRight.push(id);
                });

                // Disable buttons locally
                const modal = document.getElementById('kick-vote-modal');
                if (modal) {
                    modal.querySelector('.kick-vote-yes-btn').disabled = true;
                    modal.querySelector('.kick-vote-no-btn').disabled = true;
                }

                this.resolveKickVote();
            }

            // Push timer update so guests see countdown
            if (this.isHost && this.kickVote && !this.kickVote.resolved) {
                const state = this.serializeGameState();
                state.roundPhase = this.roundPhase;
                state.kickVote = this.serializeKickVote();
                this.onlineManager.pushGameState(state);
            }
        }, 1000);
    }

    submitKickVote(vote) {
        if (!this.kickVote) return;

        // Check if this player already voted or lost right
        if (this.kickVote.votes[this.localPlayerId] !== undefined) return;
        if ((this.kickVote.lostVoteRight || []).includes(this.localPlayerId)) return;

        // Disable buttons immediately
        const modal = document.getElementById('kick-vote-modal');
        if (modal) {
            modal.querySelector('.kick-vote-yes-btn').disabled = true;
            modal.querySelector('.kick-vote-no-btn').disabled = true;
        }

        if (this.isHost) {
            this.kickVote.votes[this.localPlayerId] = vote;
            this.kickVote.voteOrder.push(this.localPlayerId);
            this.updateKickVoteTally();
            this.checkKickVoteCompletion();

            // Push state
            const state = this.serializeGameState();
            state.roundPhase = this.roundPhase;
            state.kickVote = this.serializeKickVote();
            this.onlineManager.pushGameState(state);
        } else {
            // Guest sends vote to host
            this.onlineManager.pushAction({
                type: 'kick_vote',
                playerId: this.localPlayerId,
                data: { vote: vote }
            });
        }
    }

    checkKickVoteCompletion() {
        if (!this.kickVote || this.kickVote.resolved) return;

        const activeVoters = this.kickVote.voterIds.filter(
            id => !(this.kickVote.lostVoteRight || []).includes(id)
        );
        const allVoted = activeVoters.every(id => id in this.kickVote.votes);

        if (allVoted || activeVoters.length === 0) {
            this.resolveKickVote();
        }
    }

    resolveKickVote() {
        if (!this.kickVote || this.kickVote.resolved) return;
        this.kickVote.resolved = true;

        // Clear vote timer
        if (this.kickVote.voteTimerIntervalId) {
            clearInterval(this.kickVote.voteTimerIntervalId);
            this.kickVote.voteTimerIntervalId = null;
        }

        const yesCount = Object.values(this.kickVote.votes).filter(v => v === true).length;
        const noCount = Object.values(this.kickVote.votes).filter(v => v === false).length;
        const totalVotes = yesCount + noCount;

        let kick = false;

        if (totalVotes === 0) {
            // No one voted at all — auto-kick
            kick = true;
        } else if (yesCount > noCount) {
            kick = true;
        } else if (noCount > yesCount) {
            kick = false;
        } else {
            // Tie — tiebreaker
            // 1. If host voted, host's vote decides
            if (this.kickVote.votes[this.localPlayerId] !== undefined) {
                kick = this.kickVote.votes[this.localPlayerId] === true;
            } else if (this.kickVote.voteOrder.length > 0) {
                // 2. First voter decides
                kick = this.kickVote.votes[this.kickVote.voteOrder[0]] === true;
            } else {
                // 3. No one voted — auto-kick
                kick = true;
            }
        }

        const targetIds = [...this.kickVote.targetIds];
        const kicked = kick;

        if (kicked) {
            targetIds.forEach(id => this.kickPlayer(id));
        } else {
            // Reset saved players' timers — give them a fresh countdown
            targetIds.forEach(id => {
                this.initPhaseTimerForPlayer(id);
                this.startPhaseTimer(id);
            });
        }

        // Push result to guests
        const state = this.serializeGameState();
        state.roundPhase = this.roundPhase;
        state.kickVoteResult = { targetIds: targetIds, kicked: kicked };
        if (kicked) {
            state.kickedPlayerIds = targetIds;
        }
        state.kickVote = null; // Clear the active vote
        this.onlineManager.pushGameState(state);

        this.hideKickVoteModal();
        this.kickVote = null;
        this.resumeAllPhaseTimers();

        // Check if phase is now complete after kick
        if (kicked && this.checkAllPlayersComplete()) {
            if (this.roundPhase === 'selection') {
                this.onlineSelectionComplete();
            } else if (this.roundPhase === 'store') {
                this.onlineStoreComplete();
            }
        }
    }

    kickPlayer(playerId) {
        if (!this.isHost) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player || player.isBot) return;

        // Special case: Host is kicked → end game for everyone
        if (playerId === this.localPlayerId) {
            const state = this.serializeGameState();
            state.hostKicked = true;
            this.onlineManager.pushGameState(state);

            // Show disconnect modal locally
            document.getElementById('disconnect-message').textContent = 'The host has been kicked. Game over.';
            document.getElementById('disconnect-modal').style.display = 'flex';
            this.hideKickVoteModal();
            this.stopAllPhaseTimers();
            this.onlineManager.scheduleRoomDeletion(5000);
            return;
        }

        const oldName = player.name;
        player.isBot = true;
        player.name = 'Bot' + (player.id + 1);

        // Create BotPlayer instance
        const botPlayer = new BotPlayer(player.id, player.weapon);
        this.bots.push(botPlayer);

        // Stop and remove phase timer
        this.stopPhaseTimer(playerId);
        this.removePhaseTimerDisplay(playerId);

        // Clear waiting flag — this guest will never respond
        this.waitingForGuestAction = false;

        // Immediate bot action for current phase
        if (this.roundPhase === 'selection' && !this.playerCompletionStatus[playerId]) {
            this.handleBotLocationSelection(playerId);
            this.updatePlayerStatus(playerId, true);
        } else if (this.roundPhase === 'store' && !this.playerCompletionStatus[playerId]) {
            this.handleBotShopping(player);
            this.updatePlayerStatus(playerId, true);
        } else if (this.roundPhase === 'battle') {
            if (this.currentMonsterPlayer === playerId) {
                this.handleBotMonsterSelection(player);
            }
        } else if (this.roundPhase === 'capacityOverflow') {
            if (this.getInventorySize(player) > player.maxInventoryCapacity) {
                botPlayer.handleBotCapacityOverflow(player, this);
                this.updateResourceDisplay();
                this.updateInventoryDisplay(player.id);
            }
        }

        // Update all name tags for the kicked player
        this.updateKickedPlayerNameTags(player);

        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplay(playerId);
        this.applyPlayerNameColors();

        this.addLogEntryT('log.kicked', [oldName, player], 'system');

        console.log(`Player ${playerId} (${oldName}) kicked and replaced by ${player.name}`);
    }

    updateKickedPlayerNameTags(player) {
        const newName = player.name;
        const playerColors = this.getPlayerColors(player.id);
        const colorIndicator = player.color
            ? `<span class="player-color-indicator" style="background-color: ${player.color.background}; border-color: ${player.color.border};"></span>`
            : '';

        // 1. Expanded player board name
        const expandedName = document.getElementById(`player-${player.id}-name`);
        if (expandedName) {
            expandedName.innerHTML = `${colorIndicator} ${newName}`;
        }

        // 2. Collapsed player board name
        const board = document.getElementById(`player-${player.id}-board`);
        if (board) {
            const collapsedName = board.querySelector('.collapsed-player-name');
            if (collapsedName) {
                collapsedName.innerHTML = `${colorIndicator} ${newName}`;
            }
        }

        // 3. Status indicator name (red/green light panel)
        const statusDiv = document.querySelector(`.player-status[data-player-id="${player.id}"]`);
        if (statusDiv) {
            const nameSpan = statusDiv.querySelector('.player-name');
            if (nameSpan) {
                nameSpan.textContent = newName;
            }
        }
    }

    handleGuestKickVoteState(state) {
        if (this.isHost) return;

        // Handle host kicked — game over for everyone
        if (state.hostKicked) {
            this.hideKickVoteModal();
            this.stopAllPhaseTimers();
            document.getElementById('disconnect-message').textContent = 'The host has been kicked. Game over.';
            document.getElementById('disconnect-modal').style.display = 'flex';
            return;
        }

        // Handle kicked players
        if (state.kickedPlayerIds) {
            if (state.kickedPlayerIds.includes(this.localPlayerId)) {
                // This player was kicked
                this.hideKickVoteModal();
                document.getElementById('disconnect-message').textContent = 'You have been kicked from the game.';
                document.getElementById('disconnect-modal').style.display = 'flex';
                return;
            }
            // Update names/displays for kicked players (now bots)
            state.kickedPlayerIds.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) {
                    const oldName = player.name;
                    player.isBot = true;
                    player.name = 'Bot' + (player.id + 1);
                    this.updateKickedPlayerNameTags(player);
                    this.addLogEntryT('log.kicked', [oldName, player], 'system');
                }
            });
            this.applyPlayerNameColors();
        }

        // Handle kick vote result
        if (state.kickVoteResult) {
            this.hideKickVoteModal();
            this.kickVote = null;
            this.resumeAllPhaseTimers();
            return;
        }

        // Handle active kick vote
        if (state.kickVote) {
            // Reconstruct local kickVote for display
            this.kickVote = {
                targetIds: state.kickVote.targetIds,
                targetNames: state.kickVote.targetNames,
                voterIds: state.kickVote.voterIds,
                votes: {},
                voteOrder: [],
                resolved: false,
                voteTimerRemaining: state.kickVote.voteTimerRemaining,
                voteTimerIntervalId: null,
                lostVoteRight: state.kickVote.lostVoteRight || []
            };

            // Reconstruct vote counts for tally display
            // We only have aggregate counts from host, create dummy entries
            for (let i = 0; i < state.kickVote.yesCount; i++) {
                this.kickVote.votes[`yes_${i}`] = true;
            }
            for (let i = 0; i < state.kickVote.noCount; i++) {
                this.kickVote.votes[`no_${i}`] = false;
            }

            const isVoter = state.kickVote.voterIds.includes(this.localPlayerId) &&
                            !(state.kickVote.lostVoteRight || []).includes(this.localPlayerId);
            const isTarget = state.kickVote.targetIds.includes(this.localPlayerId);

            // Check if guest already voted (buttons would be disabled)
            const alreadyVoted = document.querySelector('.kick-vote-yes-btn')?.disabled &&
                                 document.getElementById('kick-vote-modal')?.style.display === 'flex';

            if (isVoter && !alreadyVoted) {
                this.showKickVoteModal(true);
            } else if (isTarget) {
                this.showKickVoteModal(false);
            }

            this.updateKickVoteTally();
            this.updateKickVoteTimerDisplay();
        } else if (!state.kickVote && !state.kickVoteResult) {
            // No active vote — hide modal if showing
            this.hideKickVoteModal();
            this.kickVote = null;
        }
    }

    endGameOnline(winner) {
        this.roundPhase = 'gameover';
        document.getElementById('status-message').textContent =
            t('gameOver.fanfare', this.getPlayerDisplayName(winner), winner.score);

        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'none';

        const controls = document.querySelector('.controls');
        controls.innerHTML = '';

        const statsButton = document.createElement('button');
        statsButton.textContent = t('gameStats.view');
        statsButton.className = 'control-button';
        statsButton.onclick = () => this.showGameStats();
        controls.appendChild(statsButton);

        const exitButton = document.createElement('button');
        exitButton.textContent = t('gameStats.exit');
        exitButton.className = 'control-button';
        exitButton.onclick = () => {
            if (this.onlineManager) {
                this.onlineManager.scheduleRoomDeletion(5000);
            }
            this.exitToMainMenu();
        };
        controls.appendChild(exitButton);

        // Automatically show game stats
        this.showGameStats();

        // Cleanup online connection after delay
        if (this.isHost && this.onlineManager) {
            this.onlineManager.scheduleRoomDeletion(60000);
        }
    }

    // ==================== CHAT SYSTEM ====================

    initChat() {
        if (!this.isOnlineMode || !this.onlineManager) return;

        // Show chat section
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.style.display = 'flex';

        // Add class to log section so CSS knows chat is active
        const logSection = document.getElementById('game-log-section');
        if (logSection) logSection.classList.add('has-chat');

        // Listen for incoming chat messages
        this.onlineManager.listenForChat((data) => {
            this.onChatMessageReceived(data);
        });

        // Bind send button
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendChatFromInput();
            });
        }

        // Bind Enter key on input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendChatFromInput();
                }
            });
        }

        // Bind Quick button to toggle canned message panel
        const cannedBtn = document.getElementById('canned-msg-btn');
        if (cannedBtn) {
            cannedBtn.addEventListener('click', () => {
                this.toggleCannedPanel();
            });
        }

        // Bind tab switching
        const tabs = document.querySelectorAll('.canned-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabIndex = parseInt(tab.dataset.tab);
                // Tab 4 only accessible after selecting tab 3 message
                if (tabIndex === 4 && !this.pendingTacticsMessage) return;
                this.switchCannedTab(tabIndex);
            });
        });

        // Keyboard shortcuts for canned message panel
        this.cannedPanelState = 'closed';
        document.addEventListener('keydown', (e) => {
            // Alt+Q toggles canned panel
            if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
                e.preventDefault();
                this.toggleCannedPanel();
                return;
            }

            // Only process number keys when panel is open
            const panel = document.getElementById('canned-msg-panel');
            if (!panel || panel.style.display === 'none') return;

            // Ignore if chat input is focused (user typing a message)
            if (document.activeElement === document.getElementById('chat-input')) return;

            const num = parseInt(e.key); // 1-9
            if (isNaN(num) || num < 1) return;

            e.preventDefault();

            if (this.cannedPanelState === 'tabs') {
                // Number selects tab: 1→tab 0, 2→tab 1, etc.
                const tabIndex = num - 1;
                // Tab 4 only if pendingTacticsMessage exists
                if (tabIndex === 4 && !this.pendingTacticsMessage) return;
                // Tabs 0-4 valid
                if (tabIndex > 4) return;
                // Check tab is visible
                const tabBtn = document.querySelector(`.canned-tab[data-tab="${tabIndex}"]`);
                if (!tabBtn || tabBtn.style.display === 'none') return;
                this.switchCannedTab(tabIndex);
                this.cannedPanelState = 'messages';
            } else if (this.cannedPanelState === 'messages') {
                // Number selects message by position (1-indexed)
                const items = document.querySelectorAll('#canned-msg-list .canned-msg-item');
                const idx = num - 1;
                if (idx >= items.length) return;
                items[idx].click();
            }
        });
    }

    sendChatFromInput() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (text) {
            this.sendChatMessage(text);
            chatInput.value = '';
        }
    }

    async sendChatMessage(text) {
        if (!text || !this.onlineManager) return;
        try {
            await this.onlineManager.pushChat(text);
        } catch (e) {
            console.error('Failed to send chat message:', e);
        }
    }

    onChatMessageReceived(data) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        // Find the player by Firebase senderId
        let senderName = 'Unknown';
        let senderColor = '#95a5a6';

        if (this.players && this.onlinePlayerMap) {
            const playerSlot = this.onlinePlayerMap[data.senderId];
            if (playerSlot !== undefined && this.players[playerSlot]) {
                const player = this.players[playerSlot];
                senderName = this.getPlayerDisplayName(player);
                senderColor = player.color?.background || '#95a5a6';
            }
        }

        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message';

        const senderSpan = document.createElement('span');
        senderSpan.className = 'chat-sender';
        senderSpan.style.color = senderColor;
        senderSpan.textContent = senderName + ':';

        // Translate __i18n__:key (or __i18n__:tacticsKey|locationKey) to local language
        let displayMessage = data.message || '';
        if (typeof displayMessage === 'string' && displayMessage.indexOf('__i18n__:') === 0) {
            const payload = displayMessage.substring('__i18n__:'.length);
            if (payload.indexOf('|') !== -1) {
                // Composed: tacticsKey|locationKey
                const [tacticsKey, locationKey] = payload.split('|');
                const tacticsText = t(tacticsKey);
                const locationText = t(locationKey);
                displayMessage = tacticsText.replace('__', locationText);
            } else {
                displayMessage = t(payload);
            }
        }
        const textNode = document.createTextNode(' ' + displayMessage);

        msgEl.appendChild(senderSpan);
        msgEl.appendChild(textNode);
        container.appendChild(msgEl);

        // Auto-scroll
        container.scrollTop = container.scrollHeight;

        // Limit to last 50 messages
        const messages = container.querySelectorAll('.chat-message');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }

    toggleCannedPanel() {
        const panel = document.getElementById('canned-msg-panel');
        if (!panel) return;

        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            this.pendingTacticsMessage = null;
            // Hide tab 4
            const tab4 = document.querySelector('.canned-tab[data-tab="4"]');
            if (tab4) tab4.style.display = 'none';
            // Open to context-aware default tab
            this.switchCannedTab(this.getDefaultCannedTab());
            this.cannedPanelState = 'tabs';
        } else {
            this.closeCannedPanel();
        }
    }

    getDefaultCannedTab() {
        if (this.roundPhase === 'gameover') return 2;           // 結語
        if (this.roundPhase === 'selection' && this.currentRound === 1) return 0; // 問候語
        if (this.roundPhase === 'selection') return 3;           // 戰術
        return 1;                                                // 比賽中
    }

    closeCannedPanel() {
        const panel = document.getElementById('canned-msg-panel');
        if (panel) panel.style.display = 'none';
        this.cannedPanelState = 'closed';
        this.pendingTacticsMessage = null;
        // Clear input if it had a pending tactics message
        const chatInput = document.getElementById('chat-input');
        if (chatInput && chatInput.dataset.pending) {
            chatInput.value = '';
            delete chatInput.dataset.pending;
        }
    }

    switchCannedTab(tabIndex) {
        // Update active tab styling
        const tabs = document.querySelectorAll('.canned-tab');
        tabs.forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.canned-tab[data-tab="${tabIndex}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Populate message list
        const listContainer = document.getElementById('canned-msg-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        // Build the key list for this tab
        const keys = this.getCannedKeysForTab(tabIndex);

        let itemIndex = 1;
        const self = this;
        keys.forEach(function (key) {
            const msg = t(key);
            if (!msg || msg.indexOf('[MISSING') === 0 || msg.indexOf('[UNTRANSLATED') === 0) return;

            const item = document.createElement('button');
            item.className = 'canned-msg-item';
            item.textContent = `${itemIndex}. ${msg}`;
            item.addEventListener('click', function () {
                self.handleCannedMessageClick(tabIndex, msg, key);
            });
            listContainer.appendChild(item);
            itemIndex++;
        });

        this.cannedPanelState = 'messages';
        this.cannedActiveTab = tabIndex;
    }

    /**
     * Returns the ordered list of translation keys for a given canned message tab.
     */
    getCannedKeysForTab(tabIndex) {
        switch (tabIndex) {
            case 0: // greeting
                return ['chat.canned.greeting.0', 'chat.canned.greeting.1', 'chat.canned.greeting.2', 'chat.canned.greeting.3'];
            case 1: // mid-game
                return ['chat.canned.midgame.0', 'chat.canned.midgame.1', 'chat.canned.midgame.2', 'chat.canned.midgame.3', 'chat.canned.midgame.4', 'chat.canned.midgame.5'];
            case 2: // closing
                return ['chat.canned.closing.0', 'chat.canned.closing.1', 'chat.canned.closing.2', 'chat.canned.closing.3', 'chat.canned.closing.4', 'chat.canned.closing.5'];
            case 3: // tactics
                return ['chat.canned.tactics.0', 'chat.canned.tactics.1', 'chat.canned.tactics.2', 'chat.canned.tactics.3', 'chat.canned.tactics.4', 'chat.canned.tactics.5', 'chat.canned.tactics.6', 'chat.canned.tactics.7'];
            case 4: // locations
                return ['chat.canned.location.workSite', 'chat.canned.location.bar', 'chat.canned.location.station', 'chat.canned.location.hospital', 'chat.canned.location.dojo', 'chat.canned.location.plaza', 'chat.canned.location.forest'];
            default:
                return [];
        }
    }

    handleCannedMessageClick(tabIndex, message, key) {
        if (tabIndex <= 2) {
            // Tabs 0-2: auto-send immediately
            // Send as i18n key so the receiver can translate locally
            if (key) {
                this.sendChatMessage('__i18n__:' + key);
            } else {
                this.sendChatMessage(message);
            }
            this.closeCannedPanel();
        } else if (tabIndex === 3) {
            // Tab 3 (戰術): store pending, show in input, switch to tab 4
            this.pendingTacticsMessage = message;
            this.pendingTacticsKey = key;
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = message;
                chatInput.dataset.pending = 'true';
            }

            // Show and activate tab 4
            const tab4 = document.querySelector('.canned-tab[data-tab="4"]');
            if (tab4) tab4.style.display = '';
            this.switchCannedTab(4);
        } else if (tabIndex === 4) {
            // Tab 4 (地點): replace __ in pending message, send
            if (this.pendingTacticsMessage) {
                if (this.pendingTacticsKey && key) {
                    // Send composed pair as keys so receiver translates locally
                    this.sendChatMessage('__i18n__:' + this.pendingTacticsKey + '|' + key);
                } else {
                    const composed = this.pendingTacticsMessage.replace('__', message);
                    this.sendChatMessage(composed);
                }
                this.pendingTacticsMessage = null;
                this.pendingTacticsKey = null;
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = '';
                    delete chatInput.dataset.pending;
                }
                this.closeCannedPanel();
            }
        }
    }
}

// Start the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game(); // Make game globally accessible
    game = window.game; // Keep local reference for compatibility
});