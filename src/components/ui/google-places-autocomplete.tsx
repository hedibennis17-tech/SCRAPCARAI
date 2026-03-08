'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBhbVgnBgOA0qi7-a95Ol7G5BTlfIqa50s';

interface AddressComponents {
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

// Load Google Maps script once
let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) {
      resolve();
      return;
    }
    callbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    };
    document.head.appendChild(script);
  });
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
  const [isReady, setIsReady] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['ca', 'us'] },
      fields: ['address_components', 'formatted_address'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.address_components) return;

      const components: AddressComponents = {};
      const addressParts: string[] = [];

      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes('street_number')) {
          components.streetNumber = component.long_name;
          addressParts.unshift(component.long_name);
        }
        if (types.includes('route')) {
          components.route = component.long_name;
          addressParts.push(component.long_name);
        }
        if (types.includes('locality') || types.includes('sublocality_level_1')) {
          components.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          components.province = component.long_name;
        }
        if (types.includes('country')) {
          components.country = component.short_name; // 'CA' or 'US'
        }
        if (types.includes('postal_code')) {
          components.postalCode = component.long_name;
        }
      });

      components.fullAddress = place.formatted_address || addressParts.join(' ');
      const streetAddress = addressParts.join(' ');

      onChange(streetAddress || place.formatted_address || '');
      if (onAddressSelect) {
        onAddressSelect(components);
      }
    });

    setIsReady(true);
  }, [onChange, onAddressSelect]);

  useEffect(() => {
    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
      initAutocomplete();
    });

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [initAutocomplete]);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(className)}
      autoComplete="off"
    />
  );
}
