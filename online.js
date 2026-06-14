const SUPABASE_URL = "https://gfktqgtizctecrypnfan.supabase.co";
const SUPABASE_KEY = "sb_publishable_l3b8UIl2LwcPf9w2NUchgg_FMGIoa4J";
const POLL_INTERVAL = 1400;
const MATCHMAKING_COUNT_INTERVAL = 5000;
const PRESENCE_INTERVAL = 20000;

const onlineElements = Object.fromEntries(
  [
    "lobbyModal", "homeMenuPanel", "localSetupPanel", "soloSetupPanel", "privateSetupPanel", "openLocalButton", "openSoloButton", "openPrivateButton", "findMatchButton",
    "homeRulesButton", "rulesModal", "onlinePlayerName", "createRoomButton", "roomCodeInput", "joinRoomButton", "privateMessage",
    "onlineRoomModal", "onlineRoomEyebrow", "onlineRoomTitle", "onlineRoomStatus", "onlineCountdown", "onlineCountdownValue",
    "onlinePlayerList", "startOnlineRoomButton", "cancelOnlineButton", "turnLimitInput", "matchWaitingCount",
    "privateTurnLimitInput", "privateTurnLimitValue", "privateWallLimitInput", "privateWallLimitValue", "privateRankedInput", "privateTimerInput",
    "accountButton", "accountSummary", "accountModal", "closeAccountButton", "accountForm", "accountUsername", "accountPassword", "accountLoginButton",
    "accountCreateButton", "accountRecord", "accountMessage", "accountLogoutButton", "leaderboardButton", "leaderboardModal",
    "closeLeaderboardButton", "leaderboardList", "leaderboardPreviousButton", "leaderboardNextButton", "leaderboardPageLabel",
    "friendsButton", "friendsModal", "closeFriendsButton", "friendUsername", "friendMessage", "sendFriendRequestButton", "sendFriendMessageButton",
    "sendBattleInviteButton", "friendsMessage", "friendsList", "friendRequestsList", "friendMessagesList",
    "friendBattleTurnLimitInput", "friendBattleTurnLimitValue", "friendBattleWallLimitInput", "friendBattleWallLimitValue", "friendBattleRankedInput", "friendBattleTimerInput",
    "adminButton", "adminModal", "closeAdminButton", "adminStats", "adminMessage", "adminAccountList",
    "passwordChange", "currentPassword", "newPassword", "changePasswordButton",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

const teamNames = ["Red", "Green", "Yellow", "Blue"];
const teamKeys = ["red", "green", "yellow", "blue"];
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
let matchmakingCountTimer = null;
let matchmakingCountBusy = false;
const account = {
  token: localStorage.getItem("arpon-account-session") || null,
  profile: null,
  recordedResults: new Set(),
  pendingResults: new Set(),
};
const leaderboard = { metric: "ranked_wins", page: 0, rows: [] };
let presenceTimer = null;
let socialTimer = null;

function playerName() {
  const entered = onlineElements.onlinePlayerName.value.trim();
  return entered || account.profile?.username || localStorage.getItem("arpon-player-name") || "Player";
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

function renderMatchmakingCount(count = null) {
  if (!onlineElements.matchWaitingCount) return;
  const amount = Number(count);
  if (!Number.isFinite(amount)) {
    onlineElements.matchWaitingCount.textContent = "Queue count unavailable";
    onlineElements.findMatchButton.classList.remove("has-waiting-players");
    return;
  }
  onlineElements.matchWaitingCount.textContent = amount === 1 ? "1 player waiting now" : `${amount} players waiting now`;
  onlineElements.findMatchButton.classList.toggle("has-waiting-players", amount > 0);
}

async function refreshMatchmakingCount() {
  if (matchmakingCountBusy || session.active || onlineElements.homeMenuPanel.hidden || onlineElements.lobbyModal.hidden) return;
  matchmakingCountBusy = true;
  try {
    renderMatchmakingCount(await rpc("get_arpon_matchmaking_waiting_count"));
  } catch {
    renderMatchmakingCount(null);
  } finally {
    matchmakingCountBusy = false;
  }
}

function showHomePanel(panel) {
  onlineElements.homeMenuPanel.hidden = panel !== "menu";
  onlineElements.localSetupPanel.hidden = panel !== "local";
  onlineElements.soloSetupPanel.hidden = panel !== "solo";
  onlineElements.privateSetupPanel.hidden = panel !== "private";
  onlineElements.lobbyModal.hidden = false;
  if (panel === "menu") refreshMatchmakingCount();
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
      : `${count} of 4 players ready. Share code ${game.code}. ${game.timer_enabled === false ? "Timers off." : "Timers on."}`;
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
  if (account.token) await rpc("link_arpon_player_account", { p_game_id: session.gameId, p_player_token: session.token, p_session_token: account.token }).catch(() => {});
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
      p_turn_limit: Number(onlineElements.privateTurnLimitInput?.value || 24),
      p_wall_limit: Number(onlineElements.privateWallLimitInput?.value || 24),
      p_ranked: Boolean(onlineElements.privateRankedInput?.checked),
      p_timer_enabled: Boolean(onlineElements.privateTimerInput?.checked),
    });
    showPrivateMessage("Room created.");
    await enterRoom(room);
  } catch (error) {
    showPrivateMessage(setupErrorMessage(error), true);
  }
}

