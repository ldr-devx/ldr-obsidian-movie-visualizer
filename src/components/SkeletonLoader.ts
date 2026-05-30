export function createSkeletonCard(): HTMLElement {
	const card = document.createElement("div");
	card.className = "lmv-card lmv-skeleton";
	card.innerHTML = `
		<div class="lmv-card__poster lmv-skeleton__poster"></div>
		<div class="lmv-card__body">
			<div class="lmv-skeleton__line lmv-skeleton__line--title"></div>
			<div class="lmv-skeleton__line lmv-skeleton__line--sub"></div>
			<div class="lmv-skeleton__line lmv-skeleton__line--short"></div>
		</div>
	`;
	return card;
}

export function createSkeletonGrid(count = 12): HTMLElement {
	const grid = document.createElement("div");
	grid.className = "lmv-grid";
	for (let i = 0; i < count; i++) {
		const card = createSkeletonCard();
		card.style.animationDelay = `${i * 50}ms`;
		grid.appendChild(card);
	}
	return grid;
}
