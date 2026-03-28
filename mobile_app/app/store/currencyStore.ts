import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Currency = 'ETB' | 'USD';

interface CurrencyState {
  selectedCurrency: Currency;
  exchangeRate: number; // 1 USD = X ETB
  lastUpdated: number | null;
  setCurrency: (currency: Currency) => void;
  setExchangeRate: (rate: number) => void;
  fetchExchangeRate: () => Promise<void>;
  convert: (amountInETB: number | undefined | null) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      selectedCurrency: 'ETB',
      exchangeRate: 120, // Fallback rate
      lastUpdated: null,

      setCurrency: (currency) => set({ selectedCurrency: currency }),
      
      setExchangeRate: (rate) => set({ exchangeRate: rate, lastUpdated: Date.now() }),

      fetchExchangeRate: async () => {
        try {
          // Check if we need to update (update once per day)
          const { lastUpdated } = get();
          const oneDay = 24 * 60 * 60 * 1000;
          if (lastUpdated && Date.now() - lastUpdated < oneDay) {
            return;
          }

          const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const data = await response.json();
          if (data && data.rates && data.rates.ETB) {
            set({ exchangeRate: data.rates.ETB, lastUpdated: Date.now() });
            console.log(`[Currency] Updated exchange rate: 1 USD = ${data.rates.ETB} ETB`);
          }
        } catch (error) {
          console.error('[Currency] Failed to fetch exchange rate:', error);
        }
      },

      // Formats the ETB amount into the selected currency
      convert: (amountInETB: number | undefined | null) => {
        const { selectedCurrency, exchangeRate } = get();
        const amount = typeof amountInETB === 'number' ? amountInETB : 0;
        
        if (selectedCurrency === 'USD') {
          const amountInUSD = amount / exchangeRate;
          return `$${amountInUSD.toFixed(2)}`;
        }
        
        // ETB Formatting
        return `${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ETB`;
      },
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
