const BOARD_SIZE = 14;
const MAX_RANGE = 13;
const DEFAULT_WALL_LIMIT = 24;
const WALLS_PER_SETUP_TURN = 4;
const TWO_PLAYER_TURN_LIMIT = 24;
const THREE_PLAYER_TURN_LIMIT = 36;
const FOUR_PLAYER_TURN_LIMIT = 48;
const TIMER_SECONDS = { draft: 180, walls: 45, place: 45, ability: 20, battle: 90 };
const teamOrder = ["red", "green", "yellow", "blue"];
const teams = {
  red: { id: "red", name: "Red Player", color: "#d92d2d", short: "R" },
  green: { id: "green", name: "Green Player", color: "#159b55", short: "G" },
  yellow: { id: "yellow", name: "Yellow Player", color: "#d6ab00", short: "Y" },
  blue: { id: "blue", name: "Blue Player", color: "#167ec4", short: "B" },
};

const cardAsset = (fileName) => `./assets/${fileName}`;
const hero = (id, family, name, image, ability, text, effects = {}) => ({ id, kind: "hero", family, name, image: cardAsset(image), ability, text, effects });
const armor = (id, family, name, hp, image, ability, text, effects = {}) => ({ id, kind: "armor", family, name, hp, image: cardAsset(image), ability, text, effects });
const weapon = (id, family, name, dp, image, ability, text, effects = {}) => ({ id, kind: "weapon", family, name, dp, image: cardAsset(image), ability, text, effects });

// Official Set A card pool and revised abilities from DATABASE.xlsx.
const setACards = [
  hero("flamar_h", "Flamar", "Flamar", "1027F644-3ED5-4DD6-9C79-07EBF1121186.png", "Flaming Boost", "Flamar's Sword gets +300 DP instead of the normal +100 matching bonus.", { flamarSwordBonus: true }),
  armor("flamar_a", "Flamar", "Blazen Armor", 2200, "6C97F4C7-1CC0-4703-9CFD-5057FBE3EBF9.png", "Blaze Aura", "Enemy attacks do 200 less DP.", { incomingReduce: 200 }),
  weapon("flamar_w", "Flamar", "Flamar's Sword", 400, "AF6CCC9F-A223-4117-AAC5-E7B3FFEF5AF7.png", "Flaming Slash", "Cross; Range 6; +100 DP at range 1-3.", { pattern: "cross", range: 6, closeBonus: { max: 3, amount: 100 } }),

  hero("sparko_h", "Sparko", "Sparko", "91EAD9FC-CBD4-4545-A206-3DEC7C1D6DC8.png", "Electric Zap", "+200 DP while this set has more than 1500 HP.", { attackIfHpAbove: { min: 1501, amount: 200 } }),
  armor("sparko_a", "Sparko", "Electro Boots", 2000, "40559F9E-7BB6-46EE-9F79-FE52DA9D9FCC.png", "Light Speed", "When attacked, step 1 space directly away before damage.", { dodgeBack: 1 }),
  weapon("sparko_w", "Sparko", "Electro Bow", 300, "72CC7514-CB94-4CCB-9BE6-DFD108F12EE9.png", "Lightning Strike", "Cross; Maximum range; roll 3-6 for +200 DP.", { pattern: "cross", range: MAX_RANGE, rollBonus: { min: 3, amount: 200 } }),

  hero("aquazi_h", "Aquazi", "Aquazi", "9B076830-2A00-45E1-B112-34EB8DBF0F58.png", "Swim", "Advance 1 extra space.", { moveBonus: 1 }),
  armor("aquazi_a", "Aquazi", "Aquarmor", 2100, "364A081B-3618-451F-B1B7-14602609E164.png", "Tsunami Wall", "Enemy attacks do 100 less DP.", { incomingReduce: 100 }),
  weapon("aquazi_w", "Aquazi", "Aquablade", 300, "546F5D7A-515E-43E7-8DD2-F3771AF00516.png", "Water Wave", "Diagonal; Range 6; +100 DP at range 1-4.", { pattern: "diagonal", range: 6, closeBonus: { max: 4, amount: 100 } }),

  hero("scorpio_h", "Scorpio Slash", "Scorpio Slash", "85DA45EA-826F-4CB1-835A-034D1698DB0A.png", "Ninja Roll", "Enemy attacks do 100 less DP.", { incomingReduce: 100 }),
  armor("scorpio_a", "Scorpio Slash", "Venarmor", 2000, "0F59DF89-4BE0-425D-B440-0107DB617F32.png", "Block", "Attacks above 400 DP do 200 less DP.", { reduceIfAttackAbove: { min: 400, amount: 200 } }),
  weapon("scorpio_w", "Scorpio Slash", "Veno-stars", 400, "C4DCB963-453B-409A-BB64-50556895F4C4.png", "Venom", "Diagonal; Range 7; roll 1-2 for +200 DP.", { pattern: "diagonal", range: 7, rollBonus: { values: [1, 2], amount: 200 } }),

  hero("iceoth_h", "Iceoth", "Iceoth", "C75E51FE-5EFB-4594-90EE-5117A5CBF3AC.png", "Cyborg Eye", "The weapon in this set gets +100 DP.", { weaponDpBonus: 100 }),
  armor("iceoth_a", "Iceoth", "Iceplate", 2000, "B9DC9F4A-9FF6-488B-A2AC-D276F166CCBA.png", "Glacier Wall", "Roll 3-6 to reduce an enemy attack by 200 DP.", { reduceOnRoll: { min: 3, amount: 200 } }),
  weapon("iceoth_w", "Iceoth", "Icel", 300, "5F3F2F77-CDEF-48D6-91B4-E18D592C7A50.png", "Glacier Smash", "Diagonal; Range 5; roll 1 or 6 for +200 DP.", { pattern: "diagonal", range: 5, rollBonus: { values: [1, 6], amount: 200 } }),

  hero("neol_h", "Neol", "Neol", "A9DB504D-A75A-4B1D-97B8-ECFE406E47D4.png", "Bright Blinding", "Enemy attacks have 1 less space of range against this Hero.", { enemyRangeReduce: 1 }),
  armor("neol_a", "Neol", "Nearmor", 2100, "6A280BD9-B53D-499D-8E5C-74BD39642A19.png", "Power Light", "Roll 3-6 to reduce an enemy attack by 200 DP.", { reduceOnRoll: { min: 3, amount: 200 } }),
  weapon("neol_w", "Neol", "Glow Sword", 400, "024CE498-B8F8-43C3-9437-A8C663CF33A3.png", "Light Stab", "Cross; Range 4; attacks through walls while above 1600 HP.", { pattern: "cross", range: 4, hpThroughWalls: { min: 1601 } }),

  hero("lancer_h", "Lancer", "Lancer", "22D56961-C36A-45FE-90E3-81EEE862EBFC.png", "Armor Boost", "The Armor in this set has +200 HP.", { armorHpBonus: 200 }),
  armor("blaze_a", "Blaze", "Bakour Armor", 2100, "F318DC6A-EF94-4082-A636-54B97BEF319C.png", "Bakour Block", "Roll odd to reduce an enemy attack by 200 DP.", { reduceOnRoll: { odd: true, amount: 200 } }),
  weapon("lancer_w", "Lancer", "Lance", 400, "3A71CCD9-0672-47DF-8F6F-E4663F72400A.png", "Long Stab", "Cross; Range 7; +200 DP at range 1-3.", { pattern: "cross", range: 7, closeBonus: { max: 3, amount: 200 } }),

  hero("zanion_h", "Zanion", "Zanion", "53C2A230-0A50-4916-A95D-EC1712B359FA.png", "Invisibility Spell", "Enemy attacks have 3 less spaces of range against this Hero.", { enemyRangeReduce: 3 }),
  armor("honsen_a", "Honsen", "Holmer", 2100, "1008A5F1-AA39-4EBF-841C-A421ECDA17E4.png", "Green Absorb", "Enemy attacks do 100 less DP.", { incomingReduce: 100 }),
  weapon("zanion_w", "Zanion", "Wandelt", 400, "DCD8EAAB-7F37-48E8-94AA-591CB14DDC39.png", "Magic Chance", "Choose Cross or Diagonal; Range 5; roll 1 for +300 DP.", { pattern: "choice", range: 5, rollBonus: { values: [1], amount: 300 } }),

  hero("staron_h", "Staron", "Staron", "3CF4DD16-DF9C-43EF-B31D-96CAD6BCABFF.png", "Blazing Aura", "+100 DP against enemies 1-4 spaces away.", { closeAttackBonus: { max: 4, amount: 100 } }),
  armor("staron_a", "Staron", "Astro Shield", 2100, "E2B334FC-82E4-4F5B-A42C-B3E4CB9452E2.png", "Power of Flame", "Roll 1 to reduce an enemy attack by 300 DP.", { reduceOnRoll: { values: [1], amount: 300 } }),
  weapon("asher_w", "Asher", "Red Dagger", 400, "C2047755-4261-4ED1-8CF8-24CAB9B242A0.png", "Red Stab", "Cross; Range 4; roll 1-4 to increase range by 1.", { pattern: "cross", range: 4, rangeRollBonus: { max: 4, amount: 1 } }),

  hero("jay_h", "Jay", "Jay", "96077920-009D-4DA8-AF15-2418E2C82A75.png", "Secret Run", "Retreat 1 extra space.", { retreatBonus: 1 }),
  armor("jay_a", "Jay", "Orange Armor", 2000, "5F7CBF63-36F9-4DB3-A360-C27F4AE22621.png", "Orange Power", "Roll 1-2 to reduce the attacker's retreat by 2 spaces.", { enemyRetreatPenaltyOnRoll: { values: [1, 2], amount: 2 } }),
  weapon("zero_w", "Zero", "Knife", 300, "A15637E2-7C1F-45AA-816C-352283C8D4F7.png", "Stab", "Cross; Range 4; roll 1-3 for +100 DP.", { pattern: "cross", range: 4, rollBonus: { max: 3, amount: 100 } }),

  hero("yakomi_h", "Yakomi", "Yakomi", "E4B96F59-BC4B-48C0-B54C-79A71CBEE128.png", "Escape", "Retreat 2 extra spaces.", { retreatBonus: 2 }),
  armor("marceler_a", "Marceler", "Megarmor", 2200, "CE364567-0CB7-424E-9FA6-B538DCEF163D.png", "Bright Block", "Enemy attacks do 200 less DP.", { incomingReduce: 200 }),
  weapon("marceler_w", "Marceler", "Megarikin", 400, "80109A52-CD15-4F3A-975C-48D4F5C0DC2F.png", "Speed Throw", "Diagonal; Range 6; +200 DP while above 1800 HP.", { pattern: "diagonal", range: 6, attackIfHpAbove: { min: 1801, amount: 200 } }),

  hero("gali_h", "Gali", "Gali", "F2D2334F-7974-42A6-A60F-C48ADFEBB4D6.png", "Knight Aura", "The weapon in this set gets +100 DP.", { weaponDpBonus: 100 }),
  armor("okar_a", "Okar", "Lime Armor", 2100, "E87E2538-0E3C-493B-BA90-88991860416E.png", "Lime Block", "Reflects 100 DP back on the attacker.", { reflect: 100 }),
  weapon("okar_w", "Okar", "Lime Sword", 300, "B26DDE1E-FE5E-4907-8321-B70039FBB7DD.png", "Lime Slash", "Cross; Range 5; +200 DP against enemies above 1600 HP.", { pattern: "cross", range: 5, targetHpAboveBonus: { min: 1601, amount: 200 } }),
];

const cards = [...setACards, ...(window.ArponExtraCards || [])].map((card) => ({
  ...card,
  sets: window.ArponCardSets?.[card.id] || ["A"],
  tokenImage: window.ArponTokenArt?.[card.id] || card.tokenImage,
}));

const cardsById = Object.fromEntries(cards.map((card) => [card.id, card]));
const state = {
  mode: "local",
  matchId: crypto.randomUUID(),
  ranked: false,
  robotTeams: [],
  timedRobotTeams: [],
  disconnectedTeams: [],
  forfeitHpSnapshots: {},
  playerDecks: {},
  playerCosmetics: {},
  timeoutStrikes: {},
  timerEnabled: true,
  timer: null,
  phase: "lobby",
  playerCount: 4,
  playerTeams: [...teamOrder],
  playerNames: Object.fromEntries(teamOrder.map((team) => [team, teams[team].name])),
  draftHands: {},
  draftSelections: {},
  draftSwaps: {},
  draftLocked: {},
  wandeltChoices: {},
  setupTeamIndex: 0,
  activeTeam: "red",
  loadouts: [],
  wallOwnerTurn: "red",
  wallCounts: {},
  wallSkipped: {},
  walls: [],
  wallBatchStartIndex: 0,
  wallLimit: DEFAULT_WALL_LIMIT,
  placeTeamIndex: 0,
  placeSetIndex: 0,
  firstTeam: "red",
  setupRolls: {},
  turnLimit: FOUR_PLAYER_TURN_LIMIT,
  turnNumber: 1,
  dice: null,
  movementLeft: 0,
  hasRolled: false,
  movedHeroIds: [],
  moveBonusUsed: [],
  attackedPairs: [],
  attackingHeroIds: [],
  retreatQueue: [],
  retreatHeroId: null,
  retreatPenalties: {},
  retreatSteps: 0,
  pendingAttack: null,
  attackAnimation: null,
  pendingRoll: null,
  sharedDiceResult: null,
  receiptTimer: null,
  receiptContent: "",
  receiptExpiresAt: 0,
  receiptId: null,
  turnEndNotice: null,
  victory: null,
  log: [],
};

const deviceState = {
  selectedSetId: null,
  dismissedReceiptId: null,
  lastDiceResultToken: null,
  pendingMoveChoice: null,
  pendingStayMove: null,
  setPreviewId: null,
  setPreviewTimer: null,
  suppressNextSetClick: false,
  turnLimitCustomized: false,
  robotActing: false,
  robotTimer: null,
  timerInterval: null,
  handledTimerKey: null,
  automaticTurnTimer: null,
  lastHpByLoadout: {},
  diceAnimationTimer: null,
  rollActionLock: null,
  resolvedAbilityRollKey: null,
  dismissedTurnEndNoticeToken: null,
  turnEndNoticeTimer: null,
  disconnectPromptShown: false,
};

