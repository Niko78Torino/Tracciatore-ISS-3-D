// File: netlify/functions/fetch-gemini-info.js

// La funzione 'handler' è il punto di ingresso per la nostra funzione serverless.
// Netlify la eseguirà ogni volta che viene chiamato l'URL corrispondente.
exports.handler = async (event) => {
  // Per sicurezza, controlliamo che la richiesta sia di tipo POST.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Estraiamo i dati (latitudine e longitudine) inviati dal nostro sito.
    const { lat, lon } = JSON.parse(event.body);
    if (!lat || !lon) {
      return { statusCode: 400, body: 'Latitudine e longitudine sono richieste.' };
    }

    // Qui recuperiamo la chiave API segreta dalle variabili d'ambiente di Netlify.
    // Questa chiave NON è visibile nel codice del browser.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Se la chiave non è impostata su Netlify, restituiamo un errore.
        return { statusCode: 500, body: 'API Key non configurata sul server.' };
    }

    // Costruiamo il prompt per Gemini, esattamente come facevamo prima.
    const prompt = `La Stazione Spaziale Internazionale si trova alle coordinate ${lat.toFixed(4)}, ${lon.toFixed(4)}. Sopra quale nazione, oceano o caratteristica geografica rilevante si trova? Descrivi brevemente il luogo e aggiungi una curiosità interessante. Rispondi in italiano in un unico paragrafo.`;
    
    const payload = { 
        contents: [{ 
            role: "user", 
            parts: [{ text: prompt }] 
        }] 
    };
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Eseguiamo la chiamata a Gemini dal server di Netlify.
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Se Gemini restituisce un errore, lo registriamo e lo segnaliamo.
    if (!geminiResponse.ok) {
        console.error("Errore dalla API di Gemini:", await geminiResponse.text());
        return { statusCode: geminiResponse.status, body: 'Errore durante la chiamata a Gemini.' };
    }

    const result = await geminiResponse.json();

    // Estraiamo il testo dalla risposta di Gemini e lo restituiamo al nostro sito.
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = result.candidates[0].content.parts[0].text;
      return {
        statusCode: 200,
        body: JSON.stringify({ text: text }),
      };
    } else {
      return { statusCode: 500, body: 'Risposta non valida da Gemini.' };
    }

  } catch (error) {
    // Gestione generica degli errori.
    console.error("Errore nella funzione Netlify:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Errore interno del server.' }),
    };
  }
};
