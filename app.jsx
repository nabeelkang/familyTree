const {
  loadFromStorage,
  persistToStorage,
  clone,
  defaultData,
  getMemberAvatarAssets,
  emptyAvatarAssets,
  createAttributeId,
  attributesToCustomList,
  compileAttributes,
  createAvatar,
  prepareNode,
  formatEdge,
  logoDataUri,
} = window.FamilyTreeData;

function MemberDetailPanel({ member, onClose }) {
  const hasSelection = Boolean(member);
  const { avatar, fallbackAvatar, customAvatar, isDeceased } = hasSelection
    ? getMemberAvatarAssets(member)
    : emptyAvatarAssets;
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
  InputAdornment,
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
const SearchIcon = iconsSource.Search || fallbackIconFactory("🔍");

function useNetwork(
  members,
  relationships,
  { onSelectMember, selectedMemberId } = {}
) {
  const containerRef = React.useRef(null);
  const stateRef = React.useRef(null);
  const simulationRef = React.useRef(null);
  const selectCallbackRef = React.useRef(onSelectMember);
  const selectedIdRef = React.useRef(selectedMemberId ?? null);

  React.useEffect(() => {
    selectCallbackRef.current = onSelectMember;
  }, [onSelectMember]);

  React.useEffect(() => {
    selectedIdRef.current = selectedMemberId ?? null;
    const state = stateRef.current;
    state?.updateNodeStyles?.();
  }, [selectedMemberId]);

  const fitNetwork = React.useCallback((options = {}) => {
    const d3 = window.d3;
    const state = stateRef.current;
    const simulation = simulationRef.current;
    if (!d3 || !state || !simulation) {
      return;
    }
    const nodes = simulation.nodes();
    if (!nodes.length) {
      return;
    }
    const width = state.size.width || 1;
    const height = state.size.height || 1;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });

    if (!isFinite(minX) || !isFinite(minY)) {
      return;
    }

    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const padding = 160;
    const scaleX = (width - padding) / spanX;
    const scaleY = (height - padding) / spanY;
    const safeScale = Math.max(
      Math.min(Math.min(scaleX, scaleY), 2.6),
      0.35
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const translateX = width / 2 - safeScale * centerX;
    const translateY = height / 2 - safeScale * centerY;

    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(safeScale);

    const svg = state.svg;
    const zoom = state.zoomBehavior;
    if (!svg || !zoom) {
      return;
    }

    if (options.animation === false) {
      svg.call(zoom.transform, transform);
    } else {
      svg
        .transition()
        .duration(options.duration ?? 520)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, transform);
    }
  }, []);

  const redrawNetwork = React.useCallback(() => {
    const simulation = simulationRef.current;
    if (simulation) {
      simulation.alpha(0.45).restart();
    }
  }, []);

  React.useEffect(() => {
    const d3 = window.d3;
    if (!containerRef.current || !d3) {
      return undefined;
    }
    const container = containerRef.current;
    container.innerHTML = "";

    const svg = d3
      .select(container)
      .append("svg")
      .attr("class", "network-canvas")
      .attr("width", "100%")
      .attr("height", "100%");

    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", "node-avatar-clip")
      .attr("clipPathUnits", "objectBoundingBox")
      .append("circle")
      .attr("cx", 0.5)
      .attr("cy", 0.5)
      .attr("r", 0.5);

    defs
      .append("marker")
      .attr("id", "arrow-parent")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
      .attr("markerUnits", "strokeWidth")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#10b981");

    const zoomGroup = svg.append("g").attr("class", "network-zoom");
    const linkGroup = zoomGroup.append("g").attr("class", "network-links");
    const labelGroup = zoomGroup.append("g").attr("class", "network-link-labels");
    const nodeGroup = zoomGroup.append("g").attr("class", "network-nodes");

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.35, 2.75])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    const tooltip = document.createElement("div");
    tooltip.className = "network-tooltip";
    container.appendChild(tooltip);

    const size = {
      width: container.clientWidth || 800,
      height: container.clientHeight || 600,
    };
    svg.attr("viewBox", `0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== container) {
          continue;
        }
        size.width = entry.contentRect.width;
        size.height = entry.contentRect.height;
        svg.attr(
          "viewBox",
          `0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`
        );
        if (simulationRef.current) {
          simulationRef.current.force(
            "center",
            d3.forceCenter(size.width / 2, size.height / 2)
          );
          simulationRef.current.alpha(0.35).restart();
          window.requestAnimationFrame(() => fitNetwork({ animation: false }));
        }
      }
    });
    resizeObserver.observe(container);

    stateRef.current = {
      container,
      svg,
      defs,
      zoomGroup,
      linkGroup,
      labelGroup,
      nodeGroup,
      tooltip,
      zoomBehavior,
      size,
      resizeObserver,
      updateNodeStyles: null,
      nodeSelection: null,
      linkSelection: null,
      labelSelection: null,
    };

    return () => {
      resizeObserver.disconnect();
      svg.on(".zoom", null);
      tooltip.remove();
      svg.remove();
      stateRef.current = null;
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [fitNetwork]);

  React.useEffect(() => {
    const d3 = window.d3;
    const state = stateRef.current;
    if (!state || !d3) {
      return undefined;
    }

    const tooltip = state.tooltip;
    const hideTooltip = () => {
      tooltip.classList.remove("show");
      tooltip.style.transform = "translate3d(-9999px, -9999px, 0)";
    };

    const updateTooltipPosition = (event) => {
      const rect = state.container.getBoundingClientRect();
      const x = event.clientX - rect.left + 16;
      const y = event.clientY - rect.top + 18;
      tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const showTooltip = (event, node) => {
      tooltip.innerHTML = node.tooltipHtml;
      tooltip.classList.add("show");
      updateTooltipPosition(event);
    };

    hideTooltip();

    const nodes = members.map(prepareNode);
    const links = relationships.map((relationship) => {
      const formatted = formatEdge(relationship);
      return { ...formatted, source: formatted.from, target: formatted.to };
    });

    const linkSelection = state.linkGroup
      .selectAll("line.network-link")
      .data(links, (d) => d.id);
    linkSelection.exit().remove();
    const linkEnter = linkSelection
      .enter()
      .append("line")
      .attr("class", "network-link")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round");
    const mergedLinks = linkEnter.merge(linkSelection);
    mergedLinks
      .attr("stroke", (d) => d.color)
      .attr("stroke-dasharray", (d) => d.dashArray || null)
      .attr("opacity", (d) => (d.type === "divorced" ? 0.85 : 1))
      .attr("marker-end", (d) =>
        d.type === "parent" ? "url(#arrow-parent)" : null
      );

    const labelsData = links.filter((link) => Boolean(link.labelText));
    const labelSelection = state.labelGroup
      .selectAll("text.network-link-label")
      .data(labelsData, (d) => d.id);
    labelSelection.exit().remove();
    const labelEnter = labelSelection
      .enter()
      .append("text")
      .attr("class", "network-link-label")
      .attr("text-anchor", "middle");
    const mergedLabels = labelEnter.merge(labelSelection);
    mergedLabels
      .text((d) => d.labelText)
      .attr("fill", (d) => d.highlight);

    const dragBehavior = d3
      .drag()
      .on("start", (event, node) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0.3).restart();
        }
        node.fx = node.x;
        node.fy = node.y;
      })
      .on("drag", (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on("end", (event, node) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
        node.fx = null;
        node.fy = null;
      });

    const nodeSelection = state.nodeGroup
      .selectAll("g.network-node")
      .data(nodes, (d) => d.id);
    nodeSelection.exit().remove();
    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "network-node")
      .style("cursor", "pointer");
    nodeEnter
      .append("circle")
      .attr("class", "node-ring")
      .attr("r", 40)
      .attr("stroke-width", 3);
    nodeEnter
      .append("image")
      .attr("class", "node-image")
      .attr("x", -40)
      .attr("y", -40)
      .attr("width", 80)
      .attr("height", 80)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("clip-path", "url(#node-avatar-clip)");
    nodeEnter
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("y", 48);
    nodeEnter.append("title");

    nodeEnter.call(dragBehavior);
    nodeSelection.call(dragBehavior);

    const mergedNodes = nodeEnter.merge(nodeSelection);
    mergedNodes.classed("is-deceased", (d) => d.isDeceased);
    mergedNodes.select("text.node-label").text((d) => d.label);
    mergedNodes
      .select("image.node-image")
      .attr("href", (d) => d.image)
      .attr("x", -40)
      .attr("y", -40)
      .attr("width", 80)
      .attr("height", 80)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .style("filter", (d) => (d.isDeceased ? "grayscale(0.6)" : "none"));
    mergedNodes.select("title").text((d) => d.label);

    mergedNodes
      .on("mouseenter", (event, node) => {
        showTooltip(event, node);
      })
      .on("mousemove", (event) => {
        updateTooltipPosition(event);
      })
      .on("mouseleave", () => {
        hideTooltip();
      })
      .on("click", (event, node) => {
        event.stopPropagation();
        hideTooltip();
        selectCallbackRef.current?.(node.id);
      });

    const updateNodeStyles = () => {
      const selectedId = selectedIdRef.current;
      mergedNodes
        .classed("is-selected", (d) => d.id === selectedId)
        .select("circle.node-ring")
        .attr("stroke", (d) =>
          d.id === selectedId ? d.palette.accent : d.palette.border
        )
        .attr("stroke-width", (d) => (d.id === selectedId ? 4 : 3))
        .attr("fill", (d) => d.palette.background)
        .attr("opacity", (d) => (d.isDeceased ? 0.85 : 1));
      mergedNodes
        .select("text.node-label")
        .attr("fill", (d) =>
          d.id === selectedId
            ? d.palette.accent
            : d.isDeceased
            ? "#4b5563"
            : "#1f2937"
        );
    };
    updateNodeStyles();

    state.updateNodeStyles = updateNodeStyles;
    state.nodeSelection = mergedNodes;
    state.linkSelection = mergedLinks;
    state.labelSelection = mergedLabels;

    let simulation = simulationRef.current;
    if (!simulation) {
      simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((node) => node.id)
            .distance((link) => link.distance)
            .strength((link) => link.strength)
        )
        .force("charge", d3.forceManyBody().strength(-640))
        .force("collision", d3.forceCollide().radius(64))
        .force(
          "center",
          d3.forceCenter(state.size.width / 2, state.size.height / 2)
        );

      simulation.on("tick", () => {
        state.linkSelection
          ?.attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        state.labelSelection
          ?.attr("x", (d) => (d.source.x + d.target.x) / 2)
          .attr("y", (d) => (d.source.y + d.target.y) / 2 - 12);
        state.nodeSelection?.attr(
          "transform",
          (d) => `translate(${d.x},${d.y})`
        );
      });

      simulationRef.current = simulation;
    } else {
      simulation.nodes(nodes);
      simulation.force(
        "link",
        d3
          .forceLink(links)
          .id((node) => node.id)
          .distance((link) => link.distance)
          .strength((link) => link.strength)
      );
      simulation.force(
        "center",
        d3.forceCenter(state.size.width / 2, state.size.height / 2)
      );
      simulation.alpha(0.9).restart();
    }

    const backgroundHandler = (event) => {
      if (event.target === state.svg.node()) {
        hideTooltip();
        selectCallbackRef.current?.(null);
      }
    };
    state.svg.on("click.background", backgroundHandler);

    window.setTimeout(() => {
      fitNetwork({ animation: false });
    }, 140);

    return () => {
      mergedNodes
        .on("mouseenter", null)
        .on("mousemove", null)
        .on("mouseleave", null)
        .on("click", null);
      state.svg.on("click.background", null);
    };
  }, [members, relationships, fitNetwork]);

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
  const [memberSearch, setMemberSearch] = React.useState("");
  const [relationshipSearch, setRelationshipSearch] = React.useState("");

  const { containerRef, fitNetwork, redrawNetwork } = useNetwork(
    members,
    relationships,
    {
      onSelectMember: setSelectedMemberId,
      selectedMemberId,
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

  const memberById = React.useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      map.set(member.id, member);
    });
    return map;
  }, [members]);

  const filteredMembers = React.useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) {
      return sortedMembers;
    }
    return sortedMembers.filter((member) => {
      const attributeEntries = Object.entries(member.attributes || {});
      const combined = [
        member.label,
        member.gender,
        member.id != null ? String(member.id) : "",
        ...attributeEntries.flatMap(([key, value]) => [key, value]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return combined.includes(query);
    });
  }, [sortedMembers, memberSearch]);

  const filteredRelationships = React.useMemo(() => {
    const query = relationshipSearch.trim().toLowerCase();
    const sorted = [...relationships].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      if (a.from !== b.from) {
        return a.from - b.from;
      }
      return a.to - b.to;
    });
    if (!query) {
      return sorted;
    }
    return sorted.filter((relationship) => {
      const fromMember = memberById.get(relationship.from) || null;
      const toMember = memberById.get(relationship.to) || null;
      const values = [
        relationship.type,
        relationship.id,
        relationship.from != null ? String(relationship.from) : "",
        relationship.to != null ? String(relationship.to) : "",
        fromMember?.label || "Unknown",
        toMember?.label || "Unknown",
        relationship.type === "parent" ? "Parent Child" : "",
        relationship.type === "spouse" ? "Spouse" : "",
        relationship.type === "divorced" ? "Divorced" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return values.includes(query);
    });
  }, [relationships, relationshipSearch, memberById]);

  const relationshipOptions = React.useMemo(
    () =>
      sortedMembers.map((member) => ({
        id: member.id,
        label: member.label,
        lifeStatus: member.attributes?.lifeStatus || "Alive",
        gender: member.gender,
        ...getMemberAvatarAssets(member),
      })),
    [sortedMembers]
  );

  const renderMemberOption = React.useCallback(
    (props, option) => (
      <li {...props}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
          <Avatar
            src={option.avatar}
            alt={option.label}
            imgProps={
              option.customAvatar && option.fallbackAvatar
                ? {
                    onError: (event) => {
                      event.target.onerror = null;
                      event.target.src = option.fallbackAvatar;
                    },
                  }
                : undefined
            }
            sx={{
              width: 32,
              height: 32,
              boxShadow: option.isDeceased
                ? "0 0 0 2px rgba(156, 163, 175, 0.45)"
                : "0 0 0 2px rgba(99, 102, 241, 0.35)",
              filter: option.isDeceased ? "grayscale(0.55)" : "none",
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {option.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {option.gender === "male" ? "Male" : "Female"}
              {` • ${option.lifeStatus}`}
            </Typography>
          </Box>
        </Stack>
      </li>
    ),
    []
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
                          renderOption={renderMemberOption}
                          renderInput={(params) => {
                            const startAdornment = firstPersonValue?.avatar
                              ? (
                                  <>
                                    <InputAdornment position="start" sx={{ mr: 1 }}>
                                      <Avatar
                                        src={firstPersonValue.avatar}
                                        alt={firstPersonValue.label}
                                        imgProps={
                                          firstPersonValue.customAvatar &&
                                          firstPersonValue.fallbackAvatar
                                            ? {
                                                onError: (event) => {
                                                  event.target.onerror = null;
                                                  event.target.src =
                                                    firstPersonValue.fallbackAvatar;
                                                },
                                              }
                                            : undefined
                                        }
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          boxShadow: firstPersonValue.isDeceased
                                            ? "0 0 0 2px rgba(156, 163, 175, 0.45)"
                                            : "0 0 0 2px rgba(99, 102, 241, 0.35)",
                                          filter: firstPersonValue.isDeceased
                                            ? "grayscale(0.55)"
                                            : "none",
                                        }}
                                      />
                                    </InputAdornment>
                                    {params.InputProps.startAdornment}
                                  </>
                                )
                              : params.InputProps.startAdornment;

                            return (
                              <TextField
                                {...params}
                                label="First Person"
                                placeholder="Search family member"
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment,
                                }}
                              />
                            );
                          }}
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
                          renderOption={renderMemberOption}
                          renderInput={(params) => {
                            const startAdornment = secondPersonValue?.avatar
                              ? (
                                  <>
                                    <InputAdornment position="start" sx={{ mr: 1 }}>
                                      <Avatar
                                        src={secondPersonValue.avatar}
                                        alt={secondPersonValue.label}
                                        imgProps={
                                          secondPersonValue.customAvatar &&
                                          secondPersonValue.fallbackAvatar
                                            ? {
                                                onError: (event) => {
                                                  event.target.onerror = null;
                                                  event.target.src =
                                                    secondPersonValue.fallbackAvatar;
                                                },
                                              }
                                            : undefined
                                        }
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          boxShadow: secondPersonValue.isDeceased
                                            ? "0 0 0 2px rgba(156, 163, 175, 0.45)"
                                            : "0 0 0 2px rgba(99, 102, 241, 0.35)",
                                          filter: secondPersonValue.isDeceased
                                            ? "grayscale(0.55)"
                                            : "none",
                                        }}
                                      />
                                    </InputAdornment>
                                    {params.InputProps.startAdornment}
                                  </>
                                )
                              : params.InputProps.startAdornment;

                            return (
                              <TextField
                                {...params}
                                label={relationshipSecondLabel}
                                placeholder="Search family member"
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment,
                                }}
                              />
                            );
                          }}
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
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1.5,
                          pb: 2,
                        }}
                      >
                        <TextField
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                          size="small"
                          placeholder="Search members…"
                          type="search"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ minWidth: { xs: "100%", sm: 260 }, maxWidth: 360 }}
                        />
                      </Box>
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
                          {filteredMembers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography align="center" color="text.secondary">
                                  {memberSearch.trim()
                                    ? "No members match your search."
                                    : "Add your first member to begin building the tree."}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {filteredMembers.map((member) => {
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
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1.5,
                          pb: 2,
                        }}
                      >
                        <TextField
                          value={relationshipSearch}
                          onChange={(event) =>
                            setRelationshipSearch(event.target.value)
                          }
                          size="small"
                          placeholder="Search relationships…"
                          type="search"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ minWidth: { xs: "100%", sm: 260 }, maxWidth: 360 }}
                        />
                      </Box>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>From</TableCell>
                            <TableCell>To</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredRelationships.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3}>
                                <Typography align="center" color="text.secondary">
                                  {relationships.length === 0
                                    ? "No relationships yet. Create one to connect your members."
                                    : "No relationships match your search."}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {filteredRelationships.map((relationship) => {
                            const fromMember = memberById.get(relationship.from) || null;
                            const toMember = memberById.get(relationship.to) || null;
                            const fromAssets = getMemberAvatarAssets(fromMember);
                            const toAssets = getMemberAvatarAssets(toMember);
                            const fromName = fromMember?.label || "Unknown";
                            const toName = toMember?.label || "Unknown";
                            return (
                              <TableRow key={relationship.id}>
                                <TableCell>
                                  {relationship.type === "spouse"
                                    ? "Spouses"
                                    : relationship.type === "divorced"
                                    ? "Divorced"
                                    : "Parent → Child"}
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar
                                      src={fromAssets.avatar || undefined}
                                      alt={fromName}
                                      imgProps={
                                        fromAssets.customAvatar && fromAssets.fallbackAvatar
                                          ? {
                                              onError: (event) => {
                                                event.target.onerror = null;
                                                event.target.src = fromAssets.fallbackAvatar;
                                              },
                                            }
                                          : undefined
                                      }
                                      sx={{ width: 36, height: 36, fontSize: 14 }}
                                    >
                                      {!fromAssets.avatar && fromName.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography>{fromName}</Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar
                                      src={toAssets.avatar || undefined}
                                      alt={toName}
                                      imgProps={
                                        toAssets.customAvatar && toAssets.fallbackAvatar
                                          ? {
                                              onError: (event) => {
                                                event.target.onerror = null;
                                                event.target.src = toAssets.fallbackAvatar;
                                              },
                                            }
                                          : undefined
                                      }
                                      sx={{ width: 36, height: 36, fontSize: 14 }}
                                    >
                                      {!toAssets.avatar && toName.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography>{toName}</Typography>
                                  </Stack>
                                </TableCell>
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
