import type { Movie } from "../types";
import { createMovieCard } from "./MovieCard";

export interface CarouselOptions {
	title: string;
	movies: Movie[];
	size?: "normal" | "compact" | "poster";
	onCardClick?: (movie: Movie) => void;
	onFavToggle?: (movie: Movie) => void;
	onMarkWatched?: (movie: Movie) => void;
	onViewAll?: () => void;
}

export function createCarousel(opts: CarouselOptions): HTMLElement {
	const { title, movies, size = "normal", onCardClick, onFavToggle, onMarkWatched, onViewAll } = opts;

	if (movies.length === 0) {
		const empty = document.createElement("div");
		return empty; // don't render empty carousels
	}

	const section = document.createElement("section");
	section.className = "lmv-carousel";

	// Header
	const header = document.createElement("div");
	header.className = "lmv-carousel__header";

	const titleEl = document.createElement("h2");
	titleEl.className = "lmv-carousel__title";
	titleEl.textContent = title;
	header.appendChild(titleEl);

	if (onViewAll) {
		const viewAll = document.createElement("button");
		viewAll.className = "lmv-btn lmv-btn--ghost";
		viewAll.textContent = "View all";
		viewAll.addEventListener("click", onViewAll);
		header.appendChild(viewAll);
	}

	section.appendChild(header);

	// Track wrapper
	const wrapper = document.createElement("div");
	wrapper.className = "lmv-carousel__wrapper";

	const track = document.createElement("div");
	track.className = `lmv-carousel__track lmv-carousel__track--${size}`;

	movies.forEach((movie, i) => {
		const card = createMovieCard({
			movie,
			size,
			onClick: onCardClick,
			onFavToggle,
			onMarkWatched,
		});
		card.style.animationDelay = `${i * 40}ms`;
		track.appendChild(card);
	});

	// Arrow buttons
	const btnPrev = document.createElement("button");
	btnPrev.className = "lmv-carousel__arrow lmv-carousel__arrow--prev";
	btnPrev.innerHTML = "‹";
	btnPrev.addEventListener("click", () => {
		track.scrollBy({ left: -(track.clientWidth * 0.8), behavior: "smooth" });
	});

	const btnNext = document.createElement("button");
	btnNext.className = "lmv-carousel__arrow lmv-carousel__arrow--next";
	btnNext.innerHTML = "›";
	btnNext.addEventListener("click", () => {
		track.scrollBy({ left: track.clientWidth * 0.8, behavior: "smooth" });
	});

	// Show/hide arrows based on scroll
	const updateArrows = () => {
		btnPrev.classList.toggle("lmv-carousel__arrow--hidden", track.scrollLeft <= 0);
		btnNext.classList.toggle(
			"lmv-carousel__arrow--hidden",
			track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
		);
	};

	track.addEventListener("scroll", updateArrows, { passive: true });
	setTimeout(updateArrows, 100);

	wrapper.appendChild(btnPrev);
	wrapper.appendChild(track);
	wrapper.appendChild(btnNext);
	section.appendChild(wrapper);

	return section;
}
