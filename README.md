# openvectoreditor in vscode

Generate [openvectoreditor](https://github.com/TeselaGen/tg-oss/tree/master/packages/ove) webview when open dna format in vscode.

refer to ove (https://github.com/TeselaGen/tg-oss/tree/master/packages/ove)

![ove-vscode](media/ove-vscode.png)

## Installation

vscode-marketplace: https://marketplace.visualstudio.com/items?itemName=sanekun.openvectoreditor

vscode - tab menu - Extensions: Install from VSIX - select openvectoreditor-1.1.5.vsix


## Features

- tab menu: openvectoreditor.show: open general ove (Can remain contents)
- Support .dna, .fa, .fasta, .gb format
- Select DNA File - Open With - select OVE (Can set as default)
- Save file with custom button (not support .dna)

## Known Issues

data remaining
- When switching to another tab, the content does not persist.
- Only the editor opened via the command `openvectoreditor.show` retains its content.

## Release Notes

- refer to [Changelog](CHANGELOG.md)

### 1.1.0

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
