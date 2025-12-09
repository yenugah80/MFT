import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: COLORS.text,
  },
  text: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  subText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + "15",
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
});
