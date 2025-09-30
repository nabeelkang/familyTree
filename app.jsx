const { AppLayout } = window.FamilyTreeComponents;

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

    defs
      .append("marker")
      .attr("id", "arrow-parent")
      .attr("viewBox", "0 0 16 16")
      .attr("refX", 13)
      .attr("refY", 8)
      .attr("markerWidth", 14)
      .attr("markerHeight", 14)
      .attr("orient", "auto")
      .attr("markerUnits", "strokeWidth")
      .append("path")
      .attr("d", "M2,2 L14,8 L2,14 L5.5,8 Z")
      .attr("fill", "#047857")
      .attr("stroke", "#ecfdf5")
      .attr("stroke-width", 1.2);

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

  const handleMemberNameChange = (value) => {
    setMemberName(value);
    if (memberNameError) {
      setMemberNameError("");
    }
  };

  const handleTabChange = (value) => setTab(value);

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
        tabState={{ value: tab, onChange: handleTabChange }}
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
          imageUrl: memberImageUrl,
          attributes: memberAttributes,
          nameError: memberNameError,
          onNameChange: handleMemberNameChange,
          onGenderChange: setMemberGender,
          onLifeStatusChange: setMemberLifeStatus,
          onAddressChange: setMemberAddress,
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
        alert={{ message: alertMessage, onClose: handleCloseAlert }}
      />
    </ThemeProvider>
  );

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
