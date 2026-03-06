import { COLORS } from "@/src/constants/colors";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const Item = ({
  icon,
  label,
  description,
  onPress,
}: {
  icon: IconName;
  label: string;
  description?: string;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.item,
      pressed && styles.pressed,
    ]}
  >
    <View style={styles.itemContent}>
      <View style={styles.iconBox}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={COLORS.gold} 
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          {label}
        </Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>

    <View style={styles.arrowBox}>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.gray}
      />
    </View>
  </Pressable>
);

export default function MeditationPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  async function ouvrirLectureRapide() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    router.push("/meditation/lecture");
  }

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: isTablet ? 40 : 24 },
      ]}
    >
      <View style={[styles.content, { maxWidth: 600 }]}>
        <Item
          icon="book"
          label="Bible complète"
          description="Version écrite et audio disponible"
          onPress={() => router.push("/bible")}
        />

        <Item
          icon="create-outline"
          label="Carnet de méditation"
          description="Notes et réflexions personnelles"
          onPress={() => router.push("/meditation/carnet")}
        />

        <Item
          icon="calendar-outline"
          label="Programme journalier"
          description="Méditations quotidiennes guidées"
          onPress={() => router.push("/meditation/programme")}
        />

        <Item
          icon="library-outline"
          label="Lecture annuelle"
          description="Plan de lecture sur 365 jours"
          onPress={ouvrirLectureRapide}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: COLORS.grayLight,
  },

  content: {
    width: "100%",
    gap: 14,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: COLORS.blueDark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    flex: 1,
    gap: 2,
  },

  text: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.blueDark,
    letterSpacing: -0.2,
  },

  description: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },

  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
