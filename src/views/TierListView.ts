import { setIcon } from "obsidian";
import type { Movie } from "../types";
import { MovieDataService } from "../services/MovieDataService";

export interface TierEntry {
	id: string;
	label: string;
	color: string;
	movieIds: string[];
}

export interface TierListData {
	tiers: TierEntry[];
}

export interface TierListOptions {
	service: MovieDataService;
	onMovieClick: (movie: Movie) => void;
	savedData?: TierListData;
	onSave?: (data: TierListData) => void;
}

let _idSeq = 0;
function uid(): string {
	return `tier-${Date.now()}-${_idSeq++}`;
}

const DEFAULT_TIER_DEFS = [
	{ label: "S", color: "#ff7f7f" },
	{ label: "A", color: "#ffbf7f" },
	{ label: "B", color: "#ffdf7f" },
	{ label: "C", color: "#bfdf7f" },
	{ label: "D", color: "#7fbfbf" },
];

export function renderTierList(container: HTMLElement, opts: TierListOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--tierlist";

	const movies = opts.service.movies;
	const movieMap = new Map(movies.map((m) => [m.id, m]));

	// Load saved tiers or defaults; remove stale movie IDs
	let tiers: TierEntry[] = opts.savedData?.tiers?.length
		? opts.savedData.tiers.map((t) => ({ ...t, movieIds: t.movieIds.filter((id) => movieMap.has(id)) }))
		: DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, movieIds: [] }));

	const save = () => opts.onSave?.({ tiers });

	const assignedIds = (): Set<string> => {
		const s = new Set<string>();
		tiers.forEach((t) => t.movieIds.forEach((id) => s.add(id)));
		return s;
	};

	// ── Layout skeleton ──────────────────────────────────────
	const toolbar = document.createElement("div");
	toolbar.className = "lmv-tierlist__toolbar";
	container.appendChild(toolbar);

	const tiersEl = document.createElement("div");
	tiersEl.className = "lmv-tierlist__tiers";
	container.appendChild(tiersEl);

	const poolSection = document.createElement("div");
	poolSection.className = "lmv-tierlist__pool-section";
	container.appendChild(poolSection);

	// ── Toolbar ──────────────────────────────────────────────
	const spacer = document.createElement("div");
	spacer.style.flex = "1";
	toolbar.appendChild(spacer);

	const addBtn = document.createElement("button");
	addBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	setIcon(addBtn, "plus");
	addBtn.appendChild(document.createTextNode(" Add tier"));
	addBtn.addEventListener("click", () => {
		tiers.push({ id: uid(), label: "New", color: "#9b9bcc", movieIds: [] });
		save();
		renderAll();
	});
	toolbar.appendChild(addBtn);

	const exportBtn = document.createElement("button");
	exportBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	setIcon(exportBtn, "camera");
	exportBtn.appendChild(document.createTextNode(" Save image"));
	exportBtn.addEventListener("click", () => exportTierList(tiers, movieMap));
	toolbar.appendChild(exportBtn);

	const resetBtn = document.createElement("button");
	resetBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost lmv-btn--danger";
	setIcon(resetBtn, "rotate-ccw");
	resetBtn.appendChild(document.createTextNode(" Reset"));
	resetBtn.title = "Reset tier list to defaults (all movies go back to pool)";
	resetBtn.addEventListener("click", () => {
		if (!confirm("Reset the entire tier list? All assignments will be cleared.")) return;
		tiers = DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, movieIds: [] }));
		save();
		renderAll();
	});
	toolbar.appendChild(resetBtn);

	// ── Pool section ─────────────────────────────────────────
	const poolHeader = document.createElement("div");
	poolHeader.className = "lmv-tierlist__pool-header";
	const poolLabelEl = document.createElement("span");
	poolLabelEl.className = "lmv-tierlist__pool-title";
	poolLabelEl.textContent = "Unranked";
	poolHeader.appendChild(poolLabelEl);
	poolSection.appendChild(poolHeader);

	const poolEl = document.createElement("div");
	poolEl.className = "lmv-tierlist__pool";
	poolSection.appendChild(poolEl);

	// ── Drop handlers ────────────────────────────────────────
	const onDropToTier = (tierId: string, movieId: string, sourceTierId: string) => {
		if (sourceTierId !== "pool") {
			const src = tiers.find((t) => t.id === sourceTierId);
			if (src) src.movieIds = src.movieIds.filter((id) => id !== movieId);
		}
		const dst = tiers.find((t) => t.id === tierId);
		if (dst && !dst.movieIds.includes(movieId)) dst.movieIds.push(movieId);
		save();
		renderAll();
	};

	const onDropToPool = (movieId: string, sourceTierId: string) => {
		if (sourceTierId === "pool") return;
		const src = tiers.find((t) => t.id === sourceTierId);
		if (src) src.movieIds = src.movieIds.filter((id) => id !== movieId);
		save();
		renderAll();
	};

	// ── Renderers ────────────────────────────────────────────
	const renderTierRow = (tier: TierEntry, idx: number): HTMLElement => {
		const row = document.createElement("div");
		row.className = "lmv-tierlist__row";

		// Label cell
		const labelCell = document.createElement("div");
		labelCell.className = "lmv-tierlist__label";
		labelCell.style.backgroundColor = tier.color;

		const labelText = document.createElement("span");
		labelText.className = "lmv-tierlist__label-text";
		labelText.textContent = tier.label;
		labelCell.appendChild(labelText);

		const editIcon = document.createElement("span");
		editIcon.className = "lmv-tierlist__label-edit-icon";
		setIcon(editIcon, "pencil");
		labelCell.appendChild(editIcon);

		labelCell.addEventListener("click", () =>
			showTierEditor(tier, labelCell, () => { save(); renderAll(); })
		);
		row.appendChild(labelCell);

		// Movies drop zone
		const moviesCell = document.createElement("div");
		moviesCell.className = "lmv-tierlist__movies";
		attachDropZone(moviesCell, (movieId, sourceTierId) =>
			onDropToTier(tier.id, movieId, sourceTierId)
		);
		tier.movieIds.forEach((id) => {
			const movie = movieMap.get(id);
			if (movie) moviesCell.appendChild(createItem(movie, tier.id, opts.onMovieClick));
		});
		row.appendChild(moviesCell);

		// Row controls
		const controls = document.createElement("div");
		controls.className = "lmv-tierlist__row-controls";

		if (idx > 0) {
			const upBtn = document.createElement("button");
			upBtn.className = "lmv-btn lmv-btn--icon-plain";
			upBtn.title = "Move up";
			setIcon(upBtn, "chevron-up");
			upBtn.addEventListener("click", () => {
				[tiers[idx - 1], tiers[idx]] = [tiers[idx], tiers[idx - 1]];
				save(); renderAll();
			});
			controls.appendChild(upBtn);
		}

		if (idx < tiers.length - 1) {
			const downBtn = document.createElement("button");
			downBtn.className = "lmv-btn lmv-btn--icon-plain";
			downBtn.title = "Move down";
			setIcon(downBtn, "chevron-down");
			downBtn.addEventListener("click", () => {
				[tiers[idx], tiers[idx + 1]] = [tiers[idx + 1], tiers[idx]];
				save(); renderAll();
			});
			controls.appendChild(downBtn);
		}

		const delBtn = document.createElement("button");
		delBtn.className = "lmv-btn lmv-btn--icon-plain";
		delBtn.title = "Delete tier (movies return to pool)";
		setIcon(delBtn, "trash-2");
		delBtn.addEventListener("click", () => {
			tiers = tiers.filter((t) => t.id !== tier.id);
			save(); renderAll();
		});
		controls.appendChild(delBtn);

		row.appendChild(controls);
		return row;
	};

	const renderAll = () => {
		tiersEl.innerHTML = "";
		tiers.forEach((tier, i) => tiersEl.appendChild(renderTierRow(tier, i)));

		poolEl.innerHTML = "";
		attachDropZone(poolEl, (movieId, sourceTierId) => onDropToPool(movieId, sourceTierId));

		const assigned = assignedIds();
		const pool = movies
			.filter((m) => !assigned.has(m.id))
			.sort((a, b) => a.title.localeCompare(b.title));

		const poolCount = document.querySelector(".lmv-tierlist__pool-count");
		if (poolCount) poolCount.textContent = `${pool.length} movies`;
		poolLabelEl.textContent = `Unranked (${pool.length})`;

		if (pool.length === 0) {
			const msg = document.createElement("p");
			msg.className = "lmv-tierlist__pool-empty";
			msg.textContent = "All movies ranked!";
			poolEl.appendChild(msg);
		} else {
			pool.forEach((movie) => poolEl.appendChild(createItem(movie, "pool", opts.onMovieClick)));
		}
	};

	renderAll();
}

