import React from 'react';
import { Text, TextProps } from 'react-native';
import { useCurrencyStore } from '@/app/store/currencyStore';

interface PriceTextProps extends TextProps {
  amount: number;
}

export const PriceText = ({ amount, style, ...rest }: PriceTextProps) => {
  const convert = useCurrencyStore((state) => state.convert);

  return (
    <Text style={style} {...rest}>
      {convert(amount)}
    </Text>
  );
};
