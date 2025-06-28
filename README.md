# openvectoreditor in vscode 

Generate [ove](https://github.com/TeselaGen/tg-oss/tree/master/packages/ove) webview when open dna format in vscode.

refer to ove (https://github.com/TeselaGen/tg-oss/tree/master/packages/ove)

![ove-vscode](media/ove-vscode.png)

## Installation

vscode-marketplace: [openvectoreditor](https://marketplace.visualstudio.com/items?itemName=sanekun.openvectoreditor)

vscode - tab menu - Extensions: Install from VSIX - select openvectoreditor-1.0.0.vsix


## Features

- tab menu: openvectoreditor.show: open general ove (for testing)
- Support .fa, .fasta, .gb format
- Select DNA File - Open With - select OVE (Can set as default)
- Save file with custom button (Top-Right)

## Known Issues

.dna format doesn't support  
- cannot convert .dna format to json with [bio-parser](https://github.com/TeselaGen/tg-oss/tree/master/packages/bio-parsers)

save data
- cannot access `onSave` react hook and it's function in umd calling.

## Release Notes

### 1.0.4

- 250628
- support .gb, .fa, .fasta
- SAVE with custom button
