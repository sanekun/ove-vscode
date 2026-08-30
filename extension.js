const vscode = require('vscode');
const path = require('path');
const { genbankToJson, fastaToJson, snapgeneToJson, jsonToSnapgene, jsonToGenbank, jsonToFasta } = require('./media/bioparser2.umd.js');

function activate(context) {
  console.log('openvectoreditor: now activated!');

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'openvectoreditor.editor',
      new DNAViewerProvider(context)
    )
  );

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

  let multiviewPanel = null;

  context.subscriptions.push(
    vscode.commands.registerCommand('openvectoreditor.multiview', () => {
      if (multiviewPanel) {
        multiviewPanel.reveal(vscode.ViewColumn.One);
        return;
      }

      multiviewPanel = vscode.window.createWebviewPanel(
        'openvectoreditor.multiview',
        'openvectoreditor Multi View',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media'))
          ]
        }
      );
      multiviewPanel.webview.html = getMultiviewHtml(context, multiviewPanel.webview);

      multiviewPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'requestAddFile') {
          const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'Sequence files': ['dna', 'gb', 'gbk', 'fasta', 'fa'] }
          });
          if (!uris || uris.length === 0) return;

          try {
            const parsed = await parseSequenceFileForMultiview(uris[0]);
            if (!parsed) {
              multiviewPanel.webview.postMessage({
                type: 'error',
                message: `Unsupported file: ${path.basename(uris[0].fsPath)}`
              });
              return;
            }
            multiviewPanel.webview.postMessage({
              type: 'addSequence',
              fileName: path.basename(uris[0].fsPath),
              sequenceData: parsed.sequenceData
            });
          } catch (e) {
            multiviewPanel.webview.postMessage({
              type: 'error',
              message: `Failed to parse ${path.basename(uris[0].fsPath)}: ${e.message}`
            });
          }
        }
      });

      multiviewPanel.onDidDispose(() => {
        multiviewPanel = null;
      });
    })
  );

  console.log("openvectoreditor: comamnd registered");
}

async function parseSequenceFileForMultiview(uri) {
  const ext = path.extname(uri.fsPath.toLowerCase().trim());
  if (ext === '.gb' || ext === '.gbk') {
    const doc = await vscode.workspace.openTextDocument(uri);
    const parsed = genbankToJson(doc.getText())[0].parsedSequence;
    return { ext, sequenceData: parsed };
  } else if (ext === '.fa' || ext === '.fasta') {
    const doc = await vscode.workspace.openTextDocument(uri);
    const parsed = fastaToJson(doc.getText())[0].parsedSequence;
    return { ext, sequenceData: parsed };
  } else if (ext === '.dna') {
    const fileName = path.basename(uri.fsPath);
    const basename = path.parse(fileName).name.trim();
    const buffer = await vscode.workspace.fs.readFile(uri);
    const snapgeneOutput = await snapgeneToJson(buffer, { fileName: basename });
    const parsed = snapgeneOutput[0].parsedSequence;
    delete parsed._snapgeneRawBlocks; // large binary blob, not needed in the multiview (read-only, no save-back)
    return { ext, sequenceData: parsed };
  }
  return null;
}

function buildDefaultEditorOptions() {
  const selected = vscode.workspace.getConfiguration('openvectoreditor').get('defaultViewOptions') || [];
  const has = (key) => selected.includes(key);
  return {
    readOnly: has('readOnly'),
    annotationVisibility: {
      cutsites: has('showCutSites'),
      features: has('showFeatures'),
      primers: has('showPrimers'),
      parts: has('showParts'),
    }
  };
}

function viewType(viewTypeConfig) {
  if (viewTypeConfig === 'split') {
    return `
          panelsShown: [
            [
              {
                id: "circular",
                name: "Circular Map",
                active: true,
              }
            ],
            [
              {
                id: "sequence",
                name: "Sequence Map",
                active: true,
              },
              {
                id: "properties",
                name: "Properties",
                active: false,
              },
            ]
          ]`;
  }

  return `
        panelsShown: [
          [
            {
              id: "sequence",
              name: "Sequence Map",
              active: ${viewTypeConfig === 'sequence'},
            },
            {
              id: "circular",
              name: "Circular Map",
              active: ${viewTypeConfig === 'circular'},
            },
            {
              id: "properties",
              name: "Properties",
              active: false,
            },
          ],
        ]`;
}

