import { setIcon } from "obsidian";
import type { Movie, FilterState, SortKey, SortDirection, ViewMode } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { FilterEngine } from "../services/FilterEngine";
import { SortEngine } from "../services/SortEngine";
import { createMovieCard } from "../components/MovieCard";
import { createFilterSidebar } from "../components/FilterSidebar";

const filterEngine = new FilterEngine();
const sortEngine = new SortEngine();
const PAGE_SIZE = 48;

export interface CatalogViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched: (movie: Movie) => void;
	initialFilter?: Partial<FilterState>;
	initialTitle?: string;
}

export class CatalogView {
	private container!: HTMLElement;
	private grid!: HTMLElement;
	private countEl!: HTMLElement;
	private filter: FilterState;
	private sort: { key: SortKey; direction: SortDirection } = { key: "title", direction: "asc" };
	private viewMode: ViewMode = "grid-large";
	private opts: CatalogViewOptions;
	private sidebarOpen = true;
	private observer?: IntersectionObserver;
	private sortedMovies: Movie[] = [];
	private renderedCount = 0;
	private gridEl?: HTMLElement;

	constructor(opts: CatalogViewOptions) {
		this.opts = opts;
		this.filter = {
			genres: [],
			status: "all",
			...opts.initialFilter,
		};
	}

	render(container: HTMLElement): void {
		this.container = container;
		container.innerHTML = "";
		container.className = "lmv-view lmv-view--catalog";

		// Toolbar
		const toolbar = document.createElement("div");
		toolbar.className = "lmv-toolbar";

		const leftTools = document.createElement("div");
		leftTools.className = "lmv-toolbar__left";

		const toggleSidebar = document.createElement("button");
		toggleSidebar.className = "lmv-btn lmv-btn--icon-plain";
		toggleSidebar.title = "Filters";
		setIcon(toggleSidebar, "sliders-horizontal");
		toggleSidebar.addEventListener("click", () => {
			this.sidebarOpen = !this.sidebarOpen;
			layout.classList.toggle("lmv-layout--no-sidebar", !this.sidebarOpen);
		});
		leftTools.appendChild(toggleSidebar);

		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.placeholder = "Search movie, director, actor...";
		searchInput.className = "lmv-search-input";
		searchInput.value = this.filter.query ?? "";
		let searchTimeout: ReturnType<typeof setTimeout>;
		searchInput.addEventListener("input", () => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				this.filter = { ...this.filter, query: searchInput.value };
				this.renderGrid();
			}, 200);
		});
		leftTools.appendChild(searchInput);

		this.countEl = document.createElement("span");
		this.countEl.className = "lmv-toolbar__count";
		leftTools.appendChild(this.countEl);

		toolbar.appendChild(leftTools);
		container.appendChild(toolbar);

		// Layout: sidebar + grid
		const layout = document.createElement("div");
		layout.className = `lmv-layout${this.sidebarOpen ? "" : " lmv-layout--no-sidebar"}`;

		// Sidebar
		const sidebarWrapper = document.createElement("div");
		sidebarWrapper.className = "lmv-layout__sidebar";

		const renderSidebar = () => {
			sidebarWrapper.innerHTML = "";
			const sidebar = createFilterSidebar({
				filter: this.filter,
				sort: this.sort,
				viewMode: this.viewMode,
				genres: this.opts.service.getAllGenres(),
				onFilterChange: (f) => { this.filter = f; this.renderGrid(); renderSidebar(); },
				onSortChange: (key, dir) => { this.sort = { key, direction: dir }; this.renderGrid(); renderSidebar(); },
				onViewModeChange: (mode) => { this.viewMode = mode; this.renderGrid(); renderSidebar(); },
			});
			sidebarWrapper.appendChild(sidebar);
		};
		renderSidebar();

		layout.appendChild(sidebarWrapper);

		// Grid container
		const gridWrapper = document.createElement("div");
		gridWrapper.className = "lmv-layout__content";
		this.grid = gridWrapper;
		layout.appendChild(gridWrapper);

		container.appendChild(layout);

		this.renderGrid();
	}

	private renderGrid(): void {
		// Disconnect previous observer
		this.observer?.disconnect();
		this.observer = undefined;

		this.grid.innerHTML = "";
		this.renderedCount = 0;

		const movies = this.opts.service.movies;
		const filtered = filterEngine.apply(movies, this.filter);
		this.sortedMovies = sortEngine.sort(filtered, this.sort.key, this.sort.direction);

		this.countEl.textContent = `${this.sortedMovies.length} movie${this.sortedMovies.length !== 1 ? "s" : ""}`;

		if (this.sortedMovies.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			empty.innerHTML = `<p class="lmv-empty__msg">No results for these filters.</p>`;
			this.grid.appendChild(empty);
			return;
		}

		const modeClass = {
			"grid-large": "lmv-grid lmv-grid--large",
			"grid-compact": "lmv-grid lmv-grid--compact",
			"list": "lmv-list",
			"poster": "lmv-grid lmv-grid--poster",
		}[this.viewMode];

		this.gridEl = document.createElement("div");
		this.gridEl.className = modeClass;
		this.grid.appendChild(this.gridEl);

		this.renderNextBatch();
	}

	private renderNextBatch(): void {
		if (!this.gridEl) return;

		const size = this.viewMode === "grid-large" ? "normal"
			: this.viewMode === "grid-compact" ? "compact"
			: this.viewMode === "list" ? "list"
			: "poster";

		const start = this.renderedCount;
		const end = Math.min(start + PAGE_SIZE, this.sortedMovies.length);
		const fragment = document.createDocumentFragment();

		for (let i = start; i < end; i++) {
			const card = createMovieCard({
				movie: this.sortedMovies[i],
				size,
				onClick: this.opts.onMovieClick,
				onFavToggle: this.opts.onFavToggle,
				onMarkWatched: this.opts.onMarkWatched,
			});
			fragment.appendChild(card);
		}

		this.gridEl.appendChild(fragment);
		this.renderedCount = end;

		if (this.renderedCount >= this.sortedMovies.length) return;

		// Add sentinel for next batch
		const sentinel = document.createElement("div");
		sentinel.className = "lmv-sentinel";
		this.grid.appendChild(sentinel);

		this.observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				this.observer?.disconnect();
				this.observer = undefined;
				sentinel.remove();
				this.renderNextBatch();
			}
		}, { root: this.grid, rootMargin: "200px" });

		this.observer.observe(sentinel);
	}
}
