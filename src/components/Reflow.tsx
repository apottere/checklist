import { FlowComponent } from 'solid-js';
import { TransitionGroup } from 'solid-transition-group';

const EXIT = { delay: 60, duration: 180 };
const ENTER = { duration: 200 };

/** Calls `done` when the animation ends, or after its duration if frames are throttled (e.g. a background tab). */
function animate(
    el: Element,
    keyframes: Keyframe[],
    timing: { delay?: number; duration: number },
    done: () => void
): void {
    let finished = false;
    const finish = (): void => {
        if (finished) return;
        finished = true;
        done();
    };
    el.animate(keyframes, { ...timing, easing: 'ease', fill: 'forwards' }).finished.then(finish, finish);
    setTimeout(finish, (timing.delay ?? 0) + timing.duration + 50);
}

/**
 * Children that leave fade out while taken out of the layout, so their siblings slide into place (FLIP, via
 * `reflow-move`) instead of jumping. The exit delay lets a check mark register before the row goes.
 */
export const Reflow: FlowComponent = (props) => (
    <TransitionGroup
        moveClass="reflow-move"
        onExit={(el, done) => {
            el.classList.add('reflow-exiting');
            animate(el, [{ opacity: 1 }, { opacity: 0 }], EXIT, done);
        }}
        onEnter={(el, done) => animate(el, [{ opacity: 0 }, { opacity: 1 }], ENTER, done)}
    >
        {props.children}
    </TransitionGroup>
);
