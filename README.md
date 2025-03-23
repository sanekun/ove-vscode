# openvectoreditor in vscode 

Generate [ove](https://github.com/TeselaGen/tg-oss/tree/master/packages/ove) webview when open dna format in vscode.

refer to ove (https://github.com/TeselaGen/tg-oss/tree/master/packages/ove)

## Installation

vscode - tab menu - Extensions: Install from VSIX - select openvectoreditor-1.0.0.vsix

## Features

- tab menu: openvectoreditor.show: open general ove (for testing)
- Support .fa, .fasta, .gb format
- Select DNA File - Open With - select OVE (Can set as default)
- Save file with custom button (Top-Right)

## Known Issues

.dna format support    
- cannot convert .dna format to json with [bio-parser](https://github.com/TeselaGen/tg-oss/tree/master/packages/bio-parsers)

save data
- cannot access `onSave` react hook and it's function in umd calling.

## Release Notes

### 1.0.0

- 250324
- support .gb, .fa, .fasta
- support SAVE with custom button
