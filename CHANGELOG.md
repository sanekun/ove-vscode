# Change Log

All notable changes to the "openvectoreditor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 1.1.0

- 250629
- Change save button css.
- Change initial state `preview mode` to `normal mode`
- Use umd version bioparser
    - Change fasta name from `jsonToFasta` function
    ``` code
    name||length||description > name
    ```
- **Update ove-webview panel**
    - background color is always white
    - height is always 100%
- **Support .dna format**
    - Edit bio-parser script
    ``` code
    // const arrayBuffer = yield getArrayBufferFromFile(fileObj);
    const arrayBuffer = fileObj;
    ```
    - Change `CustomTextEditorProvider` to `CustomEditorProvider` (can read binary)
    - disabled save button.
- Update README to 1.1.0

### 1.1.1

- Update README in vsix
- Update `package.json` tag, category

### 1.1.2

- tabmenu name .OVE to .show
- Add `retainContextWhenHidden: true` option in tabmenu editor
- code refactoring

### 1.1.3

- Add setting `openvectoreditor.viewType` to adjust initial view type (sequence only, circular map only, split)

### 1.1.4

- issue#2 accepted.
- added Ape color support

``` js
if (feat.notes.ApEinfo_fwdcolor && feat.notes.ApEinfo_fwdcolor[0]) {
  feat.color = feat.notes.ApEinfo_fwdcolor[0];
} else if (feat.notes.ApEinfo_revcolor && feat.notes.ApEinfo_revcolor[0]) {
  feat.color = feat.notes.ApEinfo_revcolor[0];
}
```

### 1.1.5

- add '.fa', '.gbk' extension
- Issue#3

## 1.2.0

- 260620
- **SnapGene .dna file writing support**
    - Replaced `bioparser.umd.js` with upgraded `bioparser2.umd.js`
    - Added `jsonToSnapgene()` to `bioparser2.umd.js`
        - Writes SnapGene binary format (.dna) from sequence JSON
        - Preserves all original TLV blocks (Primers, Features, Notes, History, etc.) via `_snapgeneRawBlocks`
        - Always reconstructs block 0 (sequence) and block 10 (features) to reflect edits
    - `snapgeneToJson()` now parses block 5 primers and stores raw blocks for lossless roundtrip
- **Save button enabled for .dna files**
    - Removed `disabled = true` restriction on Save button for `.dna` format
    - Extension stores `_snapgeneRawBlocks` in closure on open; merges back on save
- **Known Limitation**
    - `.dna` format: Primers from block 5 are displayed in OVE and preserved on save, but **adding new primers via OVE UI is not supported** — new primers will not be written to the file

## 1.3.0

- 260830
- **New: openvectoreditor Multi View** (command: `openvectoreditor:multiview`)
    - Standalone webview panel, independent of the per-file custom editor, that keeps multiple sequences open as internal tabs in one panel
    - Two ways to add a tab: "+" creates a blank, immediately-editable tab (paste a sequence directly in), "Open File..." opens a file picker, parses the file host-side, and pushes it into the panel via `postMessage` without recreating the webview
    - Each tab lazily mounts its own `createVectorEditor` instance; sequence data survives tab switching and panel resizes (redux store keyed by editor name, same approach as the OVE Obsidian plugin)
    - Panel state resets if fully closed (not persisted across reloads); tabs have no Save button (read-only session, not file-backed)
    - Tabs have their own visual style (bordered, distinct background) with a colored bottom-accent + bold label on whichever tab is currently active
    - Each tab has an "×" close button; closing the active tab switches to a neighboring one
- **New: Pairwise Alignment** (in Multi View)
    - "Add Query" lets you paste a raw sequence and align it against whichever tab is active, via a Smith-Waterman local alignment implemented in the webview (tries both strands, picks the better-scoring one)
    - Result is rendered using OVE's built-in `createAlignmentView`; "Alignment" toggle button shows/hides the alignment pane
- **New setting: `openvectoreditor.defaultViewOptions`**
    - Pick which editor toggles start ON when a file or Multi View tab opens: `readOnly`, `showCutSites`, `showFeatures`, `showPrimers`, `showParts`
    - Default: `["readOnly", "showFeatures"]`
    - Fixes OVE's own hardcoded default (the editor previously always started in Read Only mode regardless of `withPreviewMode`, since OVE's `readOnly` redux state defaults to `true` independently of that option)
- **Fix: dark theme leaking into the OVE canvas**
    - Multi View's own toolbar CSS was inheriting VS Code's theme `color`/`font-family` down into the OVE-mounted subtree (OVE isn't theme-aware and assumes a light background); scoped theme variables to just the toolbar chrome and pinned the OVE containers back to a fixed light-mode text color, matching the single-file custom editor's existing (already-isolated) behavior
- **Known limitation**: the active-tab accent color in Multi View can still render without its accent (bold weight shows, but the background/underline color sometimes doesn't) in some VS Code dark themes — root cause not yet isolated, left for a future pass
