import { App, ItemView, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CanvasEdgeData, CanvasTextData } from "obsidian/canvas";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	isActiveCanvas(){
		const active = this.app.workspace.getActiveFile()
		if (active) {
			if (active.extension == 'canvas'){
				return true
			}
		}
		return false
	}

	getCanvas(){
		return this.app.workspace.getActiveFileView().canvas
	}

	genRandomIdForMap(mmap: Map<string, object>){
		let r = (Math.random() + 1).toString(16).substring(2)
		while (mmap.has(r)){
			r = (Math.random() + 1).toString(16).substring(2)	
		}
		return r
	}

	random(e: number){
		let t = [];
		for (let n = 0; n < e; n++) {
			t.push((16 * Math.random() | 0).toString(16));
		}
		return t.join("");
	};

	addEdge(canvas: any, node1: any, side1: string, node2: any, side2: string){
		const allEdgesData: CanvasEdgeData[] = [];
		const edgeData: CanvasEdgeData = {
			id: this.random(16),
			fromSide: 'bottom',
			fromNode: node1.id,
			toSide: 'top',
			toNode: node2.id
		};
		const currentData = canvas.getData();
		currentData.edges = [
			...currentData.edges,
			edgeData,
		];

		canvas.setData(currentData);
		canvas.requestSave();
	}

	addCardBelow(canvas: any){
		const buf=20
		if (canvas.selection.size!=1){
			console.log("must select one node")
			return false
		}
		const selected = canvas.selection.values().next().value
		if (canvas.edgeFrom.data.has(selected)){
			const below = [...canvas.edgeFrom.get(selected).values()].filter(e=>e.from.side=='bottom')
			if (below.length > 0){
				canvas.deselectAll()
				below[0].to.node.focus()
				return
			}
		}
		const nx = selected.x
		const ny = selected.y+selected.height+buf
		let newnode = canvas.createTextNode({pos:{x: nx, y:ny}, text:"And then..."})
		this.addEdge(canvas, selected, 'bottom', newnode, 'top')
	}
	addCardAbove(canvas: any){
		const buf=20
		if (canvas.selection.size!=1){
			console.log("must select one node")
			return false
		}
		const selected = canvas.selection.values().next().value
		const below = [...canvas.edges.values()].filter(e=>((e.to.node==selected && e.to.side=='top') || (e.to.node==selected && e.to.side=='top')))
		if (below.length > 0){
				canvas.deselectAll()
				if (below[0].to==selected){
					console.log(below[0].from.node)
					canvas.select(below[0].from.node)
				} else {
					console.log(below[0].to.node)
					canvas.select(below[0].to.node)
				}
				// canvas.deselectAll()
				// below[0].to.node.focus()
				return
		}
		const nx = selected.x
		const ny = selected.y-selected.height-buf
		let newnode = canvas.createTextNode({pos:{x: nx, y:ny}, text:"And then..."})
		this.addEdge(canvas, selected, 'top', newnode, 'bottom')
	}
	addCardRight(canvas: any){
		const buf=20
		if (canvas.selection.size!=1){
			console.log("must select one node")
			return false
		}
		const selected = canvas.selection.values().next().value
		if (canvas.edgeFrom.data.has(selected)){
			const below = [...canvas.edgeFrom.get(selected).values()].filter(e=>e.from.side=='right')
			if (below.length > 0){
				canvas.deselectAll()
				below[0].to.node.focus()
				return
			}
		}
		const nx = selected.x+selected.width+buf
		const ny = selected.y
		let newnode = canvas.createTextNode({pos:{x: nx, y:ny}, text:"And then..."})
		this.addEdge(canvas, selected, 'right', newnode, 'left')
	}
	addCardLeft(canvas: any){
		const buf=20
		if (canvas.selection.size!=1){
			console.log("must select one node")
			return false
		}
		const selected = canvas.selection.values().next().value
		if (canvas.edgeFrom.data.has(selected)){
			const below = [...canvas.edgeFrom.get(selected).values()].filter(e=>e.from.side=='left')
			if (below.length > 0){
				canvas.deselectAll()
				below[0].to.node.focus()
				return
			}
		}
		const nx = selected.x-selected.width-buf
		const ny = selected.y
		let newnode = canvas.createTextNode({pos:{x: nx, y:ny}, text:"And then..."})
		this.addEdge(canvas, selected, 'left', newnode, 'right')
	}

	async onload() {

		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		this.addCommand({
			id: 'add_card_below',
			name: 'Add Card Below',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					const canvas = canvasView.canvas;
					if (!checking) {
						this.addCardBelow(canvas)
					}
					return true;
				}
				return false;
			}
		});
		this.addCommand({
			id: 'add_card_Left',
			name: 'Add Card Left',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					const canvas = canvasView.canvas;
					if (!checking) {
						this.addCardLeft(canvas)
					}
					return true;
				}
				return false;
			}
		});
		this.addCommand({
			id: 'add_card_Above',
			name: 'Add Card Above',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					const canvas = canvasView.canvas;
					if (!checking) {
						this.addCardAbove(canvas)
					}
					return true;
				}
				return false;
			}
		});
		this.addCommand({
			id: 'add_card_Right',
			name: 'Add Card Right',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					const canvas = canvasView.canvas;
					if (!checking) {
						this.addCardRight(canvas)
					}
					return true;
				}
				return false;
			}
		});						

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});


		this.addRibbonIcon('dice', 'Greet', () => {
			new Notice('Hello, world!');
		  });
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
