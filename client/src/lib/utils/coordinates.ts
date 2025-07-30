// California coordinate boundaries for generating random locations
const CALIFORNIA_BOUNDS = {
  north: 42.0095169,
  south: 32.4344101,
  east: -114.1312089,
  west: -124.3834167
};

// Major California cities with their coordinates
const CALIFORNIA_CITIES = [
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
  { name: 'Sacramento', lat: 38.5816, lng: -121.4944 },
  { name: 'San Jose', lat: 37.3382, lng: -121.8863 },
  { name: 'Fresno', lat: 36.7468, lng: -119.7725 },
  { name: 'Long Beach', lat: 33.7701, lng: -118.1937 },
  { name: 'Oakland', lat: 37.8044, lng: -122.2712 },
  { name: 'Bakersfield', lat: 35.3733, lng: -119.0187 },
  { name: 'Anaheim', lat: 33.8366, lng: -117.9143 }
];

/**
 * Generate a random coordinate within California boundaries
 * @returns {lat: number, lng: number}
 */
export function generateRandomCaliforniaCoordinate(): { lat: number; lng: number } {
  const lat = Math.random() * (CALIFORNIA_BOUNDS.north - CALIFORNIA_BOUNDS.south) + CALIFORNIA_BOUNDS.south;
  const lng = Math.random() * (CALIFORNIA_BOUNDS.east - CALIFORNIA_BOUNDS.west) + CALIFORNIA_BOUNDS.west;

  return {
    lat: Math.round(lat * 10000) / 10000, // Round to 4 decimal places
    lng: Math.round(lng * 10000) / 10000
  };
}

/**
 * Generate a coordinate near a major California city
 * @param cityName Optional city name, if not provided picks random city
 * @param radiusKm Radius in kilometers to generate coordinate within (default: 50km)
 * @returns {lat: number, lng: number}
 */
export function generateCoordinateNearCity(cityName?: string, radiusKm: number = 50): { lat: number; lng: number } {
  let city;

  if (cityName) {
    city = CALIFORNIA_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (!city) {
      // Fallback to random city if specified city not found
      city = CALIFORNIA_CITIES[Math.floor(Math.random() * CALIFORNIA_CITIES.length)];
    }
  } else {
    // Pick random city
    city = CALIFORNIA_CITIES[Math.floor(Math.random() * CALIFORNIA_CITIES.length)];
  }

  // Convert radius from km to degrees (rough approximation)
  const radiusDegrees = radiusKm / 111; // 1 degree ≈ 111 km

  // Generate random angle
  const angle = Math.random() * 2 * Math.PI;

  // Generate random distance within radius
  const distance = Math.random() * radiusDegrees;

  // Calculate new coordinates
  const lat = city.lat + (distance * Math.cos(angle));
  const lng = city.lng + (distance * Math.sin(angle));

  return {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000
  };
}

/**
 * Generate multiple random coordinates in California
 * @param count Number of coordinates to generate
 * @param nearCities Whether to generate coordinates near major cities
 * @returns Array of {lat: number, lng: number}
 */
export function generateMultipleCoordinates(count: number, nearCities: boolean = true): Array<{ lat: number; lng: number }> {
  const coordinates = [];

  for (let i = 0; i < count; i++) {
    if (nearCities && Math.random() > 0.3) { // 70% chance to be near a city
      coordinates.push(generateCoordinateNearCity());
    } else {
      coordinates.push(generateRandomCaliforniaCoordinate());
    }
  }

  return coordinates;
}

/**
 * Check if a coordinate is within California boundaries
 * @param lat Latitude
 * @param lng Longitude
 * @returns boolean
 */
export function isWithinCalifornia(lat: number, lng: number): boolean {
  return (
    lat >= CALIFORNIA_BOUNDS.south &&
    lat <= CALIFORNIA_BOUNDS.north &&
    lng >= CALIFORNIA_BOUNDS.west &&
    lng <= CALIFORNIA_BOUNDS.east
  );
}

/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 First coordinate latitude
 * @param lng1 First coordinate longitude
 * @param lat2 Second coordinate latitude
 * @param lng2 Second coordinate longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format coordinates for display
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted string
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export { CALIFORNIA_CITIES };
