class Game {
    constructor() {
        this.weapons = [
            { name: 'Bat', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 3, 
              lv1Power: '徒弟在資源區域撞其他獵人+1區域資源', lv2Power: '回合開始+1血袋+1體力', lv3Power: '命中的骰子再骰，直到沒有骰子命中，傷害為所有傷害加總' },
            { name: 'Katana', reqExpAttack: 5, reqExpDefense: 3, capacity: 4, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 1, 1, 1, 1], priority: 8,
              lv1Power: '1血袋換1體力', lv2Power: '打敗怪獸+2經驗', lv3Power: '攻擊骰總點數大於27則一擊必殺' },
            { name: 'Rifle', reqExpAttack: 6, reqExpDefense: 3, capacity: 8, initialMoney: 2, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 2, 2], priority: 10,
              lv1Power: '可購買子彈:2$，每次攻擊花費1子彈', lv2Power: '打敗怪獸+3$', lv3Power: '商店價格-1$' },
            { name: 'Plasma', reqExpAttack: 7, reqExpDefense: 3, capacity: 8, initialMoney: 0, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 2, 2, 2], priority: 11,
              lv1Power: '可購買電池:3$，每次攻擊花費1電池', lv2Power: '打敗怪獸+4$', lv3Power: '無限子彈' },
            { name: 'Chain', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 6,
              lv1Power: '怪獸於血量3以下即可收服', lv2Power: '回合開始+2啤酒', lv3Power: '寵物攻擊x2' },
            { name: 'Axe', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 4,
              lv1Power: '玩家受傷時怪獸受一樣的傷害', lv2Power: '回合開始+2血袋', lv3Power: '玩家受傷時怪獸受2倍的傷害' },
            { name: 'Whip', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 1], priority: 5,
              lv1Power: '寵物和收服怪獸體力-1', lv2Power: '回合開始+2啤酒', lv3Power: '寵物和收服不耗體力' },
            { name: 'Bow', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 0, 4], priority: 1,
              lv1Power: '閃避率+16%', lv2Power: '回合開始+2經驗', lv3Power: '傷害x2' },
            { name: 'Sword', reqExpAttack: 5, reqExpDefense: 3, capacity: 4, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 1, 1, 2], priority: 9,
              lv1Power: '遊戲開始防禦力+1', lv2Power: '打敗怪獸+2經驗', lv3Power: '攻擊時每骰到1個1即+1分' },
            { name: 'Knife', reqExpAttack: 3, reqExpDefense: 3, capacity: 10, initialMoney: 8, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 2,
              lv1Power: '人氣獎勵token不下降', lv2Power: '可將一次的攻擊力x3', lv3Power: '打贏的獎勵x2' },
            { name: 'Gloves', reqExpAttack: 4, reqExpDefense: 3, capacity: 6, initialMoney: 4, attackDice: 2, defenseDice: 0, damage: [0, 0, 0, 0, 1, 1], priority: 7,
              lv1Power: '基礎攻擊力=1，每受1傷害提升1', lv2Power: '回合開始+2血袋', lv3Power: '攻擊力=6時，殺死怪獸+6分' }
        ];
        
        this.locations = [
            { id: 1, name: 'Work Site', resource: 'money', rewards: [6, 4] },
            { id: 2, name: 'Bar', resource: 'beer', rewards: [6, 4] },
            { id: 3, name: 'Station', resource: null, rewards: [] },
            { id: 4, name: 'Hospital', resource: 'bloodBag', rewards: [4, 2] },
            { id: 5, name: 'Dojo', resource: 'exp', rewards: [4, 2] },
            { id: 6, name: 'Plaza', resource: 'score', rewards: [4, 2] },
            { id: 7, name: 'Forest', resource: null, rewards: [] }
        ];
        
        // Randomly assign weapons to players
        const assignedWeapons = this.getRandomWeapons(2);
        console.log('Assigned weapons:', assignedWeapons);
        
        // Randomly assign colors to players
        this.playerColors = this.getRandomPlayerColors();
        console.log('Assigned colors:', this.playerColors);
        console.log('Player 1 color:', this.playerColors[1]);
        console.log('Player 2 color:', this.playerColors[2]);
        
        this.players = [
            { 
                id: 1, 
                name: 'Player 1',
                tokens: {
                    hunter: null,
                    apprentice: null
                },
                selectedCards: {
                    hunter: null,
                    apprentice: null
                },
                resources: {
                    money: assignedWeapons[0].initialMoney,
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
                    hp8: false,  // Max HP 8 milestone (2 points)
                    hp10: false  // Max HP 10 milestone (4 points)
                },
                score: 0,
                maxResources: {
                    money: 15,
                    exp: 15,
                    hp: 4,
                    ep: 6
                },
                weapon: {
                    ...assignedWeapons[0],
                    currentAttackDice: assignedWeapons[0].attackDice,
                    currentDefenseDice: assignedWeapons[0].name === 'Sword' ? 1 : assignedWeapons[0].defenseDice, // Sword Level 1: Start with 1 defense die
                    attackLevel: 1,
                    defenseLevel: 1,
                    powerTrackPosition: 1 // Start at position 1
                },
                maxInventoryCapacity: assignedWeapons[0].capacity,
                inventory: [], // Array to hold purchased items
                popularityTrack: {
                    pointToken: 0,  // Current level of point token (0-5)
                    rewardToken: 0, // Current level of reward token (0-5)
                    levelReached: [false, false, false, false, false, false] // Track which point levels have been collected
                },
                color: this.playerColors[1],
                pets: {
                    level1: 0,
                    level2: 0,
                    level3: 0
                }
            },
            { 
                id: 2, 
                name: 'Player 2',
                tokens: {
                    hunter: null,
                    apprentice: null
                },
                selectedCards: {
                    hunter: null,
                    apprentice: null
                },
                resources: {
                    money: assignedWeapons[1].initialMoney,
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
                    hp8: false,  // Max HP 8 milestone (2 points)
                    hp10: false  // Max HP 10 milestone (4 points)
                },
                score: 0,
                maxResources: {
                    money: 15,
                    exp: 15,
                    hp: 4,
                    ep: 6
                },
                weapon: {
                    ...assignedWeapons[1],
                    currentAttackDice: assignedWeapons[1].attackDice,
                    currentDefenseDice: assignedWeapons[1].name === 'Sword' ? 1 : assignedWeapons[1].defenseDice, // Sword Level 1: Start with 1 defense die
                    attackLevel: 1,
                    defenseLevel: 1,
                    powerTrackPosition: 1 // Start at position 1
                },
                maxInventoryCapacity: assignedWeapons[1].capacity,
                inventory: [], // Array to hold purchased items
                popularityTrack: {
                    pointToken: 0,  // Current level of point token (0-5)
                    rewardToken: 0, // Current level of reward token (0-5)
                    levelReached: [false, false, false, false, false, false] // Track which point levels have been collected
                },
                color: this.playerColors[2],
                pets: {
                    level1: 0,
                    level2: 0,
                    level3: 0
                }
            }
        ];
        
        this.currentPlayerIndex = 0;
        this.roundPhase = 'selection'; // 'selection', 'distribution', 'station', 'store', 'battle', 'nextround'
        this.stationChoices = {}; // Store station choices for each player
        this.pendingStationPlayer = null; // Track which player needs to choose
        this.stationTotalCount = 0; // Track total count at station
        this.monsters = this.loadMonsters(); // Load monster data
        this.currentBattle = null; // Track ongoing monster battle
        this.storeItems = this.loadStoreItems(); // Load store items
        this.currentStorePlayer = null; // Track current shopping player
        
        // Dummy token system: Start with dummy tokens at locations 2, 4, 6
        this.dummyTokens = [2, 4, 6]; // Array of location IDs where dummy tokens are placed
        console.log('Initialized dummy tokens at locations:', this.dummyTokens);
        
        this.init();
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
    
    init() {
        // Add small delay to ensure DOM is fully ready
        setTimeout(() => {
            console.log('Init - Players:', this.players);
            console.log('Player 1 inventory:', this.players[0].inventory);
            console.log('Player 2 inventory:', this.players[1].inventory);
            this.createLocationCards();
            // Initialize displays for both players
            this.updateInventoryDisplayOld(); // Update weapon displays
            this.updateInventoryDisplay(1);
            this.updateInventoryDisplay(2);
            this.updatePetDisplay();
            // Apply player colors to name headers
            this.applyPlayerNameColors();
            // Initialize popularity track displays
            this.updatePopularityTrackDisplay(1);
            this.updatePopularityTrackDisplay(2);
            // Initialize dummy token display
            this.updateDummyTokenDisplay();
        }, 100);
        this.setupEventListeners();
        this.updateUI();
        this.updateResourceDisplay();
    }
    
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
    }
    
    createCard(location, tokenType) {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.dataset.locationId = location.id;
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
        // Check EP requirements for hunter cards (only if not already disabled by dummy token)
        else if (tokenType === 'hunter') {
            if (location.id === 7 && this.currentPlayer.resources.ep < 2) { // Forest requires at least 2 EP
                card.classList.add('disabled');
                card.title = 'Requires at least 2 EP';
                isDisabled = true;
            }
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
    
    getRandomPlayerColors() {
        // Define available color palette
        const colorPalette = [
            { background: '#e67e22', border: '#d35400', name: 'Orange' },
            { background: '#27ae60', border: '#229954', name: 'Green' },
            { background: '#3498db', border: '#2980b9', name: 'Blue' },
            { background: '#9b59b6', border: '#8e44ad', name: 'Purple' },
            { background: '#e74c3c', border: '#c0392b', name: 'Red' },
            { background: '#f39c12', border: '#e67e22', name: 'Yellow' },
            { background: '#000000', border: '#333333', name: 'Black' }
        ];
        
        console.log('Original palette:', colorPalette.map(c => c.name));
        
        // Randomly select 2 different colors for players
        const shuffledColors = [...colorPalette];
        
        // Shuffle array using Fisher-Yates algorithm
        for (let i = shuffledColors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            console.log(`Swapping index ${i} with ${j}`);
            [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
        }
        
        console.log('Shuffled palette:', shuffledColors.map(c => c.name));
        console.log('Player 1 gets:', shuffledColors[0].name);
        console.log('Player 2 gets:', shuffledColors[1].name);
        
        return {
            1: shuffledColors[0], // Player 1 gets first randomly selected color
            2: shuffledColors[1]  // Player 2 gets second randomly selected color
        };
    }
    
    getPlayerColors(playerId) {
        // Return the randomly assigned colors for this game
        console.log(`Getting colors for player ${playerId}:`, this.playerColors[playerId]);
        return this.playerColors[playerId] || {
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
    
    checkSelectionComplete() {
        const player = this.currentPlayer;
        const bothSelected = player.selectedCards.hunter !== null && player.selectedCards.apprentice !== null;
        
        // Enable/disable confirm button
        const confirmButton = document.getElementById('confirm-selection');
        confirmButton.disabled = !bothSelected;
        
        if (bothSelected) {
            document.getElementById('status-message').textContent = 
                `${player.name}: Confirm your selections - Hunter to ${this.getLocationName(player.selectedCards.hunter)}, Apprentice to ${this.getLocationName(player.selectedCards.apprentice)}`;
        }
    }
    
    getLocationName(locationId) {
        const location = this.locations.find(loc => loc.id === locationId);
        return location ? location.name : '';
    }
    
    confirmSelection() {
        if (this.currentPlayer.selectedCards.hunter === null || this.currentPlayer.selectedCards.apprentice === null) {
            return;
        }
        
        
        // Move to next player
        this.currentPlayerIndex++;
        
        if (this.currentPlayerIndex >= this.players.length) {
            // All players have made selections, start resource distribution
            this.startResourceDistribution();
        } else {
            // Next player's turn
            console.log(`Switching to ${this.players[this.currentPlayerIndex].name}, dummy tokens still at:`, this.dummyTokens);
            this.currentPlayer.selectedCards.hunter = null;
            this.currentPlayer.selectedCards.apprentice = null;
            this.createLocationCards();
            this.updateUI();
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
        
        // Calculate and distribute resources
        this.distributeResources();
        
        // Update UI for resolution phase
        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'block';
        document.getElementById('status-message').textContent = 'Round complete! Resources have been distributed.';
        document.querySelector('.card-selection').style.display = 'none';
    }
    
    placeToken(playerId, tokenType, locationId) {
        const location = document.querySelector(`.location[data-location="${locationId}"] .token-slots`);
        const token = document.createElement('div');
        token.className = `token ${tokenType} player-${playerId}`;
        token.textContent = tokenType[0].toUpperCase();
        
        // Apply player colors to the token
        const playerColors = this.getPlayerColors(playerId);
        token.style.backgroundColor = playerColors.background;
        token.style.border = `2px solid ${playerColors.border}`;
        token.style.color = 'white';
        
        location.appendChild(token);
        
        // Update player's token position
        const player = this.players.find(p => p.id === playerId);
        player.tokens[tokenType] = locationId;
    }
    
    nextRound() {
        // Move dummy tokens to next locations
        this.moveDummyTokens();
        
        // Reset for next round
        this.roundPhase = 'selection';
        this.currentPlayerIndex = 0;
        
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
        // Reset all milestone checkboxes
        const checkboxIds = [
            'p1-ep-milestone-8', 'p1-ep-milestone-10',
            'p1-hp-milestone-8', 'p1-hp-milestone-10',
            'p2-ep-milestone-8', 'p2-ep-milestone-10',
            'p2-hp-milestone-8', 'p2-hp-milestone-10'
        ];
        
        checkboxIds.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = false;
            }
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
            // Check EP requirements for hunter cards only (if not already disabled)
            else if (tokenType === 'hunter' && locationId === 7 && this.currentPlayer.resources.ep < 2) { // Forest
                card.classList.add('disabled');
                card.title = 'Requires at least 2 EP';
            }
        });
    }
    
    updateResourceDisplay() {
        this.players.forEach(player => {
            const prefix = `p${player.id}`;
            document.getElementById(`${prefix}-money`).textContent = player.resources.money;
            document.getElementById(`${prefix}-exp`).textContent = player.resources.exp;
            document.getElementById(`${prefix}-hp`).textContent = player.resources.hp;
            document.getElementById(`${prefix}-ep`).textContent = player.resources.ep;
            document.getElementById(`${prefix}-score`).textContent = player.score;
            
            // Update max values for HP and EP since they can change
            document.querySelector(`#player-${player.id}-board .hp .resource-max`).textContent = `/${player.maxResources.hp}`;
            document.querySelector(`#player-${player.id}-board .ep .resource-max`).textContent = `/${player.maxResources.ep}`;
            
            // Update inventory display
            this.updateInventoryDisplay(player.id);
        });
    }
    
    updateInventoryDisplay(playerId) {
        console.log(`updateInventoryDisplay called for player ${playerId}`);
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }
        
        const inventoryContainer = document.getElementById(`p${playerId}-inventory`);
        if (!inventoryContainer) {
            console.error(`Inventory container not found for player ${playerId}`);
            console.log(`Looking for element with ID: p${playerId}-inventory`);
            console.log(`Available elements:`, document.querySelectorAll('[id*="inventory"]'));
            return;
        }
        
        console.log(`Updating inventory for player ${playerId}, items:`, player.inventory);
        console.log(`Container found:`, inventoryContainer);
        
        // Get all possible items and their current counts
        const allItems = [
            { name: 'Beer', icon: '🍺' },
            { name: 'Blood Bag', icon: '🩸' },
            { name: 'Grenade', icon: '💣' },
            { name: 'Bomb', icon: '💥' },
            { name: 'Dynamite', icon: '🧨' },
            { name: 'Fake Blood', icon: '🩹' }
        ];
        
        // Count current items in inventory
        const itemCounts = {};
        player.inventory.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
        
        console.log(`Item counts:`, itemCounts);
        
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
                        const disabled = !canUse ? ' disabled' : '';
                        const title = canUse ? 'Use Beer (+1 EP)' : 'EP is already at maximum';
                        useButton = `<button class="small-btn"${disabled} onclick="game.useInventoryItem(${playerId}, '${item.name}')" title="${title}">Use</button>`;
                        
                        // Katana Level 1 Power: Beer to Blood Bag conversion
                        if (player.weapon.name === 'Katana' && player.weapon.powerTrackPosition >= 1 && count > 0) {
                            const convertTitle = 'Convert Beer to Blood Bag (Katana Power)';
                            useButton += `<button class="small-btn katana-convert" onclick="game.convertBeerToBloodBag(${playerId})" title="${convertTitle}">🩸</button>`;
                        }
                    } else if (item.name === 'Blood Bag') {
                        // Can use blood bag if HP is not at maximum
                        canUse = player.resources.hp < player.maxResources.hp;
                        const disabled = !canUse ? ' disabled' : '';
                        const title = canUse ? 'Use Blood Bag (+1 HP)' : 'HP is already at maximum';
                        useButton = `<button class="small-btn"${disabled} onclick="game.useInventoryItem(${playerId}, '${item.name}')" title="${title}">Use</button>`;
                    }
                }
                
                return `<div class="inventory-item-counter">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-count" id="p${playerId}-${item.name.replace(' ', '')}-count">${count}</span>
                    ${useButton}
                </div>`;
            }).join('');
        
        console.log(`Setting innerHTML to:`, htmlContent);
        inventoryContainer.innerHTML = htmlContent;
        console.log(`Final container innerHTML:`, inventoryContainer.innerHTML);
    }
    
    modifyResource(playerId, resourceType, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const newValue = player.resources[resourceType] + amount;
        player.resources[resourceType] = Math.max(0, Math.min(newValue, player.maxResources[resourceType]));
        
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
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(playerId);
    }
    
    levelUpMaxResource(playerId, resourceType, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Only HP and EP can be leveled up
        if (resourceType !== 'hp' && resourceType !== 'ep') return;
        
        player.maxResources[resourceType] += amount;
        // Also increase current value by the same amount
        player.resources[resourceType] += amount;
        
        // Make sure current doesn't exceed max (though it shouldn't with this logic)
        if (player.resources[resourceType] > player.maxResources[resourceType]) {
            player.resources[resourceType] = player.maxResources[resourceType];
        }
        
        // Check milestones and award points
        const maxValue = player.maxResources[resourceType];
        
        // Check milestone 8
        if (maxValue >= 8 && !player.milestones[`${resourceType}8`]) {
            player.milestones[`${resourceType}8`] = true;
            player.score += 2;
            document.getElementById(`p${playerId}-${resourceType}-milestone-8`).checked = true;
            console.log(`Player ${playerId} reached ${resourceType.toUpperCase()} max 8 milestone - awarded 2 points`);
        }
        
        // Check milestone 10
        if (maxValue >= 10 && !player.milestones[`${resourceType}10`]) {
            player.milestones[`${resourceType}10`] = true;
            player.score += 4;
            document.getElementById(`p${playerId}-${resourceType}-milestone-10`).checked = true;
            console.log(`Player ${playerId} reached ${resourceType.toUpperCase()} max 10 milestone - awarded 4 points`);
        }
        
        // Disable upgrade button if at maximum (10)
        if (maxValue >= 10) {
            const upgradeButton = document.getElementById(`p${playerId}-${resourceType}-upgrade-btn`);
            if (upgradeButton) {
                upgradeButton.disabled = true;
                upgradeButton.title = `${resourceType.toUpperCase()} is at maximum (10)`;
            }
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
    
    showStationModal() {
        if (this.pendingStationPlayers.length === 0) {
            // All station choices made, distribute resources then proceed to store phase
            this.completeResourceDistribution();
            this.enterStorePhase();
            return;
        }
        
        const playerId = this.pendingStationPlayers[0];
        const player = this.players.find(p => p.id === playerId);
        
        // Update modal with correct amounts based on total count
        const isSingleCount = this.stationTotalCount === 1;
        document.getElementById('money-amount').textContent = isSingleCount ? '6' : '4';
        document.getElementById('beer-amount').textContent = isSingleCount ? '6' : '4';
        document.getElementById('bloodBag-amount').textContent = isSingleCount ? '4' : '2';
        document.getElementById('exp-amount').textContent = isSingleCount ? '4' : '2';
        
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
    
    completeResourceDistribution() {
        // Count tokens at each location
        this.locations.forEach(location => {
            if (location.id === 3) return; // Skip station, handled separately
            
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
            
            if (hunterCount === 0) return; // No hunters, no resources
            
            // Determine reward amount based on total count
            const rewardAmount = totalCount === 1 ? location.rewards[0] : location.rewards[1];
            
            // Distribute resources to hunters only
            this.players.forEach(player => {
                if (player.tokens.hunter === location.id) {
                    if (location.resource === 'money' || location.resource === 'exp') {
                        this.modifyResource(player.id, location.resource, rewardAmount);
                    } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                        player.resources[location.resource] += rewardAmount;
                    } else if (location.resource === 'score') {
                        // Plaza scoring: 3 points if alone, 0 if crowded
                        player.score += rewardAmount;
                    }
                }
            });
        });
        
        // Handle station resources
        Object.entries(this.stationChoices).forEach(([playerId, resourceType]) => {
            const player = this.players.find(p => p.id === parseInt(playerId));
            if (!player) return;
            
            // Determine reward amount based on station total count
            let rewardAmount;
            if (resourceType === 'money' || resourceType === 'beer') {
                rewardAmount = this.stationTotalCount === 1 ? 6 : 4;
            } else { // bloodBag or exp
                rewardAmount = this.stationTotalCount === 1 ? 4 : 2;
            }
            
            if (resourceType === 'money' || resourceType === 'exp') {
                this.modifyResource(parseInt(playerId), resourceType, rewardAmount);
            } else if (resourceType === 'beer' || resourceType === 'bloodBag') {
                player.resources[resourceType] += rewardAmount;
                // Also add items to inventory
                const itemName = resourceType === 'beer' ? 'Beer' : 'Blood Bag';
                this.addItemToInventory(parseInt(playerId), itemName, rewardAmount);
            }
        });
        
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
    }
    
    updateInventoryDisplayOld() {
        this.players.forEach(player => {
            // Update upgrade progress only now
            const prefix = `p${player.id}`;
            document.getElementById(`${prefix}-ep-progress`).textContent = `${player.upgradeProgress.ep}/4`;
            document.getElementById(`${prefix}-hp-progress`).textContent = `${player.upgradeProgress.hp}/3`;
            
            // Update weapon display
            console.log(`Updating weapon display for player ${player.id}:`, player.weapon);
            const weaponNameElement = document.getElementById(`${prefix}-weapon-name`);
            console.log(`Weapon name element:`, weaponNameElement);
            if (weaponNameElement && player.weapon && player.weapon.name) {
                weaponNameElement.textContent = player.weapon.name;
                console.log(`Set weapon name to: ${player.weapon.name}`);
            } else {
                console.error(`Missing data - weaponNameElement: ${weaponNameElement}, weapon: ${player.weapon}, weapon.name: ${player.weapon?.name}`);
            }
            document.getElementById(`${prefix}-attack-dice`).textContent = player.weapon.currentAttackDice;
            document.getElementById(`${prefix}-defense-dice`).textContent = player.weapon.currentDefenseDice;
            document.getElementById(`${prefix}-capacity`).textContent = `${this.getInventorySize(player)}/${player.maxInventoryCapacity}`;
            document.getElementById(`${prefix}-req-exp-attack`).textContent = player.weapon.reqExpAttack;
            document.getElementById(`${prefix}-req-exp-defense`).textContent = player.weapon.reqExpDefense;
            
            // Update damage grid display
            this.updateDamageGrid(player.id);
            
            // Update weapon power display
            this.updateWeaponPowerDisplay(player.id);
            this.updateWeaponPowerDescriptions(player.id);
            
            // Update bullet count display
            this.updateBulletDisplay(player.id);
            
            // Update battery count display
            this.updateBatteryDisplay(player.id);
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
    
    updatePopularityTrackDisplay(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const trackElement = document.getElementById(`p${playerId}-popularity-track`);
        if (!trackElement) return;
        
        // Define track levels with rewards
        const trackLevels = [
            { level: 5, points: 5, reward: '5🏆' },
            { level: 4, points: 4, reward: '4⭐' },
            { level: 3, points: 3, reward: '3🩸' },
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
                console.log(`Player ${player.id}'s hunter is in Forest - popularity track does not change`);
                return;
            }
            
            const oldRewardLevel = player.popularityTrack.rewardToken;
            
            // Check if hunter is alone at location
            const isAlone = locationCounts[hunterLocation] === 1;
            
            // Move reward token up or down
            let shouldGiveRewards = false;
            if (isAlone) {
                const oldRewardLevel = player.popularityTrack.rewardToken;
                player.popularityTrack.rewardToken = Math.min(5, player.popularityTrack.rewardToken + 1);
                
                // Special case: if player was already at level 5 and would move up, still give rewards
                if (oldRewardLevel === 5 && player.popularityTrack.rewardToken === 5) {
                    shouldGiveRewards = true;
                    console.log(`Player ${player.id} was already at max popularity level 5 - still receives all rewards`);
                }
            } else {
                // Knife Level 1 Power: Reward token never goes down
                if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 1) {
                    console.log(`Knife Lv1 Power: ${player.name}'s reward token does not go down`);
                } else {
                    player.popularityTrack.rewardToken = Math.max(0, player.popularityTrack.rewardToken - 1);
                }
            }
            
            const newRewardLevel = player.popularityTrack.rewardToken;
            
            // Distribute rewards for the levels the reward token is at and below
            // Also distribute if player was at max level and would have moved up
            if (newRewardLevel > 0 || shouldGiveRewards) {
                this.distributePopularityRewards(player.id, shouldGiveRewards ? 5 : newRewardLevel);
            }
            
            // Update point token if reward token is higher
            if (newRewardLevel > player.popularityTrack.pointToken) {
                const oldPointLevel = player.popularityTrack.pointToken;
                player.popularityTrack.pointToken = newRewardLevel;
                
                // Give points for newly reached level
                if (!player.popularityTrack.levelReached[newRewardLevel]) {
                    player.popularityTrack.levelReached[newRewardLevel] = true;
                    player.score += newRewardLevel; // Add level value as points
                    
                    // Update level display
                    document.getElementById(`p${player.id}-level`).textContent = newRewardLevel;
                }
            }
            
            // Update display
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
                player.score += rewards.score;
            }
        }
    }
    
    addToUpgrade(playerId, upgradeType) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
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
            this.updateInventoryDisplay(1);
            this.updateInventoryDisplay(2);
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
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
            
            // Gloves Level 1 Power: Enhance damage values 5, 6 based on damage taken (4 stays at 1)
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 1 && 
                this.currentBattle && (roll === 5 || roll === 6)) {
                baseDamage = 1 + this.currentBattle.glovesPowerLevel;
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2); // Update weapon display immediately
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2); // Update weapon display immediately
                alert(`${player.name}'s defense dice upgraded to ${player.weapon.currentDefenseDice}!`);
                return true;
            } else {
                alert(`${player.name} needs ${requiredExp} EXP to upgrade defense dice (current: ${player.resources.exp})`);
            }
        }
        
        return false;
    }
    
    loadMonsters() {
        // Load monster data from CSV (simplified version focusing on core stats)
        return {
            1: [ // Level 1 monsters
                { level: 1, hp: 4, att: 1, money: 3, energy: 1, blood: 0, pts: 2 },
                { level: 1, hp: 4, att: 1, money: 0, energy: 3, blood: 0, pts: 3 },
                { level: 1, hp: 4, att: 2, money: 2, energy: 1, blood: 0, pts: 4 },
                { level: 1, hp: 3, att: 2, money: 0, energy: 1, blood: 1, pts: 3 },
                { level: 1, hp: 3, att: 1, money: 0, energy: 0, blood: 1, pts: 2 },
                { level: 1, hp: 3, att: 2, money: 0, energy: 0, blood: 1, pts: 4 },
                { level: 1, hp: 3, att: 1, money: 1, energy: 1, blood: 0, pts: 2 },
                { level: 1, hp: 3, att: 2, money: 0, energy: 2, blood: 1, pts: 2 },
                { level: 1, hp: 3, att: 3, money: 2, energy: 1, blood: 0, pts: 4 },
                { level: 1, hp: 2, att: 3, money: 0, energy: 1, blood: 1, pts: 3 },
                { level: 1, hp: 2, att: 3, money: 0, energy: 2, blood: 0, pts: 4 },
                { level: 1, hp: 2, att: 3, money: 3, energy: 0, blood: 0, pts: 3 }
            ],
            2: [ // Level 2 monsters
                { level: 2, hp: 7, att: 2, money: 3, energy: 1, blood: 0, pts: 7 },
                { level: 2, hp: 7, att: 2, money: 0, energy: 3, blood: 0, pts: 8 },
                { level: 2, hp: 7, att: 2, money: 2, energy: 1, blood: 0, pts: 8 },
                { level: 2, hp: 7, att: 3, money: 2, energy: 2, blood: 1, pts: 6 },
                { level: 2, hp: 6, att: 2, money: 1, energy: 2, blood: 0, pts: 6 },
                { level: 2, hp: 6, att: 3, money: 2, energy: 0, blood: 1, pts: 7 },
                { level: 2, hp: 6, att: 4, money: 3, energy: 1, blood: 0, pts: 8 },
                { level: 2, hp: 6, att: 3, money: 0, energy: 3, blood: 1, pts: 6 },
                { level: 2, hp: 5, att: 4, money: 2, energy: 1, blood: 0, pts: 8 },
                { level: 2, hp: 5, att: 4, money: 2, energy: 0, blood: 1, pts: 7 },
                { level: 2, hp: 5, att: 4, money: 0, energy: 2, blood: 1, pts: 7 },
                { level: 2, hp: 5, att: 3, money: 2, energy: 2, blood: 0, pts: 6 }
            ],
            3: [ // Level 3 monsters
                { level: 3, hp: 13, att: 3, money: 0, energy: 0, blood: 3, pts: 15 },
                { level: 3, hp: 12, att: 3, money: 1, energy: 3, blood: 0, pts: 15 },
                { level: 3, hp: 12, att: 4, money: 0, energy: 1, blood: 2, pts: 16 },
                { level: 3, hp: 11, att: 3, money: 2, energy: 2, blood: 0, pts: 14 },
                { level: 3, hp: 11, att: 5, money: 2, energy: 1, blood: 1, pts: 16 },
                { level: 3, hp: 11, att: 4, money: 1, energy: 3, blood: 0, pts: 15 },
                { level: 3, hp: 11, att: 4, money: 2, energy: 2, blood: 0, pts: 15 },
                { level: 3, hp: 11, att: 5, money: 1, energy: 0, blood: 2, pts: 16 },
                { level: 3, hp: 10, att: 4, money: 3, energy: 1, blood: 0, pts: 14 },
                { level: 3, hp: 10, att: 4, money: 4, energy: 0, blood: 0, pts: 14 },
                { level: 3, hp: 10, att: 4, money: 0, energy: 4, blood: 0, pts: 14 },
                { level: 3, hp: 10, att: 5, money: 2, energy: 1, blood: 0, pts: 16 }
            ]
        };
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
            alert(`${player.name} needs ${totalEPCost} EP for this battle!`);
            return;
        }
        
        // Hide monster selection modal
        document.getElementById('monster-modal').style.display = 'none';
        
        // Deduct EP
        this.modifyResource(playerId, 'ep', -totalEPCost);
        
        // Select random monster from the level
        const monsters = this.monsters[monsterLevel];
        const randomIndex = Math.floor(Math.random() * monsters.length);
        const selectedMonster = { ...monsters[randomIndex] };
        selectedMonster.maxHp = selectedMonster.hp; // Store original HP
        
        // Check if player's apprentice is also in Forest for -1 HP bonus
        if (player.tokens.apprentice === 7) { // Forest location
            selectedMonster.hp = Math.max(1, selectedMonster.hp - 1);
            console.log(`${player.name}'s apprentice in Forest - monster HP reduced by 1 (${selectedMonster.maxHp} -> ${selectedMonster.hp})`);
        }
        
        // Start battle with selected pets
        this.startMonsterBattle(playerId, selectedMonster, this.selectedPets);
    }
    
    startMonsterBattle(playerId, monster, selectedPets = {level1: 0, level2: 0, level3: 0}) {
        this.currentBattle = {
            playerId,
            monster,
            turn: 'player_items', // Allow item usage at start, then attack
            bonusPts: 0, // Track Fake Blood bonus points
            petsUsed: selectedPets, // Track pets being used in this battle
            glovesPowerLevel: 0 // Track Gloves power level (damage taken)
        };
        
        this.showMonsterBattleUI();
    }
    
    showMonsterBattleUI() {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
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
        document.getElementById('battle-monster-hp').textContent = `${battle.monster.hp}/${battle.monster.maxHp}`;
        document.getElementById('battle-monster-att').textContent = battle.monster.att;
        
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
            petDisplay.push(`${petIcons[2]} x${battle.petsUsed.level2} (+${battle.petsUsed.level2 * 3} ATK)`);
        }
        if (battle.petsUsed.level3 > 0) {
            petDisplay.push(`${petIcons[3]} x${battle.petsUsed.level3} (+${battle.petsUsed.level3 * 5} ATK)`);
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
        let requiredEP = battle.monster.level;
        
        // Calculate required EP with Whip weapon reduction
        if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                // Level 3: Taming costs 0 EP
                requiredEP = 0;
            } else {
                // Level 1: Taming costs 1 less EP (minimum 0)
                requiredEP = Math.max(0, battle.monster.level - 1);
            }
        }
        
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 1) {
            // Chain Level 1: Can tame monsters with HP < 4
            canTame = battle.monster.hp < 4 && player.resources.ep >= requiredEP;
        } else {
            // Standard taming: monster HP = 1 and player has enough EP
            canTame = battle.monster.hp === 1 && player.resources.ep >= requiredEP;
        }
        
        // Check if Rifle/Plasma player can attack (has ammo)
        const isRifle = player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1;
        const isPlasma = player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1;
        const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
        const batteries = player.inventory.filter(item => item.name === 'Battery').length;
        
        // Plasma Level 3 has infinite batteries
        const hasPlasmaInfiniteAmmo = player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 7;
        
        const canAttack = (!isRifle || bullets > 0) && (!isPlasma || batteries > 0 || hasPlasmaInfiniteAmmo);
        
        // Check if player has combat items (grenade, bomb, dynamite)
        const combatItems = ['Grenade', 'Bomb', 'Dynamite'];
        const hasCombatItems = combatItems.some(itemName => 
            player.inventory.some(item => item.name === itemName)
        );
        
        // Check if needs ammo but has none
        const needsAmmoButHasNone = (isRifle && bullets === 0) || (isPlasma && batteries === 0 && !hasPlasmaInfiniteAmmo);
        
        if (battle.turn === 'player') {
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
                tameBtn.textContent = `Tame! (${battle.monster.level} EP)`;
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
            
            // Knife Level 2 Power: Show triple damage button (can only be used once per battle)
            if (player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 3 && !battle.tripleDamageUsed) {
                tripleDamageBtn.style.display = 'block';
                tripleDamageBtn.onclick = () => this.useTripleDamage();
            } else {
                tripleDamageBtn.style.display = 'none';
            }
            
            // Don't hide defense button if we just switched to defense phase due to no ammo
            if (!needsAmmoButHasNone) {
                defenseBtn.style.display = 'none';
            }
        } else if (battle.turn === 'player_items') {
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
                    tameBtn.textContent = `Tame! (${battle.monster.level} EP)`;
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
            }
        } else if (battle.turn === 'monster') {
            turnText.textContent = 'Monster attacks!';
            attackBtn.style.display = 'none';
            tameBtn.style.display = 'none';
            defenseBtn.style.display = 'none';
        } else if (battle.turn === 'player_items_after_monster') {
            // After monster attack, player can use items before attacking
            if (needsAmmoButHasNone) {
                // Out of ammo - skip to next round
                turnText.textContent = isRifle ? 'No bullets to attack!' : 'No batteries to attack!';
                attackBtn.style.display = 'none';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'none';
                // Automatically end turn after a short delay
                setTimeout(() => {
                    this.logBattleAction(`${player.name} cannot attack without ammo!`);
                    battle.turn = 'player';
                    this.updateBattlePhase();
                }, 1500);
            } else if (canTame) {
                turnText.textContent = 'Use items, attack, or tame the monster!';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'block';
                tameBtn.textContent = `Tame! (${battle.monster.level} EP)`;
                defenseBtn.style.display = 'none';
            } else {
                turnText.textContent = 'Use items or attack the monster!';
                attackBtn.style.display = 'block';
                tameBtn.style.display = 'none';
                defenseBtn.style.display = 'none';
            }
        }
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
        
        // Check if Rifle player has bullets to attack
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 1) {
            const bulletIndex = player.inventory.findIndex(item => item.name === 'Bullet');
            if (bulletIndex === -1) {
                // No bullets available
                alert('No bullets left! Cannot attack.');
                return;
            }
            
            // Consume one bullet
            player.inventory.splice(bulletIndex, 1);
            this.logBattleAction(`${player.name} uses 1 bullet to attack!`);
            
            // Update bullet displays
            this.updateBulletDisplay(player.id);
            if (this.currentBattle && this.currentBattle.playerId === player.id) {
                const bullets = player.inventory.filter(item => item.name === 'Bullet').length;
                document.getElementById('battle-bullet-count').textContent = `${bullets}/6`;
            }
        }
        
        // Check if Plasma player has batteries to attack (unless infinite at Level 3)
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 1 && player.weapon.powerTrackPosition < 7) {
            const batteryIndex = player.inventory.findIndex(item => item.name === 'Battery');
            if (batteryIndex === -1) {
                // No batteries available
                alert('No batteries left! Cannot attack.');
                return;
            }
            
            // Consume one battery
            player.inventory.splice(batteryIndex, 1);
            this.logBattleAction(`${player.name} uses 1 battery to attack!`);
            
            // Update battery displays
            this.updateBatteryDisplay(player.id);
            if (this.currentBattle && this.currentBattle.playerId === player.id) {
                const batteries = player.inventory.filter(item => item.name === 'Battery').length;
                document.getElementById('battle-battery-count').textContent = `${batteries}/6`;
            }
        }
        
        // Player attacks
        let playerDamage = 0;
        let allRolls = [];
        let totalDicePips = 0; // Track total dice value for Katana instant kill
        let allAttackRolls = []; // Track all dice rolls for Sword Level 3 power
        
        // Check for Bat Level 3 explosive dice
        if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 7) {
            // Explosive dice mechanic
            let keepRolling = true;
            let explosionCount = 0;
            
            while (keepRolling) {
                const attackRolls = this.rollDice(player.weapon.currentAttackDice);
                const damage = this.calculateDamage(battle.playerId, attackRolls);
                
                allRolls.push(`[${attackRolls.join(', ')}]`);
                allAttackRolls.push(...attackRolls); // Track all rolls for other weapon powers
                playerDamage += damage;
                totalDicePips += attackRolls.reduce((sum, roll) => sum + roll, 0);
                explosionCount++;
                
                if (damage === 0) {
                    keepRolling = false;
                    this.logBattleAction(`Bat Lv3 Power: Explosive dice ended after ${explosionCount} roll(s)`);
                } else if (explosionCount >= 10) {
                    // Safety limit to prevent infinite loops
                    keepRolling = false;
                    this.logBattleAction(`Bat Lv3 Power: Explosive dice capped at 10 explosions!`);
                }
            }
        } else {
            // Normal attack
            const attackRolls = this.rollDice(player.weapon.currentAttackDice);
            playerDamage = this.calculateDamage(battle.playerId, attackRolls);
            totalDicePips = attackRolls.reduce((sum, roll) => sum + roll, 0);
            allRolls.push(`[${attackRolls.join(', ')}]`);
            allAttackRolls.push(...attackRolls); // Track all rolls for other weapon powers
        }
        
        // Knife Level 2 Power: Triple damage (once per battle)
        if (battle.nextAttackTripled && playerDamage > 0) {
            playerDamage *= 3;
            battle.nextAttackTripled = false; // Reset the flag after use
            this.logBattleAction(`Knife Lv2 Power: Damage tripled!`);
        }
        
        // Bow Level 3 Power: Double player damage
        if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 7 && playerDamage > 0) {
            playerDamage *= 2;
            this.logBattleAction(`Bow Lv3 Power: Damage doubled!`);
        }
        
        // Sword Level 3 Power: +1 point per attack die showing 1
        if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 7) {
            const onesCount = allAttackRolls.filter(roll => roll === 1).length;
            if (onesCount > 0) {
                player.score += onesCount;
                this.logBattleAction(`Sword Lv3 Power: +${onesCount} point${onesCount > 1 ? 's' : ''} for rolling ${onesCount} one${onesCount > 1 ? 's' : ''}!`);
            }
        }
        
        // Check for Katana Level 3 instant kill (27+ dice pips)
        if (player.weapon.name === 'Katana' && player.weapon.powerTrackPosition >= 7 && totalDicePips >= 27) {
            this.logBattleAction(`Katana Lv3 Power: Instant kill! (${totalDicePips} total dice pips >= 27)`);
            battle.monster.hp = 0; // Instant kill
            this.monsterDefeated();
            return;
        }
        
        // Calculate pet damage
        let petDamage = battle.petsUsed.level1 * 1 + 
                       battle.petsUsed.level2 * 3 + 
                       battle.petsUsed.level3 * 5;
        
        // Chain Level 3 Power: Double pet damage
        if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 7 && petDamage > 0) {
            petDamage *= 2;
            this.logBattleAction(`Chain Lv3 Power: Pet damage doubled!`);
        }
        
        const totalDamage = playerDamage + petDamage;
        battle.monster.hp -= totalDamage;
        battle.hasAttacked = true; // Mark that an attack has occurred
        
        // Log attack
        let attackMessage = `${player.name} attacks! Rolls: ${allRolls.join(' → ')} = ${playerDamage} damage`;
        if (petDamage > 0) {
            attackMessage += ` + ${petDamage} pet damage = ${totalDamage} total damage`;
        }
        this.logBattleAction(attackMessage);
        
        if (battle.monster.hp <= 0) {
            // Monster defeated!
            this.monsterDefeated();
        } else {
            // Move to item usage phase (post-attack)
            battle.turn = 'player_items';
            this.updateBattlePhase();
            this.updateBattleItemButtons();
        }
        
        // Update monster HP display
        document.getElementById('battle-monster-hp').textContent = `${Math.max(0, battle.monster.hp)}/${battle.monster.maxHp}`;
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
                this.logBattleAction(`${player.name} uses Blood Bag! HP restored to ${player.resources.hp}`);
                // Update player HP display
                document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
            } else {
                this.logBattleAction(`${player.name} uses Blood Bag but HP is already at maximum!`);
            }
        } else if (itemName === 'Grenade') {
            // Monster -1 HP
            battle.monster.hp -= 1;
            this.logBattleAction(`${player.name} uses Grenade! Monster takes 1 damage`);
        } else if (itemName === 'Bomb') {
            // Monster -2 HP
            battle.monster.hp -= 2;
            this.logBattleAction(`${player.name} uses Bomb! Monster takes 2 damage`);
        } else if (itemName === 'Dynamite') {
            // Monster -3 HP
            battle.monster.hp -= 3;
            this.logBattleAction(`${player.name} uses Dynamite! Monster takes 3 damage`);
        } else if (itemName === 'Fake Blood') {
            // Increase PTS by 2 (store in battle for later use)
            if (!battle.bonusPts) battle.bonusPts = 0;
            battle.bonusPts += 2;
            this.logBattleAction(`${player.name} uses Fake Blood! Will gain +2 bonus points when monster is defeated`);
        }
        
        // Check if monster is defeated by item
        if (battle.monster.hp <= 0) {
            this.monsterDefeated();
        } else {
            // Update displays
            document.getElementById('battle-monster-hp').textContent = `${Math.max(0, battle.monster.hp)}/${battle.monster.maxHp}`;
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
        
        const finalDamage = Math.max(0, battle.monster.att - totalDefense);
        
        // Log attack
        this.logBattleAction(`Monster attacks for ${battle.monster.att} damage! ${player.name} defends: [${defenseRolls.join(', ')}] = ${totalDefense} defense. Final damage: ${finalDamage}`);
        
        if (finalDamage > 0) {
            this.modifyResource(battle.playerId, 'hp', -finalDamage);
            
            // Update player HP display
            document.getElementById('battle-player-hp').textContent = `${player.resources.hp}/${player.maxResources.hp}`;
            
            // Player gains EXP equal to damage received
            this.modifyResource(battle.playerId, 'exp', finalDamage);
            this.logBattleAction(`${player.name} gains ${finalDamage} EXP from taking damage!`);
            
            // Gloves Level 1 Power: Increase damage values for each damage taken
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 1) {
                battle.glovesPowerLevel += finalDamage;
                this.logBattleAction(`Gloves Lv1 Power: Damage values [4,5,6] increased to ${1 + battle.glovesPowerLevel}!`);
            }
            
            // Axe Level 1 & 3 Power: Monster takes damage when player takes damage
            if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 1) {
                let axeDamageMultiplier = 1;
                if (player.weapon.powerTrackPosition >= 7) {
                    // Level 3: Monster takes 2x damage
                    axeDamageMultiplier = 2;
                }
                
                const axeDamageToMonster = finalDamage * axeDamageMultiplier;
                battle.monster.hp -= axeDamageToMonster;
                
                if (axeDamageMultiplier === 1) {
                    this.logBattleAction(`Axe Lv1 Power: Monster takes ${axeDamageToMonster} damage in return!`);
                } else {
                    this.logBattleAction(`Axe Lv3 Power: Monster takes ${axeDamageToMonster} damage (2x) in return!`);
                }
                
                // Update monster HP display
                document.getElementById('battle-monster-hp').textContent = `${battle.monster.hp}/${battle.monster.maxHp}`;
                
                // Check if monster is defeated by axe power
                if (battle.monster.hp <= 0) {
                    this.logBattleAction(`Monster defeated by Axe power!`);
                    this.monsterDefeated();
                    return;
                }
            }
        }
        
        if (player.resources.hp <= 0) {
            // Player defeated!
            this.logBattleAction(`${player.name} has been defeated!`);
            this.playerDefeated(battle.playerId);
        } else {
            // Allow item usage before player's next attack
            battle.turn = 'player_items_after_monster';
            this.updateBattlePhase();
            this.updateBattleItemButtons();
        }
    }
    
    useTripleDamage() {
        if (!this.currentBattle || this.currentBattle.turn !== 'player') return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        
        // Mark triple damage as used for this battle
        battle.tripleDamageUsed = true;
        battle.nextAttackTripled = true;
        
        this.logBattleAction(`${player.name} activates Knife Lv2 Power: Next attack damage will be tripled!`);
        
        // Update battle phase to hide the button
        this.updateBattlePhase();
    }

    tameMonster() {
        if (!this.currentBattle || (this.currentBattle.turn !== 'player' && this.currentBattle.turn !== 'player_items' && this.currentBattle.turn !== 'player_items_after_monster')) return;
        
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;
        
        // Calculate required EP with Whip weapon reduction
        let requiredEP = monster.level;
        if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 1) {
            if (player.weapon.powerTrackPosition >= 7) {
                requiredEP = 0;
            } else {
                requiredEP = Math.max(0, monster.level - 1);
            }
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
        
        this.logBattleAction(`${player.name} tames the Level ${monster.level} monster! Spent ${monster.level} EP`);
        
        // Update pet display
        this.updatePetDisplay();
        
        // Player still gets all rewards as if they defeated the monster
        this.monsterDefeated();
    }
    
    monsterDefeated() {
        const battle = this.currentBattle;
        const player = this.players.find(p => p.id === battle.playerId);
        const monster = battle.monster;
        
        this.logBattleAction(`${player.name} defeats the Level ${monster.level} monster!`);
        
        // Check for Knife Level 3 Power: Double rewards
        const knifeDoubleRewards = player.weapon.name === 'Knife' && player.weapon.powerTrackPosition >= 7;
        const rewardMultiplier = knifeDoubleRewards ? 2 : 1;
        
        // Award rewards
        if (monster.money > 0) {
            const finalMoney = monster.money * rewardMultiplier;
            this.modifyResource(battle.playerId, 'money', finalMoney);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalMoney} money (doubled by Knife Lv3 Power!)`);
            } else {
                this.logBattleAction(`+${finalMoney} money`);
            }
        }
        if (monster.energy > 0) {
            const finalEnergy = monster.energy * rewardMultiplier;
            player.resources.beer += finalEnergy;
            this.addItemToInventory(battle.playerId, 'Beer', finalEnergy);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalEnergy} beer (doubled by Knife Lv3 Power!)`);
            } else {
                this.logBattleAction(`+${finalEnergy} beer`);
            }
        }
        if (monster.blood > 0) {
            const finalBlood = monster.blood * rewardMultiplier;
            player.resources.bloodBag += finalBlood;
            this.addItemToInventory(battle.playerId, 'Blood Bag', finalBlood);
            if (knifeDoubleRewards) {
                this.logBattleAction(`+${finalBlood} blood bags (doubled by Knife Lv3 Power!)`);
            } else {
                this.logBattleAction(`+${finalBlood} blood bags`);
            }
        }
        if (monster.pts > 0) {
            let totalScore = monster.pts;
            
            // Add Fake Blood bonus points
            if (battle.bonusPts) {
                totalScore += battle.bonusPts;
            }
            
            // Apply Knife Level 3 doubling to total score
            if (knifeDoubleRewards) {
                totalScore *= 2;
                if (battle.bonusPts) {
                    this.logBattleAction(`+${monster.pts} base score + ${battle.bonusPts} Fake Blood bonus = ${totalScore / 2} total score, doubled to ${totalScore} by Knife Lv3 Power!`);
                } else {
                    this.logBattleAction(`+${monster.pts} score, doubled to ${totalScore} by Knife Lv3 Power!`);
                }
            } else {
                if (battle.bonusPts) {
                    this.logBattleAction(`+${monster.pts} base score + ${battle.bonusPts} Fake Blood bonus = ${totalScore} total score`);
                } else {
                    this.logBattleAction(`+${monster.pts} score`);
                }
            }
            
            player.score += totalScore;
        }
        
        // Advance weapon power track based on monster level
        this.advanceWeaponPowerTrack(battle.playerId, monster.level);
        
        // Apply weapon power effects on monster defeat
        if (player.katanaPower && player.katanaPower.bonusExp) {
            this.modifyResource(battle.playerId, 'exp', player.katanaPower.bonusExp);
            this.logBattleAction(`+${player.katanaPower.bonusExp} bonus experience from Katana power!`);
        }
        
        // Rifle Level 2 Power: +3 money on monster defeat
        if (player.weapon.name === 'Rifle' && player.weapon.powerTrackPosition >= 3) {
            this.modifyResource(battle.playerId, 'money', 3);
            this.logBattleAction(`+3 bonus money from Rifle power!`);
        }
        
        // Plasma Level 2 Power: +4 money on monster defeat
        if (player.weapon.name === 'Plasma' && player.weapon.powerTrackPosition >= 3) {
            this.modifyResource(battle.playerId, 'money', 4);
            this.logBattleAction(`+4 bonus money from Plasma power!`);
        }
        
        // Sword Level 2 Power: +2 EXP when beating monster
        if (player.weapon.name === 'Sword' && player.weapon.powerTrackPosition >= 3) {
            this.modifyResource(battle.playerId, 'exp', 2);
            this.logBattleAction(`+2 bonus EXP from Sword power!`);
        }
        
        // Gloves Level 3 Power: +6 points when damage values reach 6
        if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 7 && 
            battle.glovesPowerLevel >= 5) { // 1 + 5 = 6 damage value
            player.score += 6;
            this.logBattleAction(`Gloves Lv3 Power: +6 bonus points for reaching maximum power!`);
        }
        
        this.endMonsterBattle(true);
    }
    
    playerDefeated(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // No score penalty (removed)
        this.logBattleAction(`${player.name} was defeated by the monster`);
        
        // Set HP to 1
        player.resources.hp = 1;
        this.logBattleAction(`${player.name}'s HP set to 1`);
        
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
    }
    
    advanceWeaponPowerTrack(playerId, monsterLevel) {
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
                this.activateWeaponPower(playerId, 2);
            }
            if (wasBelow7 && player.weapon.powerTrackPosition >= 7) {
                // Just unlocked Level 3 power
                this.activateWeaponPower(playerId, 3);
            }
            
            this.logBattleAction(`${player.name}'s weapon power advances ${actualMoved} space${actualMoved > 1 ? 's' : ''} to position ${player.weapon.powerTrackPosition}!`);
        } else {
            this.logBattleAction(`${player.name}'s weapon power is already at maximum position!`);
        }
    }
    
    updateWeaponPowerDisplay(playerId) {
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
    
    activateWeaponPower(playerId, level) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        this.logBattleAction(`${player.name} unlocks Level ${level} weapon power!`);
        
        // Apply power effects based on weapon and level
        const weaponName = player.weapon.name;
        
        switch (weaponName) {
            case 'Bat':
                this.applyBatPower(player, level);
                break;
            case 'Katana':
                this.applyKatanaPower(player, level);
                break;
            default:
                // For weapons without implemented powers yet
                this.logBattleAction(`${weaponName} Level ${level} power effect not yet implemented`);
                break;
        }
    }
    
    applyBatPower(player, level) {
        switch (level) {
            case 1:
                // 徒弟在資源區域撞其他獵人+1區域資源 (Apprentice gets +1 resource when bumping into other hunters in resource areas)
                player.batPower = { apprenticeBonus: true };
                this.logBattleAction(`${player.name}'s apprentice now gets bonus resources when sharing locations!`);
                break;
            case 2:
                // 回合開始+1血袋+1體力 (Start of round +1 blood bag +1 energy)
                player.batPower = { ...player.batPower, roundStart: { bloodBag: 1, energy: 1 } };
                this.logBattleAction(`${player.name} will gain +1 blood bag and +1 energy at round start!`);
                break;
            case 3:
                // 命中的骰子再骰，直到沒有骰子命中，傷害為所有傷害加總 (Re-roll hit dice until no dice hit, damage is sum of all damage)
                player.batPower = { ...player.batPower, explosiveDice: true };
                this.logBattleAction(`${player.name}'s attacks now have explosive dice - keep rolling hits!`);
                break;
        }
    }
    
    applyKatanaPower(player, level) {
        switch (level) {
            case 1:
                // 1血袋換1體力 (1 blood bag converts to 1 energy)
                player.katanaPower = { bloodToEnergy: true };
                this.logBattleAction(`${player.name} can now convert blood bags to energy efficiently!`);
                break;
            case 2:
                // 打敗怪獸+2經驗 (Defeating monsters gives +2 experience)
                player.katanaPower = { ...player.katanaPower, bonusExp: 2 };
                this.logBattleAction(`${player.name} gains +2 extra experience from defeating monsters!`);
                break;
            case 3:
                // 攻擊骰總點數大於27則一擊必殺 (If attack dice total > 27, instant kill)
                player.katanaPower = { ...player.katanaPower, instantKill: 27 };
                this.logBattleAction(`${player.name} can instant kill monsters with attack dice total > 27!`);
                break;
        }
    }
    
    logBattleAction(message) {
        const log = document.getElementById('battle-log');
        const logEntry = document.createElement('div');
        logEntry.className = 'battle-log-entry';
        logEntry.textContent = message;
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;
    }
    
    loadStoreItems() {
        // Load store items from Item.csv
        return [
            { name: 'Beer', size: 1, price: 2, effect: 'gain_1_energy', icon: '🍺' },
            { name: 'Blood Bag', size: 1, price: 2, effect: 'gain_1_blood', icon: '🩸' },
            { name: 'Grenade', size: 2, price: 2, effect: 'reduce_1_monster_hp', icon: '💣' },
            { name: 'Bomb', size: 3, price: 4, effect: 'reduce_2_monster_hp', icon: '💥' },
            { name: 'Dynamite', size: 4, price: 6, effect: 'reduce_3_monster_hp', icon: '🧨' },
            { name: 'Fake Blood', size: 2, price: 2, effect: 'bonus_points_on_kill', icon: '🩹' }
        ];
    }
    
    enterStorePhase() {
        this.roundPhase = 'store';
        this.currentStorePlayer = 0;
        this.showStore();
    }
    
    showStore() {
        const player = this.players[this.currentStorePlayer];
        
        // Hide card selection and show store area
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
                price: 3, 
                effect: 'plasma_power', 
                icon: '🔋',
                isSpecial: true,
                maxCount: 6
            };
            availableItems.unshift(batteryItem); // Add batteries at the beginning
        }
        
        availableItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item-card';
            if (item.isSpecial) itemElement.classList.add('special-item');
            
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
        player.inventory.push({...item});
        
        // Update display
        this.showStore();
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
        
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
        const newTotalSize = currentInventorySize + size;
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
        
        // Deduct money and add item to inventory
        player.resources.money -= price;
        player.inventory.push(item);
        
        // Update display
        this.showStore();
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
        
        // Update bullet displays
        this.updateBulletDisplay(1);
        this.updateBulletDisplay(2);
        
        // Update battery displays
        this.updateBatteryDisplay(1);
        this.updateBatteryDisplay(2);
        
        // alert(`${player.name} bought ${itemName}!`); // Removed popup as requested
    }
    
    finishShopping() {
        this.currentStorePlayer++;
        
        if (this.currentStorePlayer >= this.players.length) {
            // All players finished shopping, hide store area
            document.getElementById('store-area').style.display = 'none';
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
                playersWithOverflow.push(player.id);
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
            
            // Determine reward amount based on total count (including dummy tokens)
            const rewardAmount = totalCount === 1 ? location.rewards[0] : location.rewards[1];
            
            // Distribute resources to hunters only
            this.players.forEach(player => {
                if (player.tokens.hunter === location.id) {
                    if (location.resource === 'money' || location.resource === 'exp') {
                        this.modifyResource(player.id, location.resource, rewardAmount);
                    } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                        player.resources[location.resource] += rewardAmount;
                        // Also add items to inventory
                        const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                        this.addItemToInventory(player.id, itemName, rewardAmount);
                    } else if (location.resource === 'score') {
                        // Plaza scoring: 3 points if alone, 0 if crowded
                        player.score += rewardAmount;
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
                            console.log(`Bat Lv1 Power: ${player.name}'s apprentice gets +1 ${location.resource} at ${location.name}`);
                        } else if (location.resource === 'beer' || location.resource === 'bloodBag') {
                            player.resources[location.resource] += 1;
                            const itemName = location.resource === 'beer' ? 'Beer' : 'Blood Bag';
                            this.addItemToInventory(player.id, itemName, 1);
                            console.log(`Bat Lv1 Power: ${player.name}'s apprentice gets +1 ${itemName} at ${location.name}`);
                        }
                    }
                }
            });
        });
        
        this.updateResourceDisplay();
        this.updateInventoryDisplayOld();
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
        
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
            this.showStationModal();
        } else {
            // No station choices needed, go to store phase
            this.enterStorePhase();
        }
    }
    
    startBattlePhase() {
        this.roundPhase = 'battle';
        
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
        // Check for win condition before starting next round
        const winner = this.checkWinCondition();
        if (winner) {
            this.endGame(winner);
            return;
        }
        
        // Start NextRound phase
        this.startNextRoundPhase();
    }
    
    checkWinCondition() {
        // Check if any player has reached 50 points
        const winner = this.players.find(player => player.score >= 50);
        return winner || null;
    }
    
    endGame(winner) {
        this.roundPhase = 'gameover';
        
        // Show game over message
        document.getElementById('status-message').textContent = 
            `🎉 Game Over! ${winner.name} wins with ${winner.score} points! 🎉`;
        
        // Hide game controls
        document.getElementById('confirm-selection').style.display = 'none';
        document.getElementById('next-player').style.display = 'none';
        
        // Show restart option
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Start New Game';
        restartButton.onclick = () => {
            this.resetMilestoneCheckboxes();
            location.reload();
        };
        document.querySelector('.controls').appendChild(restartButton);
    }
    
    startNextRoundPhase() {
        this.roundPhase = 'nextround';
        
        // Clear the board - bring all tokens back to players
        document.querySelectorAll('.token').forEach(token => token.remove());
        
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
        }, 2000);
    }
    
    startNewRound() {
        // Move dummy tokens to next locations
        this.moveDummyTokens();
        
        // Apply weapon power effects at round start
        this.players.forEach(player => {
            // Bat Level 2 Power: +1 beer and +1 blood bag at round start
            if (player.weapon.name === 'Bat' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 1;
                player.resources.bloodBag += 1;
                this.addItemToInventory(player.id, 'Beer', 1);
                this.addItemToInventory(player.id, 'Blood Bag', 1);
                console.log(`Bat Lv2 Power: ${player.name} receives +1 beer and +1 blood bag at round start`);
            }
            
            // Chain Level 2 Power: +2 beers at round start
            if (player.weapon.name === 'Chain' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
                console.log(`Chain Lv2 Power: ${player.name} receives +2 beers at round start`);
            }
            
            // Axe Level 2 Power: +2 blood bags at round start
            if (player.weapon.name === 'Axe' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 2;
                this.addItemToInventory(player.id, 'Blood Bag', 2);
                console.log(`Axe Lv2 Power: ${player.name} receives +2 blood bags at round start`);
            }
            
            // Whip Level 2 Power: +2 beers at round start
            if (player.weapon.name === 'Whip' && player.weapon.powerTrackPosition >= 3) {
                player.resources.beer += 2;
                this.addItemToInventory(player.id, 'Beer', 2);
                console.log(`Whip Lv2 Power: ${player.name} receives +2 beers at round start`);
            }
            
            // Bow Level 2 Power: +2 EXP at round start
            if (player.weapon.name === 'Bow' && player.weapon.powerTrackPosition >= 3) {
                this.modifyResource(player.id, 'exp', 2);
                console.log(`Bow Lv2 Power: ${player.name} receives +2 EXP at round start`);
            }
            
            // Gloves Level 2 Power: +2 blood bags at round start
            if (player.weapon.name === 'Gloves' && player.weapon.powerTrackPosition >= 3) {
                player.resources.bloodBag += 2;
                this.addItemToInventory(player.id, 'Blood Bag', 2);
                console.log(`Gloves Lv2 Power: ${player.name} receives +2 blood bags at round start`);
            }
        });
        
        // Update displays after applying round start effects
        this.updateResourceDisplay();
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
        
        // Reset for next round
        this.roundPhase = 'selection';
        this.currentPlayerIndex = 0;
        
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
                
                buttonsHTML = `
                    <button onclick="game.useItemFromOverflow(${playerId}, ${index})" class="use-btn" ${!canUse ? 'disabled' : ''} title="${canUse ? 'Use item' : (item.name === 'Beer' ? 'EP is at maximum' : 'HP is at maximum')}">Use</button>
                    <button onclick="game.addToUpgradeFromOverflow(${playerId}, ${index})" class="upgrade-btn" ${!canUpgrade ? 'disabled' : ''} title="${canUpgrade ? 'Add to upgrade progress' : 'Max resource is already 10'}">Upgrade</button>
                    <button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn">Discard</button>
                `;
            } else {
                // Grenade, Bomb, Dynamite, Fake Blood: Discard only
                buttonsHTML = `<button onclick="game.removeItem(${playerId}, ${index})" class="remove-btn">Discard</button>`;
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
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
        this.updateInventoryDisplay(1);
        this.updateInventoryDisplay(2);
        
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
    
    convertBeerToBloodBag(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Check if player has Katana and power is unlocked
        if (player.weapon.name !== 'Katana' || player.weapon.powerTrackPosition < 1) {
            console.log('Katana Level 1 power not available');
            return;
        }
        
        // Find a beer item in inventory
        const beerIndex = player.inventory.findIndex(item => item.name === 'Beer');
        if (beerIndex === -1) {
            console.log('No beer in inventory to convert');
            return;
        }
        
        // Remove one beer
        player.inventory.splice(beerIndex, 1);
        player.resources.beer = Math.max(0, player.resources.beer - 1);
        
        // Add one blood bag
        this.addItemToInventory(playerId, 'Blood Bag', 1);
        player.resources.bloodBag += 1;
        
        console.log(`Katana Lv1 Power: ${player.name} converts 1 beer to 1 blood bag`);
        
        // Update displays
        this.updateResourceDisplay();
        this.updateInventoryDisplay(playerId);
        
        // Update battle UI if in battle
        if (this.currentBattle && this.currentBattle.playerId === playerId) {
            // Update might not be needed as inventory updates should handle it
        }
        
        // Update location card states if needed
        if (this.roundPhase === 'selection' && player.id === this.currentPlayer.id) {
            this.updateLocationCardStates();
        }
    }
    
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
                    this.currentBattle.monster.hp -= 1;
                    this.logBattleAction(`${player.name} uses Grenade! Monster takes 1 damage.`);
                    this.showMonsterBattleUI();
                }
                break;
            case 'reduce_2_monster_hp':
                // Used during combat - reduce monster HP by 2
                if (context && context.type === 'combat' && this.currentBattle) {
                    this.currentBattle.monster.hp -= 2;
                    this.logBattleAction(`${player.name} uses Bomb! Monster takes 2 damage.`);
                    this.showMonsterBattleUI();
                }
                break;
            case 'reduce_3_monster_hp':
                // Used during combat - reduce monster HP by 3
                if (context && context.type === 'combat' && this.currentBattle) {
                    this.currentBattle.monster.hp -= 3;
                    this.logBattleAction(`${player.name} uses Dynamite! Monster takes 3 damage.`);
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
        this.players.forEach(player => {
            const petContainer = document.getElementById(`p${player.id}-pets`);
            if (!petContainer) {
                console.error(`Pet container not found for player ${player.id}`);
                return;
            }
            
            petContainer.innerHTML = '';
            
            // Pet info for tooltips
            const petInfo = {
                1: { cost: 2, attack: 1, icon: '🐾' },
                2: { cost: 3, attack: 3, icon: '🦊' },
                3: { cost: 4, attack: 5, icon: '🐺' }
            };
            
            // Display each type of pet
            [1, 2, 3].forEach(level => {
                const count = player.pets[`level${level}`];
                if (count > 0) {
                    for (let i = 0; i < count; i++) {
                        const petDiv = document.createElement('div');
                        petDiv.className = 'pet-token';
                        petDiv.innerHTML = `<span>${petInfo[level].icon}</span><span class="pet-level">Lv${level}</span>`;
                        petDiv.title = `Level ${level} Pet: Cost ${petInfo[level].cost} EP to join fight / Provides ${petInfo[level].attack} attack`;
                        petContainer.appendChild(petDiv);
                    }
                }
            });
            
            if (petContainer.innerHTML === '') {
                petContainer.innerHTML = '<span class="no-pets">No pets yet</span>';
            }
        });
    }
    
    updatePetSelectionUI() {
        const player = this.players.find(p => p.id === this.currentMonsterPlayer);
        const container = document.getElementById('pet-selection-container');
        container.innerHTML = '';
        
        const petInfo = {
            1: { cost: 2, attack: 1, icon: '🐾', name: 'Level 1 Pet' },
            2: { cost: 3, attack: 3, icon: '🦊', name: 'Level 2 Pet' },
            3: { cost: 4, attack: 5, icon: '🐺', name: 'Level 3 Pet' }
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
}

// Start the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game(); // Make game globally accessible
    game = window.game; // Keep local reference for compatibility
});