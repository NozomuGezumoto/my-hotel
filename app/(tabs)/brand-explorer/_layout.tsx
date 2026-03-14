import { Stack } from 'expo-router';

export default function BrandExplorerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[brand]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
