import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/user.context';

const UserProtectionWrapper = ({ children }) => {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  
  if (!token || !user) {
    // Clear any stale data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to login if no token or user found
    return <Navigate to="/login" replace />;
  }
  
  // Render children if token and user exist
  return children;
};

export default UserProtectionWrapper; 