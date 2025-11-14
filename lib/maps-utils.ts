export interface MapConfig {
  apiKey: string
  defaultZoom: number
  defaultCenter: {
    lat: number
    lng: number
  }
}

/**
 * Load Google Maps API script
 */
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true

    script.onload = () => {
      resolve()
    }

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps API"))
    }

    document.head.appendChild(script)
  })
}

/**
 * Calculate distance between two coordinates
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get directions URL for Google Maps
 */
export function getDirectionsURL(destination: string, origin?: string): string {
  const params = new URLSearchParams()
  if (origin) params.append("origin", origin)
  params.append("destination", destination)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Format address for Google Maps
 */
export function formatAddressForMaps(address: string): string {
  return encodeURIComponent(address.trim())
}

declare global {
  interface Window {
    google: any
  }
}
