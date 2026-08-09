import nodemailer from 'nodemailer';

function getTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendVerificationCodeEmail(to: string, code: string): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Código de confirmação - ECU Option Generator',
    text: `Seu código de confirmação e: ${code}\n\nEle expira em 15 minutos. Se voce não solicitou este cadastro, ignore este e-mail.`,
    html: `
      <p>Seu código de confirmação para o <strong>ECU Option Generator</strong> e:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>Ele expira em 15 minutos. Se voce não solicitou este cadastro, ignore este e-mail.</p>
    `,
  });
}
