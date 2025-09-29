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

function prepareNode(member) {
  const isDeceased = member.attributes?.lifeStatus === "Deceased";
  return {
    id: member.id,
    label: member.label,
    gender: member.gender,
    image:
      member.imageUrl && member.imageUrl.trim()
        ? member.imageUrl.trim()
        : createAvatar(member.label, member.gender, isDeceased),
    shape: "circularImage",
    borderWidth: 3,
    shadow: {
      enabled: true,
      color: isDeceased ? "rgba(107, 114, 128, 0.75)" : "rgba(79, 70, 229, 0.45)",
      size: isDeceased ? 28 : 18,
      x: 0,
      y: 4,
    },
    font: {
      size: 16,
      color: "#111827",
      face: '"Inter", "Segoe UI", sans-serif',
    },
    title: buildTooltip(member),
  };
}

function formatEdge(edge) {
  const isSpouse = edge.type === "spouse";
  const isDivorced = edge.type === "divorced";
  const colors = isSpouse
    ? { color: "#ef4444", highlight: "#b91c1c" }
    : isDivorced
    ? { color: "#9ca3af", highlight: "#4b5563" }
    : { color: "#10b981", highlight: "#047857" };
  const label = isSpouse ? "spouse" : isDivorced ? "divorced" : "parent";
  return {
    ...edge,
    label,
    color: { color: colors.color, highlight: colors.highlight },
    arrows: isSpouse || isDivorced ? undefined : "to",
    dashes: isSpouse ? true : isDivorced ? [6, 6] : false,
    smooth: {
      enabled: isSpouse || isDivorced,
      type: isDivorced ? "curvedCCW" : "curvedCW",
      roundness: 0.3,
    },
    font: {
      size: 13,
      color: "#4b5563",
      strokeColor: "#ffffff",
      strokeWidth: 3,
    },
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

function MemberDetailPanel({ member, onClose }) {
  const hasSelection = Boolean(member);
  const isDeceased = member?.attributes?.lifeStatus === "Deceased";
  const fallbackAvatar = hasSelection
    ? createAvatar(member.label, member.gender, isDeceased)
    : null;
  const customAvatar = member?.imageUrl?.trim();
  const avatar = hasSelection
    ? customAvatar && customAvatar.length > 0
      ? customAvatar
      : fallbackAvatar
    : null;
  const address = member?.attributes?.address || "";
  const otherAttributes = hasSelection
    ? Object.entries(member.attributes || {}).filter(
        ([key]) => key !== "lifeStatus" && key !== "address"
      )
    : [];
  const mapUrl = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`
    : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: "100%", md: 340 },
        borderRadius: 3,
        overflow: "hidden",
        flexShrink: 0,
        bgcolor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {hasSelection ? "Member Details" : "Select a Member"}
        </Typography>
        {hasSelection && (
          <Tooltip title="Close details">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {hasSelection ? (
          <>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={avatar}
                alt={member.label}
                imgProps={
                  customAvatar && fallbackAvatar
                    ? {
                        onError: (event) => {
                          event.target.onerror = null;
                          event.target.src = fallbackAvatar;
                        },
                      }
                    : undefined
                }
                sx={{
                  width: 72,
                  height: 72,
                  boxShadow: isDeceased
                    ? "0 0 0 4px rgba(156, 163, 175, 0.45)"
                    : "0 0 0 4px rgba(99, 102, 241, 0.35)",
                  filter: isDeceased ? "grayscale(0.65)" : "none",
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
                  {member.label}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mt: 1 }}
                >
                  <Chip
                    label={member.gender === "male" ? "Male" : "Female"}
                    color={member.gender === "male" ? "primary" : "secondary"}
                    size="small"
                  />
                  {member.attributes?.lifeStatus && (
                    <Chip
                      label={`Life: ${member.attributes.lifeStatus}`}
                      size="small"
                      color={
                        member.attributes.lifeStatus === "Deceased"
                          ? "default"
                          : "success"
                      }
                      variant={
                        member.attributes.lifeStatus === "Deceased"
                          ? "outlined"
                          : "filled"
                      }
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
            {address && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {address}
                </Typography>
                <Box
                  sx={{
                    mt: 1.5,
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: 3,
                    height: 220,
                  }}
                >
                  <iframe
                    title={`Map for ${member.label}`}
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </Box>
              </Box>
            )}
            {otherAttributes.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Attributes
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {otherAttributes.map(([key, value]) => (
                    <Box key={key}>
                      <Typography variant="body2" fontWeight={600}>
                        {key}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {value || "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
            {!address && otherAttributes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No additional attributes recorded yet.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Click a person in the graph to view their story and address.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

const {
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Autocomplete,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  ButtonGroup,
  Avatar,
  Paper,
  Alert,
} = MaterialUI;

const iconsSource =
  window.MaterialUIIcons ||
  window.MaterialUI?.IconsMaterial ||
  window.MaterialUI?.Icons ||
  {};

const fallbackIconFactory = (symbol) => (props = {}) => {
  const { sx, style, ...rest } = props;
  const host = MaterialUI?.Icon;
  if (host) {
    return React.createElement(host, { ...rest, sx }, symbol);
  }
  return React.createElement(
    "span",
    {
      ...rest,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        fontSize: "1.25rem",
        lineHeight: 1,
        ...(style || {}),
      },
    },
    symbol
  );
};

const EditIcon = iconsSource.Edit || fallbackIconFactory("✏️");
const DeleteIcon = iconsSource.Delete || fallbackIconFactory("🗑️");
const AddIcon = iconsSource.Add || fallbackIconFactory("＋");
const CloseIcon = iconsSource.Close || fallbackIconFactory("✖️");
const CheckIcon = iconsSource.Check || fallbackIconFactory("✔️");
const ExpandIcon = iconsSource.Fullscreen || fallbackIconFactory("⛶");
const CollapseIcon = iconsSource.FullscreenExit || fallbackIconFactory("🗗");

function useNetwork(members, relationships, { onSelectMember } = {}) {
  const containerRef = React.useRef(null);
  const networkRef = React.useRef(null);
  const nodesRef = React.useRef(null);
  const edgesRef = React.useRef(null);
  const selectCallbackRef = React.useRef(onSelectMember);

  const fitNetwork = React.useCallback((options = {}) => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: {
          duration: 450,
          easingFunction: "easeInOutCubic",
        },
        ...options,
      });
    }
  }, []);

  const redrawNetwork = React.useCallback(() => {
    networkRef.current?.redraw();
  }, []);

  React.useEffect(() => {
    selectCallbackRef.current = onSelectMember;
  }, [onSelectMember]);

  React.useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const nodes = new vis.DataSet(members.map(prepareNode));
    const edges = new vis.DataSet(relationships.map(formatEdge));
    nodesRef.current = nodes;
    edgesRef.current = edges;

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

    const network = new vis.Network(
      containerRef.current,
      { nodes, edges },
      options
    );
    networkRef.current = network;
    const handleSelectNode = (params) => {
      const nodeId = params?.nodes?.[0];
      if (typeof nodeId !== "undefined") {
        selectCallbackRef.current?.(nodeId);
      }
    };
    const handleDeselect = () => {
      selectCallbackRef.current?.(null);
    };
    const handleClick = (params) => {
      if (!params?.nodes?.length) {
        handleDeselect();
      }
    };
    network.on("selectNode", handleSelectNode);
    network.on("deselectNode", handleDeselect);
    network.on("click", handleClick);
    const handleStabilized = () => {
      network.setOptions({ physics: { enabled: false } });
    };
    network.on("stabilized", handleStabilized);
    network.once("stabilized", () => {
      fitNetwork();
      handleStabilized();
    });

    const handleResize = () => {
      window.requestAnimationFrame(() => {
        fitNetwork({ animation: false });
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      network.off("selectNode", handleSelectNode);
      network.off("deselectNode", handleDeselect);
      network.off("click", handleClick);
      network.off("stabilized", handleStabilized);
      network.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [fitNetwork]);

  React.useEffect(() => {
    if (!nodesRef.current) {
      return;
    }
    const nodes = nodesRef.current;
    const prepared = members.map(prepareNode);
    nodes.update(prepared);
    const existingIds = nodes.getIds();
    const newIds = prepared.map((node) => node.id);
    const toRemove = existingIds.filter((id) => !newIds.includes(id));
    if (toRemove.length) {
      nodes.remove(toRemove);
    }
    if (networkRef.current) {
      const network = networkRef.current;
      network.setOptions({ physics: { enabled: true } });
      const handleOnce = () => {
        fitNetwork({ animation: false });
        network.off("stabilized", handleOnce);
      };
      network.on("stabilized", handleOnce);
      network.stabilize();
    }
  }, [members, fitNetwork]);

  React.useEffect(() => {
    if (!edgesRef.current) {
      return;
    }
    const edges = edgesRef.current;
    const formatted = relationships.map(formatEdge);
    edges.update(formatted);
    const existingIds = edges.getIds();
    const newIds = formatted.map((edge) => edge.id);
    const toRemove = existingIds.filter((id) => !newIds.includes(id));
    if (toRemove.length) {
      edges.remove(toRemove);
    }
    if (networkRef.current) {
      const network = networkRef.current;
      const handleOnce = () => {
        fitNetwork({ animation: false });
        network.off("stabilized", handleOnce);
      };
      network.on("stabilized", handleOnce);
      network.stabilize();
    }
  }, [relationships, fitNetwork]);

  return { containerRef, fitNetwork, redrawNetwork };
}

function App() {
  const initialData = React.useMemo(() => loadFromStorage(), []);
  const [members, setMembers] = React.useState(initialData.members);
  const [relationships, setRelationships] = React.useState(
    initialData.relationships
  );
  const [tab, setTab] = React.useState("graph");
  const [graphExpanded, setGraphExpanded] = React.useState(false);

  const [memberName, setMemberName] = React.useState("");
  const [memberGender, setMemberGender] = React.useState("female");
  const [memberLifeStatus, setMemberLifeStatus] = React.useState("Alive");
  const [memberAddress, setMemberAddress] = React.useState("");
  const [memberImageUrl, setMemberImageUrl] = React.useState("");
  const [memberAttributes, setMemberAttributes] = React.useState([]);
  const [memberNameError, setMemberNameError] = React.useState("");

  const [relationshipType, setRelationshipType] = React.useState("parent");
  const [relationshipFrom, setRelationshipFrom] = React.useState("");
  const [relationshipTo, setRelationshipTo] = React.useState("");

  const [selectedMemberId, setSelectedMemberId] = React.useState(null);
  const [editingMemberId, setEditingMemberId] = React.useState(null);
  const [editingMemberDraft, setEditingMemberDraft] = React.useState(null);
  const [editingNameError, setEditingNameError] = React.useState("");
  const [alertMessage, setAlertMessage] = React.useState(null);

  const { containerRef, fitNetwork, redrawNetwork } = useNetwork(
    members,
    relationships,
    {
      onSelectMember: setSelectedMemberId,
    }
  );

  React.useEffect(() => {
    if (tab !== "graph") {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      redrawNetwork();
      fitNetwork({ animation: false });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [tab, fitNetwork, redrawNetwork]);

  React.useEffect(() => {
    if (tab !== "graph" && graphExpanded) {
      setGraphExpanded(false);
    }
  }, [tab, graphExpanded]);

  React.useEffect(() => {
    if (!graphExpanded || tab !== "graph") {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      redrawNetwork();
      fitNetwork({ animation: false });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [graphExpanded, tab, fitNetwork, redrawNetwork]);

  React.useEffect(() => {
    if (selectedMemberId && !members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(null);
    }
  }, [members, selectedMemberId]);

  React.useEffect(() => {
    if (editingMemberId && !members.some((member) => member.id === editingMemberId)) {
      setEditingMemberId(null);
      setEditingMemberDraft(null);
      setEditingNameError("");
    }
  }, [members, editingMemberId]);

  React.useEffect(() => {
    persistToStorage({ members, relationships });
  }, [members, relationships]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: "#4f46e5" },
          secondary: { main: "#0ea5e9" },
        },
      }),
    []
  );

  const selectedMember = React.useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const sortedMembers = React.useMemo(
    () => [...members].sort((a, b) => a.label.localeCompare(b.label)),
    [members]
  );

  const relationshipOptions = React.useMemo(
    () =>
      sortedMembers.map((member) => ({
        id: member.id,
        label: member.label,
      })),
    [sortedMembers]
  );

  const relationshipSecondLabel = React.useMemo(
    () =>
      relationshipType === "spouse"
        ? "Second Spouse"
        : relationshipType === "divorced"
        ? "Former Partner"
        : "Child",
    [relationshipType]
  );

  const firstPersonValue = React.useMemo(
    () =>
      relationshipOptions.find(
        (option) => option.id === Number(relationshipFrom)
      ) || null,
    [relationshipOptions, relationshipFrom]
  );

  const secondPersonValue = React.useMemo(
    () =>
      relationshipOptions.find((option) => option.id === Number(relationshipTo)) ||
      null,
    [relationshipOptions, relationshipTo]
  );

  const resetMemberForm = () => {
    setMemberName("");
    setMemberGender("female");
    setMemberLifeStatus("Alive");
    setMemberAddress("");
    setMemberImageUrl("");
    setMemberAttributes([]);
    setMemberNameError("");
  };

  const handleAddAttribute = () => {
    setMemberAttributes((prev) => [
      ...prev,
      { id: createAttributeId(), key: "", value: "" },
    ]);
  };

  const handleMemberAttributeChange = (id, field, value) => {
    setMemberAttributes((prev) =>
      prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr))
    );
  };

  const handleRemoveMemberAttribute = (id) => {
    setMemberAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const handleStartEditingMember = (member) => {
    setEditingMemberId(member.id);
    setEditingMemberDraft({
      label: member.label,
      gender: member.gender,
      lifeStatus: member.attributes?.lifeStatus || "Alive",
      address: member.attributes?.address || "",
      imageUrl: member.imageUrl || "",
      customAttributes: attributesToCustomList(member.attributes),
    });
    setEditingNameError("");
  };

  const handleCancelEditingMember = () => {
    setEditingMemberId(null);
    setEditingMemberDraft(null);
    setEditingNameError("");
  };

  const handleEditingDraftChange = (field, value) => {
    setEditingMemberDraft((prev) => {
      if (!prev) {
        return prev;
      }
      if (field === "label" && editingNameError) {
        setEditingNameError("");
      }
      return { ...prev, [field]: value };
    });
  };

  const handleAddEditingAttribute = () => {
    setEditingMemberDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        customAttributes: [
          ...prev.customAttributes,
          { id: createAttributeId(), key: "", value: "" },
        ],
      };
    });
  };

  const handleEditingAttributeChange = (id, field, value) => {
    setEditingMemberDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        customAttributes: prev.customAttributes.map((attr) =>
          attr.id === id ? { ...attr, [field]: value } : attr
        ),
      };
    });
  };

  const handleRemoveEditingAttribute = (id) => {
    setEditingMemberDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        customAttributes: prev.customAttributes.filter((attr) => attr.id !== id),
      };
    });
  };

  const handleSaveEditingMember = () => {
    if (!editingMemberDraft) {
      return;
    }
    if (!editingMemberDraft.label.trim()) {
      setEditingNameError("Name is required");
      return;
    }
    const updatedMember = {
      id: editingMemberId,
      label: editingMemberDraft.label.trim(),
      gender: editingMemberDraft.gender,
      imageUrl: editingMemberDraft.imageUrl?.trim() || "",
      attributes: compileAttributes(
        editingMemberDraft.lifeStatus,
        editingMemberDraft.customAttributes,
        editingMemberDraft.address
      ),
    };
    setMembers((prev) =>
      prev.map((member) => (member.id === editingMemberId ? updatedMember : member))
    );
    setAlertMessage("Member updated.");
    setEditingMemberId(null);
    setEditingMemberDraft(null);
    setEditingNameError("");
  };

  const handleAddMember = (event) => {
    event.preventDefault();
    if (!memberName.trim()) {
      setMemberNameError("Name is required");
      return;
    }
    const ids = members.map((member) => member.id);
    const nextId = ids.length ? Math.max(...ids) + 1 : 1;
    const newMember = {
      id: nextId,
      label: memberName.trim(),
      gender: memberGender,
      imageUrl: memberImageUrl.trim(),
      attributes: compileAttributes(
        memberLifeStatus,
        memberAttributes,
        memberAddress
      ),
    };
    setMembers((prev) => [...prev, newMember]);
    resetMemberForm();
    setAlertMessage(`Added ${newMember.label}`);
  };

  const relationshipExists = (from, to, type) => {
    return relationships.some((relationship) => {
      if (relationship.type !== type) {
        return false;
      }
      if (type === "spouse" || type === "divorced") {
        return (
          (relationship.from === from && relationship.to === to) ||
          (relationship.from === to && relationship.to === from)
        );
      }
      return relationship.from === from && relationship.to === to;
    });
  };

  const hasPartnerHistory = (memberId) =>
    relationships.some(
      (relationship) =>
        (relationship.type === "spouse" || relationship.type === "divorced") &&
        (relationship.from === memberId || relationship.to === memberId)
    );

  const handleAddRelationship = (event) => {
    event.preventDefault();
    const from = Number(relationshipFrom);
    const to = Number(relationshipTo);

    if (!from || !to || from === to) {
      setAlertMessage("Please choose two different family members.");
      return;
    }

    if (relationshipExists(from, to, relationshipType)) {
      setAlertMessage("This relationship already exists.");
      return;
    }

    if (relationshipType === "divorced") {
      const hadMarriage = relationships.some(
        (relationship) =>
          relationship.type === "spouse" &&
          ((relationship.from === from && relationship.to === to) ||
            (relationship.from === to && relationship.to === from))
      );
      if (!hadMarriage) {
        setAlertMessage("Record a spouse relationship before marking a divorce.");
        return;
      }
    }

    if (relationshipType === "parent" && !hasPartnerHistory(from)) {
      setAlertMessage(
        "Parents must have a recorded spouse or divorce before adding children."
      );
      return;
    }

    const idSuffix =
      relationshipType === "spouse"
        ? `${Math.min(from, to)}-${Math.max(from, to)}`
        : relationshipType === "divorced"
        ? `${Math.min(from, to)}~${Math.max(from, to)}`
        : `${from}>${to}`;

    const newRelationship = {
      id: idSuffix,
      from,
      to,
      type: relationshipType,
    };
    setRelationships((prev) => {
      if (relationshipType === "divorced") {
        const filtered = prev.filter(
          (relationship) =>
            !(
              relationship.type === "spouse" &&
              ((relationship.from === from && relationship.to === to) ||
                (relationship.from === to && relationship.to === from))
            )
        );
        return [...filtered, newRelationship];
      }
      return [...prev, newRelationship];
    });
    setRelationshipFrom("");
    setRelationshipTo("");
    setAlertMessage(
      relationshipType === "spouse"
        ? "Spouse relationship added."
        : relationshipType === "divorced"
        ? "Divorce recorded."
        : "Parent relationship added."
    );
  };

  const handleSaveSnapshot = () => {
    persistToStorage({ members, relationships });
    setAlertMessage("Data saved to browser.");
  };

  const handleReset = () => {
    if (confirm("Reset to sample data? This will overwrite current entries.")) {
      setMembers(clone(defaultData.members));
      setRelationships(clone(defaultData.relationships));
      resetMemberForm();
      setRelationshipType("parent");
      setRelationshipFrom("");
      setRelationshipTo("");
      setAlertMessage("Reset to sample data.");
    }
  };

  const handleReload = () => {
    const stored = loadFromStorage();
    setMembers(stored.members);
    setRelationships(stored.relationships);
    resetMemberForm();
    setRelationshipFrom("");
    setRelationshipTo("");
    setRelationshipType("parent");
    setAlertMessage("Loaded saved data.");
  };

  const handleCloseAlert = () => setAlertMessage(null);

  const renderAttributes = (member) => {
    const chips = [];
    if (member.attributes?.lifeStatus) {
      chips.push(
        <Chip
          key="lifeStatus"
          label={`Life: ${member.attributes.lifeStatus}`}
          size="small"
          color={member.attributes.lifeStatus === "Deceased" ? "default" : "success"}
          variant={member.attributes.lifeStatus === "Deceased" ? "outlined" : "filled"}
        />
      );
    }
    if (member.attributes?.address) {
      chips.push(
        <Chip
          key="address"
          label={`Address: ${member.attributes.address}`}
          size="small"
          variant="outlined"
        />
      );
    }
    Object.entries(member.attributes || {})
      .filter(([key]) => key !== "lifeStatus" && key !== "address")
      .forEach(([key, value]) => {
        chips.push(
          <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" />
        );
      });
    return chips;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          bgcolor: "#f3f4f6",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppBar position="sticky" color="primary" elevation={1}>
          <Toolbar
            sx={{
              flexWrap: "wrap",
              gap: { xs: 1.75, md: 2.5 },
              alignItems: { xs: "stretch", md: "center" },
              justifyContent: { xs: "center", md: "flex-start" },
              py: { xs: 1.5, md: 1.5 },
            }}
          >
            <Stack
              direction="row"
              spacing={1.75}
              alignItems="center"
              sx={{ flexShrink: 0, pr: { xs: 0, md: 1.5 } }}
            >
              <Avatar
                src={logoDataUri}
                alt="Family Tree Studio logo"
                sx={{
                  width: 44,
                  height: 44,
                  boxShadow: "0 12px 22px rgba(15, 23, 42, 0.25)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  bgcolor: "#fff",
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.15 }}>
                  Family Tree Studio
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.82, display: { xs: "none", sm: "block" } }}
                >
                  Visualize and enrich your family story
                </Typography>
              </Box>
            </Stack>
            <Tabs
              value={tab}
              onChange={(event, value) => setTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              textColor="inherit"
              indicatorColor="secondary"
              sx={{
                borderRadius: 9999,
                bgcolor: "rgba(255, 255, 255, 0.14)",
                px: { xs: 0.5, sm: 1.5 },
                flexGrow: 1,
                maxWidth: { xs: "100%", md: "unset" },
                ml: { xs: 0, md: 3 },
                '& .MuiTabs-flexContainer': {
                  justifyContent: { xs: "space-between", sm: "flex-start" },
                  gap: { xs: 1, sm: 0 },
                },
                '& .MuiTab-root': {
                  minHeight: 0,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 500,
                },
              }}
            >
              <Tab value="graph" label="Graph" />
              <Tab value="members" label="Members" />
              <Tab value="relationships" label="Relationships" />
            </Tabs>
          </Toolbar>
        </AppBar>

        <Container
          component="main"
          maxWidth={false}
          sx={{
            py: { xs: 3, md: 4 },
            px: { xs: 2, sm: 3, md: 4, lg: 6 },
            flexGrow: 1,
          }}
        >
          <Grid container spacing={4} alignItems="stretch">
            {!graphExpanded && (
              <Grid item xs={12} md={4} lg={3}>
                <Stack spacing={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Add Family Member
                    </Typography>
                    <Box component="form" onSubmit={handleAddMember} noValidate>
                      <Stack spacing={2.5}>
                        <TextField
                          label="Name"
                          value={memberName}
                          onChange={(event) => {
                            setMemberName(event.target.value);
                            if (memberNameError) {
                              setMemberNameError("");
                            }
                          }}
                          placeholder="e.g. Jane Doe"
                          error={Boolean(memberNameError)}
                          helperText={memberNameError || ""}
                          fullWidth
                        />
                        <FormControl fullWidth>
                          <InputLabel id="add-gender-label">Gender</InputLabel>
                          <Select
                            labelId="add-gender-label"
                            label="Gender"
                            value={memberGender}
                            onChange={(event) => setMemberGender(event.target.value)}
                          >
                            <MenuItem value="female">Female</MenuItem>
                            <MenuItem value="male">Male</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel id="add-life-status">Life Status</InputLabel>
                          <Select
                            labelId="add-life-status"
                            label="Life Status"
                            value={memberLifeStatus}
                            onChange={(event) => setMemberLifeStatus(event.target.value)}
                          >
                            <MenuItem value="Alive">Alive</MenuItem>
                            <MenuItem value="Deceased">Deceased</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          label="Address"
                          value={memberAddress}
                          onChange={(event) => setMemberAddress(event.target.value)}
                          placeholder="e.g. 123 Main St, Springfield"
                          fullWidth
                        />
                        <TextField
                          label="Photo URL"
                          value={memberImageUrl}
                          onChange={(event) => setMemberImageUrl(event.target.value)}
                          placeholder="Paste a link to a portrait"
                          fullWidth
                        />
                        <Divider textAlign="left">Custom Attributes</Divider>
                        <Stack spacing={1.5}>
                          {memberAttributes.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              Add optional descriptors like hometown or occupation.
                            </Typography>
                          )}
                          {memberAttributes.map((attr) => (
                            <Stack key={attr.id} direction="row" spacing={1} alignItems="center">
                              <TextField
                                label="Key"
                                value={attr.key}
                                onChange={(event) =>
                                  handleMemberAttributeChange(attr.id, "key", event.target.value)
                                }
                                size="small"
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                label="Value"
                                value={attr.value}
                                onChange={(event) =>
                                  handleMemberAttributeChange(attr.id, "value", event.target.value)
                                }
                                size="small"
                                sx={{ flex: 1 }}
                              />
                              <Tooltip title="Remove attribute">
                                <IconButton
                                  onClick={() => handleRemoveMemberAttribute(attr.id)}
                                  size="small"
                                >
                                  <DeleteIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ))}
                        </Stack>
                        <Button
                          variant="text"
                          onClick={handleAddAttribute}
                          startIcon={<AddIcon />}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Add attribute
                        </Button>
                        <Button type="submit" variant="contained" size="large">
                          Add Member
                        </Button>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>

                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Add Relationship
                    </Typography>
                    <Box component="form" onSubmit={handleAddRelationship} noValidate>
                      <Stack spacing={2.5}>
                        <FormControl fullWidth>
                          <InputLabel id="relationship-type-label">
                            Relationship Type
                          </InputLabel>
                          <Select
                            labelId="relationship-type-label"
                            label="Relationship Type"
                            value={relationshipType}
                            onChange={(event) => setRelationshipType(event.target.value)}
                          >
                            <MenuItem value="parent">Parent → Child</MenuItem>
                            <MenuItem value="spouse">Spouses</MenuItem>
                            <MenuItem value="divorced">Divorced</MenuItem>
                          </Select>
                        </FormControl>
                        <Autocomplete
                          options={relationshipOptions}
                          value={firstPersonValue}
                          onChange={(event, newValue) =>
                            setRelationshipFrom(newValue ? newValue.id : "")
                          }
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="First Person"
                              placeholder="Search family member"
                            />
                          )}
                          noOptionsText="No matching member"
                          fullWidth
                          size="small"
                          clearOnBlur
                          autoHighlight
                          disablePortal
                        />
                        <Autocomplete
                          options={relationshipOptions}
                          value={secondPersonValue}
                          onChange={(event, newValue) =>
                            setRelationshipTo(newValue ? newValue.id : "")
                          }
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={relationshipSecondLabel}
                              placeholder="Search family member"
                            />
                          )}
                          noOptionsText="No matching member"
                          fullWidth
                          size="small"
                          clearOnBlur
                          autoHighlight
                          disablePortal
                        />
                        <Button type="submit" variant="contained">
                          Add Relationship
                        </Button>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>

                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Storage
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Data persists automatically using localStorage in this browser.
                    </Typography>
                    <ButtonGroup orientation="vertical" fullWidth>
                      <Button onClick={handleSaveSnapshot}>
                        Save Snapshot
                      </Button>
                      <Button onClick={handleReload}>Reload Saved Data</Button>
                      <Button color="error" onClick={handleReset}>
                        Reset to Sample Data
                      </Button>
                    </ButtonGroup>
                  </CardContent>
                </Card>
                </Stack>
              </Grid>
            )}

            <Grid
              item
              xs={12}
              md={graphExpanded ? 12 : 8}
              lg={graphExpanded ? 12 : 9}
            >
              <Card elevation={2} sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                        {tab === "graph"
                          ? "Family Graph"
                          : tab === "members"
                          ? "Members Directory"
                          : "Relationship Ledger"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tab === "graph"
                          ? "Explore the family network and tap on people to view their story."
                          : tab === "members"
                          ? "Manage profiles, addresses, custom attributes, and portrait photos."
                          : "Review how everyone is connected across the family tree."}
                      </Typography>
                    </Box>
                    {tab === "graph" && (
                      <Button
                        variant={graphExpanded ? "contained" : "outlined"}
                        color="secondary"
                        startIcon={
                          graphExpanded ? (
                            <CollapseIcon fontSize="small" />
                          ) : (
                            <ExpandIcon fontSize="small" />
                          )
                        }
                        onClick={() =>
                          setGraphExpanded((prev) => {
                            const next = !prev;
                            if (!next) {
                              window.setTimeout(() => {
                                redrawNetwork();
                                fitNetwork({ animation: false });
                              }, 80);
                            }
                            return next;
                          })
                        }
                        sx={{
                          alignSelf: { xs: "stretch", sm: "flex-start" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {graphExpanded ? "Collapse graph" : "Expand graph"}
                      </Button>
                    )}
                  </Stack>

                  {tab === "graph" && (
                    <Box
                      sx={{
                        flexGrow: 1,
                        minHeight: { xs: 420, md: 540 },
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        gap: 3,
                        alignItems: { xs: "stretch", md: "stretch" },
                      }}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          flex: 1,
                          height: "100%",
                          borderRadius: 3,
                          overflow: "hidden",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div ref={containerRef} className="network-surface" />
                        {!selectedMember && (
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: { xs: 16, md: 20 },
                              left: { xs: 16, md: 24 },
                              right: { xs: 16, md: "auto" },
                              maxWidth: { xs: "100%", md: 320 },
                              bgcolor: "rgba(15, 23, 42, 0.82)",
                              color: "#f8fafc",
                              px: 2,
                              py: 1.25,
                              borderRadius: 2,
                              fontSize: 13,
                              letterSpacing: 0.1,
                              boxShadow: 6,
                              pointerEvents: "none",
                            }}
                          >
                            Tip: tap or click a family member to open their story panel.
                          </Box>
                        )}
                      </Paper>
                      {selectedMember && (
                        <MemberDetailPanel
                          member={selectedMember}
                          onClose={() => setSelectedMemberId(null)}
                        />
                      )}
                    </Box>
                  )}

                  {tab === "members" && (
                    <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Person</TableCell>
                            <TableCell>Gender</TableCell>
                            <TableCell>Attributes</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedMembers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography align="center" color="text.secondary">
                                  Add your first member to begin building the tree.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {sortedMembers.map((member) => {
                            const isDeceased = member.attributes?.lifeStatus === "Deceased";
                            const isEditing = editingMemberId === member.id;
                            const draft = isEditing && editingMemberDraft ? editingMemberDraft : null;
                            const draftAttributes = draft ? draft.customAttributes : [];
                            const fallbackAvatar = createAvatar(
                              member.label,
                              member.gender,
                              isDeceased
                            );
                            const avatarSource = (isEditing ? draft?.imageUrl : member.imageUrl)?.trim();
                            const avatar =
                              avatarSource && avatarSource.length > 0
                                ? avatarSource
                                : fallbackAvatar;
                            const secondaryLine =
                              member.attributes?.address ||
                              member.attributes?.occupation ||
                              member.attributes?.hometown ||
                              "";
                            return (
                              <TableRow key={member.id} hover selected={isEditing}>
                                <TableCell sx={{ minWidth: 220 }}>
                                  <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <Avatar
                                      src={avatar}
                                      alt={member.label}
                                      imgProps={
                                        avatarSource && avatarSource.length > 0
                                          ? {
                                              onError: (event) => {
                                                event.target.onerror = null;
                                                event.target.src = fallbackAvatar;
                                              },
                                            }
                                          : undefined
                                      }
                                      sx={{
                                        width: 48,
                                        height: 48,
                                        boxShadow: isDeceased
                                          ? "0 0 0 4px rgba(156, 163, 175, 0.45)"
                                          : "0 0 0 4px rgba(99, 102, 241, 0.35)",
                                        filter: isDeceased ? "grayscale(0.65)" : "none",
                                      }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                      {isEditing ? (
                                        <TextField
                                          label="Name"
                                          value={draft?.label ?? member.label}
                                          onChange={(event) =>
                                            handleEditingDraftChange("label", event.target.value)
                                          }
                                          size="small"
                                          fullWidth
                                          error={Boolean(editingNameError)}
                                          helperText={editingNameError || ""}
                                        />
                                      ) : (
                                        <>
                                          <Typography fontWeight={600}>{member.label}</Typography>
                                          {secondaryLine && (
                                            <Typography variant="body2" color="text.secondary">
                                              {secondaryLine}
                                            </Typography>
                                          )}
                                        </>
                                      )}
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell sx={{ minWidth: 160 }}>
                                  {isEditing ? (
                                    <FormControl fullWidth size="small">
                                      <InputLabel id={`gender-${member.id}`}>Gender</InputLabel>
                                      <Select
                                        labelId={`gender-${member.id}`}
                                        label="Gender"
                                        value={
                                          draft?.gender ?? member.gender ?? "female"
                                        }
                                        onChange={(event) =>
                                          handleEditingDraftChange("gender", event.target.value)
                                        }
                                      >
                                        <MenuItem value="female">Female</MenuItem>
                                        <MenuItem value="male">Male</MenuItem>
                                      </Select>
                                    </FormControl>
                                  ) : (
                                    <Chip
                                      label={member.gender === "male" ? "Male" : "Female"}
                                      color={member.gender === "male" ? "primary" : "secondary"}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell sx={{ minWidth: 320 }}>
                                  {isEditing ? (
                                    <Stack spacing={1.5}>
                                      <FormControl fullWidth size="small">
                                        <InputLabel id={`life-${member.id}`}>Life Status</InputLabel>
                                        <Select
                                          labelId={`life-${member.id}`}
                                          label="Life Status"
                                          value={
                                            draft?.lifeStatus ??
                                              member.attributes?.lifeStatus ??
                                              "Alive"
                                          }
                                          onChange={(event) =>
                                            handleEditingDraftChange("lifeStatus", event.target.value)
                                          }
                                        >
                                          <MenuItem value="Alive">Alive</MenuItem>
                                          <MenuItem value="Deceased">Deceased</MenuItem>
                                        </Select>
                                      </FormControl>
                                      <TextField
                                        label="Address"
                                        value={
                                          draft?.address ??
                                            member.attributes?.address ??
                                            ""
                                        }
                                        onChange={(event) =>
                                          handleEditingDraftChange("address", event.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                      />
                                      <TextField
                                        label="Photo URL"
                                        value={draft?.imageUrl ?? member.imageUrl ?? ""}
                                        onChange={(event) =>
                                          handleEditingDraftChange("imageUrl", event.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                      />
                                      <Divider textAlign="left" sx={{ fontSize: 12 }}>
                                        Custom Attributes
                                      </Divider>
                                      <Stack spacing={1.25}>
                                        {draftAttributes.length === 0 && (
                                          <Typography variant="body2" color="text.secondary">
                                            Add descriptors like hometown or occupation.
                                          </Typography>
                                        )}
                                        {draftAttributes.map((attr) => (
                                          <Stack
                                            key={attr.id}
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                          >
                                            <TextField
                                              label="Key"
                                              value={attr.key}
                                              onChange={(event) =>
                                                handleEditingAttributeChange(
                                                  attr.id,
                                                  "key",
                                                  event.target.value
                                                )
                                              }
                                              size="small"
                                              sx={{ flex: 1 }}
                                            />
                                            <TextField
                                              label="Value"
                                              value={attr.value}
                                              onChange={(event) =>
                                                handleEditingAttributeChange(
                                                  attr.id,
                                                  "value",
                                                  event.target.value
                                                )
                                              }
                                              size="small"
                                              sx={{ flex: 1 }}
                                            />
                                            <Tooltip title="Remove attribute">
                                              <IconButton
                                                onClick={() => handleRemoveEditingAttribute(attr.id)}
                                                size="small"
                                              >
                                                <DeleteIcon fontSize="inherit" />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        ))}
                                      </Stack>
                                      <Button
                                        variant="text"
                                        onClick={handleAddEditingAttribute}
                                        startIcon={<AddIcon fontSize="small" />}
                                        size="small"
                                        sx={{ alignSelf: "flex-start" }}
                                      >
                                        Add attribute
                                      </Button>
                                    </Stack>
                                  ) : (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      {renderAttributes(member)}
                                    </Stack>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {isEditing ? (
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Tooltip title="Cancel">
                                        <IconButton onClick={handleCancelEditingMember} size="small">
                                          <CloseIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Save changes">
                                        <IconButton
                                          onClick={handleSaveEditingMember}
                                          color="primary"
                                          size="small"
                                        >
                                          <CheckIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  ) : (
                                    <Tooltip title="Edit member">
                                      <IconButton onClick={() => handleStartEditingMember(member)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}

                  {tab === "relationships" && (
                    <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>From</TableCell>
                            <TableCell>To</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {relationships.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3}>
                                <Typography align="center" color="text.secondary">
                                  No relationships yet. Create one to connect your members.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {[...relationships]
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
                              const fromMember = members.find(
                                (member) => member.id === relationship.from
                              );
                              const toMember = members.find(
                                (member) => member.id === relationship.to
                              );
                              return (
                                <TableRow key={relationship.id}>
                                  <TableCell>
                                    {relationship.type === "spouse"
                                      ? "Spouses"
                                      : relationship.type === "divorced"
                                      ? "Divorced"
                                      : "Parent → Child"}
                                  </TableCell>
                                  <TableCell>{fromMember?.label || "Unknown"}</TableCell>
                                  <TableCell>{toMember?.label || "Unknown"}</TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        <Box
          component="footer"
          sx={{
            mt: "auto",
            py: { xs: 3, md: 4 },
            bgcolor: "#111827",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <Container maxWidth="xl">
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Built with family stories in mind
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255, 255, 255, 0.7)", mt: 0.5 }}
            >
              Keep your loved ones connected across devices with a responsive,
              photo-friendly tree.
            </Typography>
          </Container>
        </Box>

        {alertMessage && (
          <Alert
            severity="info"
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={handleCloseAlert}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              boxShadow: 6,
            }}
          >
            {alertMessage}
          </Alert>
        )}
      </Box>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
