import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import 'doodle.css/doodle.css';
import * as internal from 'stream';

// Give your view a unique type
const VIEW_TYPE_CUSTOM = 'custom-html-view';

export default class OutlinerPlugin extends Plugin {
  async onload() {
    console.log('Loading My Custom Plugin');
    // Register a new view type
    this.registerView(
      VIEW_TYPE_CUSTOM,
      (leaf: WorkspaceLeaf) => new OutlinerView(leaf)
    );
    // Add a ribbon icon to open it
    this.addRibbonIcon('dice', 'Open Custom View', () => {
      this.activateView();
    });
  }

  onunload() {
    console.log('Unloading My Custom Plugin');
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CUSTOM);
  }

  async activateView() {
    // Detach existing, then open a new leaf
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CUSTOM);
    const rightleaf = this.app.workspace.getRightLeaf(false)
    if (rightleaf != null) {
      rightleaf.setViewState({
        type: VIEW_TYPE_CUSTOM,
        active: true,
      });
    }
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_CUSTOM)[0]
    );
  }
}

class Chunk {
  story: Story
  parent: Chunk | null
  children: Array<Chunk>
  text: string
  x: number
  y: number
  btn: HTMLButtonElement
  edit: HTMLTextAreaElement

  constructor(story: Story,
    text: string = "And then...",
    parent: Chunk | null = null,
    pos: [number, number] | null = null,
    children: Array<Chunk> = []) {
    this.story = story
    this.story.chunks.push(this)
    this.text = text
    this.parent = parent
    this.children = children
    if (this.parent != null) {
      this.parent.children.push(this)
    }
    var x = 0, y = 0
    if (pos == null) {
      if (parent == null) {
        x = 1
        y = 1
      } else {
        y = parent.y + 1
        var maxx = parent.x - 1
        for (const sibling of parent.children) {
          if (maxx < sibling.x) {
            maxx = sibling.x
          }
        }
        x = maxx + 1
      }
    }
    this.createEditableBtn()
    this.reposition(x, y)
  }
  shift(incx: number, incy: number) {
    const nx = this.x + incx
    const ny = this.y + incy
    this.reposition(nx, ny)
    for (const c of this.children) {
      c.shift(incx, incy)
    }
  }
  reposition(x: number, y: number) {
    if (this.x == x && this.y == y) {
      this.story.coords.get(y)?.delete(x)
    }
    this.x = x
    this.y = y
    if (!this.story.coords.has(this.y)) this.story.coords.set(this.y, new Map());
    this.story.coords.get(this.y)!.set(this.x, this);
    this.btn.style.gridRow = String(this.y);
    this.btn.style.gridColumn = String(this.x);
    this.edit.style.gridRow = String(this.y);
    this.edit.style.gridColumn = String(this.x);
    this.story.drawCurves()
  }
  createEditableBtn() {
    this.btn = this.story.grid.createEl("button");
    this.btn.setText(this.text)

    this.btn.addEventListener('click', () => {
      this.startEdit()
    });

    this.btn.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          new Chunk(this.story, "And then...", this)
        } else {
          event.preventDefault(); // Prevent form submission or newline
          this.startEdit()
        }
      }
      if (event.key === 'Backspace') {
      }
      if (event.key === 'ArrowUp') {
        if (event.shiftKey) {
          this.shift(0, -1)
        } else {
          this.parent?.doneEdit()
        }
      }
      if (event.key === 'ArrowDown') {
        if (event.shiftKey) {
          this.shift(0, 1)
        } else {
          this.children.first()?.doneEdit()
        }
      }
      if (event.key === 'ArrowLeft') {
        if (event.shiftKey) {
          this.shift(-1, 0)
        } else {
          const x = Math.max([...this.story.coords.get(this.y).keys()].filter(x => x < this.x))
          this.story.coords.get(this.y)?.get(x)?.doneEdit()
        }
      }
      if (event.key === 'ArrowRight') {
        if (event.shiftKey) {
          this.shift(1, 0)
        } else {
          const x = Math.min([...this.story.coords.get(this.y).keys()].filter(x => x > this.x))
          this.story.coords.get(this.y)?.get(x)?.doneEdit()
        }

      }
    });

    this.edit = this.story.grid.createEl("textarea")
    this.edit.value = this.text

    this.edit.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission or newline
        this.doneEdit()
      }
      if (event.key === 'ArrowUp') {
        this.doneEdit()
      }
      if (event.key === 'ArrowDown') {
        this.doneEdit()
      }
    });
    this.doneEdit()
  }
  startEdit() {
    const buttonHeight = this.btn.offsetHeight;
    this.edit.style.height = `${buttonHeight}px`;
    this.edit.value = this.text
    this.btn.hide()
    this.edit.show()
    this.edit.focus()
    this.edit.select()
  }
  doneEdit() {
    if (this.edit.value == "") {
      this.text = this.edit.placeholder
    } else {
      this.text = this.edit.value
    }
    this.edit.hide()
    this.btn.setText(this.text)
    this.btn.show()
    this.btn.focus()
  }
}

class Story {
  grid: HTMLDivElement
  chunks: Array<Chunk>
  coords: Map<number, Map<number, Chunk>>
  svg: SVGElement
  constructor(container: Element, svg: SVGElement) {
    this.grid = container.createDiv({ cls: "grid" })
    this.svg = svg
    this.chunks = []
    this.coords = new Map()
    const first = new Chunk(this, "Once upon a time...")
    first.doneEdit()
  }
  drawCurves() {
    this.svg.innerHTML = "";
    for (const chunk of this.chunks) {
      if (chunk.children.length > 0) {
        for (const child of chunk.children) {
          this.drawCurveBetween(chunk.btn, child.btn)
        }
      }
    }
  }
  drawCurveBetween(b1: HTMLButtonElement, b2: HTMLButtonElement) {
    requestAnimationFrame(() => {
      
      const r1 = b1.getBoundingClientRect();
      const r2 = b2.getBoundingClientRect();
      const canvasRect = this.svg.getBoundingClientRect();

      const x1 = r1.left + (r1.width / 2) - canvasRect.left;
      const y1 = r1.top + (r1.height / 2) - canvasRect.top;
      const x2 = r2.left + (r2.width / 2) - canvasRect.left;
      const y2 = r2.top + (r2.height / 2) - canvasRect.top;
      const dx = Math.abs(x2 - x1) / 2;
      console.log(`M ${x1},${y1} C ${x1},${y1 + dx} ${x2},${y2 - dx} ${x2},${y2}`)
      const path = this.svg.createSvg("path");
      path.setAttribute("d", `M ${x1},${y1} C ${x2},${y1} ${x1},${y2} ${x2},${y2}`);
      path.setAttribute("stroke", "red");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", "2");
    });
  }
}

// Define the View that renders HTML + JS
class OutlinerView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }
  getViewType() {
    return VIEW_TYPE_CUSTOM;
  }
  getDisplayText() {
    return 'Outliner View';
  }
  async onOpen() {
    // Clear any old contents
    this.contentEl.empty();

    this.contentEl.createEl('h2', { text: '🕸️ Outliner' });
    const storyContainer = this.contentEl.createEl('div', {
      attr: { id: 'story-container' }
    });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    storyContainer.appendChild(svg);
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.zIndex = "-1";
    svg.style.pointerEvents = "none"; // allow clicks to go through    
    const story = new Story(storyContainer, svg)
  }

  async onClose() {
    // Clean up if needed
  }
}
