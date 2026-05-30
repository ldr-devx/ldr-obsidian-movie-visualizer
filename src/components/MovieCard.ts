import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { createStarRating } from "./StarRating";
import { StatsEngine } from "../services/StatsEngine";

const stats = new StatsEngine();

export type CardSize = "normal" | "compact" | "list" | "poster";

export interface MovieCardOptions {
	movie: Movie;
	size?: CardSize;
	onClick?: (movie: Movie) => void;
	onFavToggle?: (movie: Movie) => void;
	onMarkWatched?: (movie: Movie) => void;
}

export function createMovieCard(opts: MovieCardOptions): HTMLElement {
	const { movie, size = "normal", onClick, onFavToggle, onMarkWatched } = opts;

	const isWatched = !!(movie.last || movie.timesWatched > 0);
	const card = document.createElement("div");
	card.className = `lmv-card lmv-card--${size}${isWatched ? " lmv-card--watched" : ""}`;
	card.dataset.id = movie.id;

	if (size === "list") {
		renderListCard(card, movie, onClick, onFavToggle, onMarkWatched);
	} else {
		renderGridCard(card, movie, size, onClick, onFavToggle, onMarkWatched);
	}

	return card;
}

function renderGridCard(
	card: HTMLElement,
	movie: Movie,
	size: CardSize,
	onClick?: (m: Movie) => void,
	onFavToggle?: (m: Movie) => void,
	onMarkWatched?: (m: Movie) => void
): void {
	const isWatched = !!(movie.last || movie.timesWatched > 0);

	// Poster
	const poster = document.createElement("div");
	poster.className = "lmv-card__poster";

	if (movie.cover) {
		const img = document.createElement("img");
		img.src = movie.cover;
		img.alt = movie.title;
		img.loading = "lazy";
		img.className = "lmv-card__img";
		img.onerror = () => { img.style.display = "none"; poster.classList.add("lmv-card__poster--fallback"); };
		poster.appendChild(img);
	} else {
		poster.classList.add("lmv-card__poster--fallback");
	}

	// Badges
	if (movie.favorite) {
		const fav = document.createElement("span");
		fav.className = "lmv-card__badge lmv-card__badge--fav";
		setIcon(fav, "heart");
		poster.appendChild(fav);
	}

	if (isWatched) {
		const watched = document.createElement("span");
		watched.className = "lmv-card__badge lmv-card__badge--watched";
		setIcon(watched, "check-circle");
		poster.appendChild(watched);
	}

	// Overlay (hover)
	if (size !== "compact" && size !== "poster") {
		const overlay = document.createElement("div");
		overlay.className = "lmv-card__overlay";

		const plot = document.createElement("p");
		plot.className = "lmv-card__plot";
		plot.textContent = movie.plot ?? "";
		overlay.appendChild(plot);

		const actions = document.createElement("div");
		actions.className = "lmv-card__actions";

		const btnFav = document.createElement("button");
		btnFav.className = `lmv-btn lmv-btn--icon${movie.favorite ? " lmv-btn--active" : ""}`;
		btnFav.title = movie.favorite ? "Quitar de favoritos" : "Agregar a favoritos";
		setIcon(btnFav, "heart");
		btnFav.addEventListener("click", (e) => {
			e.stopPropagation();
			onFavToggle?.(movie);
		});

		const btnWatched = document.createElement("button");
		btnWatched.className = `lmv-btn lmv-btn--icon${isWatched ? " lmv-btn--active" : ""}`;
		btnWatched.title = isWatched ? "Marcar como no vista" : "Marcar como vista";
		setIcon(btnWatched, isWatched ? "check-circle" : "circle");
		btnWatched.addEventListener("click", (e) => {
			e.stopPropagation();
			onMarkWatched?.(movie);
		});

		actions.appendChild(btnFav);
		actions.appendChild(btnWatched);
		overlay.appendChild(actions);
		poster.appendChild(overlay);
	}

	card.appendChild(poster);

	if (size === "poster") {
		card.addEventListener("click", () => onClick?.(movie));
		return;
	}

	// Body
	const body = document.createElement("div");
	body.className = "lmv-card__body";

	const titleEl = document.createElement("h3");
	titleEl.className = "lmv-card__title";
	titleEl.textContent = movie.title;
	body.appendChild(titleEl);

	if (size !== "compact") {
		const meta = document.createElement("div");
		meta.className = "lmv-card__meta";

		const parts: string[] = [];
		if (movie.year) parts.push(String(movie.year));
		if (movie.runtime) parts.push(stats.formatMovieRuntime(movie.runtime));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);

		// Scores
		const scores = document.createElement("div");
		scores.className = "lmv-card__scores";
		if (movie.scoreImdb != null) {
			const imdb = document.createElement("span");
			imdb.className = "lmv-score lmv-score--imdb";
			imdb.innerHTML = `<span class="lmv-score__src">IMDb</span>${movie.scoreImdb.toFixed(1)}`;
			scores.appendChild(imdb);
		}
		if (movie.scoreRT != null) {
			const rt = document.createElement("span");
			rt.className = "lmv-score lmv-score--rt";
			rt.innerHTML = `<span class="lmv-score__src">RT</span>${movie.scoreRT}%`;
			scores.appendChild(rt);
		}
		if (scores.children.length) body.appendChild(scores);

		// User rating
		if (movie.rating != null) {
			body.appendChild(createStarRating({ value: movie.rating, readonly: true, size: "sm" }));
		}

		// Genres
		if (movie.genre.length) {
			const genres = document.createElement("div");
			genres.className = "lmv-card__genres";
			movie.genre.slice(0, 3).forEach((g) => {
				const chip = document.createElement("span");
				chip.className = "lmv-chip";
				chip.textContent = g;
				genres.appendChild(chip);
			});
			body.appendChild(genres);
		}
	} else {
		// compact: just year + imdb
		const meta = document.createElement("div");
		meta.className = "lmv-card__meta";
		const parts: string[] = [];
		if (movie.year) parts.push(String(movie.year));
		if (movie.scoreImdb != null) parts.push(movie.scoreImdb.toFixed(1));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);
	}

	card.appendChild(body);
	card.addEventListener("click", () => onClick?.(movie));
}