const elements = Object.fromEntries(
  [
    "board", "heroList", "setupTitle", "setupBadge", "setupPanel", "selectedCard", "cardStack", "battleLog", "rollButton",
    "resetButton", "diceIcon", "diceLabel", "turnLabel", "phaseLabel", "moveCaption", "moveLabel", "battleHint", "lobbyModal", "lobbyPlayers",
    "startGameButton", "passModal", "passEmblem", "passTitle", "passMessage", "passButton", "rulesModal", "rulesButton", "closeRulesButton",
    "centerRollButton", "centerDiceIcon", "centerDiceLabel", "cardZoomModal", "cardZoomImage", "cardZoomTitle", "closeCardZoomButton",
    "rollPromptModal", "rollPromptTitle", "rollPromptMessage", "abilityRollButton", "diceResultOverlay", "diceResultLabel", "diceResultValue",
    "turnLimitInput", "turnLimitValue", "wallLimitInput", "wallLimitValue", "startSoloButton", "soloTurnLimitInput", "soloTurnLimitValue",
    "soloWallLimitInput", "soloWallLimitValue", "attackReceipt", "victoryModal", "victoryTitle", "victoryReason", "victoryScores", "homeButton",
    "moveChoiceModal", "moveChoiceMessage", "keepMovementButton", "finishMovementButton", "closeMoveChoiceButton",
    "stayConfirmModal", "stayConfirmMessage", "cancelStayButton", "confirmStayButton",
    "setPreviewModal", "setPreviewTitle", "setPreviewCards", "closeSetPreviewButton", "turnCounterLabel", "timerBlock", "timerLabel",
    "turnEndedOverlay", "turnEndedPlayer", "muteButton", "squadDrawerButton",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

function activeTeams() {
  return state.playerTeams;
}

function wallsPerPlayer() {
  return Math.ceil(state.wallLimit / activeTeams().length);
}

function wallTarget(team) {
  const index = activeTeams().indexOf(team);
  const base = Math.floor(state.wallLimit / activeTeams().length);
  return base + (index >= 0 && index < state.wallLimit % activeTeams().length ? 1 : 0);
}

function wallProgress(team) {
  return (state.wallCounts[team] || 0) + (state.wallSkipped[team] || 0);
}

function totalWallProgress() {
  return activeTeams().reduce((sum, team) => sum + wallProgress(team), 0);
}

function defaultTurnLimit(playerCount) {
  if (playerCount === 2) return TWO_PLAYER_TURN_LIMIT;
  if (playerCount === 3) return THREE_PLAYER_TURN_LIMIT;
  return FOUR_PLAYER_TURN_LIMIT;
}

function resetToLobby() {
  clearTimeout(deviceState.robotTimer);
  clearTimeout(deviceState.automaticTurnTimer);
  clearTimeout(deviceState.turnEndNoticeTimer);
  clearInterval(deviceState.diceAnimationTimer);
  window.ArponOnline?.onResetToLobby?.();
  state.mode = "local";
  state.matchId = crypto.randomUUID();
  state.ranked = false;
  state.robotTeams = [];
  state.timedRobotTeams = [];
  state.disconnectedTeams = [];
  state.forfeitHpSnapshots = {};
  state.playerDecks = {};
  state.playerCosmetics = {};
  state.timeoutStrikes = {};
  state.timerEnabled = true;
  state.timer = null;
  state.phase = "lobby";
  state.playerCount = 4;
  state.playerTeams = [...teamOrder];
  state.playerNames = Object.fromEntries(teamOrder.map((team) => [team, teams[team].name]));
  state.activeTeam = "red";
  state.loadouts = [];
  deviceState.selectedSetId = null;
  state.wallCounts = {};
  state.wallSkipped = {};
  state.walls = [];
  state.wallBatchStartIndex = 0;
  state.wallLimit = DEFAULT_WALL_LIMIT;
  state.dice = null;
  state.movementLeft = 0;
  state.hasRolled = false;
  state.movedHeroIds = [];
  state.moveBonusUsed = [];
  state.attackedPairs = [];
  state.attackingHeroIds = [];
  state.retreatQueue = [];
  state.retreatHeroId = null;
  state.retreatPenalties = {};
  state.retreatSteps = 0;
  state.pendingAttack = null;
  state.attackAnimation = null;
  state.pendingRoll = null;
  state.sharedDiceResult = null;
  state.receiptContent = "";
  state.receiptExpiresAt = 0;
  state.receiptId = null;
  state.turnEndNotice = null;
  state.victory = null;
  deviceState.dismissedReceiptId = null;
  deviceState.lastDiceResultToken = null;
  deviceState.pendingMoveChoice = null;
  deviceState.pendingStayMove = null;
  elements.moveChoiceModal.hidden = true;
  elements.stayConfirmModal.hidden = true;
  state.turnNumber = 1;
  state.turnLimit = defaultTurnLimit(state.playerCount);
  state.log = [];
  deviceState.turnLimitCustomized = false;
  deviceState.robotActing = false;
  deviceState.robotTimer = null;
  deviceState.handledTimerKey = null;
  deviceState.automaticTurnTimer = null;
  deviceState.diceAnimationTimer = null;
  deviceState.rollActionLock = null;
  deviceState.resolvedAbilityRollKey = null;
  deviceState.dismissedTurnEndNoticeToken = null;
  deviceState.turnEndNoticeTimer = null;
  deviceState.disconnectPromptShown = false;
  deviceState.lastHpByLoadout = {};
  document.body.classList.remove("squad-drawer-open");
  closeSetPreview();
  elements.lobbyModal.hidden = false;
  elements.passModal.hidden = true;
  elements.victoryModal.hidden = true;
  elements.rollPromptModal.hidden = true;
  elements.moveChoiceModal.hidden = true;
  hideAttackReceipt();
  renderLobby();
  render();
}

function rollPendingAbility() {
  const pending = state.pendingRoll;
  if (!pending || !canLocalControlTeam(pending.team)) return;
  deviceState.resolvedAbilityRollKey = abilityRollKey(pending);
  const rollLabel = pending.title;
  const rollTeam = pending.team;
  state.pendingRoll = null;
  const result = rollDie();
  showDiceResult(rollLabel, result, () => resolvePendingRoll(pending, result), rollTeam);
}

function renderLobby() {
  document.querySelectorAll(".count-button").forEach((button) => button.classList.toggle("active", Number(button.dataset.count) === state.playerCount));
  elements.lobbyPlayers.innerHTML = teamOrder
    .map((team) => {
      const active = state.playerTeams.includes(team);
      return `
        <label class="lobby-player ${active ? "active" : ""}" style="--team-color:${teams[team].color}">
          <button class="color-toggle" data-lobby-team="${team}" type="button" aria-label="Toggle ${team} player">${active ? "ON" : "OFF"}</button>
          <span>${titleCase(team)}</span>
          <input data-name-team="${team}" value="${escapeHtml(state.playerNames[team])}" ${active ? "" : "disabled"} aria-label="${team} player name" />
        </label>
      `;
    })
    .join("");
  elements.lobbyPlayers.querySelectorAll("[data-lobby-team]").forEach((button) => button.addEventListener("click", () => toggleLobbyTeam(button.dataset.lobbyTeam)));
  elements.lobbyPlayers.querySelectorAll("[data-name-team]").forEach((input) =>
    input.addEventListener("input", () => {
      state.playerNames[input.dataset.nameTeam] = input.value || teams[input.dataset.nameTeam].name;
    }),
  );
  elements.turnLimitInput.value = state.turnLimit;
  elements.turnLimitValue.textContent = `${state.turnLimit} turns`;
  elements.wallLimitInput.value = state.wallLimit;
  elements.wallLimitValue.textContent = `${state.wallLimit} walls`;
  elements.startGameButton.disabled = state.playerTeams.length !== state.playerCount;
}

function setPlayerCount(count) {
  state.playerCount = count;
  state.playerTeams = count === 2 ? ["red", "yellow"] : count === 3 ? ["red", "green", "yellow"] : [...teamOrder];
  if (!deviceState.turnLimitCustomized) state.turnLimit = defaultTurnLimit(count);
  renderLobby();
}

function toggleLobbyTeam(team) {
  if (state.playerTeams.includes(team)) state.playerTeams = state.playerTeams.filter((item) => item !== team);
  else if (state.playerTeams.length < state.playerCount) state.playerTeams = teamOrder.filter((item) => state.playerTeams.includes(item) || item === team);
  renderLobby();
}

function startGame() {
  if (state.playerTeams.length !== state.playerCount) return;
  const signedInDeck = window.ArponCollection?.activeDeckIds?.() || [];
  const signedInCosmetics = window.ArponCollection?.cosmetics?.() || {};
  activeTeams().forEach((team) => {
    if (!state.playerDecks[team]?.length) state.playerDecks[team] = signedInDeck.length ? [...signedInDeck] : [...(window.ArponSetACardIds || setACards.map((card) => card.id))];
    if (!state.playerCosmetics[team]) state.playerCosmetics[team] = { ...signedInCosmetics };
  });
  state.phase = "draft";
  state.matchId ||= crypto.randomUUID();
  state.setupTeamIndex = 0;
  state.activeTeam = activeTeams()[0];
  state.loadouts = [];
  deviceState.selectedSetId = null;
  state.wallCounts = Object.fromEntries(activeTeams().map((team) => [team, 0]));
  state.wallSkipped = Object.fromEntries(activeTeams().map((team) => [team, 0]));
  state.walls = [];
  state.wallBatchStartIndex = 0;
  state.placeTeamIndex = 0;
  state.placeSetIndex = 0;
  state.dice = null;
  state.movementLeft = 0;
  state.hasRolled = false;
  state.movedHeroIds = [];
  state.moveBonusUsed = [];
  state.attackedPairs = [];
  state.attackingHeroIds = [];
  state.retreatQueue = [];
  state.retreatHeroId = null;
  state.retreatPenalties = {};
  state.retreatSteps = 0;
  state.pendingAttack = null;
  state.pendingRoll = null;
  state.timeoutStrikes = Object.fromEntries(activeTeams().map((team) => [team, 0]));
  state.timedRobotTeams = [];
  state.timer = null;
  state.sharedDiceResult = null;
  state.turnEndNotice = null;
  state.victory = null;
  state.turnNumber = 1;
  state.log = [];
  dealDraftHands();
  elements.lobbyModal.hidden = true;
  logEvent("Best of 3 begins. Each player chooses two cards from each three-card hand.", "#30343b");
  if (!window.ArponOnline?.isOnline?.() && state.mode !== "solo") showPass(activeTeams()[0], "Your private active-deck deal is ready.");
  render();
}

function dealDraftHands() {
  state.draftHands = {};
  state.draftSelections = {};
  state.draftSwaps = {};
  state.draftLocked = {};
  state.wandeltChoices = {};
  activeTeams().forEach((team) => {
    const allowedIds = state.playerDecks?.[team]?.length ? new Set(state.playerDecks[team]) : new Set(window.ArponSetACardIds || setACards.map((card) => card.id));
    const pool = cards.filter((card) => allowedIds.has(card.id));
    state.draftHands[team] = Object.fromEntries(["hero", "armor", "weapon"].map((kind) => [
      kind,
      shuffle(pool.filter((card) => card.kind === kind)).slice(0, 3).map((card) => card.id),
    ]));
    state.draftSelections[team] = { hero: [], armor: [], weapon: [] };
    state.draftSwaps[team] = { armor: false, weapon: false };
    state.draftLocked[team] = false;
  });
}

function startSoloGame(enemyCount = 1, wallLimit = DEFAULT_WALL_LIMIT, turnLimit = TWO_PLAYER_TURN_LIMIT) {
  const robotTeams = enemyCount === 1 ? ["yellow"] : enemyCount === 2 ? ["green", "yellow"] : ["green", "yellow", "blue"];
  state.mode = "solo";
  state.matchId = crypto.randomUUID();
  state.ranked = false;
  state.timerEnabled = false;
  state.robotTeams = robotTeams;
  state.timedRobotTeams = [];
  state.playerTeams = ["red", ...robotTeams];
  state.playerCount = state.playerTeams.length;
  state.playerNames = Object.fromEntries(teamOrder.map((team) => [team, teams[team].name]));
  state.playerNames.red = "You";
  robotTeams.forEach((team, index) => {
    state.playerNames[team] = `Robot ${index + 1}`;
  });
  state.wallLimit = Number(wallLimit);
  state.turnLimit = Number(turnLimit);
  startGame();
  robotTeams.forEach((team) => {
    ["hero", "armor", "weapon"].forEach((kind) => {
      state.draftSelections[team][kind] = state.draftHands[team][kind].slice(0, 2);
    });
    state.draftLocked[team] = true;
  });
  render();
}

function beginSoloArena() {
  state.firstTeam = "red";
  state.activeTeam = "red";
  state.wallOwnerTurn = "red";
  state.walls = generateRandomWalls(state.wallLimit);
  state.wallCounts = Object.fromEntries(activeTeams().map((team) => [team, 0]));
  state.wallSkipped = Object.fromEntries(activeTeams().map((team) => [team, 0]));
  state.walls.forEach((wall) => {
    state.wallCounts[wall.owner] = (state.wallCounts[wall.owner] || 0) + 1;
  });
  state.robotTeams.forEach(placeRobotSquad);
  state.phase = "place";
  state.placeTeamIndex = 0;
  state.placeSetIndex = 0;
  deviceState.selectedSetId = teamLoadouts("red")[0]?.id || null;
  logEvent(`${state.walls.length} random walls generated. Place your two Heroes.`, "#30343b");
  render();
}

function generateRandomWalls(limit) {
  const candidates = [];
  for (let y = 1; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) candidates.push({ axis: "h", x, y });
  }
  for (let x = 1; x < BOARD_SIZE; x += 1) {
    for (let y = 0; y < BOARD_SIZE; y += 1) candidates.push({ axis: "v", x, y });
  }
  return shuffle(candidates)
    .filter((wall) => adjacentCellsForWall(wall.axis, wall.x, wall.y).every((cell) => inBounds(cell.x, cell.y) && !isCornerFortress(cell.x, cell.y)))
    .slice(0, Math.max(0, limit))
    .map((wall, index) => ({ ...wall, owner: activeTeams()[index % activeTeams().length] }));
}

function placeRobotSquad(team) {
  const choices = shuffle(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({ x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) }))
    .filter((cell) => zoneOfCell(cell.x, cell.y) === team && !isCornerFortress(cell.x, cell.y)));
  teamLoadouts(team).forEach((loadout) => {
    const cell = choices.find((candidate) => !loadoutAt(candidate.x, candidate.y));
    if (cell) Object.assign(loadout, cell, { placed: true });
  });
}

function render(sync = true) {
  ensureGameTimer();
  document.body.classList.toggle("draft-mode", state.phase === "draft");
  ensureSelected();
  renderTopbar();
  renderSetupPanel();
  renderBoard();
  renderHeroList();
  renderSelectedPanel();
  renderCards();
  renderLog();
  renderPendingRoll();
  renderSharedDiceResult();
  renderTurnEndNotice();
  renderVictory();
  renderSetPreview();
  renderAudioButton();
  scheduleRobotAction();
  if (sync) window.ArponOnline?.onGameRendered?.(exportGameState());
}

function renderAudioButton() {
  const muted = window.ArponAudio?.isMuted?.() ?? false;
  elements.muteButton.textContent = muted ? "Muted" : "Sound";
  elements.muteButton.setAttribute("aria-pressed", String(muted));
  elements.muteButton.title = muted ? "Unmute sound" : "Mute sound";
}

function renderTopbar() {
  const visibleTeam = state.phase === "lobby" ? null : state.phase === "walls" ? state.wallOwnerTurn : state.phase === "place" ? placementTeamAt(state.placeTeamIndex) : state.activeTeam;
  const controlsTeam = visibleTeam || state.activeTeam;
  const canControl = controlsTeam ? canLocalControlTeam(controlsTeam) : true;
  elements.turnLabel.textContent = visibleTeam ? displayName(visibleTeam) : "Prepare Battle";
  elements.turnLabel.style.color = visibleTeam ? teams[visibleTeam].color : "";
  elements.phaseLabel.textContent = phaseLabel();
  const movementPhase = state.phase === "move" || state.phase === "retreat";
  elements.moveCaption.textContent = "Steps";
  elements.moveLabel.textContent = state.phase === "move" ? state.movementLeft : state.phase === "retreat" ? state.retreatSteps : "-";
  elements.turnCounterLabel.textContent = `${state.turnNumber}/${state.turnLimit}`;
  elements.diceIcon.textContent = state.dice || "D6";
  elements.diceLabel.textContent = state.phase === "retreatRoll" ? "Retreat" : state.hasRolled ? "Rolled" : "Roll";
  const diceResultActive = Number(state.sharedDiceResult?.expiresAt || 0) > Date.now();
  const rollLocked = deviceState.rollActionLock
    && deviceState.rollActionLock.turnNumber === state.turnNumber
    && deviceState.rollActionLock.phase === state.phase
    && deviceState.rollActionLock.retreatHeroId === state.retreatHeroId;
  const showCenterRoll = canControl && !diceResultActive && !rollLocked && ["battleRoll", "retreatRoll"].includes(state.phase);
  const rollPhase = ["battleRoll", "retreatRoll"].includes(state.phase);
  elements.rollButton.hidden = rollPhase;
  elements.rollButton.disabled = !canControl || !rollPhase || diceResultActive || rollLocked;
  elements.centerRollButton.hidden = !showCenterRoll;
  elements.centerDiceIcon.textContent = state.dice || "D6";
  elements.centerDiceLabel.textContent = state.phase === "retreatRoll" ? "Roll Retreat" : "Roll Movement";
  elements.battleHint.textContent = battleHint();
  const boardTeam = state.mode === "solo" ? "red" : window.ArponOnline?.getLocalTeam?.() || visibleTeam || state.activeTeam;
  elements.board.style.setProperty("--board-rotation", boardRotation(boardTeam));
  elements.board.style.setProperty("--counter-rotation", boardCounterRotation(boardTeam));
  renderTimer();
}

