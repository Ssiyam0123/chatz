import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect to the appropriate layout based on auth state
  return <Redirect href="/(auth)/login" />;
}