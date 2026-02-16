import { Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth.js'; // You'll create this

export default function RootLayout() {
  const { user, isLoading } = useAuth();

  // Show loading screen while checking auth
  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth group - no user logged in
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      ) : (
        // App group - user is logged in
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}