function getTestHtml(context, webview) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'))
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'media', 'index.umd.js'))
  );
  const defaultViewType = viewType(vscode.workspace.getConfiguration('openvectoreditor').get('viewType'));
  const defaultEditorOptions = buildDefaultEditorOptions();

  // const htmlcontent = vscode.fs.readFile(context.extensionPath, 'media', 'testWebview.html', 'utf8')
  // htmlcontent.replace('{{styleUri}}', styleUri.toString())
  // htmlcontent.replace('{{scriptUri}}', scriptUri.toString())
  // return htmlcontent;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="${styleUri}" />
          <style>
          html, body {
            height: 100%;
          }
          .ove-created-div {
            width: 100%;
            height: 100%;
            background-color: white;
          }
          </style>
        </head>
        <body>
        <script src="${scriptUri}"></script>
        <script>
			const editor = window.createVectorEditor("createDomNodeForMe", {
				withPreviewMode: false,
				editorName: "editor",
				showMenuBar: true,
				readOnly: ${defaultEditorOptions.readOnly},
				annotationVisibility: ${JSON.stringify(defaultEditorOptions.annotationVisibility)},
			});
      editor.updateEditor({
        sequenceData: {
          circular: true,
          sequence:
            "AAGG",
        },
        readOnly: ${defaultEditorOptions.readOnly},
        annotationVisibility: ${JSON.stringify(defaultEditorOptions.annotationVisibility)},
        ${defaultViewType},
      });
        </script>
        </body>
      </html>
    `;
}

function getMultiviewHtml(context, webview) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'media', 'ove.css'))
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'media', 'index.umd.js'))
  );
  const defaultEditorOptions = buildDefaultEditorOptions();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${styleUri}" />
        <style>
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          #root {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }
          /* VS Code theme colors are scoped to our own tab bar/controls chrome only --
             they must not cascade into the OVE-mounted subtree below, which assumes a
             light theme and doesn't override text color on every element itself. */
          #tab-bar-row {
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
          }
          #tab-bar-row {
            display: flex;
            align-items: center;
            gap: 4px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 6px;
            flex-shrink: 0;
          }
          #tab-bar {
            display: flex;
            gap: 4px;
            flex: 1;
            overflow-x: auto;
          }
          .ove-tab-btn, #tab-bar-row button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 10px;
            cursor: pointer;
            border-radius: 2px;
            white-space: nowrap;
          }
          .ove-tab-btn:hover, #tab-bar-row button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          /* Give tabs their own look -- distinct from the toolbar buttons, distinct from
             each other and from the bar's own background in every theme, and with an
             unmistakable accent on whichever tab is currently active. */
          .ove-tab-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-panel-border);
            border-bottom: 3px solid transparent;
          }
          .ove-tab-btn:hover {
            background: var(--vscode-list-hoverBackground);
          }
          .ove-tab-btn.active-tab {
            background: var(--vscode-button-background, #0e70c0);
            color: var(--vscode-button-foreground, #ffffff);
            border-bottom: 3px solid var(--vscode-button-background, #0e70c0);
            font-weight: 600;
          }
          .ove-tab-label {
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 160px;
          }
          .ove-tab-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 3px;
            line-height: 1;
            font-size: 13px;
            flex-shrink: 0;
          }
          .ove-tab-close:hover {
            background: rgba(128, 128, 128, 0.4);
          }
          #tab-bar-row button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          #tab-bar-row button.active:hover {
            background: var(--vscode-button-hoverBackground);
          }
          #toolbar-divider {
            width: 1px;
            align-self: stretch;
            background: var(--vscode-panel-border);
            margin: 0 4px;
          }
          #panes {
            position: relative;
            flex: 1;
            min-height: 0;
          }
          .ove-pane {
            position: absolute;
            inset: 0;
            display: none;
            flex-direction: column;
          }
          .ove-vector-editor-node, #alignment-view {
            /* OVE isn't theme-aware -- force its usual light-mode text color regardless
               of the VS Code theme, same as the single-file custom editor (which never
               applies vscode-foreground to its body in the first place). */
            color: #1e1e1e;
            background-color: white;
          }
          .ove-vector-editor-node {
            width: 100%;
            flex: 1;
            min-height: 0;
          }
          #alignment-view {
            width: 100%;
            height: 35vh;
            flex-shrink: 0;
            border-top: 2px solid var(--vscode-panel-border);
          }
          #empty-state {
            color: var(--vscode-descriptionForeground);
            padding: 4px 8px;
          }
          #query-modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          #query-modal {
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            padding: 16px;
            border-radius: 4px;
            width: 420px;
            max-width: 90%;
          }
          #query-modal input, #query-modal textarea {
            width: 100%;
            box-sizing: border-box;
            margin-top: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
          }
          #query-modal textarea {
            height: 150px;
            margin-top: 8px;
          }
          #query-modal-buttons {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <div id="root">
          <div id="tab-bar-row">
            <div id="tab-bar">
              <span id="empty-state">No sequences open &mdash; click + for a blank tab or "Open File..." to load one</span>
            </div>
            <button id="add-query-btn">Add Query</button>
            <button id="toggle-alignment-btn" class="active">Alignment</button>
            <span id="toolbar-divider"></span>
            <button id="add-blank-tab-btn" aria-label="Add empty tab">+</button>
            <button id="add-file-tab-btn" aria-label="Open sequence file as a tab">Open File...</button>
          </div>
          <div id="panes"></div>
          <div id="alignment-view"></div>
        </div>

        <div id="query-modal-overlay">
          <div id="query-modal">
            <h3 style="margin-top:0;">Add Query Sequence</h3>
            <div>Query name</div>
            <input id="query-name-input" placeholder="query" />
            <div style="margin-top:8px;">Query sequence (raw, unaligned, any length)</div>
            <textarea id="query-seq-input" placeholder="ATGC..."></textarea>
            <div id="query-modal-buttons">
              <button id="query-modal-cancel">Cancel</button>
              <button id="query-modal-submit">Align &amp; Show</button>
            </div>
          </div>
        </div>

        <script src="${scriptUri}"></script>
        <script>
          const vscode = acquireVsCodeApi();
          const DEFAULT_EDITOR_OPTIONS = ${JSON.stringify(defaultEditorOptions)};
          let tabs = [];
          let currentActiveTab = null;
          let nextEditorId = 0;
          let alignment = null;
          const alignmentId = 'ove-multi-alignment-' + Math.floor(Math.random() * 1e9);
          let alignmentVisible = true;

          const tabBarEl = document.getElementById('tab-bar');
          const panesEl = document.getElementById('panes');
          const alignmentViewEl = document.getElementById('alignment-view');
          let emptyState = document.getElementById('empty-state');
          const toggleAlignmentBtn = document.getElementById('toggle-alignment-btn');

          let blankTabCounter = 0;
          document.getElementById('add-blank-tab-btn').addEventListener('click', () => {
            blankTabCounter++;
            const name = 'Untitled-' + blankTabCounter;
            addTab(name, { sequence: '', circular: false, name: name });
          });

          document.getElementById('add-file-tab-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'requestAddFile' });
          });

          document.getElementById('add-query-btn').addEventListener('click', () => {
            document.getElementById('query-modal-overlay').style.display = 'flex';
          });

          document.getElementById('query-modal-cancel').addEventListener('click', () => {
            document.getElementById('query-modal-overlay').style.display = 'none';
          });

          document.getElementById('query-modal-submit').addEventListener('click', () => {
            const name = document.getElementById('query-name-input').value.trim() || 'query';
            const seq = document.getElementById('query-seq-input').value.trim().toUpperCase().replace(/[^ATGC]/g, '');
            document.getElementById('query-modal-overlay').style.display = 'none';
            handleQuerySubmitted(name, seq);
          });

          toggleAlignmentBtn.addEventListener('click', () => {
            alignmentVisible = !alignmentVisible;
            alignmentViewEl.style.display = alignmentVisible ? '' : 'none';
            toggleAlignmentBtn.classList.toggle('active', alignmentVisible);
          });

          try {
            alignment = window.createAlignmentView(alignmentViewEl, { id: alignmentId });
          } catch (e) {
            console.error('openvectoreditor: failed to create alignment view', e);
          }

          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'addSequence') {
              addTab(message.fileName, message.sequenceData);
            } else if (message.type === 'error') {
              alert(message.message);
            }
          });

          function addTab(fileName, sequenceData) {
            if (emptyState) {
              emptyState.remove();
              emptyState = null;
            }

            const tabBtn = document.createElement('button');
            tabBtn.className = 'ove-tab-btn';

            const tabLabel = document.createElement('span');
            tabLabel.className = 'ove-tab-label';
            tabLabel.textContent = fileName;
            tabBtn.appendChild(tabLabel);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'ove-tab-close';
            closeBtn.textContent = '×';
            closeBtn.setAttribute('aria-label', 'Close tab');
            tabBtn.appendChild(closeBtn);

            const pane = document.createElement('div');
            pane.className = 'ove-pane';
            panesEl.appendChild(pane);

            const vectorEditorNode = document.createElement('div');
            vectorEditorNode.className = 'ove-vector-editor-node';
            pane.appendChild(vectorEditorNode);

            const tab = {
              fileName: fileName,
              sequenceData: sequenceData,
              pane: pane,
              vectorEditorNode: vectorEditorNode,
              tabBtn: tabBtn,
              editor: null,
              resizeObserver: null,
              lastHeight: 0
            };

            tabBtn.addEventListener('click', (e) => {
              if (e.target === closeBtn) return;
              activateTab(tab);
            });
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              closeTab(tab);
            });

            tabBarEl.appendChild(tabBtn);
            tabs.push(tab);
            activateTab(tab);
          }

          function closeTab(tab) {
            const idx = tabs.indexOf(tab);
            if (idx === -1) return;

            try { tab.resizeObserver && tab.resizeObserver.disconnect(); } catch (e) {}
            try { tab.editor && tab.editor.close(); } catch (e) {}
            tab.pane.remove();
            tab.tabBtn.remove();
            tabs.splice(idx, 1);

            if (currentActiveTab === tab) {
              currentActiveTab = null;
              if (tabs.length > 0) {
                activateTab(tabs[Math.min(idx, tabs.length - 1)]);
              }
            }

            if (tabs.length === 0 && !emptyState) {
              emptyState = document.createElement('span');
              emptyState.id = 'empty-state';
              emptyState.textContent = 'No sequences open — click + for a blank tab or "Open File..." to load one';
              tabBarEl.appendChild(emptyState);
            }
          }

          function activateTab(tab) {
            currentActiveTab = tab;
            tabs.forEach((t) => {
              const active = t === tab;
              t.pane.style.display = active ? 'flex' : 'none';
              t.tabBtn.classList.toggle('active-tab', active);
            });
            if (!tab.editor) {
              mountEditor(tab);
            }
          }

          // Same workaround as the OVE Obsidian plugin: OVE looks up ".veEditor" globally
          // for height, so with multiple instances every tab after the first can measure
          // off the wrong node. Passing an explicit height at mount time avoids that, but
          // it's only read once, so a later resize requires a full close+remount.
          function mountEditor(tab, height) {
            const h = height || tab.vectorEditorNode.clientHeight;
            const editorName = 'ove-multi-' + (nextEditorId++);
            try {
              tab.editor = window.createVectorEditor(tab.vectorEditorNode, {
                withPreviewMode: false,
                editorName: editorName,
                showMenuBar: true,
                readOnly: DEFAULT_EDITOR_OPTIONS.readOnly,
                annotationVisibility: DEFAULT_EDITOR_OPTIONS.annotationVisibility,
                height: h
              });
              tab.editor.updateEditor({
                sequenceData: tab.sequenceData,
                panelsShown: [[{ id: 'sequence', name: 'Sequence Map', active: true }]],
                readOnly: DEFAULT_EDITOR_OPTIONS.readOnly,
                annotationVisibility: DEFAULT_EDITOR_OPTIONS.annotationVisibility,
                height: h
              });
              tab.lastHeight = h;

              if (!tab.resizeObserver) {
                const ro = new ResizeObserver(() => {
                  const newH = tab.vectorEditorNode.clientHeight;
                  if (newH > 0 && newH !== tab.lastHeight) {
                    remountEditor(tab, newH);
                  }
                });
                ro.observe(tab.vectorEditorNode);
                tab.resizeObserver = ro;
              }
            } catch (e) {
              console.error('openvectoreditor: failed to render tab', e);
            }
          }

          function remountEditor(tab, height) {
            let previousState = null;
            try { previousState = tab.editor && tab.editor.getState(); } catch (e) {}
            try { tab.editor && tab.editor.close(); } catch (e) {}
            tab.pane.appendChild(tab.vectorEditorNode);
            mountEditor(tab, height);
            if (previousState && previousState.sequenceData) {
              // Preserve whatever the user toggled at runtime (readOnly, annotationVisibility),
              // not just the config defaults mountEditor() just re-applied.
              tab.editor.updateEditor({
                sequenceData: previousState.sequenceData,
                readOnly: previousState.readOnly,
                annotationVisibility: previousState.annotationVisibility,
                height: height
              });
            }
          }

          // --- Alignment: Smith-Waterman local pairwise alignment, ported as-is from
          // the OVE Obsidian plugin. OVE's bundle only ships an alignment VIEWER
          // (createAlignmentView) -- the algorithm itself is computed here.
          const COMPLEMENT = { A: 'T', T: 'A', G: 'C', C: 'G' };
          function reverseComplement(seq) {
            let out = '';
            for (let i = seq.length - 1; i >= 0; i--) out += COMPLEMENT[seq[i]] || seq[i];
            return out;
          }

          function smithWaterman(a, b, opts) {
            const match = (opts && opts.match) || 2;
            const mismatch = (opts && opts.mismatch) || -1;
            const gap = (opts && opts.gap) || -2;
            const n = a.length, m = b.length;
            const score = [];
            for (let i = 0; i <= n; i++) score.push(new Array(m + 1).fill(0));
            let maxScore = 0, maxI = 0, maxJ = 0;
            for (let i = 1; i <= n; i++) {
              for (let j = 1; j <= m; j++) {
                const diag = score[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? match : mismatch);
                const up = score[i - 1][j] + gap;
                const left = score[i][j - 1] + gap;
                score[i][j] = Math.max(0, diag, up, left);
                if (score[i][j] > maxScore) { maxScore = score[i][j]; maxI = i; maxJ = j; }
              }
            }
            let i = maxI, j = maxJ, alignedA = '', alignedB = '';
            while (i > 0 && j > 0 && score[i][j] > 0) {
              if (score[i][j] === score[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? match : mismatch)) {
                alignedA = a[i - 1] + alignedA; alignedB = b[j - 1] + alignedB; i--; j--;
              } else if (score[i][j] === score[i - 1][j] + gap) {
                alignedA = a[i - 1] + alignedA; alignedB = '-' + alignedB; i--;
              } else {
                alignedA = '-' + alignedA; alignedB = b[j - 1] + alignedB; j--;
              }
            }
            return { alignedA: alignedA, alignedB: alignedB, score: maxScore, aStart: i, aEnd: maxI - 1, bStart: j, bEnd: maxJ - 1 };
          }

          function handleQuerySubmitted(queryName, querySeq) {
            const activeTab = currentActiveTab;
            if (!activeTab || !activeTab.editor) { alert('openvectoreditor: no active tab with a sequence loaded'); return; }
            if (!alignment) { alert('openvectoreditor: alignment viewer failed to initialize'); return; }
            if (!querySeq) { alert('openvectoreditor: query sequence must be non-empty A/T/G/C'); return; }

            const state = activeTab.editor.getState();
            const refSeqRaw = state && state.sequenceData && state.sequenceData.sequence;
            const refName = (state && state.sequenceData && state.sequenceData.name) || activeTab.fileName;
            if (!refSeqRaw) { alert('openvectoreditor: active tab has no sequence loaded yet'); return; }

            const refSeq = refSeqRaw.toUpperCase();
            const revCompSeq = reverseComplement(querySeq);
            const forward = smithWaterman(refSeq, querySeq);
            const reverse = smithWaterman(refSeq, revCompSeq);
            const isReverse = reverse.score > forward.score;
            const best = isReverse ? reverse : forward;
            const queryForDisplay = isReverse ? revCompSeq : querySeq;

            if (best.score === 0) { alert('openvectoreditor: no local match found (tried both strands)'); return; }

            const displayName = queryName + (isReverse ? ' (revcomp)' : '');
            const pairwiseAlignments = [[
              {
                sequenceData: { sequence: refSeq, name: refName, features: [] },
                alignmentData: { sequence: best.alignedA, name: refName, matchStart: best.aStart, matchEnd: best.aEnd }
              },
              {
                sequenceData: { sequence: queryForDisplay, name: displayName, features: [] },
                alignmentData: { sequence: best.alignedB, name: displayName, matchStart: best.bStart, matchEnd: best.bEnd }
              }
            ]];

            try {
              alignment.updateAlignment({ id: alignmentId, pairwiseAlignments: pairwiseAlignments });
              if (!alignmentVisible) {
                alignmentVisible = true;
                alignmentViewEl.style.display = '';
                toggleAlignmentBtn.classList.add('active');
              }
            } catch (e) {
              console.error('openvectoreditor: alignment update failed', e);
              alert('openvectoreditor: alignment update failed: ' + e.message);
            }
          }
        </script>
      </body>
    </html>
  `;
}

