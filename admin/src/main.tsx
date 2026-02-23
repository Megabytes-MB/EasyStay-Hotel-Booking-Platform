import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Register from './Register';
import Dashboard from './pages/Dashboard';
import HotelList from './pages/HotelList';
import HotelForm from './pages/HotelForm';
import BookingList from './pages/BookingList';
import Statistics from './pages/Statistics';
import HolidayList from './pages/HolidayList';
import PrivateRoute from './PrivateRoute';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/hotels" element={<PrivateRoute><HotelList /></PrivateRoute>} />
        <Route path="/hotels/new" element={<PrivateRoute><HotelForm /></PrivateRoute>} />
        <Route path="/hotels/:id" element={<PrivateRoute><HotelForm /></PrivateRoute>} />
        <Route path="/bookings" element={<PrivateRoute><BookingList /></PrivateRoute>} />
        <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
        <Route path="/holidays" element={<PrivateRoute><HolidayList /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
