import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/ipad|iphone|ipod/.test(ua)) return 'ios';
  if (/tablet/.test(ua)) return 'tablet';
  if (/mobile/.test(ua)) return 'other';
  return 'desktop';
}

function getDeviceName() {
  const type = getDeviceType();
  if (type === 'android') return 'My Android Device';
  if (type === 'ios') return 'My iOS Device';
  if (type === 'desktop') return 'My Desktop';
  if (type === 'tablet') return 'My Tablet';
  return 'My Device';
}

export function useAutoRegisterDevice() {
  const { user } = useAuth();
  const checked = useRef(false);

  useEffect(() => {
    if (!user || checked.current) return;
    
    const checkAndRegister = async () => {
      try {
        checked.current = true;
        
        // Get persistent local fingerprint or create one
        let fp = localStorage.getItem('sift_device_fp');
        if (!fp) {
          fp = `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          localStorage.setItem('sift_device_fp', fp);
        }

        // Check user's devices
        const devices = await base44.entities.Device.list();
        
        // Check if this specific device is already registered by fingerprint
        const alreadyRegistered = devices.some(d => d.device_fingerprint === fp && d.status === 'active');
        
        if (!alreadyRegistered) {
          // Check how many active devices they have
          const activeDevices = devices.filter(d => d.status === 'active');
          
          // Auto register if it's their first device
          // Or we can just blindly add it if they have room (but let's do first device to be safe and match "device I sign up on")
          if (activeDevices.length === 0) {
            await base44.functions.invoke('manageDevice', {
              action: 'add',
              device_name: getDeviceName(),
              device_type: getDeviceType(),
              device_fingerprint: fp,
            });
          }
        }
      } catch (err) {
        console.error('Failed to auto-register device:', err);
      }
    };

    checkAndRegister();
  }, [user]);
}