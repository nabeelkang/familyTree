((global) => {
  const namespace =
    global.FamilyTreeMembers || (global.FamilyTreeMembers = {});
  const React = global.React;
  const {
    attributesToCustomList,
    compileAttributes,
    createAttributeId,
    getMemberAvatarAssets,
  } = global.FamilyTreeData;

  function useMemberManagement(initialMembers, { onAlert } = {}) {
    const [members, setMembers] = React.useState(initialMembers);
    const [memberName, setMemberName] = React.useState("");
    const [memberGender, setMemberGender] = React.useState("female");
    const [memberLifeStatus, setMemberLifeStatus] = React.useState("Alive");
    const [memberAddress, setMemberAddress] = React.useState("");
    const [memberDateOfBirth, setMemberDateOfBirth] = React.useState("");
    const [memberImageUrl, setMemberImageUrl] = React.useState("");
    const [memberAttributes, setMemberAttributes] = React.useState([]);
    const [memberNameError, setMemberNameError] = React.useState("");

    const [selectedMemberId, setSelectedMemberId] = React.useState(null);
    const [editingMemberId, setEditingMemberId] = React.useState(null);
    const [editingMemberDraft, setEditingMemberDraft] = React.useState(null);
    const [editingNameError, setEditingNameError] = React.useState("");
    const [memberSearch, setMemberSearch] = React.useState("");

    const alertRef = React.useRef(onAlert);
    React.useEffect(() => {
      alertRef.current = onAlert;
    }, [onAlert]);

    const sendAlert = React.useCallback((message) => {
      if (message) {
        alertRef.current?.(message);
      }
    }, []);

    const resetMemberForm = React.useCallback(() => {
      setMemberName("");
      setMemberGender("female");
      setMemberLifeStatus("Alive");
      setMemberAddress("");
      setMemberDateOfBirth("");
      setMemberImageUrl("");
      setMemberAttributes([]);
      setMemberNameError("");
    }, []);

    const handleAddAttribute = React.useCallback(() => {
      setMemberAttributes((prev) => [
        ...prev,
        { id: createAttributeId(), key: "", value: "" },
      ]);
    }, []);

    const handleMemberAttributeChange = React.useCallback((id, field, value) => {
      setMemberAttributes((prev) =>
        prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr))
      );
    }, []);

    const handleRemoveMemberAttribute = React.useCallback((id) => {
      setMemberAttributes((prev) => prev.filter((attr) => attr.id !== id));
    }, []);

    const handleStartEditingMember = React.useCallback((member) => {
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
    }, []);

    const handleCancelEditingMember = React.useCallback(() => {
      setEditingMemberId(null);
      setEditingMemberDraft(null);
      setEditingNameError("");
    }, []);

    const handleEditingDraftChange = React.useCallback((field, value) => {
      setEditingMemberDraft((prev) => {
        if (!prev) {
          return prev;
        }
        if (field === "label" && editingNameError) {
          setEditingNameError("");
        }
        return { ...prev, [field]: value };
      });
    }, [editingNameError]);

    const handleAddEditingAttribute = React.useCallback(() => {
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
    }, []);

    const handleEditingAttributeChange = React.useCallback((id, field, value) => {
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
    }, []);

    const handleRemoveEditingAttribute = React.useCallback((id) => {
      setEditingMemberDraft((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          customAttributes: prev.customAttributes.filter((attr) => attr.id !== id),
        };
      });
    }, []);

    const handleSaveEditingMember = React.useCallback(() => {
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
      sendAlert("Member updated.");
      setEditingMemberId(null);
      setEditingMemberDraft(null);
      setEditingNameError("");
    }, [editingMemberDraft, editingMemberId, sendAlert]);

    const handleMemberNameChange = React.useCallback((value) => {
      setMemberName(value);
      if (memberNameError) {
        setMemberNameError("");
      }
    }, [memberNameError]);

    const handleAddMember = React.useCallback(
      (event) => {
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
        sendAlert(`Added ${newMember.label}`);
      },
      [
        memberAddress,
        memberAttributes,
        memberDateOfBirth,
        memberGender,
        memberImageUrl,
        memberLifeStatus,
        memberName,
        members,
        resetMemberForm,
        sendAlert,
      ]
    );

    React.useEffect(() => {
      if (
        selectedMemberId &&
        !members.some((member) => member.id === selectedMemberId)
      ) {
        setSelectedMemberId(null);
      }
    }, [members, selectedMemberId]);

    React.useEffect(() => {
      if (
        editingMemberId &&
        !members.some((member) => member.id === editingMemberId)
      ) {
        setEditingMemberId(null);
        setEditingMemberDraft(null);
        setEditingNameError("");
      }
    }, [members, editingMemberId]);

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

    const memberOptions = React.useMemo(
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

    return {
      members,
      setMembers,
      selectedMemberId,
      setSelectedMemberId,
      selectedMember,
      sortedMembers,
      memberById,
      filteredMembers,
      memberOptions,
      resetForm: resetMemberForm,
      memberForm: {
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
      },
      memberSearchState: {
        value: memberSearch,
        onChange: setMemberSearch,
      },
      memberTable: {
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
      },
    };
  }

  namespace.useMemberManagement = useMemberManagement;
})(window);
