const iconsSource =
  window.MaterialUIIcons ||
  window.MaterialUI?.IconsMaterial ||
  window.MaterialUI?.Icons ||
  {};

const fallbackIconFactory = (symbol) => {
  const fallback = (props = {}) => {
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
  return fallback;
};

const createIcon = (sourceName, ligature, fallbackSymbol = ligature) => {
  if (iconsSource[sourceName]) {
    return iconsSource[sourceName];
  }
  const renderFallbackSymbol = fallbackIconFactory(fallbackSymbol);
  return (props = {}) => {
    const host = MaterialUI?.Icon;
    if (host) {
      const { sx, style, ...rest } = props;
      return React.createElement(host, { ...rest, sx, style }, ligature);
    }
    return renderFallbackSymbol(props);
  };
};

export const EditIcon = createIcon("Edit", "edit", "✏️");
export const DeleteIcon = createIcon("Delete", "delete", "🗑️");
export const AddIcon = createIcon("Add", "add", "＋");
export const CloseIcon = createIcon("Close", "close", "✖️");
export const CheckIcon = createIcon("Check", "check", "✔️");
export const ExpandIcon = createIcon("Fullscreen", "fullscreen", "⛶");
export const CollapseIcon = createIcon(
  "FullscreenExit",
  "fullscreen_exit",
  "🗗"
);
export const SearchIcon = createIcon("Search", "search", "🔍");
