import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    UserCheck,
    LogIn,
    LogOut,
    UserPlus,
    Clock,
    ArrowRight,
    Scan
} from 'lucide-react';
import { getTodayStats, getTodayAttendance } from '../api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_employees: 0,
        present_today: 0,
        punched_in: 0,
        punched_out: 0
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, logsData] = await Promise.all([
                getTodayStats(),
                getTodayAttendance()
            ]);
            setStats(statsData);
            setRecentLogs(logsData.logs.slice(0, 5));
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fade-in">
            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Users size={28} />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.total_employees}</h3>
                        <p>Total Employees</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <UserCheck size={28} />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.present_today}</h3>
                        <p>Present Today</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon info">
                        <LogIn size={28} />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.punched_in}</h3>
                        <p>Currently In</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <LogOut size={28} />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.punched_out}</h3>
                        <p>Punched Out</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                </div>
                <div className="quick-actions">
                    <Link to="/punch" className="action-btn">
                        <div className="icon punch-in">
                            <Scan size={28} />
                        </div>
                        <span>Face Punch</span>
                    </Link>

                    <Link to="/register" className="action-btn">
                        <div className="icon register">
                            <UserPlus size={28} />
                        </div>
                        <span>Register Employee</span>
                    </Link>

                    <Link to="/history" className="action-btn">
                        <div className="icon history">
                            <Clock size={28} />
                        </div>
                        <span>View History</span>
                    </Link>

                    <Link to="/employees" className="action-btn">
                        <div className="icon" style={{ background: 'var(--gradient-dark)', color: 'white' }}>
                            <Users size={28} />
                        </div>
                        <span>Manage Employees</span>
                    </Link>
                </div>
            </div>

            {/* Recent Attendance */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Attendance</h3>
                    <Link to="/history" className="btn btn-ghost">
                        View All <ArrowRight size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner"></div>
                    </div>
                ) : recentLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                        <Clock size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                        <p>No attendance records for today</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Time</th>
                                    <th>Type</th>
                                    <th>Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.map((log) => (
                                    <tr key={log.id} className="slide-in">
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                {log.photo_evidence ? (
                                                    <img
                                                        src={`data:image/jpeg;base64,${log.photo_evidence}`}
                                                        alt={log.user_name}
                                                        className="table-avatar"
                                                    />
                                                ) : (
                                                    <div className="table-avatar" style={{
                                                        background: 'var(--gradient-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 600
                                                    }}>
                                                        {log.user_name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{log.user_name}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>
                                                        {log.employee_id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatTime(log.timestamp)}</td>
                                        <td>
                                            <span className={`badge ${log.punch_type === 'punch_in' ? 'badge-success' : 'badge-warning'}`}>
                                                {log.punch_type === 'punch_in' ? 'IN' : 'OUT'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                color: log.confidence >= 0.9 ? 'var(--success-600)' : 'var(--warning-600)',
                                                fontWeight: 500
                                            }}>
                                                {(log.confidence * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
