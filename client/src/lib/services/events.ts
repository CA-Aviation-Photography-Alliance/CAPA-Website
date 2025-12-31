import { databases, COLLECTIONS, getDatabase, generateId } from '$lib/config/appwrite';
import type { Event, CreateEventData, UpdateEventData, EventFilters, Creator } from '$lib/types';
import { Query, Permission, Role } from 'appwrite';

export class EventsService {
	private databaseId = getDatabase();
	private collectionId = COLLECTIONS.EVENTS;

	/**
	 * Create a new event
	 */
	async create(eventData: CreateEventData, creator: Creator): Promise<Event> {
		try {
			const document = await databases.createDocument(
				this.databaseId,
				this.collectionId,
				generateId(),
				{
					...eventData,
					creator: JSON.stringify(creator),
					location: eventData.location ? JSON.stringify(eventData.location) : undefined,
					startdate: new Date(eventData.startdate).toISOString(),
					enddate: new Date(eventData.enddate).toISOString()
				},
				[
					// Read permissions - anyone can read events
					Permission.read(Role.any()),
					// Write permissions - only the creator can update/delete
					Permission.update(Role.user(creator.userId)),
					Permission.delete(Role.user(creator.userId))
				]
			);

			return this.transformDocument(document);
		} catch (error) {
			console.error('Error creating event:', error);
			throw new Error('Failed to create event');
		}
	}

	/**
	 * Get all events with filtering and pagination
	 */
	async getAll(filters: EventFilters = {}): Promise<{
		documents: Event[];
		total: number;
		page: number;
		totalPages: number;
	}> {
		try {
			const {
				page = 1,
				limit = 10,
				type,
				creator,
				upcoming,
				search,
				startDate,
				endDate,
				sortBy = 'startdate',
				sortOrder = 'asc'
			} = filters;

			const queries: string[] = [];

			// Build queries
			if (type) {
				queries.push(Query.search('type', type));
			}

			if (creator) {
				queries.push(Query.search('creator', creator));
			}

			if (upcoming) {
				queries.push(Query.greaterThanEqual('startdate', new Date().toISOString()));
			}

			if (startDate) {
				queries.push(Query.greaterThanEqual('startdate', new Date(startDate).toISOString()));
			}

			if (endDate) {
				queries.push(Query.lessThanEqual('startdate', new Date(endDate).toISOString()));
			}

			if (search) {
				// Note: Appwrite doesn't support OR queries directly, so we'll search in title
				queries.push(Query.search('title', search));
			}

			// Add sorting
			if (sortOrder === 'desc') {
				queries.push(Query.orderDesc(sortBy));
			} else {
				queries.push(Query.orderAsc(sortBy));
			}

			// Add pagination
			queries.push(Query.limit(limit));
			queries.push(Query.offset((page - 1) * limit));

			const response = await databases.listDocuments(this.databaseId, this.collectionId, queries);

			return {
				documents: response.documents.map((doc) => this.transformDocument(doc)),
				total: response.total,
				page,
				totalPages: Math.ceil(response.total / limit)
			};
		} catch (error) {
			console.error('Error fetching events:', error);
			throw new Error('Failed to fetch events');
		}
	}

	/**
	 * Get upcoming events
	 */
	async getUpcoming(limit = 10): Promise<Event[]> {
		try {
			const response = await databases.listDocuments(this.databaseId, this.collectionId, [
				Query.greaterThanEqual('startdate', new Date().toISOString()),
				Query.orderAsc('startdate'),
				Query.limit(limit)
			]);

			return response.documents.map((doc) => this.transformDocument(doc));
		} catch (error) {
			console.error('Error fetching upcoming events:', error);
			throw new Error('Failed to fetch upcoming events');
		}
	}

	/**
	 * Get events by type
	 */
	async getByType(type: string, limit = 10): Promise<Event[]> {
		try {
			const response = await databases.listDocuments(this.databaseId, this.collectionId, [
				Query.search('type', type),
				Query.orderAsc('startdate'),
				Query.limit(limit)
			]);

			return response.documents.map((doc) => this.transformDocument(doc));
		} catch (error) {
			console.error('Error fetching events by type:', error);
			throw new Error('Failed to fetch events by type');
		}
	}

	/**
	 * Get events by creator
	 */
	async getByCreator(creatorId: string, limit = 10): Promise<Event[]> {
		try {
			const response = await databases.listDocuments(this.databaseId, this.collectionId, [
				Query.search('creator', creatorId),
				Query.orderAsc('startdate'),
				Query.limit(limit)
			]);

			return response.documents.map((doc) => this.transformDocument(doc));
		} catch (error) {
			console.error('Error fetching events by creator:', error);
			throw new Error('Failed to fetch events by creator');
		}
	}

	/**
	 * Get a specific event by ID
	 */
	async getById(id: string): Promise<Event | null> {
		try {
			const document = await databases.getDocument(this.databaseId, this.collectionId, id);

			return this.transformDocument(document);
		} catch (error) {
			if (error.code === 404) {
				return null;
			}
			console.error('Error fetching event:', error);
			throw new Error('Failed to fetch event');
		}
	}

