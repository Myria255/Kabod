import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BibleItem({ verse }) {
  return (
    <View style={styles.item}>
      <Text style={styles.text}>{verse}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 8,
  },
  text: { fontSize: 16 },
});
