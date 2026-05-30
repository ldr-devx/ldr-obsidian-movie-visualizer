import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { createMovieCard } from "../components/MovieCard";

export interface SearchViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched: (movie: Movie) => void;
	initialQuery?: string;
}

export function renderSearch(container: HTMLElement, opts: SearchViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--search";

	const searchWrap = document.createElement("div");
	searchWrap.className = "lmv-search-hero";

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Search movie, director, actor, genre...";
	input.className = "lmv-search-hero__input";
	input.value = opts.initialQuery ?? "";
	searchWrap.appendChild(input);

	container.appendChild(searchWrap);

	const resultsEl = document.createElement("div");
	resultsEl.className = "lmv-search__results";
	container.appendChild(resultsEl);

	const renderResults = (query: string) => {
		resultsEl.innerHTML = "";

		if (!query.trim()) {
			const hint = document.createElement("p");
			hint.className = "lmv-search__hint";
			hint.textContent = "Type to search your collection...";
			resultsEl.appendChild(hint);
			return;
		}

		const results = opts.service.search(query);

		const countEl = document.createElement("p");
		countEl.className = "lmv-text-muted";
		countEl.textContent = results.length > 0
			? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
			: `No results for "${query}"`;
		resultsEl.appendChild(countEl);

		if (results.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "search");
			empty.appendChild(iconEl);
			resultsEl.appendChild(empty);
			return;
		}

		const grid = document.createElement("div");
		grid.className = "lmv-grid lmv-grid--large";
		results.forEach((movie, i) => {
			const card = createMovieCard({
				movie,
				size: "normal",
				onClick: opts.onMovieClick,
				onFavToggle: opts.onFavToggle,
				onMarkWatched: opts.onMarkWatched,
			});
			card.style.animationDelay = `${i * 30}ms`;
			card.classList.add("lmv-card--enter");
			grid.appendChild(card);
		});
		resultsEl.appendChild(grid);

		requestAnimationFrame(() => {
			grid.querySelectorAll(".lmv-card--enter").forEach((el, i) => {
				setTimeout(() => el.classList.add("lmv-card--visible"), i * 30);
			});
		});
	};

	let timeout: ReturnType<typeof setTimeout>;
	input.addEventListener("input", () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => renderResults(input.value), 200);
	});

	// Auto-focus
	setTimeout(() => input.focus(), 100);

	// Initial render
	renderResults(input.value);
}
