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