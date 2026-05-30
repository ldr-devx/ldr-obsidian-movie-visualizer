import type { Movie } from "../types";
import { StatsEngine } from "../services/StatsEngine";

const stats = new StatsEngine();

export interface HeroSectionOptions {
	movie: Movie;
	onDetail?: (movie: Movie) => void;
	onFavToggle?: (movie: Movie) => void;
}

export function createHeroSection(opts: HeroSectionOptions): HTMLElement {
	const { movie, onDetail, onFavToggle } = opts;
	const hero = document.createElement("div");
	hero.className = "lmv-hero";

	// Background — always shown (coverBackdrop preferred, cover portrait as blurred fallback)
	const bgSrc = movie.coverBackdrop ?? movie.cover;
	if (bgSrc) {
		const bg = document.createElement("div");
		bg.className = "lmv-hero__bg-wrap";
		const img = document.createElement("img");
		img.src = bgSrc;
		img.alt = "";
		img.className = "lmv-hero__bg-img";
		bg.appendChild(img);
		const grad = document.createElement("div");
		grad.className = "lmv-hero__bg-grad";
		bg.appendChild(grad);
		hero.appendChild(bg);
	}

	const content = document.createElement("div");
	content.className = "lmv-hero__content";

	// Poster — always visible, prominent
	if (movie.cover) {
		const poster = document.createElement("img");
		poster.src = movie.cover;
		poster.alt = movie.title;
		poster.className = "lmv-hero__poster";
		content.appendChild(poster);
	}

	const info = document.createElement("div");
	info.className = "lmv-hero__info";

	const title = document.createElement("h1");
	title.className = "lmv-hero__title";
	title.textContent = movie.title;
	info.appendChild(title);

	if (movie.titleOriginal && movie.titleOriginal !== movie.title) {
		const orig = document.createElement("p");
		orig.className = "lmv-hero__title-orig";
		orig.textContent = movie.titleOriginal;
		info.appendChild(orig);
	}

	const meta = document.createElement("div");
	meta.className = "lmv-hero__meta";
	const metaParts: string[] = [];
	if (movie.year) metaParts.push(String(movie.year));
	if (movie.runtime) metaParts.push(stats.formatMovieRuntime(movie.runtime));
	if (movie.country) metaParts.push(movie.country);
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	if (movie.director.length) {
		const dir = document.createElement("p");
		dir.className = "lmv-hero__director";
		dir.textContent = `Dir. ${movie.director.join(", ")}`;
		info.appendChild(dir);
	}

	if (movie.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-hero__genres";
		movie.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	const scores = document.createElement("div");
	scores.className = "lmv-hero__scores";
	if (movie.scoreImdb != null) {
		const s = document.createElement("span");
		s.className = "lmv-score-pill";
		s.innerHTML = `<span class="lmv-score-pill__src">IMDb</span><span class="lmv-score-pill__val">${movie.scoreImdb.toFixed(1)}</span>`;
		scores.appendChild(s);
	}
	if (movie.scoreRT != null) {
		const s = document.createElement("span");
		s.className = "lmv-score-pill lmv-score-pill--rt";
		s.innerHTML = `<span class="lmv-score-pill__src">RT</span><span class="lmv-score-pill__val">${movie.scoreRT}%</span>`;
		scores.appendChild(s);
	}
	if (scores.children.length) info.appendChild(scores);

	if (movie.plot) {
		const plot = document.createElement("p");
		plot.className = "lmv-hero__plot";
		plot.textContent = movie.plot;
		info.appendChild(plot);
	}

	const actions = document.createElement("div");
	actions.className = "lmv-hero__actions";

	const btnDetail = document.createElement("button");
	btnDetail.className = "lmv-btn lmv-btn--primary";
	btnDetail.textContent = "View details";
	btnDetail.addEventListener("click", () => onDetail?.(movie));
	actions.appendChild(btnDetail);

	const btnFav = document.createElement("button");
	btnFav.className = `lmv-btn lmv-btn--ghost${movie.favorite ? " lmv-btn--active" : ""}`;
	btnFav.textContent = movie.favorite ? "In favorites" : "Add to favorites";
	btnFav.addEventListener("click", () => onFavToggle?.(movie));
	actions.appendChild(btnFav);

	info.appendChild(actions);
	content.appendChild(info);
	hero.appendChild(content);

	return hero;
}
