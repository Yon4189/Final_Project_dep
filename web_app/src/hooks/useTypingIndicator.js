import { useState, useEffect, useRef } from 'react';
import { disputeAPI } from '../api/dispute';

/**
 * Hook for managing typing indicators in disputes
 * Polls for typing status updates from other users
 */
export const useTypingIndicator = (disputeID, enabled = true) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !disputeID) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      return;
    }

    let isFetchingStatus = false;
    // Poll for typing status every 3 seconds to reduce network load
    pollingIntervalRef.current = setInterval(async () => {
      if (isFetchingStatus) return; // Prevent overlapping requests
      try {
        isFetchingStatus = true;
        const response = await disputeAPI.getTypingStatus(disputeID);
        if (response.success && response.data.typing_users) {
          setTypingUsers(response.data.typing_users);
        }
      } catch (error) {
        console.error('Failed to fetch typing status:', error);
      } finally {
        isFetchingStatus = false;
      }
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [disputeID, enabled]);

  const setTyping = async (isTyping) => {
    if (!disputeID) return;
    try {
      await disputeAPI.setTypingStatus(disputeID, isTyping);
    } catch (error) {
      console.error('Failed to set typing status:', error);
    }
  };

  return { typingUsers, setTyping };
};

export default useTypingIndicator;
