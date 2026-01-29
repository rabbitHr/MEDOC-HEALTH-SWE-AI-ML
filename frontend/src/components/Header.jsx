import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, UserPlus, Clock, Users, Scan } from 'lucide-react';

const Header = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: Home },
        { path: '/punch', label: 'Punch', icon: Scan },
        { path: '/register', label: 'Register', icon: UserPlus },
        { path: '/history', label: 'History', icon: Clock },
        { path: '/employees', label: 'Employees', icon: Users },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <Scan size={24} />
                    </div>
                    <span className="logo-text">FaceAttend</span>
                </Link>

                <nav className="nav">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`nav-link ${isActive(path) ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;
