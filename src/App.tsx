import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PrivateRoute from './components/PrivateRoute';
import { logout } from './api/auth';
import MarketPage from './pages/MarketPage';
import PortfoliosPage from "./pages/PortfoliosPage";
import {PortfolioDetailsPage} from "./pages/PortfolioDetalisPage";


const NavigationBar: React.FC = () => {
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{ padding: '1rem', backgroundColor: '#eee' }}>
            <Link to="/" style={{ marginRight: '1rem' }}>Состояние рынка</Link>
            <Link to="/portfolios" style={{ marginRight: '1rem' }}>Мои портфели</Link>
            <button onClick={handleLogout}>🚪 Выйти</button>
        </nav>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <NavigationBar />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <MarketPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/portfolios"
                    element={
                        <PrivateRoute>
                            <PortfoliosPage />
                        </PrivateRoute>
                    }
                />
                <Route path="/portfolio/:id" element={<PortfolioDetailsPage />} />

            </Routes>
        </Router>
    );
};

export default App;
