const copy = {
  zh: {
    selectPdf: '請選擇 PDF 檔案。',
    invalidFile: '只能加入 PDF 檔案。',
    readError: '無法讀取這份 PDF，檔案可能已損壞或受到密碼保護。',
    duplicate: '已略過重複檔案：',
    ready: '已準備好，可調整順序後開始合併。',
    merging: '正在合併 PDF，請稍候…',
    merged: '合併完成，下載已開始：',
    mergeError: '合併失敗。請確認所有 PDF 都能正常開啟且未受密碼保護。',
    page: '頁',
    files: '份檔案',
    totalPages: '頁',
    remove: '移除',
    reorder: '拖曳排序',
    moveUp: '上移',
    moveDown: '下移',
  },
  en: {
    selectPdf: 'Select at least one PDF file.',
    invalidFile: 'Only PDF files can be added.',
    readError: 'This PDF could not be read. It may be damaged or password-protected.',
    duplicate: 'Skipped duplicate file: ',
    ready: 'Ready. Reorder the files, then merge.',
    merging: 'Merging PDFs…',
    merged: 'Your merged PDF is ready and the download has started: ',
    mergeError: 'Merge failed. Make sure every PDF opens normally and is not password-protected.',
    page: 'pages',
    files: 'files',
    totalPages: 'pages',
    remove: 'Remove',
    reorder: 'Drag to reorder',
    moveUp: 'Move up',
    moveDown: 'Move down',
  },
};

const language = document.body.dataset.lang || 'zh';
const t = copy[language];
const state = {
  files: [],
  draggedId: null,
};

const elements = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  workspace: document.getElementById('workspace'),
  fileList: document.getElementById('fileList'),
  fileCount: document.getElementById('fileCount'),
  outputName: document.getElementById('outputName'),
  addButton: document.getElementById('addButton'),
  clearButton: document.getElementById('clearButton'),
  mergeButton: document.getElementById('mergeButton'),
  status: document.getElementById('status'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  year: document.getElementById('year'),
};

const icons = {
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
};

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.status.className = `status${type ? ` ${type}` : ''}`;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getOutputFileName() {
  const defaultName = language === 'zh' ? '合併文件' : 'merged-document';
  const enteredName = elements.outputName.value
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/[.\s]+$/g, '')
    .trim()
    .slice(0, 120);
  return `${enteredName || defaultName}.pdf`;
}

function updateSummary() {
  const pages = state.files.reduce((sum, item) => sum + item.pageCount, 0);
  elements.fileCount.textContent = `${state.files.length} ${t.files} · ${pages} ${t.totalPages}`;
}

function renderFiles() {
  elements.fileList.innerHTML = state.files.map((item, index) => `
    <li class="file-row" draggable="true" data-id="${escapeHtml(item.id)}">
      <button class="drag-handle" type="button" aria-label="${t.reorder}" title="${t.reorder}">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </button>
      <span class="file-number">${index + 1}</span>
      <div class="file-details">
        <div class="file-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</div>
        <div class="file-info">${item.pageCount} ${t.page} · ${formatBytes(item.file.size)}</div>
      </div>
      <div class="row-actions">
        <button class="move-button" type="button" data-move="-1" data-id="${escapeHtml(item.id)}" aria-label="${t.moveUp} ${escapeHtml(item.file.name)}" title="${t.moveUp}" ${index === 0 ? 'disabled' : ''}>
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </button>
        <button class="move-button" type="button" data-move="1" data-id="${escapeHtml(item.id)}" aria-label="${t.moveDown} ${escapeHtml(item.file.name)}" title="${t.moveDown}" ${index === state.files.length - 1 ? 'disabled' : ''}>
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <button class="remove-button" type="button" data-remove="${escapeHtml(item.id)}" aria-label="${t.remove} ${escapeHtml(item.file.name)}" title="${t.remove}">
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </li>
  `).join('');

  elements.workspace.classList.toggle('hidden', state.files.length === 0);
  updateSummary();
}

async function inspectPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFLib.PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  return {
    id: createId(file),
    file,
    bytes,
    pageCount: pdf.getPageCount(),
  };
}

async function addFiles(fileList) {
  const files = Array.from(fileList);
  const invalid = files.find(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));

  if (invalid) {
    setStatus(t.invalidFile, 'error');
  } else {
    let lastMessage = '';
    let lastType = '';
    for (const file of files) {
      const id = createId(file);
      const duplicate = state.files.some(item => item.id === id);
      if (duplicate) {
        lastMessage = `${t.duplicate}${file.name}`;
      } else {
        try {
          const item = await inspectPdf(file);
          state.files.push(item);
        } catch (error) {
          console.error(error);
          lastMessage = `${t.readError} (${file.name})`;
          lastType = 'error';
        }
      }
    }
    renderFiles();
    if (state.files.length > 0 && !lastMessage) {
      lastMessage = t.ready;
    }
    if (lastMessage) {
      setStatus(lastMessage, lastType);
    }
  }
  elements.fileInput.value = '';
}

