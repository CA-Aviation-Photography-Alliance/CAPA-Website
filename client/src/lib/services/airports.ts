import type { Airport } from '$lib/types';

// In-memory cache for airports data
let airportsCache: Airport[] | null = null;

export class AirportsService {
	/**
	 * Load airports from static JSON file
	 */
	private async loadAirports(): Promise<Airport[]> {
		if (airportsCache) {
			return airportsCache;
		}

		try {
			const response = await fetch('/airports.json');
			if (!response.ok) {
				throw new Error('Failed to load airports data');
			}
			
			const data = await response.json();
			
			// Transform JSON data to Airport interface
			airportsCache = data.map((airport: any) => ({
				$id: airport.code,
				code: airport.code,
				name: airport.name,
				city: airport.city,
				country: airport.country,
				state: airport.state,
				coordinates: airport.lat && airport.lon ? {
					latitude: parseFloat(airport.lat),
					longitude: parseFloat(airport.lon)
				} : undefined
			}));
			
			return airportsCache;
		} catch (error) {
			console.error('Error loading airports:', error);
			throw new Error('Failed to load airports');
		}
	}

	/**
	 * Get all airports with optional filtering
	 */
	async getAll(filters: { city?: string; code?: string; limit?: number } = {}): Promise<{
		airports: Airport[];
		total: number;
	}> {
		try {
			const { city, code, limit = 100 } = filters;
			let airports = await this.loadAirports();

			// Apply filters
			if (city) {
				const searchTerm = city.toLowerCase();
				airports = airports.filter(a => a.city.toLowerCase().includes(searchTerm));
			}

			if (code) {
				airports = airports.filter(a => a.code.toUpperCase() === code.toUpperCase());
			}

			// Sort by city name
			airports.sort((a, b) => a.city.localeCompare(b.city));

			// Apply limit
			const total = airports.length;
			airports = airports.slice(0, limit);

			return { airports, total };
		} catch (error) {
			console.error('Error fetching airports:', error);
			throw new Error('Failed to fetch airports');
		}
	}

	/**
	 * Get airport by IATA code
	 */
	async getByCode(code: string): Promise<Airport | null> {
		try {
			const airports = await this.loadAirports();
			return airports.find(a => a.code.toUpperCase() === code.toUpperCase()) || null;
		} catch (error) {
			console.error('Error fetching airport by code:', error);
			throw new Error('Failed to fetch airport');
		}
	}

	/**
	 * Search airports by city name
	 */
	async searchByCity(cityName: string, limit = 20): Promise<Airport[]> {
		try {
			const airports = await this.loadAirports();
			const searchTerm = cityName.toLowerCase();
			
			return airports
				.filter(a => a.city.toLowerCase().includes(searchTerm))
				.sort((a, b) => a.city.localeCompare(b.city))
				.slice(0, limit);
		} catch (error) {
			console.error('Error searching airports by city:', error);
			throw new Error('Failed to search airports');
		}
	}

	/**
	 * Search airports by name or code
	 */
	async search(searchTerm: string, limit = 20): Promise<Airport[]> {
		try {
			const airports = await this.loadAirports();
			const term = searchTerm.toLowerCase();
			
			return airports
				.filter(a => 
					a.name.toLowerCase().includes(term) || 
					a.code.toLowerCase().includes(term) ||
					a.city.toLowerCase().includes(term)
				)
				.sort((a, b) => a.name.localeCompare(b.name))
				.slice(0, limit);
		} catch (error) {
			console.error('Error searching airports:', error);
			throw new Error('Failed to search airports');
		}
	}

	/**
	 * Get airports by country
	 */
	async getByCountry(country: string, limit = 50): Promise<Airport[]> {
		try {
			const airports = await this.loadAirports();
			
			return airports
				.filter(a => a.country === country)
				.sort((a, b) => a.city.localeCompare(b.city))
				.slice(0, limit);
		} catch (error) {
			console.error('Error fetching airports by country:', error);
			throw new Error('Failed to fetch airports by country');
		}
	}

	/**
	 * Get airports count by country
	 */
	async getCountryStats(): Promise<Array<{ country: string; count: number }>> {
		try {
			const airports = await this.loadAirports();
			const countryStats = new Map<string, number>();

			airports.forEach(airport => {
				const country = airport.country;
				countryStats.set(country, (countryStats.get(country) || 0) + 1);
			});

			return Array.from(countryStats.entries())
				.map(([country, count]) => ({ country, count }))
				.sort((a, b) => b.count - a.count);
		} catch (error) {
			console.error('Error fetching country statistics:', error);
			throw new Error('Failed to fetch country statistics');
		}
	}

	// Note: Admin functions (create, update, delete, bulkImport) are not supported
	// when using static JSON file. You would need a backend API for these.
}

// Export a singleton instance
export const airportsService = new AirportsService();
