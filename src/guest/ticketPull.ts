// The anchor owns activation. The optional paper gesture simply clicks that same link.
export function attachTicketPull(ticket: HTMLAnchorElement | null) {
  const stub = ticket?.querySelector<HTMLElement>(".papu-ticket-stub");
  if (!ticket || !stub) return;
  const link = ticket;
  const handle = stub;
  let pull:
    | { id: number; x: number; y: number; threshold: number; dragging: boolean }
    | undefined;
  let blockPointerClick = false;

  function modified(event: MouseEvent) {
    return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
  }

  function reset() {
    const id = pull?.id;
    pull = undefined;
    delete link.dataset.pulling;
    link.style.removeProperty("--ticket-pull");
    if (id !== undefined && handle.hasPointerCapture(id))
      handle.releasePointerCapture(id);
  }

  function down(event: PointerEvent) {
    if (!event.isPrimary) return;
    blockPointerClick = false;
    if (
      event.button !== 0 ||
      modified(event) ||
      !event.composedPath().includes(handle)
    )
      return;
    const edgeSpace = document.documentElement.clientWidth - event.clientX;
    pull = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      threshold: Math.max(12, Math.min(38, edgeSpace - 3)),
      dragging: false,
    };
    handle.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent) {
    if (!pull || pull.id !== event.pointerId) return 0;
    const dx = event.clientX - pull.x;
    const dy = Math.abs(event.clientY - pull.y);
    if (Math.max(Math.abs(dx), dy) < 7 && !pull.dragging) return 0;
    blockPointerClick = true;
    const vertical = pull.dragging ? dy > Math.max(14, dx * 1.4) : dy >= dx;
    if (vertical || modified(event)) {
      reset();
      return 0;
    }
    if (!pull.dragging) {
      pull.dragging = true;
      link.dataset.pulling = "true";
    }
    const progress = Math.max(0, Math.min(1, dx / pull.threshold));
    link.style.setProperty("--ticket-pull", String(progress));
    return progress;
  }

  function up(event: PointerEvent) {
    if (!pull || pull.id !== event.pointerId) return;
    const open = move(event) === 1 && !modified(event);
    reset();
    if (open) {
      link.focus({ preventScroll: true });
      link.click();
    }
  }

  function cancel(event: PointerEvent) {
    if (pull?.id !== event.pointerId) return;
    blockPointerClick = true;
    reset();
  }

  function click(event: MouseEvent) {
    // Keyboard, assistive activation and the call above all have zero click detail.
    if (
      !blockPointerClick ||
      event.detail === 0 ||
      modified(event) ||
      event.button !== 0
    )
      return;
    blockPointerClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function drag(event: DragEvent) {
    if (pull) event.preventDefault();
  }

  link.addEventListener("pointerdown", down);
  // Keep an in-flight tear coherent even once the finger or mouse leaves the
  // stub's bounds (not every browser input mode retargets captured motion).
  // The pointer id and local pull state keep unrelated page gestures inert.
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", cancel);
  link.addEventListener("lostpointercapture", cancel);
  link.addEventListener("click", click, true);
  link.addEventListener("dragstart", drag);
  return () => {
    link.removeEventListener("pointerdown", down);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
    link.removeEventListener("lostpointercapture", cancel);
    link.removeEventListener("click", click, true);
    link.removeEventListener("dragstart", drag);
    reset();
  };
}
