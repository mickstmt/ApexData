'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favoriteDrivers: string[];
  favoriteConstructors: string[];
  toggleDriverFavorite: (driverId: string) => void;
  toggleConstructorFavorite: (constructorId: string) => void;
  isDriverFavorite: (driverId: string) => boolean;
  isConstructorFavorite: (constructorId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY_DRIVERS = 'apexdata_favorite_drivers';
const STORAGE_KEY_CONSTRUCTORS = 'apexdata_favorite_constructors';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteDrivers, setFavoriteDrivers] = useState<string[]>([]);
  const [favoriteConstructors, setFavoriteConstructors] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedDrivers = localStorage.getItem(STORAGE_KEY_DRIVERS);
      const savedConstructors = localStorage.getItem(STORAGE_KEY_CONSTRUCTORS);

      if (savedDrivers) {
        setFavoriteDrivers(JSON.parse(savedDrivers));
      }
      if (savedConstructors) {
        setFavoriteConstructors(JSON.parse(savedConstructors));
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save drivers to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(favoriteDrivers));
      } catch (error) {
        console.error('Error saving driver favorites:', error);
      }
    }
  }, [favoriteDrivers, isLoaded]);

  // Save constructors to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_CONSTRUCTORS, JSON.stringify(favoriteConstructors));
      } catch (error) {
        console.error('Error saving constructor favorites:', error);
      }
    }
  }, [favoriteConstructors, isLoaded]);

  const toggleDriverFavorite = (driverId: string) => {
    setFavoriteDrivers((prev) =>
      prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId]
    );
  };

  const toggleConstructorFavorite = (constructorId: string) => {
    setFavoriteConstructors((prev) =>
      prev.includes(constructorId)
        ? prev.filter((id) => id !== constructorId)
        : [...prev, constructorId]
    );
  };

  const isDriverFavorite = (driverId: string) => {
    return favoriteDrivers.includes(driverId);
  };

  const isConstructorFavorite = (constructorId: string) => {
    return favoriteConstructors.includes(constructorId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteDrivers,
        favoriteConstructors,
        toggleDriverFavorite,
        toggleConstructorFavorite,
        isDriverFavorite,
        isConstructorFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
