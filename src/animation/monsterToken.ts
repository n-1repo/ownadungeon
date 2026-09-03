import { ENCOUNTER_X, EXIT_X, FLOOR_Y } from './laneLayout';
import { MONSTER_SPRITE_MANIFEST } from '../data/monsterSprites';
import type { AnimationMeta, MonsterAnimState } from '../data/monsterSprites';
import { entityIconHtml } from '../ui/entityIcon';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

var stopClip: (() => void) | null = null;
var currentKey: MonsterAnimState | null = null;
var currentIcon = '';

function getToken(): HTMLElement | null {
  return document.getElementById('monster-token');
}

function getFace(): HTMLElement | null {
  var token = getToken();
  return token ? (token.querySelector('.monster-token-face') as HTMLElement | null) : null;
}

function stopMonsterClip(): void {
  if (stopClip) stopClip();
  stopClip = null;
  currentKey = null;
}

function showFallbackIcon(face: HTMLElement): void {
  face.innerHTML = entityIconHtml(currentIcon);
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

function playMonsterClip(monsterId: string | undefined, key: MonsterAnimState): boolean {
  var face = getFace();
  if (!face || !monsterId) return false;
  var clip = MONSTER_SPRITE_MANIFEST[monsterId]?.[key];
  if (!clip) return false;

  stopMonsterClip();
  currentKey = key;
  stopClip = startClip(face, clip, clip.loop || key === 'death' ? undefined : function () {
    if (currentKey === key) playMonsterClip(monsterId, 'idle');
  });
  return true;
}

export function showMonsterToken(icon: string, monsterId?: string): void {
  var token = getToken();
  var face = getFace();
  if (!token || !face) return;
  var el = token;
  currentIcon = icon;
  stopMonsterClip();
  if (!playMonsterClip(monsterId, 'idle')) showFallbackIcon(face);
  el.classList.add('no-motion');
  setTokenX(EXIT_X, 0);
  el.classList.add('is-visible');
  requestAnimationFrame(function () {
    el.classList.remove('no-motion');
  });
}

export function hideMonsterToken(): void {
  var token = getToken();
  if (!token) return;
  stopMonsterClip();
  token.classList.remove('is-visible');
  token.style.left = '';
  token.style.top = '';
}

export function playMonsterWalkFlourish(ms: number): void {
  var token = getToken();
  if (!token || !token.classList.contains('is-visible')) return;
  setTokenX(ENCOUNTER_X, ms);
}

export function triggerMonsterAttackAnim(monsterId: string): void {
  playMonsterClip(monsterId, 'attack');
}

export function triggerMonsterHurtAnim(monsterId: string): void {
  playMonsterClip(monsterId, 'hurt');
}

export function triggerMonsterDeathAnim(monsterId: string): void {
  playMonsterClip(monsterId, 'death');
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
