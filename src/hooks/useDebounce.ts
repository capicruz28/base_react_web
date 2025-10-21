// src/hooks/useDebounce.ts (NUEVO ARCHIVO)
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Establece un temporizador para actualizar el valor debounced después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el temporizador si el valor cambia (o si el componente se desmonta)
    // Esto evita que el valor debounced se actualice si el valor cambia dentro del período de delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se re-ejecuta si value o delay cambian

  return debouncedValue;
}