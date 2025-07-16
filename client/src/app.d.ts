// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Auth0 environment variables
declare module '$env/static/public' {
	export const PUBLIC_AUTH0_DOMAIN: string;
	export const PUBLIC_AUTH0_CLIENT_ID: string;
}

export {};
