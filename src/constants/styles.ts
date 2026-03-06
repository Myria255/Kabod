import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const GLOBAL_STYLES = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    padding: 20,
  },

  card: {
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.gold,
    shadowColor: COLORS.black,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
  },

  cardText: {
    marginTop: 6,
    color: "#EAEAFF",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  itemText: {
    fontSize: 16,
    color: COLORS.black,
  },
});
