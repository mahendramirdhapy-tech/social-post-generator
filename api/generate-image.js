// api/generate-image.js
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Try AI Horde first (Free)
        console.log('Trying AI Horde API...');
        let imageUrl = await tryAIHorde(prompt);
        
        // If AI Horde fails, try Clipdrop
        if (!imageUrl) {
            console.log('AI Horde failed, trying Clipdrop...');
            imageUrl = await tryClipdrop(prompt);
        }
        
        // If Clipdrop fails, try Stability AI
        if (!imageUrl) {
            console.log('Clipdrop failed, trying Stability AI...');
            imageUrl = await tryStabilityAI(prompt);
        }

        if (imageUrl) {
            res.status(200).json({ 
                success: true, 
                imageUrl: imageUrl,
                source: 'AI Generated'
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'All image generation services failed',
                fallback: true
            });
        }

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            fallback: true
        });
    }
}

// 1. AI Horde API (Free)
async function tryAIHorde(prompt) {
    try {
        const response = await fetch('https://stablehorde.net/api/v2/generate/async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.AI_HORDE_API_KEY,
                'Client-Agent': 'social-post-generator/1.0'
            },
            body: JSON.stringify({
                prompt: prompt,
                params: {
                    width: 512,
                    height: 512,
                    steps: 20,
                    n: 1,
                    sampler_name: "k_euler",
                    cfg_scale: 7.5
                },
                models: ["Stable Diffusion 2.1"],
                nsfw: false,
                trusted_workers: true,
                slow_workers: true,
                censor_nsfw: false
            })
        });

        if (!response.ok) {
            throw new Error(`AI Horde HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.id) {
            throw new Error('No generation ID from AI Horde');
        }

        // Wait for image generation (max 2 minutes)
        const imageData = await waitForAIHordeImage(data.id, 120000);
        return imageData ? `data:image/webp;base64,${imageData}` : null;

    } catch (error) {
        console.log('AI Horde failed:', error.message);
        return null;
    }
}

// Wait for AI Horde image
async function waitForAIHordeImage(generationId, timeout = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${generationId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.done) {
                const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${generationId}`);
                const resultData = await resultResponse.json();
                
                if (resultData.generations && resultData.generations[0]) {
                    return resultData.generations[0].img;
                }
            }
            
            // Wait 5 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.log('AI Horde status check failed:', error.message);
            return null;
        }
    }
    
    console.log('AI Horde timeout');
    return null;
}

// 2. Clipdrop API
async function tryClipdrop(prompt) {
    try {
        const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CLIPDROP_API_KEY,
            },
            body: JSON.stringify({
                prompt: prompt,
                width: 512,
                height: 512,
                num_inference_steps: 20
            })
        });

        if (!response.ok) {
            throw new Error(`Clipdrop HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:image/png;base64,${base64}`;

    } catch (error) {
        console.log('Clipdrop failed:', error.message);
        return null;
    }
}

// 3. Stability AI API
async function tryStabilityAI(prompt) {
    try {
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}`,
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 512,
                width: 512,
                steps: 30,
                samples: 1,
            })
        });

        if (!response.ok) {
            throw new Error(`Stability AI HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.artifacts && data.artifacts[0]) {
            return `data:image/png;base64,${data.artifacts[0].base64}`;
        } else {
            throw new Error('No image generated by Stability AI');
        }

    } catch (error) {
        console.log('Stability AI failed:', error.message);
        return null;
    }
}
