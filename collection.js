(() => {
  const cards = () => window.ArponGame?.cards || [];
  const byId = () => Object.fromEntries(cards().map((card) => [card.id, card]));
  const tierNames = ["Starter", "Green", "Blue", "Purple", "Gold", "Red"];
  const tierCosts = [1, 2, 3, 4, 5];
  const elements = Object.fromEntries([
    "coinBadge", "deckButton", "shopButton", "deckModal", "shopModal", "closeDeckButton", "closeShopButton",
    "deckCoinBadge", "shopCoinBadge", "activeDeckGrid", "ownedExtrasGrid", "deckMessage", "packOpeningModal",
    "openingPack", "revealStack", "packSummary", "packOpeningEyebrow", "closePackOpeningButton", "upgradeModal",
    "upgradeComparison", "cancelUpgradeButton", "confirmUpgradeButton", "tutorialButton", "tutorialModal",
    "tutorialVisual", "tutorialStepLabel", "tutorialTitle", "tutorialText", "tutorialBackButton", "tutorialNextButton",
    "tutorialCloseButton",
  ].map((id) => [id, document.querySelector(`#${id}`)]));

  let profile = null;
  let token = localStorage.getItem("arpon-account-session");
  let data = null;
  let selectedActiveId = null;
  let upgradeCardId = null;
  let packCards = [];
  let revealIndex = 0;
  let ripStart = null;
  let tutorialIndex = 0;

  const tutorialSteps = [
    ["Welcome to Arpon Heroes", "A tactical arena game about building two Hero sets, shaping the battlefield with walls, and surviving the most turns.", "crest"],
    ["Build Your Deck", "Your account owns cards, but exactly 8 Heroes, 8 Armors, and 8 Weapons form your active 24-card deck. Only those cards enter games.", "deck"],
    ["Create Two Sets", "At the start, choose two of three offered cards from each type. Pair one Hero, one Armor, and one Weapon into each fighter set.", "sets"],
    ["Place Walls", "Players place four walls at a time until the chosen total is reached. Walls shape movement and attack lines, but never occupy squares.", "walls"],
    ["Roll and Move", "Roll once, then spend or split those steps between your two Heroes. Walls block edges; one-wall corners can be rounded diagonally.", "move"],
    ["Attack and Defend", "After movement, attack every reachable enemy you choose. Ability rolls clearly show whose card caused them and what result is needed.", "attack"],
    ["Retreat and Win", "Heroes that attacked may retreat. Knock out both enemy Heroes, or have the most combined HP when the turn limit ends.", "win"],
    ["Grow Your Collection", "Ranked wins earn 2 coins. Open packs for new cards and duplicates, then spend duplicate progress on cosmetic card upgrades.", "shop"],
  ];

  function defaultData() {
    const all = cards();
    const setA = new Set(window.ArponSetACardIds || all.filter((card) => card.sets?.includes("A")).map((card) => card.id));
    const owned = Object.fromEntries([...setA].map((id) => [id, { level: 0, duplicates: 0 }]));
    const activeDeck = ["hero", "armor", "weapon"].flatMap((kind) => all.filter((card) => setA.has(card.id) && card.kind === kind).slice(0, 8).map((card) => card.id));
    return { coins: 0, activeDeck, owned };
  }

  function storageKey() {
    return `arpon-collection-${profile?.username || "guest"}`;
  }

  function loadLocal() {
    try {
      data = JSON.parse(localStorage.getItem(storageKey())) || defaultData();
    } catch {
      data = defaultData();
    }
    ensureValidData();
  }

  function saveLocal() {
    localStorage.setItem(storageKey(), JSON.stringify(data));
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== "object") return null;
    const normalized = {
      ...raw,
      activeDeck: Array.isArray(raw.activeDeck) ? raw.activeDeck : Array.isArray(raw.active_deck) ? raw.active_deck : [],
      owned: raw.owned && typeof raw.owned === "object" ? raw.owned : {},
    };
    delete normalized.active_deck;
    return normalized;
  }

  function ensureValidData() {
    const defaults = defaultData();
    data ||= defaults;
    data.owned ||= defaults.owned;
    data.activeDeck ||= defaults.activeDeck;
    data.coins = Number(data.coins || 0);
    Object.entries(defaults.owned).forEach(([id, value]) => {
      data.owned[id] ||= value;
    });
    ["hero", "armor", "weapon"].forEach((kind) => {
      const activeOfKind = data.activeDeck.filter((id) => byId()[id]?.kind === kind);
      if (activeOfKind.length !== 8) {
        data.activeDeck = data.activeDeck.filter((id) => byId()[id]?.kind !== kind);
        data.activeDeck.push(...cards().filter((card) => card.kind === kind && data.owned[card.id]).slice(0, 8).map((card) => card.id));
      }
    });
    data.activeDeck = [...new Set(data.activeDeck)].slice(0, 24);
  }

  async function rpc(name, parameters = {}) {
    const response = await fetch("https://gfktqgtizctecrypnfan.supabase.co/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: "sb_publishable_l3b8UIl2LwcPf9w2NUchgg_FMGIoa4J",
        Authorization: "Bearer sb_publishable_l3b8UIl2LwcPf9w2NUchgg_FMGIoa4J",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parameters),
    });
    if (!response.ok) throw new Error("Collection service not installed");
    return response.json();
  }

  async function refresh() {
    loadLocal();
    if (token) {
      try {
        const remote = await rpc("get_arpon_collection", { p_session_token: token });
        if (remote?.active_deck && remote?.owned) {
          data = normalizeData(remote);
          ensureValidData();
          saveLocal();
        }
      } catch {
        // Keep the local copy available while a new database migration is being installed.
      }
    }
    renderAll();
  }

  function coinsText() {
    return profile?.is_admin ? "∞ Coins" : `${data?.coins || 0} Coins`;
  }

  function cardLevel(id) {
    return Math.max(0, Math.min(5, Number(data?.owned?.[id]?.level || 0)));
  }

  function cardTile(card, active = false, forcedLevel = null) {
    const owned = data.owned[card.id] || { level: 0, duplicates: 0 };
    const level = forcedLevel === null ? cardLevel(card.id) : forcedLevel;
    const needed = tierCosts[level] || 0;
    const ready = level < 5 && owned.duplicates >= needed;
    const sections = needed ? Array.from({ length: needed }, (_, index) => `<i class="${index < owned.duplicates ? "filled" : ""}"></i>`).join("") : "";
    return `<button class="collection-card tier-${level} ${active ? "active-card" : ""} ${selectedActiveId === card.id ? "swap-selected" : ""}" data-collection-card="${card.id}" data-active="${active}" type="button">
      <span class="card-tier">${tierNames[level]}</span><img src="${card.image}" alt="${escapeHtml(card.name)}" />
      <strong>${escapeHtml(card.name)}</strong><small>${title(card.kind)} · ${escapeHtml(card.family)}</small>
      <span class="duplicate-track ${ready ? "upgrade-ready" : ""}" data-upgrade-card="${ready ? card.id : ""}">${sections || "<i></i>"}</span>
    </button>`;
  }

  function renderColumns(ids, active) {
    const cardMap = byId();
    return ["hero", "armor", "weapon"].map((kind) => {
      const list = ids.map((id) => cardMap[id]).filter((card) => card?.kind === kind);
      const heading = kind === "hero" ? "Heroes" : `${title(kind)}s`;
      return `<section><h3>${heading} <span>${list.length}</span></h3><div>${list.map((card) => cardTile(card, active)).join("") || "<p>No cards yet.</p>"}</div></section>`;
    }).join("");
  }

  function renderAll() {
    if (!data) loadLocal();
    const coins = coinsText();
    [elements.coinBadge, elements.deckCoinBadge, elements.shopCoinBadge].forEach((element) => { if (element) element.textContent = coins; });
    if (elements.activeDeckGrid) elements.activeDeckGrid.innerHTML = renderColumns(data.activeDeck, true);
    const extras = Object.keys(data.owned).filter((id) => !data.activeDeck.includes(id));
    if (elements.ownedExtrasGrid) elements.ownedExtrasGrid.innerHTML = renderColumns(extras, false);
  }

  async function swapCard(activeId, extraId) {
    const cardMap = byId();
    if (!cardMap[activeId] || !cardMap[extraId] || cardMap[activeId].kind !== cardMap[extraId].kind || data.activeDeck.includes(extraId)) {
      showDeckMessage("Choose an extra card of the same type.", true);
      return;
    }
    if (token) {
      try {
        const remote = await rpc("swap_arpon_deck_card", { p_session_token: token, p_out_card_id: activeId, p_in_card_id: extraId });
        if (!remote?.active_deck) throw new Error("Deck was not saved");
        data = normalizeData(remote);
        ensureValidData();
      } catch {
        showDeckMessage("That swap could not be saved. Please try again.", true);
        return;
      }
    } else {
      const index = data.activeDeck.indexOf(activeId);
      data.activeDeck[index] = extraId;
    }
    saveLocal();
    selectedActiveId = null;
    showDeckMessage(`${cardMap[extraId].name} entered your active deck.`);
    renderAll();
  }

  function showDeckMessage(message, error = false) {
    elements.deckMessage.textContent = message;
    elements.deckMessage.classList.toggle("error", error);
  }

  async function buyPack(type) {
    if (!profile) {
      alert("Create or sign in to an Arpon account before opening packs.");
      return;
    }
    const cost = type === "standard" ? 4 : 5;
    if (!profile.is_admin && data.coins < cost) {
      alert(`You need ${cost} coins. Ranked wins earn 2 coins.`);
      return;
    }
    if (!confirm(`Open a ${type === "standard" ? "Standard" : "Novelty"} Extension Pack for ${cost} coins?`)) return;
    let result;
    try {
      result = await rpc("buy_arpon_pack", { p_session_token: token, p_pack_type: type });
    } catch {
      alert("The pack could not be purchased. Your coins were not spent.");
      return;
    }
    if (!result?.cards || !result?.collection) return;
    packCards = result.cards;
    data = normalizeData(result.collection);
    ensureValidData();
    saveLocal();
    renderAll();
    beginPackOpening(type);
  }

  function createLocalPack(type) {
    const pool = cards().filter((card) => card.sets?.some((set) => set === "A" || set === "B"));
    const owned = pool.filter((card) => data.owned[card.id]);
    const unowned = pool.filter((card) => !data.owned[card.id]);
    let chosen = [];
    if (type === "novelty") {
      chosen = shuffle(unowned).slice(0, 3);
      if (chosen.length < 3) alert(`Only ${chosen.length} new card${chosen.length === 1 ? " remains" : "s remain"} in Set A and Set B.`);
    } else {
      const duplicates = Math.min(owned.length, 2 + Math.floor(Math.random() * 2));
      chosen = [...shuffle(owned).slice(0, duplicates), ...shuffle(unowned).slice(0, 5 - duplicates)];
      while (chosen.length < 5) chosen.push(shuffle(pool)[0]);
      chosen = shuffle(chosen);
    }
    return chosen.map((card) => {
      const duplicate = Boolean(data.owned[card.id]);
      if (duplicate) data.owned[card.id].duplicates += 1;
      else data.owned[card.id] = { level: 0, duplicates: 0 };
      return { id: card.id, duplicate };
    });
  }

  function beginPackOpening(type) {
    revealIndex = 0;
    elements.shopModal.hidden = true;
    elements.packOpeningModal.hidden = false;
    elements.closePackOpeningButton.hidden = true;
    elements.packSummary.hidden = true;
    elements.revealStack.innerHTML = "";
    elements.packOpeningEyebrow.textContent = "Drag across the top to open";
    elements.openingPack.className = `opening-pack ${type}`;
    elements.openingPack.hidden = false;
  }

  function revealCards() {
    elements.openingPack.hidden = true;
    elements.packOpeningEyebrow.textContent = "Slide each card away to reveal the next";
    renderRevealCard();
  }

  function renderRevealCard() {
    const item = packCards[revealIndex];
    const card = byId()[item?.id];
    if (!card) {
      elements.revealStack.innerHTML = "";
      elements.packOpeningEyebrow.textContent = "Pack complete";
      elements.packSummary.hidden = false;
      elements.packSummary.innerHTML = `<strong>${packCards.filter((item) => !item.duplicate).length} new</strong><strong>${packCards.filter((item) => item.duplicate).length} duplicate${packCards.filter((item) => item.duplicate).length === 1 ? "" : "s"}</strong><span>Duplicates added cosmetic upgrade progress.</span>`;
      elements.closePackOpeningButton.hidden = false;
      return;
    }
    elements.revealStack.innerHTML = `<button class="revealed-card tier-${cardLevel(card.id)}" type="button"><img src="${card.image}" alt="${escapeHtml(card.name)}" /><span>${item.duplicate ? "Duplicate Progress" : "New Card"}</span><strong>${escapeHtml(card.name)}</strong><small>Slide or click to reveal next · ${revealIndex + 1}/${packCards.length}</small></button>`;
    elements.revealStack.querySelector("button").addEventListener("click", () => {
      elements.revealStack.firstElementChild.classList.add("slide-away");
      setTimeout(() => { revealIndex += 1; renderRevealCard(); }, 250);
    });
  }

  function openUpgrade(id) {
    const card = byId()[id];
    if (!card) return;
    upgradeCardId = id;
    const level = cardLevel(id);
    elements.upgradeComparison.innerHTML = `${cardTile(card, false, level)}<span>→</span>${cardTile(card, false, Math.min(5, level + 1))}`;
    elements.upgradeComparison.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    elements.upgradeModal.hidden = false;
  }

  async function confirmUpgrade() {
    const owned = data.owned[upgradeCardId];
    const cost = tierCosts[owned?.level || 0];
    if (!owned || owned.level >= 5 || owned.duplicates < cost) return;
    if (token) {
      try {
        const remote = await rpc("upgrade_arpon_card", { p_session_token: token, p_card_id: upgradeCardId });
        if (!remote?.active_deck) throw new Error("Upgrade was not saved");
        data = normalizeData(remote);
        ensureValidData();
      } catch {
        alert("That upgrade could not be saved. Please try again.");
        return;
      }
    } else {
      owned.duplicates -= cost;
      owned.level += 1;
    }
    saveLocal();
    elements.upgradeModal.hidden = true;
    renderAll();
  }

  function showTutorial(index = 0) {
    tutorialIndex = Math.max(0, Math.min(tutorialSteps.length - 1, index));
    const [heading, text, visual] = tutorialSteps[tutorialIndex];
    elements.tutorialModal.hidden = false;
    elements.tutorialStepLabel.textContent = `Step ${tutorialIndex + 1} of ${tutorialSteps.length}`;
    elements.tutorialTitle.textContent = heading;
    elements.tutorialText.textContent = text;
    elements.tutorialVisual.className = `tutorial-visual tutorial-${visual}`;
    elements.tutorialVisual.innerHTML = `<div><i></i><i></i><i></i><i></i></div><strong>${heading}</strong>`;
    elements.tutorialBackButton.disabled = tutorialIndex === 0;
    elements.tutorialNextButton.textContent = tutorialIndex === tutorialSteps.length - 1 ? "Finish" : "Next";
  }

  function title(value) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  elements.deckButton?.addEventListener("click", () => { elements.deckModal.hidden = false; renderAll(); });
  elements.shopButton?.addEventListener("click", () => { elements.shopModal.hidden = false; renderAll(); });
  elements.closeDeckButton?.addEventListener("click", () => { elements.deckModal.hidden = true; });
  elements.closeShopButton?.addEventListener("click", () => { elements.shopModal.hidden = true; });
  document.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-collection-card]");
    const upgrade = event.target.closest("[data-upgrade-card]");
    const buy = event.target.closest("[data-buy-pack]");
    if (upgrade?.dataset.upgradeCard) {
      event.stopPropagation();
      openUpgrade(upgrade.dataset.upgradeCard);
    } else if (cardButton) {
      const id = cardButton.dataset.collectionCard;
      if (cardButton.dataset.active === "true") {
        selectedActiveId = selectedActiveId === id ? null : id;
        showDeckMessage(selectedActiveId ? `Choose an extra ${byId()[id].kind} to replace ${byId()[id].name}.` : "Swap cancelled.");
        renderAll();
      } else if (selectedActiveId) swapCard(selectedActiveId, id);
    } else if (buy) buyPack(buy.dataset.buyPack);
  });
  elements.openingPack?.addEventListener("pointerdown", (event) => { ripStart = event.clientX; elements.openingPack.setPointerCapture(event.pointerId); });
  elements.openingPack?.addEventListener("pointerup", (event) => {
    if (ripStart !== null && Math.abs(event.clientX - ripStart) > 70) revealCards();
    ripStart = null;
  });
  elements.openingPack?.addEventListener("click", revealCards);
  elements.closePackOpeningButton?.addEventListener("click", () => { elements.packOpeningModal.hidden = true; elements.shopModal.hidden = false; renderAll(); });
  elements.cancelUpgradeButton?.addEventListener("click", () => { elements.upgradeModal.hidden = true; });
  elements.confirmUpgradeButton?.addEventListener("click", confirmUpgrade);
  elements.tutorialButton?.addEventListener("click", () => showTutorial(0));
  elements.tutorialBackButton?.addEventListener("click", () => showTutorial(tutorialIndex - 1));
  elements.tutorialNextButton?.addEventListener("click", () => {
    if (tutorialIndex === tutorialSteps.length - 1) elements.tutorialModal.hidden = true;
    else showTutorial(tutorialIndex + 1);
  });
  elements.tutorialCloseButton?.addEventListener("click", () => { elements.tutorialModal.hidden = true; });

  window.ArponCollection = {
    activeDeckIds: () => [...(data?.activeDeck || defaultData().activeDeck)],
    cosmetics: () => Object.fromEntries(Object.entries(data?.owned || {}).map(([id, item]) => [id, Number(item.level || 0)])),
    cardLevel,
    refresh,
    setProfile(nextProfile, nextToken) {
      profile = nextProfile;
      token = nextToken || null;
      refresh();
    },
  };

  refresh();
})();
