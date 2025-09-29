const STORAGE_KEY = "family-tree-data";
const clone =
  typeof structuredClone === "function"
    ? structuredClone
    : (value) => JSON.parse(JSON.stringify(value));

const defaultData = {
  nodes: [
    { id: 1, label: "John Carter", gender: "male" },
    { id: 2, label: "Mary Carter", gender: "female" },
    { id: 3, label: "Linda Carter", gender: "female" },
    { id: 4, label: "Kevin Carter", gender: "male" },
    { id: 5, label: "Anna Carter", gender: "female" },
    { id: 6, label: "Paul Carter", gender: "male" },
  ],
  edges: [
    { id: "1-2", from: 1, to: 2, label: "spouse", type: "spouse" },
    { id: "1-3", from: 1, to: 3, label: "spouse", type: "spouse" },
    { id: "1>4", from: 1, to: 4, label: "parent", type: "parent" },
    { id: "2>4", from: 2, to: 4, label: "parent", type: "parent" },
    { id: "1>5", from: 1, to: 5, label: "parent", type: "parent" },
    { id: "2>5", from: 2, to: 5, label: "parent", type: "parent" },
    { id: "1>6", from: 1, to: 6, label: "parent", type: "parent" },
    { id: "3>6", from: 3, to: 6, label: "parent", type: "parent" },
  ],
};

let network;
let nodes;
let edges;

const avatarCache = new Map();

const addMemberForm = document.getElementById("add-member-form");
const memberNameInput = document.getElementById("member-name");
const memberGenderSelect = document.getElementById("member-gender");
const addRelationshipForm = document.getElementById("add-relationship-form");
const relationshipTypeSelect = document.getElementById("relationship-type");
const relationshipFromSelect = document.getElementById("relationship-from");
const relationshipToSelect = document.getElementById("relationship-to");
const relationshipToLabelText = document.querySelector(
  "#relationship-to-wrapper .label-text"
);
const saveButton = document.getElementById("save-data");
const loadButton = document.getElementById("load-data");
const resetButton = document.getElementById("reset-data");
const membersTableBody = document.querySelector("#members-table tbody");
const relationshipsTableBody = document.querySelector(
  "#relationships-table tbody"
);
const viewButtons = document.querySelectorAll(".view-tabs button");
const viewPanels = document.querySelectorAll(".view-panel");

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return clone(defaultData);
    }
    const parsed = JSON.parse(saved);
    if (!parsed.nodes || !parsed.edges) {
      throw new Error("Invalid saved structure");
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to load data, using defaults", error);
    return clone(defaultData);
  }
}

function persistToStorage() {
  const data = {
    nodes: nodes.get().map(({ id, label, gender }) => ({ id, label, gender })),
    edges: edges
      .get()
      .map(({ id, from, to, label, type }) => ({ id, from, to, label, type })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetToDefaults() {
  nodes.clear();
  edges.clear();
  nodes.add(defaultData.nodes.map(prepareNode));
  edges.add(defaultData.edges.map(formatEdge));
  populatePersonSelects();
  renderMembersTable();
  renderRelationshipsTable();
  persistToStorage();
}

function formatEdge(edge) {
  const isSpouse = edge.type === "spouse";
  const colors = isSpouse
    ? { color: "#ef4444", highlight: "#b91c1c" }
    : { color: "#10b981", highlight: "#047857" };

  return {
    ...edge,
    color: { color: colors.color, highlight: colors.highlight },
    arrows: isSpouse ? undefined : "to",
    dashes: isSpouse,
    smooth: { enabled: isSpouse, type: "curvedCW", roundness: 0.3 },
    font: {
      size: 13,
      color: "#4b5563",
      strokeColor: "#ffffff",
      strokeWidth: 3,
    },
  };
}

function buildNetwork() {
  const container = document.getElementById("network");
  const options = {
    layout: { improvedLayout: true },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -3500,
        springLength: 160,
        springConstant: 0.04,
      },
    },
    edges: {
      smooth: {
        type: "continuous",
        roundness: 0.3,
      },
      selectionWidth: 1,
      hoverWidth: 0,
    },
    nodes: {
      shape: "circularImage",
      size: 42,
      borderWidth: 3,
      borderWidthSelected: 4,
      color: {
        border: "#6366f1",
        background: "#eef2ff",
        highlight: {
          border: "#4338ca",
          background: "#e0e7ff",
        },
      },
      font: {
        size: 16,
        color: "#111827",
        face: '"Inter", "Segoe UI", sans-serif',
      },
      imagePadding: { top: 12, bottom: 6 },
      margin: 12,
      shadow: true,
    },
    interaction: {
      tooltipDelay: 120,
      hover: true,
    },
  };

  network = new vis.Network(container, { nodes, edges }, options);
}

function populatePersonSelects() {
  const members = nodes.get().sort((a, b) => a.label.localeCompare(b.label));
  const selects = [relationshipFromSelect, relationshipToSelect];
  selects.forEach((select) => {
    const previous = select.value;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select";
    placeholder.disabled = true;
    if (!previous) {
      placeholder.selected = true;
    }
    select.appendChild(placeholder);

    members.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.label;
      select.appendChild(option);
    });

    if (previous && members.some((member) => String(member.id) === previous)) {
      select.value = previous;
    } else {
      select.selectedIndex = 0;
    }
  });
}

