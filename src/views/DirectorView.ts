import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { CatalogView } from "./CatalogView";

export interface DirectorViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched: (movie: Movie) => void;
}

export function renderDirectors(container: HTMLElement, opts: DirectorViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--directors";

	const directors = opts.service.getDirectorCards();

	if (directors.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-empty__icon";
		setIcon(iconEl, "clapperboard");
		const emptyP = document.createElement("p");
		emptyP.textContent = "No directors found.";
		empty.appendChild(iconEl);
		empty.appendChild(emptyP);
		container.appendChild(empty);
		return;
	}

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Directors";
	container.appendChild(h1);

	// Search
	const searchInput = document.createElement("input");
	searchInput.type = "text";
	searchInput.placeholder = "Search director...";
	searchInput.className = "lmv-search-input lmv-search-input--standalone";
	container.appendChild(searchInput);

	const grid = document.createElement("div");
	grid.className = "lmv-director-grid";

	const renderGrid = (query = "") => {
		grid.innerHTML = "";
		const filtered = query
			? directors.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
			: directors;

		filtered.forEach((dir, i) => {
			const card = document.createElement("div");
			card.className = "lmv-director-card";
			card.style.animationDelay = `${i * 25}ms`;

			// Cover from first movie
			const cover = document.createElement("div");
			cover.className = "lmv-director-card__cover";
			if (dir.cover) {
				const img = document.createElement("img");
				img.src = dir.cover;
				img.alt = dir.name;
				img.loading = "lazy";
				cover.appendChild(img);
			}

			const info = document.createElement("div");
			info.className = "lmv-director-card__info";

			const name = document.createElement("h3");
			name.className = "lmv-director-card__name";
			name.textContent = dir.name;
			info.appendChild(name);

			const stats = document.createElement("div");
			stats.className = "lmv-director-card__stats";
			stats.innerHTML = `
				<span>${dir.count} movie${dir.count !== 1 ? "s" : ""}</span>
				${dir.avgRating > 0 ? `<span>★ ${dir.avgRating.toFixed(1)}</span>` : ""}
				${dir.avgImdb > 0 ? `<span>IMDb ${dir.avgImdb.toFixed(1)}</span>` : ""}
			`;
			info.appendChild(stats);

			card.appendChild(cover);
			card.appendChild(info);

			card.addEventListener("click", () => {
				renderDirectorFilmography(container, dir.name, opts);
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

function renderDirectorFilmography(
	container: HTMLElement,
	director: string,
	opts: DirectorViewOptions
): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--catalog";

	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	back.textContent = "← Directors";
	back.addEventListener("click", () => renderDirectors(container, opts));
	container.appendChild(back);

	const catalogView = new CatalogView({
		service: opts.service,
		onMovieClick: opts.onMovieClick,
		onFavToggle: opts.onFavToggle,
		onMarkWatched: opts.onMarkWatched,
		initialFilter: { genres: [], status: "all", director },
		initialTitle: `Filmography: ${director}`,
	});

	const inner = document.createElement("div");
	inner.style.flex = "1";
	container.appendChild(inner);
	catalogView.render(inner);
}
