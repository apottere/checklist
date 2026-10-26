import { FlowComponent } from 'solid-js';
import { TransitionGroup } from 'solid-transition-group';

const DURATION = 280;
/** Lets a check mark register before the row starts to go. */
const EXIT_DELAY = 60;
/** The fade finishes this far into the collapse, so the space closes on an empty row rather than squashing its text. */
const FADE_END = 0.4;

/** The element's full box, so collapsing it also closes its padding and margin. */
function openBox(el: HTMLElement): Keyframe {
    const s = getComputedStyle(el);
    return {
        height: `${el.offsetHeight}px`,
        paddingTop: s.paddingTop,
        paddingBottom: s.paddingBottom,
        marginTop: s.marginTop,
        marginBottom: s.marginBottom,
    };
}

const CLOSED: Keyframe = {
    height: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    marginTop: '0px',
    marginBottom: '0px',
};

/** Calls `done` when the animation ends, or on schedule if frames are throttled (e.g. a background tab). */
function animate(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions, done: () => void): void {
    let finished = false;
    const finish = (): void => {
        if (finished) return;
        finished = true;
        done();
    };
    el.animate(keyframes, { duration: DURATION, easing: 'cubic-bezier(0.2, 0, 0, 1)', ...options }).finished.then(
        finish,
        finish
    );
    setTimeout(finish, (Number(options.delay) || 0) + DURATION + 50);
}

/**
 * Children that leave fade, then collapse, so everything below slides up instead of jumping. Children that arrive
 * (e.g. on Undo) do the reverse.
 */
export const Reflow: FlowComponent = (props) => (
    <TransitionGroup
        onExit={(el, done) => {
            if (!(el instanceof HTMLElement)) return done();
            const open = openBox(el);
            el.classList.add('reflow-animating', 'reflow-exiting');
            animate(
                el,
                [
                    { ...open, opacity: 1 },
                    { opacity: 0, offset: FADE_END },
                    { ...CLOSED, opacity: 0 },
                ],
                { delay: EXIT_DELAY, fill: 'forwards' },
                done
            );
        }}
        onEnter={(el, done) => {
            if (!(el instanceof HTMLElement)) return done();
            const open = openBox(el);
            el.classList.add('reflow-animating');
            animate(
                el,
                [
                    { ...CLOSED, opacity: 0 },
                    { opacity: 0, offset: 1 - FADE_END },
                    { ...open, opacity: 1 },
                ],
                {},
                () => {
                    el.classList.remove('reflow-animating');
                    done();
                }
            );
        }}
    >
        {props.children}
    </TransitionGroup>
);
