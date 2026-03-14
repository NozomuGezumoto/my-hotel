import { Stack } from 'expo-router';

export default function CompletionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[countryCode]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
