import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Register from './Register';
import Dashboard from './pages/Dashboard';
import HotelList from './pages/HotelList';
import HotelForm from './pages/HotelForm';
import BookingList from './pages/BookingList';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hotels" element={<HotelList />} />
        <Route path="/hotels/new" element={<HotelForm />} />
        <Route path="/hotels/:id" element={<HotelForm />} />
        <Route path="/bookings" element={<BookingList />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
