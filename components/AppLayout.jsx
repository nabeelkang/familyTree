((global) => {
  const namespace =
    global.FamilyTreeComponents || (global.FamilyTreeComponents = {});
  const React = global.React;
  const {
    AddIcon,
    DeleteIcon,
    EditIcon,
    CloseIcon,
    CheckIcon,
    ExpandIcon,
    CollapseIcon,
    SearchIcon,
  } = global.FamilyTreeIcons;
  const {
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
    ToggleButtonGroup,
    ToggleButton,
    Avatar,
    Paper,
    Alert,
  } = global.MaterialUI;

  const { logoDataUri, createAvatar, getMemberAvatarAssets } =
    global.FamilyTreeData;

  const { MemberDetailPanel } = namespace;

  function createParentChildHierarchy(relationships, memberById) {
    if (!Array.isArray(relationships) || !relationships.length || !memberById) {
      return [];
    }

    const parentRelationships = relationships.filter(
      (relationship) => relationship.type === "parent"
    );
    if (parentRelationships.length === 0) {
      return [];
    }

    const childrenByParent = new Map();
    const parentsByChild = new Map();

    parentRelationships.forEach((relationship) => {
      const parentId = Number(relationship.from);
      const childId = Number(relationship.to);
      if (!Number.isFinite(parentId) || !Number.isFinite(childId)) {
        return;
      }

      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, new Set());
      }
      childrenByParent.get(parentId).add(childId);

      if (!parentsByChild.has(childId)) {
        parentsByChild.set(childId, new Set());
      }
      parentsByChild.get(childId).add(parentId);
    });

    const buildNode = (rawMemberId, visited, depth = 0) => {
      const memberId = Number(rawMemberId);
      if (!Number.isFinite(memberId) || visited.has(memberId)) {
        return null;
      }
      const member = memberById.get(memberId);
      if (!member) {
        return null;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(memberId);

      const childIds = Array.from(childrenByParent.get(memberId) || []);
      const children = childIds
        .map((childId) => buildNode(childId, nextVisited, depth + 1))
        .filter(Boolean);

      const descendantCount = children.reduce(
        (total, child) => total + 1 + (child.descendantCount || 0),
        0
      );

      return {
        id: memberId,
        member,
        children,
        depth,
        descendantCount,
      };
    };

    const rootCandidates = Array.from(childrenByParent.keys()).filter(
      (memberId) => !parentsByChild.has(memberId)
    );
    const rootIds =
      rootCandidates.length > 0
        ? rootCandidates
        : Array.from(childrenByParent.keys());

    const visitedRoots = new Set();
    const hierarchy = [];

    rootIds.forEach((rootId) => {
      if (visitedRoots.has(rootId)) {
        return;
      }
      const node = buildNode(rootId, new Set(), 0);
      if (!node) {
        return;
      }
      const markVisited = (current) => {
        visitedRoots.add(current.id);
        current.children.forEach((child) => markVisited(child));
      };
      markVisited(node);
      hierarchy.push(node);
    });

    return hierarchy;
  }

  function AppLayout({
    tabState,
    graphState,
    network,
    memberDetail,
    memberForm,
    relationshipForm,
    storageActions,
    memberSearchState,
    memberTable,
    relationshipSearchState,
    relationshipTable,
    overview,
    alert,
    onSelectMember,
  }) {
  const { value: tab, onChange: onTabChange } = tabState;
  const { expanded: graphExpanded, onToggle: onToggleGraphExpanded } = graphState;
  const { containerRef, fitNetwork: fitNetworkRef, redrawNetwork: redrawNetworkRef } =
    network;
  const { selectedMember, onClose: onCloseMemberDetail } = memberDetail;

  const {
    name: memberName,
    gender: memberGender,
    lifeStatus: memberLifeStatus,
    address: memberAddress,
    dateOfBirth: memberDateOfBirth,
    imageUrl: memberImageUrl,
    attributes: memberAttributes,
    nameError: memberNameError,
    onNameChange: onMemberNameChange,
    onGenderChange: onMemberGenderChange,
    onLifeStatusChange: onMemberLifeStatusChange,
    onAddressChange: onMemberAddressChange,
    onDateOfBirthChange: onMemberDateOfBirthChange,
    onImageUrlChange: onMemberImageUrlChange,
    onAddAttribute: onAddMemberAttribute,
    onAttributeChange: onMemberAttributeChange,
    onRemoveAttribute: onRemoveMemberAttribute,
    onSubmit: onSubmitMemberForm,
  } = memberForm;

  const {
    type: relationshipType,
    options: relationshipOptions,
    firstPersonValue,
    secondPersonValue,
    secondLabel: relationshipSecondLabel,
    onTypeChange: onRelationshipTypeChange,
    onFirstPersonChange: onRelationshipFromChange,
    onSecondPersonChange: onRelationshipToChange,
    onSubmit: onSubmitRelationshipForm,
  } = relationshipForm;

  const { onSaveSnapshot, onReload, onReset } = storageActions;
  const { value: memberSearch, onChange: onMemberSearchChange } = memberSearchState;

  const {
    items: memberRows,
    editingId,
    editingDraft,
    editingNameError,
    onFieldChange: onEditingFieldChange,
    onAddAttribute: onAddEditingAttribute,
    onAttributeChange: onEditingAttributeChange,
    onRemoveAttribute: onRemoveEditingAttribute,
    onCancelEditing,
    onSaveEditing,
    onStartEditing,
  } = memberTable;

  const {
    value: relationshipSearch,
    onChange: onRelationshipSearchChange,
  } = relationshipSearchState;

  const {
    items: relationshipRows,
    relationships,
    memberById,
  } = relationshipTable;

  const { message: alertMessage, onClose: onCloseAlert } = alert;

  const overviewData = overview || {};
  const totals = overviewData.totals || {};
  const relationshipTypeCounts = overviewData.relationshipTypeCounts || {};
  const averageChildren = overviewData.averageChildren ?? 0;
  const parentCount = overviewData.parentCount ?? 0;
  const topParentStat = overviewData.topParent || null;
  const topSpouseStat = overviewData.topSpouse || null;
  const births = overviewData.births || {};

  const [graphView, setGraphView] = React.useState("network");

  const graphHierarchy = React.useMemo(
    () => createParentChildHierarchy(relationships, memberById),
    [relationships, memberById]
  );

  const selectedMemberId = selectedMember?.id ?? null;

  const handleSelectHierarchyMember = React.useCallback(
    (memberId) => {
      if (!onSelectMember) {
        return;
      }
      const numericId = Number(memberId);
      if (!Number.isFinite(numericId)) {
        return;
      }
      onSelectMember(numericId);
    },
    [onSelectMember]
  );

  React.useEffect(() => {
    if (graphView !== "network") {
      return undefined;
    }
    if (!redrawNetworkRef || !fitNetworkRef) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      redrawNetworkRef();
      fitNetworkRef({ animation: false });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [graphView, redrawNetworkRef, fitNetworkRef]);

  function renderGraphHierarchyBranch(node, isRoot = false) {
    if (!node || !node.member) {
      return null;
    }

    const assets = getMemberAvatarAssets(node.member);
    const avatarSource = assets.avatar || undefined;
    const fallbackHandler =
      assets.customAvatar && assets.fallbackAvatar
        ? {
            onError: (event) => {
              event.target.onerror = null;
              event.target.src = assets.fallbackAvatar;
            },
          }
        : undefined;
    const hasChildren = node.children.length > 0;
    const isSelected = selectedMemberId === node.id;

    const nodeClassName = [
      "graph-hierarchy-node",
      hasChildren ? "has-children" : null,
      isSelected ? "is-selected" : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <li
        key={`${node.id}-${node.depth}`}
        className={`graph-hierarchy-item${isRoot ? " graph-hierarchy-root" : ""}`}
      >
        <Stack
          component="button"
          type="button"
          direction="row"
          spacing={1.5}
          alignItems="center"
          onClick={() => handleSelectHierarchyMember(node.id)}
          className={nodeClassName}
          sx={{
            border: "1px solid rgba(148, 163, 184, 0.45)",
            borderRadius: 2.5,
            px: 2.5,
            py: 1.75,
            minWidth: { xs: 180, md: 200 },
            maxWidth: { xs: 220, md: 240 },
            mx: "auto",
            backgroundColor: "#ffffff",
            boxShadow: "0 12px 24px -20px rgba(15, 23, 42, 0.45)",
            textAlign: "left",
            font: "inherit",
            cursor: "pointer",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            outline: "none",
          }}
        >
          <Avatar
            src={avatarSource}
            alt={node.member.label}
            imgProps={fallbackHandler}
            sx={{
              width: 44,
              height: 44,
              fontSize: 16,
              boxShadow: hasChildren
                ? "0 0 0 3px rgba(79, 70, 229, 0.28)"
                : "0 0 0 3px rgba(14, 165, 233, 0.24)",
            }}
          >
            {!avatarSource && node.member.label.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: isSelected ? 700 : 600, fontSize: 15 }}>
              {node.member.label}
            </Typography>
            {hasChildren ? (
              <Typography variant="caption" color="text.secondary">
                {node.children.length} direct
                {" "}
                {node.children.length === 1 ? "child" : "children"}
              </Typography>
            ) : node.member.attributes?.lifeStatus ? (
              <Typography variant="caption" color="text.secondary">
                {node.member.attributes.lifeStatus}
              </Typography>
            ) : null}
            {node.descendantCount > node.children.length && (
              <Typography variant="caption" color="text.secondary">
                {node.descendantCount} total descendants
              </Typography>
            )}
          </Box>
        </Stack>
        {hasChildren && (
          <ul>{node.children.map((child) => renderGraphHierarchyBranch(child))}</ul>
        )}
      </li>
    );
  }

  let tabHeading = "";
  let tabDescription = "";
  if (tab === "overview") {
    tabHeading = "Family Snapshot";
    tabDescription =
      "See quick insights about your family, from member counts to standout storytellers.";
  } else if (tab === "graph") {
    tabHeading = "Family Graph";
    tabDescription =
      "Explore the family network or switch to a hierarchy to follow generations.";
  } else if (tab === "members") {
    tabHeading = "Members Directory";
    tabDescription =
      "Manage profiles, addresses, custom attributes, and portrait photos.";
  } else {
    tabHeading = "Relationship Ledger";
    tabDescription =
      "Review how everyone is connected across the family tree.";
  }

  const renderMemberOption = React.useCallback((props, option) => (
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
  ), []);

  const renderAttributes = React.useCallback((member) => {
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
    if (member.attributes?.dateOfBirth) {
      chips.push(
        <Chip
          key="dateOfBirth"
          label={`Born: ${member.attributes.dateOfBirth}`}
          size="small"
          variant="outlined"
        />
      );
    }
    Object.entries(member.attributes || {})
      .filter(
        ([key]) => key !== "lifeStatus" && key !== "address" && key !== "dateOfBirth"
      )
      .forEach(([key, value]) => {
        chips.push(
          <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" />
        );
      });
    return chips;
  }, []);

  return (
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
            onChange={(event, value) => onTabChange(value)}
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
          <Tab value="overview" label="Overview" />
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
          {!graphExpanded && tab !== "overview" && (
            <Grid item xs={12} md={4} lg={3}>
              <Stack spacing={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Add Family Member
                    </Typography>
                    <Box component="form" onSubmit={onSubmitMemberForm} noValidate>
                      <Stack spacing={2.5}>
                        <TextField
                          label="Name"
                          value={memberName}
                          onChange={(event) => onMemberNameChange(event.target.value)}
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
                            onChange={(event) => onMemberGenderChange(event.target.value)}
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
                            onChange={(event) =>
                              onMemberLifeStatusChange(event.target.value)
                            }
                          >
                            <MenuItem value="Alive">Alive</MenuItem>
                            <MenuItem value="Deceased">Deceased</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          label="Address"
                          value={memberAddress}
                          onChange={(event) => onMemberAddressChange(event.target.value)}
                          placeholder="e.g. 123 Main St, Springfield"
                          fullWidth
                        />
                        <TextField
                          label="Date of Birth"
                          type="date"
                          value={memberDateOfBirth}
                          onChange={(event) =>
                            onMemberDateOfBirthChange(event.target.value)
                          }
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />
                        <TextField
                          label="Photo URL"
                          value={memberImageUrl}
                          onChange={(event) => onMemberImageUrlChange(event.target.value)}
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
                                  onMemberAttributeChange(attr.id, "key", event.target.value)
                                }
                                size="small"
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                label="Value"
                                value={attr.value}
                                onChange={(event) =>
                                  onMemberAttributeChange(
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
                                  onClick={() => onRemoveMemberAttribute(attr.id)}
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
                          onClick={onAddMemberAttribute}
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
                    <Box component="form" onSubmit={onSubmitRelationshipForm} noValidate>
                      <Stack spacing={2.5}>
                        <FormControl fullWidth>
                          <InputLabel id="relationship-type-label">
                            Relationship Type
                          </InputLabel>
                          <Select
                            labelId="relationship-type-label"
                            label="Relationship Type"
                            value={relationshipType}
                            onChange={(event) =>
                              onRelationshipTypeChange(event.target.value)
                            }
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
                            onRelationshipFromChange(newValue ? newValue.id : "")
                          }
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderOption={renderMemberOption}
                          renderInput={(params) => {
                            const startAdornment = firstPersonValue?.avatar ? (
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
                            ) : (
                              params.InputProps.startAdornment
                            );

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
                            onRelationshipToChange(newValue ? newValue.id : "")
                          }
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderOption={renderMemberOption}
                          renderInput={(params) => {
                            const startAdornment = secondPersonValue?.avatar ? (
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
                            ) : (
                              params.InputProps.startAdornment
                            );

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
                      <Button onClick={onSaveSnapshot}>Save Snapshot</Button>
                      <Button onClick={onReload}>Reload Saved Data</Button>
                      <Button color="error" onClick={onReset}>
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
            md={tab === "overview" || graphExpanded ? 12 : 8}
            lg={tab === "overview" || graphExpanded ? 12 : 9}
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
                      {tabHeading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tabDescription}
                    </Typography>
                  </Box>
                  {tab === "graph" && (
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", md: "center" }}
                      sx={{
                        alignSelf: { xs: "stretch", sm: "flex-start" },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      <ToggleButtonGroup
                        value={graphView}
                        exclusive
                        size="small"
                        color="primary"
                        onChange={(event, value) => {
                          if (value) {
                            setGraphView(value);
                          }
                        }}
                        sx={{
                          borderRadius: 9999,
                          '& .MuiToggleButton-root': {
                            textTransform: "none",
                            fontWeight: 500,
                            px: 2.25,
                          },
                        }}
                      >
                        <ToggleButton value="network">Network</ToggleButton>
                        <ToggleButton value="hierarchy">Hierarchy</ToggleButton>
                      </ToggleButtonGroup>
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
                        onClick={onToggleGraphExpanded}
                        sx={{
                          whiteSpace: "nowrap",
                          px: 2.5,
                        }}
                      >
                        {graphExpanded ? "Collapse graph" : "Expand graph"}
                      </Button>
                    </Stack>
                  )}
                </Stack>

                {tab === "overview" && (
                  <Stack spacing={3} sx={{ flexGrow: 1 }}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6} lg={3}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "rgba(79, 70, 229, 0.08)",
                            height: "100%",
                          }}
                        >
                          <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            Family Members
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 600 }}>
                            {totals.totalMembers ?? 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(totals.livingCount ?? 0).toLocaleString()} living •{' '}
                            {(totals.deceasedCount ?? 0).toLocaleString()} deceased
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "rgba(14, 165, 233, 0.08)",
                            height: "100%",
                          }}
                        >
                          <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            Connections
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 600 }}>
                            {totals.totalRelationships ?? 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(relationshipTypeCounts.parent ?? 0).toLocaleString()} parent-child •{' '}
                            {(relationshipTypeCounts.spouse ?? 0).toLocaleString()} spouses •{' '}
                            {(relationshipTypeCounts.divorced ?? 0).toLocaleString()} divorced
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "rgba(16, 185, 129, 0.08)",
                            height: "100%",
                          }}
                        >
                          <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            Growing Branches
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 600 }}>
                            {averageChildren > 0
                              ? averageChildren.toFixed(1)
                              : "0.0"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {parentCount > 0
                              ? `Across ${parentCount} ${parentCount === 1 ? "parent" : "parents"}`
                              : "Add parent-child links to grow the tree."}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "rgba(251, 191, 36, 0.12)",
                            height: "100%",
                          }}
                        >
                          <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            Family Makeup
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 600 }}>
                            {(totals.genderCounts?.female ?? 0) + (totals.genderCounts?.male ?? 0)
                              ? `${totals.genderCounts?.female ?? 0}♀ / ${totals.genderCounts?.male ?? 0}♂`
                              : 'No gender data yet'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(() => {
                              const female = totals.genderCounts?.female ?? 0;
                              const male = totals.genderCounts?.male ?? 0;
                              const other = Math.max(
                                0,
                                (totals.totalMembers ?? 0) - female - male
                              );
                              if ((totals.totalMembers ?? 0) === 0) {
                                return "Add members to track gender insights.";
                              }
                              const parts = [];
                              parts.push(`${female.toLocaleString()} female`);
                              parts.push(`${male.toLocaleString()} male`);
                              if (other > 0) {
                                parts.push(`${other.toLocaleString()} other`);
                              }
                              return parts.join(" • ");
                            })()}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Standout Storytellers
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            See who is raising the next generation and forming new branches.
                          </Typography>
                          <Stack spacing={2.5} sx={{ mt: 3 }}>
                            {(() => {
                              if (!topParentStat || !topParentStat.member) {
                                return (
                                  <Typography variant="body2" color="text.disabled">
                                    Add parent-child relationships to surface family leaders.
                                  </Typography>
                                );
                              }
                              const assets = getMemberAvatarAssets(topParentStat.member);
                              const countLabel = `${topParentStat.count} ${
                                topParentStat.count === 1 ? "child" : "children"
                              } recorded`;
                              return (
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar
                                    src={assets.avatar || undefined}
                                    alt={topParentStat.member.label}
                                    imgProps={
                                      assets.customAvatar && assets.fallbackAvatar
                                        ? {
                                            onError: (event) => {
                                              event.target.onerror = null;
                                              event.target.src = assets.fallbackAvatar;
                                            },
                                          }
                                        : undefined
                                    }
                                    sx={{ width: 56, height: 56, boxShadow: 3 }}
                                  >
                                    {!assets.avatar &&
                                      topParentStat.member.label.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      Most Children
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                      {topParentStat.member.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {countLabel}
                                    </Typography>
                                  </Box>
                                </Stack>
                              );
                            })()}
                            <Divider flexItem />
                            {(() => {
                              if (!topSpouseStat || !topSpouseStat.member || topSpouseStat.count === 0) {
                                return (
                                  <Typography variant="body2" color="text.disabled">
                                    Record spouse relationships to spotlight partnerships.
                                  </Typography>
                                );
                              }
                              const assets = getMemberAvatarAssets(topSpouseStat.member);
                              const countLabel = `${topSpouseStat.count} ${
                                topSpouseStat.count === 1 ? "spouse" : "spouses"
                              } connected`;
                              return (
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar
                                    src={assets.avatar || undefined}
                                    alt={topSpouseStat.member.label}
                                    imgProps={
                                      assets.customAvatar && assets.fallbackAvatar
                                        ? {
                                            onError: (event) => {
                                              event.target.onerror = null;
                                              event.target.src = assets.fallbackAvatar;
                                            },
                                          }
                                        : undefined
                                    }
                                    sx={{ width: 56, height: 56, boxShadow: 3 }}
                                  >
                                    {!assets.avatar &&
                                      topSpouseStat.member.label.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      Most Spouse Connections
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                      {topSpouseStat.member.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {countLabel}
                                    </Typography>
                                  </Box>
                                </Stack>
                              );
                            })()}
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Timeline Highlights
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Birthdates reveal the youngest and most seasoned family members.
                          </Typography>
                          {(() => {
                            const hasBirthInsights = Boolean(
                              (births.youngest && births.youngest.member) ||
                                (births.oldest && births.oldest.member)
                            );
                            if (!hasBirthInsights) {
                              return (
                                <Typography
                                  variant="body2"
                                  color="text.disabled"
                                  sx={{ mt: 3 }}
                                >
                                  Add birthdates to members to unlock timeline insights.
                                </Typography>
                              );
                            }
                            const renderBirthRow = (label, record) => {
                              if (!record || !record.member) {
                                return (
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      {label}
                                    </Typography>
                                    <Typography variant="body2" color="text.disabled">
                                      No date recorded yet.
                                    </Typography>
                                  </Box>
                                );
                              }
                              return (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {label}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {record.member.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Born {record.date}
                                  </Typography>
                                </Box>
                              );
                            };
                            return (
                              <Stack spacing={2.5} divider={<Divider flexItem />} sx={{ mt: 3 }}>
                                {renderBirthRow("Youngest Member", births.youngest)}
                                {renderBirthRow("Oldest Member", births.oldest)}
                              </Stack>
                            );
                          })()}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Stack>
                )}

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
                      {graphView === "network" ? (
                        <>
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
                        </>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                          <Box
                            sx={{
                              px: { xs: 2.5, md: 3 },
                              py: { xs: 2, md: 2.25 },
                              borderBottom: "1px solid rgba(148, 163, 184, 0.4)",
                              background:
                                "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(14, 165, 233, 0.08))",
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Generational hierarchy
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Drag sideways or downward to explore branches. Select a person to open their story panel.
                            </Typography>
                          </Box>
                          <Box className="graph-hierarchy-scroll">
                            {graphHierarchy.length === 0 ? (
                              <Box
                                sx={{
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  textAlign: "center",
                                  px: 3,
                                }}
                              >
                                <Typography color="text.secondary">
                                  Record parent-child relationships to visualize the family hierarchy.
                                </Typography>
                              </Box>
                            ) : (
                              <Box className="graph-hierarchy-root-list">
                                {graphHierarchy.map((root) => (
                                  <ul key={`hierarchy-root-${root.id}`} className="graph-hierarchy-tree">
                                    {renderGraphHierarchyBranch(root, true)}
                                  </ul>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Paper>
                    {selectedMember && (
                      <MemberDetailPanel
                        member={selectedMember}
                        onClose={onCloseMemberDetail}
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
                        onChange={(event) => onMemberSearchChange(event.target.value)}
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
                        {memberRows.length === 0 && (
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
                        {memberRows.map((member) => {
                          const isDeceased =
                            member.attributes?.lifeStatus === "Deceased";
                          const isEditing = editingId === member.id;
                          const draft = isEditing && editingDraft ? editingDraft : null;
                          const draftAttributes = draft ? draft.customAttributes : [];
                          const fallbackAvatar = createAvatar(
                            member.label,
                            member.gender,
                            isDeceased
                          );
                          const avatarSource =
                            (isEditing ? draft?.imageUrl : member.imageUrl)?.trim();
                          const avatar =
                            avatarSource && avatarSource.length > 0
                              ? avatarSource
                              : fallbackAvatar;
                          const secondaryLineParts = [];
                          if (member.attributes?.dateOfBirth) {
                            secondaryLineParts.push(
                              `Born ${member.attributes.dateOfBirth}`
                            );
                          }
                          if (member.attributes?.address) {
                            secondaryLineParts.push(member.attributes.address);
                          }
                          if (member.attributes?.occupation) {
                            secondaryLineParts.push(member.attributes.occupation);
                          }
                          if (member.attributes?.hometown) {
                            secondaryLineParts.push(member.attributes.hometown);
                          }
                          const secondaryLine = secondaryLineParts.join(" • ");
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
                                          onEditingFieldChange("label", event.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                        error={Boolean(editingNameError)}
                                        helperText={editingNameError || ""}
                                      />
                                    ) : (
                                      <>
                                        <Typography fontWeight={600}>
                                          {member.label}
                                        </Typography>
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
                                      value={draft?.gender ?? member.gender ?? "female"}
                                      onChange={(event) =>
                                        onEditingFieldChange("gender", event.target.value)
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
                                          onEditingFieldChange(
                                            "lifeStatus",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <MenuItem value="Alive">Alive</MenuItem>
                                        <MenuItem value="Deceased">Deceased</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <TextField
                                      label="Address"
                                      value={
                                        draft?.address ?? member.attributes?.address ?? ""
                                      }
                                      onChange={(event) =>
                                        onEditingFieldChange("address", event.target.value)
                                      }
                                      size="small"
                                      fullWidth
                                    />
                                    <TextField
                                      label="Date of Birth"
                                      type="date"
                                      value={
                                        draft?.dateOfBirth ??
                                        member.attributes?.dateOfBirth ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        onEditingFieldChange(
                                          "dateOfBirth",
                                          event.target.value
                                        )
                                      }
                                      size="small"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                      label="Photo URL"
                                      value={draft?.imageUrl ?? member.imageUrl ?? ""}
                                      onChange={(event) =>
                                        onEditingFieldChange("imageUrl", event.target.value)
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
                                              onEditingAttributeChange(
                                                attr.id,
                                                "key",
                                                event.target.value
                                              )
                                            }
                                            size="small"
                                          />
                                          <TextField
                                            label="Value"
                                            value={attr.value}
                                            onChange={(event) =>
                                              onEditingAttributeChange(
                                                attr.id,
                                                "value",
                                                event.target.value
                                              )
                                            }
                                            size="small"
                                          />
                                          <Tooltip title="Remove attribute">
                                            <IconButton
                                              onClick={() => onRemoveEditingAttribute(attr.id)}
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
                                      onClick={onAddEditingAttribute}
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
                                      <IconButton onClick={onCancelEditing} size="small">
                                        <CloseIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Save changes">
                                      <IconButton
                                        onClick={onSaveEditing}
                                        color="primary"
                                        size="small"
                                      >
                                        <CheckIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                ) : (
                                  <Tooltip title="Edit member">
                                    <IconButton onClick={() => onStartEditing(member)}>
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
                        justifyContent: "flex-start",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1.5,
                        pb: 2,
                      }}
                    >
                      <TextField
                        value={relationshipSearch}
                        onChange={(event) =>
                          onRelationshipSearchChange(event.target.value)
                        }
                        size="small"
                        placeholder="Search relationships or names…"
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
                        {relationshipRows.length === 0 && (
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
                        {relationshipRows.map((relationship) => {
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
            <IconButton color="inherit" size="small" onClick={onCloseAlert}>
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
  );
  }

  namespace.AppLayout = AppLayout;
})(window);
