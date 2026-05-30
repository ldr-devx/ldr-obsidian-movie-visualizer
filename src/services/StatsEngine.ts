import type { Movie } from "../types";

export class StatsEngine {
	topByRating(movies: Movie[], n: number): Movie[] {
		return [...movies]
			.filter((m) => m.rating != null)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
			.slice(0, n);
	}

	topByImdb(movies: Movie[], n: number): Movie[] {
		return [...movies]
			.filter((m) => m.scoreImdb != null)
			.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0))
			.slice(0, n);
	}

	recentlyAdded(movies: Movie[], n: number): Movie[] {
		return [...movies]
			.filter((m) => m.watchlist != null)
			.sort((a, b) => (b.watchlist ?? "").localeCompare(a.watchlist ?? ""))
			.slice(0, n);
	}

	recentlyWatched(movies: Movie[], n: number): Movie[] {
		return [...movies]
			.filter((m) => m.last != null)
			.sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""))
			.slice(0, n);
	}

	favorites(movies: Movie[], n?: number): Movie[] {
		const favs = movies
			.filter((m) => m.favorite)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
		return n ? favs.slice(0, n) : favs;
	}

	formatRuntime(minutes: number): string {
		const d = Math.floor(minutes / (60 * 24));
		const h = Math.floor((minutes % (60 * 24)) / 60);
		const m = minutes % 60;
		const parts: string[] = [];
		if (d > 0) parts.push(`${d}d`);
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		return parts.join(" ") || "0m";
	}

	formatMovieRuntime(minutes: number | undefined): string {
		if (!minutes) return "";
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}m`;
		return m === 0 ? `${h}h` : `${h}h ${m}m`;
	}
}
