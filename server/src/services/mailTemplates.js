/* Email templates. Placeholders: {{name}} {{username}} {{siteName}} {{loginUrl}} {{year}} {{code}} */

export const DEFAULT_WELCOME_HTML = `<!doctype html>
<html><body style="margin:0;background:#F5F3EE;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#15171C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E2DED5">
  <tr><td style="background:#15171C;padding:40px 44px">
    <div style="font-family:Georgia,serif;font-size:30px;color:#F5F3EE;letter-spacing:-0.5px">{{siteName}}<span style="color:#FF6A3D">.</span></div>
    <div style="margin-top:28px;font-family:Georgia,serif;font-size:34px;line-height:1.15;color:#ffffff">Welcome aboard,<br><em style="color:#9AA8FF">{{name}}</em></div>
  </td></tr>
  <tr><td style="padding:36px 44px 8px">
    <p style="font-size:16px;line-height:1.65;margin:0 0 18px">Your workspace is ready. Here is what you can do in the next ten minutes:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;border-bottom:1px solid #EFECE5"><strong style="color:#2F4BFF">01 &nbsp;</strong> Pick a template and build a polished résumé or CV</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #EFECE5"><strong style="color:#2F4BFF">02 &nbsp;</strong> Run the ATS checker against a real job description</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #EFECE5"><strong style="color:#2F4BFF">03 &nbsp;</strong> Generate a tailored cover letter with AI</td></tr>
      <tr><td style="padding:12px 0"><strong style="color:#2F4BFF">04 &nbsp;</strong> Share what you know on the community tech journal</td></tr>
    </table>
    <p style="margin:30px 0 34px"><a href="{{loginUrl}}" style="background:#2F4BFF;color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:999px;font-weight:600;display:inline-block">Open my dashboard →</a></p>
    <p style="font-size:14px;color:#4A4F5A;margin:0 0 6px">Your username: <strong>@{{username}}</strong></p>
  </td></tr>
  <tr><td style="padding:24px 44px 36px;font-size:12px;color:#8A8F99;border-top:1px solid #EFECE5">
    You received this because you created an account on {{siteName}}. © {{year}} {{siteName}}.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

export const OTP_HTML = `<!doctype html>
<html><body style="margin:0;background:#F5F3EE;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#15171C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 12px"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:18px;border:1px solid #E2DED5">
<tr><td style="padding:36px 40px">
  <div style="font-family:Georgia,serif;font-size:24px">{{siteName}}<span style="color:#FF6A3D">.</span></div>
  <p style="font-size:15px;line-height:1.6;margin:24px 0 8px">Use this code to verify your email address:</p>
  <div style="font-family:Consolas,monospace;font-size:38px;letter-spacing:12px;font-weight:700;background:#F5F3EE;border-radius:12px;padding:18px 0;text-align:center;color:#2F4BFF">{{code}}</div>
  <p style="font-size:13px;color:#8A8F99;margin-top:20px">The code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;

export function render(tpl, vars) {
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? '').toString());
}
