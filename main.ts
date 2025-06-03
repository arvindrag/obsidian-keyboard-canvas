import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import 'doodle.css/doodle.css';

// Give your view a unique type
const VIEW_TYPE_CUSTOM = 'custom-html-view';
class Plot{
  vis: boolean
  parent: StoryChunk|null
  chunks: Array<StoryChunk>
  story: Story
  add: HTMLButtonElement
  constructor(story: Story, parent: StoryChunk|null=null){
    this.chunks = []
    this.parent = parent
    this.story = story
    this.vis = true
  }
  hide() {
    this.vis = false
    this.story.rerender()
  }
  show() {
    this.vis = true
    this.story.rerender()
  }  
  addStoryChunk(storychunk: StoryChunk){
    this.chunks.push(storychunk)
    this.story.rerender()
  }  
  addStoryChunkAfter(storychunk: StoryChunk, after: StoryChunk){
    const index = this.chunks.indexOf(after);
    if (index !== -1) {
      this.chunks.splice(index + 1, 0, storychunk);
    }
    this.story.rerender()
  }
  getPrevChunk(chunk: StoryChunk){
    const index = this.chunks.indexOf(chunk);
    if (index>0){
      return this.chunks[index-1]
    }
    if (this.parent !== null){
      return this.parent
    }
    return chunk
  }
  getNextChunk(chunk: StoryChunk){
    const index = this.chunks.indexOf(chunk);
    if (index !== -1 && index < this.chunks.length - 1) {
      return this.chunks[index + 1];
    }
    return this.add
  }
  getFirstChunk(){
    if (this.chunks.length < 1) {
      return this.parent
    }  
    return this.chunks[0]
  }
  getLastChunk(){
    return this.chunks[this.chunks.length-1]
  }  
  render(container: Element){
    if(!this.vis){
      return
    }
    const plotDiv = container.createDiv({cls: 'vertical-stack'})
    for (const chunk of this.chunks) {
      const vdiv = plotDiv.createDiv({cls: 'vertical-stack'})
      if(chunk.subplot !== null){
        const vhdiv = vdiv.createDiv({cls: 'horizontal-stack'})
        const chunkdiv = vhdiv.createDiv({cls: 'vertical-stack'})
        chunk.render(chunkdiv)
        // vhdiv.createDiv({cls: 'padder'})
        const plotdiv = vhdiv.createDiv({cls: 'vertical-stack'})
        chunk.subplot.render(plotdiv)
      } else {
        chunk.render(vdiv)
      }
      vdiv.createDiv({cls: 'padder'})
    }
    this.add = plotDiv.createEl("button", {text: "+"})
    this.add.addEventListener('click', () => {
      const newchunk = new StoryChunk(this)
      this.addStoryChunk(newchunk)
      newchunk.startEdit()
    });
    this.add.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const newchunk = new StoryChunk(this)
        this.addStoryChunk(newchunk)
        newchunk.startEdit()
      }
      if (event.key === 'ArrowUp') {
        this.getLastChunk().focus()
      }
      if (event.key === 'ArrowDown') {
        if (this.parent!==null){
          this.parent.plot.getNextChunk(this.parent).focus()
        }
      }      
    })
  }
}
class Story{
  container: Element
  plot: Plot
  parent: StoryChunk
  constructor(container: Element){
    this.container = container
    this.plot = new Plot(this)
    this.rerender()
  }

  rerender(){
    this.container.empty()
    const all = this.container.createDiv({cls: 'horizontal-stack'})
    this.plot.render(all)
  }
}

