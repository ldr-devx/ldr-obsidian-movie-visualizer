import type { Movie, SortKey, SortDirection } from "../types";

export class SortEngine {
	sort(movies: Movie[], key: SortKey, direction: SortDirection): Movie[] {
		const copy = [...movies];
		const dir = direction === "asc" ? 1 : -1;

		copy.sort((a, b) => {
			let va: number | string = 0;
			let vb: number | string = 0;

			switch (key) {
				case "title":
					va = a.title.toLowerCase();
					vb = b.title.toLowerCase();
					break;
				case "year":
					va = a.year ?? 0;
					vb = b.year ?? 0;
					break;
				case "scoreImdb":
					va = a.scoreImdb ?? -1;
					vb = b.scoreImdb ?? -1;
					break;
				case "scoreRT":
					va = a.scoreRT ?? -1;
					vb = b.scoreRT ?? -1;
					break;
				case "rating":
					va = a.rating ?? -1;
					vb = b.rating ?? -1;
					break;
				case "runtime":
					va = a.runtime ?? 0;
					vb = b.runtime ?? 0;
					break;
				case "last":
					va = a.last ?? "";
					vb = b.last ?? "";
					break;
				case "watchlist":
					va = a.watchlist ?? "";
					vb = b.watchlist ?? "";
					break;
				case "timesWatched":
					va = a.timesWatched;
					vb = b.timesWatched;
					break;
				case "director":
					va = (a.director[0] ?? "").toLowerCase();
					vb = (b.director[0] ?? "").toLowerCase();
					break;
			}

			if (typeof va === "string" && typeof vb === "string") {
				return va < vb ? -dir : va > vb ? dir : 0;
			}
			return ((va as number) - (vb as number)) * dir;
		});

		return copy;
	}
}
