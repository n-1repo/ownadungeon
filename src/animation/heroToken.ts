import { getHeroIcon } from '../ui/heroIcon';
import { ENTRANCE_X, ENCOUNTER_X, EXIT_X, FLOOR_Y } from './laneLayout';
import { beatMs } from './beatTiming';
import { advanceWorldScroll } from './worldScroll';
import { HERO_SPRITE_MANIFEST } from '../data/heroSprites';
import type { Hero } from '../types';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

function getToken(): HTMLElement | null {
  return document.getElementById('hero-token');
}

function applyHeroFace(face: Element, hero: Hero): void {
  var el = face as HTMLElement;
  var sprite = hero.visualState === 'idle' ? HERO_SPRITE_MANIFEST[hero.classId]?.idle : undefined;
  if (sprite) {
    el.textContent = '';
    el.style.backgroundImage = 'url(' + ASSET_BASE + sprite.path + ')';
    el.style.backgroundSize = (sprite.frameCount * 100) + '% 100%';
    el.classList.add('has-sprite');
  } else {
    el.innerHTML = getHeroIcon(hero);
    el.style.backgroundImage = '';
    el.classList.remove('has-sprite');
  }
}

function setTokenX(xPct: number, ms?: number): void {
  var token = getToken();
  if (!token) return;
  if (typeof ms === 'number') {
    token.style.transitionDuration = ms + 'ms, ' + ms + 'ms, 0.25s';
  }
  token.style.left = xPct + '%';
  token.style.top = FLOOR_Y + '%';
}

export function showHeroToken(hero: Hero): void {
  var token = getToken();
  var runway = document.getElementById('dungeon-runway');
  if (!token || !runway) return;

  var face = token.querySelector('.hero-token-face');
  if (face) applyHeroFace(face, hero);

  token.classList.add('is-visible');
  token.classList.remove('is-flee', 'is-dead', 'is-entering');
  runway.classList.add('is-raiding');
}

export function hideHeroToken(): void {
  var token = getToken();
  var runway = document.getElementById('dungeon-runway');
  if (!token || !runway) return;
  token.classList.remove('is-visible', 'is-panic', 'is-rage', 'is-flee', 'is-dead', 'is-entering');
  token.style.left = '';
  token.style.top = '';
  runway.classList.remove('is-raiding', 'is-room-mode');
  var app = document.querySelector('.app');
  if (app) app.classList.remove('battle-active');
  document.body.classList.remove('battle-active');
}

export function syncHeroTokenVisual(hero: Hero | null): void {
  var token = getToken();
  if (!token || !hero) return;
  token.classList.remove('is-panic', 'is-rage', 'is-flee', 'is-dead');
  if (hero.visualState === 'panic') token.classList.add('is-panic');
  if (hero.visualState === 'rage') token.classList.add('is-rage');
  if (hero.visualState === 'flee') token.classList.add('is-flee');
  if (hero.visualState === 'dead') token.classList.add('is-dead');
  var face = token.querySelector('.hero-token-face');
  if (face) applyHeroFace(face, hero);
}

export function placeHeroAtEntrance(): void {
  var token = getToken();
  if (!token) return;
  var el = token;
  el.classList.add('no-motion');
  setTokenX(ENTRANCE_X, 0);
  requestAnimationFrame(function () {
    el.classList.remove('no-motion');
  });
}

export function walkHeroToEncounter(): void {
  var ms = beatMs('arriveRoom');
  setTokenX(ENCOUNTER_X, ms);
  advanceWorldScroll(0.5, ms);
}

export function walkHeroToExit(): void {
  var ms = beatMs('betweenRooms');
  setTokenX(EXIT_X, ms);
  advanceWorldScroll(0.5, ms);
}

export function resetStageView(): void {
  hideHeroToken();
  placeHeroAtEntrance();
  document.querySelectorAll('.dungeon-slot').forEach(function (s) {
    s.classList.remove('raid-active', 'raid-cleared', 'slot-triggered', 'slot-kill');
  });
}
