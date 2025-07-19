"use client";
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed successfully');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      right: 20,
      background: '#fff',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      border: '2px solid #f3b6c2'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#a88c7d', marginBottom: 8 }}>
          📱 N.nailをホーム画面に追加
        </div>
        <div style={{ fontSize: 14, color: '#bfae9e' }}>
          ネイティブアプリのように使用できます
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleInstall}
          style={{
            flex: 1,
            background: '#f3b6c2',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 0',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          追加する
        </button>
        <button
          onClick={() => setShowInstallPrompt(false)}
          style={{
            flex: 1,
            background: '#e7bfa7',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 0',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          後で
        </button>
      </div>
    </div>
  );
} 