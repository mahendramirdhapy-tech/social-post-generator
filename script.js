// DOM Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginModal = document.getElementById('login-modal');
const closeModal = document.querySelector('.close-modal');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const saveBtn = document.getElementById('save-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const previewTitle = document.getElementById('preview-title');
const previewCaption = document.getElementById('preview-caption');
const previewHashtags = document.getElementById('preview-hashtags');
const historyList = document.getElementById('history-list');
const generationCounter = document.getElementById('generation-counter');
const loadingIndicator = document.getElementById('loading-indicator');
const platformOptions = document.querySelectorAll('.platform-option');
const navItems = document.querySelectorAll('.nav-item');
const apiStatus = document.getElementById('api-status');

// State variables
let generationCount = 0;
let isLoggedIn = false;
let history = [];

// Event Listeners
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    switchTab('login');
});

signupBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    switchTab('signup');
});

closeModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        switchTab(tabId);
    });
});

platformOptions.forEach(option => {
    option.addEventListener('click', () => {
        option.classList.toggle('active');
    });
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

generateBtn.addEventListener('click', generatePost);
copyBtn.addEventListener('click', copyToClipboard);
saveBtn.addEventListener('click', savePost);
regenerateBtn.addEventListener('click', regeneratePost);

// Functions
function switchTab(tabId) {
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Serverless API Call
async function generateWithOpenRouter(prompt) {
    try {
        const response = await fetch('/api/generate-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.content;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Main post generation function
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
        
        // Update preview
        updatePreview(parsedContent);
        
        // Add to history
        addToHistory(parsedContent);
        
    } catch (error) {
        console.error('पोस्ट जनरेट करने में त्रुटि:', error);
        // Final fallback to demo content
        const topic = document.getElementById('post-topic').value;
        const tone = document.getElementById('post-tone').value;
        const length = document.getElementById('post-length').value;
        const demoContent = generateDemoContent(topic, tone, length);
        demoContent.source = 'Demo (Network Error)';
        updatePreview(demoContent);
        addToHistory(demoContent);
        
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

function parseGeneratedContent(content, topic, tone, length) {
    let title = `${topic} के बारे में रोचक जानकारी`;
    let caption = `यह ${topic} के बारे में एक दिलचस्प पोस्ट है।`;
    let hashtags = `#${topic.replace(/\s+/g, '')} #जानकारी`;

    try {
        const titleMatch = content.match(/TITLE:\s*(.*?)(?=CAPTION:|HASHTAGS:|$)/s);
        const captionMatch = content.match(/CAPTION:\s*(.*?)(?=HASHTAGS:|$)/s);
        const hashtagsMatch = content.match(/HASHTAGS:\s*(.*?)$/s);
        
        if (titleMatch) title = titleMatch[1].trim();
        if (captionMatch) caption = captionMatch[1].trim();
        if (hashtagsMatch) hashtags = hashtagsMatch[1].trim();
    } catch (e) {
        console.log('Using fallback content due to parsing error');
    }

    return {
        title: title,
        caption: caption,
        hashtags: hashtags,
        topic: topic,
        tone: tone,
        length: length,
        timestamp: new Date().toLocaleString('hi-IN')
    };
}

function generateDemoContent(topic, tone, length) {
    const titles = {
        professional: `${topic} - पेशेवर जानकारी`,
        casual: `${topic} के बारे में आसान बातचीत`,
        funny: `${topic} पर मजेदार टेक`,
        inspirational: `${topic} से प्रेरणा`,
        educational: `${topic} - जानें और सीखें`
    };
    
    const captions = {
        short: `आज ${topic} के बारे में बात करते हैं! यह एक बहुत ही रोचक विषय है जिसके बारे में हर किसी को पता होना चाहिए। क्या आपने कभी इसके बारे में सोचा है?`,
        medium: `${topic} आज के समय में बहुत महत्वपूर्ण हो गया है। इस पोस्ट में हम इसके विभिन्न पहलुओं पर चर्चा करेंगे और जानेंगे कि यह हमारे जीवन को कैसे प्रभावित करता है। आशा है आपको यह जानकारी उपयोगी लगेगी! अपने विचार कमेंट में जरूर बताएं।`,
        long: `${topic} पर यह विस्तृत पोस्ट आपको इस विषय की गहरी समझ प्रदान करेगी। हम चर्चा करेंगे कि कैसे ${topic} ने हमारे दैनिक जीवन को बदल दिया है, इसके फायदे और चुनौतियाँ क्या हैं, और भविष्य में इसकी क्या संभावनाएँ हैं। यह जानकारी आपके लिए बहुत उपयोगी साबित हो सकती है। पोस्ट को लाइक और शेयर करना न भूलें!`
    };
    
    const hashtags = {
        professional: `#${topic.replace(/\s+/g, '')} #पेशेवर #व्यवसाय #जानकारी #टिप्स`,
        casual: `#${topic.replace(/\s+/g, '')} #आरामदायक #बातचीत #दोस्त #जिंदगी`,
        funny: `#${topic.replace(/\s+/g, '')} #मजाक #हंसी #मनोरंजन #कॉमेडी #फनी`,
        inspirational: `#${topic.replace(/\s+/g, '')} #प्रेरणा #सफलता #मोटिवेशन #जीवन`,
        educational: `#${topic.replace(/\s+/g, '')} #शिक्षा #सीखना #ज्ञान #तथ्य`
    };
    
    return {
        title: titles[tone] || titles.professional,
        caption: captions[length] || captions.medium,
        hashtags: hashtags[tone] || hashtags.professional,
        topic: topic,
        tone: tone,
        length: length,
        timestamp: new Date().toLocaleString('hi-IN')
    };
}

function updatePreview(content) {
    previewTitle.textContent = content.title;
    previewCaption.textContent = content.caption;
    previewHashtags.textContent = content.hashtags;
}

function copyToClipboard() {
    const textToCopy = `${previewTitle.textContent}\n\n${previewCaption.textContent}\n\n${previewHashtags.textContent}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            alert('पोस्ट क्लिपबोर्ड पर कॉपी हो गई है!');
        })
        .catch(err => {
            console.error('कॉपी करने में त्रुटि: ', err);
            alert('कॉपी करने में विफल। कृपया मैन्युअल रूप से कॉपी करें।');
        });
}

function savePost() {
    if (!isLoggedIn) {
        alert('पोस्ट सेव करने के लिए कृपया लॉग इन करें।');
        loginModal.style.display = 'flex';
        return;
    }
    
    const post = {
        title: previewTitle.textContent,
        caption: previewCaption.textContent,
        hashtags: previewHashtags.textContent,
        timestamp: new Date().toLocaleString('hi-IN')
    };
    
    alert('पोस्ट सफलतापूर्वक सेव हो गई है!');
}

function regeneratePost() {
    generatePost();
}

function addToHistory(post) {
    history.unshift(post);
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-history"></i>
                </div>
                <p>अभी तक कोई पोस्ट जनरेट नहीं की गई है</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    history.forEach((post, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-topic">${post.topic} <small style="color: var(--primary);">(${post.source})</small></div>
            <div class="history-preview">${post.caption.substring(0, 80)}...</div>
            <div class="history-meta">
                <span>${post.tone}</span>
                <span>${post.timestamp}</span>
            </div>
        `;
        historyItem.addEventListener('click', () => {
            previewTitle.textContent = post.title;
            previewCaption.textContent = post.caption;
            previewHashtags.textContent = post.hashtags;
        });
        historyList.appendChild(historyItem);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateHistoryDisplay();
    
    // Test API connection on load
    setTimeout(() => {
        apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> सिस्टम तैयार है - पोस्ट जनरेट करें!';
        apiStatus.className = 'api-status connected';
    }, 1000);
});
