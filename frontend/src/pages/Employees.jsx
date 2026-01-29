import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Trash2,
    RefreshCw,
    Camera,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { getUsers, deleteUser, deleteFaceEncodings } from '../api';

const Employees = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await getUsers();
            setUsers(response.users);
            setTotal(response.total);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        try {
            await deleteUser(userId);
            setShowDeleteModal(null);
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleResetFace = async (userId) => {
        try {
            await deleteFaceEncodings(userId);
            loadUsers();
        } catch (error) {
            console.error('Error resetting face:', error);
        }
    };

    const filteredUsers = users.filter(user => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return user.name.toLowerCase().includes(searchLower) ||
            user.employee_id.toLowerCase().includes(searchLower) ||
            (user.email && user.email.toLowerCase().includes(searchLower));
    });

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        <Users size={24} style={{ marginRight: 'var(--space-2)' }} />
                        Employees ({total})
                    </h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/register')}
                    >
                        <UserPlus size={18} />
                        Add Employee
                    </button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, ID, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                        <Users size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                        <p>No employees registered yet</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-4)' }}
                            onClick={() => navigate('/register')}
                        >
                            <UserPlus size={18} />
                            Register First Employee
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Face Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, index) => (
                                    <tr key={user.id} className="slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                {user.profile_photo ? (
                                                    <img
                                                        src={`data:image/jpeg;base64,${user.profile_photo}`}
                                                        alt={user.name}
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
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>
                                                        {user.employee_id}
                                                    </div>
                                                    {user.email && (
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-400)' }}>
                                                            {user.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{user.department || '-'}</td>
                                        <td>
                                            {user.has_face_registered ? (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={12} />
                                                    Registered
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">
                                                    <AlertCircle size={12} />
                                                    Not Set
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                {user.has_face_registered && (
                                                    <button
                                                        className="btn btn-icon btn-ghost"
                                                        title="Reset Face Data"
                                                        onClick={() => handleResetFace(user.id)}
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                )}
                                                {!user.has_face_registered && (
                                                    <button
                                                        className="btn btn-icon btn-ghost"
                                                        title="Register Face"
                                                        onClick={() => navigate(`/register?user_id=${user.id}`)}
                                                    >
                                                        <Camera size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-icon btn-ghost"
                                                    title="Delete Employee"
                                                    onClick={() => setShowDeleteModal(user)}
                                                    style={{ color: 'var(--danger-500)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowDeleteModal(null)}>
                    <div
                        className="card scale-in"
                        style={{ maxWidth: '400px', margin: 'var(--space-4)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Delete Employee?</h3>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
                            Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?
                            This will remove all their face data and attendance records.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowDeleteModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(showDeleteModal.id)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
