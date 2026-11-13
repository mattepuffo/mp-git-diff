import "bulma/css/bulma.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";

import {createSignal, For, onMount} from "solid-js";
import {invoke} from "@tauri-apps/api/core";
import {message, open} from "@tauri-apps/plugin-dialog";
import ModalDiffFile from "./ModalDiffFile.tsx";
import {LazyStore} from "@tauri-apps/plugin-store";

function App() {
    const [repoPath, setRepoPath] = createSignal('');
    const [remoteBranches, setRemoteBranches] = createSignal<string[]>([]);
    const [localBranches, setLocalBranches] = createSignal<string[]>([]);
    const [branchFrom, setBranchFrom] = createSignal<string>();
    const [branchTo, setBranchTo] = createSignal<string>();
    const [diffs, setDiffs] = createSignal<string[]>([]);
    const [isOpenModalDiff, setIsOpenModalDiff] = createSignal(false);
    const [diffFile, setDiffFile] = createSignal<string>('');
    const [arrFiles, setArrFiles] = createSignal<string[]>([]);
    const store = new LazyStore('store-git-diff.json');

    onMount(() => {
        getChoosedDir();
    });

    const getChoosedDir = async () => {
        const val = await store.get<{ value: string }>('repo-path');
        if (val) {
            setRepoPath(val.value);
        }
    }

    const chooseDir = async () => {
        const choosed = await open({
            multiple: false,
            directory: true,
        });

        if (choosed) {
            setRepoPath(choosed);

            await store.set('repo-path', {value: choosed});
            await store.save();
        }
    }

    const gitBranches = async () => {
        if (repoPath().trim().length === 0) {
            await message('Scegliere una directory!', {
                title: 'Attenzione',
                kind: 'error'
            });
        } else {
            try {
                const items = await invoke<string[]>("git_refresh_branches", {
                    dir: repoPath()
                });

                const remotes = items.filter((it) => it.includes('remote'));
                const locals = items.filter((it) => !it.includes('remote'));

                setRemoteBranches(remotes);
                setLocalBranches(locals);
            } catch (error) {
                await message('Si è verificato un errore: ' + error, {
                    title: 'Attenzione',
                    kind: 'error'
                });
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
                    dir: repoPath(),
                    branchFrom: branchFrom(),
                    branchTo: branchTo()
                });

                setDiffs(items);
            } catch (error) {
                await message('Si è verificato un errore: ' + error, {
                    title: 'Attenzione',
                    kind: 'error'
                });
            }
        }
    }

    const restore = async () => {
        if (typeof branchFrom() === 'undefined' || typeof branchTo() === 'undefined') {
            await message('Scegliere i due branch!', {
                title: 'Attenzione',
                kind: 'error'
            });
        } else {
            if (arrFiles().length == 0) {
                await message('Selezionare uno o più files di cui fare il restore!', {
                    title: 'Attenzione',
                    kind: 'error'
                });
            } else {
                try {
                    await invoke<string[]>("git_restore", {
                        repoPath: repoPath(),
                        branch: branchTo(),
                        items: arrFiles()
                    });

                    await message('Operazione avvenuta con successo', {
                        title: 'Attenzione',
                        kind: 'info'
                    });
                } catch (error) {
                    await message('Si è verificato un errore: ' + error, {
                        title: 'Attenzione',
                        kind: 'error'
                    });
                }
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
                                       value={repoPath()}
                                       onInput={(e) => setRepoPath(e.currentTarget.value)}
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
                    <p class="panel-heading">
                        <button class="button is-danger mr-2" onclick={restore}>Restore</button>
                    </p>

                    <table class="table is-primary mt-5">
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
                                    const expl = it.split('||');
                                    const file = expl[1];

                                    return (
                                        <tr>
                                            <td>
                                                <input type="checkbox"
                                                       checked={arrFiles().includes(file)}
                                                       onChange={(e) => {
                                                           if (e.currentTarget.checked) {
                                                               setArrFiles(prev =>
                                                                   prev.includes(file) ? prev : [...prev, file]
                                                               );
                                                           } else {
                                                               setArrFiles(prev => prev.filter(f => f !== file));
                                                           }
                                                       }}
                                                />
                                            </td>
                                            <td>{expl[0]}</td>
                                            <td>{file}</td>
                                            <td>
                                                <i class="fa-regular fa-eye"
                                                   onclick={() => {
                                                       setDiffFile(file);
                                                       setIsOpenModalDiff(true);
                                                   }}>
                                                </i>
                                            </td>
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
                           repo_path={repoPath()}
                           git_ref_old={branchFrom()}
                           git_ref_new={branchTo()}
                           file_path={diffFile()}/>
        </main>
    );
}

export default App;
