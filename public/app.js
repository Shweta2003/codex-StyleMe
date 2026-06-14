const state = {
  profiles: [],
  products: [],
  selectedProfileId: "maya",
  seedProductId: null,
  recommendations: [],
  source: "heuristic",
  model: null,
  hasOpenAIKey: false,
  apiAvailable: true
};

const API_BASE_URL = String(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

const els = {
  profileList: document.querySelector("#profileList"),
  selectedProfileImage: document.querySelector("#selectedProfileImage"),
  selectedProfileName: document.querySelector("#selectedProfileName"),
  profileTags: document.querySelector("#profileTags"),
  fitGoal: document.querySelector("#fitGoal"),
  productGrid: document.querySelector("#productGrid"),
  catalogTitle: document.querySelector("#catalogTitle"),
  agentStatus: document.querySelector("#agentStatus"),
  askAgentButton: document.querySelector("#askAgentButton"),
  occasionSelect: document.querySelector("#occasionSelect"),
  styleMoodSelect: document.querySelector("#styleMoodSelect"),
  budgetRange: document.querySelector("#budgetRange"),
  budgetValue: document.querySelector("#budgetValue"),
  notesInput: document.querySelector("#notesInput"),
  assistantNote: document.querySelector("#assistantNote"),
  diagnosisList: document.querySelector("#diagnosisList"),
  outfitIdeas: document.querySelector("#outfitIdeas"),
  avoidList: document.querySelector("#avoidList"),
  searchInput: document.querySelector("#searchInput"),
  seedBanner: document.querySelector("#seedBanner")
};

init();

async function init() {
  const bootstrap = await loadBootstrap();
  state.profiles = bootstrap.profiles;
  state.products = bootstrap.products;
  state.hasOpenAIKey = bootstrap.hasOpenAIKey;
  state.model = bootstrap.model;

  const firstProfile = state.profiles[0];
  state.selectedProfileId = firstProfile.id;
  syncControlsToProfile(firstProfile);
  renderProfiles();
  renderSelectedProfile();
  bindEvents();
  await requestRecommendations();
}

function bindEvents() {
  els.askAgentButton.addEventListener("click", () => requestRecommendations());
  els.occasionSelect.addEventListener("change", () => requestRecommendations());
  els.styleMoodSelect.addEventListener("change", () => requestRecommendations());
  els.budgetRange.addEventListener("input", () => {
    els.budgetValue.textContent = `$${els.budgetRange.value}`;
  });
  els.budgetRange.addEventListener("change", () => requestRecommendations());
  els.notesInput.addEventListener("change", () => requestRecommendations());
  document.querySelectorAll("input[name='fit']").forEach((input) => {
    input.addEventListener("change", () => requestRecommendations());
  });
  els.searchInput.addEventListener("input", () => renderProducts());
}

function renderProfiles() {
  els.profileList.innerHTML = "";
  for (const profile of state.profiles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `profile-card ${profile.id === state.selectedProfileId ? "is-active" : ""}`;
    button.innerHTML = `
      <img src="${profile.image}" alt="${profile.name}" />
      <span>
        <strong>${profile.name}</strong>
        <span>${profile.age} yrs | ${label(profile.bodyType)} | ${label(profile.faceShape)}</span>
        <span>${profile.styleWords.slice(0, 2).join(", ")}</span>
      </span>
    `;
    button.addEventListener("click", async () => {
      state.selectedProfileId = profile.id;
      state.seedProductId = null;
      syncControlsToProfile(profile);
      renderProfiles();
      renderSelectedProfile();
      await requestRecommendations();
    });
    els.profileList.append(button);
  }
}

function renderSelectedProfile() {
  const profile = selectedProfile();
  els.selectedProfileImage.src = profile.image;
  els.selectedProfileImage.alt = profile.name;
  els.selectedProfileName.textContent = `${profile.name}, ${profile.age}`;
  els.fitGoal.textContent = profile.mockAnalysis.fitGoal;
  els.profileTags.innerHTML = [
    profile.genderPresentation,
    profile.size,
    profile.bodyType,
    profile.faceShape,
    profile.mockAnalysis.faceCut,
    profile.mockAnalysis.verticalLine
  ]
    .map((tag) => `<span class="tag">${label(tag)}</span>`)
    .join("");
}

async function requestRecommendations() {
  els.askAgentButton.disabled = true;
  els.askAgentButton.textContent = "Styling...";
  updateStatus("Thinking");

  const payload = {
    profileId: state.selectedProfileId,
    seedProductId: state.seedProductId,
    preferences: collectPreferences()
  };

  try {
    const data = state.apiAvailable
      ? await fetchJson(apiUrl("/api/recommendations"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      : window.CLIENT_RECOMMENDER.recommend({
          profiles: state.profiles,
          products: state.products,
          profileId: payload.profileId,
          preferences: payload.preferences,
          seedProductId: payload.seedProductId
        });
    state.recommendations = data.products;
    state.source = data.source;
    state.model = data.model || state.model;
    renderAssistant(data);
    renderProducts();
    renderSeedBanner(data.similarTo);
    updateStatus(data.source === "openai-agent" ? `OpenAI ${data.model}` : state.apiAvailable ? "Local heuristic" : "Static demo");
  } catch (error) {
    console.error(error);
    updateStatus("Offline");
  } finally {
    els.askAgentButton.disabled = false;
    els.askAgentButton.textContent = "Ask stylist agent";
  }
}

async function loadBootstrap() {
  try {
    const bootstrap = await fetchJson(apiUrl("/api/bootstrap"));
    state.apiAvailable = true;
    return bootstrap;
  } catch {
    state.apiAvailable = false;
    return window.DEMO_DATA;
  }
}

function renderProducts() {
  const query = els.searchInput.value.trim().toLowerCase();
  const products = state.recommendations.filter((product) => {
    if (!query) {
      return true;
    }
    return [product.name, product.category, product.description, ...(product.styles ?? []), ...(product.colors ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  els.catalogTitle.textContent = state.seedProductId ? "Similar matches" : "Matches";
  els.productGrid.innerHTML = products.map(productCard).join("");
  els.productGrid.querySelectorAll("[data-product-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.seedProductId = button.dataset.productId;
      await requestRecommendations();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function productCard(product) {
  const reasons = (product.reasons ?? []).slice(0, 3).map((reason) => `<li>${reason}</li>`).join("");
  const badges = (product.badges ?? [product.category]).slice(0, 3).map((badge) => `<span class="badge">${label(badge)}</span>`).join("");

  return `
    <article class="product-card">
      <button class="product-image" data-product-id="${product.id}" style="background-image: url('${product.image}')" aria-label="Find products similar to ${product.name}"></button>
      <div class="product-info">
        <div class="product-title-row">
          <strong>${product.name}</strong>
          <span class="price">$${product.price}</span>
        </div>
        <p class="product-description">${product.description}</p>
        <div class="badge-row">${badges}</div>
        <ul class="reason-list">${reasons}</ul>
      </div>
    </article>
  `;
}

function renderAssistant(data) {
  els.assistantNote.textContent = data.assistantNote || "Recommendations are ready.";
  els.diagnosisList.innerHTML = (data.styleDiagnosis ?? [])
    .map((item) => `<li>${item}</li>`)
    .join("");
  els.avoidList.innerHTML = (data.avoid ?? [])
    .map((item) => `<li>${item}</li>`)
    .join("");

  const productNames = new Map(state.products.map((product) => [product.id, product.name]));
  els.outfitIdeas.innerHTML = (data.outfitIdeas ?? [])
    .map(
      (outfit) => `
        <article class="outfit-card">
          <strong>${outfit.title}</strong>
          <div class="tag-row">
            ${(outfit.productIds ?? [])
              .map((id) => `<span class="tag">${productNames.get(id) ?? id}</span>`)
              .join("")}
          </div>
          <p>${outfit.reason}</p>
        </article>
      `
    )
    .join("");
}

function renderSeedBanner(similarTo) {
  if (!similarTo) {
    els.seedBanner.classList.add("is-hidden");
    els.seedBanner.innerHTML = "";
    return;
  }

  els.seedBanner.classList.remove("is-hidden");
  els.seedBanner.innerHTML = `
    <span>Showing items similar to <strong>${similarTo.name}</strong>.</span>
    <button type="button" id="clearSeedButton">Clear</button>
  `;
  document.querySelector("#clearSeedButton").addEventListener("click", async () => {
    state.seedProductId = null;
    await requestRecommendations();
  });
}

function syncControlsToProfile(profile) {
  els.occasionSelect.value = profile.defaultOccasion;
  els.budgetRange.value = profile.defaultBudget;
  els.budgetValue.textContent = `$${profile.defaultBudget}`;
  els.styleMoodSelect.value = profile.id === "sam" ? "street" : profile.id === "elena" || profile.id === "lina" ? "comfort" : "classic";
  document.querySelector("input[name='fit'][value='balanced']").checked = true;
  els.notesInput.value = "";
}

function collectPreferences() {
  return {
    occasion: els.occasionSelect.value,
    styleMood: els.styleMoodSelect.value,
    fit: document.querySelector("input[name='fit']:checked").value,
    budget: Number(els.budgetRange.value),
    notes: els.notesInput.value,
    colors: selectedProfile().defaultPalette
  };
}

function selectedProfile() {
  return state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? state.profiles[0];
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function updateStatus(text) {
  els.agentStatus.textContent = text;
}

function label(value) {
  return String(value ?? "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
