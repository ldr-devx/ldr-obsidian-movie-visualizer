import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createHeroSection } from "../components/HeroSection";
import { createCarousel } from "../components/Carousel";

const engine = new StatsEngine();

export interface DashboardViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched: (movie: Movie) => void;
	onViewAll: (route: string) => void;
}

export function renderDashboard(container: HTMLElement, opts: DashboardViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--dashboard";

	const movies = opts.service.movies;

	if (movies.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		empty.innerHTML = `
			<h2>No movies yet</h2>
			<p>Use Obsidian Clipper on IMDb to add movies to your vault.</p>
		`;
		container.appendChild(empty);
		return;
	}

	const stats = opts.service.getStats();

	// Hero: last watched or highest rated
	const heroMovie =
		engine.recentlyWatched(movies, 1)[0] ??
		engine.topByRating(movies, 1)[0] ??
		engine.topByImdb(movies, 1)[0] ??
		movies[0];

	if (heroMovie) {
		const hero = createHeroSection({
			movie: heroMovie,
			onDetail: opts.onMovieClick,
			onFavToggle: opts.onFavToggle,
		});
		container.appendChild(hero);
	}

	// Stats bar
	const statsBar = document.createElement("div");
	statsBar.className = "lmv-stats-bar";

	const statsItems = [
		{ value: stats.total, label: "Total" },
		{ value: stats.watched, label: "Watched" },
		{ value: stats.unwatched, label: "Unwatched" },
		{ value: stats.favorites, label: "Favorites" },
		{ value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—", label: "My rating" },
		{ value: stats.avgImdb > 0 ? stats.avgImdb.toFixed(1) : "—", label: "IMDb" },
		{ value: stats.directors, label: "Directors" },
	];

	statsItems.forEach(({ value, label }) => {
		const item = document.createElement("div");
		item.className = "lmv-stats-bar__item";
		item.innerHTML = `<span class="lmv-stats-bar__value">${value}</span><span class="lmv-stats-bar__label">${label}</span>`;
		statsBar.appendChild(item);
	});

	container.appendChild(statsBar);

	// Carousels
	const carouselContainer = document.createElement("div");
	carouselContainer.className = "lmv-dashboard__carousels";

	const carousels = [
		{
			title: "Continue watching",
			movies: engine.recentlyWatched(movies, 20),
			route: "watched",
		},
		{
			title: "Recently added",
			movies: engine.recentlyAdded(movies, 20),
			route: "catalog",
		},
		{
			title: "My favorites",
			movies: engine.favorites(movies, 20),
			route: "favorites",
		},
		{
			title: "Top IMDb in my collection",
			movies: engine.topByImdb(movies, 20),
			route: "top",
		},
		{
			title: "My highest rated",
			movies: engine.topByRating(movies, 20),
			route: "top",
		},
	];

	carousels.forEach(({ title, movies: carouselMovies, route }) => {
		const carousel = createCarousel({
			title,
			movies: carouselMovies,
			size: "normal",
			onCardClick: opts.onMovieClick,
			onFavToggle: opts.onFavToggle,
			onMarkWatched: opts.onMarkWatched,
			onViewAll: () => opts.onViewAll(route),
		});
		if (carousel.childNodes.length > 0) {
			carouselContainer.appendChild(carousel);
		}
	});

	container.appendChild(carouselContainer);

	// Runtime easter egg
	if (stats.totalRuntime > 0) {
		const runtime = document.createElement("div");
		runtime.className = "lmv-runtime-badge";
		const h = Math.floor(stats.totalRuntime / 60);
		const d = Math.floor(h / 24);
		runtime.textContent = `You've watched approx. ${d}d ${h % 24}h of movies`;
		container.appendChild(runtime);
	}
}
