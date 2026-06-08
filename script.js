/**
 * ==========================================================================
 * CODENAME: TTS-A PRO PRODUCTION ENGINE (BUG-FREE BUILD)
 * ARCHITECTURE: Élite Modulaire Orientée Composants Événementiels
 * ==========================================================================
 */

class TTSAStudio {
    constructor() {
        if (!('speechSynthesis' in window)) {
            this.handleSystemCrash("API SpeechSynthesis non supportée sur ce navigateur.");
            return;
        }

        this.synth = window.speechSynthesis;
        this.wakeLock = null;
        
        this.state = {
            isSpeaking: false,
            isPaused: false,
            segments: [],
            currentSegmentIndex: 0,
            voices: [],
            savedBooks: this.loadLocalBookshelfRegistry(),
            theme: localStorage.getItem('ttsa_theme') || 'dark'
        };

        // Empêche la mise en veille audio sur les terminaux Webkit et Android
        this.silentAudioLoop = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        this.silentAudioLoop.loop = true;

        this.initDOMReferences();
        this.initCoreSystemEngine();
    }

    initDOMReferences() {
        this.dom = {
            heroSection: document.getElementById('hero-onboarding'),
            startBtn: document.getElementById('start-experience'),
            mainApp: document.getElementById('main-app'),
            themeToggle: document.getElementById('theme-toggle-btn'),
            textInput: document.getElementById('text-input'),
            readView: document.getElementById('read-view'),
            playBtn: document.getElementById('play-btn'),
            stopBtn: document.getElementById('stop-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            voiceSelect: document.getElementById('voice-select'),
            fileInput: document.getElementById('file-input'),
            fileLabel: document.getElementById('file-upload-label'),
            status: document.getElementById('status'),
            charCounter: document.getElementById('char-counter'),
            readingTime: document.getElementById('reading-time'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            sectionList: document.getElementById('section-list'),
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            ebookModal: document.getElementById('ebook-modal'),
            modalBody: document.getElementById('modal-body'),
            closeModal: document.getElementById('close-modal-btn'),
            rate: document.getElementById('rate'),
            pitch: document.getElementById('pitch'),
            volume: document.getElementById('volume'),
            rateValue: document.getElementById('rate-value'),
            pitchValue: document.getElementById('pitch-value'),
            volumeValue: document.getElementById('volume-value'),
            musicInput: document.getElementById('music-input'),
            bgAudio: document.getElementById('bg-audio'),
            musicVolume: document.getElementById('music-volume'),
            toastContainer: document.getElementById('toast-container')
        };
    }

    initCoreSystemEngine() {
        this.applyThemeConfiguration(this.state.theme);
        this.bindSystemEventInterchanges();
        this.populateHardwareVoiceRegistry();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.populateHardwareVoiceRegistry();
        }

        this.evaluatingWorkspaceInputMetrics();
    }

    bindSystemEventInterchanges() {
        this.dom.startBtn.addEventListener('click', () => {
            this.dom.heroSection.classList.add('hidden');
            this.dom.mainApp.classList.remove('hidden');
            this.showToastMessage("Bienvenue dans votre espace Premium TTS-A.");
        });
    
        this.dom.playBtn.addEventListener('click', () => this.executeStudioPlaybackSequence());
        this.dom.pauseBtn.addEventListener('click', () => this.suspendStudioPlaybackSequence());
        this.dom.stopBtn.addEventListener('click', () => this.terminateStudioPlaybackSequence());

        this.dom.fileInput.addEventListener('change', (e) => this.handleExternalDocumentImport(e));
        this.dom.textInput.addEventListener('input', () => this.evaluatingWorkspaceInputMetrics());

        this.dom.rate.addEventListener('input', (e) => { this.dom.rateValue.textContent = (e.target.value / 10).toFixed(1); });
        this.dom.pitch.addEventListener('input', (e) => { this.dom.pitchValue.textContent = (e.target.value / 10).toFixed(1); });
        this.dom.volume.addEventListener('input', (e) => { this.dom.volumeValue.textContent = e.target.value; });

        this.dom.musicInput.addEventListener('change', (e) => this.handleBackgroundMusicChannel(e));
        this.dom.musicVolume.addEventListener('input', (e) => { this.dom.bgAudio.volume = e.target.value; });

        this.dom.themeToggle.addEventListener('click', () => this.rotateThemeConfiguration());
        this.dom.saveBtn.addEventListener('click', () => this.persistActiveDocumentToStorage());
        this.dom.loadBtn.addEventListener('click', () => this.renderLibraryModalInterface());
        this.dom.closeModal.addEventListener('click', () => this.dom.ebookModal.classList.add('hidden'));
    }

    populateHardwareVoiceRegistry() {
        this.state.voices = this.synth.getVoices();
        if (this.state.voices.length === 0) return;

        this.dom.voiceSelect.innerHTML = '';
        let initialSelectionPointerIndex = 0;

        this.state.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang.toUpperCase()})`;
            
            if (voice.lang.startsWith('fr') && initialSelectionPointerIndex === 0) {
                initialSelectionPointerIndex = index;
            }
            this.dom.voiceSelect.appendChild(option);
        });

        this.dom.voiceSelect.value = initialSelectionPointerIndex;
        this.dom.status.textContent = `Moteur audio prêt • ${this.state.voices.length} voix`;
    }

    executeStudioPlaybackSequence() {
        this.dom.status.innerHTML = `<span class="playing-pulse"></span> Lecture en cours...`;
        if (this.state.isPaused) {
            this.synth.resume();
            this.state.isPaused = false;
            this.state.isSpeaking = true;
            this.updateSystemInterfaceControlState();
            this.dom.status.textContent = "Lecture relancée";
            return;
        }

        const cleanRawText = this.dom.textInput.value.trim();
        if (!cleanRawText) return;

        this.state.segments = this.executeIntelligentSegmentSplitter(cleanRawText);
        this.state.currentSegmentIndex = 0;
        this.state.isSpeaking = true;
        this.state.isPaused = false;

        this.allocateWakeLockDeviceResource();
        this.silentAudioLoop.play().catch(() => {});

        this.dom.textInput.classList.add('hidden');
        this.dom.readView.classList.remove('hidden');
        this.dom.progressContainer.classList.remove('hidden');

        this.renderDocumentNavigationIndex();
        this.generateSynchronizedViewCanvas(this.state.segments);
        this.dispatchSegmentStreamPlayback();
    }

    suspendStudioPlaybackSequence() {
        this.dom.status.textContent = `⏸️ Lecture suspendue`;
        if (this.synth.speaking && !this.state.isPaused) {
            this.synth.pause();
            this.state.isSpeaking = false;
            this.state.isPaused = true;
            this.updateSystemInterfaceControlState();
            this.dom.status.textContent = "Lecture suspendue";
        }
    }

    terminateStudioPlaybackSequence() {
        this.dom.status.textContent = `⏹️ Studio réinitialisé`;
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.synth.cancel();
        this.releaseWakeLockDeviceResource();
        this.state.currentSegmentIndex = 0;

        this.dom.textInput.classList.remove('hidden');
        this.dom.readView.classList.add('hidden');
        this.dom.progressContainer.classList.add('hidden');
        
        this.updateSystemInterfaceControlState();
        this.dom.status.textContent = "Studio réinitialisé";
    }

    dispatchSegmentStreamPlayback() {
        if (this.state.currentSegmentIndex >= this.state.segments.length) {
            this.showToastMessage("Lecture terminée.");
            this.terminateStudioPlaybackSequence();
            return;
        }

        if (!this.state.isSpeaking || this.state.isPaused) return;

        this.applyActiveHighlightingContext(this.state.currentSegmentIndex);
        this.synchronizeTimelineProgressRail();

        const activeSegmentText = this.state.segments[this.state.currentSegmentIndex];
        const utteranceInstance = new SpeechSynthesisUtterance(activeSegmentText);

        const selectedVoiceIndex = this.dom.voiceSelect.value;
        if (this.state.voices[selectedVoiceIndex]) {
            utteranceInstance.voice = this.state.voices[selectedVoiceIndex];
        }

        utteranceInstance.rate = parseFloat(this.dom.rate.value) / 10;
        utteranceInstance.pitch = parseFloat(this.dom.pitch.value) / 10;
        utteranceInstance.volume = parseFloat(this.dom.volume.value) / 100;

        utteranceInstance.onboundary = (e) => {
            if (e.name === 'word') {
                this.executeWordHighlightSyncNode(this.state.currentSegmentIndex, e.charIndex);
            }
        };

        utteranceInstance.onend = () => {
    // Si l'utilisateur a cliqué sur Stop, this.state.isSpeaking devient "false"
    // Le "if" bloque l'enchaînement et empêche de lire la phrase suivante !
    if (this.state.isSpeaking && !this.state.isPaused) {
        this.state.currentSegmentIndex++;
        this.dispatchSegmentStreamPlayback();
    }
};

        utteranceInstance.onerror = (err) => {
            if (err.error !== 'interrupted' && this.state.isSpeaking) {
                console.error("Moteur vocal erreur:", err);
                this.dom.status.textContent = "Erreur de flux vocal";
            }
        };

        this.synth.speak(utteranceInstance);
    }

    executeIntelligentSegmentSplitter(text) {
        return text.split(/[.\n!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    evaluatingWorkspaceInputMetrics() {
        const textLength = this.dom.textInput.value.length;
        this.dom.charCounter.innerHTML = `<i class="fa-solid fa-font"></i> ${textLength} car.`;
        
        const wordCount = this.dom.textInput.value.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedMinutes = Math.ceil(wordCount / 140);
        this.dom.readingTime.innerHTML = `<i class="fa-solid fa-clock"></i> ~${estimatedMinutes} min d'écoute`;

