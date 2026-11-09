import {createSignal, createEffect, Show} from "solid-js";
import {invoke} from "@tauri-apps/api/core";

interface ModalDiffProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: "is-small" | "is-medium" | "is-large" | "is-fullwidth";
    repo_path?: string;
    git_ref_old: string;
    git_ref_new: string;
    file_path: string;
}

export default function ModalDiffFile(props: ModalDiffProps) {
    const [oldContent, setOldContent] = createSignal<string>("");
    const [newContent, setNewContent] = createSignal<string>("");
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    createEffect(() => {
        if (props.isOpen && props.repo_path && props.file_path) {
            loadContents();
        }
    });

    const loadContents = async () => {
        setLoading(true);
        setError(null);
        setOldContent("");
        setNewContent("");

        try {
            const [old, neu] = await Promise.all([
                invoke<string>("get_file_at_ref", {
                    repoPath: props.repo_path,
                    gitRef: props.git_ref_old,
                    filePath: props.file_path,
                }),
                invoke<string>("get_file_at_ref", {
                    repoPath: props.repo_path,
                    gitRef: props.git_ref_new,
                    filePath: props.file_path,
                }),
            ]);

            setOldContent(old);
            setNewContent(neu);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class={`modal ${props.isOpen ? "is-active" : ""}`}
             onClick={(e) => e.stopPropagation()}>

            <div class="modal-background" onClick={props.onClose}></div>

            <div class={`modal-card ${props.size ?? "is-large"}`} style={{width: "90vw", "max-width": "1400px"}}>
                <header class="modal-card-head">
                    <p class="modal-card-title">
                        {props.title ?? `Diff: ${props.file_path}`}
                    </p>
                    <button class="delete" aria-label="close" onClick={props.onClose}/>
                </header>

                <section class="modal-card-body" style={{padding: "1rem"}}>
                    <Show when={loading()}>
                        <div class="has-text-centered py-6">
                            <p>Caricamento contenuti...</p>
                        </div>
                    </Show>

                    <Show when={error()}>
                        <div class="notification is-danger is-light">
                            <strong>Errore:</strong> {error()}
                        </div>
                    </Show>

                    <Show when={!loading() && !error()}>
                        <div class="columns is-gapless" style={{height: "70vh"}}>
                            <div class="column is-half" style={{"border-right": "1px solid #dbdbdb"}}>
                                <div class="has-background-light px-3 py-2 is-size-7 has-text-weight-semibold">
                                    {props.git_ref_old}
                                </div>
                                <pre style={{
                                    margin: 0,
                                    padding: "1rem",
                                    height: "calc(70vh - 40px)",
                                    overflow: "auto",
                                    "white-space": "pre",
                                    "font-size": "13px",
                                    "line-height": "1.45",
                                }}>
                                    {oldContent()}
                                </pre>
                            </div>

                            <div class="column is-half">
                                <div class="has-background-light px-3 py-2 is-size-7 has-text-weight-semibold">
                                    {props.git_ref_new}
                                </div>
                                <pre style={{
                                    margin: 0,
                                    padding: "1rem",
                                    height: "calc(70vh - 40px)",
                                    overflow: "auto",
                                    "white-space": "pre",
                                    "font-size": "13px",
                                    "line-height": "1.45",
                                }}>
                                    {newContent()}
                                </pre>
                            </div>
                        </div>
                    </Show>
                </section>

                <footer class="modal-card-foot is-justify-content-flex-end">
                    <button class="button" onClick={props.onClose}>
                        Chiudi
                    </button>
                </footer>

            </div>
        </div>
    );
}