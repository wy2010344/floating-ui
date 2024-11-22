import { observeMove } from "./autoUpdate";
import { AutoUpdateOptions, ReferenceElement } from "./types";
import { getBoundingClientRect } from "./utils/getBoundingClientRect";
import { unwrapElement } from "./utils/unwrapElement";

import { getOverflowAncestors } from '@floating-ui/utils/dom';
export function observerSizeLocation(
  reference: ReferenceElement,
  update: () => void,
  options: AutoUpdateOptions = {},
) {

  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === 'function',
    layoutShift = typeof IntersectionObserver === 'function',
    animationFrame = false,
  } = options;

  const referenceEl = unwrapElement(reference);

  const ancestors =
    ancestorScroll || ancestorResize
      ? (referenceEl ? getOverflowAncestors(referenceEl) : [])
      : [];

  ancestors.forEach((ancestor) => {
    ancestorScroll &&
      ancestor.addEventListener('scroll', update, { passive: true });
    ancestorResize && ancestor.addEventListener('resize', update);
  });

  const cleanupIo =
    referenceEl && layoutShift ? observeMove(referenceEl, update) : null;

  let resizeObserver: ResizeObserver | null = null;

  if (elementResize) {
    resizeObserver = new ResizeObserver(update);
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
  }

  let frameId: number;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;

  if (animationFrame) {
    frameLoop();
  }

  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);

    if (
      prevRefRect &&
      (nextRefRect.x !== prevRefRect.x ||
        nextRefRect.y !== prevRefRect.y ||
        nextRefRect.width !== prevRefRect.width ||
        nextRefRect.height !== prevRefRect.height)
    ) {
      update();
    }

    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }

  update();

  return () => {
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.removeEventListener('scroll', update);
      ancestorResize && ancestor.removeEventListener('resize', update);
    });

    cleanupIo?.();
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}