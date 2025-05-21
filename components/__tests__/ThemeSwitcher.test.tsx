import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeSwitcher } from '../ThemeSwitcher'; // Adjust path as necessary
import { useTheme } from 'next-themes';

// Mock the useTheme hook
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('ThemeSwitcher', () => {
  let mockSetTheme: jest.Mock;

  beforeEach(() => {
    mockSetTheme = jest.fn();
    (useTheme as jest.Mock).mockReturnValue({
      setTheme: mockSetTheme,
      themes: ['light', 'dark', 'system'],
      theme: 'system', // Default theme for testing
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText('Set light theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Set dark theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Set system theme')).toBeInTheDocument();
  });

  it('calls setTheme with "light" when light theme button is clicked', () => {
    render(<ThemeSwitcher />);
    const lightButton = screen.getByLabelText('Set light theme');
    fireEvent.click(lightButton);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with "dark" when dark theme button is clicked', () => {
    render(<ThemeSwitcher />);
    const darkButton = screen.getByLabelText('Set dark theme');
    fireEvent.click(darkButton);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with "system" when system theme button is clicked', () => {
    render(<ThemeSwitcher />);
    const systemButton = screen.getByLabelText('Set system theme');
    fireEvent.click(systemButton);
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
