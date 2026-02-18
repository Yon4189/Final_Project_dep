// app/styles/global.ts
import { StyleSheet } from 'react-native';

export const GlobalStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 1,
  },
  
  // Typography - From Customer Dashboard
  heading2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  heading4: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  bodyText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: '#6c757d',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  
  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  
  // Spacing Utilities
  // Margin Top
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  mt5: { marginTop: 20 },
  
  // Margin Bottom
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  mb5: { marginBottom: 20 },
  
  // Margin Horizontal
  mx1: { marginHorizontal: 4 },
  mx2: { marginHorizontal: 8 },
  mx3: { marginHorizontal: 12 },
  mx4: { marginHorizontal: 16 },
  
  // Margin Vertical
  my1: { marginVertical: 4 },
  my2: { marginVertical: 8 },
  my3: { marginVertical: 12 },
  my4: { marginVertical: 16 },
  
  // Padding
  p1: { padding: 4 },
  p2: { padding: 8 },
  p3: { padding: 12 },
  p4: { padding: 16 },
  
  // Padding Horizontal
  px1: { paddingHorizontal: 4 },
  px2: { paddingHorizontal: 8 },
  px3: { paddingHorizontal: 12 },
  px4: { paddingHorizontal: 16 },
  
  // Padding Vertical
  py1: { paddingVertical: 4 },
  py2: { paddingVertical: 8 },
  py3: { paddingVertical: 12 },
  py4: { paddingVertical: 16 },
  
  // Buttons (for AppButton component)
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3498db',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextOutline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  
  // Inputs (for AppInput component)
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
    backgroundColor: '#ffffff',
  },
  inputFocused: {
    borderColor: '#3498db',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  inputErrorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  
  // Shadows
  shadowSm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shadowMd: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  shadowLg: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  
  // Borders
  roundedSm: { borderRadius: 4 },
  roundedMd: { borderRadius: 8 },
  roundedLg: { borderRadius: 12 },
  roundedXl: { borderRadius: 16 },
  roundedFull: { borderRadius: 9999 },
  
  border: {
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  borderPrimary: {
    borderWidth: 1,
    borderColor: '#3498db',
  },
  
  // Flex Utilities
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexCol: { flexDirection: 'column' },
  justifyCenter: { justifyContent: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyEnd: { justifyContent: 'flex-end' },
  itemsCenter: { alignItems: 'center' },
  itemsStart: { alignItems: 'flex-start' },
  itemsEnd: { alignItems: 'flex-end' },
  
  // Text Alignment
  textCenter: { textAlign: 'center' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  
  // Colors
  bgWhite: { backgroundColor: '#ffffff' },
  bgPrimary: { backgroundColor: '#3498db' },
  bgSecondary: { backgroundColor: '#2ecc71' },
  bgLight: { backgroundColor: '#f8f9fa' },
  
  // Width & Height
  wFull: { width: '100%' },
  hFull: { height: '100%' },
});

export const Colors = {
  primary: '#3498db',
  secondary: '#2ecc71',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  light: '#f8f9fa',
  dark: '#212529',
  white: '#ffffff',
  gray100: '#f8f9fa',
  gray200: '#e9ecef',
  gray300: '#dee2e6',
  gray400: '#ced4da',
  gray500: '#adb5bd',
  gray600: '#6c757d',
  gray700: '#495057',
  gray800: '#343a40',
  gray900: '#212529',
  border: '#dee2e6',
  text: {
    primary: '#212529',
    secondary: '#6c757d',
    light: '#ffffff',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Helper functions
export const getTextStyle = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  switch (size) {
    case 'sm': return { fontSize: 12 };
    case 'md': return { fontSize: 14 };
    case 'lg': return { fontSize: 16 };
    case 'xl': return { fontSize: 18 };
    default: return { fontSize: 14 };
  }
};

export const getSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  switch (size) {
    case 'xs': return Spacing.xs;
    case 'sm': return Spacing.sm;
    case 'md': return Spacing.md;
    case 'lg': return Spacing.lg;
    case 'xl': return Spacing.xl;
    default: return Spacing.md;
  }
};