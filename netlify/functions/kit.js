// Kit de Decisão por e-mail (Brevo).
// Variáveis na Netlify (Site configuration > Environment variables):
//   BREVO_API_KEY       chave da API do Brevo (obrigatória)
//   BREVO_SENDER_EMAIL  e-mail remetente, do domínio autenticado no Brevo (obrigatória)
//   BREVO_LIST_ID       número da lista do Kit no Brevo (opcional)
// Sem a chave ou sem o remetente, a função não faz nada e o site continua entregando o Kit por download.
const SITE = 'https://reginaldonegocia.com.br';
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false });
  const key = process.env.BREVO_API_KEY, sender = process.env.BREVO_SENDER_EMAIL;
  if (!key || !sender) return json(200, { ok: true, enviado: false, motivo: 'brevo nao configurado' });
  let dados;
  try { dados = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false }); }
  const email = String(dados.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json(400, { ok: false });
  const canal = String(dados.canal || 'direto').slice(0, 80);
  const origem = String(dados.origem || 'kit').slice(0, 40);
  const pagina = String(dados.pagina || '').slice(0, 80);
  const h = { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' };

  const contato = { email, updateEnabled: true };
  if (process.env.BREVO_LIST_ID) contato.listIds = [Number(process.env.BREVO_LIST_ID)];
  try { await fetch('https://api.brevo.com/v3/contacts', { method: 'POST', headers: h, body: JSON.stringify(contato) }); } catch (e) {}

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">
<p>Olá,</p>
<p>Aqui está o seu <strong>Kit de Decisão</strong>:</p>
<p><a href="${SITE}/kit-v2.pdf" style="display:inline-block;background:#C9A84C;color:#091D39;padding:12px 22px;text-decoration:none;font-weight:bold">Baixar o Kit</a></p>
<p>Use antes da próxima conversa importante. São perguntas e checklists para você enxergar o jogo antes de sentar à mesa.</p>
<p><strong>Agora o próximo passo:</strong> <a href="${SITE}/prep-ia.html?utm_source=email&utm_medium=kit">gere o roteiro da sua próxima negociação no Prep Estratégico</a>. É gratuito, leva 2 minutos, e você chega na mesa com abertura, concessões e plano B prontos.</p>
<p>Se a negociação for decisiva demais para resolver sozinho, eu reviso o seu caso pessoalmente antes da reunião: <a href="https://wa.me/5511947909315?text=Ol%C3%A1%2C%20Reginaldo.%20Baixei%20o%20Kit%20de%20Decis%C3%A3o%20e%20quero%20falar%20sobre%20uma%20negocia%C3%A7%C3%A3o%20cr%C3%ADtica.">me chama aqui</a>.</p>
<p>Se o seu time negocia todo dia e quer treinar com quem passou 19 anos do lado que decide a compra, veja os formatos para empresas: <a href="${SITE}/para-empresas.html">${SITE.replace('https://','')}/para-empresas</a></p>
<p>Reginaldo<br>Reginaldo Negocia · WhatsApp (11) 94790-9315</p>
</div>`;
  let enviado = false, avisado = false;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: h, body: JSON.stringify({
      sender: { email: sender, name: 'Reginaldo Negocia' },
      replyTo: { email: process.env.BREVO_REPLY_TO || 'reginaldonegocia@gmail.com', name: 'Reginaldo Negocia' },
      to: [{ email }],
      subject: 'Seu Kit de Decisão chegou',
      htmlContent: html,
    }) });
    enviado = r.ok;
  } catch (e) {}

  // Aviso para o Reginaldo (substitui o Formspree no Kit)
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  try {
    const r2 = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: h, body: JSON.stringify({
      sender: { email: sender, name: 'Site Reginaldo Negocia' },
      replyTo: { email },
      to: [{ email: process.env.BREVO_NOTIFY_TO || 'reginaldonegocia@gmail.com' }],
      subject: `[Kit de Decisão] Nova solicitação · via ${canal}`,
      htmlContent: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
<p><strong>Novo pedido do Kit de Decisão</strong></p>
<p>E-mail: ${esc(email)}<br>Origem da visita: ${esc(canal)}<br>Formulário: ${esc(origem)}${pagina ? ' (' + esc(pagina) + ')' : ''}<br>Kit enviado por e-mail: ${enviado ? 'sim' : 'não'}</p></div>`,
    }) });
    avisado = r2.ok;
  } catch (e) {}
  return json(200, { ok: enviado || avisado, enviado, avisado });
};
