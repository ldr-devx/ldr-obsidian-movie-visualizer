import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createStarRating } from "../components/StarRating";
import { createCarousel } from "../components/Carousel";

const stats = new StatsEngine();

// Load playlists from localStorage (same key as PlaylistView)
const PLAYLISTS_KEY = "lmv-playlists";

export interface MovieDetailOptions {
	movie: Movie;
	service: MovieDataService;
	onBack: () => void;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
}

export function renderMovieDetail(container: HTMLElement, opts: MovieDetailOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--detail";

	const { movie, service, onBack, onMovieClick, onFavToggle } = opts;

	// ── Header: blurred bg + poster + info ───────────────────
	const header = document.createElement("div");
	header.className = "lmv-detail__header";

	// Back button — floats over the header background
	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	setIcon(back, "arrow-left");
	back.addEventListener("click", onBack);
	header.appendChild(back);

	// Background layer (coverBackdrop if available, else cover portrait — blurred)
	const bgSrc = movie.coverBackdrop ?? movie.cover;
	if (bgSrc) {
		const bgWrap = document.createElement("div");
		bgWrap.className = "lmv-detail__header-bg";
		const bgImg = document.createElement("img");
		bgImg.src = bgSrc;
		bgImg.alt = "";
		bgImg.className = "lmv-detail__header-bg-img";
		bgWrap.appendChild(bgImg);
		const bgGrad = document.createElement("div");
		bgGrad.className = "lmv-detail__header-bg-grad";
		bgWrap.appendChild(bgGrad);
		header.appendChild(bgWrap);
	}

	// Inner content wrapper
	const inner = document.createElement("div");
	inner.className = "lmv-detail__header-inner";

	// Poster
	const posterWrap = document.createElement("div");
	posterWrap.className = "lmv-detail__poster-wrap";
	if (movie.cover) {
		const poster = document.createElement("img");
		poster.src = movie.cover;
		poster.alt = movie.title;
		poster.className = "lmv-detail__poster";
		posterWrap.appendChild(poster);
	}
	inner.appendChild(posterWrap);

	// Info
	const info = document.createElement("div");
	info.className = "lmv-detail__info";

	const title = document.createElement("h1");
	title.className = "lmv-detail__title";
	title.textContent = movie.title;
	info.appendChild(title);

	if (movie.titleOriginal && movie.titleOriginal !== movie.title) {
		const orig = document.createElement("p");
		orig.className = "lmv-detail__title-orig";
		orig.textContent = movie.titleOriginal;
		info.appendChild(orig);
	}

	const metaLine = document.createElement("div");
	metaLine.className = "lmv-detail__meta-line";
	const metaParts: string[] = [];
	if (movie.director.length) metaParts.push(`Dir. ${movie.director.join(", ")}`);
	if (movie.year) metaParts.push(String(movie.year));
	if (movie.runtime) metaParts.push(stats.formatMovieRuntime(movie.runtime));
	if (movie.country) metaParts.push(movie.country);
	if (movie.language) metaParts.push(movie.language.toUpperCase());
	metaLine.textContent = metaParts.join(" · ");
	info.appendChild(metaLine);

	if (movie.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-detail__genres";
		movie.genre.forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	// External scores
	const scoresRow = document.createElement("div");
	scoresRow.className = "lmv-detail__scores";
	if (movie.scoreImdb != null) {
		scoresRow.appendChild(buildScoreBadge("IMDb", movie.scoreImdb.toFixed(1), "imdb"));
	}
	if (movie.scoreRT != null) {
		scoresRow.appendChild(buildScoreBadge("RT", `${movie.scoreRT}%`, "rt"));
	}
	if (movie.scoreMetacritic != null) {
		scoresRow.appendChild(buildScoreBadge("MC", String(movie.scoreMetacritic), "meta"));
	}
	if (scoresRow.children.length) info.appendChild(scoresRow);

	// User rating
	const ratingSection = document.createElement("div");
	ratingSection.className = "lmv-detail__rating-section";
	const ratingLabel = document.createElement("label");
	ratingLabel.className = "lmv-label";
	ratingLabel.textContent = "My rating";
	ratingSection.appendChild(ratingLabel);
	ratingSection.appendChild(createStarRating({
		value: movie.rating,
		readonly: false,
		size: "lg",
		onChange: async (val) => { await service.updateField(movie, { rating: val }); },
	}));
	info.appendChild(ratingSection);

	// Action buttons
	const actions = document.createElement("div");
	actions.className = "lmv-detail__actions";

	// Favorite toggle
	const favBtn = document.createElement("button");
	favBtn.className = `lmv-btn lmv-btn--sm${movie.favorite ? " lmv-btn--active" : ""}`;
	favBtn.textContent = movie.favorite ? "In favorites" : "Add to favorites";
	setIcon(favBtn, "heart");
	favBtn.addEventListener("click", async () => {
		const newVal = !movie.favorite;
		await service.updateField(movie, { favorite: newVal });
		movie.favorite = newVal;
		favBtn.textContent = newVal ? "In favorites" : "Add to favorites";
		setIcon(favBtn, "heart");
		favBtn.classList.toggle("lmv-btn--active", newVal);
		onFavToggle(movie);
	});
	actions.appendChild(favBtn);

	// Watched toggle
	const isWatched = !!movie.last || movie.timesWatched > 0;
	const watchedBtn = document.createElement("button");
	watchedBtn.className = `lmv-btn lmv-btn--sm${isWatched ? " lmv-btn--active" : ""}`;
	watchedBtn.textContent = isWatched
		? `Watched${movie.timesWatched > 1 ? ` (${movie.timesWatched}x)` : ""}`
		: "Mark as watched";
	setIcon(watchedBtn, isWatched ? "check-circle" : "circle");
	watchedBtn.addEventListener("click", async () => {
		const alreadyWatched = !!movie.last || movie.timesWatched > 0;
		if (alreadyWatched) {
			await service.updateField(movie, { last: "", timesWatched: 0 });
			movie.last = "";
			movie.timesWatched = 0;
			watchedBtn.textContent = "Mark as watched";
			watchedBtn.classList.remove("lmv-btn--active");
			setIcon(watchedBtn, "circle");
		} else {
			const today = new Date().toISOString().split("T")[0];
			const newCount = movie.timesWatched + 1;
			await service.updateField(movie, { last: today, timesWatched: newCount });
			movie.last = today;
			movie.timesWatched = newCount;
			watchedBtn.textContent = `Watched${newCount > 1 ? ` (${newCount}x)` : ""}`;
			watchedBtn.classList.add("lmv-btn--active");
			setIcon(watchedBtn, "check-circle");
		}
	});
	actions.appendChild(watchedBtn);

	// Add to playlist
	const playlistBtn = document.createElement("button");
	playlistBtn.className = "lmv-btn lmv-btn--sm";
	setIcon(playlistBtn, "list-plus");
	playlistBtn.title = "Add to playlist";
	playlistBtn.addEventListener("click", () => showAddToPlaylistModal(container, movie));
	actions.appendChild(playlistBtn);

	// Trailer
	if (movie.trailer) {
		const trailerBtn = document.createElement("a");
		trailerBtn.href = movie.trailer;
		trailerBtn.className = "lmv-btn lmv-btn--sm";
		setIcon(trailerBtn, "play");
		trailerBtn.append(" Trailer");
		trailerBtn.target = "_blank";
		trailerBtn.rel = "noopener noreferrer";
		actions.appendChild(trailerBtn);
	}

	// IMDb link
	if (movie.imdbId) {
		const imdbBtn = document.createElement("a");
		imdbBtn.href = `https://www.imdb.com/title/${movie.imdbId}`;
		imdbBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
		imdbBtn.textContent = "IMDb";
		imdbBtn.target = "_blank";
		imdbBtn.rel = "noopener noreferrer";
		actions.appendChild(imdbBtn);
	}

	info.appendChild(actions);
	inner.appendChild(info);
	header.appendChild(inner);
	container.appendChild(header);

	// ── Body ──────────────────────────────────────────────────
	const body = document.createElement("div");
	body.className = "lmv-detail__body";

	if (movie.plot) {
		const s = buildBodySection(body, "Synopsis");
		const p = document.createElement("p");
		p.className = "lmv-detail__plot";
		p.textContent = movie.plot;
		s.appendChild(p);
	}

	if (movie.cast.length) {
		const s = buildBodySection(body, "Cast");
		const castEl = document.createElement("div");
		castEl.className = "lmv-detail__cast";
		movie.cast.forEach((actor) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = actor;
			castEl.appendChild(chip);
		});
		s.appendChild(castEl);
	}

	if (movie.awards) {
		const s = buildBodySection(body, "Awards");
		const p = document.createElement("p");
		p.className = "lmv-text-muted";
		p.textContent = movie.awards;
		s.appendChild(p);
	}

	// Mood
	const moodSection = buildBodySection(body, "Mood");
	const moodInput = document.createElement("input");
	moodInput.type = "text";
	moodInput.className = "lmv-input lmv-input--sm";
	moodInput.placeholder = "e.g. contemplative, epic, tense...";
	moodInput.value = movie.mood ?? "";
	let moodTimeout: ReturnType<typeof setTimeout>;
	moodInput.addEventListener("input", () => {
		clearTimeout(moodTimeout);
		moodTimeout = setTimeout(async () => {
			await service.updateField(movie, { mood: moodInput.value });
		}, 600);
	});
	moodSection.appendChild(moodInput);

	// Review
	const reviewSection = buildBodySection(body, "My review");
	const textarea = document.createElement("textarea");
	textarea.className = "lmv-detail__review";
	textarea.placeholder = "Write your review...";
	textarea.value = movie.review ?? "";
	textarea.rows = 5;
	let reviewTimeout: ReturnType<typeof setTimeout>;
	textarea.addEventListener("input", () => {
		clearTimeout(reviewTimeout);
		reviewTimeout = setTimeout(async () => {
			await service.updateField(movie, { review: textarea.value });
		}, 800);
	});
	reviewSection.appendChild(textarea);

	container.appendChild(body);

	// ── Trailer embed (YouTube only) ───────────────────────────
	if (movie.trailer) {
		const embedId = getYouTubeId(movie.trailer);
		if (embedId) {
			const trailerSection = buildBodySection(body, "Tráiler");
			const iframe = document.createElement("iframe");
			iframe.src = `https://www.youtube.com/embed/${embedId}`;
			iframe.className = "lmv-detail__trailer-embed";
			iframe.setAttribute("allowfullscreen", "");
			iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
			iframe.setAttribute("loading", "lazy");
			trailerSection.appendChild(iframe);
		}
	}

	// ── More from director ─────────────────────────────────────
	if (movie.director.length) {
		const dir = movie.director[0];
		const dirMovies = service.getByDirector(dir).filter((m) => m.id !== movie.id);
		if (dirMovies.length > 0) {
			const more = document.createElement("div");
			more.className = "lmv-detail__more";
			more.appendChild(createCarousel({
				title: `More from ${dir}`,
				movies: dirMovies,
				size: "compact",
				onCardClick: onMovieClick,
			}));
			container.appendChild(more);
		}
	}
}

