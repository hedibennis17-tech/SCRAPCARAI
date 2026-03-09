'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDHZkzDCSJXxltAnvWeSeC9wLylN93G3S0';

// Load Google Maps script once globally
let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGoogleMapsScript(callback: () => void) {
  if (typeof window === 'undefined') return;

  if (window.google?.maps?.places) {
    callback();
    return;
  }

  callbacks.push(callback);

  if (scriptLoading || scriptLoaded) return;
  scriptLoading = true;

  (window as any).__googleMapsCallback = () => {
    scriptLoaded = true;
    scriptLoading = false;
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
  };

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=__googleMapsCallback`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    scriptLoading = false;
    console.error('Failed to load Google Maps script');
  };
  document.head.appendChild(script);
}

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  fullAddress?: string;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (components: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder,
  className,
  id,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressSelectRef = useRef(onAddressSelect);

  // Keep refs up to date without re-running effects
  onChangeRef.current = onChange;
  onAddressSelectRef.current = onAddressSelect;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const initAutocomplete = () => {
      if (!inputRef.current || autocompleteRef.current) return;

      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['ca', 'us'] },
          fields: ['address_components', 'formatted_address'],
        });

        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components) return;

          const components: AddressComponents = {};
          const streetParts: string[] = [];

          place.address_components.forEach((component) => {
            const types = component.types;
            if (types.includes('street_number')) {
              components.streetNumber = component.long_name;
              streetParts.unshift(component.long_name);
            }
            if (types.includes('route')) {
              components.route = component.long_name;
              streetParts.push(component.long_name);
            }
            if (types.includes('locality')) {
              components.city = component.long_name;
            } else if (!components.city && types.includes('sublocality_level_1')) {
              components.city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              components.province = component.long_name;
            }
            if (types.includes('country')) {
              components.country = component.short_name;
            }
            if (types.includes('postal_code')) {
              components.postalCode = component.long_name;
            }
          });

          components.fullAddress = place.formatted_address || streetParts.join(' ');
          const streetAddress = streetParts.join(' ');
          const displayValue = streetAddress || place.formatted_address || '';

          // Update the input value directly (bypass React controlled input issue)
          if (inputRef.current) {
            inputRef.current.value = displayValue;
          }

          // Notify React form
          onChangeRef.current(displayValue);
          if (onAddressSelectRef.current) {
            onAddressSelectRef.current(components);
          }
        });
      } catch (err) {
        console.error('Google Places Autocomplete init error:', err);
      }
    };

    loadGoogleMapsScript(initAutocomplete);

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []); // Run only once on mount

  return (
    <input
      ref={inputRef}
      id={id}
      defaultValue={value}
      onInput={(e) => onChangeRef.current((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      autoComplete="new-password"
      type="text"
    />
  );
}
