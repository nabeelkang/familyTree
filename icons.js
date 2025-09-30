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

export const EditIcon = iconsSource.Edit || fallbackIconFactory("✏️");
export const DeleteIcon = iconsSource.Delete || fallbackIconFactory("🗑️");
export const AddIcon = iconsSource.Add || fallbackIconFactory("＋");
export const CloseIcon = iconsSource.Close || fallbackIconFactory("✖️");
export const CheckIcon = iconsSource.Check || fallbackIconFactory("✔️");
export const ExpandIcon = iconsSource.Fullscreen || fallbackIconFactory("⛶");
export const CollapseIcon =
  iconsSource.FullscreenExit || fallbackIconFactory("🗗");
export const SearchIcon = iconsSource.Search || fallbackIconFactory("🔍");
