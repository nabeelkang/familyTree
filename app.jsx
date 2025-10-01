const React = window.React;
const ReactDOM = window.ReactDOM;
const { AppLayout } = window.FamilyTreeComponents;
const { HashRouter, useLocation, useNavigate } = window.ReactRouterDOM;
const { useNetwork } = window.FamilyTreeGraph;
const { useMemberManagement } = window.FamilyTreeMembers;
const { useRelationshipManagement } = window.FamilyTreeRelationships;

const { loadFromStorage, persistToStorage, clone, defaultData } =
  window.FamilyTreeData;

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

function App() {
  const initialData = React.useMemo(() => loadFromStorage(), []);
  const [graphExpanded, setGraphExpanded] = React.useState(false);
  const [alertMessage, setAlertMessage] = React.useState(null);

  const memberState = useMemberManagement(initialData.members, {
    onAlert: setAlertMessage,
  });
  const {
    members,
    setMembers,
    selectedMemberId,
    setSelectedMemberId,
    selectedMember,
    sortedMembers,
    memberById,
    memberForm,
    memberSearchState,
    memberTable,
    resetForm: resetMemberForm,
  } = memberState;

  const relationshipState = useRelationshipManagement(
    initialData.relationships,
    {
      sortedMembers,
      memberById,
      onAlert: setAlertMessage,
    }
  );
  const {
    relationships,
    setRelationships,
    resetForm: resetRelationshipForm,
    relationshipForm,
    relationshipSearchState,
    relationshipTable,
  } = relationshipState;

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

  const handleSaveSnapshot = React.useCallback(() => {
    persistToStorage({ members, relationships });
    setAlertMessage("Data saved to browser.");
  }, [members, relationships, setAlertMessage]);

  const handleReset = React.useCallback(() => {
    if (confirm("Reset to sample data? This will overwrite current entries.")) {
      setMembers(clone(defaultData.members));
      setRelationships(clone(defaultData.relationships));
      resetMemberForm();
      resetRelationshipForm();
      setAlertMessage("Reset to sample data.");
    }
  }, [
    resetMemberForm,
    resetRelationshipForm,
    setMembers,
    setRelationships,
    setAlertMessage,
  ]);

  const handleReload = React.useCallback(() => {
    const stored = loadFromStorage();
    setMembers(stored.members);
    setRelationships(stored.relationships);
    resetMemberForm();
    resetRelationshipForm();
    setAlertMessage("Loaded saved data.");
  }, [
    resetMemberForm,
    resetRelationshipForm,
    setMembers,
    setRelationships,
    setAlertMessage,
  ]);

  const handleCloseAlert = React.useCallback(() => setAlertMessage(null), []);

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
  }, [setSelectedMemberId]);

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
        memberForm={memberForm}
        relationshipForm={relationshipForm}
        storageActions={{
          onSaveSnapshot: handleSaveSnapshot,
          onReload: handleReload,
          onReset: handleReset,
        }}
        memberSearchState={memberSearchState}
        memberTable={memberTable}
        relationshipSearchState={relationshipSearchState}
        relationshipTable={relationshipTable}
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
