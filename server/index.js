import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/extract', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const prompt = `You will receive a screenshot of an attendance table with columns similar to: Code, TH/TC (total hours), PH (present hours), AH (absent hours), and percentage. Extract all subjects as JSON.
Return ONLY a JSON array, no extra text, of objects with keys: name, total, present, absent, percentage.
- name: subject code/name string
- total: integer (TH or TC)
- present: integer (PH)
- absent: integer (AH)
- percentage: number without % sign
If data appears in rows like "21CSC201J 34 31 3 91.18%", interpret as total=34, present=31, absent=3, percentage=91.18.
Ignore any legend or last updated footer.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful data extractor that outputs strict JSON only.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    // The model will return an object; we expect either an array or an object with array property
    let text = response.choices?.[0]?.message?.content || '[]';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // In case response_format is ignored, try to coerce
      text = text.replace(/^```json\n|\n```$/g, '');
      parsed = JSON.parse(text);
    }

    const subjects = Array.isArray(parsed) ? parsed : parsed.subjects || [];

    // basic sanitize
    const normalized = subjects
      .map((s) => ({
        name: String(s.name ?? '').trim() || 'Subject',
        total: Number(s.total ?? 0),
        present: Number(s.present ?? 0),
        absent: Number(s.absent ?? 0),
        percentage: Number(s.percentage ?? 0),
      }))
      .filter((s) => s.total > 0);

    res.json({ subjects: normalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract data' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`AI extraction server running on http://localhost:${PORT}`);
});
