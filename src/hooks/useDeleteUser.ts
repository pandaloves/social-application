import { useAuth } from '@/src/contexts/AuthContext';
import { userService } from '@/src/services/api';
import { useState } from 'react';


export const useDeleteUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  const deleteUser = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verify the user is deleting their own account
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          
          if (currentUser.id !== userId) {
            throw new Error('Unauthorized: You can only delete your own account');
          }
        } else {
          throw new Error('No user found in session');
        }
      }
      
      await userService.deleteUser(userId);
      
      // Logout after successful deletion
      logout();
      
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteUser, isLoading, error };
};