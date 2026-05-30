import type { Movie, FilterState } from "../types";

export class FilterEngine {
	apply(movies: Movie[], filter: FilterState): Movie[] {
		let result = movies;

		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase();
			result = result.filter(
				(m) =>
					m.title.toLowerCase().includes(q) ||
					m.director.some((d) => d.toLowerCase().includes(q)) ||
					m.cast.some((c) => c.toLowerCase().includes(q)) ||
					m.genre.some((g) => g.toLowerCase().includes(q)) ||
					(m.plot ?? "").toLowerCase().includes(q)
			);
		}

		if (filter.genres.length > 0) {
			result = result.filter((m) =>
				filter.genres.some((g) =>
					m.genre.some((mg) => mg.toLowerCase() === g.toLowerCase())
				)
			);
		}

		switch (filter.status) {
			case "unwatched":
				result = result.filter((m) => !m.last && m.timesWatched === 0);
				break;
			case "watched":
				result = result.filter((m) => !!m.last || m.timesWatched > 0);
				break;
			case "favorites":
				result = result.filter((m) => m.favorite);
				break;
		}

		if (filter.yearMin != null) result = result.filter((m) => (m.year ?? 0) >= filter.yearMin!);
		if (filter.yearMax != null) result = result.filter((m) => (m.year ?? 9999) <= filter.yearMax!);

		if (filter.ratingMin != null) result = result.filter((m) => m.rating != null && m.rating >= filter.ratingMin!);
		if (filter.ratingMax != null) result = result.filter((m) => m.rating != null && m.rating <= filter.ratingMax!);

		if (filter.imdbMin != null) result = result.filter((m) => m.scoreImdb != null && m.scoreImdb >= filter.imdbMin!);

		if (filter.runtimeFilter) {
			switch (filter.runtimeFilter) {
				case "short": result = result.filter((m) => (m.runtime ?? 999) < 90); break;
				case "long": result = result.filter((m) => (m.runtime ?? 0) > 150); break;
				case "normal": result = result.filter((m) => {
					const r = m.runtime ?? 120;
					return r >= 90 && r <= 150;
				}); break;
			}
		}

		if (filter.director) {
			const d = filter.director.toLowerCase();
			result = result.filter((m) =>
				m.director.some((md) => md.toLowerCase() === d)
			);
		}

		if (filter.cast) {
			const c = filter.cast.toLowerCase();
			result = result.filter((m) =>
				m.cast.some((mc) => mc.toLowerCase() === c)
			);
		}

		return result;
	}
}
