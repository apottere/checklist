import { createEffect, JSX, ParentComponent } from 'solid-js';

export const Dialog: ParentComponent<{ open: boolean; onClose: () => void; class?: string }> = (props) => {
    let ref!: HTMLDialogElement;
    createEffect(() => {
        if (props.open && !ref.open) ref.showModal();
        else if (!props.open && ref.open) ref.close();
    });
    // A click on the dialog element itself is a click on the backdrop.
    const onClick: JSX.EventHandler<HTMLDialogElement, MouseEvent> = (e) => {
        if (e.target === ref) ref.close();
    };

    return (
        <dialog ref={ref} class={props.class} onClose={() => props.onClose()} onClick={onClick}>
            {props.children}
        </dialog>
    );
};

export const TextDialog: ParentComponent<{
    open: boolean;
    title: string;
    label: string;
    confirm: string;
    initial?: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}> = (props) => {
    let input!: HTMLInputElement;
    createEffect(() => {
        if (props.open) input.value = props.initial ?? '';
    });
    const submit = (e: SubmitEvent): void => {
        e.preventDefault();
        const value = input.value.trim();
        if (value) props.onSubmit(value);
        props.onClose();
    };

    return (
        <Dialog open={props.open} onClose={props.onClose}>
            <form method="dialog" onSubmit={submit}>
                <h5>{props.title}</h5>
                <div class="field label border">
                    <input
                        ref={input}
                        placeholder=" "
                        maxLength={200}
                        required
                        autofocus
                        onFocus={(e) => e.currentTarget.select()}
                    />
                    <label>{props.label}</label>
                </div>
                <nav class="right-align">
                    <button type="button" class="transparent" onClick={() => props.onClose()}>
                        Cancel
                    </button>
                    <button type="submit">{props.confirm}</button>
                </nav>
            </form>
        </Dialog>
    );
};

export const ConfirmDialog: ParentComponent<{
    open: boolean;
    title: string;
    confirm: string;
    onConfirm: () => void;
    onClose: () => void;
}> = (props) => (
    <Dialog open={props.open} onClose={props.onClose}>
        <h5>{props.title}</h5>
        <p>{props.children}</p>
        <nav class="right-align">
            <button class="transparent" onClick={() => props.onClose()}>
                Cancel
            </button>
            <button
                class="error"
                onClick={() => {
                    props.onConfirm();
                    props.onClose();
                }}
            >
                {props.confirm}
            </button>
        </nav>
    </Dialog>
);
