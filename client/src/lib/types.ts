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
	// Imgur-specific fields (optional)
	imgurId?: string;
	deleteHash?: string;
	width?: number;
	height?: number;
	size?: number;
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
	roles?: UserRole[];
}

// User roles and permissions
export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserPermissions {
	canModerate: boolean;
	canPin: boolean;
	canLock: boolean;
	canDelete: boolean;
	canEditAnyPost: boolean;
	canManageUsers: boolean;
}

// Forum interfaces
export interface ForumCategory {
	$id?: string;
	$createdAt?: string;
	$updatedAt?: string;
	name: string;
	description: string;
	slug: string;
	color?: string;
	icon?: string;
	order: number;
	isActive: boolean;
	postCount?: number;
	lastPost?: {
		$id: string;
		title: string;
		author: Creator;
		createdAt: string;
	};
	moderators?: string[]; // Array of user IDs who can moderate this category
}

export interface ForumPost {
	$id?: string;
	$createdAt?: string;
	$updatedAt?: string;
	title: string;
	content: string;
	excerpt?: string;
	categoryId: string;
	category?: ForumCategory;
	authorId: string;
	authorName: string;
	authorEmail: string;
	isPinned: boolean;
	isLocked: boolean;
	tags?: string[];
	views: number;
	commentCount: number;
	lastActivity?: string;
	attachments?: Attachment[];
}

export interface ForumComment {
	$id?: string;
	$createdAt?: string;
	$updatedAt?: string;
	content: string;
	postId: string;
	parentId?: string;
	authorId: string;
	authorName: string;
	authorEmail: string;
	isEdited: boolean;
	editedAt?: string;
	attachments?: Attachment[];
}

export interface ForumStats {
	totalPosts: number;
	totalComments: number;
	totalUsers: number;
	recentPosts: ForumPost[];
	popularPosts: ForumPost[];
	activeUsers: Creator[];
}

export interface CreateForumPostData {
	title: string;
	content: string;
	categoryId: string;
	tags?: string[];
	isPinned?: boolean;
	attachments?: Attachment[];
}

export interface UpdateForumPostData extends Partial<CreateForumPostData> {
	$id: string;
	isLocked?: boolean;
}

export interface CreateForumCommentData {
	content: string;
	postId: string;
	parentId?: string;
	attachments?: File[];
}

export interface ForumFilters {
	page?: number;
	limit?: number;
	categoryId?: string;
	authorId?: string;
	search?: string;
	tags?: string[];
	sortBy?: 'createdAt' | 'lastActivity' | 'views' | 'comments';
	sortOrder?: 'asc' | 'desc';
	timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
	isPinned?: boolean;
}

// Moderation interfaces
export interface ModerationAction {
	$id?: string;
	$createdAt?: string;
	actionType: 'pin' | 'unpin' | 'lock' | 'unlock' | 'delete' | 'edit' | 'move';
	targetType: 'post' | 'comment';
	targetId: string;
	moderatorId: string;
	moderatorName: string;
	reason?: string;
	details?: Record<string, any>;
}

export interface UserReport {
	$id?: string;
	$createdAt?: string;
	reporterId: string;
	reporterName: string;
	targetType: 'post' | 'comment' | 'user';
	targetId: string;
	reason: string;
	description: string;
	status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
	reviewedBy?: string;
	reviewedAt?: string;
	resolution?: string;
}
