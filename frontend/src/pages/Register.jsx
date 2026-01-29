import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Camera,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    AlertCircle
} from 'lucide-react';
import WebcamCapture from '../components/WebcamCapture';
import { createUser, registerFace } from '../api';

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: User Info, 2: Face Capture, 3: Complete
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [userData, setUserData] = useState({
        employee_id: '',
        name: '',
        email: '',
        department: ''
    });

    const [userId, setUserId] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]);
    const [registrationResult, setRegistrationResult] = useState(null);

    const angleLabels = ['front', 'left', 'right', 'up', 'down'];
    const angleInstructions = [
        'Look directly at the camera',
        'Turn your head slightly left',
        'Turn your head slightly right',
        'Tilt your head slightly up',
        'Tilt your head slightly down'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleCreateUser = async () => {
        if (!userData.employee_id || !userData.name) {
            setError('Employee ID and Name are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await createUser(userData);
            setUserId(response.id);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleCapture = (imageBase64) => {
        setCapturedImages(prev => [...prev, imageBase64]);
    };

    const handleRegisterFaces = async () => {
        if (capturedImages.length < 3) {
            setError('Please capture at least 3 photos');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await registerFace(
                userId,
                capturedImages,
                angleLabels.slice(0, capturedImages.length)
            );

            setRegistrationResult(response);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to register face');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentInstruction = () => {
        if (capturedImages.length >= angleInstructions.length) {
            return 'All angles captured!';
        }
        return angleInstructions[capturedImages.length];
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Steps Indicator */}
            <div className="steps" style={{ marginBottom: 'var(--space-8)' }}>
                <div className={`step ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
                    <div className="step-number">
                        {step > 1 ? <CheckCircle size={18} /> : '1'}
                    </div>
                    <span className="step-label">User Info</span>
                </div>
                <div className={`step ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
                    <div className="step-number">
                        {step > 2 ? <CheckCircle size={18} /> : '2'}
                    </div>
                    <span className="step-label">Face Capture</span>
                </div>
                <div className={`step ${step === 3 ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <span className="step-label">Complete</span>
                </div>
            </div>

            <div className="card">
                {/* Step 1: User Information */}
                {step === 1 && (
                    <>
                        <div className="card-header">
                            <h2 className="card-title">
                                <User size={24} style={{ marginRight: 'var(--space-2)' }} />
                                Employee Information
                            </h2>
                        </div>

                        {error && (
                            <div className="alert alert-danger">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Employee ID *</label>
                            <input
                                type="text"
                                name="employee_id"
                                value={userData.employee_id}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="e.g., EMP001"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={userData.name}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="e.g., John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={userData.email}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="e.g., john@company.com"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input
                                type="text"
                                name="department"
                                value={userData.department}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="e.g., Engineering"
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleCreateUser}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Next: Capture Face'}
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Face Capture */}
                {step === 2 && (
                    <>
                        <div className="card-header">
                            <h2 className="card-title">
                                <Camera size={24} style={{ marginRight: 'var(--space-2)' }} />
                                Face Registration
                            </h2>
                            <span style={{
                                background: 'var(--primary-100)',
                                color: 'var(--primary-700)',
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600
                            }}>
                                {capturedImages.length} / 5 Photos
                            </span>
                        </div>

                        {error && (
                            <div className="alert alert-danger">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                            <span>📸</span>
                            <span><strong>Current:</strong> {getCurrentInstruction()}</span>
                        </div>

                        <WebcamCapture
                            onCapture={handleCapture}
                            status={capturedImages.length >= 5 ? 'success' : 'ready'}
                            statusMessage={getCurrentInstruction()}
                        />

                        {/* Captured Images Preview */}
                        {capturedImages.length > 0 && (
                            <div style={{
                                display: 'flex',
                                gap: 'var(--space-2)',
                                marginTop: 'var(--space-4)',
                                overflowX: 'auto',
                                padding: 'var(--space-2)'
                            }}>
                                {capturedImages.map((img, index) => (
                                    <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                                        <img
                                            src={img}
                                            alt={`Capture ${index + 1}`}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '2px solid var(--success-500)'
                                            }}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            bottom: '-8px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'var(--gray-800)',
                                            color: 'white',
                                            fontSize: 'var(--font-size-xs)',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-sm)'
                                        }}>
                                            {angleLabels[index]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 'var(--space-6)',
                            flexWrap: 'wrap',
                            gap: 'var(--space-3)'
                        }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setCapturedImages([]);
                                }}
                            >
                                Clear Photos
                            </button>

                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setStep(1)}
                                >
                                    <ArrowLeft size={18} />
                                    Back
                                </button>
                                <button
                                    className="btn btn-success btn-lg"
                                    onClick={handleRegisterFaces}
                                    disabled={loading || capturedImages.length < 3}
                                >
                                    {loading ? 'Registering...' : 'Register Face'}
                                    <CheckCircle size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: Complete */}
                {step === 3 && (
                    <div className="recognition-result scale-in">
                        <div className="result-icon success">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="result-name">Registration Complete!</h2>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                            {userData.name} has been successfully registered
                        </p>

                        {registrationResult && (
                            <div style={{
                                background: 'var(--success-50)',
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: 'var(--space-6)'
                            }}>
                                <p style={{ color: 'var(--success-700)' }}>
                                    ✓ {registrationResult.encodings_saved} face encoding(s) saved
                                </p>
                                {registrationResult.quality_issues?.length > 0 && (
                                    <p style={{
                                        color: 'var(--warning-600)',
                                        fontSize: 'var(--font-size-sm)',
                                        marginTop: 'var(--space-2)'
                                    }}>
                                        ⚠ {registrationResult.quality_issues.length} quality issue(s) noted
                                    </p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setStep(1);
                                    setUserData({ employee_id: '', name: '', email: '', department: '' });
                                    setUserId(null);
                                    setCapturedImages([]);
                                    setRegistrationResult(null);
                                }}
                            >
                                Register Another
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/punch')}
                            >
                                Try Face Punch
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
