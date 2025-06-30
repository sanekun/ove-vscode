const vscode = require('vscode');
const path = require('path');
const { genbankToJson, fastaToJson, snapgeneToJson, jsonToGenbank, jsonToFasta } = require('./media/bioparser.umd.js');

function activate(context) {
  console.log('openvectoreditor: now activated!');

  context.subscriptions.push(
    vscode.commands.registerCommand('openvectoreditor.show', () => {
      const panel = vscode.window.createWebviewPanel(
        'openvectoreditor',
        'Open Vector Editor',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
	  retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media'))
          ]
        }
      );
      panel.webview.html = getTestHtml(context, panel.webview);
    })
  )
  console.log("openvectoreditor: comamnd registered");
}

class DNAViewerProvider {
  constructor(context) {
    console.log("On provider")
    this.context = context;
  }
  
  async openCustomDocument(uri, openContext, token) {
    return {
      uri,
      dispose: () => {}
    };
  }

  async resolveCustomEditor(document, webviewPanel) {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
      ]
    };
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'ove.css'))
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'index.umd.js'))
    );
    const ext = path.extname(document.uri.fsPath.toLowerCase().trim());

    let jsonOutput
    if (ext === '.gb') {
      const doc = await vscode.workspace.openTextDocument(document.uri);
      const fileContent = doc.getText();
      jsonOutput = JSON.stringify(genbankToJson(fileContent)[0].parsedSequence);
    } else if (ext === '.fa' || ext === '.fasta') {
      const doc = await vscode.workspace.openTextDocument(document.uri);
      const fileContent = doc.getText();
      jsonOutput = JSON.stringify(fastaToJson(fileContent)[0].parsedSequence);
    } else if (ext === '.dna') {
      let fileName = path.basename(document.uri.fsPath);
      const basename = path.parse(fileName).name.trim();
      const buffer = await vscode.workspace.fs.readFile(document.uri); // Unit8Array
      const snapgeneOutput = await snapgeneToJson(buffer, {'fileName': basename});
      jsonOutput = JSON.stringify(snapgeneOutput[0].parsedSequence);
    }

    function jsonToFile(newJsonData) {
      if (ext == '.gb') {
        return jsonToGenbank(newJsonData);
      } else if (ext == '.fa' || ext == '.fasta') {
        return jsonToFasta(newJsonData);
      }
    }
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "save") {
        const newJsonData = message.data;
        const newFileContent = jsonToFile(newJsonData);
        await vscode.workspace.fs.writeFile(document.uri, Buffer.from(newFileContent));
      }
    })

    webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="${styleUri}" />
          <style>
            html, body {
              height: 100%;
            }
            .ove-created-div {
              height: 100%;
              background-color: white;
            }
            .save-button {
              display: inline-block;
              padding: 10px;
              background-color: #0078d4;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
              font-size: 16px;
              font-weight: 600;
              box-shadow: none;
              border: none;
              cursor: pointer;
              position: fixed;
              top: 10px;
              right: 35px;
              z-index: 20000;
            }
            .save-button:hover {
              background-color: #005a9e;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .save-button:disabled {
              background-color: gray;
              cursor: not-allowed;
              opacity: 0.6;
            }
          </style>
        </head>
        <body>
		<script>
		const vscode = acquireVsCodeApi();
    const fileExt = ${JSON.stringify(ext)};

    function isSavable() {
      // Check .dna file
      if (fileExt === '.dna') {
        document.getElementById("save-button").disabled = true;
      }
    }

    function postSave() {
			const newJsonData = editor.getState()["sequenceData"];
			console.log('save data');
		vscode.postMessage({
			type: "save",
			data: newJsonData
		});
			}
		</script>
		  <button id="save-button" class="save-button" onclick=postSave()>
        Save
      </button>
        <script src="${scriptUri}"></script>
		  <script>
			const editor = window.createVectorEditor("createDomNodeForMe", {
				withPreviewMode: false,
				editorName: "VectorEditor",
				showMenuBar: true,
				disableSetReadOnly: false,
			});
			editor.updateEditor({
				sequenceData: ${JSON.parse(JSON.stringify(jsonOutput))}});
      
      // Initialize the editor
      isSavable();
      </script>
    </body>
    </html>
    `;
  }
}

exports.activate = activate;
