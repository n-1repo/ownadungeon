import type { AnimationMeta, MonsterAnimState } from './monsterSprites';

export const HERO_SPRITE_MANIFEST: Record<string, Partial<Record<MonsterAnimState, AnimationMeta>>> = {
  paladin: {
    idle:   { path: '/assets/heroes/Paladin/Idle.png',   frameCount: 4, fps: 6,  loop: true },
    walk:   { path: '/assets/heroes/Paladin/Walk.png',   frameCount: 8, fps: 10, loop: true },
    run:    { path: '/assets/heroes/Paladin/Run.png',    frameCount: 7, fps: 12, loop: true },
    attack: { path: '/assets/heroes/Paladin/Attack%201.png', frameCount: 5, fps: 12, loop: false },
    hurt:   { path: '/assets/heroes/Paladin/Hurt.png',   frameCount: 2, fps: 10, loop: false },
    death:  { path: '/assets/heroes/Paladin/Dead.png',   frameCount: 6, fps: 8,  loop: false },
  },
};