function renderListCard(
	card: HTMLElement,
	movie: Movie,
	onClick?: (m: Movie) => void,
	onFavToggle?: (m: Movie) => void,
	onMarkWatched?: (m: Movie) => void
): void {
	const posterWrap = document.createElement("div");
	posterWrap.className = "lmv-card__poster lmv-card__poster--list";

	if (movie.cover) {
		const img = document.createElement("img");
		img.src = movie.cover;
		img.alt = movie.title;
		img.loading = "lazy";
		img.className = "lmv-card__img";
		posterWrap.appendChild(img);
	} else {
		posterWrap.classList.add("lmv-card__poster--fallback");
	}

	const info = document.createElement("div");
	info.className = "lmv-card__info";

	const header = document.createElement("div");
	header.className = "lmv-card__header";

	const title = document.createElement("h3");
	title.className = "lmv-card__title";
	title.textContent = movie.title;
	header.appendChild(title);

	const actions = document.createElement("div");
	actions.className = "lmv-card__actions";

	const btnFav = document.createElement("button");
	btnFav.className = `lmv-btn lmv-btn--icon${movie.favorite ? " lmv-btn--active" : ""}`;
	setIcon(btnFav, "heart");
	btnFav.addEventListener("click", (e) => { e.stopPropagation(); onFavToggle?.(movie); });

	const isWatchedList = !!(movie.last || movie.timesWatched > 0);
	const btnWatched = document.createElement("button");
	btnWatched.className = `lmv-btn lmv-btn--icon${isWatchedList ? " lmv-btn--active" : ""}`;
	btnWatched.title = isWatchedList ? "Marcar como no vista" : "Marcar como vista";
	setIcon(btnWatched, isWatchedList ? "check-circle" : "circle");
	btnWatched.addEventListener("click", (e) => { e.stopPropagation(); onMarkWatched?.(movie); });

	actions.appendChild(btnFav);
	actions.appendChild(btnWatched);
	header.appendChild(actions);
	info.appendChild(header);

	const meta = document.createElement("div");
	meta.className = "lmv-card__meta";
	const metaParts: string[] = [];
	if (movie.director.length) metaParts.push(movie.director[0]);
	if (movie.year) metaParts.push(String(movie.year));
	if (movie.runtime) metaParts.push(new StatsEngine().formatMovieRuntime(movie.runtime));
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	const scores = document.createElement("div");
	scores.className = "lmv-card__scores";
	if (movie.scoreImdb != null) {
		const s = document.createElement("span");
		s.className = "lmv-score lmv-score--imdb";
		s.innerHTML = `<span class="lmv-score__src">IMDb</span>${movie.scoreImdb.toFixed(1)}`;
		scores.appendChild(s);
	}
	if (movie.scoreRT != null) {
		const s = document.createElement("span");
		s.className = "lmv-score lmv-score--rt";
		s.innerHTML = `<span class="lmv-score__src">RT</span>${movie.scoreRT}%`;
		scores.appendChild(s);
	}
	if (movie.rating != null) {
		scores.appendChild(createStarRating({ value: movie.rating, readonly: true, size: "sm" }));
	}
	if (scores.children.length) info.appendChild(scores);

	if (movie.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-card__genres";
		movie.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	if (movie.plot) {
		const plot = document.createElement("p");
		plot.className = "lmv-card__plot lmv-card__plot--list";
		plot.textContent = movie.plot;
		info.appendChild(plot);
	}

	card.appendChild(posterWrap);
	card.appendChild(info);
	card.addEventListener("click", () => onClick?.(movie));
}