function renderTurnEndNotice() {
  const notice = state.turnEndNotice;
  clearTimeout(deviceState.turnEndNoticeTimer);
  if (!notice || Number(notice.expiresAt) <= Date.now() || deviceState.dismissedTurnEndNoticeToken === notice.token) {
    elements.turnEndedOverlay.hidden = true;
    return;
  }
  elements.turnEndedPlayer.textContent = displayName(notice.team);
  elements.turnEndedOverlay.style.setProperty("--notice-color", teams[notice.team]?.color || teams.red.color);
  elements.turnEndedOverlay.hidden = false;
  deviceState.turnEndNoticeTimer = setTimeout(() => {
    elements.turnEndedOverlay.hidden = true;
  }, Math.max(0, Number(notice.expiresAt) - Date.now()));
}

function phaseTimerKey() {
  if (state.mode !== "online" || ["lobby", "complete"].includes(state.phase)) return null;
  if (state.pendingRoll) return `ability:${state.pendingRoll.team}:${state.pendingRoll.kind}:${state.pendingRoll.attackerId || ""}:${state.pendingRoll.targetId || ""}`;
  if (state.phase === "draft") return "draft";
  if (state.phase === "walls") return `walls:${state.wallOwnerTurn}:${Math.floor(wallProgress(state.wallOwnerTurn) / WALLS_PER_SETUP_TURN)}`;
  if (state.phase === "place") return `place:${state.placeTeamIndex}:${state.placeSetIndex}`;
  if (["battleRoll", "move", "attack", "retreatRoll", "retreat", "done"].includes(state.phase)) return `battle:${state.turnNumber}:${state.activeTeam}`;
  return null;
}

function timerDurationForKey(key) {
  if (key.startsWith("ability:")) return TIMER_SECONDS.ability;
  if (key === "draft") return TIMER_SECONDS.draft;
  if (key.startsWith("walls:")) return TIMER_SECONDS.walls;
  if (key.startsWith("place:")) return TIMER_SECONDS.place;
  return TIMER_SECONDS.battle;
}

function ensureGameTimer() {
  if (!deviceState.timerInterval) deviceState.timerInterval = setInterval(tickGameTimer, 250);
  if (!state.timerEnabled) {
    state.timer = null;
    return;
  }
  const key = phaseTimerKey();
  if (!key) {
    if (window.ArponOnline?.isHost?.()) state.timer = null;
    return;
  }
  if (window.ArponOnline?.isHost?.() && state.timer?.key !== key) {
    state.timer = { key, deadline: Date.now() + timerDurationForKey(key) * 1000 };
    deviceState.handledTimerKey = null;
  }
}

function renderTimer() {
  const active = state.timerEnabled && state.mode === "online" && state.timer?.deadline && state.phase !== "complete";
  elements.timerBlock.hidden = !active;
  if (active) updateTimerLabel();
}

function updateTimerLabel() {
  if (!state.timer?.deadline) return;
  const seconds = Math.max(0, Math.ceil((Number(state.timer.deadline) - Date.now()) / 1000));
  elements.timerLabel.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  elements.timerBlock.classList.toggle("urgent", seconds <= 20);
}

function tickGameTimer() {
  if (!state.timerEnabled) return;
  updateTimerLabel();
  if (!state.timer?.deadline || Date.now() < Number(state.timer.deadline) || !window.ArponOnline?.isHost?.()) return;
  if (deviceState.handledTimerKey === state.timer.key) return;
  deviceState.handledTimerKey = state.timer.key;
  handleGameTimerExpiry();
}

function handleGameTimerExpiry() {
  const expiredKey = state.timer?.key || "";
  state.timer = null;
  if (state.pendingRoll) {
    const pending = state.pendingRoll;
    state.pendingRoll = null;
    logEvent(`${displayName(pending.team)} did not roll in time. The ability was skipped.`, teams[pending.team].color);
    resolvePendingRoll(pending, 0);
    return;
  }
  if (state.phase === "draft") {
    activeTeams().filter((team) => !state.draftLocked[team]).forEach((team) => {
      ["hero", "armor", "weapon"].forEach((kind) => {
        state.draftSelections[team][kind] = state.draftSelections[team][kind].length === 2
          ? state.draftSelections[team][kind]
          : state.draftHands[team][kind].slice(0, 2);
      });
      state.draftLocked[team] = true;
      logEvent(`${displayName(team)}'s remaining draft choices were selected automatically.`, teams[team].color);
    });
    finalizeDraftsAndBeginWalls();
    render();
    return;
  }
  if (state.phase === "walls") {
    skipCurrentWallBatch();
    return;
  }
  if (state.phase === "place") {
    autoPlaceCurrentHero();
    return;
  }
  if (expiredKey.startsWith("battle:")) handleBattleTimeout();
}

function skipCurrentWallBatch() {
  const team = state.wallOwnerTurn;
  const remaining = Math.max(0, wallTarget(team) - wallProgress(team));
  const batchRemaining = Math.min(remaining, WALLS_PER_SETUP_TURN - (wallProgress(team) % WALLS_PER_SETUP_TURN || 0));
  state.wallSkipped[team] = (state.wallSkipped[team] || 0) + Math.max(1, batchRemaining);
  logEvent(`${displayName(team)} ran out of wall-placement time. The rest of this wall turn was skipped.`, teams[team].color);
  if (totalWallProgress() >= state.wallLimit || activeTeams().every((id) => wallProgress(id) >= wallTarget(id))) beginHeroPlacement();
  else {
    state.wallOwnerTurn = nextWallTeam(team);
    state.activeTeam = state.wallOwnerTurn;
    state.wallBatchStartIndex = state.walls.length;
  }
  render();
}

function autoPlaceCurrentHero() {
  const team = placementTeamAt(state.placeTeamIndex);
  const cell = shuffle(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({ x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) })))
    .find(({ x, y }) => !isCornerFortress(x, y) && zoneOfCell(x, y) === team && !loadoutAt(x, y));
  if (!cell) return;
  const loadout = teamLoadouts(team)[state.placeSetIndex];
  Object.assign(loadout, { ...cell, placed: true });
  logEvent(`${displayName(team)} ran out of placement time. ${loadout.name} was placed automatically.`, teams[team].color);
  state.placeSetIndex += 1;
  if (state.placeSetIndex >= 2) {
    state.placeSetIndex = 0;
    state.placeTeamIndex += 1;
  }
  if (state.loadouts.every((item) => item.placed)) beginBattle();
  render();
}

function handleBattleTimeout() {
  const team = state.activeTeam;
  state.timeoutStrikes[team] = (state.timeoutStrikes[team] || 0) + 1;
  if (state.timeoutStrikes[team] >= 2) {
    state.forfeitHpSnapshots[team] = Object.fromEntries(teamLoadouts(team).map((loadout) => [loadout.id, loadout.currentHp]));
    if (!state.disconnectedTeams.includes(team)) state.disconnectedTeams.push(team);
    teamLoadouts(team).forEach((loadout) => {
      loadout.currentHp = 0;
      loadout.ko = true;
    });
    logEvent(`${displayName(team)} missed a second timed turn and was disconnected.`, teams[team].color);
    window.ArponOnline?.onPlayerForfeit?.(team);
    checkVictory();
    if (state.phase !== "complete") advanceToNextTurn();
    return;
  }
  if (!state.robotTeams.includes(team)) state.robotTeams.push(team);
  if (!state.timedRobotTeams.includes(team)) state.timedRobotTeams.push(team);
  logEvent(`${displayName(team)} ran out of time. A robot will complete this turn; the player gets one final chance next turn.`, teams[team].color);
  render();
}

function phaseLabel() {
  return (
    {
      lobby: "Game Setup",
      draft: "Set Creation",
      walls: "Wall Setup",
      place: "Hero Placement",
      battleRoll: "Movement Roll",
      move: "Spend Movement",
      attack: "Attack",
      retreatRoll: "Retreat Roll",
      retreat: "Retreat",
      done: "Turn Complete",
      complete: "Battle Complete",
    }[state.phase] || state.phase
  );
}

function renderSetupPanel() {
  elements.setupPanel.innerHTML = "";
  if (state.phase === "lobby") {
    elements.setupTitle.textContent = "Prepare Battle";
    elements.setupBadge.textContent = "Set A";
    elements.setupPanel.innerHTML = `<div class="setup-card"><h3>Classic Arena</h3><p>Choose players in the setup window to begin.</p></div>`;
    return;
  }
  if (state.phase === "draft") {
    const team = draftTeamForDevice();
    if (!team) {
      elements.setupTitle.textContent = "Set Creation";
      elements.setupBadge.textContent = "In progress";
      elements.setupPanel.innerHTML = `
        <div class="setup-card">
          <h3>Players are building sets</h3>
          <p>Every online player is choosing their two sets at the same time.</p>
        </div>`;
      return;
    }
    return renderDraftPanel();
  }
  if (state.phase === "walls") {
    const team = state.wallOwnerTurn;
    const total = wallTarget(team);
    const remaining = Math.max(0, state.wallLimit - totalWallProgress());
    const playerRemaining = Math.max(0, total - wallProgress(team));
    const canUndo = canUndoWall();
    elements.setupTitle.textContent = "Defensive Walls";
    elements.setupBadge.textContent = `${remaining} left`;
    elements.setupPanel.innerHTML = `
      <div class="wall-counter-card team-accent" style="--team-color:${teams[team].color}">
        <strong>${remaining}</strong><span>Walls remaining</span>
        <h3>${displayName(team)}</h3>
        <p>${playerRemaining} assigned to this player · place up to 4 this turn</p>
        <button class="secondary-action wall-undo-button" id="undoWallButton" type="button" ${canUndo ? "" : "disabled"}>Undo Last Wall</button>
      </div>`;
    elements.setupPanel.querySelector("#undoWallButton")?.addEventListener("click", undoLastWall);
    return;
  }
  if (state.phase === "place") {
    const team = placementTeamAt(state.placeTeamIndex);
    const loadout = teamLoadouts(team)[state.placeSetIndex];
    elements.setupTitle.textContent = "Place Heroes";
    elements.setupBadge.textContent = `${state.placeSetIndex + 1} / 2`;
    elements.setupPanel.innerHTML = `<div class="setup-card team-accent" style="--team-color:${teams[team].color}"><h3>${displayName(team)}</h3><p>Place ${loadout.name} anywhere inside the ${team} base.</p></div>`;
    return;
  }
  elements.setupTitle.textContent = "Squads";
  elements.setupBadge.textContent = `${activeTeams().length} players`;
  elements.setupPanel.innerHTML = `<div class="setup-card team-accent compact" style="--team-color:${teams[state.activeTeam].color}"><h3>${displayName(state.activeTeam)}</h3><p>${battleHint()}</p></div>`;
}

function renderDraftPanel() {
  const team = draftTeamForDevice();
  const hand = getDraftHand(team);
  const selection = state.draftSelections[team];
  const locked = Boolean(state.draftLocked[team]);
  elements.setupTitle.textContent = "Set Creation";
  elements.setupBadge.textContent = locked ? "Locked" : displayName(team);
  const ready = ["hero", "armor", "weapon"].every((kind) => selection[kind].length === 2);
  elements.setupPanel.innerHTML = `
    <div class="setup-card team-accent" style="--team-color:${teams[team].color}">
      <h3>Best of 3</h3>
      <p>${locked ? "Your sets are locked. Other players may still be choosing." : "Choose two from each row. Selection order builds Set 1 and Set 2; use the swap buttons to change pairings."}</p>
    </div>
    ${["hero", "armor", "weapon"].map((kind) => draftGroup(team, kind, hand[kind], selection[kind], locked)).join("")}
    ${ready ? draftPairing(team) : ""}
    <button class="primary-action" id="confirmDraftButton" type="button" ${ready && !locked ? "" : "disabled"}>${locked ? "Sets Locked" : "Lock Sets"}</button>`;
  elements.setupPanel.querySelectorAll("[data-card-id]").forEach((button) => button.addEventListener("click", () => toggleDraftCard(team, button.dataset.cardKind, button.dataset.cardId)));
  elements.setupPanel.querySelectorAll("[data-swap-kind]").forEach((button) => button.addEventListener("click", () => {
    if (!canLocalControlTeam(team) || state.draftLocked[team]) return;
    state.draftSwaps[team][button.dataset.swapKind] = !state.draftSwaps[team][button.dataset.swapKind];
    render();
  }));
  elements.setupPanel.querySelectorAll("[data-wandelt-set]").forEach((button) => button.addEventListener("click", () => {
    if (!canLocalControlTeam(team) || state.draftLocked[team]) return;
    state.wandeltChoices[`${team}_${button.dataset.wandeltSet}`] = button.dataset.pattern;
    render();
  }));
  elements.setupPanel.querySelector("#confirmDraftButton").addEventListener("click", confirmDraft);
}

function draftGroup(team, kind, hand, selected, locked = false) {
  const plural = kind === "hero" ? "Heroes" : `${titleCase(kind)}s`;
  return `<section class="draft-group"><div class="draft-title"><h3>${plural}</h3><span>${selected.length}/2</span></div><div class="draft-cards">${hand.map((card) => draftCardButton(card, selected.includes(card.id), locked)).join("")}</div></section>`;
}

function draftCardButton(card, selected, locked = false) {
  const stat = card.kind === "armor" ? `${card.hp} HP` : card.kind === "weapon" ? `${card.dp} DP` : card.family;
  return `<article class="draft-card ${selected ? "selected" : ""}">
    <button class="draft-select" data-card-id="${card.id}" data-card-kind="${card.kind}" type="button" ${locked ? "disabled" : ""}>
      <img src="${card.image}" alt="${card.name}" /><span>${card.name}</span><small>${stat}</small>
    </button>
    ${cardZoomButton(card)}
  </article>`;
}

function draftPairing(team) {
  const sets = previewDraftSets(team);
  return `
    <section class="pairing-panel">
      <div class="pairing-head"><h3>Your two sets</h3><div><button data-swap-kind="armor" type="button">Swap Armor</button><button data-swap-kind="weapon" type="button">Swap Weapons</button></div></div>
      <div class="pairing-grid">${sets.map((set, index) => `
        <article class="pairing-set">
          <strong>Set ${index + 1}: ${set.hero.name}</strong>
          <span>${set.armor.name} + ${set.weapon.name}</span>
          ${pairingBonusText(set)}
          ${set.weapon.id === "zanion_w" ? wandeltPicker(team, index + 1) : ""}
        </article>`).join("")}</div>
    </section>`;
}

function pairingBonusText(set) {
  const bonuses = [];
  const armorBonus = matchingArmorBonus(set.hero, set.armor);
  const weaponBonus = matchingWeaponBonusCards(set.hero, set.weapon);
  if (armorBonus) bonuses.push(`Armor match +${armorBonus} HP`);
  if (weaponBonus) bonuses.push(`Weapon match +${weaponBonus} DP`);
  return bonuses.length ? `<em>${bonuses.join(" · ")}</em>` : "";
}

function wandeltPicker(team, setNumber) {
  const key = `${team}_${setNumber}`;
  const choice = state.wandeltChoices[key] || "cross";
  return `<div class="mini-segmented"><span>Wandelt:</span><button class="${choice === "cross" ? "active" : ""}" data-wandelt-set="${setNumber}" data-pattern="cross" type="button">Cross</button><button class="${choice === "diagonal" ? "active" : ""}" data-wandelt-set="${setNumber}" data-pattern="diagonal" type="button">Diagonal</button></div>`;
}

