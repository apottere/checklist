const START_THRESHOLD = 10;
/** Fraction of the row's width past which a release triggers. */
const ARM_FRACTION = 0.3;
/** A quick flick triggers even short of the threshold (px/ms). */
const FLING_VELOCITY = 0.6;
const FLING_MIN_DISTANCE = 48;
const SETTLE_MS = 200;

/**
 * Swipe-to-dismiss with a leave-behind, like Gmail: `content` follows the finger over a background in `row`. Past the
 * threshold the row is "armed" (class `armed`, a short vibration); releasing then slides the content off and calls
 * `onSwipe`, otherwise it springs back. While dragging, `row` has class `swiping` and `data-direction` of `start` or
 * `end` for the side being revealed. Vertical movement is left to the browser for scrolling.
 */
export function swipe(row: HTMLElement, content: HTMLElement, onSwipe: () => void): void {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let tracking = false;
    let dragging = false;
    let armed = false;
    let suppressClick = false;

    row.style.touchAction = 'pan-y';

    const setArmed = (next: boolean): void => {
        if (next === armed) return;
        armed = next;
        row.classList.toggle('armed', armed);
        if (armed) navigator.vibrate?.(10);
    };

    row.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        startX = lastX = e.clientX;
        startY = e.clientY;
        lastTime = e.timeStamp;
        dx = velocity = 0;
        tracking = true;
        dragging = false;
    });

    row.addEventListener('pointermove', (e) => {
        if (!tracking) return;
        const mx = e.clientX - startX;
        const my = e.clientY - startY;
        if (!dragging) {
            if (Math.abs(my) > START_THRESHOLD) tracking = false;
            if (Math.abs(mx) <= START_THRESHOLD || !tracking) return;
            dragging = true;
            try {
                row.setPointerCapture(e.pointerId);
            } catch {
                // Throws if the pointer is already gone; the swipe still works without capture.
            }
            row.classList.add('swiping');
            content.style.transition = 'none';
        }
        const elapsed = e.timeStamp - lastTime;
        if (elapsed > 0) velocity = (e.clientX - lastX) / elapsed;
        lastX = e.clientX;
        lastTime = e.timeStamp;
        dx = mx;
        row.dataset.direction = dx > 0 ? 'start' : 'end';
        content.style.transform = `translateX(${dx}px)`;
        setArmed(Math.abs(dx) > row.offsetWidth * ARM_FRACTION);
    });

    // A cancel (e.g. the browser taking over to scroll) always springs back.
    const end = (release: boolean): void => {
        tracking = false;
        if (!dragging) return;
        dragging = false;
        // The click that follows pointerup would otherwise toggle the checkbox.
        suppressClick = release;
        const flung =
            Math.abs(velocity) > FLING_VELOCITY &&
            Math.abs(dx) > FLING_MIN_DISTANCE &&
            Math.sign(velocity) === Math.sign(dx);
        content.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1)`;
        if (release && (armed || flung)) {
            setArmed(true);
            content.style.transform = `translateX(${Math.sign(dx) * 100}%)`;
            setTimeout(onSwipe, SETTLE_MS);
        } else {
            content.style.transform = '';
            setArmed(false);
            setTimeout(() => row.classList.remove('swiping'), SETTLE_MS);
        }
    };
    row.addEventListener('pointerup', () => end(true));
    row.addEventListener('pointercancel', () => end(false));

    row.addEventListener(
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
