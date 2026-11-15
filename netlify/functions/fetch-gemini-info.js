// File: netlify/functions/fetch-gemini-info.js

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { lat, lon, question } = JSON.parse(event.body || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API Key non configurata sul server.' })
      };
    }

    const hasCoords =
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lon);

    if (!hasCoords && !question) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Latitudine e longitudine (oppure una domanda) sono richieste.' })
      };
    }

    let prompt = '';
    if (question && typeof question === 'string' && question.trim().length > 0) {
      const posContext = hasCoords
        ? ` Contesto attuale: la Stazione Spaziale Internazionale si trova alle coordinate ${lat.toFixed(4)}, ${lon.toFixed(4)}.`
        : '';
      prompt = `Sei un divulgatore scientifico esperto della Stazione Spaziale Internazionale (ISS) e di esplorazione spaziale.${posContext} Rispondi in italiano in modo chiaro, accurato e conciso (massimo 1-2 paragrafi) alla seguente domanda dell'utente: "${question.trim()}"`;
    } else {
      prompt = `La Stazione Spaziale Internazionale si trova alle coordinate ${lat.toFixed(4)}, ${lon.toFixed(4)}. Sopra quale nazione, oceano o caratteristica geografica rilevante si trova? Descrivi brevemente il luogo e aggiungi una curiosità interessante. Rispondi in italiano in un unico paragrafo.`;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      console.error('Errore dalla API di Gemini:', await geminiResponse.text());
      return {
        statusCode: geminiResponse.status,
        headers,
        body: JSON.stringify({ error: 'Errore durante la chiamata a Gemini.' })
      };
    }

    const result = await geminiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Risposta non valida da Gemini.' })
      };
    }
  } catch (error) {
    console.error('Errore nella funzione Netlify:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server.' })
    };
  }
};
