import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Punch from './pages/Punch';
import Register from './pages/Register';
import History from './pages/History';
import Employees from './pages/Employees';

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/punch" element={<Punch />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/employees" element={<Employees />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
