((global) => {
  const iconsSource =
    global.MaterialUIIcons ||
    global.MaterialUI?.IconsMaterial ||
    global.MaterialUI?.Icons ||
    {};

  const fallbackIconFactory = (symbol) => {
    const fallback = (props = {}) => {
      const { sx, style, ...rest } = props;
      const host = global.MaterialUI?.Icon;
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
    return fallback;
  };

  const createIcon = (sourceName, ligature, fallbackSymbol = ligature) => {
    if (iconsSource[sourceName]) {
      return iconsSource[sourceName];
    }
    const renderFallbackSymbol = fallbackIconFactory(fallbackSymbol);
    return (props = {}) => {
      const host = global.MaterialUI?.Icon;
      if (host) {
        const { sx, style, ...rest } = props;
        return React.createElement(host, { ...rest, sx, style }, ligature);
      }
      return renderFallbackSymbol(props);
    };
  };

  global.FamilyTreeIcons = {
    EditIcon: createIcon("Edit", "edit", "✏️"),
    DeleteIcon: createIcon("Delete", "delete", "🗑️"),
    AddIcon: createIcon("Add", "add", "＋"),
    CloseIcon: createIcon("Close", "close", "✖️"),
    CheckIcon: createIcon("Check", "check", "✔️"),
    ExpandIcon: createIcon("Fullscreen", "fullscreen", "⛶"),
    CollapseIcon: createIcon("FullscreenExit", "fullscreen_exit", "🗗"),
    SearchIcon: createIcon("Search", "search", "🔍"),
  };
})(window);
