import { View, Text, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Register() {
  const handleRegister = () => {
    // Implement your registration logic here
    console.log('Register pressed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <Button title="Register" onPress={handleRegister} />
      <Button 
        title="Back to Login" 
        onPress={() => router.back()} 
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