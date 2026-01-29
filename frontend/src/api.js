import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============ User API ============

export const createUser = async (userData) => {
    const response = await api.post('/users/', userData);
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get('/users/');
    return response.data;
};

export const getUser = async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const registerFace = async (userId, images, angleLabels = null) => {
    const response = await api.post('/users/register-face', {
        user_id: userId,
        images: images,
        angle_labels: angleLabels
    });
    return response.data;
};

export const deleteUser = async (userId) => {
    await api.delete(`/users/${userId}`);
};

export const deleteFaceEncodings = async (userId) => {
    await api.delete(`/users/${userId}/face-encodings`);
};

// ============ Attendance API ============

export const recognizeFace = async (imageBase64) => {
    const response = await api.post('/attendance/recognize', {
        image: imageBase64
    });
    return response.data;
};

export const punch = async (imageBase64, frames = null) => {
    const response = await api.post('/attendance/punch', {
        image: imageBase64,
        frames: frames
    });
    return response.data;
};

export const getAttendanceHistory = async (params = {}) => {
    const response = await api.get('/attendance/history', { params });
    return response.data;
};

export const getTodayAttendance = async () => {
    const response = await api.get('/attendance/today');
    return response.data;
};

export const getTodayStats = async () => {
    const response = await api.get('/attendance/stats/today');
    return response.data;
};

export const checkLiveness = async (frames) => {
    const response = await api.post('/attendance/liveness-check', {
        frames: frames
    });
    return response.data;
};

export default api;
