import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
};

const dialogStyle: React.CSSProperties = {
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '0',
    minWidth: '320px',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const titleBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #333',
    userSelect: 'none',
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    color: '#FFF',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'monospace',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
};

const bodyStyle: React.CSSProperties = {
    padding: '16px',
    overflow: 'auto',
    flex: 1,
};

export interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}

export function Modal({ title, onClose, children, width }: ModalProps) {
    const backdropRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose();
    };

    return createPortal(
        <div ref={backdropRef} style={backdropStyle} onClick={handleBackdropClick}>
            <div style={{ ...dialogStyle, width: width ?? 'auto' }}>
                <div style={titleBarStyle}>
                    <h3 style={titleStyle}>{title}</h3>
                    <button
                        style={closeBtnStyle}
                        onClick={onClose}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#FFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                    >
                        ✕
                    </button>
                </div>
                <div style={bodyStyle}>
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
