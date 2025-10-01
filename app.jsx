const React = window.React;
const ReactDOM = window.ReactDOM;
const { AppLayout } = window.FamilyTreeComponents;
const { HashRouter, useLocation, useNavigate } = window.ReactRouterDOM;

const NODE_RADIUS = 40;
const ARROW_TARGET_PADDING = 6;
const LINK_TYPES_WITH_ARROW = new Set(["parent", "spouse", "divorced"]);

function getLinkTargetPoint(link) {
  if (!LINK_TYPES_WITH_ARROW.has(link.type)) {
    return { x: link.target.x, y: link.target.y };
  }
  const dx = link.target.x - link.source.x;
  const dy = link.target.y - link.source.y;
  const distance = Math.hypot(dx, dy);
  if (!distance || !isFinite(distance)) {
    return { x: link.target.x, y: link.target.y };
  }
  const offset = Math.min(NODE_RADIUS + ARROW_TARGET_PADDING, distance);
  const ratio = (distance - offset) / distance;
  return {
    x: link.source.x + dx * ratio,
    y: link.source.y + dy * ratio,
  };
}

const {
  loadFromStorage,
  persistToStorage,
  clone,
  defaultData,
  getMemberAvatarAssets,
  createAttributeId,
  attributesToCustomList,
  compileAttributes,
  createAvatar,
  prepareNode,
  formatEdge,
} = window.FamilyTreeData;

const { CssBaseline, ThemeProvider, createTheme } = MaterialUI;

const TAB_ROUTES = {
  overview: "/overview",
  graph: "/graph",
  members: "/members",
  relationships: "/relationships",
};

const ROUTE_TO_TAB = Object.entries(TAB_ROUTES).reduce((acc, [tab, path]) => {
  acc[path] = tab;
  return acc;
}, {});

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname || "/";
}

function useTabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedPath = React.useMemo(
    () => normalizePathname(location.pathname || "/"),
    [location.pathname]
  );

  const matchedTab = React.useMemo(() => {
    if (normalizedPath === "/" || normalizedPath === "") {
      return "overview";
    }
    return ROUTE_TO_TAB[normalizedPath] || null;
  }, [normalizedPath]);

  React.useEffect(() => {
    if (normalizedPath === "/" || matchedTab === null) {
      navigate(TAB_ROUTES.overview, { replace: true });
    }
  }, [normalizedPath, matchedTab, navigate]);

  const handleTabChange = React.useCallback(
    (value) => {
      const targetPath = TAB_ROUTES[value] || TAB_ROUTES.overview;
      if (targetPath !== normalizedPath) {
        navigate(targetPath);
      }
    },
    [navigate, normalizedPath]
  );

  return {
    tab: matchedTab ?? "overview",
    onTabChange: handleTabChange,
  };
}

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
    const containerNode = containerRef.current;
    const d3 = window.d3;
    if (!containerNode || !d3) {
      return undefined;
    }
    const container = containerNode;
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

    const createArrowMarker = (id, { fill, stroke }) => {
      defs
        .append("marker")
        .attr("id", id)
        .attr("viewBox", "0 0 18 18")
        .attr("refX", 16)
        .attr("refY", 9)
        .attr("markerWidth", 5.4)
        .attr("markerHeight", 5.4)
        .attr("orient", "auto")
        .attr("markerUnits", "strokeWidth")
        .append("path")
        .attr("d", "M3,2 L16,9 L3,16 L7.5,9 Z")
        .attr("fill", fill)
        .attr("stroke", stroke)
        .attr("stroke-width", 0.45);
    };

    createArrowMarker("arrow-parent", { fill: "#10b981", stroke: "#065f46" });
    createArrowMarker("arrow-spouse", { fill: "#ef4444", stroke: "#991b1b" });
    createArrowMarker("arrow-divorced", { fill: "#9ca3af", stroke: "#4b5563" });

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
      .attr("marker-end", (d) => {
        if (d.type === "parent") {
          return "url(#arrow-parent)";
        }
        if (d.type === "spouse") {
          return "url(#arrow-spouse)";
        }
        if (d.type === "divorced") {
          return "url(#arrow-divorced)";
        }
        return null;
      });

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
        state.linkSelection?.each(function (link) {
          const targetPoint = getLinkTargetPoint(link);
          link.__displayTarget = targetPoint;
          this.setAttribute("x1", link.source.x);
          this.setAttribute("y1", link.source.y);
          this.setAttribute("x2", targetPoint.x);
          this.setAttribute("y2", targetPoint.y);
        });
        state.labelSelection
          ?.attr("x", (link) => {
            const targetPoint = link.__displayTarget || getLinkTargetPoint(link);
            return (link.source.x + targetPoint.x) / 2;
          })
          .attr("y", (link) => {
            const targetPoint = link.__displayTarget || getLinkTargetPoint(link);
            return (link.source.y + targetPoint.y) / 2 - 12;
          });
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
  const [graphExpanded, setGraphExpanded] = React.useState(false);

  const [memberName, setMemberName] = React.useState("");
  const [memberGender, setMemberGender] = React.useState("female");
  const [memberLifeStatus, setMemberLifeStatus] = React.useState("Alive");
  const [memberAddress, setMemberAddress] = React.useState("");
  const [memberDateOfBirth, setMemberDateOfBirth] = React.useState("");
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

  const { tab, onTabChange } = useTabNavigation();

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

  const relationshipSecondLabel = React.useMemo(
    () =>
      relationshipType === "spouse"
        ? "Second Spouse"
        : relationshipType === "divorced"
        ? "Former Partner"
        : "Child",
    [relationshipType]
  );

  const overviewStats = React.useMemo(() => {
    const totals = {
      totalMembers: members.length,
      totalRelationships: relationships.length,
      livingCount: 0,
      deceasedCount: 0,
      genderCounts: { female: 0, male: 0 },
    };
    const relationshipTypeCounts = { parent: 0, spouse: 0, divorced: 0 };
    const childCounts = new Map();
    const spouseCounts = new Map();

    members.forEach((member) => {
      const lifeStatus =
        member.attributes?.lifeStatus === "Deceased" ? "Deceased" : "Alive";
      if (lifeStatus === "Deceased") {
        totals.deceasedCount += 1;
      } else {
        totals.livingCount += 1;
      }
      if (member.gender === "male") {
        totals.genderCounts.male += 1;
      } else {
        totals.genderCounts.female += 1;
      }
    });

    relationships.forEach((relationship) => {
      if (relationship.type === "parent") {
        relationshipTypeCounts.parent += 1;
        childCounts.set(
          relationship.from,
          (childCounts.get(relationship.from) || 0) + 1
        );
      } else if (relationship.type === "spouse") {
        relationshipTypeCounts.spouse += 1;
        spouseCounts.set(
          relationship.from,
          (spouseCounts.get(relationship.from) || 0) + 1
        );
        spouseCounts.set(
          relationship.to,
          (spouseCounts.get(relationship.to) || 0) + 1
        );
      } else if (relationship.type === "divorced") {
        relationshipTypeCounts.divorced += 1;
      } else {
        relationshipTypeCounts[relationship.type] =
          (relationshipTypeCounts[relationship.type] || 0) + 1;
      }
    });

    let totalChildren = 0;
    childCounts.forEach((count) => {
      totalChildren += count;
    });
    const parentCount = childCounts.size;
    const averageChildren = parentCount ? totalChildren / parentCount : 0;

    let topParentId = null;
    let topParentCount = 0;
    childCounts.forEach((count, id) => {
      if (count > topParentCount) {
        topParentCount = count;
        topParentId = id;
      }
    });

    let topSpouseId = null;
    let topSpouseCount = 0;
    spouseCounts.forEach((count, id) => {
      if (count > topSpouseCount) {
        topSpouseCount = count;
        topSpouseId = id;
      }
    });

    const births = { youngest: null, oldest: null };
    members.forEach((member) => {
      const dateString = member.attributes?.dateOfBirth;
      if (!dateString) {
        return;
      }
      const timestamp = Date.parse(dateString);
      if (Number.isNaN(timestamp)) {
        return;
      }
      if (!births.youngest || timestamp > births.youngest.timestamp) {
        births.youngest = { member, timestamp, date: dateString };
      }
      if (!births.oldest || timestamp < births.oldest.timestamp) {
        births.oldest = { member, timestamp, date: dateString };
      }
    });

    return {
      totals,
      relationshipTypeCounts,
      averageChildren,
      parentCount,
      topParent:
        topParentId != null
          ? { member: memberById.get(topParentId) || null, count: topParentCount }
          : null,
      topSpouse:
        topSpouseId != null
          ? { member: memberById.get(topSpouseId) || null, count: topSpouseCount }
          : null,
      births: {
        youngest: births.youngest
          ? { member: births.youngest.member, date: births.youngest.date }
          : null,
        oldest: births.oldest
          ? { member: births.oldest.member, date: births.oldest.date }
          : null,
      },
    };
  }, [members, relationships, memberById]);

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
    setMemberDateOfBirth("");
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
      dateOfBirth: member.attributes?.dateOfBirth || "",
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
        editingMemberDraft.address,
        editingMemberDraft.dateOfBirth
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
        memberAddress,
        memberDateOfBirth
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

  const handleMemberNameChange = (value) => {
    setMemberName(value);
    if (memberNameError) {
      setMemberNameError("");
    }
  };

  const handleToggleGraphExpanded = React.useCallback(() => {
    setGraphExpanded((prev) => {
      const next = !prev;
      if (!next) {
        window.setTimeout(() => {
          redrawNetwork();
          fitNetwork({ animation: false });
        }, 80);
      }
      return next;
    });
  }, [fitNetwork, redrawNetwork]);

  const handleCloseMemberDetails = React.useCallback(() => {
    setSelectedMemberId(null);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppLayout
        tabState={{ value: tab, onChange: onTabChange }}
        graphState={{
          expanded: graphExpanded,
          onToggle: handleToggleGraphExpanded,
        }}
        network={{ containerRef }}
        memberDetail={{
          selectedMember,
          onClose: handleCloseMemberDetails,
        }}
        memberForm={{
          name: memberName,
          gender: memberGender,
          lifeStatus: memberLifeStatus,
          address: memberAddress,
          dateOfBirth: memberDateOfBirth,
          imageUrl: memberImageUrl,
          attributes: memberAttributes,
          nameError: memberNameError,
          onNameChange: handleMemberNameChange,
          onGenderChange: setMemberGender,
          onLifeStatusChange: setMemberLifeStatus,
          onAddressChange: setMemberAddress,
          onDateOfBirthChange: setMemberDateOfBirth,
          onImageUrlChange: setMemberImageUrl,
          onAddAttribute: handleAddAttribute,
          onAttributeChange: handleMemberAttributeChange,
          onRemoveAttribute: handleRemoveMemberAttribute,
          onSubmit: handleAddMember,
        }}
        relationshipForm={{
          type: relationshipType,
          options: relationshipOptions,
          firstPersonValue,
          secondPersonValue,
          secondLabel: relationshipSecondLabel,
          onTypeChange: setRelationshipType,
          onFirstPersonChange: setRelationshipFrom,
          onSecondPersonChange: setRelationshipTo,
          onSubmit: handleAddRelationship,
        }}
        storageActions={{
          onSaveSnapshot: handleSaveSnapshot,
          onReload: handleReload,
          onReset: handleReset,
        }}
        memberSearchState={{ value: memberSearch, onChange: setMemberSearch }}
        memberTable={{
          items: filteredMembers,
          editingId: editingMemberId,
          editingDraft: editingMemberDraft,
          editingNameError,
          onFieldChange: handleEditingDraftChange,
          onAddAttribute: handleAddEditingAttribute,
          onAttributeChange: handleEditingAttributeChange,
          onRemoveAttribute: handleRemoveEditingAttribute,
          onCancelEditing: handleCancelEditingMember,
          onSaveEditing: handleSaveEditingMember,
          onStartEditing: handleStartEditingMember,
        }}
        relationshipSearchState={{
          value: relationshipSearch,
          onChange: setRelationshipSearch,
        }}
        relationshipTable={{
          items: filteredRelationships,
          relationships,
          memberById,
        }}
        overview={overviewStats}
        alert={{ message: alertMessage, onClose: handleCloseAlert }}
      />
    </ThemeProvider>
  );

}

function AppWithRouter() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppWithRouter />);
