import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, AlertCircle, CheckCircle } from 'lucide-react';

const WebcamCapture = ({
    onCapture,
    onFramesCollected,
    showGuide = true,
    autoCapture = false,
    captureInterval = 500,
    maxFrames = 5,
    status = 'ready',
    statusMessage = 'Position your face in the frame'
}) => {
    const webcamRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [capturedFrames, setCapturedFrames] = useState([]);
    const [error, setError] = useState(null);

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: 'user'
    };

    const handleUserMedia = useCallback(() => {
        setIsReady(true);
        setError(null);
    }, []);

    const handleUserMediaError = useCallback((err) => {
        setError('Camera access denied. Please allow camera permissions.');
        console.error('Webcam error:', err);
    }, []);

    // Capture single frame
    const captureFrame = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                return imageSrc;
            }
        }
        return null;
    }, []);

    // Manual capture
    const handleManualCapture = useCallback(() => {
        const frame = captureFrame();
        if (frame && onCapture) {
            onCapture(frame);
        }
    }, [captureFrame, onCapture]);

    // Auto-capture multiple frames for liveness detection
    useEffect(() => {
        if (!autoCapture || !isReady || capturedFrames.length >= maxFrames) return;

        const interval = setInterval(() => {
            const frame = captureFrame();
            if (frame) {
                setCapturedFrames(prev => {
                    const newFrames = [...prev, frame];
                    if (newFrames.length >= maxFrames && onFramesCollected) {
                        onFramesCollected(newFrames);
                    }
                    return newFrames;
                });
            }
        }, captureInterval);

        return () => clearInterval(interval);
    }, [autoCapture, isReady, capturedFrames.length, maxFrames, captureInterval, captureFrame, onFramesCollected]);

    // Reset frames when autoCapture changes
    useEffect(() => {
        if (!autoCapture) {
            setCapturedFrames([]);
        }
    }, [autoCapture]);

    const getStatusColor = () => {
        switch (status) {
            case 'success': return 'active';
            case 'error': return 'error';
            case 'processing': return 'warning';
            default: return 'active';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'success': return <CheckCircle size={16} />;
            case 'error': return <AlertCircle size={16} />;
            default: return null;
        }
    };

    if (error) {
        return (
            <div className="webcam-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--gray-100)' }}>
                <AlertCircle size={48} color="var(--danger-500)" />
                <p style={{ color: 'var(--danger-600)', textAlign: 'center', padding: '0 1rem' }}>{error}</p>
                <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="webcam-container">
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className="webcam-video"
                mirrored={true}
            />

            {showGuide && isReady && (
                <div className="webcam-overlay">
                    <div className={`face-guide ${faceDetected ? 'detected' : ''}`} />
                </div>
            )}

            <div className="webcam-status">
                <span className={`status-dot ${getStatusColor()}`} />
                {getStatusIcon()}
                <span>{statusMessage}</span>
            </div>

            {isReady && (
                <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)'
                }}>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleManualCapture}
                        style={{
                            borderRadius: '50%',
                            width: '70px',
                            height: '70px',
                            padding: 0
                        }}
                    >
                        <Camera size={28} />
                    </button>
                </div>
            )}

            {autoCapture && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    Frames: {capturedFrames.length}/{maxFrames}
                </div>
            )}
        </div>
    );
};

export default WebcamCapture;
