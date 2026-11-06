import "bulma/css/bulma.min.css";
import "./App.css";

import {createSignal, For} from "solid-js";
import {invoke} from "@tauri-apps/api/core";
import {message, open} from "@tauri-apps/plugin-dialog";

function App() {
    const [dir, setDir] = createSignal('/home/fermat/PROJECT/learningobjects-agent');
    const [branches, setBranches] = createSignal<string[]>([]);
    const [branchFrom, setBranchFrom] = createSignal<string>();
    const [branchTo, setBranchTo] = createSignal<string>();

    // onMount(() => {
    //     test();
    // });

    const chooseDir = async () => {
        const choosed = await open({
            multiple: false,
            directory: true,
        });

        if (choosed) {
            setDir(choosed);
        }
    }

    const gitDiff = async () => {
        if (dir().trim().length === 0) {
            await message('Scegliere una directory!', {
                title: 'Attenzione',
                kind: 'error'
            });
        } else {
            try {
                const raw = await invoke<string[]>("git_refresh_branches", {
                    dir: dir()
                });

                setBranches(raw);
            } catch (error) {
                console.error("Errore:", error);
            }
        }
    };

    return (
        <main>
            <div class="container is-fluid mt-5">

                <div class="card">
                    <div class="card-content">
                        <div class="content">
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
                                    <button class="button is-info" onclick={gitDiff}>Git diff</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-content">
                        <div class="content">
                            <div class="columns">

                                <div class="column is-1">
                                    <div class="select is-primary">
                                        <select onSelect={() => {
                                            setBranchFrom()
                                        }}>
                                            <option>Scegli</option>
                                            <For each={branches()}>
                                                {(it) => {
                                                    return (
                                                        <option>{it}</option>
                                                    );
                                                }}
                                            </For>
                                        </select>
                                    </div>
                                </div>

                                <div class="column is-1">
                                    <div class="select is-info">
                                        <select>
                                            <option>Scegli</option>
                                            <For each={branches()}>
                                                {(it) => {
                                                    return (
                                                        <option>{it}</option>
                                                    );
                                                }}
                                            </For>
                                        </select>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}

export default App;
