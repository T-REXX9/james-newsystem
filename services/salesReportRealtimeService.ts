import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SalesReportRealtimeCallbacks {
  onDataChange?: () => void;
  onError?: (error: Error) => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1000;

function debounceCallback(callback: () => void) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(callback, DEBOUNCE_MS);
}

export function subscribeToSalesReportChanges(
  callbacks: SalesReportRealtimeCallbacks
): () => void {
  const channels: RealtimeChannel[] = [];
  const channelPrefix = `sales-report-realtime-${Date.now()}`;

  const handleChange = () => {
    if (callbacks.onDataChange) {
      debounceCallback(callbacks.onDataChange);
    }
  };

  const handleError = (error: Error) => {
    console.error('Sales report realtime error:', error);
    callbacks.onError?.(error);
  };

  const salesReportsChannel = supabase.channel(`${channelPrefix}-sales-reports`);
  salesReportsChannel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sales_reports',
      },
      () => {
        try {
          handleChange();
        } catch (error) {
          handleError(error as Error);
        }
      }
    )
    .subscribe();
  channels.push(salesReportsChannel);

  const salesOrdersChannel = supabase.channel(`${channelPrefix}-sales-orders`);
  salesOrdersChannel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sales_orders',
      },
      () => {
        try {
          handleChange();
        } catch (error) {
          handleError(error as Error);
        }
      }
    )
    .subscribe();
  channels.push(salesOrdersChannel);

  const invoicesChannel = supabase.channel(`${channelPrefix}-invoices`);
  invoicesChannel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
      },
      () => {
        try {
          handleChange();
        } catch (error) {
          handleError(error as Error);
        }
      }
    )
    .subscribe();
  channels.push(invoicesChannel);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
  };
}
