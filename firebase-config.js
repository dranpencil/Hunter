// Firebase Online Manager - Handles all Firebase operations for online multiplayer
class OnlineManager {
    constructor() {
        // Firebase configuration - REPLACE with your Firebase project config
        this.firebaseConfig = {
            apiKey: "AIzaSyBc9BDwzG9lxH0vg4mH7dvTJPcm61P6Tuw",
            authDomain: "rockpaperhunters.firebaseapp.com",
            databaseURL: "https://rockpaperhunters-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "rockpaperhunters",
            storageBucket: "rockpaperhunters.firebasestorage.app",
            messagingSenderId: "956679898581",
            appId: "1:956679898581:web:06fd9bc145563f2402295c",
            measurementId: "G-MQ7FC0914D"
        };

        this.app = null;
        this.db = null;
        this.roomCode = null;
        this.roomRef = null;
        this.localId = null; // unique ID for this client
        this.isHost = false;
        this.listeners = []; // Track active listeners for cleanup
        this.heartbeatInterval = null;
        this.disconnectCheckInterval = null;
        this.onDisconnectRef = null;
        this.stateVersion = 0;
        this.disconnectTimeout = 30000; // Default 30s, can be overridden
        this.warningTimeout = 15000;    // Default 15s, can be overridden
    }

    // Initialize Firebase
    init() {
        if (this.app) return; // Already initialized
        try {
            this.app = firebase.app();
        } catch (e) {
            this.app = firebase.initializeApp(this.firebaseConfig);
        }
        this.db = firebase.database();
        this.localId = this.generateId();
    }

