import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import '../styles/header.css';

const Header: React.FC = () => {
    const navigate = useNavigate();
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <nav className="nav-container">
                <div className="nav-links">
                    <Link to="/" className="nav-link">
                        Состояние рынка
                    </Link>
                    <Link to="/portfolios" className="nav-link">
                        Мои портфели
                    </Link>
                </div>
                <button onClick={handleLogout} className="logout-button">
                    Выйти
                </button>
            </nav>
        </header>
    );
};

export default Header; 