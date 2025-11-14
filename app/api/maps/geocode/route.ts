import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // If Google Maps API key is available, use real geocoding
    if (apiKey && apiKey !== "your_google_maps_api_key") {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.status === "OK" && data.results[0]) {
          const location = data.results[0].geometry.location;
          return NextResponse.json({
            success: true,
            location: {
              lat: location.lat,
              lng: location.lng,
            },
            formattedAddress: data.results[0].formatted_address,
          });
        }
      } catch (error) {
        console.error("Google Maps geocoding error:", error);
        // Fall through to use fallback
      }
    }

    // Fallback coordinates for known locations
    const lowerAddress = address.toLowerCase();
    if (
      lowerAddress.includes("CEEDAPEG") ||
      (lowerAddress.includes("chief") && lowerAddress.includes("odiong"))
    ) {
      return NextResponse.json({
        success: true,
        location: {
          lat: 4.9465,
          lng: 8.6753,
        },
        formattedAddress: "CEEDAPEG Hotels, Chief Odiong Street, Uyo, Nigeria",
      });
    }

    // Default to Uyo city center if no specific match
    if (lowerAddress.includes("uyo")) {
      return NextResponse.json({
        success: true,
        location: {
          lat: 5.0378,
          lng: 7.9136,
        },
        formattedAddress: "Uyo, Akwa Ibom, Nigeria",
      });
    }

    // Generic fallback
    return NextResponse.json({
      success: true,
      location: {
        lat: 5.0378,
        lng: 7.9136,
      },
      formattedAddress: address,
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { success: false, error: "Geocoding failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body.address;

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    // Redirect to GET handler logic
    const url = new URL(request.url);
    url.searchParams.set("address", address);

    return GET(
      new NextRequest(url, {
        method: "GET",
      })
    );
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { success: false, error: "Geocoding failed" },
      { status: 500 }
    );
  }
}
