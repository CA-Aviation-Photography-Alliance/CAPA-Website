import { browser } from '$app/environment';
import { authService } from '$lib/services/auth';
import { eventsService } from '$lib/services/events';
import { airportsService } from '$lib/services/airports';

// Appwrite-based API configuration
export const API_CONFIG = {
	// Use Appwrite services directly
	services: {
		auth: authService,
		events: eventsService,
		airports: airportsService
	}
};

// API request helper using Appwrite services
export const apiRequest = {
	// Events API
	events: {
		async getAll(filters = {}) {
			return await eventsService.getAll(filters);
		},

		async getById(id: string) {
			return await eventsService.getById(id);
		},

		async getUpcoming(limit = 10) {
			return await eventsService.getUpcoming(limit);
		},

		async getByType(type: string, limit = 10) {
			return await eventsService.getByType(type, limit);
		},

		async getByCreator(creatorId: string, limit = 10) {
			return await eventsService.getByCreator(creatorId, limit);
		},

		async create(eventData: any) {
			const creator = authService.getCurrentUserForEvents();
			if (!creator) throw new Error('Authentication required');
			return await eventsService.create(eventData, creator);
		},

		async update(id: string, eventData: any) {
			const user = authService.getCurrentUserForEvents();
			if (!user) throw new Error('Authentication required');
			return await eventsService.update(id, eventData, user.userId);
		},

		async delete(id: string) {
			const user = authService.getCurrentUserForEvents();
			if (!user) throw new Error('Authentication required');
			return await eventsService.delete(id, user.userId);
		},

		async getStats() {
			return await eventsService.getStats();
		}
	},

	// Airports API
	airports: {
		async getAll(filters = {}) {
			return await airportsService.getAll(filters);
		},

		async getByCode(code: string) {
			return await airportsService.getByCode(code);
		},

		async searchByCity(city: string, limit = 20) {
			return await airportsService.searchByCity(city, limit);
		},

		async search(searchTerm: string, limit = 20) {
			return await airportsService.search(searchTerm, limit);
		},

		async getByCountry(country: string, limit = 50) {
			return await airportsService.getByCountry(country, limit);
		}
	},

	// Auth API
	auth: {
		async login(email: string, password: string) {
			return await authService.login(email, password);
		},

		async register(email: string, password: string, name: string) {
			return await authService.register(email, password, name);
		},

		async logout() {
			return await authService.logout();
		},

		async getCurrentUser() {
			return await authService.getCurrentUser();
		},

		async sendPasswordReset(email: string) {
			return await authService.sendPasswordReset(email);
		},

		async updateProfile(name?: string, email?: string) {
			return await authService.updateProfile(name, email);
		}
	}
};

// Export compatibility layer for existing code
export const fetchEvents = async (filters = {}) => {
	try {
		const result = await apiRequest.events.getAll(filters);
		return {
			success: true,
			data: result.documents,
			pagination: {
				currentPage: result.page,
				totalPages: result.totalPages,
				totalEvents: result.total,
				hasNext: result.page < result.totalPages,
				hasPrev: result.page > 1
			}
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
};

export const fetchAirports = async (filters = {}) => {
	try {
		const result = await apiRequest.airports.getAll(filters);
		return {
			success: true,
			count: result.total,
			data: result.airports
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
};

// Log current configuration for debugging
if (browser) {
	console.log('🔧 API Configuration:', {
		environment: import.meta.env.MODE,
		useAppwrite: true,
		isProduction: import.meta.env.PROD
	});
}
