import { CloseIcon } from "../icons.js";

const {
  Paper,
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
} = MaterialUI;

const { getMemberAvatarAssets, emptyAvatarAssets } = window.FamilyTreeData;

export function MemberDetailPanel({ member, onClose }) {
  const hasSelection = Boolean(member);
  const { avatar, fallbackAvatar, customAvatar, isDeceased } = hasSelection
    ? getMemberAvatarAssets(member)
    : emptyAvatarAssets;
  const address = member?.attributes?.address || "";
  const otherAttributes = hasSelection
    ? Object.entries(member.attributes || {}).filter(
        ([key]) => key !== "lifeStatus" && key !== "address"
      )
    : [];
  const mapUrl = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`
    : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: "100%", md: 340 },
        borderRadius: 3,
        overflow: "hidden",
        flexShrink: 0,
        bgcolor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {hasSelection ? "Member Details" : "Select a Member"}
        </Typography>
        {hasSelection && (
          <Tooltip title="Close details">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {hasSelection ? (
          <>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={avatar}
                alt={member.label}
                imgProps={
                  customAvatar && fallbackAvatar
                    ? {
                        onError: (event) => {
                          event.target.onerror = null;
                          event.target.src = fallbackAvatar;
                        },
                      }
                    : undefined
                }
                sx={{
                  width: 72,
                  height: 72,
                  boxShadow: isDeceased
                    ? "0 0 0 4px rgba(156, 163, 175, 0.45)"
                    : "0 0 0 4px rgba(99, 102, 241, 0.35)",
                  filter: isDeceased ? "grayscale(0.65)" : "none",
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
                  {member.label}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mt: 1 }}
                >
                  <Chip
                    label={member.gender === "male" ? "Male" : "Female"}
                    color={member.gender === "male" ? "primary" : "secondary"}
                    size="small"
                  />
                  {member.attributes?.lifeStatus && (
                    <Chip
                      label={`Life: ${member.attributes.lifeStatus}`}
                      size="small"
                      color={
                        member.attributes.lifeStatus === "Deceased"
                          ? "default"
                          : "success"
                      }
                      variant={
                        member.attributes.lifeStatus === "Deceased"
                          ? "outlined"
                          : "filled"
                      }
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
            {address && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {address}
                </Typography>
                <Box
                  sx={{
                    mt: 1.5,
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: 3,
                    height: 220,
                  }}
                >
                  <iframe
                    title={`Map for ${member.label}`}
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </Box>
              </Box>
            )}
            {otherAttributes.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Attributes
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {otherAttributes.map(([key, value]) => (
                    <Box key={key}>
                      <Typography variant="body2" fontWeight={600}>
                        {key}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {value || "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
            {!address && otherAttributes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No additional attributes recorded yet.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Click a person in the graph to view their story and address.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
