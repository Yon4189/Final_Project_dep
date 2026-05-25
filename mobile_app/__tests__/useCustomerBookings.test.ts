import { renderHook, act } from '@testing-library/react-native';
import { useCustomerBookings } from '../app/hooks/useCustomerBookings';
import { useAuthStore } from '../app/store/authStore';

// Mock dependencies
jest.mock('../app/store/authStore');
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe('useCustomerBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      token: 'fake-jwt-token',
    });
  });

  it('should fetch bookings successfully', async () => {
    const mockBookings = [
      { id: 1, service: { title: 'Plumbing' }, status: 'completed' },
    ];
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockBookings }, // Laravel pagination format
      }),
    });

    const { result } = renderHook(() => useCustomerBookings('completed'));

    expect(result.current.loading).toBe(true);
    
    // Wait for the async effect to resolve
    await act(async () => {
      // Small delay to allow promises to flush
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.bookings).toEqual(mockBookings);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customer/bookings'), // The URL uses expo constants, so this is an exact match depending on env, but we just want to ensure it fetches. Actually let's just check the method and token.
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer fake-jwt-token',
        }
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthenticated' }),
    });

    const { result } = renderHook(() => useCustomerBookings());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.bookings).toEqual([]);
  });
});
