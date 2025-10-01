((global) => {
  const namespace =
    global.FamilyTreeRelationships ||
    (global.FamilyTreeRelationships = {});
  const React = global.React;
  const { getMemberAvatarAssets } = global.FamilyTreeData;

  function useRelationshipManagement(
    initialRelationships,
    { sortedMembers = [], memberById = new Map(), onAlert } = {}
  ) {
    const [relationships, setRelationships] = React.useState(
      initialRelationships
    );
    const [relationshipType, setRelationshipType] = React.useState("parent");
    const [relationshipFrom, setRelationshipFrom] = React.useState("");
    const [relationshipTo, setRelationshipTo] = React.useState("");
    const [relationshipSearch, setRelationshipSearch] = React.useState("");

    const alertRef = React.useRef(onAlert);
    React.useEffect(() => {
      alertRef.current = onAlert;
    }, [onAlert]);

    const sendAlert = React.useCallback((message) => {
      if (message) {
        alertRef.current?.(message);
      }
    }, []);

    const resetForm = React.useCallback(() => {
      setRelationshipType("parent");
      setRelationshipFrom("");
      setRelationshipTo("");
    }, []);

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

    const relationshipSecondLabel = React.useMemo(() => {
      if (relationshipType === "spouse") {
        return "Second Spouse";
      }
      if (relationshipType === "divorced") {
        return "Former Partner";
      }
      return "Child";
    }, [relationshipType]);

    const relationshipExists = React.useCallback(
      (from, to, type) => {
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
      },
      [relationships]
    );

    const hasPartnerHistory = React.useCallback(
      (memberId) =>
        relationships.some(
          (relationship) =>
            (relationship.type === "spouse" || relationship.type === "divorced") &&
            (relationship.from === memberId || relationship.to === memberId)
        ),
      [relationships]
    );

    const handleAddRelationship = React.useCallback(
      (event) => {
        event.preventDefault();
        const from = Number(relationshipFrom);
        const to = Number(relationshipTo);

        if (!from || !to || from === to) {
          sendAlert("Please choose two different family members.");
          return;
        }

        if (relationshipExists(from, to, relationshipType)) {
          sendAlert("This relationship already exists.");
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
            sendAlert("Record a spouse relationship before marking a divorce.");
            return;
          }
        }

        if (relationshipType === "parent" && !hasPartnerHistory(from)) {
          sendAlert(
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
        sendAlert(
          relationshipType === "spouse"
            ? "Spouse relationship added."
            : relationshipType === "divorced"
            ? "Divorce recorded."
            : "Parent relationship added."
        );
      },
      [
        hasPartnerHistory,
        relationshipExists,
        relationshipFrom,
        relationshipTo,
        relationshipType,
        relationships,
        sendAlert,
      ]
    );

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

    return {
      relationships,
      setRelationships,
      resetForm,
      relationshipForm: {
        type: relationshipType,
        options: relationshipOptions,
        firstPersonValue,
        secondPersonValue,
        secondLabel: relationshipSecondLabel,
        onTypeChange: setRelationshipType,
        onFirstPersonChange: setRelationshipFrom,
        onSecondPersonChange: setRelationshipTo,
        onSubmit: handleAddRelationship,
      },
      relationshipSearchState: {
        value: relationshipSearch,
        onChange: setRelationshipSearch,
      },
      relationshipTable: {
        items: filteredRelationships,
        relationships,
        memberById,
      },
    };
  }

  namespace.useRelationshipManagement = useRelationshipManagement;
})(window);
