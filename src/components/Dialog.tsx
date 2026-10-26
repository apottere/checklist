import { createEffect, JSX, ParentComponent, Show } from 'solid-js';

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
            {/* Unmounting the contents resets their state between openings. */}
            <Show when={props.open}>{props.children}</Show>
        </dialog>
    );
};

export const FormDialog: ParentComponent<{
    open: boolean;
    title: string;
    confirm: string;
    danger?: boolean;
    disabled?: boolean;
    /** Return false to keep the dialog open. */
    onSubmit: () => boolean | void;
    onClose: () => void;
}> = (props) => {
    const submit = (e: SubmitEvent): void => {
        e.preventDefault();
        if (props.onSubmit() !== false) props.onClose();
    };

    return (
        <Dialog open={props.open} onClose={props.onClose}>
            <form onSubmit={submit} class="form-dialog">
                <h5>{props.title}</h5>
                {props.children}
                <nav class="right-align">
                    <button type="button" class="transparent" onClick={() => props.onClose()}>
                        Cancel
                    </button>
                    <button type="submit" classList={{ error: props.danger }} disabled={props.disabled}>
                        {props.confirm}
                    </button>
                </nav>
            </form>
        </Dialog>
    );
};

export const TextField: ParentComponent<{
    label: string;
    value: string;
    onInput: (value: string) => void;
    maxLength?: number;
    autofocus?: boolean;
}> = (props) => (
    <div class="field label border">
        <input
            value={props.value}
            onInput={(e) => props.onInput(e.currentTarget.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder=" "
            maxLength={props.maxLength ?? 200}
            autofocus={props.autofocus}
        />
        <label>{props.label}</label>
    </div>
);

export const TextDialog: ParentComponent<{
    open: boolean;
    title: string;
    label: string;
    confirm: string;
    initial?: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}> = (props) => (
    <Dialog open={props.open} onClose={props.onClose}>
        <TextDialogForm {...props} />
    </Dialog>
);

// Separate so its state is created fresh each time the dialog opens.
const TextDialogForm: ParentComponent<{
    title: string;
    label: string;
    confirm: string;
    initial?: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}> = (props) => {
    let value = props.initial ?? '';
    const submit = (e: SubmitEvent): void => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        props.onSubmit(trimmed);
        props.onClose();
    };

    return (
        <form onSubmit={submit} class="form-dialog">
            <h5>{props.title}</h5>
            <TextField label={props.label} value={value} onInput={(v) => (value = v)} autofocus />
            <nav class="right-align">
                <button type="button" class="transparent" onClick={() => props.onClose()}>
                    Cancel
                </button>
                <button type="submit">{props.confirm}</button>
            </nav>
        </form>
    );
};

export const ConfirmDialog: ParentComponent<{
    open: boolean;
    title: string;
    confirm: string;
    onConfirm: () => void;
    onClose: () => void;
}> = (props) => (
    <FormDialog
        open={props.open}
        title={props.title}
        confirm={props.confirm}
        danger
        onSubmit={() => props.onConfirm()}
        onClose={props.onClose}
    >
        <p>{props.children}</p>
    </FormDialog>
);
