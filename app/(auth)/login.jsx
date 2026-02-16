import { View, Text, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Login() {
  const handleLogin = () => {
    // Implement your login logic here
    // After successful login, navigation will automatically switch to app group
    console.log('Login pressed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Button title="Login" onPress={handleLogin} />
      <Button 
        title="Go to Register" 
        onPress={() => router.push('/register')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});