function createItem(
	movie: Movie,
	sourceTierId: string,
	onClick: (m: Movie) => void
): HTMLElement {
	const item = document.createElement("div");
	item.className = "lmv-tierlist__item";
	item.draggable = true;
	item.title = movie.title;

	if (movie.cover) {
		const img = document.createElement("img");
		img.src = movie.cover;
		img.alt = movie.title;
		img.loading = "lazy";
		item.appendChild(img);
	} else {
		const fb = document.createElement("div");
		fb.className = "lmv-tierlist__item-fallback";
		fb.textContent = movie.title.slice(0, 2).toUpperCase();
		item.appendChild(fb);
	}

	item.addEventListener("dragstart", (e) => {
		e.dataTransfer!.setData("text/plain", JSON.stringify({ movieId: movie.id, sourceTierId }));
		e.dataTransfer!.effectAllowed = "move";
		setTimeout(() => item.classList.add("lmv-tierlist__item--dragging"), 0);
	});
	item.addEventListener("dragend", () => item.classList.remove("lmv-tierlist__item--dragging"));
	item.addEventListener("click", () => onClick(movie));

	return item;
}

function attachDropZone(
	el: HTMLElement,
	onDrop: (movieId: string, sourceTierId: string) => void
): void {
	el.addEventListener("dragover", (e) => {
		e.preventDefault();
		el.classList.add("lmv-tierlist__drop--active");
	});
	el.addEventListener("dragleave", (e) => {
		if (!el.contains(e.relatedTarget as Node))
			el.classList.remove("lmv-tierlist__drop--active");
	});
	el.addEventListener("drop", (e) => {
		e.preventDefault();
		el.classList.remove("lmv-tierlist__drop--active");
		try {
			const { movieId, sourceTierId } = JSON.parse(e.dataTransfer!.getData("text/plain"));
			onDrop(movieId, sourceTierId);
		} catch { /* ignore bad data */ }
	});
}

