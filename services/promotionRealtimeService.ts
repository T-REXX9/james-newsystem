import { supabase } from './supabaseService';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PromotionCallbacks {
    onInsert?: (promotion: any) => void;
    onUpdate?: (promotion: any) => void;
    onDelete?: (payload: { id: string }) => void;
    onError?: (error: Error) => void;
}

export interface PromotionPostingCallbacks {
    onInsert?: (posting: any) => void;
    onUpdate?: (posting: any) => void;
    onDelete?: (payload: { id: string }) => void;
    onError?: (error: Error) => void;
}

/**
 * Subscribe to all promotions table changes
 */
export function subscribeToPromotions(callbacks: PromotionCallbacks): () => void {
    const channelName = `promotions-realtime-${Date.now()}`;
    const channel: RealtimeChannel = supabase.channel(channelName);

    channel
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'promotions',
            },
            (payload) => {
                try {
                    switch (payload.eventType) {
                        case 'INSERT':
                            callbacks.onInsert?.(payload.new);
                            break;
                        case 'UPDATE':
                            callbacks.onUpdate?.(payload.new);
                            break;
                        case 'DELETE':
                            callbacks.onDelete?.({ id: (payload.old as any).id });
                            break;
                    }
                } catch (error) {
                    console.error('Error handling promotion event:', error);
                    callbacks.onError?.(error as Error);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Subscribe to promotion postings for a specific promotion
 */
export function subscribeToPromotionPostings(
    promotionId: string | null,
    callbacks: PromotionPostingCallbacks
): () => void {
    const channelName = `promotion_postings-${promotionId || 'all'}-${Date.now()}`;
    const channel: RealtimeChannel = supabase.channel(channelName);

    const config: any = {
        event: '*',
        schema: 'public',
        table: 'promotion_postings',
    };

    if (promotionId) {
        config.filter = `promotion_id=eq.${promotionId}`;
    }

    channel
        .on('postgres_changes', config, (payload) => {
            try {
                switch (payload.eventType) {
                    case 'INSERT':
                        callbacks.onInsert?.(payload.new);
                        break;
                    case 'UPDATE':
                        callbacks.onUpdate?.(payload.new);
                        break;
                    case 'DELETE':
                        callbacks.onDelete?.({ id: (payload.old as any).id });
                        break;
                }
            } catch (error) {
                console.error('Error handling promotion posting event:', error);
                callbacks.onError?.(error as Error);
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Subscribe to all pending review postings (for owner notifications)
 */
export function subscribeToPendingReviews(
    callbacks: PromotionPostingCallbacks
): () => void {
    const channelName = `pending-reviews-${Date.now()}`;
    const channel: RealtimeChannel = supabase.channel(channelName);

    channel
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'promotion_postings',
                filter: `status=eq.Pending Review`,
            },
            (payload) => {
                try {
                    switch (payload.eventType) {
                        case 'INSERT':
                            callbacks.onInsert?.(payload.new);
                            break;
                        case 'UPDATE':
                            callbacks.onUpdate?.(payload.new);
                            break;
                        case 'DELETE':
                            callbacks.onDelete?.({ id: (payload.old as any).id });
                            break;
                    }
                } catch (error) {
                    console.error('Error handling pending review event:', error);
                    callbacks.onError?.(error as Error);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
