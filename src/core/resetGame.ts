import { state, resetState, saveState } from '../state/gameState';
import { clearPendingHero } from '../combat/hero';
import { renderAll } from '../ui/renderBus';
import { showToast } from '../ui/toast';
import { closeAllOverlays } from '../ui/overlays';
import { rebirthRewardMult } from '../economy/economy';

export function resetGame(): void {
  closeAllOverlays();
  resetState();
  clearPendingHero();
  renderAll();

  showToast('Game reset to the beginning', 'warning');
}

export function rebirthGame(): void {
  var rebirths = (state.rebirths || 0) + 1;
  closeAllOverlays();
  resetState();
  state.rebirths = rebirths;
  saveState();
  clearPendingHero();
  renderAll();

  var bonusPct = Math.round((rebirthRewardMult(rebirths) - 1) * 100);
  showToast('Rebirth! Gold & souls +' + bonusPct + '% selamanya', 'success');
}