    generateId() {
        return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ==================== ROOM MANAGEMENT ====================

    async createRoom(playerCount, humanPlayerCount) {
        this.init();
        this.isHost = true;

        // Generate unique room code (retry if exists)
        let code;
        let exists = true;
        while (exists) {
            code = this.generateRoomCode();
            const snapshot = await this.db.ref(`rooms/${code}`).once('value');
            exists = snapshot.exists();
        }

        this.roomCode = code;
        this.roomRef = this.db.ref(`rooms/${code}`);

        const roomData = {
            hostId: this.localId,
            players: {
                [this.localId]: { joinOrder: 0 }
            },
            status: 'waiting',
            playerCount: playerCount,
            humanPlayerCount: humanPlayerCount,
            disconnectTimeout: this.disconnectTimeout,
            config: {
                weapons: null
            },
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await this.roomRef.set(roomData);

        // Set up onDisconnect cleanup for host
        this.onDisconnectRef = this.roomRef.child(`heartbeat/${this.localId}`);
        this.onDisconnectRef.onDisconnect().remove();

        // Start heartbeat
        this.startHeartbeat();

        return code;
    }

    async joinRoom(roomCode) {
        this.init();
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase();
        this.roomRef = this.db.ref(`rooms/${this.roomCode}`);

        // Check room exists and is joinable
        const snapshot = await this.roomRef.once('value');
        if (!snapshot.exists()) {
            throw new Error('Room not found');
        }

        const room = snapshot.val();
        if (room.status !== 'waiting') {
            throw new Error('Game already in progress');
        }

        const currentPlayerCount = room.players ? Object.keys(room.players).length : 0;
        if (currentPlayerCount >= room.humanPlayerCount) {
            throw new Error('Room is full');
        }

        // Apply host's timeout settings
        if (room.disconnectTimeout) {
            this.disconnectTimeout = room.disconnectTimeout;
            this.warningTimeout = Math.floor(room.disconnectTimeout / 2);
        }

        // Join the room by adding to players list
        await this.roomRef.child(`players/${this.localId}`).set({
            joinOrder: currentPlayerCount
        });

        // Set up onDisconnect cleanup
        this.onDisconnectRef = this.roomRef.child(`heartbeat/${this.localId}`);
        this.onDisconnectRef.onDisconnect().remove();

        // Start heartbeat
        this.startHeartbeat();

        return room;
    }

    // ==================== LISTENERS ====================

    listenForPlayers(callback) {
        const ref = this.roomRef.child('players');
        const handler = ref.on('value', (snapshot) => {
            const players = snapshot.val();
            if (players) {
                callback(players);
            }
        });
        this.listeners.push({ ref, event: 'value', handler });
    }

    listenForGameStart(callback) {
        const ref = this.roomRef.child('status');
        const handler = ref.on('value', (snapshot) => {
            if (snapshot.val() === 'playing') {
                callback();
            }
        });
        this.listeners.push({ ref, event: 'value', handler });
    }

    listenForConfig(callback) {
        const ref = this.roomRef.child('config');
        const handler = ref.on('value', (snapshot) => {
            const config = snapshot.val();
            if (config) {
                callback(config);
            }
        });
        this.listeners.push({ ref, event: 'value', handler });
    }

    // Host pushes game state, non-host players listen
    async pushGameState(state) {
        if (!this.isHost) return;
        this.stateVersion++;
        state.stateVersion = this.stateVersion;
        await this.roomRef.child('gameState').set(state);
    }

    listenForGameState(callback) {
        const ref = this.roomRef.child('gameState');
        const handler = ref.on('value', (snapshot) => {
            const state = snapshot.val();
            if (state) {
                callback(state);
            }
        });
        this.listeners.push({ ref, event: 'value', handler });
    }

    // Non-host players push actions, host listens
    async pushAction(action) {
        action.timestamp = firebase.database.ServerValue.TIMESTAMP;
        action.senderId = this.localId;
        await this.roomRef.child('actions').push(action);
    }

    listenForActions(callback) {
        const ref = this.roomRef.child('actions');
        const handler = ref.on('child_added', (snapshot) => {
            const action = snapshot.val();
            action._key = snapshot.key;
            callback(action);
        });
        this.listeners.push({ ref, event: 'child_added', handler });
    }

    async clearActions() {
        await this.roomRef.child('actions').remove();
    }

    // ==================== GAME CONFIG ====================

    async setConfig(config) {
        await this.roomRef.child('config').update(config);
    }

    async startGame() {
        await this.roomRef.update({ status: 'playing' });
    }

    async setStatus(status) {
        await this.roomRef.update({ status });
    }

    // ==================== HEARTBEAT & DISCONNECT ====================

    startHeartbeat() {
        const heartbeatRef = this.roomRef.child(`heartbeat/${this.localId}`);

        // Write heartbeat immediately
        heartbeatRef.set(firebase.database.ServerValue.TIMESTAMP);

        // Write heartbeat every 5 seconds
        this.heartbeatInterval = setInterval(() => {
            heartbeatRef.set(firebase.database.ServerValue.TIMESTAMP);
        }, 5000);

        // Monitor all other players' heartbeats
        this.disconnectCheckInterval = setInterval(async () => {
            const snapshot = await this.roomRef.child('heartbeat').once('value');
            const heartbeats = snapshot.val();
            if (!heartbeats) return;

            const now = Date.now();
            for (const [playerId, lastBeat] of Object.entries(heartbeats)) {
                if (playerId === this.localId) continue;
                const elapsed = now - lastBeat;
                if (elapsed > this.disconnectTimeout) {
                    this.handleDisconnect(playerId);
                } else if (elapsed > this.warningTimeout) {
                    if (this.onConnectionWarning) {
                        this.onConnectionWarning(playerId);
                    }
                }
            }
        }, 5000);
    }

    handleDisconnect(disconnectedPlayerId) {
        if (this.onPlayerDisconnected) {
            this.onPlayerDisconnected(disconnectedPlayerId);
        }
    }

    // ==================== CLEANUP ====================

    cleanup() {
        // Remove all listeners
        this.listeners.forEach(({ ref, event, handler }) => {
            ref.off(event, handler);
        });
        this.listeners = [];

        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.disconnectCheckInterval) {
            clearInterval(this.disconnectCheckInterval);
            this.disconnectCheckInterval = null;
        }

        // Cancel onDisconnect
        if (this.onDisconnectRef) {
            this.onDisconnectRef.onDisconnect().cancel();
            this.onDisconnectRef = null;
        }
    }

    async deleteRoom() {
        if (this.roomRef) {
            this.cleanup();
            await this.roomRef.remove();
            this.roomRef = null;
            this.roomCode = null;
        }
    }

    // Schedule room deletion after game ends
    scheduleRoomDeletion(delayMs = 60000) {
        setTimeout(async () => {
            try {
                await this.deleteRoom();
                console.log('Room cleaned up after game end');
            } catch (e) {
                console.log('Room cleanup failed (may already be deleted):', e.message);
            }
        }, delayMs);
    }

    // Callbacks (set by game.js)
    onConnectionWarning = null;
    onPlayerDisconnected = null;
}