const PRESET_COLORS = [
	"#ff7f7f", "#ff4d4d", "#cc0000",
	"#ffbf7f", "#ff8c00", "#cc5500",
	"#ffef7f", "#ffd700", "#b8a000",
	"#bfff7f", "#80cc00", "#559900",
	"#7fffff", "#00bfbf", "#007a7a",
	"#7fbfff", "#1e90ff", "#0055cc",
	"#bf7fff", "#8844ee", "#550099",
	"#ff7fbf", "#ee44aa", "#aa0066",
	"#ffffff", "#aaaaaa", "#555555",
];

function showTierEditor(tier: TierEntry, _anchor: HTMLElement, onDone: () => void): void {
	// Remove any existing editor
	document.querySelectorAll(".lmv-tierlist__modal-overlay").forEach((el) => el.remove());

	// Full-screen overlay — appended to body so it's never clipped
	const overlay = document.createElement("div");
	overlay.className = "lmv-tierlist__modal-overlay";

	const modal = document.createElement("div");
	modal.className = "lmv-tierlist__modal";

	// ── Header ──
	const header = document.createElement("div");
	header.className = "lmv-tierlist__modal-header";
	const title = document.createElement("span");
	title.className = "lmv-tierlist__modal-title";
	title.textContent = "Edit tier";
	header.appendChild(title);
	modal.appendChild(header);

	// ── Name ──
	const nameLabel = document.createElement("span");
	nameLabel.className = "lmv-tierlist__editor-label";
	nameLabel.textContent = "Name";
	modal.appendChild(nameLabel);

	const labelInput = document.createElement("input");
	labelInput.type = "text";
	labelInput.value = tier.label;
	labelInput.className = "lmv-input lmv-tierlist__label-input";
	labelInput.maxLength = 12;
	labelInput.placeholder = "Tier name";
	modal.appendChild(labelInput);

	// ── Color ──
	const colorLabel = document.createElement("span");
	colorLabel.className = "lmv-tierlist__editor-label";
	colorLabel.textContent = "Color";
	modal.appendChild(colorLabel);

	const previewRow = document.createElement("div");
	previewRow.className = "lmv-tierlist__editor-preview-row";

	const preview = document.createElement("div");
	preview.className = "lmv-tierlist__color-preview";
	preview.style.backgroundColor = tier.color;
	previewRow.appendChild(preview);

	const hexInput = document.createElement("input");
	hexInput.type = "text";
	hexInput.value = tier.color;
	hexInput.className = "lmv-input lmv-tierlist__hex-input";
	hexInput.placeholder = "#rrggbb";
	hexInput.maxLength = 7;
	previewRow.appendChild(hexInput);

	// Native color picker hidden behind the icon button
	const nativePicker = document.createElement("input");
	nativePicker.type = "color";
	nativePicker.value = tier.color;
	nativePicker.className = "lmv-tierlist__native-picker";

	const pickerBtn = document.createElement("button");
	pickerBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost lmv-tierlist__picker-btn";
	pickerBtn.title = "Custom color";
	setIcon(pickerBtn, "pipette");
	pickerBtn.appendChild(nativePicker);
	previewRow.appendChild(pickerBtn);
	modal.appendChild(previewRow);

	let selectedColor = tier.color;
	const applyColor = (hex: string) => {
		selectedColor = hex;
		preview.style.backgroundColor = hex;
		hexInput.value = hex;
		nativePicker.value = hex;
		// Mark active swatch
		modal.querySelectorAll(".lmv-tierlist__swatch").forEach((s) =>
			s.classList.toggle("lmv-tierlist__swatch--active", (s as HTMLElement).dataset.hex === hex)
		);
	};

	hexInput.addEventListener("input", () => {
		const v = hexInput.value.trim();
		if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
	});
	nativePicker.addEventListener("input", () => applyColor(nativePicker.value));

	// Preset palette
	const palette = document.createElement("div");
	palette.className = "lmv-tierlist__palette";
	PRESET_COLORS.forEach((hex) => {
		const swatch = document.createElement("button");
		swatch.className = "lmv-tierlist__swatch";
		swatch.dataset.hex = hex;
		swatch.style.backgroundColor = hex;
		swatch.title = hex;
		if (hex === tier.color) swatch.classList.add("lmv-tierlist__swatch--active");
		swatch.addEventListener("click", (e) => {
			e.stopPropagation();
			applyColor(hex);
		});
		palette.appendChild(swatch);
	});
	modal.appendChild(palette);

	// ── Actions ──
	const actions = document.createElement("div");
	actions.className = "lmv-tierlist__editor-actions";

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	cancelBtn.textContent = "Cancel";
	cancelBtn.addEventListener("click", () => overlay.remove());
	actions.appendChild(cancelBtn);

	const okBtn = document.createElement("button");
	okBtn.className = "lmv-btn lmv-btn--sm lmv-btn--primary";
	okBtn.textContent = "Apply";
	okBtn.addEventListener("click", () => {
		tier.label = labelInput.value.trim() || tier.label;
		tier.color = selectedColor;
		overlay.remove();
		onDone();
	});
	actions.appendChild(okBtn);
	modal.appendChild(actions);

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	// Close on overlay click (outside modal)
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.remove();
	});

	labelInput.focus();
	labelInput.select();
}