function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "?";
  }
  const [first, last] = [parts[0], parts.length > 1 ? parts[parts.length - 1] : ""];
  const initials = (first[0] || "") + (last[0] || "");
  return initials.toUpperCase();
}

function createAvatar(name, gender) {
  const key = `${gender}:${name}`;
  if (avatarCache.has(key)) {
    return avatarCache.get(key);
  }

  const palette =
    gender === "female"
      ? { bg: "#fdf2f8", border: "#f472b6", text: "#db2777" }
      : { bg: "#dbeafe", border: "#60a5fa", text: "#1d4ed8" };
  const initials = initialsFromName(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.bg}" />
          <stop offset="100%" stop-color="${palette.border}" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="28" fill="url(#grad)" stroke="${palette.border}" stroke-width="4" />
      <text x="50%" y="55%" text-anchor="middle" font-size="36" font-family="'Inter', 'Segoe UI', sans-serif" font-weight="700" fill="${palette.text}">${initials}</text>
    </svg>`;
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  const dataUri = `data:image/svg+xml;base64,${encoded}`;
  avatarCache.set(key, dataUri);
  return dataUri;
}

function prepareNode(node) {
  return {
    ...node,
    image: createAvatar(node.label, node.gender),
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (match) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[match] || match;
  });
}

function renderMembersTable() {
  const members = nodes.get().sort((a, b) => a.label.localeCompare(b.label));
  if (!members.length) {
    membersTableBody.innerHTML =
      '<tr><td colspan="2"><div class="empty-state">Add your first member to begin building the tree.</div></td></tr>';
    return;
  }

  const rows = members
    .map((member) => {
      const safeName = escapeHtml(member.label);
      const avatar = member.image || createAvatar(member.label, member.gender);
      return `<tr>
        <td>
          <div class="person-cell">
            <img src="${avatar}" alt="" aria-hidden="true" />
            <span class="person-name">${safeName}</span>
          </div>
        </td>
        <td><span class="badge ${member.gender}">${escapeHtml(member.gender)}</span></td>
      </tr>`;
    })
    .join("");
  membersTableBody.innerHTML = rows;
}

function renderRelationshipsTable() {
  const relationships = edges.get();
  if (!relationships.length) {
    relationshipsTableBody.innerHTML =
      '<tr><td colspan="3"><div class="empty-state">No relationships yet. Create one to connect your members.</div></td></tr>';
    return;
  }

  const rows = relationships
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      if (a.from !== b.from) {
        return a.from - b.from;
      }
      return a.to - b.to;
    })
    .map((relationship) => {
      const fromMember = nodes.get(relationship.from);
      const toMember = nodes.get(relationship.to);
      const typeLabel = relationship.type === "spouse" ? "Spouses" : "Parent → Child";
      const fromName = escapeHtml(fromMember?.label ?? "Unknown");
      const toName = escapeHtml(toMember?.label ?? "Unknown");
      return `<tr>
        <td class="relationship-type">${typeLabel}</td>
        <td>${fromName}</td>
        <td>${toName}</td>
      </tr>`;
    })
    .join("");
  relationshipsTableBody.innerHTML = rows;
}

function initializeData() {
  const initialData = loadFromStorage();
  nodes = new vis.DataSet(initialData.nodes.map(prepareNode));
  edges = new vis.DataSet(initialData.edges.map(formatEdge));
  buildNetwork();
  populatePersonSelects();
  renderMembersTable();
  renderRelationshipsTable();
}

function createMember(event) {
  event.preventDefault();
  const name = memberNameInput.value.trim();
  const gender = memberGenderSelect.value;

  if (!name) {
    return;
  }

  const ids = nodes.getIds();
  const nextId = ids.length ? Math.max(...ids) + 1 : 1;
  nodes.add(prepareNode({ id: nextId, label: name, gender }));
  populatePersonSelects();
  renderMembersTable();
  memberNameInput.value = "";
  memberNameInput.focus();
  persistToStorage();
}

function relationshipExists(from, to, type) {
  return (
    edges.get({
      filter: (edge) => {
        if (edge.type !== type) {
          return false;
        }
        if (type === "spouse") {
          return (
            (edge.from === from && edge.to === to) ||
            (edge.from === to && edge.to === from)
          );
        }
        return edge.from === from && edge.to === to;
      },
    }).length > 0
  );
}

function createRelationship(event) {
  event.preventDefault();

  const type = relationshipTypeSelect.value;
  const from = Number(relationshipFromSelect.value);
  const to = Number(relationshipToSelect.value);

  if (!from || !to || from === to) {
    alert("Please choose two different family members.");
    return;
  }

  if (relationshipExists(from, to, type)) {
    alert("This relationship already exists.");
    return;
  }

  const idSuffix =
    type === "spouse" ? `${Math.min(from, to)}-${Math.max(from, to)}` : `${from}>${to}`;
  edges.add(
    formatEdge({
      id: idSuffix,
      from,
      to,
      label: type === "spouse" ? "spouse" : "parent",
      type,
    })
  );
  renderRelationshipsTable();
  persistToStorage();
}

function bindEvents() {
  addMemberForm.addEventListener("submit", createMember);
  addRelationshipForm.addEventListener("submit", createRelationship);
  saveButton.addEventListener("click", () => {
    persistToStorage();
    alert("Family tree saved to this browser.");
  });
  loadButton.addEventListener("click", () => {
    const stored = loadFromStorage();
    nodes.clear();
    edges.clear();
    nodes.add(stored.nodes.map(prepareNode));
    edges.add(stored.edges.map(formatEdge));
    populatePersonSelects();
    renderMembersTable();
    renderRelationshipsTable();
  });
  resetButton.addEventListener("click", () => {
    if (confirm("Reset to sample data? This will overwrite current entries.")) {
      resetToDefaults();
    }
  });

  relationshipTypeSelect.addEventListener("change", () => {
    const isSpouse = relationshipTypeSelect.value === "spouse";
    relationshipToLabelText.textContent = isSpouse ? "Second Spouse" : "Child";
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) {
        return;
      }
      const target = button.dataset.target;
      viewButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      viewPanels.forEach((panel) =>
        panel.classList.toggle("active", panel.dataset.view === target)
      );
      if (target === "graph" && network) {
        setTimeout(() => {
          network.redraw();
          network.fit({
            animation: {
              duration: 450,
              easingFunction: "easeInOutCubic",
            },
          });
        }, 150);
      }
    });
  });
}

initializeData();
bindEvents();
relationshipTypeSelect.dispatchEvent(new Event("change"));