function previewDraftSets(team) {
  const selected = state.draftSelections[team];
  const armorIds = state.draftSwaps[team].armor ? [...selected.armor].reverse() : selected.armor;
  const weaponIds = state.draftSwaps[team].weapon ? [...selected.weapon].reverse() : selected.weapon;
  return [0, 1].map((index) => ({ hero: cardsById[selected.hero[index]], armor: cardsById[armorIds[index]], weapon: cardsById[weaponIds[index]] }));
}

function getDraftHand(team) {
  return Object.fromEntries(Object.entries(state.draftHands[team]).map(([kind, ids]) => [kind, ids.map((id) => cardsById[id])]));
}

function toggleDraftCard(team, kind, cardId) {
  if (!canLocalControlTeam(team) || state.draftLocked[team]) return;
  const selected = state.draftSelections[team][kind];
  if (selected.includes(cardId)) state.draftSelections[team][kind] = selected.filter((id) => id !== cardId);
  else if (selected.length < 2) selected.push(cardId);
  render();
}

function confirmDraft() {
  const team = draftTeamForDevice();
  if (!canLocalControlTeam(team)) return;
  if (!["hero", "armor", "weapon"].every((kind) => state.draftSelections[team][kind].length === 2)) return;
  state.draftLocked[team] = true;
  logEvent(`${displayName(team)} locked two sets.`, teams[team].color);
  if (state.mode === "solo" && allDraftsLocked()) finalizeDraftsAndBeginWalls();
  else if (!window.ArponOnline?.isOnline?.() && state.setupTeamIndex < activeTeams().length - 1) {
    state.setupTeamIndex += 1;
    const next = activeTeams()[state.setupTeamIndex];
    state.activeTeam = next;
    showPass(next, "Your private active-deck deal is ready.");
  } else if (allDraftsLocked()) finalizeDraftsAndBeginWalls();
  render();
}

function draftTeamForDevice() {
  if (state.mode === "solo") return "red";
  if (window.ArponOnline?.isOnline?.()) return window.ArponOnline.getLocalTeam?.() || null;
  return activeTeams()[state.setupTeamIndex] || null;
}

function allDraftsLocked() {
  return activeTeams().every((team) => state.draftLocked[team]);
}

function finalizeDraftsAndBeginWalls() {
  if (!allDraftsLocked() || state.phase !== "draft") return;
  state.loadouts = activeTeams().flatMap((team) =>
    previewDraftSets(team).map((set, index) => createLoadout(team, index + 1, set.hero, set.armor, set.weapon)),
  );
  if (state.mode === "solo") beginSoloArena();
  else beginWallSetup();
}

function createLoadout(team, setNumber, heroCard, armorCard, weaponCard) {
  const maxHp = armorCard.hp + (heroCard.effects.armorHpBonus || 0) + matchingArmorBonus(heroCard, armorCard);
  return {
    id: `${team}_${setNumber}`,
    team,
    setNumber,
    name: heroCard.name,
    hero: heroCard,
    armor: armorCard,
    weapon: weaponCard,
    cosmeticLevels: Object.fromEntries([heroCard, armorCard, weaponCard].map((card) => [card.id, Number(state.playerCosmetics?.[team]?.[card.id] || 0)])),
    chosenPattern: weaponCard.id === "zanion_w" ? state.wandeltChoices[`${team}_${setNumber}`] || "cross" : null,
    maxHp,
    currentHp: maxHp,
    x: -1,
    y: -1,
    placed: false,
    ko: false,
  };
}

function beginWallSetup() {
  const { rolls, winner } = rollSetupOrder();
  state.setupRolls = rolls;
  state.firstTeam = winner;
  state.activeTeam = winner;
  state.wallOwnerTurn = winner;
  state.wallBatchStartIndex = state.walls.length;
  deviceState.selectedSetId = teamLoadouts(winner)[0]?.id || state.loadouts[0]?.id || null;
  logEvent(`Setup roll: ${setupRollSummary()}. ${displayName(winner)} starts.`, teams[winner].color);
  if (state.wallLimit <= 0) {
    logEvent("Wall setup is skipped for this battle.", "#30343b");
    beginHeroPlacement();
    return;
  }
  state.phase = "walls";
  logEvent(`Wall setup begins: ${state.wallLimit} total walls. Each player places four at a time.`, "#30343b");
  showDiceResult("Setup Rolls", activeTeams().map((team) => `${teams[team].short} ${rolls[team]}`).join(" · "));
}

function rollSetupOrder() {
  let rolls;
  let winners;
  do {
    rolls = Object.fromEntries(activeTeams().map((team) => [team, rollDie()]));
    const highest = Math.max(...Object.values(rolls));
    winners = activeTeams().filter((team) => rolls[team] === highest);
  } while (winners.length > 1);
  return { rolls, winner: winners[0] };
}

function setupRollSummary() {
  return activeTeams().map((team) => `${titleCase(team)} ${state.setupRolls[team]}`).join(" · ");
}

function renderBoard() {
  const selected = getSelectedLoadout();
  const highlights = getHighlights(selected);
  elements.board.innerHTML = "";
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.style.setProperty("--x", x);
      cell.style.setProperty("--y", y);
      cell.type = "button";
      cell.setAttribute("aria-label", `Board ${x + 1}, ${y + 1}`);
      const key = posKey(x, y);
      if (isCornerFortress(x, y)) cell.classList.add("corner-fortress");
      if (state.phase === "walls") cell.classList.add("wall-setup-cell");
      if (state.phase === "place" && isLegalHeroPlacement(x, y)) cell.classList.add("place-option");
      if (highlights.move.has(key)) cell.classList.add(state.phase === "retreat" ? "retreat-option" : "move-option");
      if (highlights.attack.has(key)) cell.classList.add("attack-option");
      cell.addEventListener("click", () => onCellClick(x, y));
      elements.board.appendChild(cell);
    }
  }
  if (state.phase === "walls") renderWallSlots();
  renderWalls();
  renderPawns(highlights);
}

function renderWallSlots() {
  for (let y = 1; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) renderWallSlot("h", x, y);
  }
  for (let x = 1; x < BOARD_SIZE; x += 1) {
    for (let y = 0; y < BOARD_SIZE; y += 1) renderWallSlot("v", x, y);
  }
}

function renderWallSlot(axis, x, y) {
  if (!isWallSegmentLegal(axis, x, y, state.wallOwnerTurn)) return;
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = `wall-slot ${axis === "h" ? "horizontal" : "vertical"}`;
  slot.style.setProperty("--x", x);
  slot.style.setProperty("--y", y);
  slot.style.setProperty("--team-color", teams[state.wallOwnerTurn].color);
  slot.setAttribute("aria-label", `Place ${axis === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}`);
  slot.addEventListener("click", (event) => {
    event.stopPropagation();
    placeWallSegment(axis, x, y);
  });
  elements.board.appendChild(slot);
}

function renderWalls() {
  state.walls.forEach((wall) => {
    const el = document.createElement("div");
    el.className = `wall ${wall.axis === "h" ? "horizontal" : "vertical"}`;
    el.style.setProperty("--team-color", teams[wall.owner].color);
    el.style.setProperty("--x", wall.x);
    el.style.setProperty("--y", wall.y);
    elements.board.appendChild(el);
  });
}

function renderPawns(highlights) {
  const selected = getSelectedLoadout();
  state.loadouts.forEach((loadout) => {
    if (!loadout.placed || loadout.ko) return;
    const hpPercent = loadout.maxHp ? Math.max(0, Math.min(100, (loadout.currentHp / loadout.maxHp) * 100)) : 0;
    const pattern = weaponPattern(loadout);
    const attackMark = pattern === "cross" ? "+" : pattern === "diagonal" ? "X" : "+ X";
    const pawn = document.createElement("button");
    pawn.type = "button";
    pawn.className = "pawn";
    pawn.style.setProperty("--x", loadout.x);
    pawn.style.setProperty("--y", loadout.y);
    pawn.style.setProperty("--team-color", teams[loadout.team].color);
    pawn.style.setProperty("--hp", `${hpPercent}%`);
    const animation = state.attackAnimation;
    if (animation?.attackerId === loadout.id) {
      const target = getLoadout(animation.targetId);
      pawn.classList.add("attack-lunge");
      pawn.style.setProperty("--attack-x", `${((target?.x || loadout.x) - loadout.x) * 125}%`);
      pawn.style.setProperty("--attack-y", `${((target?.y || loadout.y) - loadout.y) * 125}%`);
    }
    if (animation?.targetId === loadout.id) pawn.classList.add("attack-hit");
    pawn.classList.toggle("selected", loadout.id === deviceState.selectedSetId);
    pawn.classList.toggle("targetable", selected && selected.team !== loadout.team && highlights.attack.has(posKey(loadout.x, loadout.y)));
    pawn.classList.toggle("inactive", loadout.team !== state.activeTeam);
    pawn.classList.toggle("damage-hit", deviceState.lastHpByLoadout[loadout.id] !== undefined && loadout.currentHp < deviceState.lastHpByLoadout[loadout.id]);
    pawn.title = `${loadout.name}, ${displayName(loadout.team)}, Hero ${loadout.setNumber}`;
    pawn.innerHTML = `
      <span class="pawn-attack">${attackMark}<b>${loadout.weapon.effects.range}</b></span>
      <span class="pawn-portrait cosmetic-tier-${loadout.cosmeticLevels?.[loadout.hero.id] || 0}"><img src="${loadout.hero.tokenImage || loadout.hero.image}" alt="" /></span>
      <span class="pawn-number">${loadout.setNumber}</span>`;
    pawn.addEventListener("click", (event) => {
      event.stopPropagation();
      onPawnClick(loadout.id);
    });
    elements.board.appendChild(pawn);
    deviceState.lastHpByLoadout[loadout.id] = loadout.currentHp;
  });
}

function renderHeroList() {
  elements.heroList.innerHTML = activeTeams()
    .map((team) => `<section class="team-section" style="--team-color:${teams[team].color}"><h2>${displayName(team)}</h2>${teamLoadouts(team).map(loadoutChip).join("")}</section>`)
    .join("");
  elements.heroList.querySelectorAll("[data-loadout-id]").forEach(bindLoadoutChipInteractions);
}

function loadoutChip(loadout) {
  const percent = loadout.maxHp ? Math.max(0, (loadout.currentHp / loadout.maxHp) * 100) : 0;
  const currentHp = Math.max(0, loadout.currentHp);
  return `<button class="hero-chip ${loadout.id === deviceState.selectedSetId ? "selected" : ""} ${loadout.ko ? "ko" : ""}" style="--hp:${percent}%;--team-color:${teams[loadout.team].color}" data-loadout-id="${loadout.id}" type="button" aria-label="View ${loadout.name}, Hero ${loadout.setNumber}, ${currentHp} of ${loadout.maxHp} HP">
    <span class="hero-number">${loadout.setNumber}</span>
    <span class="chip-portrait cosmetic-tier-${loadout.cosmeticLevels?.[loadout.hero.id] || 0}"><img src="${loadout.hero.tokenImage || loadout.hero.image}" alt="" /></span>
    <span class="chip-meta">
      <span class="chip-title"><strong>${loadout.name}</strong><span class="chip-health-number">${currentHp}<small> / ${loadout.maxHp} HP</small></span></span>
      <i class="chip-health-bar"><b></b></i>
      <small class="chip-hold-hint">Hold to inspect set</small>
    </span>
  </button>`;
}

