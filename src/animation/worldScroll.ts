const UNIT_PX = 212;

let scrollPx = 0;
let torchScrollPx = 0;

function getLayer(): HTMLElement | null {
  return document.getElementById('room-corridor');
}

function getTorches(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('.room-torch');
}

export function resetWorldScroll(): void {
  scrollPx = 0;
  var el = getLayer();
  if (!el) return;
  el.style.transitionDuration = '0ms';
  el.style.backgroundPositionX = '0px';
  requestAnimationFrame(function () {
    if (el) el.style.transitionDuration = '';
  });
}

// Torches are wall decor for the room currently on screen, so their scroll
// resets per room instead of accumulating with the corridor's continuous
// cross-raid scroll (that accumulation is what keeps a multi-room raid
// feeling like one seamless hallway).
export function resetTorchScroll(): void {
  torchScrollPx = 0;
  var torches = getTorches();
  torches.forEach(function (t) {
    t.style.transitionDuration = '0ms';
    t.style.setProperty('--torch-scroll', '0px');
  });
  requestAnimationFrame(function () {
    torches.forEach(function (t) {
      t.style.transitionDuration = '';
    });
  });
}

export function advanceWorldScroll(unitFraction: number, ms: number): void {
  var el = getLayer();
  if (!el) return;
  scrollPx -= UNIT_PX * unitFraction;
  el.style.transitionDuration = ms + 'ms';
  el.style.backgroundPositionX = scrollPx + 'px';

  torchScrollPx -= UNIT_PX * unitFraction;
  getTorches().forEach(function (t) {
    t.style.transitionDuration = ms + 'ms';
    t.style.setProperty('--torch-scroll', torchScrollPx + 'px');
  });
}
