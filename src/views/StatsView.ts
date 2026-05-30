import { setIcon } from "obsidian";
import { MovieDataService } from "../services/MovieDataService";
import { StatsEngine } from "../services/StatsEngine";

const engine = new StatsEngine();

export function renderStats(container: HTMLElement, service: MovieDataService): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--stats";

	const stats = service.getStats();

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Stats";
	container.appendChild(h1);

	if (stats.total === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-empty__icon";
		setIcon(iconEl, "bar-chart-2");
		const emptyP = document.createElement("p");
		emptyP.textContent = "No data yet.";
		empty.appendChild(iconEl);
		empty.appendChild(emptyP);
		container.appendChild(empty);
		return;
	}

	// Summary cards
	const summary = document.createElement("div");
	summary.className = "lmv-stats-summary";
	const summaryItems = [
		{ icon: "clapperboard", value: stats.total, label: "Total movies" },
		{ icon: "check-circle", value: stats.watched, label: "Watched" },
		{ icon: "eye", value: stats.unwatched, label: "Unwatched" },
		{ icon: "heart", value: stats.favorites, label: "Favorites" },
		{ icon: "star", value: stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—", label: "Avg rating" },
		{ icon: "tv", value: stats.avgImdb > 0 ? stats.avgImdb.toFixed(2) : "—", label: "Avg IMDb" },
		{ icon: "clock", value: engine.formatRuntime(stats.totalRuntime), label: "Total time" },
		{ icon: "users", value: stats.directors, label: "Directors" },
	];
	summaryItems.forEach(({ icon, value, label }) => {
		const item = document.createElement("div");
		item.className = "lmv-stats-card";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-stats-card__icon";
		setIcon(iconEl, icon);
		const valueEl = document.createElement("span");
		valueEl.className = "lmv-stats-card__value";
		valueEl.textContent = String(value);
		const labelEl = document.createElement("span");
		labelEl.className = "lmv-stats-card__label";
		labelEl.textContent = label;
		item.appendChild(iconEl);
		item.appendChild(valueEl);
		item.appendChild(labelEl);
		summary.appendChild(item);
	});
	container.appendChild(summary);

	const chartsGrid = document.createElement("div");
	chartsGrid.className = "lmv-charts-grid";

	// Genres bar chart
	const genreEntries = Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).slice(0, 10);
	if (genreEntries.length > 0) {
		chartsGrid.appendChild(buildBarChart("Movies by genre", genreEntries));
	}

	// Rating distribution
	const ratingEntries = Object.entries(stats.ratingDist)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([k, v]) => [`${k}/10`, v] as [string, number]);
	if (ratingEntries.length > 0) {
		chartsGrid.appendChild(buildBarChart("My rating distribution", ratingEntries));
	}

	// By year
	const yearEntries = Object.entries(stats.byYear)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([k, v]) => [k, v] as [string, number]);
	if (yearEntries.length > 0) {
		chartsGrid.appendChild(buildTimeline("Movies by year", yearEntries));
	}

	// Top directors
	if (stats.topDirectors.length > 0) {
		const entries = stats.topDirectors.map((d) => [d.name.split(" ").slice(-1)[0], d.count] as [string, number]);
		chartsGrid.appendChild(buildBarChart("Top directors", entries));
	}

	container.appendChild(chartsGrid);
}

function buildBarChart(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-chart";

	const h = document.createElement("h3");
	h.className = "lmv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));

	const bars = document.createElement("div");
	bars.className = "lmv-chart__bars";

	entries.forEach(([label, value]) => {
		const row = document.createElement("div");
		row.className = "lmv-chart__row";

		const labelEl = document.createElement("span");
		labelEl.className = "lmv-chart__label";
		labelEl.textContent = label;
		labelEl.title = label;

		const barWrap = document.createElement("div");
		barWrap.className = "lmv-chart__bar-wrap";

		const bar = document.createElement("div");
		bar.className = "lmv-chart__bar";
		const pct = max > 0 ? (value / max) * 100 : 0;
		bar.style.width = "0%";
		setTimeout(() => { bar.style.width = `${pct}%`; }, 50);

		const valEl = document.createElement("span");
		valEl.className = "lmv-chart__value";
		valEl.textContent = String(value);

		barWrap.appendChild(bar);
		row.appendChild(labelEl);
		row.appendChild(barWrap);
		row.appendChild(valEl);
		bars.appendChild(row);
	});

	section.appendChild(bars);
	return section;
}

function buildTimeline(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-chart lmv-chart--timeline";

	const h = document.createElement("h3");
	h.className = "lmv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));

	// SVG sparkline
	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("viewBox", `0 0 ${entries.length * 20} 60`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.className = "lmv-sparkline";

	if (entries.length > 1) {
		const points = entries.map((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			return `${x},${y}`;
		});

		const polyline = document.createElementNS(svgNS, "polyline");
		polyline.setAttribute("points", points.join(" "));
		polyline.setAttribute("fill", "none");
		polyline.setAttribute("stroke", "var(--interactive-accent)");
		polyline.setAttribute("stroke-width", "2");
		polyline.setAttribute("stroke-linecap", "round");
		polyline.setAttribute("stroke-linejoin", "round");
		svg.appendChild(polyline);

		entries.forEach((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			const circle = document.createElementNS(svgNS, "circle");
			circle.setAttribute("cx", String(x));
			circle.setAttribute("cy", String(y));
			circle.setAttribute("r", "3");
			circle.setAttribute("fill", "var(--interactive-accent)");
			const title = document.createElementNS(svgNS, "title");
			title.textContent = `${e[0]}: ${e[1]}`;
			circle.appendChild(title);
			svg.appendChild(circle);
		});
	}

	section.appendChild(svg);

	// X-axis labels (sparse)
	const xLabels = document.createElement("div");
	xLabels.className = "lmv-sparkline__labels";
	const step = Math.max(1, Math.floor(entries.length / 8));
	entries.forEach((e, i) => {
		if (i % step === 0 || i === entries.length - 1) {
			const label = document.createElement("span");
			label.textContent = e[0];
			xLabels.appendChild(label);
		}
	});
	section.appendChild(xLabels);

	return section;
}
