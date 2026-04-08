# Rock Paper Hunters - Unity Port Progress

## Overview
Porting from web app (vanilla JS ~16,060 lines + Firebase) to Unity for Steam publishing.
Total scripts written: **53 C# files** covering all 15 steps of the migration plan.

## Code Status: COMPLETE
All 15 steps of the migration plan have been implemented in code:

| Step | Status | Notes |
|------|--------|-------|
| 1. Project Setup & Data Foundation | Done | 6 ScriptableObject classes + factory |
| 2. Core Data Structures | Done | EventBus, GameManager, PlayerData, StateMachine |
| 3. Game Board UI & Selection Phase | Done | Selection logic + LocationCardUI |
| 4. Resource Distribution & Station | Done | In GameStateMachine phases |
| 5. Store Phase | Done | StoreUI + CapacityOverflow + bot shopping |
| 6. Battle System | Done | BattleManager (~1000 lines) + BattleUI |
| 7. Win Condition & Game Over | Done | GameOverUI + full loop |
| 8. Bot AI System | Done | 4 AI scripts wired to GameManager |
| 9. Animation & VFX | Done | DOTween animations |
| 10. Audio | Done | AudioManager + SFXLibrary |
| 11. Main Menu & Lobby | Done | MainMenuUI + LobbyUI |
| 12. Steam Networking | Done | Wrapped in #if MIRROR / #if STEAMWORKS |
| 13. Chat System | Done | Canned messages, Alt+Q shortcut |
| 14. Data Collection / CSV Export | Done | DataCollectionUI + CSVExporter |
| 15. Steam Store Prep | Done | SteamManager with AppID config |

## Packages Installed
- TextMeshPro (built-in)
- DOTween (Asset Store)
- Newtonsoft JSON (Package Manager)
- NOT installed: Mirror, Steamworks.NET (needed for online multiplayer - code wrapped in #if guards)

## ScriptableObject Assets Generated
All 70+ ScriptableObject .asset files were generated via the Editor menu:
**Tools > Rock Paper Hunters > Generate All Data Assets**
- 11 Weapons (Bat, Katana, Rifle, Plasma, Chain, Axe, Whip, Bow, Sword, Knife, Gloves)
- 36 Monsters (12 each Lv1/Lv2/Lv3)
- 8 Items (Beer, BloodBag, Grenade, Bomb, Dynamite, FakeBlood, Bullets, Batteries)
- 7 Locations (WorkSite, Bar, Station, Hospital, Dojo, Plaza, Forest)
- 6 BotDecisionTables (DojoLv1-3, ForestLv1-3)
- 1 GameConfig

## Scenes Status
- **MainMenu.unity**: BUILT
  - GameManager GameObject with all ScriptableObject refs wired
  - Canvas with MainMenuPanel (Title + 4 buttons)
  - LocalSetupPanel (player count buttons, 4 player slots, back/start buttons)
  - MainMenuController with MainMenuUI script attached and all fields wired
- **Lobby.unity**: NOT BUILT
- **Game.unity**: NOT BUILT (next step)
- **GameOver.unity**: NOT BUILT (or merged into Game scene)

## Compilation Status
- No errors as of last check
- Some warnings about unused fields (expected for stub UI references)

## Current Step / Next Action
**The user is starting to test the MainMenu scene and needs to debug.**

Next steps after debugging:
1. Add scenes to Build Settings (File > Build Settings > Add Open Scenes)
   - MainMenu must be index 0
   - Game must be added so SceneManager.LoadScene("Game") works
2. Build the Game scene with GameBoard, SelectionPanel, StorePanel, BattlePanel, GameOverPanel, GameLog
3. Create GameSceneController GameObject and attach all UI scripts
4. Wire prefabs (LocationCard, ItemSlot, PlayerBoard, etc.)

## Known Issues / TODO
- Mirror & Steamworks not yet installed (online multiplayer code is in #if guards)
- No prefabs created yet (LocationCardPrefab, PlayerBoardPrefab, ItemSlotPrefab, etc.)
- No art assets imported yet (using placeholder shapes)
- No audio clips assigned yet (SFXLibrary is empty)

## File Locations
- Scripts: `C:\Users\dranp\claude_lab\RockPaperHunters\Assets\Scripts\`
- ScriptableObjects: `C:\Users\dranp\claude_lab\RockPaperHunters\Assets\ScriptableObjects\`
- Source JS (reference): `C:\Users\dranp\claude_lab\game.js`
- Project root: `C:\Users\dranp\claude_lab\RockPaperHunters\`

## Architecture Notes
- **EventBus pattern**: All UI listens to events, game logic publishes them. Decoupled.
- **State machine**: GameStateMachine handles phase transitions (Selection → Distribution → Station → Store → Battle → NextRound)
- **GameManager singleton**: DontDestroyOnLoad, persists across scenes
- **Bot AI**: BotPlayer instances created in GameManager.StartNewGame(), used by SelectionPhaseUI and BattleManager
