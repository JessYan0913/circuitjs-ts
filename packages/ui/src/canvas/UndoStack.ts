import type { CircuitComponent } from '@circuitjs/core';

const MAX_UNDO = 32;

interface UndoEntry {
  ids: number[];
  dumps: string[];
}

export class UndoStack {
  private stack: UndoEntry[] = [];
  private index = -1;

  /** Save a snapshot of the current component state */
  snapshot(components: CircuitComponent[]): void {
    // Remove any redo entries beyond current index
    this.stack.length = this.index + 1;

    const entry: UndoEntry = {
      ids: components.map((c) => c.id),
      dumps: components.map((c) => c.dump()),
    };
    this.stack.push(entry);

    if (this.stack.length > MAX_UNDO) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  /** Can undo */
  canUndo(): boolean {
    return this.index > 0;
  }

  /** Can redo */
  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  /** Undo: restore previous snapshot, returns the snapshot to restore to, or null */
  undo(): UndoEntry | null {
    if (!this.canUndo()) return null;
    this.index--;
    return this.stack[this.index];
  }

  /** Redo: restore next snapshot */
  redo(): UndoEntry | null {
    if (!this.canRedo()) return null;
    this.index++;
    return this.stack[this.index];
  }

  /** Get current snapshot entry (the state we're at) */
  current(): UndoEntry | null {
    if (this.index < 0 || this.index >= this.stack.length) return null;
    return this.stack[this.index];
  }

  /** Clear all undo history */
  clear(): void {
    this.stack = [];
    this.index = -1;
  }
}
