import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { createStarRating } from "../components/StarRating";

export interface ReviewsViewOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
}

export function renderReviews(container: HTMLElement, opts: ReviewsViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--reviews";

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "My Reviews";
	container.appendChild(h1);

	const reviewed = opts.service.movies
		.filter((m) => m.review && m.review.trim().length > 0)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

	if (reviewed.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-empty__icon";
		setIcon(iconEl, "file-text");
		const emptyP = document.createElement("p");
		emptyP.textContent = "No reviews yet. Open a movie and write your thoughts.";
		empty.appendChild(iconEl);
		empty.appendChild(emptyP);
		container.appendChild(empty);
		return;
	}

	const count = document.createElement("p");
	count.className = "lmv-text-muted";
	count.textContent = `${reviewed.length} review${reviewed.length !== 1 ? "s" : ""}`;
	container.appendChild(count);

	const list = document.createElement("div");
	list.className = "lmv-reviews-list";

	reviewed.forEach((movie, i) => {
		const card = document.createElement("div");
		card.className = "lmv-review-card";
		card.style.animationDelay = `${i * 40}ms`;

		const left = document.createElement("div");
		left.className = "lmv-review-card__left";

		if (movie.cover) {
			const img = document.createElement("img");
			img.src = movie.cover;
			img.alt = movie.title;
			img.className = "lmv-review-card__poster";
			img.loading = "lazy";
			left.appendChild(img);
		}

		const right = document.createElement("div");
		right.className = "lmv-review-card__right";

		const header = document.createElement("div");
		header.className = "lmv-review-card__header";

		const title = document.createElement("h3");
		title.className = "lmv-review-card__title";
		title.textContent = movie.title;
		header.appendChild(title);

		const meta = document.createElement("span");
		meta.className = "lmv-text-muted";
		const parts: string[] = [];
		if (movie.year) parts.push(String(movie.year));
		if (movie.director.length) parts.push(movie.director[0]);
		meta.textContent = parts.join(" · ");
		header.appendChild(meta);

		right.appendChild(header);

		if (movie.rating != null) {
			right.appendChild(createStarRating({ value: movie.rating, readonly: true, size: "sm" }));
		}

		const reviewText = document.createElement("p");
		reviewText.className = "lmv-review-card__text";
		reviewText.textContent = movie.review ?? "";
		right.appendChild(reviewText);

		const readMore = document.createElement("button");
		readMore.className = "lmv-btn lmv-btn--ghost lmv-btn--sm";
		readMore.textContent = "View movie";
		readMore.addEventListener("click", () => opts.onMovieClick(movie));
		right.appendChild(readMore);

		card.appendChild(left);
		card.appendChild(right);
		list.appendChild(card);
	});

	container.appendChild(list);
}
