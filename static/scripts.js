document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('inference-form');
    const fileInput = document.getElementById('image-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const submitBtn = document.getElementById('submit-btn');
    const dropZone = document.getElementById('drop-zone');
    const fileLabel = document.querySelector('.file-label');
    
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');
    
    const loadingState = document.getElementById('loading-state');
    const resultsPanel = document.getElementById('results-panel');
    const errorPanel = document.getElementById('error-panel');
    
    const resultGender = document.getElementById('result-gender');
    const resultAge = document.getElementById('result-age');
    const resultRace = document.getElementById('result-race');
    const errorMessage = document.getElementById('error-message');

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            fileLabel.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            fileLabel.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    }, false);

    // Handle file selection via click
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileSelection(file);
    });

    function handleFileSelection(file) {
        if (file && file.type.startsWith('image/')) {
            // Update text
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.style.color = 'var(--text-primary)';
            submitBtn.disabled = false;
            
            // Generate preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                dropZone.classList.add('hidden');
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            resetFileState();
        }
        
        // Reset state panels when a new file is chosen
        hideAllPanels();
    }

    // Clear image
    clearImageBtn.addEventListener('click', () => {
        resetFileState();
        hideAllPanels();
    });

    function resetFileState() {
        fileInput.value = '';
        fileNameDisplay.textContent = 'Click or drag an image here';
        fileNameDisplay.style.color = 'var(--text-secondary)';
        submitBtn.disabled = true;
        
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) return;

        // Update UI state
        submitBtn.disabled = true;
        hideAllPanels();
        loadingState.classList.remove('hidden');

        // Prepare data
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            
            // Validate response format
            if (!('gender' in data) || !('age' in data) || !('race' in data)) {
                throw new Error('Invalid response format from server');
            }

            // Update results UI
            resultGender.textContent = data.gender;
            // Format age (round if it's a number, otherwise just display string)
            const formattedAge = typeof data.age === 'number' ? Math.round(data.age) : data.age;
            resultAge.textContent = formattedAge;
            resultRace.textContent = data.race || '-';

            // Show results
            loadingState.classList.add('hidden');
            resultsPanel.classList.remove('hidden');

        } catch (error) {
            console.error('Inference error:', error);
            
            // Show error UI
            errorMessage.textContent = error.message || 'An error occurred during inference.';
            loadingState.classList.add('hidden');
            errorPanel.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
        }
    });

    function hideAllPanels() {
        loadingState.classList.add('hidden');
        resultsPanel.classList.add('hidden');
        errorPanel.classList.add('hidden');
    }
});