class DNAViewerProvider {
  constructor(context) {
    this.context = context;
  }

  async openCustomDocument(uri, openContext, token) {
    return {
      uri,
      dispose: () => { } // 파일을 닫을 때 호출됨
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
    const defaultViewType = viewType(vscode.workspace.getConfiguration('openvectoreditor').get('viewType'));
    const defaultEditorOptions = buildDefaultEditorOptions();

    let jsonOutput;
    let snapgeneRawBlocks = null; // preserved for .dna roundtrip

    if (ext === '.gb' || ext === '.gbk') {
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
      const buffer = await vscode.workspace.fs.readFile(document.uri); // Uint8Array
      const snapgeneOutput = await snapgeneToJson(buffer, { 'fileName': basename });
      const parsed = snapgeneOutput[0].parsedSequence;
      snapgeneRawBlocks = parsed._snapgeneRawBlocks || null; // keep primers/history/etc.
      delete parsed._snapgeneRawBlocks;                      // don't send large binary blobs to webview
      jsonOutput = JSON.stringify(parsed);
    }

    function toFileBytes(newJsonData) {
      if (ext === '.dna') {
        return jsonToSnapgene(Object.assign({}, newJsonData, { _snapgeneRawBlocks: snapgeneRawBlocks }));
      } else if (ext === '.gb' || ext === '.gbk') {
        return Buffer.from(jsonToGenbank(newJsonData));
      } else if (ext === '.fa' || ext === '.fasta') {
        return Buffer.from(jsonToFasta(newJsonData));
      }
    }

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "save") {
        try {
          const fileBytes = toFileBytes(message.data);
          await vscode.workspace.fs.writeFile(document.uri, fileBytes);
          vscode.window.showInformationMessage(`Saved: ${path.basename(document.uri.fsPath)}`);
        } catch (e) {
          vscode.window.showErrorMessage(`Save failed: ${e.message}`);
        }
      }
    })

    webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="${styleUri}" />
          <style>
            html, body {
              width: 100%;
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
      // All supported formats are now savable
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
				readOnly: ${defaultEditorOptions.readOnly},
				annotationVisibility: ${JSON.stringify(defaultEditorOptions.annotationVisibility)},
			});
			editor.updateEditor({
				sequenceData: ${JSON.parse(JSON.stringify(jsonOutput))},
				readOnly: ${defaultEditorOptions.readOnly},
				annotationVisibility: ${JSON.stringify(defaultEditorOptions.annotationVisibility)},
        ${defaultViewType},
        });
      
      // Initialize the editor
      isSavable();
      </script>
    </body>
    </html>
    `;
  }
}

exports.activate = activate;