        this.dom.saveBtn.disabled = textLength === 0;
        this.updateSystemInterfaceControlState();
    }

    generateSynchronizedViewCanvas(segments) {
        this.dom.readView.innerHTML = '';
        segments.forEach((seg, idx) => {
            const span = document.createElement('span');
            span.id = `seg-node-${idx}`;
            span.style.display = 'block';
            span.style.marginBottom = '12px';
            span.textContent = seg;
            this.dom.readView.appendChild(span);
        });
    }

    applyActiveHighlightingContext(targetIndex) {
        document.querySelectorAll('.segment-highlight').forEach(el => el.classList.remove('segment-highlight'));
        
        const targetNode = document.getElementById(`seg-node-${targetIndex}`);
        if (targetNode) {
            targetNode.classList.add('segment-highlight');
            targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.querySelectorAll('.section-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.index) === targetIndex);
        });
    }

    executeWordHighlightSyncNode(segmentIndex, characterOffset) {
        const segmentNode = document.getElementById(`seg-node-${segmentIndex}`);
        if (!segmentNode) return;

        const rawText = this.state.segments[segmentIndex];
        const subStringData = rawText.substring(characterOffset);
        const matchData = subStringData.match(/^[\w\dÀ-ÿ]+/);
        const wordLength = matchData ? matchData[0].length : 0;

        if (wordLength === 0) return;

        const leftSegmentPart = rawText.substring(0, characterOffset);
        const targetedWordPart = rawText.substring(characterOffset, characterOffset + wordLength);
        const rightSegmentPart = rawText.substring(characterOffset + wordLength);

        segmentNode.innerHTML = `${leftSegmentPart}<span class="word-highlight">${targetedWordPart}</span>${rightSegmentPart}`;
    }

    synchronizeTimelineProgressRail() {
        if (this.state.segments.length === 0) return;
        const rawPercent = (this.state.currentSegmentIndex / this.state.segments.length) * 100;
        const securePercent = Math.min(Math.round(rawPercent), 100);
        
        this.dom.progressFill.style.width = `${securePercent}%`;
        this.dom.progressText.textContent = `${securePercent}% lu`;
    }

    renderDocumentNavigationIndex() {
        this.dom.sectionList.innerHTML = '';
        this.state.segments.forEach((seg, idx) => {
            if (idx % 2 === 0) {
                const div = document.createElement('div');
                div.className = 'section-item';
                div.dataset.index = idx;
                
                const previewText = seg.substring(0, 35) + "...";
                div.innerHTML = `<strong>Section ${Math.floor(idx / 2) + 1}</strong><small>${previewText}</small>`;
                
                div.addEventListener('click', () => {
                    this.state.isSpeaking = true;
                    this.state.isPaused = false;
                    this.synth.cancel();
                    this.state.currentSegmentIndex = idx;
                    this.dispatchSegmentStreamPlayback();
                });
                this.dom.sectionList.appendChild(div);
            }
        });
    }

    async handleExternalDocumentImport(e) {
        const attachedFile = e.target.files[0];
        if (!attachedFile) return;

        this.dom.fileLabel.textContent = attachedFile.name;
        this.dom.status.textContent = "Extraction en cours...";

        if (attachedFile.type === "application/pdf") {
            try {
                const fileReader = new FileReader();
                fileReader.onload = async (event) => {
                    const typedArray = new Uint8Array(event.target.result);
                    
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                    
                    const pdfDocument = await pdfjsLib.getDocument(typedArray).promise;
                    let continuousPdfExtractedText = "";
                    
                    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                        const pageNode = await pdfDocument.getPage(pageNum);
                        const contentNode = await pageNode.getTextContent();
                        continuousPdfExtractedText += contentNode.items.map(item => item.str).join(' ') + "\n";
                    }
                    
                    this.dom.textInput.value = continuousPdfExtractedText;
                    this.evaluatingWorkspaceInputMetrics();
                    this.showToastMessage(`PDF importé : ${pdfDocument.numPages} pages.`);
                };
                fileReader.readAsArrayBuffer(attachedFile);
            } catch (err) {
                console.error(err);
                this.showToastMessage("Échec de la lecture du fichier PDF.");
            }
        } else {
            const textReader = new FileReader();
            textReader.onload = (event) => {
                this.dom.textInput.value = event.target.result;
                this.evaluatingWorkspaceInputMetrics();
                this.showToastMessage("Document TXT chargé.");
            };
            textReader.readAsText(attachedFile);
        }
    }

    handleBackgroundMusicChannel(e) {
        const audioFile = e.target.files[0];
        if (!audioFile) return;
        this.dom.bgAudio.src = URL.createObjectURL(audioFile);
        this.dom.bgAudio.volume = parseFloat(this.dom.musicVolume.value);
        this.dom.bgAudio.play().catch(() => {});
        this.showToastMessage("Musique d'ambiance connectée.");
    }

    loadLocalBookshelfRegistry() {
        try {
            return JSON.parse(localStorage.getItem('ttsa_bookshelf')) || [];
        } catch {
            return [];
        }
    }

    persistActiveDocumentToStorage() {
        const cleanContent = this.dom.textInput.value.trim();
        if (!cleanContent) return;

        const newBookPayload = {
            id: Date.now(),
            title: cleanContent.substring(0, 25) + "...",
            content: cleanContent,
            timestamp: new Date().toLocaleDateString()
        };

        this.state.savedBooks.push(newBookPayload);
        localStorage.setItem('ttsa_bookshelf', JSON.stringify(this.state.savedBooks));
        this.showToastMessage("Texte sauvegardé localement.");
    }

    renderLibraryModalInterface() {
        this.dom.modalBody.innerHTML = '';
        if (this.state.savedBooks.length === 0) {
            this.dom.modalBody.innerHTML = '<div class="empty-state">Aucun élément dans la bibliothèque.</div>';
        } else {
            this.state.savedBooks.forEach(book => {
                const row = document.createElement('div');
                row.className = 'ebook-item';
                row.innerHTML = `
                    <div>
                        <strong>${book.title}</strong>
                        <div style="font-size:11px; color:var(--text-muted)">Sauvegardé le ${book.timestamp}</div>
                    </div>
                    <button class="icon-btn delete-btn" data-id="${book.id}"><i class="fa-solid fa-trash-can"></i></button>
                `;
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-btn')) {
                        e.stopPropagation();
                        this.purgeDocumentFromBookshelfRegistry(book.id);
                        return;
                    }
                    this.dom.textInput.value = book.content;
                    this.evaluatingWorkspaceInputMetrics();
                    this.dom.ebookModal.classList.add('hidden');
                    this.showToastMessage("Document chargé.");
                });
                this.dom.modalBody.appendChild(row);
            });
        }
        this.dom.ebookModal.classList.remove('hidden');
    }

    purgeDocumentFromBookshelfRegistry(bookId) {
        this.state.savedBooks = this.state.savedBooks.filter(b => b.id !== parseInt(bookId));
        localStorage.setItem('ttsa_bookshelf', JSON.stringify(this.state.savedBooks));
        this.renderLibraryModalInterface();
        this.showToastMessage("Élément supprimé.");
    }

    applyThemeConfiguration(targetTheme) {
        document.documentElement.setAttribute('data-theme', targetTheme);
        const iconNode = this.dom.themeToggle.querySelector('i');
        if (iconNode) {
            iconNode.className = targetTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        localStorage.setItem('ttsa_theme', targetTheme);
    }

    rotateThemeConfiguration() {
        const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.applyThemeConfiguration(nextTheme);
    }

    showToastMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-frame';
        toast.textContent = message;
        this.dom.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 50);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateSystemInterfaceControlState() {
        const inputIsFilled = this.dom.textInput.value.trim().length > 0;
        this.dom.playBtn.disabled = !inputIsFilled;
        this.dom.stopBtn.disabled = !this.state.isSpeaking && !this.state.isPaused;
        this.dom.pauseBtn.disabled = !this.state.isSpeaking || this.state.isPaused;
    }

    async allocateWakeLockDeviceResource() {
        if ('wakeLock' in navigator) {
            try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch {}
        }
    }

    releaseWakeLockDeviceResource() {
        if (this.wakeLock) {
            this.wakeLock.release().then(() => this.wakeLock = null);
        }
    }

    handleSystemCrash(msg) {
        console.error(msg);
        if (this.dom.status) this.dom.status.textContent = `Erreur: ${msg}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Sélection des cartes d'onboarding
    const cards = document.querySelectorAll('#hero-onboarding .card');
    
    // Les cartes s'animent après que les titres principaux ont commencé à apparaître
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 600 + (150 * index)); // Démarre à 600ms avec un écart de 150ms par carte
    });
});
document.addEventListener('DOMContentLoaded', () => {
    window.TTSAStudioInstance = new TTSAStudio();
});