import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// User type matching the server-side Express.User
export interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<User>;
  register: (userData: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
}

interface RegisterData {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Fetch current user data
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: true,
    gcTime: 0, // Don't cache this query
    queryFn: async ({ queryKey }) => {
      try {
        return await apiRequest<User | null>(queryKey[0] as string);
      } catch (error) {
        // If 401 Unauthorized, return null (not authenticated) without error
        if (error instanceof Error && error.message.includes('401')) {
          return null;
        }
        throw error;
      }
    }
  });

  // Login function
  const login = async (username: string, password: string): Promise<User> => {
    try {
      setError(null);
      const user = await apiRequest<User>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      // Update query cache with the user data
      queryClient.setQueryData(['/api/auth/user'], user);
      return user;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Login failed'));
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<User> => {
    try {
      setError(null);
      const user = await apiRequest<User>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      // Update query cache with the user data
      queryClient.setQueryData(['/api/auth/user'], user);
      return user;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Registration failed'));
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear user from cache and invalidate the query
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Logout failed'));
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// Hook for using the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}