// Base interfaces for common fields
export interface Location {
	latitude?: number;
	longitude?: number;
}

export interface Address {
	venue: string;
	address: string;
	city: string;
	state?: string;
	country: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	};
}

export interface Creator {
	userId: string;
	email: string;
	username: string;
	nickname?: string;
	picture?: string;
}

export interface Organizer {
	name: string;
	email: string;
	phone?: string;
}

export interface Price {
	amount: number;
	currency: string;
}

export interface Attachment {
	filename: string;
	url: string;
	type: 'image' | 'document' | 'video' | 'other';
}

// Event interface (simplified from the original SimpleEvent model)
export interface Event {
	$id?: string;
	$createdAt?: string;
	$updatedAt?: string;
	startdate: string; // ISO date string
	enddate: string; // ISO date string
	type: string;
	title: string;
	description: string;
	creator: Creator;
	location?: Location;
}

// Airport interface (for your airports data)
export interface Airport {
	$id?: string;
	code: string; // IATA code
	name: string;
	city: string;
	country: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	};
}

// API Response interfaces
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalEvents: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

// Query parameters for filtering
export interface EventFilters {
	page?: number;
	limit?: number;
	type?: string;
	creator?: string;
	upcoming?: boolean;
	search?: string;
	startDate?: string;
	endDate?: string;
	sortBy?: 'startdate' | 'enddate' | 'title' | 'type' | '$createdAt';
	sortOrder?: 'asc' | 'desc';
}

// Statistics interface
export interface EventStats {
	overview: {
		totalEvents: number;
		upcomingEvents: number;
	};
	types: Array<{
		_id: string;
		count: number;
	}>;
	creators: Array<{
		_id: string;
		count: number;
	}>;
	monthly: Array<{
		_id: number;
		count: number;
	}>;
}

// Form interfaces for creating/updating events
export interface CreateEventData {
	startdate: string;
	enddate: string;
	type: string;
	title: string;
	description: string;
	location?: Location;
}

export interface UpdateEventData extends Partial<CreateEventData> {
	$id: string;
}

// User/Auth interfaces
export interface User {
	$id?: string;
	email: string;
	username: string;
	nickname?: string;
	picture?: string;
}

export interface AuthUser extends User {
	emailVerification?: boolean;
	phoneVerification?: boolean;
	prefs?: Record<string, any>;
}
