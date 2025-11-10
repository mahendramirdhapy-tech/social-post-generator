// api/generate-post.js
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request for CORS
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

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
                'HTTP-Referer': 'https://social-post-generator.vercel.app',
                'X-Title': 'Social Post Generator'
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [{ 
                    role: "user", 
                    content: prompt 
                }],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error('OpenRouter API error:', errorText);
            return res.status(500).json({ 
                error: `OpenRouter API error: ${openRouterResponse.status}` 
            });
        }

        const data = await openRouterResponse.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ 
                error: 'Invalid response from AI service' 
            });
        }

        res.status(200).json({
            content: data.choices[0].message.content,
            usage: data.usage
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message 
        });
    }
}
