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
      attributes: { lifeStatus: "Alive", occupation: "Engineer" },
    },
    {
      id: 2,
      label: "Mary Carter",
      gender: "female",
      attributes: { lifeStatus: "Deceased" },
    },
    {
      id: 3,
      label: "Linda Carter",
      gender: "female",
      attributes: { lifeStatus: "Alive", hometown: "Portland" },
    },
    {
      id: 4,
      label: "Kevin Carter",
      gender: "male",
      attributes: { lifeStatus: "Alive" },
    },
    {
      id: 5,
      label: "Anna Carter",
      gender: "female",
      attributes: { lifeStatus: "Alive", hobby: "Painting" },
    },
    {
      id: 6,
      label: "Paul Carter",
      gender: "male",
      attributes: { lifeStatus: "Alive" },
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
    image: createAvatar(member.label, member.gender, isDeceased),
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
    ([key]) => key !== "lifeStatus"
  );
  if (!entries.length) {
    return [];
  }
  return entries.map(([key, value]) => ({ id: createAttributeId(), key, value }));
}

function compileAttributes(lifeStatus, customAttributes) {
  const attributes = { lifeStatus };
  customAttributes.forEach((attr) => {
    const key = attr.key.trim();
    const value = attr.value.trim();
    if (key) {
      attributes[key] = value;
    }
  });
  return attributes;
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
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

function useNetwork(members, relationships) {
  const containerRef = React.useRef(null);
  const networkRef = React.useRef(null);
  const nodesRef = React.useRef(null);
  const edgesRef = React.useRef(null);

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
    network.once("stabilized", () => {
      network.fit({
        animation: {
          duration: 450,
          easingFunction: "easeInOutCubic",
        },
      });
    });

    return () => {
      network.destroy();
    };
  }, []);

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
  }, [members]);

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
  }, [relationships]);

  return containerRef;
}

