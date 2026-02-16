import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (e.g., check async storage, token, etc.)
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Implement your auth check logic here
      // For demo, we'll set no user initially
      setUser(null);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading };
}