// Vercel Serverless Function — recebe os dois formulários (Maximino e Artur)
// e grava cada resposta no Postgres do próprio projeto (aba Storage do Vercel).
// Nenhum serviço externo envolvido: o front-end chama este endpoint via
// fetch('/api/lead'), que é servido no mesmo domínio do site.
//
// Pré-requisito único (feito pelo painel do Vercel, não por código):
// Storage -> Create Database -> Postgres -> Connect ao projeto.
// O Vercel injeta sozinho as variáveis de ambiente (POSTGRES_URL etc.)
// que o pacote abaixo já sabe ler.

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};
  const { source, _gotcha, _subject, ...fields } = body;

  // honeypot: bot preencheu um campo que humano nunca vê -> aceita e descarta
  if (_gotcha) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!source || typeof source !== 'string') {
    res.status(400).json({ error: 'missing source' });
    return;
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      INSERT INTO leads (source, data)
      VALUES (${source}, ${JSON.stringify(fields)}::jsonb)
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed:', err);
    res.status(500).json({ error: 'internal error' });
  }
};
