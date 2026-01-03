import { useCallback, useEffect, useRef, useState } from 'react';

export interface AgreementUpdate {
  id: string;
  agreementId?: string;
  type: 'status_change' | 'payment_received' | 'document_uploaded' | 'signature_added' | 'user_action';
  previousStatus?: string;
  newStatus?: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Agreement {
  id: string;
  subject_type?: string;
  subject_id?: string;
  subjectType?: 'LAND' | 'FLAT';
  subjectId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED';
  buyer_address?: string;
  seller_address?: string;
  buyerAddress?: string;
  sellerAddress?: string;
  agreement_hash?: string;
  agreementHash?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  tx_hash?: string;
  txHash?: string;
}

interface UseRealtimeAgreementsOptions {
  onUpdate?: (update: AgreementUpdate) => void;
  agreementIds?: string[];
}

export const useRealtimeAgreements = (options: UseRealtimeAgreementsOptions = {}) => {
  const { onUpdate, agreementIds } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [updates, setUpdates] = useState<AgreementUpdate[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [lastStatusMap, setLastStatusMap] = useState<Map<string, string>>(new Map());

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityIdsRef = useRef<Set<string>>(new Set());
  const lastFetchTimeRef = useRef<number>(0);
  const shouldPollRef = useRef<boolean>(true);
  const connectedRef = useRef<boolean>(false);

  const handleUpdate = useCallback((update: AgreementUpdate) => {
    // Filter by agreementIds if specified
    if (agreementIds && update.agreementId && !agreementIds.includes(update.agreementId)) {
      return;
    }

    // Avoid duplicate updates
    if (lastActivityIdsRef.current.has(update.id)) {
      return;
    }
    lastActivityIdsRef.current.add(update.id);

    setUpdates(prev => {
      const newUpdates = [update, ...prev].slice(0, 50);
      // Save to localStorage
      try {
        localStorage.setItem('realtimeActivities', JSON.stringify(newUpdates));
      } catch (e) {
        console.warn('[Realtime] Failed to save activities to localStorage:', e);
      }
      return newUpdates;
    });
    onUpdate?.(update);
  }, [agreementIds, onUpdate]);

  const disconnect = useCallback(() => {
    connectedRef.current = false;
    shouldPollRef.current = false;
    setIsConnected(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    console.log('[Realtime] Disconnected from user activity updates');
  }, []);

  const fetchUserActivity = useCallback(async () => {
    if (!shouldPollRef.current) {
      console.log('[Realtime] Polling disabled, skipping fetch');
      return;
    }

    try {
      const now = Date.now();
      // Client-side throttle: only fetch if 120 seconds have passed since last fetch
      if (now - lastFetchTimeRef.current < 120000) {
        console.log('[Realtime] Skipping fetch, still within throttle window');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('[Realtime] No access token found in localStorage');
        return;
      }

      // Check if token is expired before making request
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        const decoded = JSON.parse(atob(parts[1]));
        const expiresAt = decoded.exp * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiresAt - Date.now();
        
        console.log(`[Realtime] Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);
        
        // If token expires in less than 60 seconds, try to refresh it first
        if (timeUntilExpiry < 60000) {
          console.warn('[Realtime] Token expiring soon, attempting refresh before fetch');
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';
              const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${refreshToken}`
                }
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                localStorage.setItem('access_token', refreshData.access_token);
                localStorage.setItem('refresh_token', refreshData.refresh_token);
                console.log('[Realtime] Token refreshed successfully');
              } else {
                console.warn('[Realtime] Token refresh failed, disabling polling');
                shouldPollRef.current = false;
                return;
              }
            } catch (refreshError) {
              console.warn('[Realtime] Token refresh error:', refreshError);
              shouldPollRef.current = false;
              return;
            }
          }
        }
      } catch (decodeError) {
        console.warn('[Realtime] Could not decode token, attempting fetch anyway:', decodeError);
      }

      lastFetchTimeRef.current = now;

      const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';
      const url = `${API_BASE}/activity/my-activity?limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        console.warn('[Realtime] Received 401, token invalid. Disabling polling.');
        shouldPollRef.current = false;
        return;
      }

      if (!response.ok) {
        console.warn('[Realtime] Failed to fetch user activity:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('[Realtime] Invalid data format:', data);
        return;
      }

      // Convert activity logs to update events
      data.items.forEach((log: any) => {
        const update: AgreementUpdate = {
          id: log.id,
          type: 'user_action',
          message: log.action,
          timestamp: log.timestamp,
          metadata: log.metadata || {}
        };
        handleUpdate(update);
      });
    } catch (error) {
      console.error('[Realtime] Failed to fetch user activity:', error);
    }
  }, [handleUpdate]);

  const connect = useCallback(() => {
    if (connectedRef.current) {
      console.log('[Realtime] Already connected, skipping');
      return;
    }
    connectedRef.current = true;
    shouldPollRef.current = true;
    setIsConnected(true);
    console.log('[Realtime] Connected to user activity updates');

    // Load from localStorage on connect
    try {
      const stored = localStorage.getItem('realtimeActivities');
      if (stored) {
        const activities = JSON.parse(stored);
        setUpdates(activities);
        // Rebuild the lastActivityIds set
        lastActivityIdsRef.current = new Set(activities.map((a: AgreementUpdate) => a.id));
        console.log('[Realtime] Loaded', activities.length, 'activities from localStorage');
      }
    } catch (e) {
      console.warn('[Realtime] Failed to load activities from localStorage:', e);
    }

    // Initial fetch
    fetchUserActivity();

    // Poll for updates every 2 minutes (120 seconds) - much more conservative
    // Client-side throttle in fetchUserActivity prevents actual requests more frequently
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => {
      fetchUserActivity();
    }, 120000);
  }, [fetchUserActivity]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  useEffect(() => {
    return () => {
      connectedRef.current = false;
      shouldPollRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    updates,
    agreements,
    connect,
    disconnect,
    clearUpdates,
    updateCount: updates.length
  };
};

export default useRealtimeAgreements;
