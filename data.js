(function (global) {
  const STORAGE_KEY = "family-tree-data";
  const clone =
    typeof structuredClone === "function"
      ? structuredClone
      : (value) => JSON.parse(JSON.stringify(value));

  const defaultData = {
    members: [
      {
        id: 1,
        label: "John Carter",
        gender: "male",
        imageUrl:
          "https://as1.ftcdn.net/v2/jpg/04/97/66/28/1000_F_497662812_7rGW6PMBJR9AbrKcGgN5S1luXYTjH92i.jpg",
        attributes: {
          lifeStatus: "Alive",
          occupation: "Engineer",
          address: "1200 Pine St, Seattle, WA",
        },
      },
      {
        id: 2,
        label: "Mary Carter",
        gender: "female",
        imageUrl:
          "https://as2.ftcdn.net/v2/jpg/14/16/03/35/1000_F_1416033509_ud5Bt37B3E58hEyA10qfpmP5nWg82ozR.jpg",
        attributes: { lifeStatus: "Deceased", address: "45 Maple Ave, Eugene, OR" },
      },
      {
        id: 3,
        label: "Linda Carter",
        gender: "female",
        imageUrl:
          "https://as1.ftcdn.net/v2/jpg/14/15/98/22/1000_F_1415982213_5ZWydXIlynLcIC7RZnwokKdfdnkGYtE2.jpg",
        attributes: {
          lifeStatus: "Alive",
          hometown: "Portland",
          address: "300 Riverwalk Dr, Portland, OR",
        },
      },
      {
        id: 4,
        label: "Kevin Carter",
        gender: "male",
        imageUrl:
          "https://as1.ftcdn.net/v2/jpg/15/13/67/74/1000_F_1513677460_9ZE0mmpsntQgSTfQwWPpkMa2ToXf94SO.jpg",
        attributes: { lifeStatus: "Alive", address: "102 Garden Ln, Spokane, WA" },
      },
      {
        id: 5,
        label: "Anna Carter",
        gender: "female",
        imageUrl:
          "https://as2.ftcdn.net/v2/jpg/15/10/18/95/1000_F_1510189551_ePTgGmk7kBLeeXFKdquoRELJsSvldUao.jpg",
        attributes: {
          lifeStatus: "Alive",
          hobby: "Painting",
          address: "780 Sunset Blvd, Boise, ID",
        },
      },
      {
        id: 6,
        label: "Paul Carter",
        gender: "male",
        imageUrl:
          "https://as2.ftcdn.net/v2/jpg/15/07/83/75/1000_F_1507837582_4PfjhXazq5b6L57hvgrTKh37EScUKrND.webp",
        attributes: { lifeStatus: "Alive", address: "18 Orchard Rd, Salem, OR" },
      },
    ],
    relationships: [
      { id: "1~2", from: 1, to: 2, type: "divorced" },
      { id: "1-3", from: 1, to: 3, type: "spouse" },
      { id: "1>4", from: 1, to: 4, type: "parent" },
      { id: "2>4", from: 2, to: 4, type: "parent" },
      { id: "1>5", from: 1, to: 5, type: "parent" },
      { id: "2>5", from: 2, to: 5, type: "parent" },
      { id: "1>6", from: 1, to: 6, type: "parent" },
      { id: "3>6", from: 3, to: 6, type: "parent" },
    ],
  };

  const avatarCache = new Map();

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="family-tree-logo" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60a5fa" />
        <stop offset="100%" stop-color="#4f46e5" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#family-tree-logo)" />
    <path d="M32 16c-6.627 0-12 5.373-12 12 0 5.029 3.157 9.312 7.573 10.961L24 48h16l-3.573-9.039C40.843 37.312 44 33.029 44 28c0-6.627-5.373-12-12-12z" fill="#f8fafc" stroke="#e0e7ff" stroke-width="2" stroke-linejoin="round" />
    <circle cx="32" cy="24" r="4" fill="#4f46e5" opacity="0.75" />
  </svg>`;
  const logoDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`;

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return clone(defaultData);
      }
      const parsed = JSON.parse(stored);
      if (parsed.members && parsed.relationships) {
        return {
          members: parsed.members.map(normalizeMember),
          relationships: parsed.relationships.map(normalizeRelationship),
        };
      }
      if (parsed.nodes && parsed.edges) {
        return {
          members: parsed.nodes.map((node) =>
            normalizeMember({
              id: node.id,
              label: node.label,
              gender: node.gender,
              imageUrl: node.image,
              attributes: node.attributes || { lifeStatus: "Alive" },
            })
          ),
          relationships: parsed.edges.map((edge) =>
            normalizeRelationship({
              id: edge.id,
              from: edge.from,
              to: edge.to,
              type: edge.type || (edge.label === "spouse" ? "spouse" : "parent"),
            })
          ),
        };
      }
      throw new Error("Unexpected storage format");
    } catch (error) {
      console.warn("Failed to load from storage", error);
      return clone(defaultData);
    }
  }

  function persistToStorage(data) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        members: data.members.map((member) => ({
          id: member.id,
          label: member.label,
          gender: member.gender,
          imageUrl: member.imageUrl,
          attributes: member.attributes,
        })),
        relationships: data.relationships.map((relationship) => ({
          id: relationship.id,
          from: relationship.from,
          to: relationship.to,
          type: relationship.type,
        })),
      })
    );
  }

  function normalizeMember(member) {
    return {
      id: member.id,
      label: member.label,
      gender: member.gender === "male" ? "male" : "female",
      imageUrl:
        typeof member.imageUrl === "string" && member.imageUrl.trim()
          ? member.imageUrl.trim()
          : "",
      attributes: {
        lifeStatus: member.attributes?.lifeStatus === "Deceased" ? "Deceased" : "Alive",
        ...Object.fromEntries(
          Object.entries(member.attributes || {})
            .filter(([key]) => key !== "lifeStatus")
            .map(([key, value]) => [key, value])
        ),
      },
    };
  }

  function normalizeRelationship(relationship) {
    const normalizedType =
      relationship.type === "spouse"
        ? "spouse"
        : relationship.type === "divorced"
        ? "divorced"
        : "parent";
    return {
      id: relationship.id,
      from: relationship.from,
      to: relationship.to,
      type: normalizedType,
    };
  }

  function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return "?";
    }
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return ((first[0] || "") + (last[0] || "")).toUpperCase();
  }

  function createAvatar(name, gender, isDeceased) {
    const key = `${gender}:${name}:${isDeceased}`;
    if (avatarCache.has(key)) {
      return avatarCache.get(key);
    }

    const palette = isDeceased
      ? { bg: "#f3f4f6", border: "#9ca3af", text: "#4b5563" }
      : gender === "female"
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

  const emptyAvatarAssets = {
    avatar: "",
    fallbackAvatar: "",
    customAvatar: "",
    isDeceased: false,
  };

  function getMemberAvatarAssets(member) {
    if (!member) {
      return emptyAvatarAssets;
    }
    const isDeceased = member.attributes?.lifeStatus === "Deceased";
    const fallbackAvatar = createAvatar(member.label, member.gender, isDeceased);
    const customAvatar = member.imageUrl?.trim() || "";
    const avatar = customAvatar ? customAvatar : fallbackAvatar;
    return { avatar, fallbackAvatar, customAvatar, isDeceased };
  }

  function buildTooltip(member) {
    const parts = [`<strong>${escapeHtml(member.label)}</strong>`];
    const attrs = member.attributes || {};
    const attrLines = Object.entries(attrs)
      .map(([key, value]) => `<div><span class="tooltip-label">${escapeHtml(key)}</span>: ${escapeHtml(value)}</div>`);
    if (attrLines.length) {
      parts.push(...attrLines);
    }
    return parts.join("");
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

  function getNodePalette(gender, isDeceased) {
    if (isDeceased) {
      return { border: "#9ca3af", background: "#f3f4f6", accent: "#4b5563" };
    }
    return gender === "female"
      ? { border: "#f472b6", background: "#fdf2f8", accent: "#db2777" }
      : { border: "#60a5fa", background: "#dbeafe", accent: "#1d4ed8" };
  }

  function prepareNode(member) {
    const isDeceased = member.attributes?.lifeStatus === "Deceased";
    const palette = getNodePalette(member.gender, isDeceased);
    const image =
      member.imageUrl && member.imageUrl.trim()
        ? member.imageUrl.trim()
        : createAvatar(member.label, member.gender, isDeceased);
    return {
      id: member.id,
      label: member.label,
      gender: member.gender,
      image,
      palette,
      isDeceased,
      lifeStatus: member.attributes?.lifeStatus || "Alive",
      member,
      tooltipHtml: buildTooltip(member),
    };
  }

  function formatEdge(edge) {
    const isSpouse = edge.type === "spouse";
    const isDivorced = edge.type === "divorced";
    const color = isSpouse ? "#ef4444" : isDivorced ? "#9ca3af" : "#10b981";
    const highlight = isSpouse ? "#b91c1c" : isDivorced ? "#4b5563" : "#0f766e";
    return {
      ...edge,
      color,
      highlight,
      labelText: isSpouse
        ? "Spouse"
        : isDivorced
        ? "Divorced"
        : "Parent → Child",
      dashArray: isSpouse ? "6,6" : isDivorced ? "4,8" : null,
      distance: isSpouse ? 200 : isDivorced ? 220 : 150,
      strength: isSpouse || isDivorced ? 0.5 : 0.9,
    };
  }

  function createAttributeId() {
    return `attr-${Math.random().toString(36).slice(2, 10)}`;
  }

  function attributesToCustomList(attributes) {
    const entries = Object.entries(attributes || {}).filter(
      ([key]) => key !== "lifeStatus" && key !== "address"
    );
    if (!entries.length) {
      return [];
    }
    return entries.map(([key, value]) => ({ id: createAttributeId(), key, value }));
  }

  function compileAttributes(lifeStatus, customAttributes, address = "") {
    const attributes = { lifeStatus };
    const trimmedAddress = address.trim();
    if (trimmedAddress) {
      attributes.address = trimmedAddress;
    }
    customAttributes.forEach((attr) => {
      const key = attr.key.trim();
      const value = attr.value.trim();
      if (key) {
        attributes[key] = value;
      }
    });
    return attributes;
  }

  global.FamilyTreeData = {
    STORAGE_KEY,
    clone,
    defaultData,
    loadFromStorage,
    persistToStorage,
    normalizeMember,
    normalizeRelationship,
    createAttributeId,
    attributesToCustomList,
    compileAttributes,
    getMemberAvatarAssets,
    emptyAvatarAssets,
    createAvatar,
    prepareNode,
    formatEdge,
    logoDataUri,
  };

})(window);