async function exportTierList(tiers: TierEntry[], movieMap: Map<string, Movie>): Promise<void> {
	const LABEL_W = 90;
	const ITEM_W = 66;
	const ITEM_H = 99; // ~2:3 ratio
	const GAP = 3;
	const PAD = 6;
	const ROW_H = ITEM_H + PAD * 2;
	const MIN_W = 900;

	const maxItems = Math.max(...tiers.map((t) => t.movieIds.length), 1);
	const canvasW = Math.max(MIN_W, LABEL_W + maxItems * (ITEM_W + GAP) + PAD * 2);
	const canvasH = tiers.length * ROW_H;

	const canvas = document.createElement("canvas");
	canvas.width = canvasW;
	canvas.height = canvasH;
	const ctx = canvas.getContext("2d")!;

	// Background
	ctx.fillStyle = "#1a1a2e";
	ctx.fillRect(0, 0, canvasW, canvasH);

	// Load images via fetch (avoids CORS issues in Electron)
	const imgCache = new Map<string, HTMLImageElement>();
	const allIds = [...new Set(tiers.flatMap((t) => t.movieIds))];

	await Promise.allSettled(
		allIds.map(async (id) => {
			const movie = movieMap.get(id);
			if (!movie?.cover) return;
			try {
				const res = await fetch(movie.cover);
				const blob = await res.blob();
				const objectUrl = URL.createObjectURL(blob);
				await new Promise<void>((resolve) => {
					const img = new Image();
					img.onload = () => { imgCache.set(id, img); URL.revokeObjectURL(objectUrl); resolve(); };
					img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
					img.src = objectUrl;
				});
			} catch { /* fall back to text */ }
		})
	);

	// Draw each tier row
	tiers.forEach((tier, rowIdx) => {
		const y = rowIdx * ROW_H;

		// Row background
		ctx.fillStyle = "#0f172a";
		ctx.fillRect(LABEL_W, y, canvasW - LABEL_W, ROW_H);

		// Label background
		ctx.fillStyle = tier.color;
		ctx.fillRect(0, y, LABEL_W, ROW_H);

		// Label text (auto-size)
		const fontSize = tier.label.length > 6 ? 14 : tier.label.length > 3 ? 18 : 24;
		ctx.fillStyle = "#000000";
		ctx.font = `bold ${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tier.label, LABEL_W / 2, y + ROW_H / 2, LABEL_W - 8);

		// Movie posters
		tier.movieIds.forEach((id, i) => {
			const x = LABEL_W + PAD + i * (ITEM_W + GAP);
			const imgY = y + PAD;
			const img = imgCache.get(id);

			if (img) {
				ctx.drawImage(img, x, imgY, ITEM_W, ITEM_H);
			} else {
				const movie = movieMap.get(id);
				ctx.fillStyle = "#2d2d4e";
				ctx.fillRect(x, imgY, ITEM_W, ITEM_H);
				if (movie) {
					ctx.fillStyle = "#aaaacc";
					ctx.font = "bold 11px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					// Wrap title up to 2 lines
					const words = movie.title.split(" ");
					const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
					const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
					ctx.fillText(line1, x + ITEM_W / 2, imgY + ITEM_H / 2 - 8, ITEM_W - 4);
					if (line2) ctx.fillText(line2, x + ITEM_W / 2, imgY + ITEM_H / 2 + 8, ITEM_W - 4);
				}
			}
		});

		// Row separator
		ctx.strokeStyle = "#334155";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, y + ROW_H - 0.5);
		ctx.lineTo(canvasW, y + ROW_H - 0.5);
		ctx.stroke();
	});

	// Vertical separator label/content
	ctx.strokeStyle = "#334155";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(LABEL_W - 1, 0);
	ctx.lineTo(LABEL_W - 1, canvasH);
	ctx.stroke();

	// Download as PNG
	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "movie-tierlist.png";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}, "image/png");
}
