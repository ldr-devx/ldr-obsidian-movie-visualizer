import { setIcon } from "obsidian";
import type { Movie, ActorCard } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { CatalogView } from "./CatalogView";

type SortMode = "count" | "rating" | "imdb" | "alpha";

export interface ActorsViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched: (movie: Movie) => void;
}

export function renderActors(container: HTMLElement, opts: ActorsViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--actors";

	const actors = opts.service.getActorCards();

	if (actors.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-empty__icon";
		setIcon(iconEl, "users");
		const emptyP = document.createElement("p");
		emptyP.textContent = "No actors found. Add a 'cast' field to your movie notes.";
		empty.appendChild(iconEl);
		empty.appendChild(emptyP);
		container.appendChild(empty);
		return;
	}

	// ── Header ────────────────────────────────────────────────
	const header = document.createElement("div");
	header.className = "lmv-actors__header";

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Actors & Actresses";
	header.appendChild(h1);

	const countBadge = document.createElement("span");
	countBadge.className = "lmv-actors__count-badge";
	countBadge.textContent = `${actors.length} actors`;
	header.appendChild(countBadge);

	container.appendChild(header);

	// ── Toolbar: search + sort ────────────────────────────────
	const toolbar = document.createElement("div");
	toolbar.className = "lmv-actors__toolbar";

	const searchInput = document.createElement("input");
	searchInput.type = "text";
	searchInput.placeholder = "Search actor or actress...";
	searchInput.className = "lmv-search-input lmv-search-input--standalone";
	toolbar.appendChild(searchInput);

	// Sort buttons
	let sortMode: SortMode = "count";
	const sortGroup = document.createElement("div");
	sortGroup.className = "lmv-btn-group";
	const sortConfigs: { key: SortMode; label: string }[] = [
		{ key: "count", label: "Most films" },
		{ key: "rating", label: "My rating" },
		{ key: "imdb", label: "IMDb" },
		{ key: "alpha", label: "A–Z" },
	];
	const sortBtns: HTMLElement[] = [];
	sortConfigs.forEach(({ key, label }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-btn lmv-btn--sm${sortMode === key ? " lmv-btn--primary" : " lmv-btn--ghost"}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			sortMode = key;
			sortBtns.forEach((b) => (b.className = "lmv-btn lmv-btn--sm lmv-btn--ghost"));
			btn.className = "lmv-btn lmv-btn--sm lmv-btn--primary";
			renderGrid(searchInput.value);
		});
		sortGroup.appendChild(btn);
		sortBtns.push(btn);
	});
	toolbar.appendChild(sortGroup);

	container.appendChild(toolbar);

	// ── Grid ─────────────────────────────────────────────────
	const grid = document.createElement("div");
	grid.className = "lmv-actor-grid";

	const getSorted = (list: ActorCard[]): ActorCard[] => {
		switch (sortMode) {
			case "rating": return [...list].sort((a, b) => b.avgRating - a.avgRating);
			case "imdb":   return [...list].sort((a, b) => b.avgImdb - a.avgImdb);
			case "alpha":  return [...list].sort((a, b) => a.name.localeCompare(b.name));
			default:       return [...list].sort((a, b) => b.count - a.count);
		}
	};

	const renderGrid = (query = "") => {
		grid.innerHTML = "";
		const filtered = query
			? actors.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
			: actors;
		const sorted = getSorted(filtered);

		if (sorted.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const p = document.createElement("p");
			p.textContent = "No results.";
			empty.appendChild(p);
			grid.appendChild(empty);
			return;
		}

		sorted.forEach((actor, i) => {
			const card = document.createElement("div");
			card.className = "lmv-actor-card";
			card.style.animationDelay = `${i * 20}ms`;

			// Cover — poster of best-rated movie
			const cover = document.createElement("div");
			cover.className = "lmv-actor-card__cover";
			if (actor.cover) {
				const img = document.createElement("img");
				img.src = actor.cover;
				img.alt = actor.name;
				img.loading = "lazy";
				cover.appendChild(img);
			} else {
				const icon = document.createElement("div");
				icon.className = "lmv-actor-card__cover-fallback";
				setIcon(icon, "user");
				cover.appendChild(icon);
			}

			const info = document.createElement("div");
			info.className = "lmv-actor-card__info";

			const name = document.createElement("h3");
			name.className = "lmv-actor-card__name";
			name.textContent = actor.name;
			info.appendChild(name);

			const stats = document.createElement("div");
			stats.className = "lmv-actor-card__stats";
			const parts: string[] = [`${actor.count} film${actor.count !== 1 ? "s" : ""}`];
			if (actor.avgRating > 0) parts.push(`★ ${actor.avgRating.toFixed(1)}`);
			if (actor.avgImdb > 0) parts.push(`IMDb ${actor.avgImdb.toFixed(1)}`);
			parts.forEach((p) => {
				const span = document.createElement("span");
				span.textContent = p;
				stats.appendChild(span);
			});
			info.appendChild(stats);

			card.appendChild(cover);
			card.appendChild(info);

			card.addEventListener("click", () => {
				renderActorFilmography(container, actor, opts);
			});

			grid.appendChild(card);
		});
	};

	let searchTimeout: ReturnType<typeof setTimeout>;
	searchInput.addEventListener("input", () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => renderGrid(searchInput.value), 200);
	});

	renderGrid();
	container.appendChild(grid);
}

function renderActorFilmography(
	container: HTMLElement,
	actor: ActorCard,
	opts: ActorsViewOptions
): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--catalog";

	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	back.textContent = "← Actors";
	back.addEventListener("click", () => renderActors(container, opts));
	container.appendChild(back);

	const catalogView = new CatalogView({
		service: opts.service,
		onMovieClick: opts.onMovieClick,
		onFavToggle: opts.onFavToggle,
		onMarkWatched: opts.onMarkWatched,
		initialFilter: { genres: [], status: "all", cast: actor.name },
		initialTitle: `Filmography: ${actor.name}`,
	});

	const inner = document.createElement("div");
	inner.style.flex = "1";
	container.appendChild(inner);
	catalogView.render(inner);
}
