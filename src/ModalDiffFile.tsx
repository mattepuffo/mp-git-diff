import {createSignal, createEffect, createMemo, Show} from "solid-js";
import {invoke} from "@tauri-apps/api/core";
import {DiffView, DiffModeEnum} from "@git-diff-view/solid";
import {generateDiffFile} from "@git-diff-view/file";
import "@git-diff-view/solid/styles/diff-view.css";

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
    const [oldContent, setOldContent] = createSignal("");
    const [newContent, setNewContent] = createSignal("");
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

    const diffFile = createMemo(() => {
        const old = oldContent();
        const neu = newContent();

        if (!old && !neu) return null;

        const file = generateDiffFile(
            props.file_path,
            old,
            props.file_path,
            neu,
            "",
            ""
        );

        file.initTheme("dark");
        file.init();
        file.buildSplitDiffLines();

        return file;
    });

    return (
        <div class={`modal ${props.isOpen ? "is-active" : ""}`} onClick={(e) => e.stopPropagation()}>

            <div class="modal-background" onClick={props.onClose}></div>

            <div class={`modal-card ${props.size ?? "is-large"}`} style={{width: "95vw", "max-width": "1600px"}}>

                <header class="modal-card-head">
                    <p class="modal-card-title">
                        {props.title ?? `Diff • ${props.file_path}`}
                    </p>
                    <button class="delete" aria-label="close" onClick={props.onClose}/>
                </header>

                <section class="modal-card-body" style={{padding: "0", height: "75vh"}}>
                    <Show when={loading()}>
                        <div class="has-text-centered py-6">
                            <p>Caricamento contenuti...</p>
                        </div>
                    </Show>

                    <Show when={error()}>
                        <div class="notification is-danger is-light m-4">
                            <strong>Errore:</strong> {error()}
                        </div>
                    </Show>

                    <Show when={!loading() && !error() && diffFile()}>
                        <div style={{height: "100%", overflow: "auto"}}>
                            <DiffView diffFile={diffFile()!}
                                      diffViewMode={DiffModeEnum.Split}
                                      diffViewTheme="dark"
                                      diffViewHighlight={true}
                                      diffViewWrap={true}/>
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