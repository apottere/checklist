const START_THRESHOLD = 10;

/**
 * Horizontal swipe on `el`. Vertical movement is left to the browser for scrolling (`touch-action: pan-y`).
 * Triggers when swiped past a third of the element's width.
 */
export function swipe(el: HTMLElement, onSwipe: () => void): void {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let tracking = false;
    let dragging = false;
    let suppressClick = false;

    el.style.touchAction = 'pan-y';

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        dx = 0;
        tracking = true;
        dragging = false;
    });

    el.addEventListener('pointermove', (e) => {
        if (!tracking) return;
        const mx = e.clientX - startX;
        const my = e.clientY - startY;
        if (!dragging) {
            if (Math.abs(my) > START_THRESHOLD) tracking = false;
            if (Math.abs(mx) <= START_THRESHOLD || !tracking) return;
            dragging = true;
            el.setPointerCapture(e.pointerId);
            el.style.transition = 'none';
        }
        dx = mx;
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = String(1 - Math.min(Math.abs(dx) / el.offsetWidth, 0.7));
    });

    const end = (): void => {
        if (dragging) {
            // The click that follows pointerup would otherwise toggle whatever is under the finger.
            suppressClick = true;
            const triggered = Math.abs(dx) > el.offsetWidth / 3;
            el.style.transition = '';
            el.style.transform = triggered ? `translateX(${Math.sign(dx) * 100}%)` : '';
            el.style.opacity = triggered ? '0' : '';
            if (triggered) {
                onSwipe();
                setTimeout(() => {
                    el.style.transform = '';
                    el.style.opacity = '';
                }, 300);
            }
        }
        tracking = false;
        dragging = false;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener(
        'click',
        (e) => {
            if (!suppressClick) return;
            suppressClick = false;
            e.preventDefault();
            e.stopPropagation();
        },
        true
    );
}
