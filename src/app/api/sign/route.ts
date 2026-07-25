import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

export const runtime = 'nodejs';

function createSandbox() {
  const sandbox: any = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console: console,
    Buffer: Buffer,
  };

  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.global = sandbox;

  sandbox.crypto = {
    getRandomValues: (arr: any) => { crypto.randomFillSync(arr); return arr; },
    subtle: crypto.webcrypto ? crypto.webcrypto.subtle : undefined,
  };

  sandbox.btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');
  sandbox.atob = (s: string) => Buffer.from(s, 'base64').toString('binary');

  const noop = () => {};
  const noopObj = () => ({
    style: {}, setAttribute: noop, getAttribute: () => null,
    appendChild: noop, removeChild: noop,
    addEventListener: noop, removeEventListener: noop,
    getElementsByTagName: () => [], getElementsByClassName: () => [],
    innerHTML: '', textContent: '', offsetWidth: 100, offsetHeight: 100,
    getBoundingClientRect: () => ({ top:0, left:0, bottom:100, right:100, width:100, height:100 }),
    classList: { add: noop, remove: noop, contains: () => false },
    dataset: {},
  });

  sandbox.document = {
    createElement: noopObj, createTextNode: () => ({}),
    createDocumentFragment: () => ({ appendChild: noop }),
    head: { appendChild: noop, removeChild: noop },
    body: { appendChild: noop, removeChild: noop, style: {} },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop,
    documentElement: { classList: { add: noop }, style: {}, getAttribute: () => null },
    cookie: '', readyState: 'complete',
    location: { hostname: 'kgvn-camp.mobagarena.com' },
  };

  sandbox.navigator = {
    userAgent: 'Mozilla/5.0 (Linux; Android 16; CPH2747 Build/BP2A.250605.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.7827.91 Mobile Safari/537.36',
    platform: 'Linux armv81', language: 'vi-VN', languages: ['vi-VN','vi','en-US','en'],
    appName: 'Netscape', cookieEnabled: true, onLine: true,
    hardwareConcurrency: 4, maxTouchPoints: 5,
  };

  sandbox.location = {
    hostname: 'kgvn-camp.mobagarena.com',
    href: 'https://kgvn-camp.mobagarena.com/',
    protocol: 'https:', origin: 'https://kgvn-camp.mobagarena.com',
    host: 'kgvn-camp.mobagarena.com', pathname: '/', search: '', hash: '',
  };
  
  sandbox.screen = { width: 412, height: 915, availWidth: 412, availHeight: 915, colorDepth: 24 };
  sandbox.innerWidth = 412;
  sandbox.innerHeight = 915;
  sandbox.devicePixelRatio = 2.625;
  
  sandbox.XMLHttpRequest = class {
    readyState = 0; status = 0;
    open() {} send() {} setRequestHeader() {} getResponseHeader() { return null; }
    addEventListener() {} removeEventListener() {} abort() {}
  };
  sandbox.fetch = async () => ({ json: async () => ({}), text: async () => '', ok: true });
  sandbox.Image = class {};
  sandbox.HTMLElement = class {};
  sandbox.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  sandbox.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  sandbox.requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
  sandbox.cancelAnimationFrame = (id: any) => clearTimeout(id);
  sandbox.MutationObserver = class { observe(){} disconnect(){} };
  sandbox.IntersectionObserver = class { observe(){} disconnect(){} };
  sandbox.ResizeObserver = class { observe(){} disconnect(){} };
  sandbox.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
  sandbox.getComputedStyle = () => new Proxy({}, { get: () => '' });
  sandbox.performance = sandbox.performance || { now: () => Date.now(), getEntriesByType: () => [] };

  return sandbox;
}

async function getTCSJ() {
  const sandbox = createSandbox();
  vm.createContext(sandbox);

  const scriptPath = path.join(process.cwd(), 'src', 'lib', 'camp-security-oversea.0.1.0.js');
  if (!fs.existsSync(scriptPath)) {
    throw new Error('camp-security-oversea.0.1.0.js not found at ' + scriptPath);
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Run the script in our isolated sandbox
  vm.runInContext(scriptContent, sandbox);

  // The script initializes asynchronously. Wait for __TCSJ__ to be populated.
  let elapsed = 0;
  while (!sandbox.__TCSJ__ && elapsed < 5000) {
    await new Promise(r => setTimeout(r, 50));
    elapsed += 50;
  }

  if (!sandbox.__TCSJ__) {
    throw new Error('__TCSJ__ timeout in sandbox');
  }

  return sandbox.__TCSJ__;
}

export async function POST(req: Request) {
  try {
    const { encryption, campRoleid } = await req.json();

    if (!encryption || typeof campRoleid !== 'string') {
      return NextResponse.json({ error: 'Missing encryption or campRoleid' }, { status: 400 });
    }

    const tcsj = await getTCSJ();

    // Init state
    tcsj.setLoginRes(encryption, campRoleid);
    
    // Generate signature
    const encodeparam = tcsj.getEncodeParam(campRoleid);

    return NextResponse.json({ encodeparam });
  } catch (error: any) {
    console.error('Sign API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