function MemberEditorDialog({ open, member, onClose, onSave }) {
  const [name, setName] = React.useState(member?.label || "");
  const [gender, setGender] = React.useState(member?.gender || "female");
  const [lifeStatus, setLifeStatus] = React.useState(
    member?.attributes?.lifeStatus || "Alive"
  );
  const [customAttributes, setCustomAttributes] = React.useState(
    attributesToCustomList(member?.attributes)
  );
  const [nameError, setNameError] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setName(member?.label || "");
    setGender(member?.gender || "female");
    setLifeStatus(member?.attributes?.lifeStatus || "Alive");
    setCustomAttributes(attributesToCustomList(member?.attributes));
    setNameError("");
  }, [open, member]);

  const handleAttributeChange = (id, field, value) => {
    setCustomAttributes((prev) =>
      prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr))
    );
  };

  const handleAddAttribute = () => {
    setCustomAttributes((prev) => [
      ...prev,
      { id: createAttributeId(), key: "", value: "" },
    ]);
  };

  const handleRemoveAttribute = (id) => {
    setCustomAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    const attributes = compileAttributes(lifeStatus, customAttributes);
    onSave({
      ...member,
      label: name.trim(),
      gender,
      attributes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Member</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) {
                setNameError("");
              }
            }}
            error={Boolean(nameError)}
            helperText={nameError}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="edit-gender-label">Gender</InputLabel>
            <Select
              labelId="edit-gender-label"
              label="Gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="male">Male</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="edit-life-status">Life Status</InputLabel>
            <Select
              labelId="edit-life-status"
              label="Life Status"
              value={lifeStatus}
              onChange={(event) => setLifeStatus(event.target.value)}
            >
              <MenuItem value="Alive">Alive</MenuItem>
              <MenuItem value="Deceased">Deceased</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Custom Attributes
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={handleAddAttribute}
              >
                Add Attribute
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {customAttributes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No custom attributes yet.
                </Typography>
              )}
              {customAttributes.map((attr) => (
                <Stack key={attr.id} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Key"
                    value={attr.key}
                    onChange={(event) =>
                      handleAttributeChange(attr.id, "key", event.target.value)
                    }
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Value"
                    value={attr.value}
                    onChange={(event) =>
                      handleAttributeChange(attr.id, "value", event.target.value)
                    }
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Tooltip title="Remove attribute">
                    <IconButton onClick={() => handleRemoveAttribute(attr.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon fontSize="small" />}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function App() {
  const initialData = React.useMemo(() => loadFromStorage(), []);
  const [members, setMembers] = React.useState(initialData.members);
  const [relationships, setRelationships] = React.useState(
    initialData.relationships
  );
  const [tab, setTab] = React.useState("graph");

  const [memberName, setMemberName] = React.useState("");
  const [memberGender, setMemberGender] = React.useState("female");
  const [memberLifeStatus, setMemberLifeStatus] = React.useState("Alive");
  const [memberAttributes, setMemberAttributes] = React.useState([]);
  const [memberNameError, setMemberNameError] = React.useState("");

  const [relationshipType, setRelationshipType] = React.useState("parent");
  const [relationshipFrom, setRelationshipFrom] = React.useState("");
  const [relationshipTo, setRelationshipTo] = React.useState("");

  const [editorState, setEditorState] = React.useState({ open: false, member: null });
  const [alertMessage, setAlertMessage] = React.useState(null);

  const containerRef = useNetwork(members, relationships);

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

  const resetMemberForm = () => {
    setMemberName("");
    setMemberGender("female");
    setMemberLifeStatus("Alive");
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
      attributes: compileAttributes(memberLifeStatus, memberAttributes),
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

  const handleEditMember = (member) => {
    setEditorState({ open: true, member });
  };

  const handleSaveMember = (updated) => {
    setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
    setEditorState({ open: false, member: null });
    setAlertMessage("Member updated.");
  };

  const handleCloseEditor = () => {
    setEditorState({ open: false, member: null });
  };

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
    Object.entries(member.attributes || {})
      .filter(([key]) => key !== "lifeStatus")
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
      <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "#f3f4f6" }}>
        <AppBar position="static" color="primary" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Family Tree Studio
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Visualize and enrich your family story
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={4}>
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
                        <FormControl fullWidth>
                          <InputLabel id="relationship-from-label">First Person</InputLabel>
                          <Select
                            labelId="relationship-from-label"
                            label="First Person"
                            value={relationshipFrom}
                            onChange={(event) => setRelationshipFrom(event.target.value)}
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {relationshipOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel id="relationship-to-label">
                            {relationshipType === "spouse"
                              ? "Second Spouse"
                              : relationshipType === "divorced"
                              ? "Former Partner"
                              : "Child"}
                          </InputLabel>
                          <Select
                            labelId="relationship-to-label"
                            label={
                              relationshipType === "spouse"
                                ? "Second Spouse"
                                : relationshipType === "divorced"
                                ? "Former Partner"
                                : "Child"
                            }
                            value={relationshipTo}
                            onChange={(event) => setRelationshipTo(event.target.value)}
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {relationshipOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
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

            <Grid item xs={12} md={8} lg={9}>
              <Card elevation={2} sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <Tabs
                    value={tab}
                    onChange={(event, value) => setTab(value)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ mb: 2 }}
                  >
                    <Tab value="graph" label="Graph" />
                    <Tab value="members" label="Members" />
                    <Tab value="relationships" label="Relationships" />
                  </Tabs>

                  {tab === "graph" && (
                    <Box sx={{ flexGrow: 1, minHeight: 480 }}>
                      <Paper
                        variant="outlined"
                        sx={{ height: "100%", borderRadius: 3, overflow: "hidden" }}
                      >
                        <div ref={containerRef} className="network-surface" />
                      </Paper>
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
                            const avatar = createAvatar(
                              member.label,
                              member.gender,
                              isDeceased
                            );
                            return (
                              <TableRow key={member.id} hover>
                                <TableCell>
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar
                                      src={avatar}
                                      alt={member.label}
                                      sx={{
                                        width: 48,
                                        height: 48,
                                        boxShadow: isDeceased
                                          ? "0 0 0 4px rgba(156, 163, 175, 0.45)"
                                          : "0 0 0 4px rgba(99, 102, 241, 0.35)",
                                        filter: isDeceased ? "grayscale(0.65)" : "none",
                                      }}
                                    />
                                    <Box>
                                      <Typography fontWeight={600}>{member.label}</Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {member.attributes?.occupation || member.attributes?.hometown || ""}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={member.gender === "male" ? "Male" : "Female"}
                                    color={member.gender === "male" ? "primary" : "secondary"}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {renderAttributes(member)}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit member">
                                    <IconButton onClick={() => handleEditMember(member)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
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

        <MemberEditorDialog
          open={editorState.open}
          member={editorState.member}
          onClose={handleCloseEditor}
          onSave={handleSaveMember}
        />

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