function bindLoadoutChipInteractions(button) {
  button.addEventListener("click", (event) => {
    if (deviceState.suppressNextSetClick) {
      event.preventDefault();
      deviceState.suppressNextSetClick = false;
      return;
    }
    selectLoadout(button.dataset.loadoutId);
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearTimeout(deviceState.setPreviewTimer);
    button.setPointerCapture?.(event.pointerId);
    deviceState.setPreviewTimer = setTimeout(() => {
      deviceState.suppressNextSetClick = true;
      openSetPreview(button.dataset.loadoutId);
    }, 280);
  });
  const release = () => {
    clearTimeout(deviceState.setPreviewTimer);
    deviceState.setPreviewTimer = null;
    if (deviceState.setPreviewId) {
      closeSetPreview();
      setTimeout(() => {
        deviceState.suppressNextSetClick = false;
      }, 0);
    }
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
}

function openSetPreview(loadoutId) {
  const loadout = getLoadout(loadoutId);
  if (!loadout) return;
  deviceState.setPreviewId = loadoutId;
  renderSetPreview();
}

function closeSetPreview() {
  clearTimeout(deviceState.setPreviewTimer);
  deviceState.setPreviewTimer = null;
  deviceState.setPreviewId = null;
  if (elements.setPreviewModal) elements.setPreviewModal.hidden = true;
}

function renderSetPreview() {
  if (!elements.setPreviewModal) return;
  const loadout = getLoadout(deviceState.setPreviewId);
  if (!loadout) {
    elements.setPreviewModal.hidden = true;
    return;
  }
  elements.setPreviewModal.style.setProperty("--preview-color", teams[loadout.team].color);
  elements.setPreviewTitle.textContent = `${displayName(loadout.team)} · Hero ${loadout.setNumber}: ${loadout.name}`;
  elements.setPreviewCards.innerHTML = [loadout.hero, loadout.armor, loadout.weapon]
    .map((card) => `<article class="cosmetic-tier-${loadout.cosmeticLevels?.[card.id] || 0}"><img src="${card.image}" alt="${card.name}" /><strong>${card.name}</strong><span>${card.ability}: ${card.text}</span></article>`)
    .join("");
  elements.setPreviewModal.hidden = false;
}

function renderSelectedPanel() {
  const loadout = getSelectedLoadout();
  if (!loadout) {
    elements.selectedCard.innerHTML = `<div class="empty-panel">Select a Hero to inspect its complete set.</div>`;
    return;
  }
  elements.selectedCard.style.setProperty("--selected-color", teams[loadout.team].color);
  const armorMatch = loadout.hero.family === loadout.armor.family;
  const weaponMatch = loadout.hero.family === loadout.weapon.family;
  elements.selectedCard.innerHTML = `
    <div class="selected-head"><div class="card-media cosmetic-tier-${loadout.cosmeticLevels?.[loadout.hero.id] || 0}"><img src="${loadout.hero.image}" alt="${loadout.name}" />${cardZoomButton(loadout.hero)}</div><div><span class="player-label">${displayName(loadout.team)} · Hero ${loadout.setNumber}</span><h2>${loadout.name}</h2><div class="stat-row"><strong>${Math.max(0, loadout.currentHp)} HP</strong><strong>${baseAttack(loadout)} DP</strong><strong>${titleCase(weaponPattern(loadout))} ${loadout.weapon.effects.range}</strong>${armorMatch ? "<strong>Armor Match +100 HP</strong>" : ""}${weaponMatch ? `<strong>Weapon Match +${matchingWeaponBonus(loadout)} DP</strong>` : ""}</div></div></div>
    <p><strong>${loadout.hero.ability}:</strong> ${loadout.hero.text}</p>`;
}

function renderCards() {
  const loadout = getSelectedLoadout();
  if (!loadout) {
    elements.cardStack.innerHTML = "";
    return;
  }
  elements.cardStack.innerHTML = [loadout.hero, loadout.armor, loadout.weapon].map((card) => {
    const stat = card.kind === "armor" ? `${card.hp} HP` : card.kind === "weapon" ? `${card.dp} DP` : card.family;
    return `<article class="loadout-card cosmetic-tier-${loadout.cosmeticLevels?.[card.id] || 0}"><div class="card-media"><img src="${card.image}" alt="${card.name}" />${cardZoomButton(card)}</div><div><span>${titleCase(card.kind)} · ${stat}</span><h3>${card.name}</h3><p><strong>${card.ability}:</strong> ${card.text}</p></div></article>`;
  }).join("");
}

function renderLog() {
  elements.battleLog.innerHTML = [...state.log].reverse().map((entry) => `<li style="--log-color:${entry.color}"><time>${entry.turn}</time>${entry.text}</li>`).join("");
}

function onCellClick(x, y) {
  if (state.phase === "walls") return;
  if (state.phase === "place") return placeHero(x, y);
  const selected = getSelectedLoadout();
  if (!selected || selected.ko || selected.team !== state.activeTeam) return;
  const target = loadoutAt(x, y);
  if (target && target.team !== selected.team && canAttack(selected, target)) return attackLoadout(selected, target);
  const move = getHighlights(selected).move.get(posKey(x, y));
  if (move && (!target || target.id === selected.id)) {
    if (["move", "retreat"].includes(state.phase) && move.returnMove) requestStayConfirmation(selected, move);
    else if (state.phase === "move" && move.fullSteps && move.fullSteps > move.steps) requestMoveSpendChoice(selected, move);
    else moveLoadoutTo(selected, move);
  }
}

function requestStayConfirmation(loadout, move) {
  deviceState.pendingStayMove = { loadoutId: loadout.id, move };
  elements.stayConfirmMessage.textContent = state.phase === "retreat"
    ? `${loadout.name} can stay here instead of retreating. Are you sure?`
    : `${loadout.name} can spend the full ${move.steps}-step route and return here. Are you sure you do not want to move to another square?`;
  elements.stayConfirmModal.style.setProperty("--team-color", teams[loadout.team].color);
  elements.stayConfirmModal.hidden = false;
}

function resolveStayConfirmation(confirmStay) {
  const pending = deviceState.pendingStayMove;
  deviceState.pendingStayMove = null;
  elements.stayConfirmModal.hidden = true;
  if (!confirmStay || !pending) return;
  const loadout = getLoadout(pending.loadoutId);
  if (!loadout || !["move", "retreat"].includes(state.phase)) return;
  moveLoadoutTo(loadout, pending.move);
}

function requestMoveSpendChoice(loadout, move) {
  deviceState.pendingMoveChoice = { loadoutId: loadout.id, move };
  const keep = Math.max(0, state.movementLeft - Math.max(0, move.steps - (state.moveBonusUsed.includes(loadout.id) ? 0 : (loadout.hero.effects.moveBonus || 0))));
  elements.moveChoiceMessage.textContent = `This square is ${move.steps} steps away, but a legal ${move.fullSteps}-step route also reaches it. Keep ${keep} movement to split between Heroes, or spend the full route and begin attacking.`;
  elements.keepMovementButton.textContent = `Move ${move.steps} · Keep ${keep}`;
  elements.finishMovementButton.textContent = `Move ${move.fullSteps} · Attack`;
  elements.moveChoiceModal.style.setProperty("--team-color", teams[loadout.team].color);
  elements.moveChoiceModal.hidden = false;
}

function resolveMoveSpendChoice(finishMovement) {
  const pending = deviceState.pendingMoveChoice;
  deviceState.pendingMoveChoice = null;
  elements.moveChoiceModal.hidden = true;
  if (!pending) return;
  const loadout = getLoadout(pending.loadoutId);
  if (!loadout || state.phase !== "move") return;
  moveLoadoutTo(loadout, finishMovement ? { ...pending.move, steps: pending.move.fullSteps } : pending.move);
}

function closeMoveSpendChoice() {
  elements.moveChoiceModal.hidden = true;
}

function onPawnClick(loadoutId) {
  const clicked = getLoadout(loadoutId);
  const selected = getSelectedLoadout();
  if (!clicked || clicked.ko) return;
  if (selected && clicked.team !== selected.team && canAttack(selected, clicked)) return attackLoadout(selected, clicked);
  if (selected && clicked.id === selected.id) {
    const move = getHighlights(selected).move.get(posKey(clicked.x, clicked.y));
    if (move) {
      if (["move", "retreat"].includes(state.phase) && move.returnMove) requestStayConfirmation(selected, move);
      else if (state.phase === "move" && move.fullSteps && move.fullSteps > move.steps) requestMoveSpendChoice(selected, move);
      else moveLoadoutTo(selected, move);
      return;
    }
  }
  selectLoadout(loadoutId);
}

function placeWallSegment(axis, x, y) {
  const team = state.wallOwnerTurn;
  if (!canLocalControlTeam(team)) return;
  if (!isWallSegmentLegal(axis, x, y, team)) return;
  state.walls.push({ axis, x, y, owner: team });
  state.wallCounts[team] += 1;
  window.ArponAudio?.play("wall");
  logEvent(`${displayName(team)} placed wall ${state.wallCounts[team]} of ${wallTarget(team)}.`, teams[team].color);
  if (totalWallProgress() >= state.wallLimit || activeTeams().every((id) => wallProgress(id) >= wallTarget(id))) {
    beginHeroPlacement();
  } else {
    const nextTeam = shouldPassWallTurn(team) ? nextWallTeam(team) : team;
    if (nextTeam !== team) state.wallBatchStartIndex = state.walls.length;
    state.wallOwnerTurn = nextTeam;
    state.activeTeam = state.wallOwnerTurn;
  }
  render();
}

function canUndoWall() {
  const last = state.walls[state.walls.length - 1];
  return state.phase === "walls"
    && canLocalControlTeam(state.wallOwnerTurn)
    && state.walls.length > Number(state.wallBatchStartIndex || 0)
    && last?.owner === state.wallOwnerTurn;
}

function undoLastWall() {
  if (!canUndoWall()) return;
  const wall = state.walls.pop();
  state.wallCounts[wall.owner] = Math.max(0, (state.wallCounts[wall.owner] || 0) - 1);
  window.ArponAudio?.play("select");
  logEvent(`${displayName(wall.owner)} removed the last wall.`, teams[wall.owner].color);
  render();
}

function shouldPassWallTurn(team) {
  return wallProgress(team) >= wallTarget(team) || wallProgress(team) % WALLS_PER_SETUP_TURN === 0;
}

function nextWallTeam(currentTeam) {
  let index = activeTeams().indexOf(currentTeam);
  for (let i = 0; i < activeTeams().length; i += 1) {
    index = (index + 1) % activeTeams().length;
    if (wallProgress(activeTeams()[index]) < wallTarget(activeTeams()[index])) return activeTeams()[index];
  }
  return currentTeam;
}

function beginHeroPlacement() {
  state.phase = "place";
  state.activeTeam = state.firstTeam;
  state.placeTeamIndex = 0;
  state.placeSetIndex = 0;
  logEvent("Wall setup is complete. Put each Hero in its base.", "#30343b");
}

function placeHero(x, y) {
  if (!isLegalHeroPlacement(x, y)) return;
  const team = placementTeamAt(state.placeTeamIndex);
  if (!canLocalControlTeam(team)) return;
  const loadout = teamLoadouts(team)[state.placeSetIndex];
  Object.assign(loadout, { x, y, placed: true });
  deviceState.selectedSetId = loadout.id;
  logEvent(`${displayName(team)} placed ${loadout.name}.`, teams[team].color);
  state.placeSetIndex += 1;
  if (state.placeSetIndex >= 2) {
    state.placeSetIndex = 0;
    state.placeTeamIndex += 1;
  }
  if (state.loadouts.every((item) => item.placed)) beginBattle();
  render();
}

function beginBattle() {
  state.phase = "battleRoll";
  state.activeTeam = state.firstTeam;
  state.turnNumber = 1;
  deviceState.selectedSetId = teamLoadouts(state.firstTeam)[0]?.id || null;
  logEvent(`Battle begins. ${displayName(state.firstTeam)} rolls first.`, teams[state.firstTeam].color);
  if (state.mode !== "solo") showPass(state.firstTeam, "The battle begins. Roll once, then split movement between your Heroes.");
}

function placementTeamAt(index) {
  if (!activeTeams().length) return null;
  const start = activeTeams().indexOf(state.firstTeam || activeTeams()[0]);
  return activeTeams()[(start + index) % activeTeams().length];
}

function rollForPhase() {
  if (!["battleRoll", "retreatRoll"].includes(state.phase)) return;
  if (!canLocalControlTeam(state.activeTeam)) return;
  const rolledPhase = state.phase;
  deviceState.rollActionLock = { turnNumber: state.turnNumber, phase: state.phase, retreatHeroId: state.retreatHeroId };
  const result = rollDie();
  state.dice = result;
  showDiceResult(rolledPhase === "battleRoll" ? "Movement Roll" : `${getLoadout(state.retreatHeroId)?.name || "Hero"} Retreat`, result, () => {
    if (rolledPhase === "battleRoll") beginMovement(result);
    else beginRetreatMove(result);
  }, state.activeTeam);
}

function beginMovement(result) {
  deviceState.rollActionLock = null;
  state.hasRolled = true;
  state.movementLeft = result;
  state.movedHeroIds = [];
  state.moveBonusUsed = [];
  state.attackedPairs = [];
  state.attackingHeroIds = [];
  state.retreatQueue = [];
  state.retreatPenalties = {};
  state.phase = "move";
  logEvent(`${displayName(state.activeTeam)} rolled ${result} for movement. Spend every step before attacking.`, teams[state.activeTeam].color);
  advanceToAttackIfMovementBlocked();
  render();
}

function beginRetreatMove(result) {
  deviceState.rollActionLock = null;
  const retreating = getLoadout(state.retreatHeroId);
  const penalty = state.retreatPenalties[state.retreatHeroId] || 0;
  state.retreatSteps = Math.max(0, result + (retreating?.hero.effects.retreatBonus || 0) - penalty);
  state.phase = retreating && !retreating.ko && state.retreatSteps > 0 ? "retreat" : "done";
  logEvent(`${retreating?.name || "Hero"} rolled ${result} and may retreat ${state.retreatSteps} spaces.`, teams[state.activeTeam].color);
  if (state.phase === "done") finishCurrentRetreat();
  else render();
}

function moveLoadoutTo(loadout, move) {
  if (!canLocalControlTeam(loadout.team)) return;
  if (state.phase === "retreat") {
    loadout.x = move.x;
    loadout.y = move.y;
    logEvent(`${loadout.name} retreated ${move.steps} spaces.`, teams[loadout.team].color);
    state.retreatSteps = 0;
    finishCurrentRetreat();
    return;
  }
  if (state.phase !== "move") return;
  const bonus = state.moveBonusUsed.includes(loadout.id) ? 0 : (loadout.hero.effects.moveBonus || 0);
  const available = state.movementLeft + bonus;
  if (move.steps > available) return;
  if (bonus) state.moveBonusUsed.push(loadout.id);
  loadout.x = move.x;
  loadout.y = move.y;
  const sharedStepsUsed = Math.max(0, move.steps - bonus);
  state.movementLeft = Math.max(0, state.movementLeft - sharedStepsUsed);
  if (!state.movedHeroIds.includes(loadout.id)) state.movedHeroIds.push(loadout.id);
  logEvent(`${loadout.name} advanced ${move.steps} spaces; ${state.movementLeft} movement remains.`, teams[loadout.team].color);
  if (state.movementLeft === 0) {
    state.phase = "attack";
    logEvent("Movement complete. Each Hero may attack every reachable enemy once.", teams[state.activeTeam].color);
    if (remainingAttackPairs().length === 0) {
      beginRetreats();
      return;
    }
  } else advanceToAttackIfMovementBlocked();
  render();
}

function advanceToAttackIfMovementBlocked() {
  if (state.phase !== "move" || state.movementLeft <= 0) return;
  const canMove = teamLoadouts(state.activeTeam)
    .filter((loadout) => !loadout.ko)
    .some((loadout) => {
      const bonus = state.moveBonusUsed.includes(loadout.id) ? 0 : (loadout.hero.effects.moveBonus || 0);
      return getReachableCells(loadout.x, loadout.y, state.movementLeft + bonus, loadout.id, true).length > 0;
    });
  if (!canMove) {
    logEvent(`No legal path remained for the final ${state.movementLeft} movement.`, teams[state.activeTeam].color);
    state.movementLeft = 0;
    state.phase = "attack";
    if (remainingAttackPairs().length === 0) beginRetreats();
  }
}

function attackLoadout(attacker, target) {
  if (!canLocalControlTeam(attacker.team)) return;
  if (!canAttack(attacker, target) || state.pendingAttack) return;
  state.pendingAttack = { attackerId: attacker.id, targetId: target.id };
  window.ArponAudio?.play("attack");
  const normalRange = Math.max(0, attacker.weapon.effects.range - (target.hero.effects.enemyRangeReduce || 0));
  const needsRangeRoll = Boolean(attacker.weapon.effects.rangeRollBonus) && lineDistance(attacker, target) > normalRange;
  const attackRule = attacker.weapon.effects.rollBonus || (needsRangeRoll ? attacker.weapon.effects.rangeRollBonus : null);
  if (attackRule) {
    requestAbilityRoll(
      attacker.team,
      `${attacker.name}: ${attacker.weapon.ability}`,
      attackRollMessage(attacker.weapon, attackRule),
      { kind: "attack", attackerId: attacker.id, targetId: target.id },
    );
  } else continueAttackAfterAttackRoll(attacker.id, target.id, null);
}

function continueAttackAfterAttackRoll(attackerId, targetId, attackRoll) {
  const attacker = getLoadout(attackerId);
  const target = getLoadout(targetId);
  if (!attacker || !target || attacker.ko || target.ko) return finalizeAttackPair(attacker, target, "Attack could not be completed.");
  const actualRange = attackRangeAgainst(attacker, target, attackRoll);
  if (lineDistance(attacker, target) > actualRange) return finalizeAttackPair(attacker, target, `${target.name} was outside the final range.`);
  const dodge = target.armor.effects.dodgeBackOnRoll ? { escaped: false } : tryDodge(target, attacker, actualRange);
  if (dodge.escaped) return finalizeAttackPair(attacker, target, `${target.name} used ${target.armor.ability} and escaped.`);
  const defenseRule = target.armor.effects.reduceOnRoll || target.armor.effects.enemyRetreatPenaltyOnRoll
    || target.armor.effects.blockAllOnRoll || target.armor.effects.dodgeBackOnRoll;
  if (defenseRule) {
    requestAbilityRoll(
      target.team,
      `${target.name}: ${target.armor.ability}`,
      defenseRollMessage(target.armor, defenseRule),
      { kind: "defense", attackerId: attacker.id, targetId: target.id, attackRoll },
    );
  } else applyResolvedAttack(attacker.id, target.id, attackRoll, null);
}

function applyResolvedAttack(attackerId, targetId, attackRoll, defenseRoll) {
  const attacker = getLoadout(attackerId);
  const target = getLoadout(targetId);
  if (!attacker || !target) return;
  const dodge = tryDodge(target, attacker, attackRangeAgainst(attacker, target, attackRoll), defenseRoll);
  if (dodge.escaped) return finalizeAttackPair(attacker, target, `${target.name} used ${target.armor.ability} and escaped.`);
  state.attackAnimation = { attackerId, targetId, token: crypto.randomUUID() };
  window.ArponAudio?.play("attack");
  render();
  setTimeout(() => resolveAttackDamage(attackerId, targetId, attackRoll, defenseRoll), 330);
}

function resolveAttackDamage(attackerId, targetId, attackRoll, defenseRoll) {
  const attacker = getLoadout(attackerId);
  const target = getLoadout(targetId);
  if (!attacker || !target) return;
  state.attackAnimation = null;
  const distance = lineDistance(attacker, target);
  const report = calculateDamage(attacker, target, attackRoll, defenseRoll, distance);
  target.currentHp = Math.max(0, target.currentHp - report.damage);
  if (report.damage > 0) window.ArponAudio?.play("damage");
  if (target.currentHp <= 0) target.ko = true;
  if (report.reflected > 0) {
    attacker.currentHp = Math.max(0, attacker.currentHp - report.reflected);
    if (attacker.currentHp <= 0) attacker.ko = true;
  }
  const penaltyRule = target.armor.effects.enemyRetreatPenaltyOnRoll;
  const retreatPenalty = penaltyRule && rollMatches(defenseRoll, penaltyRule) ? penaltyRule.amount : 0;
  if (retreatPenalty) {
    state.retreatPenalties[attacker.id] = Math.max(state.retreatPenalties[attacker.id] || 0, retreatPenalty);
    report.notes.push(`${target.armor.ability} reduces retreat by ${retreatPenalty}`);
  }
  showAttackReceipt(attacker, target, attackRoll, defenseRoll, report, distance);
  const outcome = target.ko ? `${target.name} is knocked out.` : `${target.name}: ${target.currentHp} HP.`;
  finalizeAttackPair(attacker, target, `${target.name} took ${report.damage} DP. ${outcome} ${report.notes.join(" · ")}`, true);
}

function finalizeAttackPair(attacker, target, summary, receiptShown = false) {
  if (attacker && target) {
    const key = attackPairKey(attacker, target);
    if (!state.attackedPairs.includes(key)) state.attackedPairs.push(key);
    if (!state.attackingHeroIds.includes(attacker.id)) state.attackingHeroIds.push(attacker.id);
    logEvent(`${attacker.name} attacked ${target.name}. ${summary}`, teams[attacker.team].color);
    if (!receiptShown) showAttackOutcomeReceipt(attacker, target, summary);
  }
  state.pendingAttack = null;
  checkVictory();
  if (state.phase !== "complete" && remainingAttackPairs().length === 0) beginRetreats();
  else render();
}

function remainingAttackPairs() {
  if (state.phase !== "attack") return [];
  return teamLoadouts(state.activeTeam)
    .filter((attacker) => !attacker.ko)
    .flatMap((attacker) => getAttackTargets(attacker, true)
      .filter((target) => !state.attackedPairs.includes(attackPairKey(attacker, target)))
      .map((target) => ({ attacker, target })));
}

function beginRetreats() {
  state.retreatQueue = state.attackingHeroIds.filter((id) => !getLoadout(id)?.ko);
  if (!state.retreatQueue.length) {
    completeTurnAutomatically();
    return;
  }
  state.retreatHeroId = state.retreatQueue.shift();
  deviceState.selectedSetId = state.retreatHeroId;
  state.phase = "retreatRoll";
  state.dice = null;
  state.retreatSteps = 0;
  render();
}

function finishCurrentRetreat() {
  state.retreatSteps = 0;
  if (state.retreatQueue.length) {
    state.retreatHeroId = state.retreatQueue.shift();
    deviceState.selectedSetId = state.retreatHeroId;
    state.phase = "retreatRoll";
    state.dice = null;
  } else {
    state.retreatHeroId = null;
    completeTurnAutomatically();
    return;
  }
  render();
}

function calculateDamage(attacker, target, attackRoll, defenseRoll, distance) {
  const notes = [];
  let damage = attacker.weapon.dp;
  const heroWeaponBonus = attacker.hero.effects.weaponDpBonus || 0;
  if (heroWeaponBonus) {
    damage += heroWeaponBonus;
    notes.push(`${attacker.hero.ability} +${heroWeaponBonus}`);
  }
  const matching = attacker.hero.family === attacker.weapon.family ? matchingWeaponBonus(attacker) : 0;
  if (matching) {
    damage += matching;
    notes.push(`matching weapon +${matching}`);
  }
  const heroHpBonus = attacker.hero.effects.attackIfHpAbove;
  if (heroHpBonus && attacker.currentHp >= heroHpBonus.min) {
    damage += heroHpBonus.amount;
    notes.push(`${attacker.hero.ability} +${heroHpBonus.amount}`);
  }
  const heroClose = attacker.hero.effects.closeAttackBonus;
  if (heroClose && distance <= heroClose.max) {
    damage += heroClose.amount;
    notes.push(`${attacker.hero.ability} +${heroClose.amount}`);
  }
  const weaponHpBonus = attacker.weapon.effects.attackIfHpAbove;
  if (weaponHpBonus && attacker.currentHp >= weaponHpBonus.min) {
    damage += weaponHpBonus.amount;
    notes.push(`${attacker.weapon.ability} +${weaponHpBonus.amount}`);
  }
  addWeaponBonuses(attacker.weapon.effects, target, distance, attackRoll, notes, (amount) => {
    damage += amount;
  });
  let reduction = (target.hero.effects.incomingReduce || 0) + (target.armor.effects.incomingReduce || 0);
  const threshold = target.armor.effects.reduceIfAttackAbove;
  if (threshold && damage > threshold.min) reduction += threshold.amount;
  const distanceThreshold = target.armor.effects.reduceIfDistanceAbove;
  if (distanceThreshold && distance >= distanceThreshold.min) reduction += distanceThreshold.amount;
  const rollDefense = target.armor.effects.reduceOnRoll;
  if (rollDefense && rollMatches(defenseRoll, rollDefense)) reduction += rollDefense.amount;
  const blockAll = target.armor.effects.blockAllOnRoll;
  if (blockAll && rollMatches(defenseRoll, blockAll)) {
    reduction += damage;
    notes.push(`${target.armor.ability} blocked all damage`);
  }
  const reflected = Math.min(damage, target.armor.effects.reflect || 0);
  if (reflected) {
    reduction += reflected;
    notes.push(`${target.armor.ability} blocked and reflected ${reflected}`);
  }
  if (reduction && !reflected) notes.push(`defense -${reduction}`);
  return { damage: Math.max(0, damage - reduction), rawDamage: damage, reduction: Math.min(damage, reduction), reflected, notes };
}

function addWeaponBonuses(effects, target, distance, roll, notes, add) {
  if (effects.closeBonus && distance <= effects.closeBonus.max) {
    add(effects.closeBonus.amount);
    notes.push(`close range +${effects.closeBonus.amount}`);
  }
  if (effects.targetHpAboveBonus && target.currentHp >= effects.targetHpAboveBonus.min) {
    add(effects.targetHpAboveBonus.amount);
    notes.push(`target HP +${effects.targetHpAboveBonus.amount}`);
  }
  if (effects.rollBonus && rollMatches(roll, effects.rollBonus)) {
    add(effects.rollBonus.amount);
    notes.push(`attack roll +${effects.rollBonus.amount}`);
  }
  (effects.distanceBands || []).forEach((band) => {
    if (distance >= band.min && distance <= band.max) {
      add(band.amount);
      notes.push(`distance bonus +${band.amount}`);
    }
  });
}

function tryDodge(target, attacker, actualRange, defenseRoll = null) {
  const rolledDodge = target.armor.effects.dodgeBackOnRoll;
  const steps = target.armor.effects.dodgeBack || (rolledDodge && rollMatches(defenseRoll, rolledDodge) ? rolledDodge.amount : 0);
  if (!steps) return { escaped: false };
  const dx = Math.sign(target.x - attacker.x);
  const dy = Math.sign(target.y - attacker.y);
  for (let i = 0; i < steps; i += 1) {
    const nx = target.x + dx;
    const ny = target.y + dy;
    if (!inBounds(nx, ny) || loadoutAt(nx, ny) || isStepBlocked(target.x, target.y, nx, ny, false)) break;
    target.x = nx;
    target.y = ny;
  }
  return { escaped: lineDistance(attacker, target) > actualRange || !sameAttackLine(attacker, target, weaponPattern(attacker)) };
}

function getHighlights(loadout) {
  const move = new Map();
  const attack = new Set();
  if (!loadout || loadout.ko || loadout.team !== state.activeTeam) return { move, attack };
  if (state.phase === "move" && state.movementLeft > 0) {
    const bonus = state.moveBonusUsed.includes(loadout.id) ? 0 : (loadout.hero.effects.moveBonus || 0);
    const maxSteps = state.movementLeft + bonus;
    getReachableCells(loadout.x, loadout.y, maxSteps, loadout.id, true).forEach((position) => move.set(posKey(position.x, position.y), position));
  }
  if (state.phase === "retreat" && loadout.id === state.retreatHeroId) {
    getReachableCells(loadout.x, loadout.y, state.retreatSteps, loadout.id, true).forEach((position) => move.set(posKey(position.x, position.y), position));
  }
  if (state.phase === "attack") {
    getAttackTargets(loadout, true)
      .filter((target) => !state.attackedPairs.includes(attackPairKey(loadout, target)))
      .forEach((target) => attack.add(posKey(target.x, target.y)));
  }
  return { move, attack };
}

function getReachableCells(startX, startY, distance, movingId, includeReturn = false) {
  if (distance <= 0) return [];
  const shortest = shortestReachableCells(startX, startY, distance, movingId);
  const exact = exactReachableKeys(startX, startY, distance, movingId);
  const startKey = posKey(startX, startY);
  const keys = new Set([...shortest.keys(), ...exact]);
  if (!includeReturn) keys.delete(startKey);
  return [...keys]
    .filter((key) => key !== startKey || exact.has(key))
    .map((key) => {
      const [x, y] = key.split(",").map(Number);
      const exactRoute = exact.has(key);
      return {
        x,
        y,
        steps: key === startKey ? distance : shortest.get(key),
        exactRoute,
        fullSteps: exactRoute && shortest.has(key) && shortest.get(key) < distance ? distance : null,
        returnMove: key === startKey,
      };
    })
    .filter((position) => Number.isFinite(position.steps));
}

function shortestReachableCells(startX, startY, distance, movingId) {
  const queue = [{ x: startX, y: startY, steps: 0 }];
  const visited = new Map([[posKey(startX, startY), 0]]);
  while (queue.length) {
    const current = queue.shift();
    if (current.steps === distance) continue;
    for (const direction of directionsForPattern("all")) {
      const nx = current.x + direction.x;
      const ny = current.y + direction.y;
      const key = posKey(nx, ny);
      if (!inBounds(nx, ny) || isCornerFortress(nx, ny) || visited.has(key) || isStepBlocked(current.x, current.y, nx, ny, false)) continue;
      const occupant = loadoutAt(nx, ny);
      if (occupant && occupant.id !== movingId) continue;
      const steps = current.steps + 1;
      visited.set(key, steps);
      queue.push({ x: nx, y: ny, steps });
    }
  }
  visited.delete(posKey(startX, startY));
  return visited;
}

function exactReachableKeys(startX, startY, distance, movingId) {
  let positions = new Set([posKey(startX, startY)]);
  for (let step = 0; step < distance; step += 1) {
    const next = new Set();
    positions.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      directionsForPattern("all").forEach((direction) => {
        const nx = x + direction.x;
        const ny = y + direction.y;
        if (!inBounds(nx, ny) || isCornerFortress(nx, ny) || isStepBlocked(x, y, nx, ny, false)) return;
        const occupant = loadoutAt(nx, ny);
        if (occupant && occupant.id !== movingId) return;
        next.add(posKey(nx, ny));
      });
    });
    positions = next;
  }
  return positions;
}

