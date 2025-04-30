import airports from '$lib/data/airports-california.json';

export function load({ params }) {
	const { code } = params;

	// Find the airport by ICAO code instead of directly accessing by key
	const airport = Object.values(airports).find((airport) => airport.icao === code);

	if (!airport) {
		return {
			status: 404,
			error: new Error(`Airport with ICAO code ${code} not found`)
		};
	}

	return {
		airport
	};
}
