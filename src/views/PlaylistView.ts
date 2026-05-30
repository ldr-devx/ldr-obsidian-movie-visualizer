import { App, setIcon } from "obsidian";
import type { Movie, Playlist } from "../types";
import { MovieDataService } from "../services/MovieDataService";
import { createMovieCard } from "../components/MovieCard";

const PLAYLISTS_KEY = "lmv-playlists";

function loadPlaylists(app: App): Playlist[] {
	try {
		const raw = localStorage.getItem(PLAYLISTS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function savePlaylists(playlists: Playlist[]): void {
	localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export interface PlaylistViewOptions {
	app: App;
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
}

export function renderPlaylists(container: HTMLElement, opts: PlaylistViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--playlists";

	let playlists = loadPlaylists(opts.app);

	const header = document.createElement("div");
	header.className = "lmv-view__header";

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Playlists";
	header.appendChild(h1);

	const newBtn = document.createElement("button");
	newBtn.className = "lmv-btn lmv-btn--primary";
	newBtn.textContent = "+ New playlist";
	newBtn.addEventListener("click", () => showCreateModal());
	header.appendChild(newBtn);
	container.appendChild(header);

	const listEl = document.createElement("div");
	listEl.className = "lmv-playlist-list";
	container.appendChild(listEl);

	const renderList = () => {
		listEl.innerHTML = "";
		playlists = loadPlaylists(opts.app);

		if (playlists.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "list");
			const emptyP = document.createElement("p");
			emptyP.textContent = "No playlists yet. Create one to organize your movies.";
			empty.appendChild(iconEl);
			empty.appendChild(emptyP);
			listEl.appendChild(empty);
			return;
		}

		playlists.forEach((pl) => {
			const card = document.createElement("div");
			card.className = "lmv-playlist-card";

			const info = document.createElement("div");
			info.className = "lmv-playlist-card__info";

			const name = document.createElement("h3");
			name.className = "lmv-playlist-card__name";
			name.textContent = pl.name;
			info.appendChild(name);

			if (pl.description) {
				const desc = document.createElement("p");
				desc.className = "lmv-playlist-card__desc";
				desc.textContent = pl.description;
				info.appendChild(desc);
			}

			const count = document.createElement("span");
			count.className = "lmv-playlist-card__count";
			count.textContent = `${pl.movieIds.length} movie${pl.movieIds.length !== 1 ? "s" : ""}`;
			info.appendChild(count);

			const actions = document.createElement("div");
			actions.className = "lmv-playlist-card__actions";

			const openBtn = document.createElement("button");
			openBtn.className = "lmv-btn lmv-btn--ghost";
			openBtn.textContent = "Open";
			openBtn.addEventListener("click", () => renderPlaylistDetail(container, pl, opts, renderList));

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "lmv-btn lmv-btn--ghost lmv-btn--danger";
			deleteBtn.textContent = "Delete";
			deleteBtn.addEventListener("click", () => {
				const all = loadPlaylists(opts.app).filter((p) => p.id !== pl.id);
				savePlaylists(all);
				renderList();
			});

			actions.appendChild(openBtn);
			actions.appendChild(deleteBtn);

			card.appendChild(info);
			card.appendChild(actions);
			listEl.appendChild(card);
		});
	};

	const showCreateModal = () => {
		const modal = document.createElement("div");
		modal.className = "lmv-modal-overlay";

		const dialog = document.createElement("div");
		dialog.className = "lmv-modal";

		const modalTitle = document.createElement("h2");
		modalTitle.textContent = "New playlist";
		dialog.appendChild(modalTitle);

		const nameInput = document.createElement("input");
		nameInput.type = "text";
		nameInput.placeholder = "Playlist name";
		nameInput.className = "lmv-input";
		dialog.appendChild(nameInput);

		const descInput = document.createElement("input");
		descInput.type = "text";
		descInput.placeholder = "Description (optional)";
		descInput.className = "lmv-input";
		dialog.appendChild(descInput);

		const btnRow = document.createElement("div");
		btnRow.className = "lmv-modal__actions";

		const confirmBtn = document.createElement("button");
		confirmBtn.className = "lmv-btn lmv-btn--primary";
		confirmBtn.textContent = "Create";
		confirmBtn.addEventListener("click", () => {
			const name = nameInput.value.trim();
			if (!name) return;
			const all = loadPlaylists(opts.app);
			const newPl: Playlist = {
				id: `pl-${Date.now()}`,
				name,
				description: descInput.value.trim() || undefined,
				movieIds: [],
				created: new Date().toISOString().split("T")[0],
			};
			all.push(newPl);
			savePlaylists(all);
			modal.remove();
			renderList();
		});

		const cancelBtn = document.createElement("button");
		cancelBtn.className = "lmv-btn lmv-btn--ghost";
		cancelBtn.textContent = "Cancel";
		cancelBtn.addEventListener("click", () => modal.remove());

		btnRow.appendChild(cancelBtn);
		btnRow.appendChild(confirmBtn);
		dialog.appendChild(btnRow);
		modal.appendChild(dialog);
		modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
		container.appendChild(modal);
		nameInput.focus();
	};

	renderList();
}

function renderPlaylistDetail(
	container: HTMLElement,
	playlist: Playlist,
	opts: PlaylistViewOptions,
	onBack: () => void
): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--playlist-detail";

	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	back.textContent = "← Playlists";
	back.addEventListener("click", () => renderPlaylists(container, opts));
	container.appendChild(back);

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = playlist.name;
	container.appendChild(h1);

	if (playlist.description) {
		const desc = document.createElement("p");
		desc.className = "lmv-text-muted";
		desc.textContent = playlist.description;
		container.appendChild(desc);
	}

	const movies = playlist.movieIds
		.map((id) => opts.service.getById(id))
		.filter((m): m is Movie => m != null);

	if (movies.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl2 = document.createElement("div");
		iconEl2.className = "lmv-empty__icon";
		setIcon(iconEl2, "film");
		const emptyP2 = document.createElement("p");
		emptyP2.textContent = "No movies. Add them from the catalog.";
		empty.appendChild(iconEl2);
		empty.appendChild(emptyP2);
		container.appendChild(empty);
		return;
	}

	const grid = document.createElement("div");
	grid.className = "lmv-grid lmv-grid--large";
	movies.forEach((movie) => {
		const card = createMovieCard({
			movie,
			size: "normal",
			onClick: opts.onMovieClick,
		});
		grid.appendChild(card);
	});
	container.appendChild(grid);
}
