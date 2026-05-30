import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { App } from "obsidian";
import type { Movie } from "./types";
import { MovieDataService } from "./services/MovieDataService";
import { renderDashboard } from "./views/DashboardView";
import { CatalogView } from "./views/CatalogView";
import { renderMovieDetail } from "./views/MovieDetailView";
import { renderTopList } from "./views/TopListView";
import { renderDirectors } from "./views/DirectorView";
import { renderActors } from "./views/ActorsView";
import { renderPlaylists } from "./views/PlaylistView";
import { renderReviews } from "./views/ReviewsView";
import { renderStats } from "./views/StatsView";
import { renderSearch } from "./views/SearchView";
import { renderTierList, TierListData } from "./views/TierListView";

export const MOVIE_VIEW_TYPE = "ldr-movie-visualizer";

type Route =
	| "dashboard"
	| "catalog"
	| "favorites"
	| "unwatched"
	| "watched"
	| "search"
	| "top"
	| "directors"
	| "actors"
	| "playlists"
	| "reviews"
	| "stats"
	| "tierlist"
	| "detail";

interface NavItem {
	id: Route;
	label: string;
	icon: string;
}

const NAV_ITEMS: NavItem[] = [
	{ id: "dashboard", label: "Dashboard", icon: "home" },
	{ id: "search", label: "Search", icon: "search" },
	{ id: "catalog", label: "Catalog", icon: "grid-2x2" },
	{ id: "favorites", label: "Favorites", icon: "heart" },
	{ id: "unwatched", label: "Unwatched", icon: "eye-off" },
	{ id: "watched", label: "Watched", icon: "check-circle" },
	{ id: "top", label: "Top Lists", icon: "trophy" },
	{ id: "directors", label: "Directors", icon: "clapperboard" },
	{ id: "actors", label: "Actors", icon: "users" },
	{ id: "playlists", label: "Playlists", icon: "list" },
	{ id: "reviews", label: "My Reviews", icon: "file-text" },
	{ id: "stats", label: "Stats", icon: "bar-chart-2" },
	{ id: "tierlist", label: "Tier List", icon: "layout-list" },
];

const RANK_ORDER_PATH = ".obsidian/plugins/ldr-obsidian-movie-visualizer/rank-order.json";
const ALL_ORDER_PATH = ".obsidian/plugins/ldr-obsidian-movie-visualizer/all-order.json";
const TIERLIST_PATH = ".obsidian/plugins/ldr-obsidian-movie-visualizer/tierlist.json";

