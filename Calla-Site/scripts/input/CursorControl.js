import { MouseButtons } from "./MouseButton";

/** @type {WeakMap<CursorControl, HTMLCanvasElement} */
const canvases = new WeakMap();

export class CursorControl {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        canvases.set(this, canvas);
    }

    /**
     * 
     * @param {import("three").Intersection} lastHit
     * @param {import("./ScreenPointerControls").ScreenPointerEvent} evt
     */
    setCursor(lastHit, evt) {
        if (evt.pointerType === "mouse") {
            const canvas = canvases.get(this),
                pressing = evt.buttons === MouseButtons.Mouse0,
                dragging = evt.dragDistance > 0;

            canvas.style.cursor = lastHit
                ? lastHit.object.disabled
                    ? "not-allowed"
                    : dragging
                        ? "move"
                        : "pointer"
                : pressing
                    ? "grabbing"
                    : "grab";
        }
    }
}