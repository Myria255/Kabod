
import { View, Image, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import Accueil from './app/tabs/Accueil';
import Bible from './app/tabs/Bible';

const Tab = createBottomTabNavigator();

// Composant Header avec logo + titre dynamique
function HeaderLogoTitle({ routeName }) {
  return (
    <View style={styles.headerContainer}>
      <Image
        source={require('./assets/images/Kabod.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>{routeName}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Accueil') {
              iconName = 'home';
            } else if (route.name === 'Bible') {
              iconName = 'book';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FFD700',
          tabBarInactiveTintColor: '#ffffff',
          tabBarStyle: { 
            backgroundColor: '#87CEEB', 
            borderTopColor: '#87CEEB', 
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
          },
          headerStyle: { 
            backgroundColor: '#87CEEB',
            height: 90,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          headerTintColor: '#fff',
          headerTitleAlign: 'left',
          headerTitle: () => <HeaderLogoTitle routeName={route.name} />,
          headerLeftContainerStyle: {
            paddingLeft: 16,
          },
        })}
      >
        <Tab.Screen name="Accueil" component={Accueil} />
        <Tab.Screen name="Bible" component={Bible} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logo: {
    width: 50,
    height: 45,
    resizeMode: 'contain',
    
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});