export class MovieVisualizerView extends ItemView {
	private service!: MovieDataService;
	private currentRoute: Route = "dashboard";
	private navEl!: HTMLElement;
	private viewContentEl!: HTMLElement;
	private unsubscribe?: () => void;
	private rankOrder: string[] = [];
	private allOrder: string[] = [];
	private tierListData: TierListData = { tiers: [] };

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return MOVIE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Movie Visualizer";
	}

	getIcon(): string {
		return "clapperboard";
	}

	async onOpen(): Promise<void> {
		this.service = new MovieDataService(this.app);
		await this.service.init();

		try {
			const raw = await this.app.vault.adapter.read(RANK_ORDER_PATH);
			this.rankOrder = JSON.parse(raw) as string[];
		} catch {
			this.rankOrder = [];
		}

		try {
			const raw = await this.app.vault.adapter.read(ALL_ORDER_PATH);
			this.allOrder = JSON.parse(raw) as string[];
		} catch {
			this.allOrder = [];
		}

		try {
			const raw = await this.app.vault.adapter.read(TIERLIST_PATH);
			this.tierListData = JSON.parse(raw) as TierListData;
		} catch {
			this.tierListData = { tiers: [] };
		}

		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("lmv-root");

		// Nav sidebar
		this.navEl = root.createDiv("lmv-nav");
		this.buildNav();

		// Content area
		this.viewContentEl = root.createDiv("lmv-content");

		// Subscribe to data changes
		this.unsubscribe = this.service.subscribe(() => {
			if (this.currentRoute !== "detail") this.renderRoute(this.currentRoute);
		});

		this.renderRoute("dashboard");
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.service?.destroy();
	}

	private buildNav(): void {
		this.navEl.empty();

		// Logo
		const logo = this.navEl.createDiv("lmv-nav__logo");
		const logoIcon = logo.createSpan("lmv-nav__logo-icon");
		setIcon(logoIcon, "clapperboard");
		logo.createSpan("lmv-nav__logo-text").setText("Movie Visualizer");

		// Stats mini badge
		const stats = this.service.getStats();
		const badge = this.navEl.createDiv("lmv-nav__badge");
		badge.innerHTML = `<span>${stats.total} movie${stats.total !== 1 ? "s" : ""}</span>`;

		// Nav items
		const items = this.navEl.createDiv("lmv-nav__items");
		NAV_ITEMS.forEach(({ id, label, icon }) => {
			const item = items.createDiv(`lmv-nav__item${this.currentRoute === id ? " lmv-nav__item--active" : ""}`);
			item.dataset.route = id;

			const iconEl = item.createSpan("lmv-nav__item-icon");
			setIcon(iconEl, icon);

			item.createSpan("lmv-nav__item-label").setText(label);

			item.addEventListener("click", () => {
				if (id === this.currentRoute) return;
				this.navigateTo(id);
			});
		});
	}

	private navigateTo(route: Route, data?: unknown): void {
		this.currentRoute = route;

		// Update active nav item
		this.navEl.querySelectorAll(".lmv-nav__item").forEach((el) => {
			const r = (el as HTMLElement).dataset.route;
			el.classList.toggle("lmv-nav__item--active", r === route);
		});

		// Animate out → render → animate in
		this.viewContentEl.classList.add("lmv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("lmv-content--exit");
			this.renderRoute(route, data);
			this.viewContentEl.classList.add("lmv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("lmv-content--enter"), 300);
		}, 150);
	}

	private renderRoute(route: Route, data?: unknown): void {
		const nav = (r: Route, d?: unknown) => this.navigateTo(r, d);

		const movieHandlers = {
			onMovieClick: (movie: Movie) => this.openMovieDetail(movie),
			onFavToggle: async (movie: Movie) => {
				const newVal = !movie.favorite;
				movie.favorite = newVal;
				await this.service.updateField(movie, { favorite: newVal });
			},
			onMarkWatched: async (movie: Movie) => {
				const alreadyWatched = !!(movie.last || movie.timesWatched > 0);
				if (alreadyWatched) {
					movie.last = "";
					movie.timesWatched = 0;
					await this.service.updateField(movie, { last: "", timesWatched: 0 });
				} else {
					const today = new Date().toISOString().split("T")[0];
					const newCount = movie.timesWatched + 1;
					movie.last = today;
					movie.timesWatched = newCount;
					await this.service.updateField(movie, { last: today, timesWatched: newCount });
				}
			},
		};

		switch (route) {
			case "dashboard":
				renderDashboard(this.viewContentEl, {
					service: this.service,
					...movieHandlers,
					onViewAll: (r) => nav(r as Route),
				});
				break;

			case "catalog":
				new CatalogView({ service: this.service, ...movieHandlers }).render(this.viewContentEl);
				break;

			case "favorites":
				new CatalogView({
					service: this.service,
					...movieHandlers,
					initialFilter: { genres: [], status: "favorites" },
				}).render(this.viewContentEl);
				break;

			case "unwatched":
				new CatalogView({
					service: this.service,
					...movieHandlers,
					initialFilter: { genres: [], status: "unwatched" },
				}).render(this.viewContentEl);
				break;

			case "watched":
				new CatalogView({
					service: this.service,
					...movieHandlers,
					initialFilter: { genres: [], status: "watched" },
				}).render(this.viewContentEl);
				break;

			case "search":
				renderSearch(this.viewContentEl, { service: this.service, ...movieHandlers });
				break;

			case "top":
				renderTopList(this.viewContentEl, {
					service: this.service,
					...movieHandlers,
					customOrder: this.rankOrder,
					onSaveOrder: async (ids: string[]) => {
						this.rankOrder = ids;
						await this.app.vault.adapter.write(RANK_ORDER_PATH, JSON.stringify(ids));
					},
					allOrder: this.allOrder,
					onSaveAllOrder: async (ids: string[]) => {
						this.allOrder = ids;
						await this.app.vault.adapter.write(ALL_ORDER_PATH, JSON.stringify(ids));
					},
				});
				break;

			case "directors":
				renderDirectors(this.viewContentEl, { service: this.service, ...movieHandlers });
				break;

			case "actors":
				renderActors(this.viewContentEl, { service: this.service, ...movieHandlers });
				break;

			case "playlists":
				renderPlaylists(this.viewContentEl, { app: this.app, service: this.service, ...movieHandlers });
				break;

			case "reviews":
				renderReviews(this.viewContentEl, { service: this.service, ...movieHandlers });
				break;

			case "stats":
				renderStats(this.viewContentEl, this.service);
				break;

			case "tierlist":
				renderTierList(this.viewContentEl, {
					service: this.service,
					onMovieClick: (movie) => this.openMovieDetail(movie),
					savedData: this.tierListData,
					onSave: async (data) => {
						this.tierListData = data;
						await this.app.vault.adapter.write(TIERLIST_PATH, JSON.stringify(data));
					},
				});
				break;

			case "detail":
				if (data instanceof Object && "id" in data) {
					const movie = this.service.getById((data as Movie).id);
					if (movie) {
						renderMovieDetail(this.viewContentEl, {
							movie,
							service: this.service,
							onBack: () => nav("catalog"),
							onMovieClick: movieHandlers.onMovieClick,
							onFavToggle: movieHandlers.onFavToggle,
						});
					}
				}
				break;
		}
	}

	private openMovieDetail(movie: Movie): void {
		this.currentRoute = "detail";
		this.navEl.querySelectorAll(".lmv-nav__item").forEach((el) => {
			el.classList.remove("lmv-nav__item--active");
		});

		this.viewContentEl.classList.add("lmv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("lmv-content--exit");
			renderMovieDetail(this.viewContentEl, {
				movie,
				service: this.service,
				onBack: () => this.navigateTo("catalog"),
				onMovieClick: (m) => this.openMovieDetail(m),
				onFavToggle: async (m) => {
					await this.service.updateField(m, { favorite: !m.favorite });
				},
			});
			this.viewContentEl.classList.add("lmv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("lmv-content--enter"), 300);
		}, 150);
	}
}
