import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';

export interface RealtimeCallbacks<T = any> {
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { id: string }) => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimeSubscriptionOptions<T = any> {
  tableName: string;
  filter?: string;
  callbacks: RealtimeCallbacks<T>;
  enabled?: boolean;
}

export function useRealtimeSubscription<T = any>({
  tableName,
  filter,
  callbacks,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    if (!enabled) return;

    const setupSubscription = () => {
      try {
        // Create unique channel name
        const channelName = `${tableName}-realtime-${Date.now()}-${Math.random()}`;
        
        // Create channel
        const channel = supabase.channel(channelName);

        // Subscribe to postgres changes
        let subscription = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            ...(filter && { filter }),
          },
          (payload) => {
            try {
              switch (payload.eventType) {
                case 'INSERT':
                  callbacks.onInsert?.(payload.new as T);
                  break;
                case 'UPDATE':
                  callbacks.onUpdate?.(payload.new as T);
                  break;
                case 'DELETE':
                  callbacks.onDelete?.({ id: (payload.old as any).id });
                  break;
              }
              // Reset retry count on successful event
              retryCountRef.current = 0;
            } catch (error) {
              console.error(`Error handling ${payload.eventType} event:`, error);
              callbacks.onError?.(error as Error);
            }
          }
        );

        // Subscribe to channel
        subscription.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✓ Subscribed to ${tableName}`);
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`✗ Channel error for ${tableName}`);
            handleReconnect();
          } else if (status === 'TIMED_OUT') {
            console.error(`✗ Subscription timeout for ${tableName}`);
            handleReconnect();
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error(`Error setting up subscription for ${tableName}:`, error);
        callbacks.onError?.(error as Error);
        handleReconnect();
      }
    };

    const handleReconnect = () => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        console.log(`Retrying subscription to ${tableName} in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(setupSubscription, delay);
      } else {
        console.error(`Max retries reached for ${tableName} subscription`);
        callbacks.onError?.(new Error(`Failed to subscribe to ${tableName} after ${maxRetries} attempts`));
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tableName, filter, enabled, callbacks.onInsert, callbacks.onUpdate, callbacks.onDelete, callbacks.onError]);

  return {
    channel: channelRef.current,
  };
}

