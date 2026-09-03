import { getHeroIcon } from '../ui/heroIcon';
import { ENTRANCE_X, ENCOUNTER_X, EXIT_X, FLOOR_Y } from './laneLayout';
import { beatMs } from './beatTiming';
import { advanceWorldScroll } from './worldScroll';
import { HERO_SPRITE_MANIFEST } from '../data/heroSprites';
import type { AnimationMeta, MonsterAnimState } from '../data/monsterSprites';
import type { Hero } from '../types';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

var stopClip: (() => void) | null = null;
var currentKey: MonsterAnimState | null = null;

function getToken(): HTMLElement | null {
  return document.getElementById('hero-token');
}

function getFace(): HTMLElement | null {
  var token = getToken();
  return token ? (token.querySelector('.hero-token-face') as HTMLElement | null) : null;
}

function stopHeroClip(): void {
  if (stopClip) stopClip();
  stopClip = null;
  currentKey = null;
}

function showFallbackIcon(face: HTMLElement, hero: Hero): void {
  face.innerHTML = getHeroIcon(hero);
  face.style.backgroundImage = '';
  face.classList.remove('has-sprite');
}

function startClip(face: HTMLElement, clip: AnimationMeta, onEnd?: () => void): () => void {
  face.textContent = '';
  face.style.backgroundImage = 'url(' + ASSET_BASE + clip.path + ')';
  face.style.backgroundSize = (clip.frameCount * 100) + '% 100%';
  face.classList.add('has-sprite');

  var frame = 0;
  var step = clip.frameCount > 1 ? 100 / (clip.frameCount - 1) : 0;
  face.style.backgroundPositionX = '0%';
  var ms = Math.max(30, Math.round(1000 / clip.fps));

  var id = setInterval(function () {
    frame += 1;
    if (frame >= clip.frameCount) {
      if (clip.loop) {
        frame = 0;
      } else {
        frame = clip.frameCount - 1;
        face.style.backgroundPositionX = (frame * step) + '%';
        clearInterval(id);
        if (onEnd) onEnd();
        return;
      }
    }
    face.style.backgroundPositionX = (frame * step) + '%';
  }, ms);

  return function () {
    clearInterval(id);
  };
}

function playHeroClip(hero: Hero, key: MonsterAnimState): boolean {
  var face = getFace();
  if (!face) return false;
  var clip = HERO_SPRITE_MANIFEST[hero.classId]?.[key];
  if (!clip) return false;

  stopHeroClip();
  currentKey = key;
  stopClip = startClip(face, clip, clip.loop || key === 'death' ? undefined : function () {
    if (currentKey === key) playHeroClip(hero, 'idle');
  });
  return true;
}

function applyHeroFace(hero: Hero): void {
  var face = getFace();
  if (!face) return;

  if (hero.visualState === 'panic' || hero.visualState === 'rage' || hero.visualState === 'flee') {
    stopHeroClip();
    showFallbackIcon(face, hero);
    return;
  }
  if (hero.visualState === 'dead') {
    if (currentKey === 'death') return;
    if (!playHeroClip(hero, 'death')) showFallbackIcon(face, hero);
    return;
  }
  if (currentKey === 'idle') return;
  if (!playHeroClip(hero, 'idle')) showFallbackIcon(face, hero);
}

export function triggerHeroAttackAnim(hero: Hero): void {
  playHeroClip(hero, 'attack');
}

export function triggerHeroHurtAnim(hero: Hero): void {
  playHeroClip(hero, 'hurt');
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

  stopHeroClip();
  applyHeroFace(hero);

  token.classList.add('is-visible');
  token.classList.remove('is-flee', 'is-dead', 'is-entering');
  runway.classList.add('is-raiding');
}

export function hideHeroToken(): void {
  var token = getToken();
  var runway = document.getElementById('dungeon-runway');
  if (!token || !runway) return;
  stopHeroClip();
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
  applyHeroFace(hero);
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

export function walkHeroToEncounter(hero: Hero): void {
  var ms = beatMs('arriveRoom');
  playHeroClip(hero, 'walk');
  setTokenX(ENCOUNTER_X, ms);
  advanceWorldScroll(0.5, ms);
  setTimeout(function () {
    if (currentKey === 'walk') playHeroClip(hero, 'idle');
  }, ms);
}

export function walkHeroToExit(hero: Hero): void {
  var ms = beatMs('betweenRooms');
  playHeroClip(hero, 'walk');
  setTokenX(EXIT_X, ms);
  advanceWorldScroll(0.5, ms);
  setTimeout(function () {
    if (currentKey === 'walk') playHeroClip(hero, 'idle');
  }, ms);
}

export function resetStageView(): void {
  hideHeroToken();
  placeHeroAtEntrance();
  document.querySelectorAll('.dungeon-slot').forEach(function (s) {
    s.classList.remove('raid-active', 'raid-cleared', 'slot-triggered', 'slot-kill');
  });
}
