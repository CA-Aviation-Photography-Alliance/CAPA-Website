import { databases, COLLECTIONS, getDatabase, generateId } from '$lib/config/appwrite';
import type { Airport } from '$lib/types';
import { Query } from 'appwrite';

export class AirportsService {
	private databaseId = getDatabase();
	private collectionId = COLLECTIONS.AIRPORTS;

	/**
	 * Get all airports with optional filtering
	 */
	async getAll(filters: { city?: string; code?: string; limit?: number } = {}): Promise<{
		airports: Airport[];
		total: number;
	}> {
		try {
			const { city, code, limit = 100 } = filters;
			const queries: string[] = [];

			// Add filters
			if (city) {
				queries.push(Query.search('city', city));
			}

			if (code) {
				queries.push(Query.equal('code', code.toUpperCase()));
			}

			// Add limit
			queries.push(Query.limit(limit));

			// Order by city name
			queries.push(Query.orderAsc('city'));

			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				queries
			);

			return {
				airports: response.documents.map(doc => this.transformDocument(doc)),
				total: response.total
			};
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
			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				[Query.equal('code', code.toUpperCase())]
			);

			if (response.documents.length === 0) {
				return null;
			}

			return this.transformDocument(response.documents[0]);
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
			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				[
					Query.search('city', cityName),
					Query.limit(limit),
					Query.orderAsc('city')
				]
			);

			return response.documents.map(doc => this.transformDocument(doc));
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
			// Since Appwrite doesn't support OR queries directly, we'll search by name first
			// In a real implementation, you might want to use Appwrite Functions for complex searches
			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				[
					Query.search('name', searchTerm),
					Query.limit(limit),
					Query.orderAsc('name')
				]
			);

			return response.documents.map(doc => this.transformDocument(doc));
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
			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				[
					Query.equal('country', country),
					Query.limit(limit),
					Query.orderAsc('city')
				]
			);

			return response.documents.map(doc => this.transformDocument(doc));
		} catch (error) {
			console.error('Error fetching airports by country:', error);
			throw new Error('Failed to fetch airports by country');
		}
	}

	/**
	 * Create a new airport (admin function)
	 */
	async create(airportData: Omit<Airport, '$id' | '$createdAt' | '$updatedAt'>): Promise<Airport> {
		try {
			const document = await databases.createDocument(
				this.databaseId,
				this.collectionId,
				generateId(),
				{
					...airportData,
					code: airportData.code.toUpperCase(),
					coordinates: airportData.coordinates ? JSON.stringify(airportData.coordinates) : undefined
				}
			);

			return this.transformDocument(document);
		} catch (error) {
			console.error('Error creating airport:', error);
			throw new Error('Failed to create airport');
		}
	}

	/**
	 * Update an airport (admin function)
	 */
	async update(id: string, airportData: Partial<Omit<Airport, '$id' | '$createdAt' | '$updatedAt'>>): Promise<Airport> {
		try {
			const updateData: any = { ...airportData };

			if (updateData.code) {
				updateData.code = updateData.code.toUpperCase();
			}

			if (updateData.coordinates) {
				updateData.coordinates = JSON.stringify(updateData.coordinates);
			}

			const document = await databases.updateDocument(
				this.databaseId,
				this.collectionId,
				id,
				updateData
			);

			return this.transformDocument(document);
		} catch (error) {
			console.error('Error updating airport:', error);
			throw new Error('Failed to update airport');
		}
	}

	/**
	 * Delete an airport (admin function)
	 */
	async delete(id: string): Promise<void> {
		try {
			await databases.deleteDocument(
				this.databaseId,
				this.collectionId,
				id
			);
		} catch (error) {
			console.error('Error deleting airport:', error);
			throw new Error('Failed to delete airport');
		}
	}

	/**
	 * Bulk import airports from JSON data
	 */
	async bulkImport(airports: Array<Omit<Airport, '$id' | '$createdAt' | '$updatedAt'>>): Promise<{
		created: number;
		errors: number;
	}> {
		let created = 0;
		let errors = 0;

		for (const airport of airports) {
			try {
				await this.create(airport);
				created++;
			} catch (error) {
				console.error('Error importing airport:', airport.code, error);
				errors++;
			}
		}

		return { created, errors };
	}

	/**
	 * Get airports count by country
	 */
	async getCountryStats(): Promise<Array<{ country: string; count: number }>> {
		try {
			// Note: This is a simplified implementation
			// In a real app, you'd want to use Appwrite Functions for aggregation
			const response = await databases.listDocuments(
				this.databaseId,
				this.collectionId,
				[Query.limit(2000)] // Adjust based on your data size
			);

			const countryStats = new Map<string, number>();

			response.documents.forEach(doc => {
				const country = doc.country;
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

	/**
	 * Transform Appwrite document to Airport interface
	 */
	private transformDocument(document: any): Airport {
		return {
			$id: document.$id,
			$createdAt: document.$createdAt,
			$updatedAt: document.$updatedAt,
			code: document.code,
			name: document.name,
			city: document.city,
			country: document.country,
			coordinates: document.coordinates
				? (typeof document.coordinates === 'string'
					? JSON.parse(document.coordinates)
					: document.coordinates)
				: undefined
		};
	}
}

// Export a singleton instance
export const airportsService = new AirportsService();
