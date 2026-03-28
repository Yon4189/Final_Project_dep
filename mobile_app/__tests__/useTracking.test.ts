import { renderHook, act } from '@testing-library/react-native';
import { useTracking } from '../hooks/useTracking';
import * as Location from 'expo-location';
import { providerService } from '../services/provider.service';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 5 }
}));

// Mock provider service
jest.mock('../services/provider.service', () => ({
  providerService: {
    updateLocation: jest.fn()
  }
}));

describe('useTracking Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request permissions and start tracking if active and booking ID are provided', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const mockWatchPosition = jest.fn().mockImplementation((options, callback) => {
      // Simulate getting a location
      callback({ coords: { latitude: 9.032, longitude: 38.7578, speed: 10, heading: 90 } });
      return { remove: jest.fn() };
    });
    (Location.watchPositionAsync as jest.Mock).mockImplementation(mockWatchPosition);
    (providerService.updateLocation as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useTracking('booking-123', true));

    // Allow effects to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.watchPositionAsync).toHaveBeenCalled();
    
    // Check if the location sync was triggered
    expect(providerService.updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingID: 'booking-123',
        latitude: 9.032,
        longitude: 38.7578,
      })
    );
    
    expect(result.current.isTracking).toBe(true);
    expect(result.current.location).toBeTruthy();
  });

  it('should stop tracking and not error if permissions denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    
    const { result } = renderHook(() => useTracking('booking-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    expect(result.current.errorMsg).toBe('Permission to access location was denied');
    expect(result.current.isTracking).toBe(false);
  });
});
