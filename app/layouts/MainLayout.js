import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // Assure-toi d'avoir installé : npm install react-native-vector-icons

// Import des écrans
import Bible from '../tabs/Bible';

// Création du navigateur à onglets
const Tab = createBottomTabNavigator();

export default function MainLayout() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#708238',
          tabBarInactiveTintColor: '#8B5E3C',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Bible"
          component={Bible}
          options={{
            tabBarLabel: 'Bible',
            tabBarIcon: ({ color, size }) => (
              <Icon name="book-outline" color={color} size={size} />
            ),
          }}
        />

        
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Styles optionnels pour affiner l’apparence
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FDF6E3',
    borderTopWidth: 1,
    borderTopColor: '#E8DAB2',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});