function removeFile(id) {
  state.files = state.files.filter(item => item.id !== id);
  renderFiles();
  if (state.files.length > 0) {
    setStatus(t.ready);
  }
}

function reorderFiles(sourceId, targetId) {
  const sourceIndex = state.files.findIndex(item => item.id === sourceId);
  const targetIndex = state.files.findIndex(item => item.id === targetId);
  if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
    const [moved] = state.files.splice(sourceIndex, 1);
    state.files.splice(targetIndex, 0, moved);
    renderFiles();
  }
}

function moveFile(id, direction) {
  const sourceIndex = state.files.findIndex(item => item.id === id);
  const targetIndex = sourceIndex + direction;
  if (sourceIndex !== -1 && targetIndex >= 0 && targetIndex < state.files.length) {
    const [moved] = state.files.splice(sourceIndex, 1);
    state.files.splice(targetIndex, 0, moved);
    renderFiles();
  }
}

async function mergePdfs() {
  if (state.files.length === 0) {
    setStatus(t.selectPdf, 'error');
  } else {
    elements.mergeButton.disabled = true;
    setStatus(t.merging);
    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (const item of state.files) {
        const sourcePdf = await PDFLib.PDFDocument.load(item.bytes, {
          ignoreEncryption: false,
          updateMetadata: false,
        });
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      mergedPdf.setTitle(language === 'zh' ? '合併 PDF' : 'Merged PDF');
      mergedPdf.setCreator('Upliftorch PDF Merge');
      const output = await mergedPdf.save();
      const blob = new Blob([output], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const outputFileName = getOutputFileName();
      link.href = url;
      link.download = outputFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(`${t.merged}${outputFileName}`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(t.mergeError, 'error');
    } finally {
      elements.mergeButton.disabled = false;
    }
  }
}

function clearFiles() {
  state.files = [];
  renderFiles();
  elements.status.className = 'status hidden';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('pdf-merge-theme', theme);
  const useSun = theme === 'dark';
  elements.themeIcon.innerHTML = useSun ? icons.sun : icons.moon;
  elements.themeToggle.setAttribute(
    'aria-label',
    useSun
      ? (language === 'zh' ? '切換亮色模式' : 'Switch to light mode')
      : (language === 'zh' ? '切換深色模式' : 'Switch to dark mode'),
  );
}

elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.dropZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', event => addFiles(event.target.files));
elements.addButton.addEventListener('click', () => elements.fileInput.click());
elements.clearButton.addEventListener('click', clearFiles);
elements.mergeButton.addEventListener('click', mergePdfs);
elements.fileList.addEventListener('click', event => {
  const removeButton = event.target.closest('[data-remove]');
  const moveButton = event.target.closest('[data-move]');
  if (removeButton) {
    removeFile(removeButton.dataset.remove);
  } else if (moveButton) {
    moveFile(moveButton.dataset.id, Number(moveButton.dataset.move));
  }
});

['dragenter', 'dragover'].forEach(type => {
  elements.dropZone.addEventListener(type, event => {
    event.preventDefault();
    elements.dropZone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(type => {
  elements.dropZone.addEventListener(type, event => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragover');
  });
});
elements.dropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));

elements.fileList.addEventListener('dragstart', event => {
  const row = event.target.closest('.file-row');
  if (row) {
    state.draggedId = row.dataset.id;
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  }
});
elements.fileList.addEventListener('dragover', event => {
  const row = event.target.closest('.file-row');
  if (row && row.dataset.id !== state.draggedId) {
    event.preventDefault();
    elements.fileList.querySelectorAll('.drag-target').forEach(item => item.classList.remove('drag-target'));
    row.classList.add('drag-target');
  }
});
elements.fileList.addEventListener('drop', event => {
  const row = event.target.closest('.file-row');
  if (row && state.draggedId) {
    event.preventDefault();
    reorderFiles(state.draggedId, row.dataset.id);
  }
});
elements.fileList.addEventListener('dragend', () => {
  state.draggedId = null;
  elements.fileList.querySelectorAll('.file-row').forEach(row => row.classList.remove('dragging', 'drag-target'));
});

elements.themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
});

const savedTheme = localStorage.getItem('pdf-merge-theme');
const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(initialTheme);
elements.year.textContent = new Date().getFullYear();
