'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader, importLibrary, setOptions } from '@googlemaps/js-api-loader';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBhbVgnBgOA0qi7-a95Ol7G5BTlfIqa50s';

// Initialize the loader once globally
let initialized = false;
function ensureLoaderInitialized() {
  if (!initialized) {
    setOptions({ key: API_KEY, v: 'weekly' });
    initialized = true;
  }
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

  const initAutocomplete = useCallback(async () => {
    if (!inputRef.current) return;
    try {
      ensureLoaderInitialized();
      const { Autocomplete } = await importLibrary('places') as google.maps.PlacesLibrary;
      if (!inputRef.current) return;

      autocompleteRef.current = new Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['ca', 'us'] },
        fields: ['address_components', 'formatted_address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components) return;

        const components: AddressComponents = {};
        const streetParts: string[] = [];

        place.address_components.forEach((component: google.maps.GeocoderAddressComponent) => {
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

        onChange(streetAddress || place.formatted_address || '');
        if (onAddressSelect) {
          onAddressSelect(components);
        }
      });
    } catch (err) {
      console.error('Google Places Autocomplete init error:', err);
    }
  }, [onChange, onAddressSelect]);

  useEffect(() => {
    initAutocomplete();
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
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
      autoComplete="new-password"
    />
  );
}
