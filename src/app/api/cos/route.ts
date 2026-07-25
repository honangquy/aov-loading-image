import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

function hmacSha1(key: string, msg: string) {
  return crypto.createHmac('sha1', key).update(msg).digest('hex');
}

function sha1(msg: string) {
  return crypto.createHash('sha1').update(msg).digest('hex');
}

function buildCosAuth(sid: string, skey: string, method: string, pathname: string, clen: number, host: string) {
  const now = Math.floor(Date.now() / 1000);
  const end = now + 86400;
  const kt = `${now};${end}`;
  const sk = hmacSha1(skey, kt);
  const hh = `content-length=${clen}&host=${host}`;
  const hs = `${method.toLowerCase()}\n${pathname}\n\n${hh}\n`;
  const hhttp = sha1(hs);
  const s2s = `sha1\n${kt}\n${hhttp}\n`;
  const sig = hmacSha1(sk, s2s);
  return `q-sign-algorithm=sha1&q-ak=${sid}&q-sign-time=${kt}&q-key-time=${kt}&q-header-list=content-length;host&q-url-param-list=&q-signature=${sig}`;
}

export async function POST(req: Request) {
  try {
    const { creds, b64Data } = await req.json();
    
    if (!creds || !b64Data) {
      return NextResponse.json({ error: 'Missing creds or b64Data' }, { status: 400 });
    }

    const buffer = Buffer.from(b64Data, 'base64');
    
    const host = 'aovcamp-h5-ugc-1254801811.cos.ap-singapore.myqcloud.com';
    const auth = buildCosAuth(creds.tmpSecretId, creds.tmpSecretKey, 'PUT', creds.path, buffer.length, host);

    const cosUrl = `https://${host}${creds.path}`;
    
    const cosRes = await fetch(cosUrl, {
      method: 'PUT',
      headers: {
        'Authorization': auth,
        'x-cos-security-token': creds.token,
        'Content-Type': 'image/png'
      },
      body: buffer
    });

    if (!cosRes.ok) {
      const errText = await cosRes.text().catch(() => '');
      console.error('COS Error:', cosRes.status, errText);
      return NextResponse.json({ error: `COS upload failed: ${cosRes.status} ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('COS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
