import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { createMovieCard } from "../components/MovieCard";
import { createStarRating } from "../components/StarRating";

type TopMode = "all" | "rating" | "imdb" | "rt";
type TopViewMode = "rank" | "grid-large" | "grid-compact" | "poster";
const TOP_SIZES = [10, 20, 30] as const;

export interface TopListOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	onFavToggle: (movie: Movie) => void;
	onMarkWatched?: (movie: Movie) => void;
	customOrder?: string[];
	onSaveOrder?: (ids: string[]) => void;
	allOrder?: string[];
	onSaveAllOrder?: (ids: string[]) => void;
}

export function renderTopList(container: HTMLElement, opts: TopListOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--top";

	let mode: TopMode = "all";
	let topN: number = 10;
	let viewMode: TopViewMode = "rank";
	let genreFilter: string = "";
	let customOrder: string[] = [...(opts.customOrder ?? [])];
	let allOrder: string[] = [...(opts.allOrder ?? [])];

	// ── Controls ──────────────────────────────────────────────
	const controls = document.createElement("div");
	controls.className = "lmv-top__controls";

	// Row 1: mode + topN + view buttons
	const mainRow = document.createElement("div");
	mainRow.className = "lmv-top__row--main";

	// Mode buttons
	const modeGroup = document.createElement("div");
	modeGroup.className = "lmv-btn-group";
	const modeConfigs: { key: TopMode; label: string }[] = [
		{ key: "all", label: "All" },
		{ key: "rating", label: "My Rating" },
		{ key: "imdb", label: "IMDb" },
		{ key: "rt", label: "RT" },
	];
	modeConfigs.forEach(({ key, label }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-btn${mode === key ? " lmv-btn--primary" : " lmv-btn--ghost"}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			mode = key;
			modeGroup.querySelectorAll(".lmv-btn").forEach((b) => (b.className = "lmv-btn lmv-btn--ghost"));
			btn.className = "lmv-btn lmv-btn--primary";
			renderList();
		});
		modeGroup.appendChild(btn);
	});
	mainRow.appendChild(modeGroup);

	// Top N buttons
	const nGroup = document.createElement("div");
	nGroup.className = "lmv-btn-group";
	TOP_SIZES.forEach((n) => {
		const btn = document.createElement("button");
		btn.className = `lmv-btn lmv-btn--sm${topN === n ? " lmv-btn--primary" : " lmv-btn--ghost"}`;
		btn.textContent = `Top ${n}`;
		btn.addEventListener("click", () => {
			topN = n;
			nGroup.querySelectorAll(".lmv-btn").forEach((b) => (b.className = "lmv-btn lmv-btn--sm lmv-btn--ghost"));
			btn.className = "lmv-btn lmv-btn--sm lmv-btn--primary";
			renderList();
		});
		nGroup.appendChild(btn);
	});
	mainRow.appendChild(nGroup);

	// View mode buttons
	const viewGroup = document.createElement("div");
	viewGroup.className = "lmv-btn-group lmv-btn-group--view";
	const viewConfigs: { key: TopViewMode; icon: string; title: string }[] = [
		{ key: "rank", icon: "list", title: "Ranking" },
		{ key: "grid-large", icon: "grid-2x2", title: "Grid" },
		{ key: "grid-compact", icon: "layout-grid", title: "Compact" },
		{ key: "poster", icon: "image", title: "Poster" },
	];
	const viewBtns: HTMLElement[] = [];
	viewConfigs.forEach(({ key, icon, title }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-btn lmv-btn--icon${viewMode === key ? " lmv-btn--primary" : " lmv-btn--ghost"}`;
		btn.title = title;
		setIcon(btn, icon);
		btn.addEventListener("click", () => {
			viewMode = key;
			viewBtns.forEach((b) => (b.className = "lmv-btn lmv-btn--icon lmv-btn--ghost"));
			btn.className = "lmv-btn lmv-btn--icon lmv-btn--primary";
			renderList();
		});
		viewGroup.appendChild(btn);
		viewBtns.push(btn);
	});
	mainRow.appendChild(viewGroup);

	controls.appendChild(mainRow);

	// Row 2: genre filter chips
	const genreRow = document.createElement("div");
	genreRow.className = "lmv-top__genre-row";
	controls.appendChild(genreRow);

	container.appendChild(controls);

	// ── List container ────────────────────────────────────────
	const listContainer = document.createElement("div");
	listContainer.className = "lmv-top__list";
	container.appendChild(listContainer);

	// ── Genre row renderer ────────────────────────────────────
	const renderGenreRow = () => {
		genreRow.innerHTML = "";

		const allBtn = document.createElement("button");
		allBtn.className = `lmv-chip lmv-chip--filter${!genreFilter ? " lmv-chip--active" : ""}`;
		allBtn.textContent = "All genres";
		allBtn.addEventListener("click", () => {
			genreFilter = "";
			renderGenreRow();
			renderList();
		});
		genreRow.appendChild(allBtn);

		opts.service.getAllGenres().forEach((genre) => {
			const chip = document.createElement("button");
			chip.className = `lmv-chip lmv-chip--filter${genreFilter === genre ? " lmv-chip--active" : ""}`;
			chip.textContent = genre;
			chip.addEventListener("click", () => {
				genreFilter = genreFilter === genre ? "" : genre;
				renderGenreRow();
				renderList();
			});
			genreRow.appendChild(chip);
		});
	};

	// ── Build ranked movie list ───────────────────────────────
	const getSortedSource = (): Movie[] => {
		const movies = opts.service.movies;
		let source: Movie[];

		if (mode === "all") {
			source = [...movies];
			if (allOrder.length > 0) {
				const orderMap = new Map(allOrder.map((id, i) => [id, i]));
				const inOrder = source
					.filter((m) => orderMap.has(m.id))
					.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
				const newOnes = source
					.filter((m) => !orderMap.has(m.id))
					.sort((a, b) => a.title.localeCompare(b.title));
				source = [...inOrder, ...newOnes];
			} else {
				source = [...source].sort((a, b) => a.title.localeCompare(b.title));
			}
		} else if (mode === "rating") {
			source = movies.filter((m) => m.rating != null);
			if (customOrder.length > 0) {
				const orderMap = new Map(customOrder.map((id, i) => [id, i]));
				const inOrder = source
					.filter((m) => orderMap.has(m.id))
					.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
				const newOnes = source
					.filter((m) => !orderMap.has(m.id))
					.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
				source = [...inOrder, ...newOnes];
			} else {
				source = [...source].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
			}
		} else if (mode === "imdb") {
			source = [...movies]
				.filter((m) => m.scoreImdb != null)
				.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0));
		} else {
			source = [...movies]
				.filter((m) => m.scoreRT != null)
				.sort((a, b) => (b.scoreRT ?? 0) - (a.scoreRT ?? 0));
		}

		if (genreFilter) {
			source = source.filter((m) => m.genre.includes(genreFilter));
		}

		return source;
	};

	const getRanked = (): Movie[] => {
		const source = getSortedSource();
		return mode === "all" ? source : source.slice(0, topN);
	};
	const getTotal = (): number => getSortedSource().length;

	// ── Main renderer ─────────────────────────────────────────
	const renderList = () => {
		listContainer.innerHTML = "";
		const ranked = getRanked();

		if (ranked.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "trophy");
			const emptyP = document.createElement("p");
			emptyP.textContent = "No movies found.";
			empty.appendChild(iconEl);
			empty.appendChild(emptyP);
			listContainer.appendChild(empty);
			return;
		}

		// ── Card grid views ───────────────────────────────────
		if (viewMode !== "rank") {
			const gridEl = document.createElement("div");
			const modeClass: Record<string, string> = {
				"grid-large": "lmv-grid lmv-grid--large",
				"grid-compact": "lmv-grid lmv-grid--compact",
				"poster": "lmv-grid lmv-grid--poster",
			};
			gridEl.className = modeClass[viewMode] ?? "lmv-grid lmv-grid--large";
			ranked.forEach((movie) => {
				const size =
					viewMode === "grid-compact" ? "compact"
					: viewMode === "poster" ? "poster"
					: "normal";
				const card = createMovieCard({
					movie,
					size,
					onClick: opts.onMovieClick,
					onFavToggle: opts.onFavToggle,
					onMarkWatched: opts.onMarkWatched,
				});
				gridEl.appendChild(card);
			});
			listContainer.appendChild(gridEl);
			return;
		}

		// ── Rank list view ────────────────────────────────────
		// "My Rating" (no genre filter): draggable, no podium
		// "My Rating" (with genre filter): read-only rank rows, no drag
		// IMDb / RT: podium top 3 + rank rows below
		const isDraggable = (mode === "rating" || mode === "all") && !genreFilter;

		// ── Info bar ──────────────────────────────────────────
		const infoBar = document.createElement("div");
		infoBar.className = "lmv-top__info-bar";

		const total = getTotal();
		const countEl = document.createElement("span");
		countEl.className = "lmv-top__count";
		countEl.textContent = genreFilter
			? `${ranked.length} of ${total} movies · "${genreFilter}"`
			: mode === "all"
				? `${ranked.length} movies`
				: `${ranked.length} of ${total} ${mode === "rating" ? "rated" : mode === "imdb" ? "with IMDb score" : "with RT score"}`;
		infoBar.appendChild(countEl);

		if (mode === "rating" && customOrder.length > 0) {
			const resetBtn = document.createElement("button");
			resetBtn.className = "lmv-btn lmv-btn--xs lmv-btn--ghost";
			resetBtn.title = "Reset to default sort by rating";
			setIcon(resetBtn, "rotate-ccw");
			resetBtn.appendChild(document.createTextNode(" Reset order"));
			resetBtn.addEventListener("click", () => {
				customOrder = [];
				opts.onSaveOrder?.([]);
				renderList();
			});
			infoBar.appendChild(resetBtn);
		}

		if (mode === "all" && allOrder.length > 0) {
			const resetBtn = document.createElement("button");
			resetBtn.className = "lmv-btn lmv-btn--xs lmv-btn--ghost";
			resetBtn.title = "Reset to alphabetical order";
			setIcon(resetBtn, "rotate-ccw");
			resetBtn.appendChild(document.createTextNode(" Reset order"));
			resetBtn.addEventListener("click", () => {
				allOrder = [];
				opts.onSaveAllOrder?.([]);
				renderList();
			});
			infoBar.appendChild(resetBtn);
		}

		if (isDraggable) {
			const hint = document.createElement("span");
			hint.className = "lmv-top__drag-hint";
			hint.textContent = "Drag rows to reorder";
			infoBar.appendChild(hint);
		} else if ((mode === "rating" || mode === "all") && genreFilter) {
			const hint = document.createElement("span");
			hint.className = "lmv-top__drag-hint lmv-top__drag-hint--off";
			hint.textContent = "Clear genre filter to reorder";
			infoBar.appendChild(hint);
		}

		listContainer.appendChild(infoBar);

		let startIdx = 0;

		if (!isDraggable && ranked.length >= 3) {
			const podium = document.createElement("div");
			podium.className = "lmv-podium";
			[1, 0, 2].forEach((rankIdx) => {
				const movie = ranked[rankIdx];
				if (!movie) return;
				const item = document.createElement("div");
				const tierClass = ["lmv-podium__item--gold", "lmv-podium__item--silver", "lmv-podium__item--bronze"][rankIdx];
				item.className = `lmv-podium__item ${tierClass}`;

				const medal = document.createElement("div");
				medal.className = "lmv-podium__medal";
				medal.textContent = ["🥇", "🥈", "🥉"][rankIdx];

				const poster = document.createElement("div");
				poster.className = "lmv-podium__poster";
				if (movie.cover) {
					const img = document.createElement("img");
					img.src = movie.cover;
					img.alt = movie.title;
					poster.appendChild(img);
				}

				const title = document.createElement("p");
				title.className = "lmv-podium__title";
				title.textContent = movie.title;

				const score = document.createElement("p");
				score.className = "lmv-podium__score";
				const val = mode === "imdb" ? movie.scoreImdb : movie.scoreRT;
				score.textContent = val != null ? (mode === "rt" ? `${val}%` : String(val)) : "—";

				item.appendChild(medal);
				item.appendChild(poster);
				item.appendChild(title);
				item.appendChild(score);
				item.addEventListener("click", () => opts.onMovieClick(movie));
				podium.appendChild(item);
			});
			listContainer.appendChild(podium);
			startIdx = 3;
		}

		const rankList = document.createElement("div");
		rankList.className = "lmv-rank-list";

		let currentOrder = [...ranked];
		let dragSrcIdx: number | null = null;

		const reRenderRows = (skipAnimation = false) => {
			rankList.innerHTML = "";
			currentOrder.slice(startIdx).forEach((movie, i) => {
				const absIdx = startIdx + i;
				const rank = absIdx + 1;
				const row = createRankRow(movie, rank, mode, isDraggable);

				if (skipAnimation) {
					row.style.animation = "none";
					row.style.opacity = "1";
				} else {
					row.style.animationDelay = `${i * 30}ms`;
				}

				if (isDraggable) {
					row.draggable = true;
					row.dataset.idx = String(absIdx);

					row.addEventListener("dragstart", () => {
						dragSrcIdx = absIdx;
						setTimeout(() => row.classList.add("lmv-rank-row--dragging"), 0);
					});

					row.addEventListener("dragend", () => {
						row.classList.remove("lmv-rank-row--dragging");
						rankList.querySelectorAll(".lmv-rank-row--dragover").forEach((el) =>
							el.classList.remove("lmv-rank-row--dragover")
						);
					});

					row.addEventListener("dragover", (e) => {
						e.preventDefault();
						rankList.querySelectorAll(".lmv-rank-row--dragover").forEach((el) =>
							el.classList.remove("lmv-rank-row--dragover")
						);
						row.classList.add("lmv-rank-row--dragover");
					});

					// Fix: only remove dragover if cursor truly left the row (not moved to a child)
					row.addEventListener("dragleave", (e) => {
						if (!row.contains(e.relatedTarget as Node)) {
							row.classList.remove("lmv-rank-row--dragover");
						}
					});

					row.addEventListener("drop", (e) => {
						e.preventDefault();
						row.classList.remove("lmv-rank-row--dragover");
						if (dragSrcIdx === null || dragSrcIdx === absIdx) return;

						const newOrder = [...currentOrder];
						const [moved] = newOrder.splice(dragSrcIdx, 1);
						newOrder.splice(absIdx, 0, moved);
						currentOrder = newOrder;
						dragSrcIdx = null;

						if (mode === "all") {
							allOrder = newOrder.map((m) => m.id);
							opts.onSaveAllOrder?.(allOrder);
						} else {
							customOrder = newOrder.map((m) => m.id);
							opts.onSaveOrder?.(customOrder);
						}

						reRenderRows(true); // skip animation after drag
					});
				}

				row.addEventListener("click", () => opts.onMovieClick(movie));
				rankList.appendChild(row);
			});
		};

		reRenderRows(false);
		listContainer.appendChild(rankList);
	};

	renderGenreRow();
	renderList();
}

function createRankRow(movie: Movie, rank: number, mode: TopMode, isDraggable: boolean): HTMLElement {
	const row = document.createElement("div");
	row.className = "lmv-rank-row";

	if (isDraggable) {
		const handle = document.createElement("span");
		handle.className = "lmv-rank-row__handle";
		setIcon(handle, "grip-vertical");
		row.appendChild(handle);
	}

	const rankNum = document.createElement("span");
	rankNum.className = "lmv-rank-row__num";
	rankNum.textContent = String(rank);
	row.appendChild(rankNum);

	const poster = document.createElement("div");
	poster.className = "lmv-rank-row__poster";
	if (movie.cover) {
		const img = document.createElement("img");
		img.src = movie.cover;
		img.alt = movie.title;
		poster.appendChild(img);
	}
	row.appendChild(poster);

	const info = document.createElement("div");
	info.className = "lmv-rank-row__info";

	const title = document.createElement("span");
	title.className = "lmv-rank-row__title";
	title.textContent = movie.title;
	info.appendChild(title);

	const sub = document.createElement("span");
	sub.className = "lmv-rank-row__sub";
	const parts: string[] = [];
	if (movie.year) parts.push(String(movie.year));
	if (movie.director.length) parts.push(movie.director[0]);
	if (movie.genre.length) parts.push(movie.genre[0]);
	sub.textContent = parts.join(" · ");
	info.appendChild(sub);

	row.appendChild(info);

	if ((mode === "rating" || mode === "all") && movie.rating != null) {
		const stars = createStarRating({ value: movie.rating, readonly: true, size: "sm" });
		stars.classList.add("lmv-rank-row__stars");
		row.appendChild(stars);
	} else if (mode === "all" && movie.scoreImdb != null) {
		const scoreEl = document.createElement("span");
		scoreEl.className = "lmv-rank-row__score";
		scoreEl.textContent = String(movie.scoreImdb);
		row.appendChild(scoreEl);
	} else if (mode !== "all") {
		const scoreEl = document.createElement("span");
		scoreEl.className = "lmv-rank-row__score";
		const val = mode === "imdb" ? movie.scoreImdb : movie.scoreRT;
		scoreEl.textContent = val != null ? (mode === "rt" ? `${val}%` : String(val)) : "—";
		row.appendChild(scoreEl);
	}

	return row;
}
