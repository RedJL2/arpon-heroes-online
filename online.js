const SUPABASE_URL = "https://gfktqgtizctecrypnfan.supabase.co";
const SUPABASE_KEY = "sb_publishable_l3b8UIl2LwcPf9w2NUchgg_FMGIoa4J";
const POLL_INTERVAL = 1400;

const onlineElements = Object.fromEntries(
  [
    "lobbyModal", "homeMenuPanel", "localSetupPanel", "privateSetupPanel", "openLocalButton", "openPrivateButton", "findMatchButton",
    "homeRulesButton", "rulesModal", "onlinePlayerName", "createRoomButton", "roomCodeInput", "joinRoomButton", "privateMessage",
    "onlineRoomModal", "onlineRoomEyebrow", "onlineRoomTitle", "onlineRoomStatus", "onlineCountdown", "onlineCountdownValue",
    "onlinePlayerList", "startOnlineRoomButton", "cancelOnlineButton", "turnLimitInput",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

const teamNames = ["Red", "Green", "Blue", "Yellow"];
const teamKeys = ["red", "green", "blue", "yellow"];
const teamColors = { red: "#b71f24", green: "#16844e", blue: "#184fa8", yellow: "#d1a900" };
const session = {
  active: false,
  applyingRemote: false,
  gameId: null,
  localTeam: null,
  mode: null,
  pollTimer: null,
  pollBusy: false,
  pushTimer: null,
  revision: 0,
  room: null,
  started: false,
  token: sessionStorage.getItem("arpon-player-token") || crypto.randomUUID(),
  lastStateHash: "",
};
sessionStorage.setItem("arpon-player-token", session.token);

function playerName() {
  const entered = onlineElements.onlinePlayerName.value.trim();
  return entered || localStorage.getItem("arpon-player-name") || "Player";
}

function rememberPlayerName() {
  const name = playerName().slice(0, 22);
  onlineElements.onlinePlayerName.value = name;
  localStorage.setItem("arpon-player-name", name);
  return name;
}

async function rpc(name, parameters = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parameters),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message = payload?.message || payload?.hint || payload?.details || `Online request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

function showHomePanel(panel) {
  onlineElements.homeMenuPanel.hidden = panel !== "menu";
  onlineElements.localSetupPanel.hidden = panel !== "local";
  onlineElements.privateSetupPanel.hidden = panel !== "private";
  onlineElements.lobbyModal.hidden = false;
}

function showPrivateMessage(message, error = false) {
  onlineElements.privateMessage.textContent = message;
  onlineElements.privateMessage.classList.toggle("error", error);
}

function setupErrorMessage(error) {
  const raw = String(error?.message || error || "");
  if (/function .* does not exist|schema cache|not found/i.test(raw)) {
    return "Online setup is not installed yet. Run supabase-setup.sql in the Supabase SQL Editor, then try again.";
  }
  return raw || "Could not connect to the online room.";
}

function setOnlineBusy(message) {
  onlineElements.onlineRoomModal.hidden = false;
  onlineElements.onlineRoomEyebrow.textContent = "Connecting";
  onlineElements.onlineRoomTitle.textContent = "Online Battle";
  onlineElements.onlineRoomStatus.textContent = message;
  onlineElements.onlineCountdown.hidden = true;
  onlineElements.onlinePlayerList.innerHTML = "";
  onlineElements.startOnlineRoomButton.hidden = true;
}

function playerTeams(count) {
  return count === 2 ? ["red", "yellow"] : count === 3 ? ["red", "green", "yellow"] : [...teamKeys];
}

function localPlayer(room = session.room) {
  return room?.players?.find((player) => player.id === room.you_id);
}

function assignLocalTeam(room) {
  const you = localPlayer(room);
  if (!you) return null;
  const playerIndex = room.players.findIndex((player) => player.id === you.id);
  return playerTeams(room.players.length)[playerIndex] || null;
}

function formatCountdown(startsAt) {
  const remaining = Math.max(0, Math.ceil((new Date(startsAt).getTime() - Date.now()) / 1000));
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
}

function renderOnlineRoom(room) {
  session.room = room;
  const game = room.game;
  const isMatchmaking = game.mode === "matchmaking";
  onlineElements.onlineRoomModal.hidden = false;
  onlineElements.onlineRoomEyebrow.textContent = isMatchmaking ? "Public Matchmaking" : "Private Room";
  onlineElements.onlineRoomTitle.textContent = isMatchmaking ? "Finding Heroes" : `Room ${game.code}`;
  onlineElements.onlinePlayerList.innerHTML = [1, 2, 3, 4].map((seat) => {
    const player = room.players.find((candidate) => candidate.seat === seat);
    const playerIndex = player ? room.players.findIndex((candidate) => candidate.id === player.id) : -1;
    const team = playerIndex >= 0 ? playerTeams(Math.max(2, room.players.length))[playerIndex] : null;
    const teamLabel = player && game.status === "playing" && team ? teamNames[teamKeys.indexOf(team)] : `Seat ${seat}`;
    return `<div class="online-player-seat ${player ? "filled" : ""}" style="--seat-color:${teamColors[team] || "#777"}">
      <span>${teamLabel}</span><strong>${escapeOnline(player?.display_name || "Waiting...")}</strong>
    </div>`;
  }).join("");

  const count = room.players.length;
  if (game.status === "countdown" && game.starts_at) {
    onlineElements.onlineRoomStatus.textContent = `${count} players ready. Waiting for players three and four.`;
    onlineElements.onlineCountdown.hidden = false;
    onlineElements.onlineCountdownValue.textContent = formatCountdown(game.starts_at);
  } else if (game.status === "playing" && !game.game_state) {
    onlineElements.onlineRoomStatus.textContent = game.is_host ? "Preparing the battlefield..." : "The host is preparing the battlefield...";
    onlineElements.onlineCountdown.hidden = true;
  } else {
    onlineElements.onlineCountdown.hidden = true;
    onlineElements.onlineRoomStatus.textContent = isMatchmaking
      ? `${count} player${count === 1 ? "" : "s"} found. The two-minute timer begins when player two joins.`
      : `${count} of 4 players ready. Share code ${game.code}.`;
  }

  onlineElements.startOnlineRoomButton.hidden = !(game.mode === "private" && game.is_host && game.status === "waiting");
  onlineElements.startOnlineRoomButton.disabled = count < 2;
  onlineElements.startOnlineRoomButton.textContent = count < 2 ? "Waiting for Another Player" : `Start ${count}-Player Battle`;
}

function escapeOnline(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function cloneOnlineState(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function mergeLocalDraftState(remoteState, localState, team = session.localTeam) {
  if (!remoteState || !localState || !team || remoteState.phase !== "draft" || localState.phase !== "draft") return remoteState;
  const merged = cloneOnlineState(remoteState);
  merged.draftSelections ||= {};
  merged.draftSwaps ||= {};
  merged.draftLocked ||= {};
  merged.wandeltChoices ||= {};

  if (localState.draftSelections?.[team]) merged.draftSelections[team] = cloneOnlineState(localState.draftSelections[team]);
  if (localState.draftSwaps?.[team] !== undefined) merged.draftSwaps[team] = localState.draftSwaps[team];
  if (localState.draftLocked?.[team] !== undefined) merged.draftLocked[team] = localState.draftLocked[team];

  Object.entries(localState.wandeltChoices || {}).forEach(([key, value]) => {
    if (key.startsWith(`${team}_`)) merged.wandeltChoices[key] = value;
  });
  return merged;
}

async function enterRoom(room) {
  session.active = true;
  session.gameId = room.game.id;
  session.mode = room.game.mode;
  session.room = room;
  session.revision = Number(room.game.revision || 0);
  session.localTeam = assignLocalTeam(room);
  sessionStorage.setItem("arpon-online-room", JSON.stringify({ gameId: session.gameId }));
  renderOnlineRoom(room);
  startPolling();
  await handleRoomState(room);
}

async function createPrivateRoom() {
  rememberPlayerName();
  showPrivateMessage("Creating room...");
  try {
    const room = await rpc("create_arpon_private_room", {
      p_player_token: session.token,
      p_display_name: playerName(),
      p_turn_limit: Number(onlineElements.turnLimitInput?.value || 40),
    });
    showPrivateMessage("Room created.");
    await enterRoom(room);
  } catch (error) {
    showPrivateMessage(setupErrorMessage(error), true);
  }
}

async function joinPrivateRoom() {
  const code = onlineElements.roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    showPrivateMessage("Enter the six-character room code.", true);
    return;
  }
  rememberPlayerName();
  showPrivateMessage("Joining room...");
  try {
    const room = await rpc("join_arpon_private_room", {
      p_code: code,
      p_player_token: session.token,
      p_display_name: playerName(),
    });
    await enterRoom(room);
  } catch (error) {
    showPrivateMessage(setupErrorMessage(error), true);
  }
}

async function joinMatchmaking() {
  rememberPlayerName();
  setOnlineBusy("Looking for an open match...");
  try {
    const room = await rpc("join_arpon_matchmaking", {
      p_player_token: session.token,
      p_display_name: playerName(),
    });
    await enterRoom(room);
  } catch (error) {
    onlineElements.onlineRoomStatus.textContent = setupErrorMessage(error);
    onlineElements.onlineRoomEyebrow.textContent = "Connection Needed";
  }
}

async function startPrivateRoom() {
  if (!session.gameId) return;
  onlineElements.startOnlineRoomButton.disabled = true;
  try {
    const room = await rpc("start_arpon_private_room", {
      p_game_id: session.gameId,
      p_player_token: session.token,
    });
    await handleRoomState(room);
  } catch (error) {
    onlineElements.onlineRoomStatus.textContent = setupErrorMessage(error);
  }
}

function startPolling() {
  clearInterval(session.pollTimer);
  session.pollTimer = setInterval(pollRoom, POLL_INTERVAL);
}

async function pollRoom() {
  if (!session.active || !session.gameId || session.pollBusy) return;
  session.pollBusy = true;
  try {
    let room = await rpc("get_arpon_online_room", {
      p_game_id: session.gameId,
      p_player_token: session.token,
    });
    if (room.game.mode === "matchmaking" && ["waiting", "countdown"].includes(room.game.status)) {
      room = await rpc("start_arpon_match_if_ready", {
        p_game_id: session.gameId,
        p_player_token: session.token,
      });
    }
    await handleRoomState(room);
  } catch (error) {
    onlineElements.onlineRoomStatus.textContent = setupErrorMessage(error);
  } finally {
    session.pollBusy = false;
  }
}

async function handleRoomState(room) {
  session.room = room;
  session.revision = Number(room.game.revision || 0);
  session.localTeam = assignLocalTeam(room);
  if (room.game.status !== "playing") {
    renderOnlineRoom(room);
    return;
  }

  session.started = true;
  if (room.game.game_state) {
    const localState = window.ArponGame.getState();
    const incomingState = mergeLocalDraftState(room.game.game_state, localState);
    const hash = JSON.stringify(incomingState);
    if (hash !== session.lastStateHash) {
      session.lastStateHash = hash;
      session.applyingRemote = true;
      window.ArponGame.replaceState(incomingState);
      session.applyingRemote = false;
    }
    window.ArponGame.reconcileOnlineState?.();
    onlineElements.lobbyModal.hidden = true;
    onlineElements.onlineRoomModal.hidden = true;
    return;
  }

  renderOnlineRoom(room);
  if (room.game.is_host) {
    onlineElements.lobbyModal.hidden = true;
    onlineElements.onlineRoomModal.hidden = true;
    window.ArponGame.startOnlineGame(room.players, room.game.turn_limit);
  }
}

function schedulePush(snapshot) {
  if (!session.active || !session.started || session.applyingRemote || !session.gameId) return;
  const hash = JSON.stringify(snapshot);
  if (hash === session.lastStateHash) return;
  clearTimeout(session.pushTimer);
  session.pushTimer = setTimeout(() => pushGameState(snapshot, hash), 120);
}

async function pushGameState(snapshot, hash, retrying = false) {
  if (!session.active || session.applyingRemote) return;
  try {
    const room = await rpc("push_arpon_game_state", {
      p_game_id: session.gameId,
      p_player_token: session.token,
      p_expected_revision: session.revision,
      p_game_state: snapshot,
    });
    session.room = room;
    session.revision = Number(room.game.revision || 0);
    session.lastStateHash = hash;
  } catch {
    if (retrying || snapshot.phase !== "draft") {
      await pollRoom();
      return;
    }
    try {
      const latestRoom = await rpc("get_arpon_online_room", {
        p_game_id: session.gameId,
        p_player_token: session.token,
      });
      session.room = latestRoom;
      session.revision = Number(latestRoom.game.revision || 0);
      const merged = mergeLocalDraftState(latestRoom.game.game_state, snapshot);
      await pushGameState(merged, JSON.stringify(merged), true);
    } catch {
      await pollRoom();
    }
  }
}

async function disconnectOnline() {
  const gameId = session.gameId;
  const wasActive = session.active;
  clearInterval(session.pollTimer);
  clearTimeout(session.pushTimer);
  Object.assign(session, {
    active: false,
    applyingRemote: false,
    gameId: null,
    localTeam: null,
    mode: null,
    pollTimer: null,
    pollBusy: false,
    pushTimer: null,
    revision: 0,
    room: null,
    started: false,
    lastStateHash: "",
  });
  sessionStorage.removeItem("arpon-online-room");
  onlineElements.onlineRoomModal.hidden = true;
  if (wasActive && gameId) {
    rpc("leave_arpon_online_room", { p_game_id: gameId, p_player_token: session.token }).catch(() => {});
  }
}

onlineElements.openLocalButton.addEventListener("click", async () => {
  await disconnectOnline();
  showHomePanel("local");
});
onlineElements.openPrivateButton.addEventListener("click", () => showHomePanel("private"));
onlineElements.findMatchButton.addEventListener("click", joinMatchmaking);
onlineElements.homeRulesButton.addEventListener("click", () => {
  onlineElements.rulesModal.hidden = false;
});
document.querySelectorAll("[data-home-back]").forEach((button) => button.addEventListener("click", () => showHomePanel("menu")));
onlineElements.createRoomButton.addEventListener("click", createPrivateRoom);
onlineElements.joinRoomButton.addEventListener("click", joinPrivateRoom);
onlineElements.roomCodeInput.addEventListener("input", () => {
  onlineElements.roomCodeInput.value = onlineElements.roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
onlineElements.onlinePlayerName.addEventListener("change", rememberPlayerName);
onlineElements.startOnlineRoomButton.addEventListener("click", startPrivateRoom);
onlineElements.cancelOnlineButton.addEventListener("click", async () => {
  await disconnectOnline();
  showHomePanel("menu");
});

window.ArponOnline = {
  canControlTeam: (team) => !session.active || session.localTeam === team,
  getLocalTeam: () => session.localTeam,
  isHost: () => Boolean(session.room?.game?.is_host),
  isOnline: () => session.active,
  onGameRendered: schedulePush,
  onResetToLobby: () => {
    disconnectOnline();
    showHomePanel("menu");
  },
};

onlineElements.onlinePlayerName.value = localStorage.getItem("arpon-player-name") || "Player";
showHomePanel("menu");

let savedRoom = null;
try {
  savedRoom = JSON.parse(sessionStorage.getItem("arpon-online-room") || "null");
} catch {
  sessionStorage.removeItem("arpon-online-room");
}
if (savedRoom?.gameId) {
  rpc("get_arpon_online_room", {
    p_game_id: savedRoom.gameId,
    p_player_token: session.token,
  })
    .then(enterRoom)
    .catch(() => sessionStorage.removeItem("arpon-online-room"));
}