function attackPairKey(attacker, target) {
  return `${attacker.id}->${target.id}`;
}

function requestAbilityRoll(team, title, message, action) {
  state.pendingRoll = { ...action, rollId: crypto.randomUUID(), team, title, message };
  render();
}

function resolvePendingRoll(pending, roll) {
  if (pending.kind === "attack") continueAttackAfterAttackRoll(pending.attackerId, pending.targetId, roll);
  if (pending.kind === "defense") applyResolvedAttack(pending.attackerId, pending.targetId, pending.attackRoll, roll);
}

function renderPendingRoll() {
  const pending = state.pendingRoll;
  if (!pending || deviceState.resolvedAbilityRollKey === abilityRollKey(pending)) {
    elements.rollPromptModal.hidden = true;
    return;
  }
  deviceState.resolvedAbilityRollKey = null;
  elements.rollPromptTitle.textContent = pending.title;
  elements.rollPromptMessage.textContent = pending.message;
  elements.rollPromptModal.style.setProperty("--ability-color", teams[pending.team]?.color || teams.red.color);
  const canRoll = canLocalControlTeam(pending.team);
  elements.abilityRollButton.disabled = !canRoll;
  elements.abilityRollButton.textContent = canRoll ? "Roll D6" : `Waiting for ${displayName(pending.team)}`;
  elements.rollPromptModal.hidden = false;
}

function abilityRollKey(pending) {
  if (!pending) return "";
  return pending.rollId || [pending.kind, pending.team, pending.attackerId || "", pending.targetId || "", pending.title || ""].join(":");
}

function showDiceResult(label, value, callback, team = null) {
  const token = crypto.randomUUID();
  state.sharedDiceResult = { token, label, value, team, expiresAt: Date.now() + 1300 };
  displaySharedDiceResult(state.sharedDiceResult);
  render();
  setTimeout(() => {
    if (callback) callback();
  }, 1000);
}

function renderSharedDiceResult() {
  const result = state.sharedDiceResult;
  if (!result || Number(result.expiresAt) <= Date.now() || deviceState.lastDiceResultToken === result.token) return;
  displaySharedDiceResult(result);
}

function displaySharedDiceResult(result) {
  deviceState.lastDiceResultToken = result.token;
  const { label, value, team } = result;
  elements.diceResultLabel.textContent = label;
  clearInterval(deviceState.diceAnimationTimer);
  window.ArponAudio?.play("dice");
  if (typeof value === "number") {
    elements.diceResultValue.textContent = "1";
    deviceState.diceAnimationTimer = setInterval(() => {
      elements.diceResultValue.textContent = String(rollDie());
    }, 75);
    setTimeout(() => {
      clearInterval(deviceState.diceAnimationTimer);
      elements.diceResultValue.textContent = value;
    }, 560);
  } else {
    elements.diceResultValue.textContent = value;
  }
  elements.diceResultOverlay.style.setProperty("--result-color", teams[team]?.color || teams[state.activeTeam]?.color || teams.red.color);
  elements.diceResultOverlay.classList.toggle("multi", String(value).length > 1);
  elements.diceResultOverlay.hidden = false;
  setTimeout(() => {
    elements.diceResultOverlay.hidden = true;
    elements.diceResultOverlay.classList.remove("multi");
  }, 1000);
}

function showAttackReceipt(attacker, target, attackRoll, defenseRoll, report, distance) {
  const attackRollText = attackRoll == null ? "" : ` <em>(rolled a ${attackRoll})</em>`;
  const defenseRollText = defenseRoll == null ? "" : ` <em>(rolled a ${defenseRoll})</em>`;
  const defenseDetail = report.reduction > 0 ? `-${report.reduction} DP` : "No DP blocked";
  const reflection = report.reflected > 0
    ? `<div class="receipt-row" style="--receipt-color:${teams[target.team].color}"><strong>${titleCase(target.team)}</strong><span>${escapeHtml(target.armor.ability)} reflected ${report.reflected} DP</span></div>`
    : "";
  const notes = report.notes.length
    ? `<div class="receipt-notes">${report.notes.map((note) => escapeHtml(note)).join(" / ")}</div>`
    : "";
  showReceipt(`
    <div class="receipt-row" style="--receipt-color:${teams[attacker.team].color}">
      <strong>${titleCase(attacker.team)}</strong><span>${escapeHtml(attacker.weapon.name)} - +${report.rawDamage} DP${attackRollText}</span>
    </div>
    <div class="receipt-row" style="--receipt-color:${teams[target.team].color}">
      <strong>${titleCase(target.team)}</strong><span>${escapeHtml(target.armor.name)} - ${defenseDetail}${defenseRollText} <em>(${distance} spaces away)</em></span>
    </div>
    ${reflection}
    ${notes}
    <div class="receipt-total"><strong>${report.damage} DP dealt</strong></div>
  `);
}

function showAttackOutcomeReceipt(attacker, target, summary) {
  showReceipt(`
    <div class="receipt-row" style="--receipt-color:${teams[attacker.team].color}">
      <strong>${titleCase(attacker.team)}</strong><span>${escapeHtml(attacker.weapon.name)} attacked ${escapeHtml(target.name)}</span>
    </div>
    <div class="receipt-total"><strong>${escapeHtml(summary)}</strong></div>
  `);
}

function showReceipt(content) {
  clearTimeout(state.receiptTimer);
  state.receiptId = crypto.randomUUID();
  state.receiptContent = `<button class="receipt-close" type="button" aria-label="Close attack receipt">X</button>${content}`;
  state.receiptExpiresAt = Date.now() + 20000;
  deviceState.dismissedReceiptId = null;
  elements.attackReceipt.innerHTML = state.receiptContent;
  elements.attackReceipt.hidden = false;
  state.receiptTimer = setTimeout(() => hideAttackReceipt(false), 20000);
}

