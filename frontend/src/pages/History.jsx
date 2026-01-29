import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, Search } from 'lucide-react';
import { getAttendanceHistory } from '../api';

const History = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
        punchType: ''
    });

    const limit = 20;

    useEffect(() => {
        loadHistory();
    }, [page]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const params = {
                skip: page * limit,
                limit: limit
            };

            if (filters.startDate) params.start_date = filters.startDate;
            if (filters.endDate) params.end_date = filters.endDate;

            const response = await getAttendanceHistory(params);
            setLogs(response.logs);
            setTotal(response.total);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(0);
        loadHistory();
    };

    const formatDateTime = (timestamp) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const filteredLogs = logs.filter(log => {
        if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!log.user_name.toLowerCase().includes(search) &&
                !log.employee_id.toLowerCase().includes(search)) {
                return false;
            }
        }
        if (filters.punchType && log.punch_type !== filters.punchType) {
            return false;
        }
        return true;
    });

    const exportCSV = () => {
        const headers = ['Employee ID', 'Name', 'Type', 'Date', 'Time', 'Confidence', 'Liveness'];
        const rows = filteredLogs.map(log => {
            const { date, time } = formatDateTime(log.timestamp);
            return [
                log.employee_id,
                log.user_name,
                log.punch_type,
                date,
                time,
                `${(log.confidence * 100).toFixed(1)}%`,
                log.liveness_passed ? 'Yes' : 'No'
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        <Calendar size={24} style={{ marginRight: 'var(--space-2)' }} />
                        Attendance History
                    </h2>
                    <button className="btn btn-outline" onClick={exportCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end'
                }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '200px' }}>
                        <label className="form-label">Search</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--gray-400)'
                            }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name or ID..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Type</label>
                        <select
                            className="form-input"
                            value={filters.punchType}
                            onChange={(e) => setFilters(prev => ({ ...prev, punchType: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="punch_in">Punch In</option>
                            <option value="punch_out">Punch Out</option>
                        </select>
                    </div>

                    <button className="btn btn-primary" onClick={handleSearch}>
                        <Filter size={18} />
                        Apply
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                        <Calendar size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                        <p>No attendance records found</p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Type</th>
                                        <th>Confidence</th>
                                        <th>Liveness</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, index) => {
                                        const { date, time } = formatDateTime(log.timestamp);
                                        return (
                                            <tr key={log.id} className="slide-in" style={{ animationDelay: `${index * 50}ms` }}>
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
                                                <td>{date}</td>
                                                <td style={{ fontWeight: 500 }}>{time}</td>
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
                                                <td>
                                                    <span className={`badge ${log.liveness_passed ? 'badge-success' : 'badge-danger'}`}>
                                                        {log.liveness_passed ? '✓' : '✗'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 'var(--space-6)',
                                paddingTop: 'var(--space-4)',
                                borderTop: '1px solid var(--gray-200)'
                            }}>
                                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
                                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total} records
                                </span>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= totalPages - 1}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default History;
