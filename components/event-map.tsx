"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EventMapProps {
  latitude?: number;
  longitude?: number;
  eventName?: string;
  eventAddress?: string;
}

export function EventMap({
  latitude,
  longitude,
  eventName = "Akwa Ibom Tech Week 2025",
  eventAddress = "CEEDAPEG Hotels, Chief Odiong Street, Uyo, Nigeria",
}: EventMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [isLoading, setIsLoading] = useState(!coords);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      setScriptLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          setMapLoaded(true);
          setScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      setTimeout(() => clearInterval(checkInterval), 10000);
      return () => clearInterval(checkInterval);
    }

    // Load the script
    const script = document.createElement("script");
    // Replace YOUR_API_KEY with your actual Google Maps API key
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setMapLoaded(true);
      setScriptLoaded(true);
    };

    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      setScriptLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup is tricky with Google Maps, so we'll leave the script
    };
  }, []);

  // Geocode the address if coordinates not provided
  useEffect(() => {
    if (!coords && eventAddress) {
      // Use the geocoding API route
      fetch(`/api/maps/geocode?address=${encodeURIComponent(eventAddress)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.location) {
            setCoords({ lat: data.location.lat, lng: data.location.lng });
          } else {
            // Fallback to default coordinates for Uyo
            console.warn("Geocoding failed, using default coordinates");
            setCoords({ lat: 5.0378, lng: 7.9136 }); // Uyo center
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Geocoding error:", error);
          // Fallback to default coordinates
          setCoords({ lat: 5.0378, lng: 7.9136 });
          setIsLoading(false);
        });
    }
  }, [coords, eventAddress]);

  useEffect(() => {
    // Check if Google Maps API is loaded and we have coordinates
    if (!mapLoaded || !coords) {
      return;
    }

    if (mapContainer.current && !map.current) {
      try {
        map.current = new window.google.maps.Map(mapContainer.current, {
          zoom: 15,
          center: coords,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: true,
        });

        // Add marker for event location
        const marker = new window.google.maps.Marker({
          position: coords,
          map: map.current,
          title: eventName,
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 5px 0; font-size: 16px;">${eventName}</h3>
              <p style="margin: 0; font-size: 14px; color: #666;">${eventAddress}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map.current, marker);
        });

        // Open info window by default
        infoWindow.open(map.current, marker);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    } else if (map.current && coords) {
      // Update map center if coordinates change
      map.current.setCenter(coords);
    }
  }, [coords, eventName, eventAddress, mapLoaded]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Location</CardTitle>
        <CardDescription>Find us at {eventAddress}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={mapContainer}
          style={{
            width: "100%",
            height: "300px",
            borderRadius: "8px",
            overflow: "hidden",
          }}
          className="bg-muted"
        >
          {(isLoading || !scriptLoaded) && (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center">
                <p className="font-semibold mb-2">Loading map...</p>
              </div>
            </div>
          )}
          {!mapLoaded && scriptLoaded && !isLoading && (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center">
                <p className="font-semibold mb-2">Map not available</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <p className="font-semibold">{eventAddress}</p>
          </div>
          {/* {coords && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Coordinates
              </p>
              <p className="font-mono text-sm">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            </div>
          )} */}
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(
              eventAddress
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Open in Google Maps
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