function hideAttackReceipt(clearState = true) {
  clearTimeout(state.receiptTimer);
  state.receiptTimer = null;
  if (clearState) {
    state.receiptContent = "";
    state.receiptExpiresAt = 0;
  }
  if (elements.attackReceipt) elements.attackReceipt.hidden = true;
}

function restoreAttackReceipt() {
  const remaining = Number(state.receiptExpiresAt || 0) - Date.now();
  if (!state.receiptContent || remaining <= 0 || deviceState.dismissedReceiptId === state.receiptId) {
    hideAttackReceipt(false);
    return;
  }
  clearTimeout(state.receiptTimer);
  elements.attackReceipt.innerHTML = state.receiptContent;
  elements.attackReceipt.hidden = false;
  state.receiptTimer = setTimeout(() => hideAttackReceipt(false), remaining);
}

function dismissAttackReceipt() {
  deviceState.dismissedReceiptId = state.receiptId;
  hideAttackReceipt(false);
}

function attackRollMessage(weaponCard, rule) {
  if (weaponCard.effects.rangeRollBonus) return `Need ${rollRequirementText(rule)} for +${rule.amount} range.`;
  return `Need ${rollRequirementText(rule)} for +${rule.amount} DP.`;
}

function defenseRollMessage(armorCard, rule) {
  if (armorCard.effects.blockAllOnRoll) return `Need ${rollRequirementText(rule)} to block all damage.`;
  if (armorCard.effects.dodgeBackOnRoll) return `Need ${rollRequirementText(rule)} to step ${rule.amount} space${rule.amount === 1 ? "" : "s"} back before damage.`;
  if (armorCard.effects.enemyRetreatPenaltyOnRoll) return `Need ${rollRequirementText(rule)} to reduce the attacker's retreat by ${rule.amount}.`;
  return `Need ${rollRequirementText(rule)} to reduce this attack by ${rule.amount} DP.`;
}

function rollRequirementText(rule) {
  if (rule.values) return rule.values.join(" or ");
  if (rule.odd) return "an odd number";
  if (rule.even) return "an even number";
  if (rule.min && rule.max) return `${rule.min}-${rule.max}`;
  if (rule.min) return `${rule.min}-6`;
  if (rule.max) return `1-${rule.max}`;
  return "the required result";
}

function getAttackTargets(attacker, potential = false) {
  const targets = [];
  const range = potential ? potentialAttackRange(attacker) : attacker.weapon.effects.range;
  const throughWalls = canAttackThroughWalls(attacker);
  for (const direction of directionsForPattern(weaponPattern(attacker))) {
    for (let step = 1; step <= range; step += 1) {
      const x = attacker.x + direction.x * step;
      const y = attacker.y + direction.y * step;
      if (!inBounds(x, y) || isCornerFortress(x, y)) break;
      const px = attacker.x + direction.x * (step - 1);
      const py = attacker.y + direction.y * (step - 1);
      if (isStepBlocked(px, py, x, y, throughWalls)) break;
      const occupant = loadoutAt(x, y);
      if (!occupant) continue;
      if (occupant.team !== attacker.team && step <= potentialAttackRangeAgainst(attacker, occupant)) targets.push(occupant);
      break;
    }
  }
  return targets;
}

function canAttack(attacker, target) {
  if (!attacker || !target || attacker.ko || target.ko || attacker.team === target.team || state.phase !== "attack" || attacker.team !== state.activeTeam || state.pendingAttack) return false;
  if (state.attackedPairs.includes(attackPairKey(attacker, target))) return false;
  return getAttackTargets(attacker, true).some((item) => item.id === target.id);
}

function weaponPattern(loadout) {
  return loadout.weapon.effects.pattern === "choice" ? loadout.chosenPattern || "cross" : loadout.weapon.effects.pattern;
}

function potentialAttackRange(loadout) {
  return Math.min(MAX_RANGE, loadout.weapon.effects.range + (loadout.weapon.effects.rangeRollBonus?.amount || 0));
}

function potentialAttackRangeAgainst(attacker, target) {
  return Math.max(0, potentialAttackRange(attacker) - (target.hero.effects.enemyRangeReduce || 0));
}

function attackRangeAgainst(attacker, target, attackRoll) {
  let range = attacker.weapon.effects.range;
  const bonus = attacker.weapon.effects.rangeRollBonus;
  if (bonus && rollMatches(attackRoll, bonus)) range += bonus.amount;
  return Math.max(0, range - (target.hero.effects.enemyRangeReduce || 0));
}

function canAttackThroughWalls(loadout) {
  return Boolean(loadout.weapon.effects.throughWalls || (loadout.weapon.effects.hpThroughWalls && loadout.currentHp >= loadout.weapon.effects.hpThroughWalls.min));
}

function sameAttackLine(attacker, target, pattern) {
  const dx = Math.abs(attacker.x - target.x);
  const dy = Math.abs(attacker.y - target.y);
  return pattern === "cross" ? dx === 0 || dy === 0 : pattern === "diagonal" ? dx === dy : dx === 0 || dy === 0 || dx === dy;
}

function directionsForPattern(pattern) {
  const cross = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const diagonal = [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];
  return pattern === "cross" ? cross : pattern === "diagonal" ? diagonal : [...cross, ...diagonal];
}

function wallExists(wall) {
  return state.walls.some((item) => item.axis === wall.axis && item.x === wall.x && item.y === wall.y);
}

function isWallSegmentLegal(axis, x, y, team) {
  const wall = { axis, x, y };
  if (wallExists(wall)) return false;
  const adjacent = adjacentCellsForWall(axis, x, y);
  if (!adjacent.every((cell) => inBounds(cell.x, cell.y) && !isCornerFortress(cell.x, cell.y))) return false;
  const occupiedEnemyBases = activeTeams().filter((item) => item !== team);
  const zones = adjacent.map((cell) => zoneOfCell(cell.x, cell.y));
  return !zones.some((zone) => occupiedEnemyBases.includes(zone));
}

function adjacentCellsForWall(axis, x, y) {
  return axis === "h" ? [{ x, y: y - 1 }, { x, y }] : [{ x: x - 1, y }, { x, y }];
}

