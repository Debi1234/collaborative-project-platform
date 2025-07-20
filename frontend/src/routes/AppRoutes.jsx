import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../screens/Home';
import Login from '../screens/Login';
import Register from '../screens/Register';
import Project from '../screens/Project';
import UserProtectionWrapper from '../components/UserProtectionWrapper';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} /> 
        <Route path="/register" element={<Register />} /> 
        
        {/* Protected routes */}
        <Route path="/" element={
          <UserProtectionWrapper>
            <Home />
          </UserProtectionWrapper>
        } /> 
        <Route path="/project" element={
          <UserProtectionWrapper>
            <Project />
          </UserProtectionWrapper>
        } /> 
      </Routes>
    </Router>
  );
};

export default AppRoutes;
