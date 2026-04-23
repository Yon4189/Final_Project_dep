import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { disputeAPI } from '../api/dispute';

/**
 * Custom hook for polling dispute messages
 * Automatically fetches new messages at regular intervals
 * 
 * @param {number} disputeID - The dispute ID to poll
 * @param {number} interval - Polling interval in milliseconds (default: 3000ms)
 * @param {boolean} enabled - Whether polling is enabled (default: true)
 * @returns {object} - { isPolling, lastUpdate, messageCount, error }
 */
export const useDisputePolling = (disputeID, interval = 3000, enabled = true) => {
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const lastUpdateRef = useRef(null);
  const isPollingRef = useRef(false);

  const pollMessages = useCallback(async () => {
    if (!disputeID || !enabled) return;

    try {
      isPollingRef.current = true;
      const response = await disputeAPI.getDisputeDetails(disputeID);

      if (response.success && response.data.dispute) {
        const dispute = response.data.dispute;
        const currentMessageCount = dispute.messages?.length || 0;

        // Check if new messages arrived
        if (currentMessageCount > lastMessageCountRef.current) {
          lastMessageCountRef.current = currentMessageCount;
          lastUpdateRef.current = new Date();

          // Invalidate the query to trigger a re-render
          queryClient.invalidateQueries({
            queryKey: ['disputes', disputeID]
          });

          // Trigger a custom event for new messages
          window.dispatchEvent(
            new CustomEvent('disputeMessageUpdate', {
              detail: {
                disputeID,
                messageCount: currentMessageCount,
                timestamp: lastUpdateRef.current
              }
            })
          );
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Don't throw, just log - polling should be resilient
    } finally {
      isPollingRef.current = false;
    }
  }, [disputeID, enabled, queryClient]);

  // Start polling
  useEffect(() => {
    if (!enabled || !disputeID) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Poll immediately on mount
    pollMessages();

    // Then set up interval
    pollingIntervalRef.current = setInterval(pollMessages, interval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [disputeID, enabled, interval, pollMessages]);

  return {
    isPolling: isPollingRef.current,
    lastUpdate: lastUpdateRef.current,
    messageCount: lastMessageCountRef.current,
    stopPolling: () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };
};

export default useDisputePolling;