function isStepBlocked(x1, y1, x2, y2, ignoreWalls) {
  if (isCornerFortress(x1, y1) || isCornerFortress(x2, y2)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return true;
  if (dx !== 0 && dy !== 0) {
    const horizontalCorner = { x: x1 + dx, y: y1 };
    const verticalCorner = { x: x1, y: y1 + dy };
    const horizontalFirst = routeAroundCornerOpen(
      [{ x: x1, y: y1 }, horizontalCorner, { x: x2, y: y2 }],
      ignoreWalls,
    );
    const verticalFirst = routeAroundCornerOpen(
      [{ x: x1, y: y1 }, verticalCorner, { x: x2, y: y2 }],
      ignoreWalls,
    );
    return !horizontalFirst && !verticalFirst;
  }
  if (ignoreWalls) return false;
  return isBlocked(x1, y1, x2, y2);
}

function routeAroundCornerOpen(route, ignoreWalls) {
  if (route.some((point) => isCornerFortress(point.x, point.y))) return false;
  if (ignoreWalls) return true;
  return !isBlocked(route[0].x, route[0].y, route[1].x, route[1].y)
    && !isBlocked(route[1].x, route[1].y, route[2].x, route[2].y);
}

function isBlocked(x1, y1, x2, y2) {
  if (x2 === x1 + 1) return wallExists({ axis: "v", x: x1 + 1, y: y1 });
  if (x2 === x1 - 1) return wallExists({ axis: "v", x: x1, y: y1 });
  if (y2 === y1 + 1) return wallExists({ axis: "h", x: x1, y: y1 + 1 });
  if (y2 === y1 - 1) return wallExists({ axis: "h", x: x1, y: y1 });
  return false;
}

function isLegalHeroPlacement(x, y) {
  return !isCornerFortress(x, y) && zoneOfCell(x, y) === placementTeamAt(state.placeTeamIndex) && !loadoutAt(x, y);
}

function zoneOfCell(x, y) {
  if (isCornerFortress(x, y)) return "fortress";
  if (x <= 2 && y >= 3 && y <= 10) return "red";
  if (y <= 2 && x >= 3 && x <= 10) return "green";
  if (x >= 11 && y >= 3 && y <= 10) return "yellow";
  if (y >= 11 && x >= 3 && x <= 10) return "blue";
  if (x >= 3 && x <= 10 && y >= 3 && y <= 10) return "neutral";
  if (x <= 2 && y <= 2) return x + y < 3 ? "red" : "green";
  if (x >= 11 && y <= 2) return x - 11 > y ? "yellow" : "green";
  if (x <= 2 && y >= 11) return x < y - 11 ? "red" : "blue";
  if (x >= 11 && y >= 11) return x - 11 > 13 - y ? "yellow" : "blue";
  return "neutral";
}

function isCornerFortress(x, y) {
  const horizontalCorner = x <= 2 || x >= BOARD_SIZE - 3;
  const verticalCorner = y <= 2 || y >= BOARD_SIZE - 3;
  return horizontalCorner && verticalCorner;
}

function endTurn() {
  if (!canLocalControlTeam(state.activeTeam)) return;
  if (state.pendingAttack || state.pendingRoll) return;
  if (state.phase === "attack") {
    beginRetreats();
    return;
  }
  if (["retreatRoll", "retreat"].includes(state.phase)) {
    const retreating = getLoadout(state.retreatHeroId);
    if (retreating) logEvent(`${retreating.name} stayed in place.`, teams[state.activeTeam].color);
    finishCurrentRetreat();
    return;
  }
  if (state.phase !== "done") return;
  advanceToNextTurn();
}

function completeTurnAutomatically() {
  if (state.phase === "complete") return;
  state.phase = "done";
  state.turnEndNotice = {
    token: crypto.randomUUID(),
    team: state.activeTeam,
    turnNumber: state.turnNumber,
    expiresAt: Date.now() + 3000,
  };
  window.ArponAudio?.play("turnEnd");
  clearTimeout(deviceState.automaticTurnTimer);
  render();
  if (!canLocalControlTeam(state.activeTeam)) return;
  const endingTeam = state.activeTeam;
  const endingTurn = state.turnNumber;
  deviceState.automaticTurnTimer = setTimeout(() => {
    if (state.phase !== "done" || state.activeTeam !== endingTeam || state.turnNumber !== endingTurn) return;
    advanceToNextTurn();
  }, 1150);
}

function advanceToNextTurn() {
  clearTimeout(deviceState.automaticTurnTimer);
  deviceState.automaticTurnTimer = null;
  deviceState.dismissedTurnEndNoticeToken = state.turnEndNotice?.token || null;
  if (state.turnNumber >= state.turnLimit) {
    finishByHealth();
    return;
  }
  const completedTeam = state.activeTeam;
  if (state.timedRobotTeams.includes(completedTeam)) {
    state.timedRobotTeams = state.timedRobotTeams.filter((team) => team !== completedTeam);
    state.robotTeams = state.robotTeams.filter((team) => team !== completedTeam);
  }
  state.turnNumber += 1;
  state.activeTeam = nextLivingTeam(completedTeam);
  state.phase = "battleRoll";
  state.dice = null;
  state.movementLeft = 0;
  state.hasRolled = false;
  state.movedHeroIds = [];
  state.moveBonusUsed = [];
  state.attackedPairs = [];
  state.attackingHeroIds = [];
  state.retreatQueue = [];
  state.retreatHeroId = null;
  state.retreatPenalties = {};
  state.retreatSteps = 0;
  state.pendingAttack = null;
  deviceState.selectedSetId = teamLoadouts(state.activeTeam).find((loadout) => !loadout.ko)?.id || null;
  logEvent(`${displayName(state.activeTeam)} takes the turn.`, teams[state.activeTeam].color);
  window.ArponAudio?.play("turnStart");
  if (state.mode !== "solo") showPass(state.activeTeam, "Roll once, then split movement between your Heroes.");
  render();
}

function checkVictory() {
  const alive = activeTeams().filter((team) => teamLoadouts(team).some((loadout) => !loadout.ko));
  if (alive.length === 1) {
    finishGame(alive, "Last squad standing");
  }
}

function finishByHealth() {
  const scores = teamHealthScores();
  const highest = Math.max(...Object.values(scores));
  const winners = activeTeams().filter((team) => scores[team] === highest);
  finishGame(winners, `Turn ${state.turnLimit} complete - highest combined HP`);
}

function finishGame(winners, reason) {
  state.phase = "complete";
  state.pendingAttack = null;
  state.pendingRoll = null;
  state.victory = { winners, reason };
  window.ArponAudio?.play("victory");
  elements.passModal.hidden = true;
  elements.rollPromptModal.hidden = true;
  hideAttackReceipt();
  renderVictory();
  logEvent(`${elements.victoryTitle.textContent} ${reason}.`, winners.length === 1 ? teams[winners[0]].color : "#e7c64a");
  window.ArponOnline?.onGameComplete?.({ matchId: state.matchId, mode: state.mode, ranked: state.ranked, winners });
  render();
}

function renderVictory() {
  if (state.phase !== "complete" || !state.victory) {
    elements.victoryModal.hidden = true;
    return;
  }
  const { winners, reason } = state.victory;
  const winnerColor = winners.length === 1 ? teams[winners[0]].color : "#e7c64a";
  const winnerNames = winners.map((team) => titleCase(team));
  elements.victoryModal.style.setProperty("--winner-color", winnerColor);
  elements.victoryReason.textContent = reason;
  elements.victoryTitle.textContent = winners.length === 1 ? `${winnerNames[0]} Wins!` : `${winnerNames.join(" & ")} Tie!`;
  const scores = teamHealthScores();
  elements.victoryScores.innerHTML = activeTeams()
    .map((team) => `<div style="--score-color:${teams[team].color}"><span>${titleCase(team)}</span><strong>${scores[team]} HP</strong></div>`)
    .join("");
  elements.victoryModal.hidden = false;
}

function teamHealthScores() {
  return Object.fromEntries(activeTeams().map((team) => [
    team,
    teamLoadouts(team).reduce((sum, loadout) => sum + Math.max(0, loadout.currentHp), 0),
  ]));
}

function nextLivingTeam(currentTeam) {
  let index = activeTeams().indexOf(currentTeam);
  for (let i = 0; i < activeTeams().length; i += 1) {
    index = (index + 1) % activeTeams().length;
    const team = activeTeams()[index];
    if (teamLoadouts(team).some((loadout) => !loadout.ko)) return team;
  }
  return currentTeam;
}

function showPass(team, message) {
  if (window.ArponOnline?.isOnline?.() || state.mode === "solo") {
    elements.passModal.hidden = true;
    return;
  }
  elements.passTitle.textContent = displayName(team);
  elements.passMessage.textContent = message;
  elements.passEmblem.textContent = teams[team].short;
  elements.passEmblem.style.setProperty("--team-color", teams[team].color);
  elements.passModal.hidden = false;
}

function ensureSelected() {
  if (deviceState.selectedSetId && getLoadout(deviceState.selectedSetId)) return;
  deviceState.selectedSetId = state.loadouts.find((loadout) => !loadout.ko)?.id || null;
}

function selectLoadout(id) {
  const loadout = getLoadout(id);
  if (loadout) {
    deviceState.selectedSetId = id;
    window.ArponAudio?.play("select");
    render(false);
  }
}

function getSelectedLoadout() {
  return getLoadout(deviceState.selectedSetId);
}

function getLoadout(id) {
  return state.loadouts.find((loadout) => loadout.id === id);
}

function teamLoadouts(team) {
  return state.loadouts.filter((loadout) => loadout.team === team);
}

function loadoutAt(x, y) {
  return state.loadouts.find((loadout) => loadout.placed && !loadout.ko && loadout.x === x && loadout.y === y);
}

function baseAttack(loadout) {
  return loadout.weapon.dp + (loadout.hero.effects.weaponDpBonus || 0) + (loadout.hero.family === loadout.weapon.family ? matchingWeaponBonus(loadout) : 0);
}

function matchingWeaponBonus(loadout) {
  return matchingWeaponBonusCards(loadout.hero, loadout.weapon);
}

function matchingArmorBonus(heroCard, armorCard) {
  return heroCard.family === armorCard.family ? 100 : 0;
}

function matchingWeaponBonusCards(heroCard, weaponCard) {
  if (heroCard.family !== weaponCard.family) return 0;
  return heroCard.effects.flamarSwordBonus && weaponCard.id === "flamar_w" ? 300 : 100;
}

function lineDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function posKey(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

function rollMatches(roll, rule) {
  if (roll == null) return false;
  if (rule.values && !rule.values.includes(roll)) return false;
  if (rule.min && roll < rule.min) return false;
  if (rule.max && roll > rule.max) return false;
  if (rule.odd && roll % 2 !== 1) return false;
  if (rule.even && roll % 2 !== 0) return false;
  return true;
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function displayName(team) {
  return state.playerNames[team] || teams[team].name;
}

function canLocalControlTeam(team) {
  if (state.robotTeams.includes(team)) return deviceState.robotActing;
  return window.ArponOnline?.canControlTeam?.(team) ?? true;
}

function scheduleRobotAction() {
  const canRunRobot = state.mode === "solo" || (state.mode === "online" && window.ArponOnline?.isHost?.());
  if (!canRunRobot || state.phase === "complete" || deviceState.robotActing || deviceState.robotTimer) return;
  const pendingRobot = state.pendingRoll && state.robotTeams.includes(state.pendingRoll.team);
  const activeRobot = state.robotTeams.includes(state.activeTeam) && !["lobby", "draft", "walls", "place"].includes(state.phase);
  if (!pendingRobot && !activeRobot) return;
  deviceState.robotTimer = setTimeout(() => {
    deviceState.robotTimer = null;
    runRobotAction();
  }, 2700);
}

function runRobotAction() {
  if (!(state.mode === "solo" || (state.mode === "online" && window.ArponOnline?.isHost?.()))) return;
  deviceState.robotActing = true;
  try {
    if (state.pendingRoll && state.robotTeams.includes(state.pendingRoll.team)) {
      rollPendingAbility();
      return;
    }
    if (!state.robotTeams.includes(state.activeTeam)) return;
    if (["battleRoll", "retreatRoll"].includes(state.phase)) {
      rollForPhase();
      return;
    }
    if (state.phase === "move") {
      robotMove();
      return;
    }
    if (state.phase === "attack") {
      const choices = remainingAttackPairs().sort((a, b) => a.target.currentHp - b.target.currentHp);
      if (choices.length) attackLoadout(choices[0].attacker, choices[0].target);
      else endTurn();
      return;
    }
    if (state.phase === "retreat") {
      robotRetreat();
      return;
    }
    if (state.phase === "done") endTurn();
  } finally {
    deviceState.robotActing = false;
    scheduleRobotAction();
  }
}

function robotMove() {
  const enemies = state.loadouts.filter((item) => item.placed && !item.ko && item.team !== state.activeTeam);
  const options = teamLoadouts(state.activeTeam)
    .filter((loadout) => !loadout.ko)
    .flatMap((loadout) => {
      const bonus = state.moveBonusUsed.includes(loadout.id) ? 0 : (loadout.hero.effects.moveBonus || 0);
      return getReachableCells(loadout.x, loadout.y, state.movementLeft + bonus, loadout.id, true).map((move) => {
        const old = { x: loadout.x, y: loadout.y };
        Object.assign(loadout, move);
        const attacks = getAttackTargets(loadout, true).filter((target) => target.team !== loadout.team).length;
        const threats = countThreatsAt(loadout, enemies);
        Object.assign(loadout, old);
        const nearest = Math.min(...enemies.map((enemy) => lineDistance(move, enemy)));
        return { loadout, move, attacks, threats, nearest };
      });
    });
  if (!options.length) {
    state.movementLeft = 0;
    state.phase = "attack";
    render();
    return;
  }
  options.sort((a, b) => b.attacks - a.attacks || a.threats - b.threats || a.nearest - b.nearest || b.move.steps - a.move.steps);
  moveLoadoutTo(options[0].loadout, options[0].move);
}

function robotRetreat() {
  const retreating = getLoadout(state.retreatHeroId);
  if (!retreating) return finishCurrentRetreat();
  const enemies = state.loadouts.filter((item) => item.placed && !item.ko && item.team !== retreating.team);
  const options = getReachableCells(retreating.x, retreating.y, state.retreatSteps, retreating.id, true);
  options.sort((a, b) => {
    const old = { x: retreating.x, y: retreating.y };
    Object.assign(retreating, a);
    const aThreats = countThreatsAt(retreating, enemies);
    Object.assign(retreating, b);
    const bThreats = countThreatsAt(retreating, enemies);
    Object.assign(retreating, old);
    const aDistance = Math.min(...enemies.map((enemy) => lineDistance(a, enemy)));
    const bDistance = Math.min(...enemies.map((enemy) => lineDistance(b, enemy)));
    return aThreats - bThreats || bDistance - aDistance;
  });
  if (options.length) moveLoadoutTo(retreating, options[0]);
  else endTurn();
}

function countThreatsAt(loadout, enemies) {
  return enemies.reduce((count, enemy) => count + (getAttackTargets(enemy, true).some((target) => target.id === loadout.id) ? 1 : 0), 0);
}

function teamsForPlayerCount(count) {
  return count === 2 ? ["red", "yellow"] : count === 3 ? ["red", "green", "yellow"] : [...teamOrder];
}

function exportGameState() {
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.receiptTimer = null;
  return snapshot;
}

function replaceGameState(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  const wasComplete = state.phase === "complete";
  const selectedSetId = deviceState.selectedSetId;
  Object.assign(state, snapshot, {
    receiptTimer: null,
  });
  const localTeam = window.ArponOnline?.getLocalTeam?.();
  if (localTeam && state.disconnectedTeams?.includes(localTeam) && !deviceState.disconnectPromptShown) {
    deviceState.disconnectPromptShown = true;
    document.querySelector("#robotContinuationModal").hidden = false;
  }
  deviceState.selectedSetId = selectedSetId;
  state.loadouts = (state.loadouts || []).map((loadout) => ({
    ...loadout,
    hero: cardsById[loadout.hero?.id] || loadout.hero,
    armor: cardsById[loadout.armor?.id] || loadout.armor,
    weapon: cardsById[loadout.weapon?.id] || loadout.weapon,
  }));
  elements.passModal.hidden = true;
  restoreAttackReceipt();
  if (!wasComplete && state.phase === "complete" && state.victory) {
    window.ArponOnline?.onGameComplete?.({ matchId: state.matchId, mode: state.mode, ranked: state.ranked, winners: state.victory.winners });
  }
  render();
}

function startOnlineGame(players, turnLimit = null, wallLimit = DEFAULT_WALL_LIMIT, ranked = false, matchId = null, timerEnabled = true) {
  const playerTeams = teamsForPlayerCount(players.length);
  state.playerCount = players.length;
  state.playerTeams = playerTeams;
  state.playerNames = Object.fromEntries(teamOrder.map((team) => [team, teams[team].name]));
  state.playerDecks = {};
  state.playerCosmetics = {};
  players.forEach((player, index) => {
    state.playerNames[playerTeams[index]] = player.display_name || `Player ${index + 1}`;
    if (Array.isArray(player.active_deck) && player.active_deck.length) state.playerDecks[playerTeams[index]] = player.active_deck;
    if (player.cosmetics && typeof player.cosmetics === "object") state.playerCosmetics[playerTeams[index]] = player.cosmetics;
  });
  state.mode = "online";
  state.matchId = matchId || crypto.randomUUID();
  state.ranked = Boolean(ranked);
  state.timerEnabled = Boolean(timerEnabled);
  state.robotTeams = [];
  state.turnLimit = Number(turnLimit) || defaultTurnLimit(players.length);
  state.wallLimit = Number.isFinite(Number(wallLimit)) ? Number(wallLimit) : DEFAULT_WALL_LIMIT;
  deviceState.turnLimitCustomized = false;
  startGame();
}

function continueDisconnectedBattle() {
  const localTeam = window.ArponOnline?.getLocalTeam?.();
  if (!localTeam) return;
  Object.entries(state.forfeitHpSnapshots?.[localTeam] || {}).forEach(([id, hp]) => {
    const loadout = getLoadout(id);
    if (loadout) {
      loadout.currentHp = hp;
      loadout.ko = hp <= 0;
    }
  });
  state.mode = "solo-continuation";
  state.matchId = crypto.randomUUID();
  state.ranked = false;
  state.timerEnabled = false;
  state.timer = null;
  state.disconnectedTeams = [];
  state.forfeitHpSnapshots = {};
  state.victory = null;
  state.phase = "battleRoll";
  state.activeTeam = localTeam;
  state.robotTeams = activeTeams().filter((team) => team !== localTeam);
  state.playerNames[localTeam] = "You";
  state.robotTeams.forEach((team, index) => { state.playerNames[team] = `Robot ${index + 1}`; });
  state.hasRolled = false;
  state.dice = null;
  state.movementLeft = 0;
  document.querySelector("#robotContinuationModal").hidden = true;
  window.ArponOnline?.continueLocally?.();
  render();
}

function reconcileOnlineState() {
  if (state.phase === "draft" && allDraftsLocked() && window.ArponOnline?.isHost?.()) {
    finalizeDraftsAndBeginWalls();
    render();
    return true;
  }
  return false;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function logEvent(text, color = "#167ec4") {
  state.log.push({ text, color, turn: phaseLabel() });
  if (state.log.length > 60) state.log.shift();
}

function battleHint() {
  if (state.phase === "draft") return "Private set creation is in progress.";
  if (state.phase === "walls") return `${displayName(state.wallOwnerTurn)} places four walls before passing setup.`;
  if (state.phase === "place") return "Place the highlighted Hero in its base.";
  if (state.phase === "battleRoll") return "Roll once for movement.";
  if (state.phase === "move") return `Spend all ${state.movementLeft} remaining steps. Select either Hero to split movement.`;
  if (state.phase === "attack") return "Select either Hero and attack each outlined enemy once.";
  if (state.phase === "retreatRoll") return `Roll retreat for ${getLoadout(state.retreatHeroId)?.name || "this Hero"}.`;
  if (state.phase === "retreat") return `Choose where ${getLoadout(state.retreatHeroId)?.name || "this Hero"} retreats, or click its square to stay.`;
  if (state.phase === "done") return "Turn ended.";
  if (state.phase === "complete") return "The battle is complete.";
  return "Configure players to begin.";
}

function boardRotation(team) {
  return ({ red: "-90deg", green: "180deg", yellow: "90deg", blue: "0deg" })[team] || "0deg";
}

function boardCounterRotation(team) {
  return ({ red: "90deg", green: "180deg", yellow: "-90deg", blue: "0deg" })[team] || "0deg";
}

elements.rollButton.addEventListener("click", rollForPhase);
elements.centerRollButton.addEventListener("click", rollForPhase);
elements.muteButton.addEventListener("click", () => {
  window.ArponAudio?.toggle();
  renderAudioButton();
});
elements.squadDrawerButton.addEventListener("click", () => {
  const open = document.body.classList.toggle("squad-drawer-open");
  elements.squadDrawerButton.setAttribute("aria-expanded", String(open));
});
elements.resetButton.addEventListener("click", resetToLobby);
elements.startGameButton.addEventListener("click", startGame);
elements.turnLimitInput.addEventListener("input", () => {
  deviceState.turnLimitCustomized = true;
  state.turnLimit = Number(elements.turnLimitInput.value);
  elements.turnLimitValue.textContent = `${state.turnLimit} turns`;
});
elements.wallLimitInput.addEventListener("input", () => {
  state.wallLimit = Number(elements.wallLimitInput.value);
  elements.wallLimitValue.textContent = `${state.wallLimit} walls`;
});
document.querySelectorAll(".solo-count-button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".solo-count-button").forEach((item) => item.classList.toggle("active", item === button));
  const count = Number(button.dataset.soloEnemies);
  if (!deviceState.turnLimitCustomized) {
    elements.soloTurnLimitInput.value = defaultTurnLimit(count + 1);
    elements.soloTurnLimitValue.textContent = `${elements.soloTurnLimitInput.value} turns`;
  }
}));
elements.soloTurnLimitInput.addEventListener("input", () => {
  elements.soloTurnLimitValue.textContent = `${elements.soloTurnLimitInput.value} turns`;
});
elements.soloWallLimitInput.addEventListener("input", () => {
  elements.soloWallLimitValue.textContent = `${elements.soloWallLimitInput.value} walls`;
});
elements.startSoloButton.addEventListener("click", () => {
  const enemyCount = Number(document.querySelector(".solo-count-button.active")?.dataset.soloEnemies || 1);
  startSoloGame(enemyCount, Number(elements.soloWallLimitInput.value), Number(elements.soloTurnLimitInput.value));
});
elements.homeButton.addEventListener("click", resetToLobby);
document.querySelector("#continueRobotButton")?.addEventListener("click", continueDisconnectedBattle);
document.querySelector("#leaveDisconnectedButton")?.addEventListener("click", resetToLobby);
elements.passButton.addEventListener("click", () => {
  elements.passModal.hidden = true;
});
elements.rulesButton.addEventListener("click", () => {
  elements.rulesModal.hidden = false;
});
elements.closeRulesButton.addEventListener("click", () => {
  elements.rulesModal.hidden = true;
});
elements.closeCardZoomButton.addEventListener("click", closeCardZoom);
elements.cardZoomModal.addEventListener("click", (event) => {
  if (event.target === elements.cardZoomModal) closeCardZoom();
});
document.addEventListener("click", (event) => {
  const receiptClose = event.target.closest(".receipt-close");
  if (receiptClose) {
    dismissAttackReceipt();
    return;
  }
  const zoomButton = event.target.closest("[data-card-zoom]");
  if (!zoomButton) return;
  event.preventDefault();
  event.stopPropagation();
  openCardZoom(zoomButton.dataset.cardZoom);
});
document.querySelectorAll(".count-button").forEach((button) => button.addEventListener("click", () => setPlayerCount(Number(button.dataset.count))));
elements.abilityRollButton.addEventListener("click", rollPendingAbility);
elements.keepMovementButton.addEventListener("click", () => resolveMoveSpendChoice(false));
elements.finishMovementButton.addEventListener("click", () => resolveMoveSpendChoice(true));
elements.closeMoveChoiceButton.addEventListener("click", closeMoveSpendChoice);
elements.cancelStayButton.addEventListener("click", () => resolveStayConfirmation(false));
elements.confirmStayButton.addEventListener("click", () => resolveStayConfirmation(true));
elements.closeSetPreviewButton.addEventListener("click", closeSetPreview);
elements.setPreviewModal.addEventListener("pointerup", closeSetPreview);
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${button.dataset.tab}Panel`));
}));

// A small public surface keeps the authoritative state/action boundary ready for networking later.
window.ArponGame = {
  getState: exportGameState,
  replaceState: replaceGameState,
  reconcileOnlineState,
  startOnlineGame,
  cards,
  actions: { startGame, startSoloGame, rollForPhase, endTurn, placeWallSegment, placeHero, attackLoadout, moveLoadoutTo },
  inspect: { getReachableCells, isStepBlocked, getAttackTargets },
};

function cardZoomButton(card) {
  return `<button class="card-zoom-button" data-card-zoom="${card.id}" type="button" aria-label="View ${card.name} full screen"><span class="magnifier-icon" aria-hidden="true"></span></button>`;
}

function openCardZoom(cardId) {
  const card = cardsById[cardId];
  if (!card) return;
  elements.cardZoomTitle.textContent = card.name;
  elements.cardZoomImage.src = card.image;
  elements.cardZoomImage.alt = card.name;
  elements.cardZoomModal.hidden = false;
}

function closeCardZoom() {
  elements.cardZoomModal.hidden = true;
  elements.cardZoomImage.src = "";
}

resetToLobby();
