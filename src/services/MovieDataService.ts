import { App, TFile } from "obsidian";
import type { Movie, VaultStats, DirectorCard, ActorCard } from "../types";

// Strip [[wikilink]] syntax from a string
function stripWikilink(s: string): string {
	return s.replace(/^\[\[/, "").replace(/\]\]$/, "");
}

// Coerce a frontmatter value to string[]
function toStringArray(val: unknown): string[] {
	if (!val) return [];
	if (Array.isArray(val)) return val.map((v) => stripWikilink(String(v)));
	return [stripWikilink(String(val))];
}

function toNumber(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	const n = Number(val);
	return isNaN(n) ? undefined : n;
}

// Parses ISO 8601 duration (PT1H49M, PT109M) or "1h 49m" text → minutes
function parseRuntime(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	if (typeof val === "number") return isNaN(val) ? undefined : val;
	const s = String(val).trim();
	// ISO 8601: PT2H30M, PT90M, PT1H
	const iso = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?$/i);
	if (iso && (iso[1] || iso[2])) {
		const h = parseInt(iso[1] ?? "0");
		const m = parseInt(iso[2] ?? "0");
		const total = h * 60 + m;
		return total > 0 ? total : undefined;
	}
	// Text: "2h 30m", "1h", "90m", "1 hr 30 min"
	const text = s.match(/(?:(\d+)\s*h(?:r|our)?s?)?\s*(?:(\d+)\s*m(?:in)?)?/i);
	if (text && (text[1] || text[2])) {
		const h = parseInt(text[1] ?? "0");
		const m = parseInt(text[2] ?? "0");
		const total = h * 60 + m;
		return total > 0 ? total : undefined;
	}
	const n = parseInt(s);
	return isNaN(n) ? undefined : n;
}

function toString(val: unknown): string | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	return String(val);
}

export class MovieDataService {
	private app: App;
	private _movies: Map<string, Movie> = new Map();
	private listeners: Set<() => void> = new Set();
	private eventRef: ReturnType<App["metadataCache"]["on"]> | null = null;
	private vaultEventRef: ReturnType<App["vault"]["on"]> | null = null;

	constructor(app: App) {
		this.app = app;
	}

	async init(): Promise<void> {
		await this.indexAll();

		this.eventRef = this.app.metadataCache.on("changed", (file) => {
			if (file.extension !== "md") return;
			this.indexFile(file);
			this.notify();
		});

		this.vaultEventRef = this.app.vault.on("delete", (file) => {
			if (!(file instanceof TFile)) return;
			if (this._movies.has(file.basename)) {
				this._movies.delete(file.basename);
				this.notify();
			}
		});
	}

	destroy(): void {
		if (this.eventRef) this.app.metadataCache.offref(this.eventRef);
		if (this.vaultEventRef) this.app.vault.offref(this.vaultEventRef);
	}

