'use client';

// Same vendor address constant as towing-step.tsx
const VENDOR_ADDRESS = '1547 rue Trépanier, Laval, QC H7W 3G5, Canada';

export interface DistanceResult {
  distanceText: string;
  durationText: string;
  distanceValue: number;
  durationValue: number;
}

/**
 * Calculate distance using Google Maps DistanceMatrixService (runs in browser).
 * Uses the Maps JS API already loaded by google-places-autocomplete.tsx,
 * so the same API key and HTTP referrer restrictions apply automatically.
 * No server proxy needed — no 400 errors.
 */
export function calculateTowingDistance(
  destinationAddress: string
): Promise<DistanceResult> {
  return new Promise((resolve, reject) => {
    const tryNow = () => {
      const google = (window as any).google;
      if (!google?.maps?.DistanceMatrixService) {
        reject(new Error('Google Maps not loaded'));
        return;
      }

      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [VENDOR_ADDRESS],
          destinations: [destinationAddress],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          language: 'fr',
        },
        (response: any, status: string) => {
          if (status !== 'OK') {
            reject(new Error(`DistanceMatrix: ${status}`));
            return;
          }
          const el = response?.rows?.[0]?.elements?.[0];
          if (!el || el.status !== 'OK') {
            reject(new Error(`Element: ${el?.status ?? 'UNKNOWN'}`));
            return;
          }
          resolve({
            distanceText:  el.distance.text,
            durationText:  el.duration.text,
            distanceValue: el.distance.value,
            durationValue: el.duration.value,
          });
        }
      );
    };

    if (typeof window === 'undefined') {
      reject(new Error('Client-side only'));
      return;
    }

    // If Maps already ready, go immediately — otherwise poll (it loads async)
    if ((window as any).google?.maps?.DistanceMatrixService) {
      tryNow();
    } else {
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).google?.maps?.DistanceMatrixService) {
          clearInterval(poll);
          tryNow();
        } else if (++attempts > 40) {
          clearInterval(poll);
          reject(new Error('Google Maps load timeout'));
        }
      }, 250);
    }
  });
}
