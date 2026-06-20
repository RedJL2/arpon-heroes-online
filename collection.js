(() => {
  const ACTIVE_PER_KIND = 6;
  const DEFAULT_OWNED_PER_KIND = 8;
  const UPGRADE_COSTS = [0, 1, 2, 3, 4, 5];
  const TIER_NAMES = ["White", "Green", "Blue", "Purple", "Gold", "Red"];
  const TIER_CLASSES = ["tier-0", "tier-1", "tier-2", "tier-3", "tier-4", "tier-5"];
  const PACKS = {
    standard: { cost: 4, count: 5, image: "./assets/pack-art/standard-extension-pack.png", title: "Standard Extension Pack" },
    novelty: { cost: 5, count: 3, image: "./assets/pack-art/novelty-extension-pack.png", title: "Novelty Extension Pack" },
  };

  const cards = window.ArponGame.cards;
  const cardsById = Object.fromEntries(cards.map((card) => [card.id, card]));
  const groups = {
    hero: cards.filter((card) => card.kind === "hero"),
    armor: cards.filter((card) => card.kind === "armor"),
    weapon: cards.filter((card) => card.kind === "weapon"),
  };

  const elements = Object.fromEntries(
    [
      "openPlayButton", "openDeckButton", "openShopButton", "deckModal", "closeDeckButton", "activeDeckColumns", "ownedDeckColumns",
      "deckMessage", "deckSwapBar", "deckSwapText", "cancelDeckSwapButton", "upgradeOverlay", "upgradeTitle", "upgradePreview",
      "upgradeText", "closeUpgradeButton", "cancelUpgradeButton", "confirmUpgradeButton", "deckCoinPill", "saveDeckButton",
      "deckSaveState", "shopModal",
      "closeShopButton", "shopCoinPill", "shopMessage", "shopLayout", "packOpening",
    ].map((id) => [id, document.querySelector(`#${id}`)]),
  );

  let ownerKey = ownerStorageKey();
  let collection = loadCollection(ownerKey);
  let draftDeck = null;
  let deckDirty = false;
  let pendingSwap = null;
  let pendingUpgrade = null;
  let opening = null;

  function ownerStorageKey(profile = window.ArponOnline?.getAccountProfile?.()) {
    return `arpon-collection:${profile?.username || "guest"}`;
  }

  function defaultCollection() {
    const owned = {};
    const activeDeck = [];
    Object.values(groups).forEach((kindCards) => {
      kindCards.slice(0, DEFAULT_OWNED_PER_KIND).forEach((card, index) => {
        owned[card.id] = { level: 0, progress: 0, isNew: false };
        if (index < ACTIVE_PER_KIND) activeDeck.push(card.id);
      });
    });
    return { version: 2, coins: 0, owned, activeDeck };
  }

  function loadCollection(key) {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      parsed = null;
    }
    const data = migrateCollection(parsed || defaultCollection());
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  function migrateCollection(data) {
    const next = { ...defaultCollection(), ...data };
    next.owned = { ...defaultCollection().owned, ...(data.owned || {}) };
    Object.keys(next.owned).forEach((id) => {
      if (!cardsById[id]) delete next.owned[id];
      else next.owned[id] = {
        level: clampTier(next.owned[id].level),
        progress: Math.max(0, Number(next.owned[id].progress || 0)),
        isNew: Boolean(next.owned[id].isNew),
      };
    });
    next.activeDeck = Array.isArray(data.activeDeck) ? data.activeDeck.filter((id, index, list) => cardsById[id] && next.owned[id] && list.indexOf(id) === index) : [];
    ["hero", "armor", "weapon"].forEach((kind) => {
      const active = next.activeDeck.filter((id) => cardsById[id]?.kind === kind);
      groups[kind].forEach((card) => {
        if (active.length < ACTIVE_PER_KIND && next.owned[card.id] && !next.activeDeck.includes(card.id)) {
          next.activeDeck.push(card.id);
          active.push(card.id);
        }
      });
      next.activeDeck = next.activeDeck.filter((id) => cardsById[id]?.kind !== kind || active.slice(0, ACTIVE_PER_KIND).includes(id));
    });
    next.coins = Math.max(0, Number(next.coins || 0));
    next.version = 2;
    return next;
  }

  function saveCollection() {
    localStorage.setItem(ownerKey, JSON.stringify(collection));
    renderCoinPills();
  }

  function reloadSavedCollection() {
    collection = loadCollection(ownerKey);
    return collection;
  }

  function isModView() {
    return window.ArponOnline?.getAccountProfile?.()?.username === "MODVIEW";
  }

  function coinText() {
    return isModView() ? "∞ coins" : `${collection.coins} coin${collection.coins === 1 ? "" : "s"}`;
  }

  function renderCoinPills() {
    if (elements.deckCoinPill) elements.deckCoinPill.textContent = coinText();
    if (elements.shopCoinPill) elements.shopCoinPill.textContent = coinText();
  }

  function showDeck(message = "") {
    pendingSwap = null;
    pendingUpgrade = null;
    draftDeck = [...collection.activeDeck];
    deckDirty = false;
    elements.deckModal.hidden = false;
    elements.deckMessage.textContent = message || "Your active 18-card deck must always be 6 Heroes, 6 Armors, and 6 Weapons.";
    renderDeck();
    resetModalScroll(elements.deckModal);
  }

  function showShop(message = "") {
    elements.shopModal.hidden = false;
    elements.shopModal.classList.remove("opening-pack");
    elements.shopLayout.hidden = false;
    elements.packOpening.hidden = true;
    elements.packOpening.innerHTML = "";
    opening = null;
    elements.shopMessage.textContent = message || "Win ranked online games to earn coins. Standard packs can contain duplicates for upgrades.";
    elements.shopMessage.classList.remove("error");
    renderCoinPills();
    resetModalScroll(elements.shopModal);
  }

  function returnHome() {
    window.ArponOnline?.showHomeMenu?.();
    const lobby = document.querySelector("#lobbyModal");
    if (lobby) lobby.hidden = false;
  }

  function resetModalScroll(backdrop) {
    const modal = backdrop?.querySelector(".modal");
    requestAnimationFrame(() => {
      if (modal) modal.scrollTop = 0;
      if (backdrop) backdrop.scrollTop = 0;
    });
  }

  function editableDeck() {
    if (!draftDeck) draftDeck = [...collection.activeDeck];
    return draftDeck;
  }

  function renderDeckSaveState(text = "") {
    if (!elements.deckSaveState || !elements.saveDeckButton) return;
    const valid = validateDeck(editableDeck());
    elements.saveDeckButton.disabled = !deckDirty || !valid.ok;
    elements.saveDeckButton.textContent = deckDirty ? "Save Deck" : "Deck Saved";
    elements.deckSaveState.textContent = text || (deckDirty
      ? valid.ok ? "Unsaved changes. Save this deck to use it in games." : valid.message
      : "Saved deck is ready for games.");
    elements.deckSaveState.classList.toggle("error", !valid.ok);
    elements.deckSaveState.classList.toggle("unsaved", deckDirty && valid.ok);
  }

  function validateDeck(ids) {
    const uniqueIds = [...new Set(ids || [])].filter((id) => cardsById[id]);
    if (uniqueIds.length !== ACTIVE_PER_KIND * 3) return { ok: false, message: "Deck must have exactly 18 different cards." };
    for (const kind of ["hero", "armor", "weapon"]) {
      if (uniqueIds.filter((id) => cardsById[id]?.kind === kind).length !== ACTIVE_PER_KIND) {
        return { ok: false, message: "Deck must have 6 Heroes, 6 Armors, and 6 Weapons." };
      }
    }
    return { ok: true, message: "" };
  }

  function installSavedDeck(ids, message = "") {
    const uniqueIds = [...new Set(ids || [])].filter((id) => cardsById[id]);
    const valid = validateDeck(uniqueIds);
    if (!valid.ok) return false;
    uniqueIds.forEach((id) => {
      if (!collection.owned[id]) collection.owned[id] = { level: 0, progress: 0, isNew: false };
    });
    collection.activeDeck = uniqueIds;
    saveCollection();
    if (!elements.deckModal.hidden && !deckDirty) {
      draftDeck = [...collection.activeDeck];
      renderDeck();
      if (message) elements.deckMessage.textContent = message;
    }
    return true;
  }

  async function saveDeck() {
    const activeDeck = [...editableDeck()];
    const valid = validateDeck(activeDeck);
    if (!valid.ok) {
      elements.deckMessage.textContent = valid.message;
      renderDeckSaveState(valid.message);
      return;
    }
    collection.activeDeck = activeDeck;
    saveCollection();
    deckDirty = false;
    pendingSwap = null;
    renderDeckSaveState("Saved on this device.");
    elements.deckMessage.textContent = "Saved. Games will now draft from this active 18-card deck.";
    renderDeck();
    const saveOnline = window.ArponOnline?.saveAccountDeck;
    if (!saveOnline || !window.ArponOnline?.getAccountProfile?.()) {
      renderDeckSaveState("Saved on this device. Sign in to save the deck to your account.");
      return;
    }
    renderDeckSaveState("Saving deck to account...");
    try {
      await saveOnline(collection.activeDeck);
      renderDeckSaveState("Saved to your account. This deck stays active until you save a new one.");
    } catch (error) {
      deckDirty = true;
      renderDeckSaveState(error?.message || "Could not save deck to account.");
    }
  }

  function renderDeck() {
    renderCoinPills();
    renderDeckSaveState();
    elements.deckSwapBar.hidden = !pendingSwap;
    if (pendingSwap) elements.deckSwapText.textContent = `Swap ${cardsById[pendingSwap].name}: choose another ${cardsById[pendingSwap].kind}.`;
    elements.activeDeckColumns.innerHTML = ["hero", "armor", "weapon"].map((kind) => deckColumn(kind, true)).join("");
    elements.ownedDeckColumns.innerHTML = ["hero", "armor", "weapon"].map((kind) => deckColumn(kind, false)).join("");
  }

  function deckColumn(kind, activeOnly) {
    const activeDeck = editableDeck();
    const ids = activeOnly
      ? activeDeck.filter((id) => cardsById[id]?.kind === kind)
      : ownedIds(kind).filter((id) => !activeDeck.includes(id));
    return `<section class="deck-column ${activeOnly ? "active-column" : "owned-column"}">
      <h3>${kind === "hero" ? "Heroes" : `${titleCase(kind)}s`} <span>${ids.length}${activeOnly ? `/${ACTIVE_PER_KIND}` : ""}</span></h3>
      <div class="collection-card-list">${ids.length ? ids.map((id) => collectionCard(id, activeOnly)).join("") : `<p class="empty-collection">No extra ${kind} cards yet.</p>`}</div>
    </section>`;
  }

  function collectionCard(id, activeCard) {
    const card = cardsById[id];
    const owned = collection.owned[id] || { level: 0, progress: 0, isNew: false };
    const needed = nextUpgradeCost(owned.level);
    const canUpgrade = needed > 0 && owned.progress >= needed;
    const selectableReplacement = pendingSwap && !activeCard && cardsById[pendingSwap]?.kind === card.kind;
    const isPending = pendingSwap === id;
    const progress = needed ? Math.min(100, (owned.progress / needed) * 100) : 100;
    return `<article class="collection-card ${activeCard ? "active" : "extra"} ${owned.isNew ? "is-new" : ""} ${isPending ? "pending-swap" : ""} ${TIER_CLASSES[owned.level]}" data-collection-card="${id}">
      <button class="collection-card-image" data-view-card="${id}" type="button">
        <img src="${cardImage(card, owned.level)}" alt="${card.name}" />
        ${owned.isNew ? `<b class="new-card-dot">NEW</b>` : ""}
      </button>
      <div class="collection-card-meta">
        <strong>${card.name}</strong>
        <span>${titleCase(card.kind)} · ${TIER_NAMES[owned.level]}</span>
      </div>
      <div class="duplicate-progress ${canUpgrade ? "upgrade-ready" : ""}" data-upgrade-card="${canUpgrade ? id : ""}" style="--progress:${progress}%">
        ${progressSegments(needed || 1, owned.progress)}
      </div>
      <div class="collection-card-actions">
        <button data-view-card="${id}" type="button">View</button>
        ${activeCard ? `<button data-start-swap="${id}" type="button">Swap</button>` : selectableReplacement ? `<button data-finish-swap="${id}" type="button">Use This</button>` : ""}
        ${canUpgrade ? `<button class="upgrade-mini-button" data-upgrade-card="${id}" type="button">Upgrade</button>` : ""}
      </div>
    </article>`;
  }

  function progressSegments(needed, progress) {
    return Array.from({ length: needed }, (_, index) => `<i class="${progress > index ? "filled" : ""}"></i>`).join("");
  }

  function ownedIds(kind = null) {
    return Object.keys(collection.owned)
      .filter((id) => cardsById[id] && (!kind || cardsById[id].kind === kind))
      .sort((a, b) => cardsById[a].name.localeCompare(cardsById[b].name));
  }

  function viewCard(id) {
    markSeen(id);
    window.ArponGame?.cardDisplayImage && renderDeck();
    const card = cardsById[id];
    const modal = document.querySelector("#cardZoomModal");
    if (!card || !modal) return;
    document.querySelector("#cardZoomTitle").textContent = card.name;
    const image = document.querySelector("#cardZoomImage");
    image.src = cardImage(card, cosmeticLevel(id));
    image.alt = card.name;
    modal.hidden = false;
  }

  function startSwap(id) {
    pendingSwap = id;
    elements.deckMessage.textContent = `Choose an owned ${cardsById[id].kind} card to replace ${cardsById[id].name}.`;
    renderDeck();
  }

  function finishSwap(replacementId) {
    if (!pendingSwap || !cardsById[replacementId] || cardsById[pendingSwap].kind !== cardsById[replacementId].kind) return;
    const activeDeck = editableDeck();
    const index = activeDeck.indexOf(pendingSwap);
    if (index < 0) return;
    if (activeDeck.includes(replacementId)) {
      elements.deckMessage.textContent = "That card is already active.";
      return;
    }
    activeDeck[index] = replacementId;
    pendingSwap = null;
    deckDirty = true;
    elements.deckMessage.textContent = "Deck changed. Press Save Deck to use it in future games.";
    renderDeck();
  }

  function openUpgrade(id) {
    const card = cardsById[id];
    const owned = collection.owned[id];
    if (!card || !owned || owned.level >= 5 || owned.progress < nextUpgradeCost(owned.level)) return;
    pendingUpgrade = id;
    elements.upgradeTitle.textContent = `Upgrade ${card.name}?`;
    elements.upgradeText.textContent = `${TIER_NAMES[owned.level]} → ${TIER_NAMES[owned.level + 1]}. This changes only the art background color.`;
    elements.upgradePreview.innerHTML = `
      <article><span>Current</span><img src="${cardImage(card, owned.level)}" alt="${card.name} current" /></article>
      <article><span>Next</span><img src="${cardImage(card, owned.level + 1)}" alt="${card.name} next" /></article>`;
    elements.upgradeOverlay.hidden = false;
    resetModalScroll(elements.deckModal);
  }

  function confirmUpgrade() {
    const owned = collection.owned[pendingUpgrade];
    if (!owned) return;
    const needed = nextUpgradeCost(owned.level);
    if (owned.level >= 5 || owned.progress < needed) return;
    owned.progress -= needed;
    owned.level = clampTier(owned.level + 1);
    saveCollection();
    elements.upgradeOverlay.hidden = true;
    elements.deckMessage.textContent = "Saved. The cosmetic now appears on cards and board tokens.";
    renderDeck();
  }

  function buyPack(type) {
    const pack = PACKS[type];
    if (!pack) return;
    if (!isModView() && collection.coins < pack.cost) {
      elements.shopMessage.textContent = "Not enough coins yet. Ranked wins give 2 coins.";
      elements.shopMessage.classList.add("error");
      return;
    }
    const cardsWon = type === "novelty" ? drawNoveltyPack(pack.count) : drawStandardPack(pack.count);
    if (!cardsWon.length) {
      elements.shopMessage.textContent = "You already own every available card in this prototype.";
      return;
    }
    if (!isModView()) collection.coins -= pack.cost;
    const results = cardsWon.map(addCardResult);
    saveCollection();
    openPackAnimation(type, results);
  }

  function drawStandardPack(count) {
    const owned = ownedIds();
    const unowned = cards.map((card) => card.id).filter((id) => !collection.owned[id]);
    const duplicateCount = owned.length && unowned.length ? Math.min(3, Math.max(2, Math.floor(count / 2))) : owned.length ? count : 0;
    const picked = [];
    shuffle(owned).slice(0, duplicateCount).forEach((id) => picked.push(id));
    shuffle(unowned).slice(0, count - picked.length).forEach((id) => picked.push(id));
    while (picked.length < count && owned.length) picked.push(shuffle(owned)[0]);
    return shuffle(picked).slice(0, count);
  }

  function drawNoveltyPack(count) {
    return shuffle(cards.map((card) => card.id).filter((id) => !collection.owned[id])).slice(0, count);
  }

  function addCardResult(id) {
    const card = cardsById[id];
    const result = grantCardToCollection(id);
    return { card, duplicate: result?.duplicate, level: collection.owned[id]?.level || 0, progress: collection.owned[id]?.progress || 0 };
  }

  function grantCardToCollection(id) {
    const card = cardsById[id];
    if (!card) return null;
    if (!collection.owned[id]) {
      collection.owned[id] = { level: 0, progress: 0, isNew: true };
      return { card, duplicate: false };
    }
    collection.owned[id].progress += 1;
    return { card, duplicate: true };
  }

  function openPackAnimation(type, results) {
    opening = { type, results, index: 0, stage: "sealed", dragStart: null, dragX: 0, dragY: 0 };
    elements.shopModal.classList.add("opening-pack");
    elements.shopLayout.hidden = true;
    elements.packOpening.hidden = false;
    renderPackOpening();
    resetModalScroll(elements.shopModal);
  }

  function renderPackOpening() {
    if (!opening) return;
    const pack = PACKS[opening.type];
    if (opening.stage === "sealed") {
      elements.packOpening.innerHTML = `
        <div class="sealed-pack" data-pack-drag>
          <img src="${pack.image}" alt="${pack.title}" draggable="false" />
          <div class="rip-strip" style="--tear:${Math.max(0, opening.dragX)}px"></div>
        </div>
        <p class="collection-message">Drag across the top of the pack to rip it open.</p>`;
      bindPackDrag();
      return;
    }
    if (opening.index >= opening.results.length) {
      elements.packOpening.innerHTML = `
        <div class="pack-summary">
          <h3>Pack Opened</h3>
          <div class="pack-summary-grid">${opening.results.map(resultSummary).join("")}</div>
          <button class="primary-action large" id="finishPackButton" type="button">Back to Shop</button>
        </div>`;
      document.querySelector("#finishPackButton").addEventListener("click", () => showShop("Pack added to your collection."));
      return;
    }
    const result = opening.results[opening.index];
    elements.packOpening.innerHTML = `
      <div class="reveal-stack">
        <article class="revealed-card" data-card-swipe style="--swipe-x:${opening.dragX}px; --swipe-y:${opening.dragY}px">
          <img src="${cardImage(result.card, cosmeticLevel(result.card.id))}" alt="${result.card.name}" draggable="false" />
          <strong>${result.card.name}</strong>
          <span>${result.duplicate ? "Duplicate progress +" : "New card"}</span>
        </article>
        <div class="remaining-stack">${opening.results.length - opening.index - 1} left</div>
      </div>
      <p class="collection-message">Swipe the card away to reveal the next one.</p>`;
    bindCardSwipe();
  }

  function bindPackDrag() {
    const pack = elements.packOpening.querySelector("[data-pack-drag]");
    bindDrag(pack, (dx) => {
      opening.dragX = Math.max(0, dx);
      pack.style.setProperty("--drag-x", `${opening.dragX}px`);
      pack.querySelector(".rip-strip").style.setProperty("--tear", `${opening.dragX}px`);
    }, () => {
      if (opening.dragX > 120) {
        opening.stage = "cards";
        opening.dragX = 0;
      } else opening.dragX = 0;
      renderPackOpening();
    });
  }

  function bindCardSwipe() {
    const card = elements.packOpening.querySelector("[data-card-swipe]");
    bindDrag(card, (dx, dy) => {
      opening.dragX = dx;
      opening.dragY = dy;
      card.style.setProperty("--swipe-x", `${dx}px`);
      card.style.setProperty("--swipe-y", `${dy}px`);
    }, () => {
      if (Math.hypot(opening.dragX, opening.dragY) > 75) opening.index += 1;
      opening.dragX = 0;
      opening.dragY = 0;
      renderPackOpening();
    });
  }

  function bindDrag(element, onMove, onEnd) {
    if (!element) return;
    let activePointerId = null;
    const move = (event) => {
      if (!opening?.dragStart || activePointerId !== event.pointerId) return;
      event.preventDefault();
      onMove(event.clientX - opening.dragStart.x, event.clientY - opening.dragStart.y);
    };
    const finish = (event) => {
      if (!opening?.dragStart || activePointerId !== event.pointerId) return;
      event.preventDefault();
      opening.dragStart = null;
      activePointerId = null;
      element.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      onEnd();
    };
    element.addEventListener("pointerdown", (event) => {
      if (event.button && event.pointerType === "mouse") return;
      event.preventDefault();
      event.stopPropagation();
      element.setPointerCapture?.(event.pointerId);
      activePointerId = event.pointerId;
      opening.dragStart = { x: event.clientX, y: event.clientY };
      element.classList.add("dragging");
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    });
    element.addEventListener("dragstart", (event) => event.preventDefault());
  }

  function resultSummary(result) {
    return `<article><img src="${cardImage(result.card, cosmeticLevel(result.card.id))}" alt="${result.card.name}" /><strong>${result.card.name}</strong><span>${result.duplicate ? "Duplicate" : "New"}</span></article>`;
  }

  function cardImage(card, level = cosmeticLevel(card.id)) {
    return level > 0 ? `./assets/card-cosmetics/${card.id}_tier${level}.png` : card.image;
  }

  function activeDeckIds() {
    reloadSavedCollection();
    return [...collection.activeDeck];
  }

  function activeDeckIdsForTeam() {
    return activeDeckIds();
  }

  function cosmeticLevel(id) {
    return clampTier(collection.owned[id]?.level || 0);
  }

  function markSeen(id) {
    if (collection.owned[id]?.isNew) {
      collection.owned[id].isNew = false;
      saveCollection();
      if (!elements.deckModal.hidden) renderDeck();
    }
  }

  function awardCoins(amount) {
    if (isModView()) return;
    collection.coins += Number(amount) || 0;
    saveCollection();
  }

  function applyAccountGrants(grants = []) {
    const applied = { coins: 0, newCards: [], duplicates: [], ignored: 0 };
    let changed = false;
    grants.forEach((grant) => {
      if (grant?.grant_type === "coins") {
        const amount = Math.max(0, Number(grant.amount || 0));
        if (!amount) return;
        if (!isModView()) collection.coins += amount;
        applied.coins += amount;
        changed = true;
        return;
      }
      if (grant?.grant_type === "card") {
        const result = grantCardToCollection(grant.card_id);
        if (!result) {
          applied.ignored += 1;
          return;
        }
        if (result.duplicate) applied.duplicates.push(result.card.name);
        else applied.newCards.push(result.card.name);
        changed = true;
      }
    });
    if (!changed) return "";
    saveCollection();
    if (!elements.deckModal.hidden) renderDeck();
    const parts = [];
    if (applied.coins) parts.push(`${applied.coins} coin${applied.coins === 1 ? "" : "s"}`);
    if (applied.newCards.length) parts.push(`${applied.newCards.length} new card${applied.newCards.length === 1 ? "" : "s"}`);
    if (applied.duplicates.length) parts.push(`${applied.duplicates.length} duplicate${applied.duplicates.length === 1 ? "" : "s"}`);
    if (elements.deckMessage && !elements.deckModal.hidden && parts.length) {
      elements.deckMessage.textContent = `Creator reward claimed: ${parts.join(", ")}.`;
    }
    return parts.length ? `Creator reward claimed: ${parts.join(", ")}.` : "";
  }

  async function loadAccountDeckFromAccount() {
    const loadOnline = window.ArponOnline?.loadAccountDeck;
    if (!loadOnline || !window.ArponOnline?.getAccountProfile?.()) return false;
    try {
      const ids = await loadOnline();
      if (!Array.isArray(ids) || !ids.length) return false;
      return installSavedDeck(ids, "Loaded your saved account deck.");
    } catch (error) {
      if (!/save_arpon_account_deck|get_arpon_account_deck|function .* does not exist|schema cache/i.test(String(error?.message || error || ""))) {
        console.warn("Could not load saved account deck", error);
      }
      return false;
    }
  }

  function onAccountChanged(profile) {
    ownerKey = ownerStorageKey(profile);
    collection = loadCollection(ownerKey);
    draftDeck = null;
    deckDirty = false;
    pendingSwap = null;
    pendingUpgrade = null;
    renderCoinPills();
    if (!elements.deckModal.hidden) renderDeck();
  }

  function nextUpgradeCost(level) {
    return UPGRADE_COSTS[clampTier(level) + 1] || 0;
  }

  function clampTier(value) {
    return Math.max(0, Math.min(5, Number(value || 0)));
  }

  function titleCase(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  elements.openDeckButton?.addEventListener("click", () => showDeck());
  elements.openShopButton?.addEventListener("click", () => showShop());
  elements.closeDeckButton?.addEventListener("click", () => {
    elements.deckModal.hidden = true;
    elements.upgradeOverlay.hidden = true;
    draftDeck = null;
    deckDirty = false;
    returnHome();
  });
  elements.saveDeckButton?.addEventListener("click", saveDeck);
  elements.closeShopButton?.addEventListener("click", () => {
    elements.shopModal.hidden = true;
    elements.shopModal.classList.remove("opening-pack");
    opening = null;
    returnHome();
  });
  elements.cancelDeckSwapButton?.addEventListener("click", () => {
    pendingSwap = null;
    renderDeck();
  });
  elements.closeUpgradeButton?.addEventListener("click", () => elements.upgradeOverlay.hidden = true);
  elements.cancelUpgradeButton?.addEventListener("click", () => elements.upgradeOverlay.hidden = true);
  elements.confirmUpgradeButton?.addEventListener("click", confirmUpgrade);

  elements.deckModal?.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view-card]");
    const start = event.target.closest("[data-start-swap]");
    const finish = event.target.closest("[data-finish-swap]");
    const upgrade = event.target.closest("[data-upgrade-card]");
    if (view) viewCard(view.dataset.viewCard);
    else if (start) startSwap(start.dataset.startSwap);
    else if (finish) finishSwap(finish.dataset.finishSwap);
    else if (upgrade?.dataset.upgradeCard) openUpgrade(upgrade.dataset.upgradeCard);
  });

  elements.shopModal?.addEventListener("click", (event) => {
    const buy = event.target.closest("[data-buy-pack]");
    if (buy) buyPack(buy.dataset.buyPack);
  });
  elements.shopModal?.addEventListener("dragstart", (event) => {
    if (event.target.closest(".sealed-pack, .revealed-card")) event.preventDefault();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== ownerKey) return;
    reloadSavedCollection();
    if (!elements.deckModal.hidden) renderDeck();
    renderCoinPills();
  });

  renderCoinPills();
  function cardCatalog() {
    return cards.map((card) => ({ id: card.id, name: card.name, family: card.family, kind: card.kind }));
  }

  window.ArponCollection = {
    activeDeckIds,
    activeDeckIdsForTeam,
    cosmeticLevel,
    markSeen,
    awardCoins,
    applyAccountGrants,
    loadAccountDeckFromAccount,
    cardCatalog,
    onAccountChanged,
  };
})();
