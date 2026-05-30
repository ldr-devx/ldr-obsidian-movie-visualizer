import type { TFile } from "obsidian";

export interface Movie {
	// Identity
	id: string;
	title: string;
	titleOriginal?: string;
	file: TFile;
	imdbId?: string;

	// Production
	year?: number;
	runtime?: number; // minutes
	country?: string;
	language?: string;
	director: string[];
	writer: string[];
	cast: string[];
	genre: string[];
	productionCompany?: string;

	// Scores
	scoreImdb?: number;
	scoreRT?: number;
	scoreMetacritic?: number;
	rating?: number; // user 1–10

	// Visual
	cover?: string;
	coverBackdrop?: string;
	trailer?: string;

	// User state
	favorite: boolean;
	watchlist?: string; // ISO date
	last?: string; // ISO date last watched
	timesWatched: number;
	review?: string;
	mood?: string;

	// Meta
	plot?: string;
	awards?: string;
	tags: string[];
	created?: string;
	categories: string[];
}

export type SortKey =
	| "title"
	| "year"
	| "scoreImdb"
	| "scoreRT"
	| "rating"
	| "runtime"
	| "last"
	| "watchlist"
	| "timesWatched"
	| "director";

export type SortDirection = "asc" | "desc";

export type ViewMode = "grid-large" | "grid-compact" | "list" | "poster";

export type StatusFilter = "all" | "unwatched" | "watched" | "favorites";

export interface FilterState {
	genres: string[];
	status: StatusFilter;
	yearMin?: number;
	yearMax?: number;
	ratingMin?: number;
	ratingMax?: number;
	imdbMin?: number;
	runtimeFilter?: "short" | "normal" | "long";
	director?: string;
	cast?: string;
	query?: string;
}

export interface SortState {
	key: SortKey;
	direction: SortDirection;
}

export interface RouteState {
	path: string;
	params: Record<string, string>;
}

export interface Playlist {
	id: string;
	name: string;
	description?: string;
	movieIds: string[];
	created: string;
}

export interface VaultStats {
	total: number;
	watched: number;
	unwatched: number;
	favorites: number;
	avgRating: number;
	avgImdb: number;
	totalRuntime: number; // minutes
	directors: number;
	genres: Record<string, number>;
	byYear: Record<number, number>;
	ratingDist: Record<number, number>;
	topDirectors: { name: string; count: number; avgRating: number }[];
}

export interface DirectorCard {
	name: string;
	count: number;
	avgRating: number;
	avgImdb: number;
	movies: Movie[];
	cover?: string;
}

export interface ActorCard {
	name: string;
	count: number;
	avgRating: number;
	avgImdb: number;
	movies: Movie[];
	cover?: string;
}
