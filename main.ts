import { Plugin, WorkspaceLeaf } from "obsidian";
import { MovieVisualizerView, MOVIE_VIEW_TYPE } from "./src/MovieVisualizerView";

export default class MovieVisualizerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(MOVIE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MovieVisualizerView(leaf));

		this.addRibbonIcon("clapperboard", "Movie Visualizer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-movie-visualizer",
			name: "Open Movie Visualizer",
			callback: () => this.activateView(),
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(MOVIE_VIEW_TYPE);
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(MOVIE_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: MOVIE_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}
}
