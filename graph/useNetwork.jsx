((global) => {
  const namespace = global.FamilyTreeGraph || (global.FamilyTreeGraph = {});
  const React = global.React;
  const d3 = global.d3;
  const {
    prepareNode,
    formatEdge,
  } = global.FamilyTreeData;

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

  function useNetwork(
    members,
    relationships,
    { onSelectMember, selectedMemberId } = {}
  ) {
    const [containerNode, setContainerNode] = React.useState(null);
    const containerRef = React.useCallback((node) => {
      setContainerNode(node);
    }, []);
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
    }, [containerNode, fitNetwork]);

    React.useEffect(() => {
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
          .force("charge", d3.forceManyBody().strength(-520))
          .force("collide", d3.forceCollide(52))
          .force(
            "center",
            d3.forceCenter(state.size.width / 2, state.size.height / 2)
          )
          .velocityDecay(0.28);
        simulationRef.current = simulation;
      } else {
        simulation.nodes(nodes);
        simulation.force("link").links(links);
      }

      simulation.on("tick", () => {
        mergedLinks
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => getLinkTargetPoint(d).x)
          .attr("y2", (d) => getLinkTargetPoint(d).y);

        mergedNodes.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

        mergedLabels
          .attr("x", (d) => (d.source.x + d.target.x) / 2)
          .attr("y", (d) => (d.source.y + d.target.y) / 2 - 8);
      });

      simulation.alpha(0.35).restart();

      return () => {
        hideTooltip();
        simulation.on("tick", null);
      };
    }, [members, relationships, containerNode]);

    return { containerRef, fitNetwork, redrawNetwork };
  }

  namespace.useNetwork = useNetwork;
  namespace.getLinkTargetPoint = getLinkTargetPoint;
})(window);
