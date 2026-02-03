import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sanitizeInput = (value) => value.replace(/[<>]/g, '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body || {};
  const safePrompt = sanitizeInput(prompt || '');

  if (!safePrompt) {
    res.status(400).json({ error: 'Prompt required' });
    return;
  }

  try {
    const claudeRes = await anthropic.messages.create({
      model: 'claude-3-5-sonnet',
      messages: [
        {
          role: 'user',
          content: `Generate a note article with title, body, and summary for: ${safePrompt}`
        }
      ],
      max_tokens: 2000
    });

    const text = claudeRes.content?.[0]?.text ?? '';
    const summary = text.slice(0, 200) + '...';

    const imageRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A 16:9 thumbnail for a note article about: ${safePrompt}`,
      size: '1792x1024'
    });

    const infoRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `An infographic summarizing: ${summary}`,
      size: '1024x1024'
    });

    res.status(200).json({
      text,
      summary,
      imageUrl: imageRes.data?.[0]?.url ?? '',
      infographicUrl: infoRes.data?.[0]?.url ?? ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
