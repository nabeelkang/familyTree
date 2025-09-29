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
    nodes: nodes.get(),
    edges: edges.get(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetToDefaults() {
  nodes.clear();
  edges.clear();
  nodes.add(defaultData.nodes);
  edges.add(defaultData.edges.map(formatEdge));
  persistToStorage();
  populatePersonSelects();
}

function formatEdge(edge) {
  const isSpouse = edge.type === "spouse";
  return {
    ...edge,
    color: isSpouse ? { color: "#ef4444" } : { color: "#10b981" },
    arrows: isSpouse ? undefined : "to",
    smooth: isSpouse,
  };
}

function buildNetwork() {
  const container = document.getElementById("network");
  const options = {
    layout: { improvedLayout: true, hierarchical: false },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -5000,
        springLength: 140,
      },
    },
    edges: {
      smooth: {
        type: "continuous",
        roundness: 0.4,
      },
      font: {
        size: 12,
        color: "#4b5563",
        background: "rgba(255,255,255,0.7)",
      },
    },
    nodes: {
      shape: "box",
      borderWidth: 1,
      borderWidthSelected: 2,
      margin: 10,
      font: {
        size: 14,
        color: "#111827",
      },
    },
  };

  network = new vis.Network(container, { nodes, edges }, options);
}

function populatePersonSelects() {
  const members = nodes.get();
  [relationshipFromSelect, relationshipToSelect].forEach((select) => {
    select.innerHTML = "";
    const fragment = document.createDocumentFragment();
    members
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach((member) => {
        const option = document.createElement("option");
        option.value = member.id;
        option.textContent = member.label;
        fragment.appendChild(option);
      });
    select.appendChild(fragment);
  });
}

function initializeData() {
  const initialData = loadFromStorage();
  nodes = new vis.DataSet(initialData.nodes);
  edges = new vis.DataSet(initialData.edges.map(formatEdge));
  buildNetwork();
  populatePersonSelects();
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
  nodes.add({ id: nextId, label: name, gender });
  populatePersonSelects();
  memberNameInput.value = "";
  persistToStorage();
}

function relationshipExists(from, to, type) {
  return edges.get({
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
  }).length > 0;
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

  const idSuffix = type === "spouse" ? `${Math.min(from, to)}-${Math.max(from, to)}` : `${from}>${to}`;
  edges.add(
    formatEdge({
      id: idSuffix,
      from,
      to,
      label: type === "spouse" ? "spouse" : "parent",
      type,
    })
  );
  persistToStorage();
}

function bindEvents() {
  addMemberForm.addEventListener("submit", createMember);
  addRelationshipForm.addEventListener("submit", createRelationship);
  saveButton.addEventListener("click", persistToStorage);
  loadButton.addEventListener("click", () => {
    const stored = loadFromStorage();
    nodes.clear();
    edges.clear();
    nodes.add(stored.nodes);
    edges.add(stored.edges.map(formatEdge));
    populatePersonSelects();
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
}

initializeData();
bindEvents();
