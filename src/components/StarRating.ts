// Interactive star rating: 5 stars representing a 1–10 scale (0.5-step increments).
// Each star = 2 points. Half-star = 1 point (e.g. 9.5 → 4 full + 1 half).
// Pass readonly=true to display without interaction.

export interface StarRatingOptions {
	value?: number; // 1–10, supports 0.5 steps (e.g. 9.5, 8.5)
	readonly?: boolean;
	size?: "sm" | "md" | "lg";
	onChange?: (value: number) => void;
}

export function createStarRating(opts: StarRatingOptions): HTMLElement {
	const { readonly = false, size = "md", onChange } = opts;
	let currentValue = opts.value;

	const container = document.createElement("div");
	container.className = `lmv-stars lmv-stars--${size}${readonly ? " lmv-stars--readonly" : ""}`;

	const STARS = 10;

	const getStarClass = (pos: number, displayVal: number | undefined): string => {
		const v = displayVal ?? 0;
		const full = Math.floor(v);
		const halfPos = Math.ceil(v); // position of half-star (if any)
		if (pos <= full) return "lmv-star lmv-star--filled";
		if (pos === halfPos && halfPos > full) return "lmv-star lmv-star--half";
		return "lmv-star";
	};

	const updateDisplay = (displayVal?: number) => {
		container.querySelectorAll(".lmv-star").forEach((s, idx) => {
			(s as HTMLElement).className = getStarClass(idx + 1, displayVal);
		});
	};

	const updateLabel = (v: number) => {
		let label = container.querySelector(".lmv-stars__label");
		if (!label) {
			label = document.createElement("span");
			label.className = "lmv-stars__label";
			container.appendChild(label);
		}
		label.textContent = `${v}/10`;
	};

	for (let i = 1; i <= STARS; i++) {
		const star = document.createElement("span");
		star.className = getStarClass(i, currentValue);
		star.textContent = "★";

		if (!readonly) {
			// Left half → i - 0.5 (min 1): 1, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5
			const leftZone = document.createElement("span");
			leftZone.className = "lmv-star__zone lmv-star__zone--left";
			leftZone.addEventListener("mouseenter", () => updateDisplay(Math.max(1, i - 0.5)));
			leftZone.addEventListener("click", (e) => {
				e.stopPropagation();
				const v = Math.max(1, i - 0.5);
				currentValue = v;
				onChange?.(v);
				updateDisplay(v);
				star.animate(
					[{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
					{ duration: 250, easing: "ease-out" }
				);
				updateLabel(v);
			});

			// Right half → i: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
			const rightZone = document.createElement("span");
			rightZone.className = "lmv-star__zone lmv-star__zone--right";
			rightZone.addEventListener("mouseenter", () => updateDisplay(i));
			rightZone.addEventListener("click", (e) => {
				e.stopPropagation();
				const v = i;
				currentValue = v;
				onChange?.(v);
				updateDisplay(v);
				star.animate(
					[{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }],
					{ duration: 300, easing: "ease-out" }
				);
				updateLabel(v);
			});

			star.appendChild(leftZone);
			star.appendChild(rightZone);
		}

		container.appendChild(star);
	}

	if (!readonly) {
		container.addEventListener("mouseleave", () => updateDisplay(currentValue));
	}

	if (currentValue != null) {
		const label = document.createElement("span");
		label.className = "lmv-stars__label";
		label.textContent = `${currentValue}/10`;
		container.appendChild(label);
	}

	return container;
}
