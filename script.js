// DOM Elements - Add image related elements
const previewImage = document.getElementById('preview-image');
const generateImageBtn = document.getElementById('generate-image-btn');
const imageStatus = document.getElementById('image-status');

// Add this to your existing event listeners
generateImageBtn.addEventListener('click', generateImageForPost);

// Image Generation Function
async function generateImageForPost() {
    const topic = document.getElementById('post-topic').value;
    if (!topic) {
        alert('कृपया पहले कोई विषय दर्ज करें');
        return;
    }

    // Show image generation status
    imageStatus.style.display = 'block';
    imageStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> इमेज जनरेट हो रही है...';
    imageStatus.className = 'image-status generating';
    generateImageBtn.disabled = true;

    try {
        const imagePrompt = `social media post image about ${topic}, high quality, trending, vibrant colors, professional photography`;
        
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: imagePrompt })
        });

        const data = await response.json();

        if (data.success && data.imageUrl) {
            // Show generated image
            previewImage.innerHTML = `<img src="${data.imageUrl}" alt="Generated image for ${topic}" />`;
            imageStatus.innerHTML = `<i class="fas fa-check-circle"></i> इमेज जनरेट हो गई! (${data.source})`;
            imageStatus.className = 'image-status success';
        } else {
            // Fallback to gradient background
            showFallbackImage(topic);
            imageStatus.innerHTML = '<i class="fas fa-info-circle"></i> डेमो इमेज - AI अस्थायी रूप से उपलब्ध नहीं';
            imageStatus.className = 'image-status error';
        }

    } catch (error) {
        console.error('Image generation error:', error);
        showFallbackImage(topic);
        imageStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> इमेज जनरेट नहीं हो सकी';
        imageStatus.className = 'image-status error';
    } finally {
        generateImageBtn.disabled = false;
        // Hide status after 5 seconds
        setTimeout(() => {
            imageStatus.style.display = 'none';
        }, 5000);
    }
}

// Fallback Image Function
function showFallbackImage(topic) {
    const colors = {
        'technology': ['#667eea', '#764ba2'],
        'travel': ['#f093fb', '#f5576c'],
        'health': ['#4facfe', '#00f2fe'],
        'education': ['#43e97b', '#38f9d7'],
        'food': ['#fa709a', '#fee140'],
        'default': ['#667eea', '#764ba2']
    };

    const topicLower = topic.toLowerCase();
    let gradientColors = colors.default;

    for (const [key, value] of Object.entries(colors)) {
        if (topicLower.includes(key)) {
            gradientColors = value;
            break;
        }
    }

    previewImage.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 14px; background: linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%);">
            <i class="fas fa-image" style="font-size: 48px; margin-bottom: 10px;"></i>
            <div>${topic}</div>
            <small>डेमो इमेज</small>
        </div>
    `;
}

// Update main generatePost function to include image generation
async function generatePost() {
    if (generationCount >= 10 && !isLoggedIn) {
        alert('10 पोस्ट जनरेट करने के बाद, आपको साइन अप/लॉग इन करना होगा।');
        loginModal.style.display = 'flex';
        return;
    }

    const topic = document.getElementById('post-topic').value;
    if (!topic) {
        alert('कृपया पोस्ट का विषय दर्ज करें');
        return;
    }

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    generateBtn.disabled = true;
    apiStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> AI से पोस्ट जनरेट हो रही है...';
    apiStatus.className = 'api-status connected';

    try {
        const tone = document.getElementById('post-tone').value;
        const length = document.getElementById('post-length').value;
        const platforms = Array.from(document.querySelectorAll('.platform-option.active'))
                              .map(option => option.getAttribute('data-platform'));
        
        // Generate text content
        const textPrompt = `Create a social media post in Hindi about "${topic}" with ${tone} tone for ${platforms.join(', ')}. 
        Length: ${length}
        Include: 1. Engaging title, 2. Main content, 3. Relevant hashtags
        Format: TITLE: [title] CAPTION: [caption] HASHTAGS: [hashtags]`;
        
        let generatedContent = await generateWithOpenRouter(textPrompt);
        
        let parsedContent;
        if (generatedContent) {
            parsedContent = parseGeneratedContent(generatedContent, topic, tone, length);
            parsedContent.source = 'AI Generated';
            apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> AI से पोस्ट जनरेट हो गई!';
        } else {
            // Fallback to demo content
            parsedContent = generateDemoContent(topic, tone, length);
            parsedContent.source = 'Demo Content';
            apiStatus.innerHTML = '<i class="fas fa-info-circle"></i> डेमो कंटेंट - AI अस्थायी रूप से उपलब्ध नहीं';
            apiStatus.className = 'api-status error';
        }
        
        // Update preview with text content
        updatePreview(parsedContent);
        
        // Auto-generate image
        await generateImageForPost();
        
        // Add to history
        addToHistory(parsedContent);
        
    } catch (error) {
        console.error('पोस्ट जनरेट करने में त्रुटि:', error);
        const topic = document.getElementById('post-topic').value;
        const tone = document.getElementById('post-tone').value;
        const length = document.getElementById('post-length').value;
        const demoContent = generateDemoContent(topic, tone, length);
        demoContent.source = 'Demo (Network Error)';
        updatePreview(demoContent);
        addToHistory(demoContent);
        
        // Show fallback image
        showFallbackImage(topic);
        
        apiStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> नेटवर्क त्रुटि - डेमो कंटेंट दिखाया जा रहा है';
        apiStatus.className = 'api-status error';
    } finally {
        loadingIndicator.style.display = 'none';
        generateBtn.disabled = false;
        
        // Update generation count
        if (!isLoggedIn) {
            generationCount++;
            generationCounter.textContent = `${generationCount}/10`;
        }
    }
}
