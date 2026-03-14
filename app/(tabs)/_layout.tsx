import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#3b5998' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="brand-explorer"
        options={{
          title: 'Brands',
          tabBarLabel: 'Brands',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="completion"
        options={{
          title: 'Countries',
          tabBarLabel: 'Countries',
          tabBarIcon: ({ color, size }) => <Ionicons name="earth-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dream"
        options={{
          title: 'Dream',
          tabBarLabel: 'Dream',
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="hotel" options={{ href: null }} />
    </Tabs>
  );
}
