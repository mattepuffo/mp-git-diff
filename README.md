# Gui per Git Diff

GUI per gestire e visualizzare le differenze tra branches di un repo Git.

E' possibile effettuare il restore dei files selezionati, e visualizzare le differenze dei singoli files side-by-side.

Per creare una build di produzione per Windows/macOS:
```bash
npm run tauri build
```

Per creare una build di produzione per Linux:
```bash
NO_STRIP=true npm run tauri build
```

Per macOS universal:
```bash
npm run tauri build -- --target universal-apple-darwin
```

---

#### RELEASES:
- [Linux AppImage](https://www.mattepuffo.com/DOWNLOAD/mp-git-diff_linux.zip)
- Windows --> TODO
- macOS --> TODO
