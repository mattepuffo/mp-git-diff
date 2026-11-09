import "bulma/css/bulma.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";

import {createSignal, For, onMount} from "solid-js";
import {invoke} from "@tauri-apps/api/core";
import {message, open} from "@tauri-apps/plugin-dialog";
import ModalDiffFile from "./ModalDiffFile.tsx";

function App() {
    const [dir, setDir] = createSignal('/home/fermat/PROJECT/learningobjects-agent');
    const [remoteBranches, setRemoteBranches] = createSignal<string[]>([]);
    const [localBranches, setLocalBranches] = createSignal<string[]>([]);
    const [branchFrom, setBranchFrom] = createSignal<string>();
    const [branchTo, setBranchTo] = createSignal<string>();
    const [diffs, setDiffs] = createSignal<string[]>([]);
    const [isOpenModalDiff, setIsOpenModalDiff] = createSignal(false);

    onMount(() => {
        setIsOpenModalDiff(true);
    });

    // const test = async () => {
    //     const [oldContent, newContent] = await Promise.all([
    //         invoke<string>("get_file_at_ref", {
    //             repoPath: "/home/fermat/PROJECT/learningobjects-agent",
    //             gitRef: "origin/release/linux",
    //             filePath: "README.md",
    //         }),
    //         invoke<string>("get_file_at_ref", {
    //             repoPath: "/home/fermat/PROJECT/learningobjects-agent",
    //             gitRef: "origin/release/linux-dev",
    //             filePath: "README.md",
    //         }),
    //     ]);
    //
    //     console.clear();
    //     console.log(oldContent);
    //     console.log(newContent);
    // }

    const chooseDir = async () => {
        const choosed = await open({
            multiple: false,
            directory: true,
        });

        if (choosed) {
            setDir(choosed);
        }
    }

    const gitBranches = async () => {
        if (dir().trim().length === 0) {
            await message('Scegliere una directory!', {
                title: 'Attenzione',
                kind: 'error'
            });
        } else {
            try {
                const items = await invoke<string[]>("git_refresh_branches", {
                    dir: dir()
                });

                const remotes = items.filter((it) => it.includes('remote'));
                const locals = items.filter((it) => !it.includes('remote'));

                setRemoteBranches(remotes);
                setLocalBranches(locals);
            } catch (error) {
                console.error("Errore:", error);
            }
        }
    };

    const gitDiff = async () => {
        if (typeof branchFrom() === 'undefined' || typeof branchTo() === 'undefined') {
            await message('Scegliere i due branch!', {
                title: 'Attenzione',
                kind: 'error'
            });
        } else {
            try {
                const items = await invoke<string[]>("git_diff", {
                    dir: dir(),
                    branchFrom: branchFrom(),
                    branchTo: branchTo()
                });

                setDiffs(items);
            } catch (error) {
                console.error("Errore:", error);
            }
        }
    }

    return (
        <main>
            <div class="container is-fluid mt-5">

                <div class="box">
                    <div class="columns">
                        <div class="field column is-10">
                            <div class="control">
                                <input class="input"
                                       type="text"
                                       value={dir()}
                                       onInput={(e) => setDir(e.currentTarget.value)}
                                       placeholder="Seleziona una directory..."/>
                            </div>
                        </div>

                        <div class="column is-2">
                            <button class="button is-link mr-2" onclick={chooseDir}>Scegli</button>
                            <button class="button is-info" onclick={gitBranches}>Git diff</button>
                        </div>
                    </div>
                </div>

                <div class="box">
                    <div class="columns">

                        <div class="column is-2">
                            <div class="select is-primary">
                                <select onChange={(e) => {
                                    setBranchFrom(e.currentTarget.value);
                                }}>
                                    <option>Scegli</option>
                                    <For each={localBranches()}>
                                        {(it) => {
                                            return (
                                                <option value={it}>{it}</option>
                                            );
                                        }}
                                    </For>
                                </select>
                            </div>
                        </div>

                        <div class="column is-2">
                            <div class="select is-info">
                                <select onChange={(e) => {
                                    setBranchTo(e.currentTarget.value);
                                }}>
                                    <option>Scegli</option>
                                    <For each={remoteBranches()}>
                                        {(it) => {
                                            return (
                                                <option>{it}</option>
                                            );
                                        }}
                                    </For>
                                </select>
                            </div>
                        </div>

                        <div class="column is-2">
                            <button class="button is-link mr-2" onclick={gitDiff}>Invia</button>
                        </div>

                    </div>
                </div>

                <div class="box">
                    <p class="panel-heading">Diff</p>

                    <table class="table is-primary">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Type</th>
                                <th>File</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            <For each={diffs()}>
                                {(it) => {
                                    const expl = it.split('-');
                                    return (
                                        <tr>
                                            <td><input type="checkbox"/></td>
                                            <td>{expl[0]}</td>
                                            <td>{expl[1]}</td>
                                            <td><i class="fa-regular fa-eye"></i></td>
                                        </tr>
                                    );
                                }}
                            </For>
                        </tbody>
                    </table>
                </div>

            </div>

            <ModalDiffFile isOpen={isOpenModalDiff()}
                           onClose={() => setIsOpenModalDiff(false)}
                           title="Modal Diff: README.md"
                           size="is-fullwidth"
                           repo_path="/home/fermat/PROJECT/learningobjects-agent"
                           git_ref_old="origin/release/linux-dev"
                           git_ref_new="origin/release/windows-dev"
                           file_path="src-tauri/Cargo.toml"
            />
        </main>
    );
}

export default App;