class StoryChunk {
  plot: Plot
  subplot: Plot | null
  text: string
  div: HTMLDivElement
  btn: HTMLButtonElement
  edit: HTMLInputElement
  constructor(plot: Plot, text: string = "") {
    this.plot = plot
    this.text = text
    this.subplot = null
  }
  render(container: HTMLDivElement){
    this.div = container.createEl('div', {cls: 'horizontal-stack'});
    this.btn = this.div.createEl('button', { text: this.text });
    this.edit = this.div.createEl('input', { value: this.text, placeholder: "And then..." });
    this.btn.addEventListener('click', () => {
      this.startEdit()
    });
    this.btn.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (event.shiftKey){
          const newchunk = new StoryChunk(this.plot)
          this.plot.addStoryChunkAfter(newchunk, this)
          newchunk.startEdit()
        } else{
          event.preventDefault(); // Prevent form submission or newline
          this.startEdit()  
        }
      }
      if (event.key === 'ArrowUp') {
        this.plot.getPrevChunk(this).focus()
      }
      if (event.key === 'ArrowDown') {
        this.plot.getNextChunk(this).focus()
      }
      if (event.key === 'ArrowLeft') {
        if(this.plot.parent !== null){
          this.plot.hide()
          this.plot.parent.focus()
        }
      }
      if (event.key === 'ArrowRight') {
        if (event.shiftKey) {
          if(this.subplot === null){
            this.subplot = new Plot(this.plot.story, this)
          }
          const newchunk = new StoryChunk(this.subplot)
          this.subplot.addStoryChunk(newchunk)
          newchunk.startEdit()
        } else {
          if(this.subplot === null){
            this.focus()
          } else{
            this.subplot.show()
            this.subplot.getFirstChunk().focus()
          }
        }
      }      
    });

    this.edit.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission or newline
        this.doneEdit()
      }
    });
    this.focus()
    return this.div
  }
  startEdit(){
    this.btn.hide()
    this.edit.value = this.text
    this.edit.show()
    this.edit.focus()
    this.edit.select()
  }
  doneEdit(){
    if(this.edit.value == ""){
      this.text = this.edit.placeholder
    } else {
      this.text = this.edit.value
    }
    this.edit.hide()
    this.btn.setText(this.text)
    this.btn.show()
    this.btn.focus()
  }
  focus(){
    if(this.btn.hidden){
      this.startEdit()
    } else{
      this.doneEdit()
    }
  }  
}

export default class MyPlugin extends Plugin {
  async onload() {
    console.log('Loading My Custom Plugin');

    // Register a new view type
    this.registerView(
      VIEW_TYPE_CUSTOM,
      (leaf: WorkspaceLeaf) => new CustomView(leaf)
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
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_CUSTOM,
      active: true,
    });
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_CUSTOM)[0]
    );
  }
}

// Define the View that renders HTML + JS
class CustomView extends ItemView {
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

    // Inject your HTML
    const style = document.createElement('style');
    style.textContent = `
      .vertical-stack {
        display: flex;
        flex-direction: column;
        gap: 0px;         /* spacing between items */
        padding: 0px;      /* optional padding */
        align-items: flex-start; /* prevent stretching */
      }
      .horizontal-stack {
        display: flex;
        flex-direction: row;
        gap: 0px;         /* spacing between items */
        padding: 0px;      /* optional padding */
        align-items: flex-start; /* prevent stretching */
      }
      
      .padder {
        width: 10px;
        height: 10px;
      }
      .line {
        width: 2px;
        background: black;
      }
      .button-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
    this.contentEl.createEl('h2', { text: '🕸️ Outliner' });
    const container = this.contentEl.createEl('div', {
      attr: { id: 'my-container' }
    });
    container.classList.add("button-wrapper")
    
    const story = new Story(container)

    // container.appendChild(s.container)


    // const input = container.createEl('input');
    // input.placeholder = 'And then...';
    // input.addClass('input-box');

    // input.addEventListener('keydown', (event: KeyboardEvent) => {
    //   if (event.key === 'Enter') {
    //     event.preventDefault(); // Prevent form submission or newline
    //     this.createThing(container, input)
    //     input.value = '';
    //   }
    //   if (event.key === 'ArrowUp') {
    //     event.preventDefault(); // Prevent form submission or newline
    //     this.focusPrevFocusable(input)
    //     // input.hide()
    //   }
    //   // console.log(event.key)
    // });


    // If you have more complex JS, you can dynamically load it.
    // e.g. append a <script> tag that points to your bundled code.
  }

  async onClose() {
    // Clean up if needed
  }
}