	private async indexAll(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			this.indexFile(file);
		}
	}

	private indexFile(file: TFile): void {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return;

		const fm = cache.frontmatter;
		const categories = toStringArray(fm.categories);
		const isMovie = categories.some(
			(c) => c === "Movies" || c.toLowerCase().includes("movies")
		);
		if (!isMovie) {
			// Remove if it was previously indexed
			this._movies.delete(file.basename);
			return;
		}

		const rawTitle = toString(fm.title) ?? file.basename;
		const movie: Movie = {
			id: file.basename,
			title: rawTitle,
			titleOriginal: toString(fm.titleOriginal) ?? rawTitle,
			file,
			imdbId: toString(fm.imdbId),

			year: toNumber(fm.year),
			runtime: parseRuntime(fm.runtime),
			country: toString(fm.country),
			language: toString(fm.language),
			director: toStringArray(fm.director),
			writer: toStringArray(fm.writer),
			cast: toStringArray(fm.cast),
			genre: toStringArray(fm.genre),
			productionCompany: toString(fm.productionCompany),

			scoreImdb: toNumber(fm.scoreImdb),
			scoreRT: toNumber(fm.scoreRT),
			scoreMetacritic: toNumber(fm.scoreMetacritic),
			rating: toNumber(fm.rating),

			cover: toString(fm.cover),
			coverBackdrop: toString(fm.coverBackdrop),
			trailer: toString(fm.trailer),

			favorite: fm.favorite === true || fm.favorite === "true",
			watchlist: toString(fm.watchlist),
			last: toString(fm.last),
			timesWatched: toNumber(fm.timesWatched) ?? 0,
			review: toString(fm.review),
			mood: toString(fm.mood),

			plot: toString(fm.plot),
			awards: toString(fm.awards),
			tags: toStringArray(fm.tags),
			created: toString(fm.created),
			categories,
		};

		this._movies.set(file.basename, movie);
	}

	get movies(): Movie[] {
		return Array.from(this._movies.values());
	}

	getById(id: string): Movie | undefined {
		return this._movies.get(id);
	}

	getByDirector(director: string): Movie[] {
		return this.movies.filter((m) =>
			m.director.some((d) => d.toLowerCase() === director.toLowerCase())
		);
	}

	search(query: string): Movie[] {
		const q = query.toLowerCase();
		return this.movies.filter(
			(m) =>
				m.title.toLowerCase().includes(q) ||
				m.director.some((d) => d.toLowerCase().includes(q)) ||
				m.cast.some((c) => c.toLowerCase().includes(q)) ||
				m.genre.some((g) => g.toLowerCase().includes(q)) ||
				(m.plot ?? "").toLowerCase().includes(q)
		);
	}

	getAllGenres(): string[] {
		const set = new Set<string>();
		for (const m of this.movies) m.genre.forEach((g) => set.add(g));
		return Array.from(set).sort();
	}

	getAllDirectors(): string[] {
		const set = new Set<string>();
		for (const m of this.movies) m.director.forEach((d) => set.add(d));
		return Array.from(set).sort();
	}

	getDirectorCards(): DirectorCard[] {
		const map = new Map<string, Movie[]>();
		for (const m of this.movies) {
			for (const d of m.director) {
				if (!map.has(d)) map.set(d, []);
				map.get(d)!.push(m);
			}
		}
		const cards: DirectorCard[] = [];
		for (const [name, movies] of map.entries()) {
			const ratings = movies.filter((m) => m.rating != null).map((m) => m.rating!);
			const imdbs = movies.filter((m) => m.scoreImdb != null).map((m) => m.scoreImdb!);
			cards.push({
				name,
				count: movies.length,
				avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
				avgImdb: imdbs.length ? imdbs.reduce((a, b) => a + b, 0) / imdbs.length : 0,
				movies: movies.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0)),
				cover: movies[0]?.cover,
			});
		}
		return cards.sort((a, b) => b.count - a.count);
	}

	getActorCards(): ActorCard[] {
		const map = new Map<string, Movie[]>();
		for (const m of this.movies) {
			for (const a of m.cast) {
				if (!map.has(a)) map.set(a, []);
				map.get(a)!.push(m);
			}
		}
		const cards: ActorCard[] = [];
		for (const [name, movies] of map.entries()) {
			const ratings = movies.filter((m) => m.rating != null).map((m) => m.rating!);
			const imdbs = movies.filter((m) => m.scoreImdb != null).map((m) => m.scoreImdb!);
			cards.push({
				name,
				count: movies.length,
				avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
				avgImdb: imdbs.length ? imdbs.reduce((a, b) => a + b, 0) / imdbs.length : 0,
				movies: movies.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0)),
				cover: movies[0]?.cover,
			});
		}
		return cards.sort((a, b) => b.count - a.count);
	}

	getStats(): VaultStats {
		const movies = this.movies;
		const watched = movies.filter((m) => m.last || m.timesWatched > 0);
		const favorites = movies.filter((m) => m.favorite);
		const rated = movies.filter((m) => m.rating != null);
		const imdbRated = movies.filter((m) => m.scoreImdb != null);

		const genres: Record<string, number> = {};
		const byYear: Record<number, number> = {};
		const ratingDist: Record<number, number> = {};
		const directorMap = new Map<string, { count: number; ratings: number[] }>();

		for (const m of movies) {
			m.genre.forEach((g) => { genres[g] = (genres[g] ?? 0) + 1; });
			if (m.year) byYear[m.year] = (byYear[m.year] ?? 0) + 1;
			if (m.rating != null) {
				const r = Math.round(m.rating);
				ratingDist[r] = (ratingDist[r] ?? 0) + 1;
			}
			for (const d of m.director) {
				if (!directorMap.has(d)) directorMap.set(d, { count: 0, ratings: [] });
				const entry = directorMap.get(d)!;
				entry.count++;
				if (m.rating != null) entry.ratings.push(m.rating);
			}
		}

		const topDirectors = Array.from(directorMap.entries())
			.map(([name, { count, ratings }]) => ({
				name,
				count,
				avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			total: movies.length,
			watched: watched.length,
			unwatched: movies.length - watched.length,
			favorites: favorites.length,
			avgRating: rated.length ? rated.reduce((a, m) => a + m.rating!, 0) / rated.length : 0,
			avgImdb: imdbRated.length ? imdbRated.reduce((a, m) => a + m.scoreImdb!, 0) / imdbRated.length : 0,
			totalRuntime: movies.reduce((a, m) => a + (m.runtime ?? 0), 0),
			directors: this.getAllDirectors().length,
			genres,
			byYear,
			ratingDist,
			topDirectors,
		};
	}

	async updateField(movie: Movie, updates: Partial<Pick<Movie, "rating" | "favorite" | "last" | "timesWatched" | "review" | "mood">>): Promise<void> {
		await this.app.fileManager.processFrontMatter(movie.file, (fm) => {
			if (updates.rating !== undefined) fm.rating = updates.rating;
			if (updates.favorite !== undefined) fm.favorite = updates.favorite;
			if (updates.last !== undefined) fm.last = updates.last;
			if (updates.timesWatched !== undefined) fm.timesWatched = updates.timesWatched;
			if (updates.review !== undefined) fm.review = updates.review;
			if (updates.mood !== undefined) fm.mood = updates.mood;
		});
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
