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
        
        // Ammunition penalty for Rifle/Plasma weapons
        if (player.weapon.name === 'Rifle') {
            const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
            if (bullets === 0) {
                entries[7] -= 100; // Strong penalty to discourage Forest entry without bullets
            }
        } else if (player.weapon.name === 'Plasma') {
            const batteries = player.inventory.filter(item => item.name === 'Battery').length;
            if (batteries === 0) {
                entries[7] -= 100; // Strong penalty to discourage Forest entry without batteries
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
            entries[7] += 1; // +1 entry for forest coordination
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
        
        // Give +1 additional entry to highest scoring player's preferred location
        if (highestScorePlayer && highestScorePlayer.weapon) {
            const preferredLocationName = highestScorePlayer.weapon.preferLocation;
            const preferredLocationId = this.getLocationIdByName(preferredLocationName);
            
            if (preferredLocationId && entries[preferredLocationId] > -95) {
                entries[preferredLocationId] += 1;
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
                    { name: 'Bullet', price: 2, size: 1 },
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
                    { name: 'Bullet', price: 2, size: 1 },
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
                    { name: 'Battery', price: 2, size: 1 }, // Plasma Lv1: batteries cost $2
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
                    { name: 'Battery', price: 2, size: 1 }, // Plasma Lv1: batteries cost $2
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
                
                logActions.push(`used Blood Bag (+${recoveryAmount} HP)`);
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
                
                logActions.push(`used Beer (+${recoveryAmount} EP)`);
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
                            logActions.push(`upgraded max HP to ${player.maxResources.hp} (+${m.points} milestone points)`);
                            milestoneAwarded = true;
                        }
                        break;
                    }
                }
                if (!milestoneAwarded) {
                    logActions.push(`upgraded max HP to ${player.maxResources.hp}`);
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
                    logActions.push(`upgraded max EP to ${player.maxResources.ep} (+2 milestone points)`);
                } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                    game.addScore(player.id, 4, 'milestone');
                    player.milestones.ep10 = true;
                    if (!game.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    logActions.push(`upgraded max EP to ${player.maxResources.ep} (+4 milestone points)`);
                } else {
                    logActions.push(`upgraded max EP to ${player.maxResources.ep}`);
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
                    
                    logActions.push(`discarded ${itemToDiscard.name}`);
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
            game.addLogEntry(
                `🔧 <strong>${player.name}</strong> (Bot) resolved capacity overflow: ${actionsList}`,
                'system',
                player
            );
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
              lv1Power: '可購買電池:2$，每次戰鬥花費1電池', lv2Power: '回合開始+2$', lv3Power: '無限電池', preferLocation: 'work site' },
            { name: 'Chain', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 6,
              lv1Power: '怪獸於血量3以下即可收服', lv2Power: '回合開始+2啤酒', lv3Power: '寵物攻擊x2', preferLocation: 'bar' },
            { name: 'Axe', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 4,
              lv1Power: '玩家受傷時反擊怪獸受1點傷害', lv2Power: '回合開始+1血袋', lv3Power: '玩家受傷時反擊怪獸受一樣的傷害', preferLocation: 'hospital' },
            { name: 'Whip', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 5,
              lv1Power: '寵物和收服怪獸體力-1', lv2Power: '回合開始+2啤酒', lv3Power: '寵物和收服不耗體力', preferLocation: 'bar' },
            { name: 'Bow', reqExpAttack: 5, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 0, 4], priority: 1,
              lv1Power: '閃避率+16%', lv2Power: '回合開始+1經驗', lv3Power: '傷害x2', preferLocation: 'plaza' },
            { name: 'Sword', reqExpAttack: 5, reqExpDefense: 3, capacity: 4, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 2], priority: 9,
              lv1Power: '無', lv2Power: '單獨存在區域+2經驗', lv3Power: '每骰到至少1個1即+1分', preferLocation: 'dojo' },
            { name: 'Knife', reqExpAttack: 3, reqExpDefense: 3, capacity: 10, initialMoney: 8, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 2,
              lv1Power: '可將一次的攻擊力x2', lv2Power: '單獨存在區域+1分', lv3Power: '打贏的資源獎勵x2', preferLocation: 'plaza' },
            { name: 'Gloves', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 7,
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
        this.stationChoices = {}; // Store station choices for each player
        this.pendingStationPlayer = null; // Track which player needs to choose
        this.stationTotalCount = 0; // Track total count at station
        this.monsters = this.loadMonsters(); // Load monster data
        this.currentBattle = null; // Track ongoing monster battle
        
        // Monster selection system
        this.defeatedMonsters = new Set(); // Track defeated monster IDs
        this.currentSelectedMonster = null; // Current monster shown to player
        this.monsterSelectionEPSpent = 0; // Track EP spent on changing monsters
        
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
    }
    
    showLocalPlay() {
        // Hide main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'none';
        
        // Show player configuration screen
        this.showPlayerCountSelection();
    }
    
    showOnlinePlay() {
        // Placeholder for future online play functionality
        console.log('Online play coming soon!');
        // Could show a message or do nothing for now
    }

    showRulebook() {
        const modal = document.getElementById('rules-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Reload iframe to reset scroll position
            const iframe = modal.querySelector('iframe');
            if (iframe) {
                iframe.src = iframe.src;
            }
        }
    }

    hideRulebook() {
        const modal = document.getElementById('rules-modal');
        if (modal) {
            modal.style.display = 'none';
        }
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
        this.addLogEntry(`🎮 <strong>New Game Started</strong> - ${playerCount} players`, 'round-start');
        
        // Log first round start
        this.addLogEntry(`🔄 <strong>Round ${this.currentRound} Started</strong>`, 'round-start');
        
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
        playerBoardsContainer.className = `player-boards players-${playerCount}`;
        
        
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
                    displayText = this.getRewardDisplayText('$', location.rewards);
                    break;
                case 2: // Bar  
                    displayText = this.getRewardDisplayText('Beer', location.rewards);
                    break;
                case 3: // Station
                    displayText = 'Wild Card';
                    break;
                case 4: // Hospital
                    displayText = this.getRewardDisplayText('Blood', location.rewards);
                    break;
                case 5: // Dojo
                    displayText = this.getRewardDisplayText('EXP', location.rewards);
                    break;
                case 6: // Plaza
                    displayText = this.getRewardDisplayText('Score', location.rewards);
                    break;
                case 7: // Forest
                    displayText = 'Monster Hunt';
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
            { selector: '[data-location="1"] .reward-info', text: this.getRewardDisplayText('$', this.locations.find(l => l.id === 1)?.rewards || [6, 4]) },
            { selector: '[data-location="2"] .reward-info', text: this.getRewardDisplayText('Beer', this.locations.find(l => l.id === 2)?.rewards || [6, 4]) },
            { selector: '[data-location="4"] .reward-info', text: this.getRewardDisplayText('Blood', this.locations.find(l => l.id === 4)?.rewards || [4, 2]) },
            { selector: '[data-location="5"] .reward-info', text: this.getRewardDisplayText('EXP', this.locations.find(l => l.id === 5)?.rewards || [4, 2]) },
            { selector: '[data-location="6"] .reward-info', text: this.getRewardDisplayText('Score', this.locations.find(l => l.id === 6)?.rewards || [4, 2]) }
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
                    currentDefenseDice: weapon.name === 'Sword' ? 1 : weapon.defenseDice, // Sword Level 1: Start with 1 defense die
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
        
        console.log(`Bot ${playerId + 1} selected: Hunter→${hunterLocation}, Apprentice→${apprenticeLocation}`);
        
        // Store bot selection for batch logging
        const locationNames = {
            1: 'Work Site',
            2: 'Bar',
            3: 'Station',
            4: 'Hospital',
            5: 'Dojo',
            6: 'Plaza',
            7: 'Forest'
        };
        this.pendingSelectionLogs.push({
            message: `📍 <strong>${player.name}</strong> selected: Hunter → ${locationNames[hunterLocation]}, Apprentice → ${locationNames[apprenticeLocation]}`,
            type: 'selection',
            player: player
        });
        
        // Update UI to show bot selections
        this.updateLocationCardStates();
        this.updateSelectionDisplay();
        this.checkSelectionComplete();
        
        // Auto-confirm selection for bot players
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
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Update current player display
        document.getElementById('current-player-name').textContent = currentPlayer.name;
        
        // Update selection status
        const hunterSelection = currentPlayer.selectedCards.hunter;
        const apprenticeSelection = currentPlayer.selectedCards.apprentice;
        
        console.log(`Player ${currentPlayer.id + 1} selections: Hunter=${hunterSelection}, Apprentice=${apprenticeSelection}`);
    }
    
    checkSelectionComplete() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const confirmButton = document.getElementById('confirm-selection');
        
        const isComplete = currentPlayer.selectedCards.hunter !== null && 
                          currentPlayer.selectedCards.apprentice !== null;
        
        confirmButton.disabled = !isComplete;
        
        if (isComplete) {
            confirmButton.textContent = 'Confirm Selection';
        } else {
            confirmButton.textContent = 'Select Both Locations';
        }
    }
    
    updateCurrentPlayer() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
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
            statusElement.innerHTML = `<strong>${this.players[this.currentPlayerIndex].name}</strong> is thinking...`;
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
                statusElement.textContent = `${currentPlayer.name} (Bot) is selecting locations...`;
            } else {
                statusElement.textContent = `${currentPlayer.name}: Select locations for your Hunter and Apprentice`;
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
                        // Update score token position when score changes
                    } else {
                        element.textContent = player.resources[resource];
                    }
                }
            });
            
            // Update max resource displays
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
        });
    }
    
    // Duplicate methods removed - using the main confirmSelection method below
    
    proceedToNextPhase() {
        console.log('All players have selected locations, proceeding to next phase...');
        this.roundPhase = 'distribution';
        
        // For now, just show a message that selection is complete
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = 'All players have selected locations! Game proceeding...';
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
            { name: 'Grenade', price: 2, size: 2 },
            { name: 'Bomb', price: 4, size: 3 },
            { name: 'Dynamite', price: 6, size: 4 },
            { name: 'Fake Blood', price: 2, size: 2 },
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
    
    updateSoloModeUI() {
        const slots = document.querySelectorAll('.player-slot');

        // Define color and weapon options with actual color values
        const allColorOptions = [
            { value: 'random', label: 'Random', bg: 'linear-gradient(90deg, #e67e22, #27ae60, #3498db, #9b59b6)', border: '#666' },
            { value: 'orange', label: 'Orange', bg: '#e67e22', border: '#d35400' },
            { value: 'green', label: 'Green', bg: '#27ae60', border: '#229954' },
            { value: 'blue', label: 'Blue', bg: '#3498db', border: '#2980b9' },
            { value: 'purple', label: 'Purple', bg: '#9b59b6', border: '#8e44ad' },
            { value: 'red', label: 'Red', bg: '#e74c3c', border: '#c0392b' },
            { value: 'yellow', label: 'Yellow', bg: '#f5f50a', border: '#828205' },
            { value: 'black', label: 'Black', bg: '#000000', border: '#333333' }
        ];

        // Get all currently selected colors and weapons (excluding 'random')
        const selectedColors = this.soloModeSlots
            .filter(slot => slot.active && slot.color !== 'random')
            .map(slot => slot.color);

        const selectedWeapons = this.soloModeSlots
            .filter(slot => slot.active && slot.weapon !== 'random')
            .map(slot => slot.weapon);

        const allWeaponOptions = [
            { value: 'random', label: 'Random' },
            { value: 'Bat', label: 'Bat' },
            { value: 'Katana', label: 'Katana' },
            { value: 'Rifle', label: 'Rifle' },
            { value: 'Plasma', label: 'Plasma' },
            { value: 'Chain', label: 'Chain' },
            { value: 'Axe', label: 'Axe' },
            { value: 'Whip', label: 'Whip' },
            { value: 'Bow', label: 'Bow' },
            { value: 'Sword', label: 'Sword' },
            { value: 'Knife', label: 'Knife' },
            { value: 'Gloves', label: 'Gloves' }
        ];
        
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
                        <span class="slot-type">${slot.type === 'player' ? 'Player' : 'Bot'}</span>
                    </div>
                    <div class="slot-options">
                        <div class="slot-option">
                            <label>Color:</label>
                            ${colorDropdown}
                        </div>
                        <div class="slot-option">
                            <label>Weapon:</label>
                            ${weaponDropdown}
                        </div>
                    </div>
                    <div class="slot-buttons">
                        <button class="slot-toggle" onclick="game.toggleSlotType(${index})">
                            Change to ${slot.type === 'player' ? 'Bot' : 'Player'}
                        </button>
                        ${index > 0 ? `<button class="slot-activate" onclick="game.activateSlot(${index})">Remove</button>` : ''}
                    </div>
                `;
            } else {
                slotElement.classList.add('closed');
                
                // Update content for closed slot
                slotElement.innerHTML = `
                    <span class="slot-number">${index + 1}</span>
                    <span class="slot-status">Closed</span>
                    <button class="slot-activate" onclick="game.activateSlot(${index})">Add Player</button>
                `;
            }
        });
        
        // Update ready button state
        const activeSlots = this.soloModeSlots.filter(slot => slot.active);
        const readyButton = document.getElementById('solo-ready-btn');
        
        if (activeSlots.length >= 2) {
            readyButton.disabled = false;
            readyButton.textContent = `Ready (${activeSlots.length} Players)`;
        } else {
            readyButton.disabled = true;
            readyButton.textContent = 'Ready (Need at least 2 players)';
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
            this.addLogEntry(`🎮 <strong>New Game Started</strong> - ${playerCount} players`, 'round-start');
            this.addLogEntry(`🔄 <strong>Round ${this.currentRound || 1} Started</strong>`, 'round-start');
        }
        
        // Update location rewards based on player count
        this.updateLocationRewards();
        this.setupDummyTokens(playerCount);
        
        const assignedWeapons = this.getRandomWeapons(playerCount);
        this.playerColors = this.getRandomPlayerColors(playerCount);
        
        // Create players with bot configuration
        this.createPlayers(playerCount, assignedWeapons, botConfiguration);
        
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
        this.addLogEntry(`🎮 <strong>New Game Started</strong> - ${playerCount} players`, 'round-start');
        this.addLogEntry(`🔄 <strong>Round ${this.currentRound || 1} Started</strong>`, 'round-start');
        
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
        playerBoardsContainer.className = `player-boards players-${playerCount}`;
        
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
        
        this.players.forEach(player => {
            const playerBoard = this.createPlayerBoardHTML(player);
            container.appendChild(playerBoard);
        });
    }
    
    createPlayerBoardHTML(player) {
        const board = document.createElement('div');
        board.className = 'player-board';
        board.id = `player-${player.id}-board`;

        // Add player color as a border
        if (player.color) {
            board.style.borderColor = player.color.border;
            board.style.borderWidth = '3px';
        }

        // Check if buttons should be disabled
        const buttonsDisabled = this.shouldDisablePlayerButtons(player.id);
        const disabledAttr = buttonsDisabled ? ' disabled' : '';
        const disabledTitle = buttonsDisabled ? ' title="Cannot interact with this player board"' : '';

        // Check if upgrade buttons should be disabled due to max reached
        const hpUpgradeDisabled = buttonsDisabled || player.maxResources.hp >= 10;
        const hpUpgradeAttr = hpUpgradeDisabled ? ' disabled' : '';
        const hpUpgradeTitle = hpUpgradeDisabled ?
            (player.maxResources.hp >= 10 ? ' title="HP is at maximum (10)"' : ' title="Cannot interact with this player board"') : '';

        const epUpgradeDisabled = buttonsDisabled || player.maxResources.ep >= 10;
        const epUpgradeAttr = epUpgradeDisabled ? ' disabled' : '';
        const epUpgradeTitle = epUpgradeDisabled ?
            (player.maxResources.ep >= 10 ? ' title="EP is at maximum (10)"' : ' title="Cannot interact with this player board"') : '';

        board.innerHTML = `
            <!-- Left Column: HP and EP sections -->
            <div class="board-left-section">
                <!-- HP Section -->
                <div class="hp-section">
                    <div class="stat-header">
                        <span class="stat-label">HP</span>
                        <span class="stat-value" id="p${player.id}-hp">${player.resources.hp}</span>
                        <span class="stat-max">/${player.maxResources.hp}</span>
                    </div>
                    <div class="upgrade-section">
                        <div class="upgrade-bar">
                            <span>Upgrade:</span>
                            <span id="p${player.id}-hp-progress">${player.upgradeProgress.hp}/3</span>
                            <button class="small-btn" onclick="game.addToUpgrade(${player.id}, 'hp')"${hpUpgradeAttr}${hpUpgradeTitle}>+🩸</button>
                        </div>
                        <div class="milestones">
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-6" disabled> 6(+2pts)</label>
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-8" disabled> 8(+3pts)</label>
                            <label><input type="checkbox" id="p${player.id}-hp-milestone-10" disabled> 10(+4pts)</label>
                        </div>
                    </div>
                </div>

                <!-- EP Section -->
                <div class="ep-section">
                    <div class="stat-header">
                        <span class="stat-label">EP</span>
                        <span class="stat-value" id="p${player.id}-ep">${player.resources.ep}</span>
                        <span class="stat-max">/${player.maxResources.ep}</span>
                    </div>
                    <div class="upgrade-section">
                        <div class="upgrade-bar">
                            <span>Upgrade:</span>
                            <span id="p${player.id}-ep-progress">${player.upgradeProgress.ep}/4</span>
                            <button class="small-btn" onclick="game.addToUpgrade(${player.id}, 'ep')"${epUpgradeAttr}${epUpgradeTitle}>+🍺</button>
                        </div>
                        <div class="milestones">
                            <label><input type="checkbox" id="p${player.id}-ep-milestone-8" disabled> 8(+2pts)</label>
                            <label><input type="checkbox" id="p${player.id}-ep-milestone-10" disabled> 10(+4pts)</label>
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
                        <span class="resource-label">Capacity</span>
                        <span id="p${player.id}-capacity">${player.weapon.capacity}</span>
                    </div>
                </div>

                <!-- Inventory Section -->
                <div class="inventory-compact">
                    <h4>Inventory</h4>
                    <div class="inventory-items" id="p${player.id}-inventory">
                        <!-- Inventory items will be displayed here -->
                    </div>
                </div>
            </div>
            <!-- Center Column: Weapon Section -->
            <div class="board-center-section">
                <div class="weapon-header">
                    <h3 id="p${player.id}-weapon-name">${player.weapon.name}</h3>
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
                        <span>Attack Dice</span>
                        <span id="p${player.id}-attack-dice">${player.weapon.currentAttackDice}</span>
                        <button class="small-btn" onclick="game.upgradeWeapon(${player.id}, 'attack')"${disabledAttr}${disabledTitle}>⚔️</button>
                        <span class="cost">(<span id="p${player.id}-req-exp-attack">${player.weapon.reqExpAttack}</span>EXP)</span>
                    </div>
                    <div class="dice-stat">
                        <span>Defense Dice</span>
                        <span id="p${player.id}-defense-dice">${player.weapon.currentDefenseDice}</span>
                        <button class="small-btn" onclick="game.upgradeWeapon(${player.id}, 'defense')"${disabledAttr}${disabledTitle}>🛡️</button>
                        <span class="cost">(<span id="p${player.id}-req-exp-defense">3</span>EXP)</span>
                    </div>
                </div>

                <div class="weapon-ammo" style="display: ${player.weapon.name === 'Rifle' || player.weapon.name === 'Plasma' ? 'block' : 'none'};">
                    <div class="stat rifle-bullets" id="p${player.id}-bullets-stat" style="display: ${player.weapon.name === 'Rifle' ? 'block' : 'none'};">
                        <span>Bullets:</span>
                        <span id="p${player.id}-bullet-count">0/6</span>
                    </div>
                    <div class="stat plasma-batteries" id="p${player.id}-batteries-stat" style="display: ${player.weapon.name === 'Plasma' ? 'block' : 'none'};">
                        <span>Batteries:</span>
                        <span id="p${player.id}-battery-count">0/6</span>
                    </div>
                </div>

                <div class="weapon-power-section">
                    <h4>Weapon Power Track</h4>
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
                        <div class="power-level active" id="p${player.id}-power-lv1">
                            <div class="power-title">Lv1</div>
                            <div class="power-desc" id="p${player.id}-power-desc-1">${player.weapon.lv1Power}</div>
                        </div>
                        <div class="power-level" id="p${player.id}-power-lv2">
                            <div class="power-title">Lv2</div>
                            <div class="power-desc" id="p${player.id}-power-desc-2">${player.weapon.lv2Power}</div>
                        </div>
                        <div class="power-level" id="p${player.id}-power-lv3">
                            <div class="power-title">Lv3</div>
                            <div class="power-desc" id="p${player.id}-power-desc-3">${player.weapon.lv3Power}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Player info, Popularity, Pet -->
            <div class="board-right-section">
                <div class="player-info-compact">
                    <h3 id="player-${player.id}-name">
                        ${player.color ? `<span class="player-color-indicator" style="background-color: ${player.color.background}; border-color: ${player.color.border};"></span>` : ''}
                        ${player.name}
                    </h3>
                    <div class="score-display">
                        <span>Score:</span>
                        <span id="p${player.id}-score">${player.score}</span>
                    </div>
                </div>

                <div class="popularity-section">
                    <h4>Popularity Track</h4>
                    <div class="popularity-track-compact" id="p${player.id}-popularity-track">
                        <!-- Popularity track will be displayed here -->
                    </div>
                </div>

                <div class="pet-section-compact">
                    <h4>Pet</h4>
                    <div class="pet-display">
                        <div class="pet-row">
                            <span>Lv1:</span>
                            <span id="p${player.id}-pet-lv1">0</span>
                        </div>
                        <div class="pet-row">
                            <span>Lv2:</span>
                            <span id="p${player.id}-pet-lv2">0</span>
                        </div>
                        <div class="pet-row">
                            <span>Lv3:</span>
                            <span id="p${player.id}-pet-lv3">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return board;
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
    }
    
    createCard(location, tokenType) {
        const card = document.createElement('div');
        card.className = `location-card ${tokenType}-card`;
        card.dataset.locationId = location.id;
        card.dataset.location = location.id; // Add data-location attribute for Forest button queries
        card.dataset.tokenType = tokenType;
        card.textContent = location.name;
        
        
        // Force basic styling to ensure visibility, but allow CSS classes to override
        card.style.width = '80px';
        card.style.height = '100px';
        card.style.borderRadius = '8px';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
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
                hasAmmo = batteryCount > 0 || this.currentPlayer.weapon.powerTrackPosition >= 7; // Plasma Lv3 has infinite ammo
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
            // Reset to default colors
            card.style.backgroundColor = '#ecf0f1';
            card.style.color = '#2c3e50';
            card.style.border = '3px solid #95a5a6';
        });
        
        // If there was a previous selection, re-enable it in the other token type's cards (except Forest)
        if (previousSelection !== null && previousSelection !== 7) { // Don't re-enable Forest since it's always allowed
            const otherTokenType = tokenType === 'hunter' ? 'apprentice' : 'hunter';
            const previousCardInOtherSet = document.querySelector(`#${otherTokenType}-cards .location-card[data-location-id="${previousSelection}"]`);
            if (previousCardInOtherSet) {
                previousCardInOtherSet.classList.remove('disabled');
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
            }
        }
        
        // Update player's selection
        this.currentPlayer.selectedCards[tokenType] = locationId;
        
        // Check if both selections are made
        this.checkSelectionComplete();
    }
    
    // Removed duplicate - using the version at line 1917
    
    getLocationName(locationId) {
        const location = this.locations.find(loc => loc.id === locationId);
        return location ? location.name : '';
    }
    
    confirmSelection() {
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
                warningMessages.push('• You need at least 2 EP to enter the Forest (you have ' + this.currentPlayer.resources.ep + ' EP)');
                canGetInStore = true;
            }
            
            // Check ammunition requirement for Rifle/Plasma
            if (!this.hasRequiredAmmunition(this.currentPlayer)) {
                if (this.currentPlayer.weapon.name === 'Rifle') {
                    const bulletCount = this.currentPlayer.inventory.filter(item => item.name === 'Bullet').length;
                    warningMessages.push('• Rifle needs bullets for combat (you have ' + bulletCount + ' bullets)');
                    canGetInStore = true;
                } else if (this.currentPlayer.weapon.name === 'Plasma') {
                    const batteryCount = this.currentPlayer.inventory.filter(item => item.name === 'Battery').length;
                    warningMessages.push('• Plasma needs batteries for combat (you have ' + batteryCount + ' batteries)');
                    canGetInStore = true;
                }
            }
            
            // Show warning if any requirements are missing
            if (warningMessages.length > 0) {
                let fullMessage = '⚠️ Forest Entry Warning\n\n';
                fullMessage += 'Your Hunter is entering the Forest but lacks the following:\n\n';
                fullMessage += warningMessages.join('\n');
                fullMessage += '\n\n';
                
                if (canGetInStore) {
                    fullMessage += 'You can still obtain these resources in the Store phase.\n';
                    fullMessage += 'Combat items (Grenades, Bombs, Dynamite) can also be used to fight monsters.\n\n';
                }
                
                fullMessage += 'Do you want to proceed with this selection?';
                
                if (!confirm(fullMessage)) {
                    console.log('Player canceled Forest entry during confirmation');
                    return; // Player canceled, don't confirm selection
                }
            }
        }
        
        // Store the selection message for batch logging later (only for human players, bots already added theirs)
        if (!this.currentPlayer.isBot) {
            const hunterLocationName = this.getLocationName(this.currentPlayer.selectedCards.hunter);
            const apprenticeLocationName = this.getLocationName(this.currentPlayer.selectedCards.apprentice);
            this.pendingSelectionLogs.push({
                message: `📍 <strong>${this.currentPlayer.name}</strong> selected: Hunter → ${hunterLocationName}, Apprentice → ${apprenticeLocationName}`,
                type: 'selection',
                player: this.currentPlayer
            });
        }

        // Track location selections for statistics
        const hunterLocation = this.currentPlayer.selectedCards.hunter;
        const apprenticeLocation = this.currentPlayer.selectedCards.apprentice;
        this.currentPlayer.locationSelections[hunterLocation].hunter++;
        this.currentPlayer.locationSelections[apprenticeLocation].apprentice++;

        // Move to next player
        this.currentPlayerIndex++;
        
        if (this.currentPlayerIndex >= this.players.length) {
            // All players have made selections, log all selections together
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] All players completed selections, moving to resource distribution`);
            }
            
            // Add all pending selection logs to the game log
            for (const logEntry of this.pendingSelectionLogs) {
                this.addLogEntry(logEntry.message, logEntry.type, logEntry.player);
            }
            
            // Clear pending logs for next round
            this.pendingSelectionLogs = [];
            
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
        document.getElementById('status-message').textContent = 'Round complete! Resources have been distributed.';
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
        document.getElementById('new-game-btn').addEventListener('click', () => this.resetGame());
    }
    
    resetMilestoneCheckboxes() {
        // Reset all milestone checkboxes for all players
        this.players.forEach(player => {
            const checkboxIds = [
                `p${player.id}-ep-milestone-8`, `p${player.id}-ep-milestone-10`,
                `p${player.id}-hp-milestone-8`, `p${player.id}-hp-milestone-10`
            ];
            
            checkboxIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
        });
    }
    
    resetGame() {
        // Confirm before restarting
        if (confirm('Are you sure you want to start a new game? All progress will be lost.')) {
            this.resetMilestoneCheckboxes();
            location.reload();
        }
    }
    
    updateUI() {
        // Update current player display
        document.getElementById('current-player-name').textContent = this.currentPlayer.name;
        
        // Update status message
        if (this.roundPhase === 'selection') {
            document.getElementById('status-message').textContent = 
                `${this.currentPlayer.name}: Select locations for your Hunter and Apprentice`;
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
            
            // Update inventory display
            this.updateInventoryDisplay(player.id);
            
            // Update weapon power display
            this.updateWeaponPowerDisplay(player.id);
            
            // Update damage grid display
            this.updateDamageGrid(player.id);
        });
    }
    
    shouldDisablePlayerButtons(playerId) {
        // Disable buttons if:
        // 1. The player is a bot (no one can interact with bot boards)
        // 2. The game is over (no one can interact with any boards)
        const player = this.players.find(p => p.id === playerId);
        if (!player) return true;
        return player.isBot || this.roundPhase === 'gameover';
    }
    
    disableAllPlayerButtons() {
        // Disable all buttons for all players when game ends
        this.players.forEach(player => {
            const playerId = player.id;
            const disabledTitle = 'Game is over - cannot interact with player boards';
            
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
            
            // Disable attack and defense dice upgrade buttons using better selector
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
            
            // Disable inventory use buttons WITHOUT re-rendering
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
        
        // Update upgrade progress
        const epProgress = document.getElementById(`${prefix}-ep-progress`);
        const hpProgress = document.getElementById(`${prefix}-hp-progress`);
        if (epProgress) epProgress.textContent = `${player.upgradeProgress.ep}/4`;
        if (hpProgress) hpProgress.textContent = `${player.upgradeProgress.hp}/3`;
        
        // Update weapon display
        const weaponName = document.getElementById(`${prefix}-weapon-name`);
        if (weaponName) weaponName.textContent = player.weapon.name;
        
        const attackDice = document.getElementById(`${prefix}-attack-dice`);
        const defenseDice = document.getElementById(`${prefix}-defense-dice`);
        if (attackDice) attackDice.textContent = player.weapon.currentAttackDice;
        if (defenseDice) defenseDice.textContent = player.weapon.currentDefenseDice;
        
        const capacity = document.getElementById(`${prefix}-capacity`);
        if (capacity) capacity.textContent = `${this.getInventorySize(player)}/${player.maxInventoryCapacity}`;
        
        const reqExpAttack = document.getElementById(`${prefix}-req-exp-attack`);
        const reqExpDefense = document.getElementById(`${prefix}-req-exp-defense`);
        if (reqExpAttack) reqExpAttack.textContent = player.weapon.reqExpAttack;
        if (reqExpDefense) reqExpDefense.textContent = player.weapon.reqExpDefense;
        
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
            { name: 'Beer', icon: '🍺', description: 'Restores 1 EP / Upgrade EP max' },
            { name: 'Blood Bag', icon: '🩸', description: 'Restores 1 HP / Upgrade HP max' },
            { name: 'Grenade', icon: '💣', description: '+1 damage to monster' },
            { name: 'Bomb', icon: '💥', description: '+2 damage to monster' },
            { name: 'Dynamite', icon: '🧨', description: '+3 damage to monster' },
            { name: 'Fake Blood', icon: '🩹', description: '+2 points when defeating monster' }
        ];
        
        // Count current items in inventory
        const itemCounts = {};
        player.inventory.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
        
        // Check if buttons should be disabled for this player
        const buttonsDisabled = this.shouldDisablePlayerButtons(playerId);
        
        // Display all items with their counts (0 if not owned)
        const htmlContent = allItems
            .map(item => {
                const count = itemCounts[item.name] || 0;
                let canUse = false;
                let useButton = '';
                
                if (count > 0) {
                    if (item.name === 'Beer') {
                        // Can use beer if EP is not at maximum
                        canUse = player.resources.ep < player.maxResources.ep;
                        const disabled = (!canUse || buttonsDisabled) ? ' disabled' : '';
                        const title = buttonsDisabled ? 'Cannot interact with this player board' : 
                                     (canUse ? 'Use Beer (+1 EP)' : 'EP is already at maximum');
                        useButton = `<button class="small-btn"${disabled} onclick="game.useInventoryItem(${playerId}, '${item.name}')" title="${title}">Use</button>`;
                        
                    } else if (item.name === 'Blood Bag') {
                        // Can use blood bag if HP is not at maximum
                        canUse = player.resources.hp < player.maxResources.hp;
                        const disabled = (!canUse || buttonsDisabled) ? ' disabled' : '';
                        const title = buttonsDisabled ? 'Cannot interact with this player board' :
                                     (canUse ? 'Use Blood Bag (+1 HP)' : 'HP is already at maximum');
                        useButton = `<button class="small-btn"${disabled} onclick="game.useInventoryItem(${playerId}, '${item.name}')" title="${title}">Use</button>`;
                        
                        // Katana Level 1 Power removed (no longer has Level 1 power)
                    }
                }
                
                return `<div class="inventory-item-counter" title="${item.description}">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-count" id="p${playerId}-${item.name.replace(' ', '')}-count">${count}</span>
                    ${useButton}
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
                this.addLogEntry(`⚠️ ${player.name} reached max ${resourceType} (${maxValue}). Lost ${lostAmount} ${resourceType}!`, 'system', player);
                // Show alert for human players only
                if (!player.isBot && !this.isAutomatedMode) {
                    alert(`⚠️ Resource Cap Reached!\n\n${player.name} has reached the maximum ${resourceType} limit of ${maxValue}.\n\n${lostAmount} ${resourceType} was lost!`);
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
        // In the new flow, this function handles battles during battle phase
        if (forestHunters.length === 0) {
            this.endRound();
            return;
        }
        
        // Handle one hunter at a time
        this.currentMonsterPlayer = forestHunters[0];
        this.remainingForestHunters = forestHunters.slice(1);
        
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        
        // Check if current player is a bot
        if (player.isBot) {
            this.handleBotMonsterSelection(player);
            return;
        }
        
        document.getElementById('monster-modal-title').textContent = `${player.name}: Choose Monster to Fight`;
        
        // Reset selected pets and monster level
        this.selectedMonsterLevel = null;
        this.selectedPets = { level1: 0, level2: 0, level3: 0 };
        
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
    
    findOptimalItemCombination(player, targetDamage) {
        // Find the minimal item combination to deal at least targetDamage
        const combatItems = [];
        
        // Count available items
        player.inventory.forEach(item => {
            if (item.name === 'Dynamite') combatItems.push({ name: 'Dynamite', damage: 3 });
            else if (item.name === 'Bomb') combatItems.push({ name: 'Bomb', damage: 2 });
            else if (item.name === 'Grenade') combatItems.push({ name: 'Grenade', damage: 1 });
        });
        
        if (combatItems.length === 0) return null;
        
        // Sort by damage (highest first for efficiency)
        combatItems.sort((a, b) => b.damage - a.damage);
        
        // Try to find exact combination that can kill
        const combination = [];
        let remainingDamage = targetDamage;
        
        for (const item of combatItems) {
            if (remainingDamage <= 0) break;
            
            if (item.damage <= remainingDamage) {
                combination.push(item);
                remainingDamage -= item.damage;
            } else if (remainingDamage > 0 && combination.length === 0) {
                // If this is the first item and it overkills, use it anyway
                combination.push(item);
                remainingDamage = 0;
            }
        }
        
        // Only return combination if it can kill the monster
        if (remainingDamage <= 0) {
            return combination;
        }
        
        // Cannot kill with available items - return null (save items)
        return null;
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
        if (this.selectedPets.level1 > 0) petInfo.push(`${this.selectedPets.level1} Level 1 Pet`);
        if (this.selectedPets.level2 > 0) petInfo.push(`${this.selectedPets.level2} Level 2 Pet`);
        if (this.selectedPets.level3 > 0) petInfo.push(`${this.selectedPets.level3} Level 3 Pet`);
        
        const petText = petInfo.length > 0 ? ` with ${petInfo.join(', ')}` : '';
        this.addLogEntry(
            `⚔️ <strong>${player.name}</strong> (Bot) chose Level ${selectedLevel} Monster${petText} (${totalEPCost} EP)`,
            'battle',
            player
        );
        
        // Deduct EP
        this.modifyResource(player.id, 'ep', -totalEPCost);
        
        // Select random available monster from the level
        const selectedMonster = this.selectRandomAvailableMonster(selectedLevel);
        if (!selectedMonster) {
            console.error(`No available monsters found for level ${selectedLevel}`);
            return;
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
        
        // Hide battle UI for bot
        document.getElementById('monster-battle').style.display = 'none';
        
        // Show status message
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.innerHTML = `<strong>${player.name}</strong> (Bot) is battling Level ${battle.monster.level} Monster...`;
        }
        
        // Log battle start
        this.addLogEntry(
            `⚔️ <strong>${player.name}</strong> (Bot) enters battle vs Level ${battle.monster.level} Monster (${battle.monster.hp} HP, ${battle.monster.att} ATT)`,
            'battle',
            player
        );
        
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
            while (remainingHP > 0 && dynamites > 0 && remainingHP >= 3) {
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
            while (remainingHP > 0 && bombs > 0 && remainingHP >= 2) {
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
            
            // Log all battle actions
            battleActions.forEach(action => {
                if (!action.includes('---')) {
                    this.addLogEntry(`⚔️ ${action}`, 'battle', player);
                }
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
                if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                    this.handleForestEncounters(this.remainingForestHunters);
                } else {
                    this.endRound();
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
        
        // Check ammunition - if entrance fee paid (ammunitionConsumed = true), bot can attack
        let canAttack = true;
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            // If ammunition not consumed yet, check and consume
            if (!battle.ammunitionConsumed) {
                const bulletIndex = player.inventory.findIndex(item => item.name === 'Bullet');
                if (bulletIndex === -1) {
                    canAttack = false;
                    battleActions.push(`${player.name} has no bullets for battle!`);
                    currentPlayerHP = 0;
                    battleActions.push(`${player.name} defeated due to lack of ammunition!`);
                } else {
                    // Consume one bullet as entrance fee
                    player.inventory.splice(bulletIndex, 1);
                    battle.ammunitionConsumed = true;
                    battleActions.push(`${player.name} uses 1 bullet as entrance fee for this battle!`);
                }
            }
            // If ammunitionConsumed is true, bot can attack freely
        } else if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
            // If ammunition not consumed yet, check and consume
            if (!battle.ammunitionConsumed) {
                const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
                if (batteryIndex === -1) {
                    canAttack = false;
                    battleActions.push(`${player.name} has no batteries for battle!`);
                    currentPlayerHP = 0;
                    battleActions.push(`${player.name} defeated due to lack of ammunition!`);
                } else {
                    // Consume one battery as entrance fee
                    player.inventory.splice(batteryIndex, 1);
                    battle.ammunitionConsumed = true;
                    battleActions.push(`${player.name} uses 1 battery as entrance fee for this battle!`);
                }
            }
            // If ammunitionConsumed is true, bot can attack freely
        }
        
        while (currentPlayerHP > 0 && currentMonsterHP > 0 && canAttack) {
            battleActions.push(`--- Round ${battleRound} ---`);
            
            // Bot's turn - attack first
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
                    battleActions.push(`Monster effect limits damage to ${damageCap} (would have dealt ${originalDamage})`);
                }
            }
            
            currentMonsterHP -= totalDamage;
            
            battleActions.push(`${player.name} attacks: [${attackRolls.join(', ')}] = ${playerDamage} damage${petDamage > 0 ? ` + ${petDamage} pet damage` : ''} = ${totalDamage} total`);
            
            // Sword Level 3 Power: +1 point if at least one attack die shows 1
            if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 7) {
                const hasOnes = attackRolls.includes(1);
                if (hasOnes) {
                    this.addScore(player.id, 1, 'other'); // Sword Lv3 power
                    battleActions.push(`Sword Lv3 Power: +1 point for rolling at least one 1 on attack!`);
                }
            }
            
            // Tactical item usage: Check if bot can finish monster with items
            if (currentMonsterHP > 0) {
                const itemCombination = this.findOptimalItemCombination(player, currentMonsterHP);
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
                    if (itemDamageCap !== null) {
                        finalItemDamage = Math.min(itemDamage, itemDamageCap);
                        if (itemDamage > itemDamageCap) {
                            battleActions.push(`${player.name} uses items: ${itemsUsed.join(', ')} for ${finalItemDamage} damage (capped from ${itemDamage})!`);
                        } else {
                            battleActions.push(`${player.name} uses items: ${itemsUsed.join(', ')} for ${finalItemDamage} damage!`);
                        }
                    } else {
                        battleActions.push(`${player.name} uses items: ${itemsUsed.join(', ')} for ${finalItemDamage} damage!`);
                    }
                    currentMonsterHP -= finalItemDamage;
                }
            }
            
            if (currentMonsterHP <= 0) {
                battleActions.push(`Monster defeated!`);
                break;
            }
            
            // Monster's turn
            const monsterDamage = monster.att;
            
            // Bot defense
            const defenseDice = player.weapon.currentDefenseDice;
            const defenseRolls = [];
            for (let i = 0; i < defenseDice; i++) {
                defenseRolls.push(Math.floor(Math.random() * 6) + 1);
            }
            
            let defense = 0;
            defenseRolls.forEach(roll => {
                if (roll >= 4) defense++; // 4, 5, 6 = 1 defense each
            });
            
            const finalDamage = Math.max(0, monsterDamage - defense);
            currentPlayerHP -= finalDamage;
            
            // Bot gains EXP equal to damage taken
            if (finalDamage > 0) {
                player.resources.exp = Math.min(player.maxResources.exp, player.resources.exp + finalDamage);
            }
            
            battleActions.push(`Monster attacks for ${monsterDamage} damage. ${player.name} defends: [${defenseRolls.join(', ')}] = ${defense} defense. Final damage: ${finalDamage}${finalDamage > 0 ? ` (+${finalDamage} EXP)` : ''}`);
            
            // Sword Level 3 Power nerfed: only works on attack dice, not defense
            
            // Axe retaliation (if player survives)
            if (player.weapon.name === 'Axe' && finalDamage > 0 && currentPlayerHP > 0) {
                let retaliationDamage;
                if (player.weapon.powerTrackPosition >= 7) {
                    // Level 3: Deal same damage to monster (overrides Level 1)
                    retaliationDamage = finalDamage;
                    battleActions.push(`${player.name}'s Axe Lv3 Power: retaliates for ${retaliationDamage} damage!`);
                } else {
                    // Level 1: Deal 1 damage to monster when HP decreases
                    retaliationDamage = 1;
                    battleActions.push(`${player.name}'s Axe Lv1 Power: retaliates for ${retaliationDamage} damage!`);
                }
                // Apply damage cap to Axe retaliation
                const retaliationCap = this.applyBattleEffect(monster, 'damageCap');
                if (retaliationCap !== null) {
                    const originalRetaliation = retaliationDamage;
                    retaliationDamage = Math.min(retaliationDamage, retaliationCap);
                    if (originalRetaliation > retaliationCap && player.weapon.powerTrackPosition >= 7) {
                        battleActions.push(`Axe retaliation capped at ${retaliationCap}!`);
                    }
                }
                currentMonsterHP -= retaliationDamage;
                
                if (currentMonsterHP <= 0) {
                    battleActions.push(`Monster defeated by retaliation!`);
                    break;
                }
            }
            
            battleRound++;
            
            // Safety break to prevent infinite battles
            if (battleRound > 20) {
                battleActions.push(`Battle timeout - monster wins`);
                currentPlayerHP = 0;
                break;
            }
        }
        
        // Apply battle results
        if (currentPlayerHP <= 0) {
            // Bot lost
            player.resources.hp = 1; // Set HP to 1 on defeat
            battleActions.push(`${player.name} was defeated but survives with 1 HP`);
        } else {
            // Bot won - update HP after battle
            player.resources.hp = currentPlayerHP;
            this.applyBotVictoryRewards(player, monster, battle, battleActions);
        }
        
        // Log all battle actions
        battleActions.forEach(action => {
            if (!action.includes('---')) {
                this.addLogEntry(`⚔️ ${action}`, 'battle', player);
            }
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
            if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                this.handleForestEncounters(this.remainingForestHunters);
            } else {
                this.endRound();
            }
        }, this.getDelay(2000));
    }
    
    applyBotVictoryRewards(player, monster, battle, battleActions) {
        // Track monsters defeated for statistics
        if (!player.monstersDefeated) {
            player.monstersDefeated = { level1: 0, level2: 0, level3: 0 };
        }
        
        player.monstersDefeated[`level${monster.level}`]++;
        battleActions.push(`${player.name} has defeated ${player.monstersDefeated.level1} Lv1, ${player.monstersDefeated.level2} Lv2, ${player.monstersDefeated.level3} Lv3 monsters`);
        
        // Check for Knife Level 3 Power: Double resources (not points)
        const knifeDoubleRewards = player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 7;
        const rewardMultiplier = knifeDoubleRewards ? 2 : 1;
        
        // Apply monster rewards
        const finalMoney = monster.money * rewardMultiplier;
        const finalEnergy = monster.energy * rewardMultiplier;
        const finalBlood = monster.blood * rewardMultiplier;
        
        // Apply resource caps (money max 15, others handled by items)
        player.resources.money = Math.min(player.maxResources.money, player.resources.money + finalMoney);
        player.resources.beer += finalEnergy; // Monster data uses 'energy' not 'beer'
        player.resources.bloodBag += finalBlood; // Monster data uses 'blood' not 'bloodBag'
        // Split the points between monster and fake blood sources
        this.addScore(player.id, monster.pts, 'monster'); // Points are NOT doubled by Knife Lv3
        if (battle.bonusPts > 0) {
            this.addScore(player.id, battle.bonusPts, 'fakeblood');
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
        
        let rewardText = `Victory! Gained: ${finalMoney}$`;
        if (finalEnergy > 0) rewardText += `, ${finalEnergy} beer`;
        if (finalBlood > 0) rewardText += `, ${finalBlood} blood bags`;
        rewardText += `, ${monster.pts + battle.bonusPts} points`;
        if (knifeDoubleRewards) {
            rewardText += ` (resources doubled by Knife Lv3 Power!)`;
        }
        
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
            battleActions.push(`${player.name} tamed the Level ${monster.level} monster as a pet!`);
            
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
                actions.push('used Blood Bag (+1 HP)');
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
                actions.push('used Beer (+1 EP)');
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
                actions.push(`upgraded max HP to ${player.maxResources.hp} (+2 milestone points)`);
            } else if (player.maxResources.hp === 8 && !player.milestones.hp8) {
                this.addScore(player.id, 3, 'milestone');
                player.milestones.hp8 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-hp-milestone-8`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(`upgraded max HP to ${player.maxResources.hp} (+3 milestone points)`);
            } else if (player.maxResources.hp === 10 && !player.milestones.hp10) {
                this.addScore(player.id, 4, 'milestone');
                player.milestones.hp10 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-hp-milestone-10`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(`upgraded max HP to ${player.maxResources.hp} (+4 milestone points)`);
            } else {
                actions.push(`upgraded max HP to ${player.maxResources.hp}`);
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
                actions.push(`upgraded max EP to ${player.maxResources.ep} (+2 milestone points)`);
            } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                this.addScore(player.id, 4, 'milestone');
                player.milestones.ep10 = true;
                if (!this.isAutomatedMode) {
                    const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                    if (checkbox) checkbox.checked = true;
                }
                actions.push(`upgraded max EP to ${player.maxResources.ep} (+4 milestone points)`);
            } else {
                actions.push(`upgraded max EP to ${player.maxResources.ep}`);
            }
            
            beers.splice(0, 4); // Update local array
        }
        
        // Priority 5: Upgrade attack/defense dice with EXP
        const botPlayer = new BotPlayer(player.id, player.weapon);
        botPlayer.manageEXP(player);
        
        // Log all actions
        if (actions.length > 0) {
            battleActions.push(`Auto-managed resources: ${actions.join(', ')}`);
        }
    }
    
    canTameMonster(player, monster) {
        // Chain weapon can tame monsters with HP <= 3
        if (player.weapon.name === 'Chain') {
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
        
        return false;
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
        
        document.getElementById('station-modal-title').textContent = `${player.name}: Choose Station Resource`;
        document.getElementById('station-modal').style.display = 'flex';
        this.pendingStationPlayer = playerId;
    }
    
    selectStationResource(resourceType) {
        if (this.pendingStationPlayer === null) return;
        
        this.stationChoices[this.pendingStationPlayer] = resourceType;
        document.getElementById('station-modal').style.display = 'none';
        
        // Remove this player from pending list
        this.pendingStationPlayers.shift();
        
        // Show modal for next player or complete distribution
        this.showStationModal();
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
            this.addLogEntry(
                `💰 <strong>${player.name}</strong> (Bot) chose ${preferredResource} at Station (weapon preference)`,
                'resource-gain',
                player
            );
        } else {
            // Choose randomly from available options
            const availableResources = ['money', 'beer', 'bloodBag', 'exp'];
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            selectedResource = availableResources[randomIndex];
            this.addLogEntry(
                `💰 <strong>${player.name}</strong> (Bot) chose ${selectedResource} at Station (random)`,
                'resource-gain',
                player
            );
        }
        
        // Apply the selection
        this.stationChoices[player.id] = selectedResource;
        
        // Remove this player from pending list
        this.pendingStationPlayers.shift();
        
        // Continue to next player or complete distribution
        setTimeout(() => {
            this.showStationModal();
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
            
            const playerType = player.isBot ? ' (Bot)' : '';
            if (resourceType === 'money' || resourceType === 'exp') {
                this.modifyResource(parseInt(playerId), resourceType, rewardAmount);
                const resourceName = resourceType === 'money' ? 'money' : 'EXP';
                this.addLogEntry(
                    `💰 <strong>${player.name}</strong>${playerType} received ${rewardAmount} ${resourceName} from Station`,
                    'resource-gain',
                    player
                );
            } else if (resourceType === 'beer' || resourceType === 'bloodBag') {
                player.resources[resourceType] += rewardAmount;
                // Also add items to inventory
                const itemName = resourceType === 'beer' ? 'Beer' : 'Blood Bag';
                this.addItemToInventory(parseInt(playerId), itemName, rewardAmount);
                this.addLogEntry(
                    `💰 <strong>${player.name}</strong>${playerType} received ${rewardAmount} ${itemName} from Station`,
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
                if ((player.weapon.name === 'Sword' || player.weapon.name === 'Katana') &&
                    player.weapon.powerTrackPosition >= 3) {
                    this.modifyResource(player.id, 'exp', 2);
                    if (!this.isAutomatedMode) {
                        console.log(`${player.weapon.name} Lv2 Power: ${player.name} receives +2 EXP for being alone at location`);
                    }
                }

                // Knife Level 2 Power: +1 point when hunter is alone
                if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 3) {
                    this.addScore(player.id, 1, 'other');
                    if (!this.isAutomatedMode) {
                        console.log(`Knife Lv2 Power: ${player.name} receives +1 point for being alone at location`);
                        this.addLogEntry(`🔪 ${player.name} receives +1 point from Knife Lv2 Power`, 'power', player);
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
                    const playerType = player.isBot ? ' (Bot)' : '';
                    this.addLogEntry(
                        `📈 <strong>${player.name}</strong>${playerType} reached Popularity Level ${newRewardLevel} (+${points} points)`,
                        'level-up',
                        player
                    );
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
        if (!trackElement) return;
        
        // Define track levels with rewards
        const trackLevels = [
            { level: 5, points: 11, reward: '5🏆' },
            { level: 4, points: 7, reward: '4⭐' },
            { level: 3, points: 4, reward: '3🩸' },
            { level: 2, points: 2, reward: '2💰' },
            { level: 1, points: 1, reward: '1🍺' },
            { level: 0, points: 0, reward: 'None' }
        ];
        
        // Create track HTML
        let trackHTML = '<div class="track-levels">';
        
        trackLevels.forEach(level => {
            const hasPointToken = player.popularityTrack.pointToken === level.level;
            const hasRewardToken = player.popularityTrack.rewardToken === level.level;
            
            trackHTML += `
                <div class="track-level">
                    <div class="level-number">Lv.${level.level}</div>
                    <div class="level-section">
                        <div class="section-label">Points</div>
                        <div class="section-value">${level.points}</div>
                        ${hasPointToken ? `<div class="track-token point-token" style="background-color: ${player.color?.background || '#f39c12'}; border-color: ${player.color?.border || '#f39c12'}; left: 35%;"></div>` : ''}
                    </div>
                    <div class="level-section">
                        <div class="section-label">Reward</div>
                        <div class="section-value">${level.reward}</div>
                        ${hasRewardToken ? `<div class="track-token reward-token" style="background-color: ${player.color?.background || '#27ae60'}; border-color: ${player.color?.border || '#27ae60'}; left: 65%;"></div>` : ''}
                    </div>
                </div>
            `;
        });
        
        trackHTML += '</div>';
        trackElement.innerHTML = trackHTML;
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

        // Check if already at maximum
        if (player.maxResources[upgradeType] >= 10) {
            alert(`Cannot upgrade ${upgradeType.toUpperCase()} - already at maximum (10)`);
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
                alert(`Player ${playerId}'s max ${upgradeType.toUpperCase()} increased!`);
            }
            
            // Update all displays
            this.updateInventoryDisplayOld();
            this.players.forEach(player => {
                this.updateInventoryDisplay(player.id);
            });
            this.updateResourceDisplay();
            
            // Update store capacity display if in store phase
            if (this.roundPhase === 'store') {
                this.updateStoreCapacityDisplay();
            }
            
            // Update location card states if in selection phase and EP was upgraded
            if (this.roundPhase === 'selection' && upgradeType === 'ep' && player.id === this.currentPlayer.id) {
                this.updateLocationCardStates();
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
                alert(`${player.name} used beer and recovered 1 EP!`);
            } else {
                alert(`${player.name}'s EP is already at maximum!`);
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
                alert(`${player.name} used blood bag and recovered 1 HP!`);
            } else {
                alert(`${player.name}'s HP is already at maximum!`);
            }
        } else {
            if (player.resources[itemType] === 0) {
                alert(`${player.name} doesn't have any ${itemType === 'bloodBag' ? 'blood bags' : itemType}!`);
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
                // Level 1: +1 attack when HP is below half of max HP (only on dice that deal damage)
                if (player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
                    if (baseDamage > 0 && player.resources.hp < player.maxResources.hp / 2) {
                        baseDamage += 1;
                    }
                }
                // Level 3: +1 attack for each time damaged (only on dice that deal damage)
                else if (player.weapon.powerTrackPosition >= 7) {
                    if (baseDamage > 0) {
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
        
        if (upgradeType === 'attack') {
            // Check if already at max attack dice (7)
            if (player.weapon.currentAttackDice >= 7) {
                alert(`${player.name}'s attack dice is already at maximum (7)!`);
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
                alert(`${player.name}'s attack dice upgraded to ${player.weapon.currentAttackDice}!`);
                return true;
            } else {
                alert(`${player.name} needs ${requiredExp} EXP to upgrade attack dice (current: ${player.resources.exp})`);
            }
        } else if (upgradeType === 'defense') {
            // Check if already at max defense dice (6)
            if (player.weapon.currentDefenseDice >= 6) {
                alert(`${player.name}'s defense dice is already at maximum (6)!`);
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
                alert(`${player.name}'s defense dice upgraded to ${player.weapon.currentDefenseDice}!`);
                return true;
            } else {
                alert(`${player.name} needs ${requiredExp} EXP to upgrade defense dice (current: ${player.resources.exp})`);
            }
        }
        
        return false;
    }
    
    loadMonsters() {
        // Load monster data from Monster.csv
        // Since we can't directly read CSV files in browser, we'll use the parsed data
        // Effect IDs correspond to the order in Monster.csv
        const monsterData = [
            { level: 1, hp: 4, att: 1, money: 3, energy: 1, blood: 0, effect: "無", effectId: 1, pts: 2 },
            { level: 1, hp: 4, att: 1, money: 0, energy: 3, blood: 0, effect: "血減半時，攻擊力+1", effectId: 2, pts: 3 },
            { level: 1, hp: 4, att: 2, money: 2, energy: 1, blood: 0, effect: "偷走玩家2金幣", effectId: 3, pts: 4 },
            { level: 1, hp: 3, att: 2, money: 0, energy: 1, blood: 1, effect: "死亡時，玩家及在森林裡的玩家-1血", effectId: 4, pts: 3 },
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
            { level: 2, hp: 5, att: 4, money: 0, energy: 2, blood: 1, effect: "不在森林的玩家-1分", effectId: 23, pts: 7 },
            { level: 2, hp: 5, att: 3, money: 2, energy: 2, blood: 0, effect: "血減半時，攻擊力+1", effectId: 24, pts: 6 },
            { level: 3, hp: 13, att: 3, money: 0, energy: 0, blood: 3, effect: "不在森林的玩家-2血", effectId: 25, pts: 15 },
            { level: 3, hp: 12, att: 3, money: 1, energy: 3, blood: 0, effect: "血減半時，攻擊力+1", effectId: 26, pts: 15 },
            { level: 3, hp: 12, att: 4, money: 0, energy: 1, blood: 2, effect: "玩家防禦力3以上先攻", effectId: 27, pts: 16 },
            { level: 3, hp: 11, att: 3, money: 2, energy: 2, blood: 0, effect: "不在森林的玩家-2分", effectId: 28, pts: 14 },
            { level: 3, hp: 11, att: 5, money: 2, energy: 1, blood: 1, effect: "每次玩家攻擊-1體力", effectId: 29, pts: 16 },
            { level: 3, hp: 11, att: 4, money: 1, energy: 3, blood: 0, effect: "玩家無法一次給予怪獸超過6點傷害", effectId: 30, pts: 15 },
            { level: 3, hp: 11, att: 4, money: 2, energy: 2, blood: 0, effect: "死亡時，玩家及在森林裡的玩家-1血", effectId: 31, pts: 15 },
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
                    this.showEffectNotification(
                        `Monster steals ${moneyLoss} money from ${player.name}!`,
                        `This monster has the ability to steal money when selected.`
                    );
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
        if (this.roundEffectsApplied) return; // Only apply once per round
        
        switch(effectId) {
            case 8: // Other monsters gain +1 HP this round
            case 16: // Other monsters gain +1 HP this round  
            case 33: // Other monsters gain +1 HP this round
                // This will be applied to other monsters when they are selected
                this.activeMonsterEffects.push({ type: 'otherMonstersHPBonus', value: 1 });
                this.showEffectNotification(
                    `All other monsters gain +1 HP this round!`,
                    `This monster's presence strengthens all other monsters in the forest.`
                );
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
                    this.showEffectNotification(
                        `Players not in forest lose 1 HP: ${affectedPlayers9.join(', ')}`,
                        `This monster's aura damages all players who chose not to enter the forest.`
                    );
                }
                break;
                
            case 23: // Players not in forest lose 1 point
                const affectedPlayers23 = [];
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id)) {
                        p.score = Math.max(0, p.score - 1);
                        affectedPlayers23.push(p.name);
                    }
                });
                if (affectedPlayers23.length > 0) {
                    this.showEffectNotification(
                        `Players not in forest lose 1 point: ${affectedPlayers23.join(', ')}`,
                        `This monster's curse affects the scores of those who avoid the forest.`
                    );
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
                    this.showEffectNotification(
                        `Players not in forest lose HP: ${affectedPlayers25.join(', ')}`,
                        `This powerful monster's aura severely damages those outside the forest.`
                    );
                }
                break;
                
            case 28: // Players not in forest lose 2 points
                this.players.forEach(p => {
                    if (!this.forestPlayersThisRound.has(p.id)) {
                        p.score = Math.max(0, p.score - 2);
                        this.addLogEntry(`📉 ${p.name} loses 2 points (not in forest)`, 'effect', p);
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
        
        // Original implementation for complex battle effects
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
                        this.logBattleAction(`${player.name} loses 1 EP from monster effect`, player);
                    }
                }
                break;
                
            case 11: // Monster gains +1 HP when attacked but not defeated
                if (context === 'monsterDamaged' && monster.hp > 0) {
                    monster.hp += 1;
                    monster.maxHp = Math.max(monster.maxHp, monster.hp);
                    this.logBattleAction(`Monster gains +1 HP from its effect (${monster.hp} HP)`, player);
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
            case 4: // Forest players lose 1 HP (except those at 1 HP)
            case 31: // Forest players lose 1 HP (except those at 1 HP)
                const affectedPlayers = [];
                this.forestPlayersThisRound.forEach(playerId => {
                    const player = this.players.find(p => p.id === playerId);
                    if (player && player.resources.hp > 1) {
                        this.modifyResource(playerId, 'hp', -1);
                        affectedPlayers.push(player.name);
                    }
                });
                if (affectedPlayers.length > 0) {
                    this.showEffectNotification(
                        `Monster's death curse! Forest players lose 1 HP: ${affectedPlayers.join(', ')}`,
                        `Upon death, this monster releases a curse that damages all hunters in the forest.`
                    );
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
        // Only show pop-up notification if not in automated mode
        if (!this.isAutomatedMode) {
            alert(`⚠️ Monster Effect Activated!\n\n${message}\n\n${effectDescription}`);
        }
        
        // Add to log (but skip in automated mode for performance)
        if (!this.isAutomatedMode) {
            this.addLogEntry(`⚡ <strong>Monster Effect:</strong> ${message}`, 'effect');
        }
    }

    selectRandomAvailableMonster(level) {
        // Get all monsters of the specified level
        const monsters = this.monsters[level] || [];
        
        // Filter out defeated monsters
        const availableMonsters = monsters.filter(monster => {
            const monsterId = `L${level}-${monster.index}`;
            return !this.defeatedMonsters.has(monsterId);
        });

        if (availableMonsters.length === 0) {
            console.warn(`No available monsters for level ${level}`);
            return null;
        }

        // Select random monster from available ones
        const randomIndex = Math.floor(Math.random() * availableMonsters.length);
        return { ...availableMonsters[randomIndex] }; // Return a copy
    }

    showMonsterSelectionUI(monster, playerId) {
        const player = this.players.find(p => p.id === playerId);
        
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
        document.getElementById('monster-effect-display').textContent = monster.effect;

        // Enable/disable Change button based on player's EP
        const changeButton = document.getElementById('change-monster-btn');
        if (player && player.resources.ep > 0) {
            changeButton.disabled = false;
            changeButton.textContent = `Change (-1 EP)`;
        } else {
            changeButton.disabled = true;
            changeButton.textContent = `Change (No EP)`;
        }

        // Show the modal
        document.getElementById('monster-selection-modal').style.display = 'flex';
    }

    changeMonster() {
        const playerId = this.currentMonsterPlayer;
        const player = this.players.find(p => p.id === playerId);
        
        if (!player || player.resources.ep <= 0) {
            console.log('Player has no EP to change monster');
            return;
        }

        // Deduct 1 EP
        player.resources.ep -= 1;
        this.monsterSelectionEPSpent += 1;

        // Select new random monster of the same level as current monster
        const currentMonsterLevel = this.currentSelectedMonster.level;
        const newMonster = this.selectRandomAvailableMonster(currentMonsterLevel);
        if (newMonster) {
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
            
            this.addLogEntry(
                `${player.name} spent 1 EP to change monster`,
                'system',
                player
            );
        }
    }

    confirmMonsterSelection() {
        // Hide the monster selection modal
        document.getElementById('monster-selection-modal').style.display = 'none';
        
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
                this.showEffectNotification(
                    `${player.name} must pay ${extraEPCost} extra EP!`,
                    `This monster requires additional energy to engage in combat.`
                );
            } else {
                // Player can't afford extra EP - cannot fight this monster
                if (!this.isAutomatedMode) {
                    alert(`You need ${extraEPCost} extra EP to fight this monster! Choose a different monster or cancel.`);
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
            
            // Apply round-wide effects (only once per round, when first player enters forest)
            if (!this.roundEffectsApplied && this.forestPlayersThisRound.size === 1) {
                this.applyRoundEffect(monster.effectId);
                this.roundEffectsApplied = true;
            }
            
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
    
    confirmBattleSelection() {
        const playerId = this.currentMonsterPlayer;
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const monsterLevel = this.selectedMonsterLevel - 1; // Convert back to 0-based
        const totalEPCost = parseInt(document.getElementById('total-ep-cost').textContent);
        
        if (player.resources.ep < totalEPCost) {
            if (!this.isAutomatedMode) {
                alert(`${player.name} needs ${totalEPCost} EP for this battle!`);
            }
            return;
        }
        
        // Hide monster level selection modal
        document.getElementById('monster-modal').style.display = 'none';
        
        // Deduct EP for battle
        this.modifyResource(playerId, 'ep', -totalEPCost);
        this.monsterSelectionEPSpent = 0; // Reset EP spending tracker

        // Forest players already tracked at start of resource distribution
        // this.forestPlayersThisRound.add(playerId); // REMOVED - now done at start of round

        // Select random available monster from the level
        const selectedMonster = this.selectRandomAvailableMonster(monsterLevel);
        if (!selectedMonster) {
            if (!this.isAutomatedMode) {
                alert(`No available monsters at level ${monsterLevel}!`);
            }
            return;
        }

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
                
                // Apply round-wide effects (only once per round, when first player enters forest)
                if (!this.roundEffectsApplied && this.forestPlayersThisRound.size === 1) {
                    this.applyRoundEffect(selectedMonster.effectId);
                    this.roundEffectsApplied = true;
                }
                
                // Apply effects to other monsters already in play
                if ([8, 16, 33].includes(selectedMonster.effectId)) {
                    console.log(`Monster effect ${selectedMonster.effectId}: Other monsters this round get +1 HP`);
                }
            }
            
            this.startMonsterBattle(playerId, selectedMonster, this.selectedPets);
        } else {
            // Human players see the monster selection UI
            this.showMonsterSelectionUI(selectedMonster, playerId);
        }
    }
    
    startMonsterBattle(playerId, monster, selectedPets = {level1: 0, level2: 0, level3: 0}) {
        console.log('=== startMonsterBattle called ===');
        console.log('Player ID:', playerId);
        console.log('Monster:', monster);
        console.log('Selected pets:', selectedPets);
        
        this.currentBattle = {
            playerId,
            monster,
            turn: 'player_items', // Allow item usage at start, then attack
            bonusPts: 0, // Track Fake Blood bonus points
            petsUsed: selectedPets, // Track pets being used in this battle
            glovesPowerLevel: 0, // Track Gloves power level (damage taken)
            hasAttacked: false, // Track if player has attacked this battle
            tripleDamageUsed: false, // Track if Knife Lv1 double damage was used
            canUseTripleDamage: false, // Track if Knife Lv1 double damage is available
            lastAttackDamage: 0, // Track last attack damage for triple damage calculation
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
                this.addLogEntry(`${player.name} pays 1 bullet as Forest entrance fee (unlimited attacks)!`, 'battle', player);
                
                // Update bullet displays
                this.updateBulletDisplay(player.id);
            } else {
                // No bullets available - battle will fail
                this.addLogEntry(`${player.name} has no bullets for battle!`, 'battle', player);
            }
        }
        
        // Check and consume ammunition for Plasma (unless Level 3 infinite)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
            const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
            if (batteryIndex >= 0) {
                // Consume one battery as entrance fee for Forest
                player.inventory.splice(batteryIndex, 1);
                this.currentBattle.ammunitionConsumed = true;
                this.addLogEntry(`${player.name} pays 1 battery as Forest entrance fee (unlimited attacks)!`, 'battle', player);
                
                // Update battery displays
                this.updateBatteryDisplay(player.id);
            } else {
                // No batteries available - battle will fail
                this.addLogEntry(`${player.name} has no batteries for battle!`, 'battle', player);
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
                this.showEffectNotification(
                    `Monster attacks first!`,
                    `${player.name}'s defense (${defenseCount} dice) is too low. The monster gains initiative!`
                );
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
        
        console.log('Player is human, showing battle UI');
        
        document.getElementById('monster-battle').style.display = 'block';
        document.getElementById('battle-player-name').textContent = player.name;
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
            petInfo.innerHTML = `<p>Pets: ${petDisplay.join(', ')}</p>`;
        } else {
            petInfo.innerHTML = '';
        }
        
        // Update battle phase
        this.updateBattlePhase();
        
        // Setup item buttons
        this.updateBattleItemButtons();
        
        // Setup button event listeners
        document.getElementById('battle-attack-btn').onclick = () => this.playerAttackMonster();
        document.getElementById('battle-defense-btn').onclick = () => this.playerDefense();
        document.getElementById('battle-tame-btn').onclick = () => this.tameMonster();
    }
    
    updateMonsterRewards(monster) {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        let rewards = [];
        
        // Add score points
        if (monster.pts > 0) {
            rewards.push(`${monster.pts} Points`);
        }
        
        // Add money (including Rifle bonus)
        if (monster.money > 0) {
            let totalMoney = monster.money;
            // Add Rifle Level 2 bonus money
            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 3) {
                totalMoney += 3;
                rewards.push(`${monster.money}+3 Money`);
            } else {
                rewards.push(`${monster.money} Money`);
            }
        } else {
            // Even if monster gives no money, show Rifle bonus
            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 3) {
                rewards.push(`3 Money (Rifle)`);
            }
        }
        
        // Add energy (beer)
        if (monster.energy > 0) {
            rewards.push(`${monster.energy} Beer`);
        }
        
        // Add blood bags
        if (monster.blood > 0) {
            rewards.push(`${monster.blood} Blood Bags`);
        }
        
        // Add Katana bonus EXP
        if (player.katanaPower && player.katanaPower.bonusExp) {
            rewards.push(`${player.katanaPower.bonusExp} EXP (Katana)`);
        }
        
        // Add weapon power track advancement
        rewards.push(`+${monster.level} Weapon Power`);
        
        // Display the rewards
        const rewardsText = rewards.length > 0 ? rewards.join(', ') : 'No rewards';
        document.getElementById('battle-monster-rewards').textContent = rewardsText;
    }
    
    updateBattlePhase() {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const attackBtn = document.getElementById('battle-attack-btn');
        const defenseBtn = document.getElementById('battle-defense-btn');
        const tameBtn = document.getElementById('battle-tame-btn');
        const tripleDamageBtn = document.getElementById('battle-triple-damage-btn');
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
        
        // Plasma Level 3 has infinite batteries
        const hasPlasmaInfiniteAmmo = player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7;
        
        // Can attack if:
        // 1. Not using Rifle/Plasma, OR
        // 2. Entrance fee already paid (ammunitionConsumed), OR
        // 3. Has ammunition to pay entrance fee
        const canAttack = (!isRifle || battle.ammunitionConsumed || bullets > 0) && 
                         (!isPlasma || battle.ammunitionConsumed || batteries > 0 || hasPlasmaInfiniteAmmo);
        
        // Check if player has combat items (grenade, bomb, dynamite)
        const combatItems = ['Grenade', 'Bomb', 'Dynamite'];
        const hasCombatItems = combatItems.some(itemName => 
            player.inventory.some(item => item.name === itemName)
        );
        
        // Check if needs ammo but has none AND hasn't paid entrance fee yet
        const needsAmmoButHasNone = ((isRifle && bullets === 0 && !battle.ammunitionConsumed) || 
                                     (isPlasma && batteries === 0 && !hasPlasmaInfiniteAmmo && !battle.ammunitionConsumed));
        
        if (battle.turn === 'monster_attack_first') {
            // Monster attacks first due to effect
            turnText.textContent = 'Monster attacks first!';
            attackBtn.style.display = 'none';
            tameBtn.style.display = 'none';
            defenseBtn.style.display = 'none';
            tripleDamageBtn.style.display = 'none';
            
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
                turnText.textContent = 'Monster weakened! Attack or Tame?';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'block';
                tameBtn.textContent = `Tame! (${requiredEP} EP)`;
            } else {
                turnText.textContent = 'Your turn to attack!';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'none';
            }
            
            // Only show attack button if not out of ammo
            if (!needsAmmoButHasNone) {
                attackBtn.disabled = false;
                attackBtn.title = 'Attack the monster';
            }
            
            // Hide triple damage button during attack phase
            tripleDamageBtn.style.display = 'none';
            
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
                    turnText.textContent = 'Use items, attack, or tame the monster!';
                    attackBtn.style.display = 'block';
                    tameBtn.style.display = 'block';
                    tameBtn.textContent = `Tame! (${requiredEP} EP)`;
                    defenseBtn.style.display = 'none';
                } else {
                    turnText.textContent = 'Use items or attack the monster!';
                    attackBtn.style.display = 'block';
                    tameBtn.style.display = 'none';
                    defenseBtn.style.display = 'none';
                }
            } else {
                turnText.textContent = 'You can use items or proceed to defense!';
                attackBtn.style.display = 'none';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'block';
                
                // Knife Level 1 Power: Show 2x damage button after attack
                if (battle.canUseTripleDamage) {
                    tripleDamageBtn.style.display = 'block';
                    tripleDamageBtn.textContent = `2x Damage (+${battle.lastAttackDamage} extra)`;
                    tripleDamageBtn.onclick = () => this.useTripleDamage();
                } else {
                    tripleDamageBtn.style.display = 'none';
                }
            }
        } else if (battle.turn === 'monster') {
            turnText.textContent = 'Monster attacks!';
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
                    this.logBattleAction(`${player.name} cannot attack without ammo!`, player);
                    battle.turn = 'player';
                    this.updateBattlePhase();
                }, this.getDelay(1500));
            } else if (canTame) {
                turnText.textContent = 'Use items, attack, or tame the monster!';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'block';
                tameBtn.textContent = `Tame! (${requiredEP} EP)`;
                defenseBtn.style.display = 'none';
            } else {
                turnText.textContent = 'Use items or attack the monster!';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'none';
            }
        }
    }
    
    handleBotTacticalItemUsage(player, battle) {
        console.log(`Bot ${player.name} evaluating tactical item usage...`);
        
        const monster = battle.monster;
        let itemsUsed = [];
        
        // Check if bot can finish the monster with combat items
        let damageNeeded = monster.hp;
        
        // Check for instant kill items and prioritize efficiency
        const combatItems = [
            { name: 'Dynamite', damage: 3, priority: 1 },
            { name: 'Bomb', damage: 2, priority: 2 },
            { name: 'Grenade', damage: 1, priority: 3 }
        ];
        
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
            this.logBattleAction(`${player.name} uses items: ${itemsUsed.join(', ')} - Monster HP now: ${monster.hp}`, player);
            
            // Update displays
            this.updateResourceDisplay();
            this.updateInventoryDisplayOld();
            this.updateInventoryDisplay(player.id);
            
            // Check if monster is defeated
            if (monster.hp <= 0) {
                this.logBattleAction(`Monster defeated by items!`, player);
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
                this.logBattleAction(`${player.name} uses ${fakeBloodCount} Fake Blood for +${fakeBloodCount * monster.level} bonus points`, player);
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
            this.logBattleAction(`${player.name} uses recovery items: ${itemsUsed.join(', ')}`, player);
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
        
        // Define usable battle items (all except beer)
        const battleItems = [
            { name: 'Blood Bag', icon: '🩸', effect: 'Recover 1 HP' },
            { name: 'Grenade', icon: '💣', effect: 'Monster -1 HP' },
            { name: 'Bomb', icon: '💥', effect: 'Monster -2 HP' },
            { name: 'Dynamite', icon: '🧨', effect: 'Monster -3 HP' },
            { name: 'Fake Blood', icon: '🩹', effect: 'Bonus +2 PTS' }
        ];
        
        battleItems.forEach(item => {
            const itemCount = player.inventory.filter(inv => inv.name === item.name).length;
            const button = document.createElement('button');
            button.className = 'battle-item-btn';
            button.innerHTML = `${item.icon} ${item.name} (${itemCount})`;
            button.title = item.effect;
            
            // Check if button should be disabled
            let isDisabled = itemCount === 0 || (battle.turn !== 'player_items' && battle.turn !== 'player_items_after_monster');
            
            // Special case for Blood Bag - disable if player is at max HP
            if (item.name === 'Blood Bag' && player.resources.hp >= player.maxResources.hp) {
                isDisabled = true;
                button.title = 'HP is already at maximum';
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
                    alert('No bullets available for attack!');
                    return;
                }
                // Consume ammunition on first attack if not consumed at battle start
                player.inventory.splice(bulletIndex, 1);
                battle.ammunitionConsumed = true;
                this.addLogEntry(`${player.name} uses 1 bullet as entrance fee for this battle!`, 'battle', player);
            }
            // Update bullet display (in case it changed from items)
            if (this.currentBattle && this.currentBattle.playerId === player.id) {
                const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
                document.getElementById('battle-bullet-count').textContent = `${bullets}/6`;
            }
            // If ammunitionConsumed is true, proceed with attack (entrance fee paid)
        }
        
        // Check if Plasma player has paid entrance fee (ammunition) - unless infinite at Level 3
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
            // If ammunition was already consumed (entrance fee paid), allow attack
            // If not consumed yet, check for and consume ammunition
            if (!battle.ammunitionConsumed) {
                const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
                if (batteryIndex === -1) {
                    // No batteries available
                    alert('No batteries available for attack!');
                    return;
                }
                // Consume ammunition on first attack if not consumed at battle start
                player.inventory.splice(batteryIndex, 1);
                battle.ammunitionConsumed = true;
                this.addLogEntry(`${player.name} uses 1 battery as entrance fee for this battle!`, 'battle', player);
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
                
                this.logBattleAction(`Bat Lv3 Power: ${hitCount} dice hit - rolled ${hitCount} bonus dice (${bonusDamage} bonus damage)`, player);
            } else {
                this.logBattleAction(`Bat Lv3 Power: No hits - no bonus dice`, player);
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
            this.logBattleAction(`Bow Lv3 Power: Damage doubled!`, player);
        }
        
        // Sword Level 3 Power: +1 point if at least one attack die shows 1
        if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 7) {
            const hasOnes = allAttackRolls.includes(1);
            if (hasOnes) {
                this.addScore(player.id, 1);
                this.logBattleAction(`Sword Lv3 Power: +1 point for rolling at least one 1!`, player);
            }
        }
        
        // Check for Katana Level 3 instant kill (27+ dice pips)
        if (player.weapon.name === 'Katana' && player.weapon.powerTrackPosition >= 7 && totalDicePips >= 27) {
            this.logBattleAction(`Katana Lv3 Power: Instant kill! (${totalDicePips} total dice pips >= 27)`, player);
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
            this.logBattleAction(`Chain Lv3 Power: Pet damage doubled!`, player);
        }
        
        const totalDamage = playerDamage + petDamage;
        
        // Check for damage cap effect
        let finalDamage = totalDamage;
        const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
        if (damageCap !== null) {
            finalDamage = Math.min(totalDamage, damageCap);
            if (totalDamage > damageCap) {
                this.logBattleAction(`Monster effect: Damage capped at ${damageCap}! (Would have dealt ${totalDamage})`, player);
            }
        }
        
        battle.monster.hp -= finalDamage;
        battle.hasAttacked = true; // Mark that an attack has occurred
        
        // Log attack
        let attackMessage = `${player.name} attacks! Rolls: ${allRolls.join(' → ')} = ${playerDamage} damage`;
        if (petDamage > 0) {
            attackMessage += ` + ${petDamage} pet damage = ${totalDamage} total damage`;
        }
        this.logBattleAction(attackMessage, player);
        
        if (battle.monster.hp <= 0) {
            // Monster defeated!
            this.monsterDefeated();
        } else {
            // Move to item usage phase (post-attack)
            battle.turn = 'player_items';
            
            // Knife Level 1 Power: Show 2x damage button after attack if damage was dealt
            if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 1 && 
                !battle.tripleDamageUsed && playerDamage > 0) {
                battle.lastAttackDamage = playerDamage; // Store the damage for 2x calculation
                battle.canUseTripleDamage = true;
            }
            
            this.updateBattlePhase();
            this.updateBattleItemButtons();
        }
        
        // Update monster display
        this.updateMonsterDisplay();
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
        if (itemName === 'Blood Bag') {
            // Recover 1 HP
            if (player.resources.hp < player.maxResources.hp) {
                player.resources.hp = Math.min(player.resources.hp + 1, player.maxResources.hp);
                this.logBattleAction(`${player.name} uses Blood Bag! HP restored to ${player.resources.hp}`, player);
                // Update player HP display
                document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
            } else {
                this.logBattleAction(`${player.name} uses Blood Bag but HP is already at maximum!`, player);
            }
        } else if (itemName === 'Grenade') {
            // Monster -1 HP
            let grenadeDamage = 1;
            const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
            if (damageCap !== null) {
                grenadeDamage = Math.min(grenadeDamage, damageCap);
            }
            battle.monster.hp -= grenadeDamage;
            this.logBattleAction(`${player.name} uses Grenade! Monster takes ${grenadeDamage} damage`, player);
        } else if (itemName === 'Bomb') {
            // Monster -2 HP
            let bombDamage = 2;
            const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
            if (damageCap !== null) {
                const originalDamage = bombDamage;
                bombDamage = Math.min(bombDamage, damageCap);
                if (originalDamage > damageCap) {
                    this.logBattleAction(`${player.name} uses Bomb! Monster takes ${bombDamage} damage (capped from ${originalDamage})`, player);
                } else {
                    this.logBattleAction(`${player.name} uses Bomb! Monster takes ${bombDamage} damage`, player);
                }
            } else {
                this.logBattleAction(`${player.name} uses Bomb! Monster takes ${bombDamage} damage`, player);
            }
            battle.monster.hp -= bombDamage;
        } else if (itemName === 'Dynamite') {
            // Monster -3 HP
            let dynamiteDamage = 3;
            const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
            if (damageCap !== null) {
                const originalDamage = dynamiteDamage;
                dynamiteDamage = Math.min(dynamiteDamage, damageCap);
                if (originalDamage > damageCap) {
                    this.logBattleAction(`${player.name} uses Dynamite! Monster takes ${dynamiteDamage} damage (capped from ${originalDamage})`, player);
                } else {
                    this.logBattleAction(`${player.name} uses Dynamite! Monster takes ${dynamiteDamage} damage`, player);
                }
            } else {
                this.logBattleAction(`${player.name} uses Dynamite! Monster takes ${dynamiteDamage} damage`, player);
            }
            battle.monster.hp -= dynamiteDamage;
        } else if (itemName === 'Fake Blood') {
            // Increase PTS by 2 (store in battle for later use)
            if (!battle.bonusPts) battle.bonusPts = 0;
            battle.bonusPts += 2;
            this.logBattleAction(`${player.name} uses Fake Blood! Will gain +2 bonus points when monster is defeated`, player);
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
        }
    }
    
    playerDefense() {
        if (!this.currentBattle || this.currentBattle.turn !== 'player_items') return;
        
        const battle = this.currentBattle;
        
        // Move to monster turn
        battle.turn = 'monster';
        this.updateBattlePhase();
        
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
                this.showEffectNotification(
                    `Monster becomes enraged! Attack increased to ${monsterAttack}!`,
                    `When wounded to half HP or less, this monster gains +1 attack power.`
                );
            }
        }
        
        // Player defends
        const defenseRolls = this.rollDice(player.weapon.currentDefenseDice);
        let totalDefense = 0;
        defenseRolls.forEach(roll => {
            // Standard defense: 4,5,6 = 1 defense, 1,2,3 = 0 defense
            // Bow Level 1 Power: 2,3,4,5,6 = 1 defense, 1 = 0 defense
            let defenseThreshold = 4;
            if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 1) {
                defenseThreshold = 2;
            }
            
            if (roll >= defenseThreshold) totalDefense += 1;
        });
        
        const finalDamage = Math.max(0, monsterAttack - totalDefense);
        
        // Log attack
        this.logBattleAction(`Monster attacks for ${monsterAttack} damage! ${player.name} defends: [${defenseRolls.join(', ')}] = ${totalDefense} defense. Final damage: ${finalDamage}`, player);
        
        // Sword Level 3 Power nerfed: only works on attack dice, not defense
        
        if (finalDamage > 0) {
            this.modifyResource(battle.playerId, 'hp', -finalDamage);
            
            // Update player HP display
            document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
            
            // Player gains EXP equal to damage received
            this.modifyResource(battle.playerId, 'exp', finalDamage);
            this.logBattleAction(`${player.name} gains ${finalDamage} EXP from taking damage!`, player);
            
            // Gloves Power: Level 3 only - increase attack for each time damaged
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 7 && finalDamage > 0) {
                // Level 3: +1 attack for each time damaged (cumulative)
                battle.glovesPowerLevel += 1;
                this.logBattleAction(`Gloves Lv3 Power: Attack increased! (+${battle.glovesPowerLevel} total attack bonus)`, player);
            }
        }
        
        // Check if player survives
        if (player.resources.hp <= 0) {
            // Player defeated!
            this.logBattleAction(`${player.name} has been defeated!`, player);
            this.playerDefeated(battle.playerId);
        } else {
            // Player survived - check for Axe retaliation
            if (finalDamage > 0 && player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                let axeDamageToMonster;
                if (player.weapon.powerTrackPosition >= 7) {
                    // Level 3: Deal same damage to monster (overrides Level 1)
                    axeDamageToMonster = finalDamage;
                    this.logBattleAction(`Axe Lv3 Power: ${player.name} fights back for ${axeDamageToMonster} damage!`, player);
                } else {
                    // Level 1: Deal 1 damage to monster when HP decreases
                    axeDamageToMonster = 1;
                    this.logBattleAction(`Axe Lv1 Power: ${player.name} fights back for ${axeDamageToMonster} damage!`, player);
                }
                
                // Apply damage cap to Axe counter damage
                const damageCap = this.applyBattleEffect(battle.monster, 'damageCap');
                if (damageCap !== null) {
                    axeDamageToMonster = Math.min(axeDamageToMonster, damageCap);
                    if (axeDamageToMonster < finalDamage && player.weapon.powerTrackPosition >= 7) {
                        this.logBattleAction(`Axe counter damage capped at ${damageCap}!`, player);
                    }
                }
                
                battle.monster.hp -= axeDamageToMonster;
                
                // Update monster HP display
                this.updateMonsterDisplay();
                
                // Check if monster is defeated by axe retaliation
                if (battle.monster.hp <= 0) {
                    this.logBattleAction(`Monster defeated by Axe retaliation!`, player);
                    this.monsterDefeated();
                    return;
                }
            }
            // Allow item usage before player's next attack
            battle.turn = 'player_items_after_monster';
            
            // Hide Knife Lv1 2x damage button after monster attack
            if (battle.canUseTripleDamage) {
                battle.canUseTripleDamage = false;
                const tripleDamageBtn = document.getElementById('battle-triple-damage-btn');
                if (tripleDamageBtn) {
                    tripleDamageBtn.style.display = 'none';
                }
            }
            
            this.updateBattlePhase();
            this.updateBattleItemButtons();
        }
    }
    
    useTripleDamage() {
        if (!this.currentBattle || !this.currentBattle.canUseTripleDamage) return;
        
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
                this.addLogEntry(`Double damage limited by monster's damage cap of ${damageCap}`, 'battle');
            }
        }
        battle.monster.hp -= finalExtraDamage;
        
        // Mark triple damage as used for this battle
        battle.tripleDamageUsed = true;
        battle.canUseTripleDamage = false;
        
        this.logBattleAction(`${player.name} activates Knife Lv1 Power: 2x damage! ${extraDamage} extra damage dealt!`, player);
        
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
            this.showEffectNotification(
                `This monster requires +1 EP to tame!`,
                `This monster is harder to tame than usual. Total EP cost: ${requiredEP}`
            );
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
        
        this.logBattleAction(`${player.name} tames the Level ${monster.level} monster! Spent ${requiredEP} EP`, player);
        
        // Update pet display
        this.updatePetDisplay();
        
        // Player still gets all rewards as if they defeated the monster
        this.monsterDefeated(true);
    }
    
    monsterDefeated(wasTamed = false) {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;

        this.logBattleAction(`${player.name} defeats the Level ${monster.level} monster!`, player);

        // Track monsters defeated for statistics
        if (!player.monstersDefeated) {
            player.monstersDefeated = { level1: 0, level2: 0, level3: 0 };
        }
        player.monstersDefeated[`level${monster.level}`]++;

        // Mark monster as defeated so it can't be selected again
        this.markMonsterDefeated(monster);
        
        // Check for Knife Level 3 Power: Double rewards
        const knifeDoubleRewards = player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 7;
        const rewardMultiplier = knifeDoubleRewards ? 2 : 1;
        
        // Award rewards
        if (monster.money > 0) {
            const finalMoney = monster.money * rewardMultiplier;
            this.modifyResource(battle.playerId, 'money', finalMoney);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalMoney} money (doubled by Knife Lv3 Power!)`, player);
            } else {
                this.logBattleAction(`+${finalMoney} money`, player);
            }
        }
        if (monster.energy > 0) {
            const finalEnergy = monster.energy * rewardMultiplier;
            player.resources.beer += finalEnergy;
            this.addItemToInventory(battle.playerId, 'Beer', finalEnergy);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalEnergy} beer (doubled by Knife Lv3 Power!)`, player);
            } else {
                this.logBattleAction(`+${finalEnergy} beer`, player);
            }
        }
        if (monster.blood > 0) {
            const finalBlood = monster.blood * rewardMultiplier;
            player.resources.bloodBag += finalBlood;
            this.addItemToInventory(battle.playerId, 'Blood Bag', finalBlood);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalBlood} blood bags (doubled by Knife Lv3 Power!)`, player);
            } else {
                this.logBattleAction(`+${finalBlood} blood bags`, player);
            }
        }
        if (monster.pts > 0) {
            let totalScore = monster.pts;
            
            // Add Fake Blood bonus points
            if (battle.bonusPts) {
                totalScore += battle.bonusPts;
            }
            
            // Knife Level 3 only doubles resources, not points
            if (battle.bonusPts) {
                this.logBattleAction(`+${monster.pts} base score + ${battle.bonusPts} Fake Blood bonus = ${totalScore} total score`, player);
            } else {
                this.logBattleAction(`+${monster.pts} score`, player);
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
        
        // Advance weapon power track based on monster level
        this.advanceWeaponPowerTrack(battle.playerId, monster.level);

        // Apply death effects only if the monster was killed, not tamed
        if (!wasTamed && monster.effectId) {
            this.applyDeathEffect(monster.effectId, battle.playerId);
        }
        
        this.endMonsterBattle(true);
    }
    
    playerDefeated(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // No score penalty (removed)
        this.logBattleAction(`${player.name} was defeated by the monster`, player);
        
        // Set HP to 1
        player.resources.hp = 1;
        this.logBattleAction(`${player.name}'s HP set to 1`, player);
        
        // EP doesn't change (no log message needed)
        
        this.endMonsterBattle(false);
    }
    
    endMonsterBattle(victory) {
        this.currentBattle = null;
        
        setTimeout(() => {
            document.getElementById('monster-battle').style.display = 'none';
            document.getElementById('battle-log').innerHTML = '';
            
            // Continue with remaining forest hunters or end battle phase
            if (this.remainingForestHunters && this.remainingForestHunters.length > 0) {
                this.handleForestEncounters(this.remainingForestHunters);
            } else {
                this.endRound();
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
            
            const message = `${player.name}'s weapon power advances ${actualMoved} space${actualMoved > 1 ? 's' : ''} to position ${player.weapon.powerTrackPosition}!`;
            if (battleActions) {
                battleActions.push(message);
            } else {
                this.logBattleAction(message, player);
            }
        } else {
            const message = `${player.name}'s weapon power is already at maximum position!`;
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
        
        // Update power descriptions
        document.getElementById(`p${playerId}-power-desc-1`).textContent = player.weapon.lv1Power || 'No power';
        document.getElementById(`p${playerId}-power-desc-2`).textContent = player.weapon.lv2Power || 'No power';
        document.getElementById(`p${playerId}-power-desc-3`).textContent = player.weapon.lv3Power || 'No power';
    }
    
    activateWeaponPower(playerId, level, battleActions = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const unlockMessage = `${player.name} unlocks Level ${level} weapon power!`;
        if (battleActions) {
            battleActions.push(unlockMessage);
        } else {
            this.logBattleAction(unlockMessage, player);
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
                // For weapons without implemented powers yet
                const powerMessage = `${weaponName} Level ${level} power effect not yet implemented`;
                if (battleActions) {
                    battleActions.push(powerMessage);
                } else {
                    this.logBattleAction(powerMessage, player);
                }
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
        const logEntry = document.createElement('div');
        logEntry.className = 'battle-log-entry';
        logEntry.textContent = message;
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;

        // Also add to main game log
        this.addLogEntry(`⚔️ ${message}`, 'battle', player);
    }
    
    loadStoreItems() {
        // Load store items from Item.csv
        return [
            { name: 'Beer', size: 1, price: 2, effect: 'gain_1_energy', icon: '🍺', description: 'Restores 1 EP / Upgrade EP max' },
            { name: 'Blood Bag', size: 1, price: 2, effect: 'gain_1_blood', icon: '🩸', description: 'Restores 1 HP / Upgrade HP max' },
            { name: 'Grenade', size: 2, price: 2, effect: 'reduce_1_monster_hp', icon: '💣', description: '+1 damage to monster' },
            { name: 'Bomb', size: 3, price: 4, effect: 'reduce_2_monster_hp', icon: '💥', description: '+2 damage to monster' },
            { name: 'Dynamite', size: 4, price: 6, effect: 'reduce_3_monster_hp', icon: '🧨', description: '+3 damage to monster' },
            { name: 'Fake Blood', size: 2, price: 2, effect: 'bonus_points_on_kill', icon: '🩹', description: '+2 points when defeating monster' }
        ];
    }
    
    enterStorePhase() {
        this.roundPhase = 'store';
        this.currentStorePlayer = 0;
        
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting store phase - Round ${this.currentRound}`);
        }
        
        this.showStore();
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
        document.getElementById('store-current-player').textContent = player.name;
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

        // Add batteries for Plasma players (Level 1-2 power, not Level 3 infinite battery)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
            const batteryItem = {
                name: 'Battery',
                size: 1,
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
                maxWarning = 'Max bullets!';
            } else if (item.name === 'Battery') {
                const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
                hasMaxSpecialItems = batteryCount >= 6;
                maxWarning = 'Max batteries!';
            }
            
            const isDisabled = !canAfford || hasMaxSpecialItems;
            const priceDisplay = actualPrice !== item.price ? 
                `<span class="original-price">$${item.price}</span> $${actualPrice}` : 
                `$${actualPrice}`;
            
            itemElement.innerHTML = `
                <div class="item-icon-large">${item.icon || '❓'}</div>
                <h4 class="item-name">${item.name}</h4>
                <div class="item-price">${priceDisplay}</div>
                <div class="item-size">Size: ${item.size}</div>
                ${(item.name === 'Bullet' || item.name === 'Battery') ? `<div class="bullet-count">Max: 6</div>` : ''}
                ${exceedsCapacity ? '<div class="capacity-warning">⚠️ Over capacity!</div>' : ''}
                ${hasMaxSpecialItems ? `<div class="capacity-warning">⚠️ ${maxWarning}</div>` : ''}
                <button class="buy-btn" onclick="game.buyStoreItem('${item.name}', ${actualPrice}, ${item.size})" ${isDisabled ? 'disabled' : ''}>
                    Buy
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
                statusElement.innerHTML = `<strong>${player.name}</strong> is shopping...`;
            }
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
            managementActions.push(`upgraded attack dice to ${player.weapon.currentAttackDice} (-${botForEXP.weapon.reqExpAttack} EXP)`);
        }
        if (player.weapon.currentDefenseDice > defenseDiceBefore) {
            managementActions.push(`upgraded defense dice to ${player.weapon.currentDefenseDice} (-3 EXP)`);
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
                hpEpActions.push('used Blood Bag (+1 HP)');
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
                hpEpActions.push('used Beer (+1 EP)');
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
                hpEpActions.push('upgraded max HP (+1)');
                
                // Check for milestone bonuses
                if (player.maxResources.hp === 6 && !player.milestones.hp6) {
                    this.addScore(player.id, 2, 'milestone');
                    player.milestones.hp6 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-6`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push('HP milestone bonus (+2 points)');
                } else if (player.maxResources.hp === 8 && !player.milestones.hp8) {
                    this.addScore(player.id, 3, 'milestone');
                    player.milestones.hp8 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-8`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push('HP milestone bonus (+3 points)');
                } else if (player.maxResources.hp === 10 && !player.milestones.hp10) {
                    this.addScore(player.id, 4, 'milestone');
                    player.milestones.hp10 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-hp-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push('HP milestone bonus (+4 points)');
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
                hpEpActions.push('upgraded max EP (+1)');
                
                // Check for milestone bonuses
                if (player.maxResources.ep === 8 && !player.milestones.ep8) {
                    this.addScore(player.id, 2, 'milestone');
                    player.milestones.ep8 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-8`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push('EP milestone bonus (+2 points)');
                } else if (player.maxResources.ep === 10 && !player.milestones.ep10) {
                    this.addScore(player.id, 4, 'milestone');
                    player.milestones.ep10 = true;
                    if (!this.isAutomatedMode) {
                        const checkbox = document.getElementById(`p${player.id}-ep-milestone-10`);
                        if (checkbox) checkbox.checked = true;
                    }
                    hpEpActions.push('EP milestone bonus (+4 points)');
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
                    .map(([item, count]) => count > 1 ? `${item} x${count}` : item)
                    .join(', ');

                statusMessages.push(`bought: ${itemList}`);
                logMessages.push({ msg: `🛒 <strong>${player.name}</strong> (Bot) bought: ${itemList}`, player: player });
            } else {
                statusMessages.push(`didn't buy anything`);
                logMessages.push({ msg: `🛒 <strong>${player.name}</strong> (Bot) bought nothing`, player: player });
            }

            // Handle resource management actions
            if (managementActions.length > 0) {
                const managementList = managementActions.join(', ');
                statusMessages.push(`managed: ${managementList}`);
                logMessages.push({ msg: `💰 <strong>${player.name}</strong> (Bot) auto-managed: ${managementList}`, player: player });
            }

            // Update status element (skip in automated mode)
            if (!this.isAutomatedMode) {
                const statusElement = document.getElementById('status-message');
                if (statusElement) {
                    statusElement.innerHTML = `<strong>${player.name}</strong> ${statusMessages.join('; ')}`;
                }
            }

            // Add to game log
            logMessages.forEach(logEntry => {
                this.addLogEntry(logEntry.msg, 'store-purchase', logEntry.player);
            });
            
            // Auto-proceed to next player after a short delay
            setTimeout(() => {
                this.finishShopping();
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
            alert(`${player.name} doesn't have enough money!`);
            return;
        }
        
        // Check if buying this item would exceed capacity
        const currentInventorySize = this.getInventorySize(player);
        // If Plasma Level 3 and buying batteries, size is 0
        const effectiveSize = (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7 && item.name === 'Battery') ? 0 : item.size;
        const newTotalSize = currentInventorySize + effectiveSize;
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
        
        // If Plasma Level 3 and buying batteries, set size to 0
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7 && item.name === 'Battery') {
            newItem.size = 0;
        }
        
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
        const player = this.players[this.currentStorePlayer];
        
        if (player.resources.money < price) {
            alert(`${player.name} doesn't have enough money!`);
            return;
        }
        
        // Special check for bullets and batteries
        if (itemName === 'Bullet') {
            const bulletCount = player.inventory.filter(inv => inv.name === 'Bullet').length;
            if (bulletCount >= 6) {
                alert(`${player.name} already has maximum bullets (6)!`);
                return;
            }
        } else if (itemName === 'Battery') {
            const batteryCount = player.inventory.filter(inv => inv.name === 'Battery').length;
            if (batteryCount >= 6) {
                alert(`${player.name} already has maximum batteries (6)!`);
                return;
            }
        }
        
        // Check if buying this item would exceed capacity
        const currentInventorySize = this.getInventorySize(player);
        // If Plasma Level 3 and buying batteries, size is 0
        const effectiveSize = (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7 && itemName === 'Battery') ? 0 : size;
        const newTotalSize = currentInventorySize + effectiveSize;
        const capacity = player.maxInventoryCapacity;
        
        if (newTotalSize > capacity) {
            const overflow = newTotalSize - capacity;
            const confirmed = confirm(
                `⚠️ Capacity Warning ⚠️\n\n` +
                `${player.name}, buying ${itemName} (size ${size}) will exceed your capacity!\n\n` +
                `Current inventory: ${currentInventorySize}/${capacity}\n` +
                `After purchase: ${newTotalSize}/${capacity} (${overflow} over capacity)\n\n` +
                `You'll need to remove items after shopping to fit within capacity.\n\n` +
                `Do you still want to buy this item?`
            );
            
            if (!confirmed) {
                return; // Player decided not to buy
            }
        }
        
        // Create item object
        const item = {
            name: itemName,
            size: size,
            price: price,
            effect: itemName === 'Bullet' ? 'rifle_ammo' : itemName === 'Battery' ? 'plasma_power' : 'unknown',
            icon: itemName === 'Bullet' ? '🔫' : itemName === 'Battery' ? '🔋' : '❓'
        };
        
        // If Plasma Level 3 and buying batteries, set size to 0
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7 && itemName === 'Battery') {
            item.size = 0;
        }
        
        // Deduct money and add item to inventory
        player.resources.money -= price;
        player.inventory.push(item);
        
        // Update display
        this.showStore();
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
        this.addLogEntry(
            `🛒 <strong>${player.name}</strong> bought ${itemName} for $${price}`,
            'store-purchase',
            player
        );

        // Refresh the store display to update capacity warnings and money
        this.showStore();

        // alert(`${player.name} bought ${itemName}!`); // Removed popup as requested
    }
    
    finishShopping() {
        this.currentStorePlayer++;
        
        if (this.currentStorePlayer >= this.players.length) {
            // All players finished shopping, hide store area
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] All players finished shopping, checking capacity overflow`);
            } else {
                document.getElementById('store-area').style.display = 'none';
            }
            // Check for capacity overflow
            this.checkCapacityOverflow();
        } else {
            // Next player's turn to shop
            this.showStore();
        }
    }
    
    checkCapacityOverflow() {
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
            // After capacity check, start battle phase
            this.startBattlePhase();
        }
    }
    
    startResourceDistribution() {
        this.roundPhase = 'distribution';

        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting resource distribution - Round ${this.currentRound}`);
        }

        // Clear and populate forest players for this round (must be done BEFORE any battles)
        this.forestPlayersThisRound.clear();
        this.players.forEach(player => {
            if (player.tokens.hunter === 7) { // Forest is location 7
                this.forestPlayersThisRound.add(player.id);
            }
        });

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

                    if (location.resource === 'money' || location.resource === 'exp') {
                        this.modifyResource(player.id, location.resource, rewardAmount);
                        resourceName = location.resource === 'money' ? 'money' : 'EXP';
                        this.addLogEntry(
                            `💰 <strong>${player.name}</strong>${playerType} received ${rewardAmount} ${resourceName} from ${location.name}`,
                            'resource-gain',
                            player
                        );
                    } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                        player.resources[location.resource] += rewardAmount;
                        // Also add items to inventory
                        const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                        this.addItemToInventory(player.id, itemName, rewardAmount);
                        this.addLogEntry(
                            `💰 <strong>${player.name}</strong>${playerType} received ${rewardAmount} ${itemName} from ${location.name}`,
                            'resource-gain',
                            player
                        );
                    } else if (location.resource === 'score') {
                        // Plaza scoring: 3 points if alone, 0 if crowded
                        this.addScore(player.id, rewardAmount, 'plaza');
                        if (rewardAmount > 0) {
                            this.addLogEntry(
                                `💰 <strong>${player.name}</strong>${playerType} received ${rewardAmount} points from ${location.name}`,
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
                        const playerType = player.isBot ? ' (Bot)' : '';
                        // Give +1 resource of this location type
                        if (location.resource === 'money' || location.resource === 'exp') {
                            this.modifyResource(player.id, location.resource, 1);
                            const resourceName = location.resource === 'money' ? 'money' : 'EXP';
                            console.log(`Bat Lv1 Power: ${player.name}'s apprentice gets +1 ${location.resource} at ${location.name}`);
                            this.addLogEntry(
                                `🦇 <strong>${player.name}</strong>${playerType}'s apprentice received +1 ${resourceName} (Bat Lv1 Power)`,
                                'resource-gain',
                                player
                            );
                        } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                            player.resources[location.resource] += 1;
                            const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                            this.addItemToInventory(player.id, itemName, 1);
                            console.log(`Bat Lv1 Power: ${player.name}'s apprentice gets +1 ${itemName} at ${location.name}`);
                            this.addLogEntry(
                                `🦇 <strong>${player.name}</strong>${playerType}'s apprentice received +1 ${itemName} (Bat Lv1 Power)`,
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
            this.showStationModal();
        } else {
            // No station choices needed, go to store phase
            if (this.isAutomatedMode) {
                console.log(`[${new Date().toISOString()}] No station players, going directly to store phase`);
            }
            this.enterStorePhase();
        }
    }
    
    startBattlePhase() {
        this.roundPhase = 'battle';
        
        if (this.isAutomatedMode) {
            console.log(`[${new Date().toISOString()}] Starting battle phase - Round ${this.currentRound}`);
        }
        
        // Get all hunters in the Forest
        let forestHunters = [];
        this.players.forEach(player => {
            if (player.tokens.hunter === 7) { // Forest is location id 7
                forestHunters.push(player.id);
            }
        });
        
        if (forestHunters.length > 0) {
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
    
    finishDataCollection() {
        console.log(`[${new Date().toISOString()}] Data collection complete! Collected data from ${this.automatedGamesCompleted} games`);
        
        // Export all collected data to CSV
        if (this.collectedGameData.length > 0) {
            this.exportToCSV(this.collectedGameData);
        }
        
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
        
        // Show the data collection modal again with results
        setTimeout(() => {
            this.showDataCollectionModal();
        }, 1000);
    }
    
    updateDataCollectionProgress() {
        const progressElement = document.getElementById('data-collection-progress');
        if (progressElement) {
            if (this.isAutomatedMode) {
                progressElement.style.display = 'block';
                progressElement.textContent = `Running game ${this.automatedGamesCompleted + 1} of ${this.automatedGamesTotal}...`;
            } else {
                progressElement.style.display = 'none';
            }
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

            statsHTML += `
                <div class="player-stats-card">
                    <div class="stats-card-header" style="background-color: ${player.color?.background || '#ddd'};">
                        <h3>${player.name}</h3>
                        <span class="weapon-name">${player.weapon.name}</span>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-section">
                            <h4>Final Results</h4>
                            <div class="stat-row">
                                <span class="stat-label">Rank:</span>
                                <span class="stat-value">#${rankings[player.id]}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Total Score:</span>
                                <span class="stat-value">${player.score}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Popularity Level:</span>
                                <span class="stat-value">${player.popularityTrack.pointToken}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Weapon Power:</span>
                                <span class="stat-value">Level ${player.weapon.powerTrackPosition >= 7 ? 3 : player.weapon.powerTrackPosition >= 3 ? 2 : 1}</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>Combat Statistics</h4>
                            <div class="stat-row">
                                <span class="stat-label">Defeated Monsters:</span>
                                <span class="stat-value">
                                    Lv1: ${player.monstersDefeated?.level1 || 0} |
                                    Lv2: ${player.monstersDefeated?.level2 || 0} |
                                    Lv3: ${player.monstersDefeated?.level3 || 0}
                                </span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>Score Breakdown</h4>
                            <div class="stat-row">
                                <span class="stat-label">From Monsters:</span>
                                <span class="stat-value">${player.scoreFromMonsters || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">From Popularity:</span>
                                <span class="stat-value">${player.scoreFromPopularity || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">From Plaza:</span>
                                <span class="stat-value">${player.scoreFromPlaza || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">From Milestones:</span>
                                <span class="stat-value">${player.scoreFromMilestones || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">From Other:</span>
                                <span class="stat-value">${player.scoreFromOther || 0}</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>Placement Statistics</h4>
                            <div class="stat-row">
                                <span class="stat-label">Hunter Alone:</span>
                                <span class="stat-value">${player.hunterAloneCount} times</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Apprentice with Hunters:</span>
                                <span class="stat-value">${player.apprenticeWithHuntersCount} times</span>
                            </div>
                        </div>

                        <div class="stats-section">
                            <h4>Location Selections</h4>
                            ${locationNames.map((name, index) => {
                                const locationId = index + 1;
                                const hunterCount = player.locationSelections[locationId].hunter;
                                const apprenticeCount = player.locationSelections[locationId].apprentice;
                                return `
                                    <div class="stat-row">
                                        <span class="stat-label">${name}:</span>
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
                `🎉 Game Over! ${winner.name} wins with ${winner.score} points! 🎉`;
            
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
            `🎉 Game Over! ${winner.name} wins with ${winner.score} points! 🎉`;

        // Hide game controls
        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'none';

        // Clear controls and add game end buttons
        const controls = document.querySelector('.controls');
        controls.innerHTML = '';

        // Add View Stats button
        const statsButton = document.createElement('button');
        statsButton.textContent = 'View Game Stats';
        statsButton.className = 'control-button';
        statsButton.onclick = () => this.showGameStats();
        controls.appendChild(statsButton);

        // Add Exit to Menu button
        const exitButton = document.createElement('button');
        exitButton.textContent = 'Exit to Main Menu';
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
        document.getElementById('status-message').textContent = 
            'Round complete! All tokens returned to players. Starting next round...';
        
        // Automatically proceed to next round after a brief delay
        setTimeout(() => {
            this.startNewRound();
        }, this.getDelay(2000));
    }
    
    startNewRound() {
        // Move dummy tokens to next locations
        this.moveDummyTokens();
        
        // Increment round counter
        this.currentRound++;
        
        // Log round start
        this.addLogEntry(`🔄 <strong>Round ${this.currentRound} Started</strong>`, 'round-start');
        
        // Apply weapon power effects at round start
        this.players.forEach(player => {
            // Bat Level 2 Power: Choice of +1 HP or +1 EP at round start
            if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 3) {
                const maxHp = player.maxHP || 10;
                const maxEp = player.maxEP || 10;
                const hpFull = player.resources.hp >= maxHp;
                const epFull = player.resources.ep >= maxEp;
                
                if (hpFull && epFull) {
                    // Both resources are full, no bonus
                    console.log(`Bat Lv2 Power: ${player.name} has full HP and EP, no bonus received`);
                    this.addLogEntry(`🦇 ${player.name}'s Bat Lv2 Power: Both HP and EP are full, no bonus`, 'power', player);
                } else if (player.isBot) {
                    // Bot logic: choose based on what's available and HP/EP ratio
                    let choice;
                    if (hpFull) {
                        choice = 'ep';
                    } else if (epFull) {
                        choice = 'hp';
                    } else {
                        // Neither is full, pick the lower resource
                        const hpRatio = player.resources.hp / maxHp;
                        const epRatio = player.resources.ep / maxEp;
                        if (hpRatio < epRatio) {
                            choice = 'hp';
                        } else if (epRatio < hpRatio) {
                            choice = 'ep';
                        } else {
                            // Equal ratios, choose randomly
                            choice = Math.random() < 0.5 ? 'hp' : 'ep';
                        }
                    }
                    
                    if (choice === 'hp') {
                        this.modifyResource(player.id, 'hp', 1);
                        console.log(`Bat Lv2 Power: Bot ${player.name} chooses +1 HP at round start (HP: ${player.resources.hp}/${maxHp}, EP: ${player.resources.ep}/${maxEp})`);
                        this.addLogEntry(`🦇 ${player.name} chooses +1 HP from Bat Lv2 Power`, 'power', player);
                    } else {
                        this.modifyResource(player.id, 'ep', 1);
                        console.log(`Bat Lv2 Power: Bot ${player.name} chooses +1 EP at round start (HP: ${player.resources.hp}/${maxHp}, EP: ${player.resources.ep}/${maxEp})`);
                        this.addLogEntry(`🦇 ${player.name} chooses +1 EP from Bat Lv2 Power`, 'power', player);
                    }
                } else {
                    // Human player: show choice dialog
                    this.showBatPowerChoice(player.id);
                }
            }
            
            // Chain Level 2 Power: +2 beers at round start
            if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
                console.log(`Chain Lv2 Power: ${player.name} receives +2 beers at round start`);
            }
            
            // Axe Level 2 Power: +1 blood bag at round start
            if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 1;
                this.addItemToInventory(player.id, 'Blood Bag', 1);
                console.log(`Axe Lv2 Power: ${player.name} receives +1 blood bag at round start`);
            }
            
            // Whip Level 2 Power: +2 beers at round start
            if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
                console.log(`Whip Lv2 Power: ${player.name} receives +2 beers at round start`);
            }
            
            // Bow Level 2 Power: +1 EXP at round start
            if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'exp', 1);
                console.log(`Bow Lv2 Power: ${player.name} receives +1 EXP at round start`);
            }
            
            // Gloves Level 2 Power: +1 blood bag at round start
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 1;
                this.addItemToInventory(player.id, 'Blood Bag', 1);
                console.log(`Gloves Lv2 Power: ${player.name} receives +1 blood bag at round start`);
            }
            
            // Katana and Sword Level 2 powers moved to resource distribution phase
            // They now give +1 EXP when hunter is alone at a location
            
            // Rifle Level 2 Power: +2$ at round start
            if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'money', 2);
                console.log(`Rifle Lv2 Power: ${player.name} receives +2$ at round start`);
            }
            
            // Plasma Level 2 Power: +2$ at round start
            if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'money', 2);
                console.log(`Plasma Lv2 Power: ${player.name} receives +2$ at round start`);
            }
            
            // Knife Level 2 power moved to resource distribution phase
            // Now gives +1 point when hunter is alone at a location
        });
        
        // Update displays after applying round start effects
        this.updateResourceDisplay();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        
        // Reset for next round
        this.roundPhase = 'selection';
        this.currentPlayerIndex = 0;
        this.pendingSelectionLogs = []; // Clear any pending logs
        
        // Clear selections and station choices
        this.stationChoices = {};
        this.players.forEach(player => {
            player.selectedCards.hunter = null;
            player.selectedCards.apprentice = null;
        });
        
        // Update UI for next round
        document.getElementById('confirm-selection').style.display = 'block';
        document.getElementById('next-player').style.display = 'none';
        document.getElementById('status-message').textContent = 
            `New Round Started! ${this.currentPlayer.name}: Select locations for your Hunter and Apprentice`;
        document.querySelector('.card-selection').style.display = 'grid';
        
        // Show current player text again for the new round
        document.querySelector('.current-player').style.display = 'block';
        
        this.createLocationCards();
        this.updateUI();
        this.updateCurrentPlayer(); // Fix: Handle bot detection for new rounds
        this.updateDummyTokenDisplay();
    }
    
    handleCapacityOverflow(overflowPlayers) {
        if (overflowPlayers.length === 0) {
            this.startBattlePhase();
            return;
        }
        
        const playerId = overflowPlayers[0];
        const player = this.players.find(p => p.id === playerId);
        
        // Show capacity management UI
        document.getElementById('capacity-player-name').textContent = player.name;
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
                
                const disabledTitle = buttonsDisabled ? 'Cannot interact with this player board' : '';
                
                buttonsHTML = `
                    <button onclick="game.useItemFromOverflow(${playerId}, ${index})" class="use-btn" ${useDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : (canUse ? 'Use item' : (item.name === 'Beer' ? 'EP is at maximum' : 'HP is at maximum'))}">Use</button>
                    <button onclick="game.addToUpgradeFromOverflow(${playerId}, ${index})" class="upgrade-btn" ${upgradeDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : (canUpgrade ? 'Add to upgrade progress' : 'Max resource is already 10')}">Upgrade</button>
                    <button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn" ${discardDisabled ? 'disabled' : ''} title="${buttonsDisabled ? disabledTitle : 'Discard item'}">Discard</button>
                `;
            } else {
                // Grenade, Bomb, Dynamite, Fake Blood: Discard only
                const discardDisabled = buttonsDisabled;
                const disabledTitle = buttonsDisabled ? 'Cannot interact with this player board' : 'Discard item';
                buttonsHTML = `<button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn" ${discardDisabled ? 'disabled' : ''} title="${disabledTitle}">Discard</button>`;
            }
            
            itemElement.innerHTML = `
                <span>${item.icon || '❓'} ${item.name} (Size: ${item.size})</span>
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
        const player = this.players.find(p => p.id === playerId);
        player.inventory.splice(itemIndex, 1);
        
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
            alert(`Player ${playerId}'s max ${upgradeType.toUpperCase()} increased!`);
        }
        
        // Update displays
        this.updateInventoryDisplayOld();
        this.players.forEach(player => {
            this.updateInventoryDisplay(player.id);
        });
        this.updateResourceDisplay();
        
        // Update store capacity display if in store phase
        if (this.roundPhase === 'store') {
            this.updateStoreCapacityDisplay();
        }
        
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
            alert('This item can only be used during monster combat!');
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
        
        alert(`${player.name} used ${item.name}!`);
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
        
        // Update store capacity display if in store phase
        if (this.roundPhase === 'store') {
            this.updateStoreCapacityDisplay();
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
            container.innerHTML = '<p>No pets available</p>';
        }
        
        this.updateTotalEPCost();
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
        const confirmBtn = document.querySelector('.confirm-battle-btn');
        if (this.selectedMonsterLevel && totalCost <= player.resources.ep) {
            confirmBtn.style.display = 'block';
        } else {
            confirmBtn.style.display = 'none';
        }
    }
    
    showBatPowerChoice(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const maxHp = player.maxHP || 10;
        const maxEp = player.maxEP || 10;
        const hpFull = player.resources.hp >= maxHp;
        const epFull = player.resources.ep >= maxEp;
        
        // If both are full, no choice needed
        if (hpFull && epFull) {
            console.log(`Bat Lv2 Power: ${player.name} has full HP and EP, no bonus received`);
            this.addLogEntry(`🦇 ${player.name}'s Bat Lv2 Power: Both HP and EP are full, no bonus`, 'power', player);
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
                    this.addLogEntry(`🦇 ${player.name} chooses +1 HP from Bat Lv2 Power`, 'power', player);
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
                    this.addLogEntry(`🦇 ${player.name} chooses +1 EP from Bat Lv2 Power`, 'power', player);
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
}

// Start the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game(); // Make game globally accessible
    game = window.game; // Keep local reference for compatibility
});