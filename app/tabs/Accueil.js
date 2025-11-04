import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Accueil() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Kabod 🙌</Text>
      <Text style={styles.text}>
        Grandis dans la foi à travers une expérience numérique immersive.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});
