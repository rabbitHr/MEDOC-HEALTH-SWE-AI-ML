import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    XCircle,
    Loader,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import WebcamCapture from '../components/WebcamCapture';
import { punch } from '../api';

const Punch = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('ready'); // ready, processing, success, error
    const [result, setResult] = useState(null);
    const [frames, setFrames] = useState([]);
    const [message, setMessage] = useState('Position your face in the frame and click capture');

    const handleCapture = async (imageBase64, framesOverride = null) => {
        setStatus('processing');
        setMessage('Recognizing face...');

        try {
            // Use collected frames for liveness (if available)
            // Use override frames if provided (for auto-capture immediacy), otherwise use state frames
            const framesToUse = Array.isArray(framesOverride) ? framesOverride : frames;
            const response = await punch(imageBase64, framesToUse.length > 2 ? framesToUse : null);

            if (response.success) {
                setStatus('success');
                setResult(response);
                setMessage(`${response.punch_type === 'punch_in' ? 'Punched In' : 'Punched Out'} Successfully!`);
            } else {
                setStatus('error');
                setResult(response);
                setMessage(response.message || 'Recognition failed');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.detail || 'An error occurred');
        }
    };

    const handleFramesCollected = (collectedFrames) => {
        setFrames(collectedFrames);
        // Auto-submit with the last frame when we have enough frames
        if (collectedFrames.length > 0) {
            handleCapture(collectedFrames[collectedFrames.length - 1], collectedFrames);
        }
    };

    const handleReset = () => {
        setStatus('ready');
        setResult(null);
        setFrames([]);
        setMessage('Position your face in the frame and click capture');
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'processing':
                return 'Processing...';
            case 'success':
                return 'Success!';
            case 'error':
                return 'Try Again';
            default:
                return message;
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Face Punch</h2>
                    {status !== 'ready' && (
                        <button className="btn btn-ghost" onClick={handleReset}>
                            <RefreshCw size={18} />
                            Reset
                        </button>
                    )}
                </div>

                {status === 'success' && result ? (
                    <div className="recognition-result scale-in">
                        <div className="result-icon success">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="result-name">{result.user_name}</h2>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                            {result.punch_type === 'punch_in' ? 'Punched In' : 'Punched Out'} at{' '}
                            {new Date(result.timestamp).toLocaleTimeString()}
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge ${result.punch_type === 'punch_in' ? 'badge-success' : 'badge-warning'}`}>
                                {result.punch_type === 'punch_in' ? 'PUNCH IN' : 'PUNCH OUT'}
                            </span>
                            <span className="badge badge-info">
                                {(result.confidence * 100).toFixed(1)}% Match
                            </span>
                            {result.liveness_passed && (
                                <span className="badge badge-success">
                                    Liveness ✓
                                </span>
                            )}
                        </div>
                        <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={handleReset}>
                                <RefreshCw size={18} />
                                Another Punch
                            </button>
                            <button className="btn btn-outline" onClick={() => navigate('/')}>
                                Dashboard
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                ) : status === 'error' ? (
                    <div className="recognition-result scale-in">
                        <div className="result-icon error">
                            <XCircle size={48} />
                        </div>
                        <h2 style={{ color: 'var(--danger-600)', marginBottom: 'var(--space-2)' }}>
                            Recognition Failed
                        </h2>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
                            {message}
                        </p>
                        <button className="btn btn-primary" onClick={handleReset}>
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <WebcamCapture
                            onCapture={handleCapture}
                            onFramesCollected={handleFramesCollected}
                            autoCapture={status === 'ready'}
                            status={status}
                            statusMessage={getStatusMessage()}
                        />

                        {status === 'processing' && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-3)',
                                marginTop: 'var(--space-4)',
                                color: 'var(--primary-600)'
                            }}>
                                <Loader size={20} className="spinner" style={{ border: 'none', animation: 'spin 1s linear infinite' }} />
                                <span>Processing...</span>
                            </div>
                        )}

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <div className="alert alert-info">
                                <span>💡</span>
                                <span>
                                    <strong>Tip:</strong> Ensure good lighting and look directly at the camera.
                                    The system will automatically detect and verify your face.
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Punch;