	/**
	 * Update an event
	 */
	async update(id: string, eventData: Partial<CreateEventData>, userId: string): Promise<Event> {
		try {
			// Prepare update data
			const updateData: any = { ...eventData };

			if (updateData.location) {
				updateData.location = JSON.stringify(updateData.location);
			}

			if (updateData.startdate) {
				updateData.startdate = new Date(updateData.startdate).toISOString();
			}

			if (updateData.enddate) {
				updateData.enddate = new Date(updateData.enddate).toISOString();
			}

			// Validate dates
			if (updateData.startdate && updateData.enddate) {
				if (new Date(updateData.startdate) > new Date(updateData.enddate)) {
					throw new Error('End date must be after or equal to start date');
				}
			}

			// Appwrite will automatically check permissions - if user doesn't own the document,
			// this will throw a permission error
			const document = await databases.updateDocument(
				this.databaseId,
				this.collectionId,
				id,
				updateData
			);

			return this.transformDocument(document);
		} catch (error) {
			console.error('Error updating event:', error);
			if (error.code === 401 || error.code === 403) {
				throw new Error('You can only edit your own events');
			}
			throw error;
		}
	}

	/**
	 * Delete an event
	 */
	async delete(id: string, userId: string): Promise<void> {
		try {
			// Appwrite will automatically check permissions - if user doesn't own the document,
			// this will throw a permission error
			await databases.deleteDocument(this.databaseId, this.collectionId, id);
		} catch (error) {
			console.error('Error deleting event:', error);
			if (error.code === 401 || error.code === 403) {
				throw new Error('You can only delete your own events');
			}
			throw error;
		}
	}

	/**
	 * Get event statistics
	 */
	async getStats(): Promise<any> {
		try {
			// Get total events count
			const totalResponse = await databases.listDocuments(this.databaseId, this.collectionId, [
				Query.limit(1)
			]);
			const totalEvents = totalResponse.total;

			// Get upcoming events count
			const upcomingResponse = await databases.listDocuments(this.databaseId, this.collectionId, [
				Query.greaterThanEqual('startdate', new Date().toISOString()),
				Query.limit(1)
			]);
			const upcomingEvents = upcomingResponse.total;

			// Note: Appwrite doesn't have aggregation like MongoDB
			// For type and creator stats, we'd need to fetch all documents and aggregate client-side
			// or use Appwrite Functions for server-side aggregation

			return {
				overview: {
					totalEvents,
					upcomingEvents
				},
				types: [],
				creators: [],
				monthly: []
			};
		} catch (error) {
			console.error('Error fetching event statistics:', error);
			throw new Error('Failed to fetch event statistics');
		}
	}

	/**
	 * Fix permissions on existing events (migration utility)
	 * Call this once to add proper permissions to events created before implementing row-level security
	 */
	async fixExistingEventPermissions(): Promise<{ fixed: number; errors: number }> {
		try {
			let fixed = 0;
			let errors = 0;
			let offset = 0;
			const limit = 25;

			while (true) {
				// Get batch of events
				const response = await databases.listDocuments(this.databaseId, this.collectionId, [
					Query.limit(limit),
					Query.offset(offset)
				]);

				if (response.documents.length === 0) break;

				// Process each event
				for (const doc of response.documents) {
					try {
						const event = this.transformDocument(doc);
						const creator = event.creator;

						// Update with proper permissions
						await databases.updateDocument(
							this.databaseId,
							this.collectionId,
							doc.$id,
							{}, // No data changes
							[
								Permission.read(Role.any()),
								Permission.update(Role.user(creator.userId)),
								Permission.delete(Role.user(creator.userId))
							]
						);

						fixed++;
						console.log(`Fixed permissions for event: ${event.title}`);
					} catch (error) {
						errors++;
						console.error(`Failed to fix permissions for event ${doc.$id}:`, error);
					}
				}

				offset += limit;
			}

			console.log(`Permission fix complete: ${fixed} fixed, ${errors} errors`);
			return { fixed, errors };
		} catch (error) {
			console.error('Error fixing event permissions:', error);
			throw new Error('Failed to fix event permissions');
		}
	}

	/**
	 * Transform Appwrite document to Event interface
	 */
	private transformDocument(document: any): Event {
		return {
			$id: document.$id,
			$createdAt: document.$createdAt,
			$updatedAt: document.$updatedAt,
			startdate: document.startdate,
			enddate: document.enddate,
			type: document.type,
			title: document.title,
			description: document.description,
			creator:
				typeof document.creator === 'string' ? JSON.parse(document.creator) : document.creator,
			location: document.location
				? typeof document.location === 'string'
					? JSON.parse(document.location)
					: document.location
				: undefined
		};
	}
}

// Export a singleton instance
export const eventsService = new EventsService();