// ── Helpers ────────────────────────────────────────────────

function buildScoreBadge(label: string, value: string, mod: string): HTMLElement {
	const el = document.createElement("div");
	el.className = `lmv-score-badge lmv-score-badge--${mod}`;
	el.innerHTML = `<span class="lmv-score-badge__val">${value}</span><span class="lmv-score-badge__src">${label}</span>`;
	return el;
}

function buildBodySection(parent: HTMLElement, title: string): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-detail__section";
	const h = document.createElement("h3");
	h.className = "lmv-detail__section-title";
	h.textContent = title;
	section.appendChild(h);
	parent.appendChild(section);
	return section;
}

function getYouTubeId(url: string): string | null {
	const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
	return m ? m[1] : null;
}

function showAddToPlaylistModal(container: HTMLElement, movie: Movie): void {
	const raw = localStorage.getItem(PLAYLISTS_KEY);
	const playlists = raw ? JSON.parse(raw) : [];

	const overlay = document.createElement("div");
	overlay.className = "lmv-modal-overlay";

	const dialog = document.createElement("div");
	dialog.className = "lmv-modal";

	const title = document.createElement("h2");
	title.textContent = "Add to playlist";
	dialog.appendChild(title);

	if (playlists.length === 0) {
		const msg = document.createElement("p");
		msg.className = "lmv-text-muted";
		msg.textContent = "No playlists yet. Create one from the Playlists section.";
		dialog.appendChild(msg);
	} else {
		const list = document.createElement("div");
		list.className = "lmv-modal__list";
		playlists.forEach((pl: { id: string; name: string; movieIds: string[] }) => {
			const row = document.createElement("button");
			row.className = "lmv-modal__list-item";
			const alreadyIn = pl.movieIds.includes(movie.id);
			row.textContent = alreadyIn ? `${pl.name} (already added)` : pl.name;
			row.disabled = alreadyIn;
			row.addEventListener("click", () => {
				const all = JSON.parse(localStorage.getItem(PLAYLISTS_KEY) ?? "[]");
				const target = all.find((p: { id: string }) => p.id === pl.id);
				if (target && !target.movieIds.includes(movie.id)) {
					target.movieIds.push(movie.id);
					localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(all));
				}
				overlay.remove();
			});
			list.appendChild(row);
		});
		dialog.appendChild(list);
	}

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "lmv-btn lmv-btn--ghost";
	cancelBtn.textContent = "Close";
	cancelBtn.addEventListener("click", () => overlay.remove());
	dialog.appendChild(cancelBtn);

	overlay.appendChild(dialog);
	overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
	container.appendChild(overlay);
}