async function joinPrivateRoom() {
  const code = onlineElements.roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 3) {
    showPrivateMessage("Enter the three-letter room code.", true);
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
    window.ArponGame.startOnlineGame(room.players, room.game.mode === "matchmaking" ? null : room.game.turn_limit, room.game.wall_limit, room.game.ranked, room.game.id, room.game.timer_enabled !== false);
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

function setAccountMessage(message, error = false) {
  onlineElements.accountMessage.textContent = message;
  onlineElements.accountMessage.classList.toggle("error", error);
}

function renderAccount() {
  const profile = account.profile;
  onlineElements.accountSummary.textContent = profile
    ? `${profile.username} · ${profile.ranked_wins} ranked wins · ${profile.solo_wins} robot wins`
    : "Playing as guest";
  onlineElements.accountForm.hidden = Boolean(profile);
  onlineElements.accountLogoutButton.hidden = !profile;
  onlineElements.passwordChange.hidden = !profile;
  onlineElements.friendsButton.hidden = !profile;
  onlineElements.adminButton.hidden = !profile?.is_admin;
  onlineElements.accountRecord.innerHTML = profile ? `
    <div><span>Coins</span><strong>${profile.is_admin ? "∞" : profile.coins || 0}</strong></div>
    <div><span>Ranked</span><strong>${profile.ranked_wins} W · ${profile.ranked_losses} L</strong></div>
    <div><span>Robot</span><strong>${profile.solo_wins} W · ${profile.solo_losses} L</strong></div>
    <div><span>Ranked win rate</span><strong>${profile.ranked_games ? Math.round((profile.ranked_wins / profile.ranked_games) * 100) : 0}%</strong></div>
  ` : "";
  if (profile) {
    onlineElements.onlinePlayerName.value = profile.username;
    setAccountMessage("Your record is saved after ranked and robot battles.");
  }
  window.ArponCollection?.setProfile?.(profile, account.token);
}

async function refreshAccount() {
  if (!account.token) {
    account.profile = null;
    renderAccount();
    return;
  }
  try {
    account.profile = await rpc("get_arpon_account_record", { p_session_token: account.token });
    touchPresence();
    if (session.active) rpc("link_arpon_player_account", { p_game_id: session.gameId, p_player_token: session.token, p_session_token: account.token }).catch(() => {});
  } catch {
    account.token = null;
    account.profile = null;
    localStorage.removeItem("arpon-account-session");
  }
  renderAccount();
}

async function submitAccount(create) {
  const username = onlineElements.accountUsername.value;
  const password = onlineElements.accountPassword.value;
  setAccountMessage(create ? "Creating account..." : "Signing in...");
  try {
    const result = await rpc(create ? "create_arpon_account" : "login_arpon_account", {
      p_username: username,
      p_password: password,
    });
    if (result?.error) throw new Error(result.error);
    account.token = result.session_token;
    account.profile = result.profile;
    localStorage.setItem("arpon-account-session", account.token);
    onlineElements.accountPassword.value = "";
    renderAccount();
    touchPresence();
    if (session.active) rpc("link_arpon_player_account", { p_game_id: session.gameId, p_player_token: session.token, p_session_token: account.token }).catch(() => {});
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

async function changePassword() {
  if (!account.token) return;
  setAccountMessage("Updating password...");
  try {
    await rpc("change_arpon_password", {
      p_session_token: account.token,
      p_current_password: onlineElements.currentPassword.value,
      p_new_password: onlineElements.newPassword.value,
    });
    onlineElements.currentPassword.value = "";
    onlineElements.newPassword.value = "";
    setAccountMessage("Password updated. Other signed-in devices were logged out.");
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

function touchPresence() {
  if (account.token) rpc("touch_arpon_presence", { p_session_token: account.token }).catch(() => {});
}

async function logoutAccount() {
  if (account.token) rpc("logout_arpon_account", { p_session_token: account.token }).catch(() => {});
  account.token = null;
  account.profile = null;
  localStorage.removeItem("arpon-account-session");
  renderAccount();
}

async function showLeaderboard(resetPage = false) {
  if (resetPage) leaderboard.page = 0;
  onlineElements.leaderboardModal.hidden = false;
  onlineElements.leaderboardList.textContent = "Loading leaderboard...";
  try {
    const rows = await rpc("get_arpon_leaderboard_page", { p_metric: leaderboard.metric, p_page: leaderboard.page });
    const score = (row) => Number(row[leaderboard.metric] || 0);
    rows.sort((a, b) => score(b) - score(a) || String(a.username).localeCompare(String(b.username)));
    leaderboard.rows = rows;
    onlineElements.leaderboardPageLabel.textContent = `Page ${leaderboard.page + 1}`;
    onlineElements.leaderboardPreviousButton.disabled = leaderboard.page === 0;
    onlineElements.leaderboardNextButton.disabled = rows.length < 20;
    const value = (row) => leaderboard.metric === "ranked_wins" ? `${row.ranked_wins} ranked wins`
      : leaderboard.metric === "ranked_rate" ? `${row.ranked_rate}% ranked`
        : leaderboard.metric === "solo_wins" ? `${row.solo_wins} robot wins` : `${row.solo_rate}% robot`;
    onlineElements.leaderboardList.innerHTML = rows.length ? rows.map((row, index) => `
      <div class="leaderboard-row">
        <strong>${leaderboard.page * 20 + index + 1}</strong><span>${escapeOnline(row.username)}</span>
        <b>${value(row)}</b><em>${row.ranked_wins + row.ranked_losses} ranked · ${row.solo_wins + row.solo_losses} robot</em>
      </div>`).join("") : "<p>No results on this page yet.</p>";
  } catch (error) {
    onlineElements.leaderboardList.textContent = error.message;
  }
}

function setFriendsMessage(message, error = false) {
  onlineElements.friendsMessage.textContent = message;
  onlineElements.friendsMessage.classList.toggle("error", error);
}

async function refreshFriends() {
  if (!account.token || onlineElements.friendsModal.hidden) return;
  try {
    const data = await rpc("get_arpon_social_dashboard", { p_session_token: account.token });
    onlineElements.friendsList.innerHTML = data.friends.length ? data.friends.map((friend) => `
      <button class="social-person ${friend.online ? "online" : ""}" data-social-username="${escapeOnline(friend.username)}" type="button">
        <i></i><strong>${escapeOnline(friend.username)}</strong><span>${friend.online ? "Online" : "Offline"}</span>
      </button>`).join("") : "<p>No friends yet.</p>";
    onlineElements.friendRequestsList.innerHTML = [
      ...data.requests.map((request) => `<article><strong>${escapeOnline(request.username)}</strong><span>Friend request</span><div><button data-accept-friend="${escapeOnline(request.username)}" type="button">Accept</button><button data-decline-friend="${escapeOnline(request.username)}" type="button">Decline</button></div></article>`),
      ...data.invites.map((invite) => `<article class="battle-invite"><strong>${escapeOnline(invite.from)}</strong><span>Friendly battle invitation</span><button data-join-invite="${escapeOnline(invite.code)}" type="button">Join Battle</button></article>`),
    ].join("") || "<p>No pending requests.</p>";
    onlineElements.friendMessagesList.innerHTML = data.messages.length ? data.messages.map((message) => `
      <article><strong>${escapeOnline(message.from)} → ${escapeOnline(message.to)}</strong><span>${new Date(message.sent_at).toLocaleString()}</span><p>${escapeOnline(message.body)}</p></article>`).join("") : "<p>No messages yet.</p>";
    bindSocialActions();
  } catch (error) {
    setFriendsMessage(error.message, true);
  }
}

function bindSocialActions() {
  onlineElements.friendsModal.querySelectorAll("[data-social-username]").forEach((button) => button.addEventListener("click", () => {
    onlineElements.friendUsername.value = button.dataset.socialUsername;
  }));
  onlineElements.friendsModal.querySelectorAll("[data-accept-friend], [data-decline-friend]").forEach((button) => button.addEventListener("click", async () => {
    const username = button.dataset.acceptFriend || button.dataset.declineFriend;
    await rpc("respond_arpon_friend_request", { p_session_token: account.token, p_requester_username: username, p_accept: Boolean(button.dataset.acceptFriend) });
    refreshFriends();
  }));
  onlineElements.friendsModal.querySelectorAll("[data-join-invite]").forEach((button) => button.addEventListener("click", () => joinPrivateRoomWithCode(button.dataset.joinInvite)));
}

async function sendFriendRequest() {
  try {
    await rpc("send_arpon_friend_request", { p_session_token: account.token, p_username: onlineElements.friendUsername.value });
    setFriendsMessage("Friend request sent.");
  } catch (error) { setFriendsMessage(error.message, true); }
}

async function sendFriendMessage() {
  try {
    await rpc("send_arpon_message", { p_session_token: account.token, p_username: onlineElements.friendUsername.value, p_body: onlineElements.friendMessage.value });
    onlineElements.friendMessage.value = "";
    setFriendsMessage("Message sent.");
    refreshFriends();
  } catch (error) { setFriendsMessage(error.message, true); }
}

async function sendFriendlyBattleInvite() {
  const username = onlineElements.friendUsername.value;
  if (!username) return setFriendsMessage("Choose a friend first.", true);
  rememberPlayerName();
  setFriendsMessage("Creating friendly battle...");
  try {
    const room = await rpc("create_arpon_private_room", {
      p_player_token: session.token,
      p_display_name: playerName(),
      p_turn_limit: Number(onlineElements.friendBattleTurnLimitInput?.value || 24),
      p_wall_limit: Number(onlineElements.friendBattleWallLimitInput?.value || 24),
      p_ranked: Boolean(onlineElements.friendBattleRankedInput?.checked),
      p_timer_enabled: Boolean(onlineElements.friendBattleTimerInput?.checked),
    });
    await rpc("link_arpon_player_account", { p_game_id: room.game.id, p_player_token: session.token, p_session_token: account.token });
    await rpc("send_arpon_battle_invite", { p_session_token: account.token, p_username: username, p_game_id: room.game.id });
    onlineElements.friendsModal.hidden = true;
    await enterRoom(room);
  } catch (error) { setFriendsMessage(error.message, true); }
}

async function joinPrivateRoomWithCode(code) {
  onlineElements.roomCodeInput.value = code;
  onlineElements.friendsModal.hidden = true;
  await joinPrivateRoom();
}

async function showAdmin() {
  if (!account.profile?.is_admin) return;
  onlineElements.adminModal.hidden = false;
  onlineElements.adminAccountList.textContent = "Loading accounts...";
  try {
    const data = await rpc("get_arpon_admin_dashboard", { p_session_token: account.token });
    onlineElements.adminStats.innerHTML = `<div><strong>${data.online_accounts}</strong><span>signed-in online</span></div><div><strong>${data.active_room_players}</strong><span>room players online</span></div><div><strong>${data.active_games}</strong><span>active games</span></div><div><strong>${data.accounts.length}</strong><span>accounts</span></div>`;
    onlineElements.adminAccountList.innerHTML = data.accounts.map((item) => `
      <article class="${item.online ? "online" : ""}">
        <div><strong>${escapeOnline(item.username)}</strong><span>${item.online ? "Online" : "Offline"} · Created ${new Date(item.created_at).toLocaleDateString()}</span></div>
        <p>${item.ranked_wins}–${item.ranked_losses} ranked · ${item.solo_wins}–${item.solo_losses} robot</p>
        ${item.is_admin ? "<em>Protected creator account</em>" : `<div>${item.locked_until && new Date(item.locked_until) > new Date() ? `<button data-admin-unlock="${escapeOnline(item.username)}" type="button">Unlock Account</button>` : ""}<button data-admin-reset="${escapeOnline(item.username)}" type="button">Reset Record</button><button data-admin-delete="${escapeOnline(item.username)}" type="button">Delete Account</button></div>`}
      </article>`).join("");
    bindAdminActions();
  } catch (error) { onlineElements.adminMessage.textContent = error.message; }
}

function bindAdminActions() {
  onlineElements.adminAccountList.querySelectorAll("[data-admin-unlock]").forEach((button) => button.addEventListener("click", async () => {
    try {
      await rpc("admin_unlock_arpon_account", { p_session_token: account.token, p_username: button.dataset.adminUnlock });
      showAdmin();
    } catch (error) { onlineElements.adminMessage.textContent = error.message; }
  }));
  onlineElements.adminAccountList.querySelectorAll("[data-admin-reset]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm(`Reset all wins and losses for ${button.dataset.adminReset}?`)) return;
    try {
      await rpc("admin_reset_arpon_record", { p_session_token: account.token, p_username: button.dataset.adminReset });
      showAdmin();
    } catch (error) { onlineElements.adminMessage.textContent = error.message; }
  }));
  onlineElements.adminAccountList.querySelectorAll("[data-admin-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm(`Permanently delete ${button.dataset.adminDelete}?`)) return;
    try {
      await rpc("admin_delete_arpon_account", { p_session_token: account.token, p_username: button.dataset.adminDelete });
      showAdmin();
    } catch (error) { onlineElements.adminMessage.textContent = error.message; }
  }));
}

async function recordGameComplete(result, attempt = 0, context = null) {
  if (!account.token || account.recordedResults.has(result.matchId)) return;
  if (attempt === 0 && account.pendingResults.has(result.matchId)) return;
  if (attempt === 0) account.pendingResults.add(result.matchId);
  const recordContext = context || {
    sessionToken: account.token,
    gameId: session.gameId,
    playerToken: session.token,
  };
  try {
    if (result.mode === "solo") {
      await rpc("record_arpon_solo_result", {
        p_session_token: recordContext.sessionToken,
        p_result_key: result.matchId,
        p_won: result.winners.includes("red"),
      });
    } else if (recordContext.gameId && result.ranked) {
      await rpc("record_arpon_online_result", {
        p_game_id: recordContext.gameId,
        p_player_token: recordContext.playerToken,
        p_session_token: recordContext.sessionToken,
      });
    } else {
      account.pendingResults.delete(result.matchId);
      return;
    }
    account.recordedResults.add(result.matchId);
    account.pendingResults.delete(result.matchId);
    await refreshAccount();
  } catch {
    if (attempt < 6) {
      setTimeout(() => recordGameComplete(result, attempt + 1, recordContext), 700 + attempt * 550);
    } else {
      account.pendingResults.delete(result.matchId);
    }
  }
}

onlineElements.openLocalButton.addEventListener("click", async () => {
  await disconnectOnline();
  showHomePanel("local");
});
onlineElements.openSoloButton.addEventListener("click", async () => {
  await disconnectOnline();
  showHomePanel("solo");
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
  onlineElements.roomCodeInput.value = onlineElements.roomCodeInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
});
onlineElements.privateTurnLimitInput.addEventListener("input", () => {
  onlineElements.privateTurnLimitValue.textContent = `${onlineElements.privateTurnLimitInput.value} turns`;
});
onlineElements.privateWallLimitInput.addEventListener("input", () => {
  onlineElements.privateWallLimitValue.textContent = `${onlineElements.privateWallLimitInput.value} walls`;
});
onlineElements.friendBattleTurnLimitInput.addEventListener("input", () => {
  onlineElements.friendBattleTurnLimitValue.textContent = `${onlineElements.friendBattleTurnLimitInput.value} turns`;
});
onlineElements.friendBattleWallLimitInput.addEventListener("input", () => {
  onlineElements.friendBattleWallLimitValue.textContent = `${onlineElements.friendBattleWallLimitInput.value} walls`;
});
onlineElements.onlinePlayerName.addEventListener("change", rememberPlayerName);
onlineElements.startOnlineRoomButton.addEventListener("click", startPrivateRoom);
onlineElements.cancelOnlineButton.addEventListener("click", async () => {
  await disconnectOnline();
  showHomePanel("menu");
});
onlineElements.accountButton.addEventListener("click", () => {
  onlineElements.accountModal.hidden = false;
  renderAccount();
});
onlineElements.closeAccountButton.addEventListener("click", () => {
  onlineElements.accountModal.hidden = true;
});
onlineElements.accountLoginButton.addEventListener("click", () => submitAccount(false));
onlineElements.accountCreateButton.addEventListener("click", () => submitAccount(true));
onlineElements.accountLogoutButton.addEventListener("click", logoutAccount);
onlineElements.changePasswordButton.addEventListener("click", changePassword);
onlineElements.leaderboardButton.addEventListener("click", () => showLeaderboard(true));
onlineElements.closeLeaderboardButton.addEventListener("click", () => {
  onlineElements.leaderboardModal.hidden = true;
});
document.querySelectorAll("[data-leaderboard-metric]").forEach((button) => button.addEventListener("click", () => {
  leaderboard.metric = button.dataset.leaderboardMetric;
  document.querySelectorAll("[data-leaderboard-metric]").forEach((item) => item.classList.toggle("active", item === button));
  showLeaderboard(true);
}));
onlineElements.leaderboardPreviousButton.addEventListener("click", () => {
  leaderboard.page = Math.max(0, leaderboard.page - 1);
  showLeaderboard();
});
onlineElements.leaderboardNextButton.addEventListener("click", () => {
  leaderboard.page += 1;
  showLeaderboard();
});
onlineElements.friendsButton.addEventListener("click", () => {
  onlineElements.friendsModal.hidden = false;
  refreshFriends();
});
onlineElements.closeFriendsButton.addEventListener("click", () => {
  onlineElements.friendsModal.hidden = true;
});
onlineElements.sendFriendRequestButton.addEventListener("click", sendFriendRequest);
onlineElements.sendFriendMessageButton.addEventListener("click", sendFriendMessage);
onlineElements.sendBattleInviteButton.addEventListener("click", sendFriendlyBattleInvite);
onlineElements.adminButton.addEventListener("click", showAdmin);
onlineElements.closeAdminButton.addEventListener("click", () => {
  onlineElements.adminModal.hidden = true;
});

window.ArponOnline = {
  canControlTeam: (team) => !session.active || session.localTeam === team,
  getLocalTeam: () => session.localTeam,
  isHost: () => Boolean(session.room?.game?.is_host),
  isOnline: () => session.active,
  continueLocally: () => disconnectOnline(),
  onGameRendered: schedulePush,
  onGameComplete: recordGameComplete,
  onPlayerForfeit: (team) => {
    if (session.active && session.room?.game?.is_host) rpc("record_arpon_forfeit", { p_game_id: session.gameId, p_host_token: session.token, p_team: team }).catch(() => {});
  },
  onResetToLobby: () => {
    disconnectOnline();
    showHomePanel("menu");
  },
};

onlineElements.onlinePlayerName.value = localStorage.getItem("arpon-player-name") || "Player";
refreshAccount();
showHomePanel("menu");
clearInterval(matchmakingCountTimer);
matchmakingCountTimer = setInterval(refreshMatchmakingCount, MATCHMAKING_COUNT_INTERVAL);
clearInterval(presenceTimer);
presenceTimer = setInterval(touchPresence, PRESENCE_INTERVAL);
clearInterval(socialTimer);
socialTimer = setInterval(refreshFriends, PRESENCE_INTERVAL);
touchPresence();

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
