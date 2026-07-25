import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Edge is great for proxying

export async function POST(req: Request) {
  try {
    const { url, method = 'POST', headers = {}, body = null, isBase64Body = false } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...headers,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      if (isBase64Body) {
        // Convert Base64 string to Buffer/Blob for the fetch call
        fetchOptions.body = Buffer.from(body, 'base64');
      } else {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(url, fetchOptions);

    // Read response as text to avoid JSON parse errors on non-json responses
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Forward the status code and response data
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: any) {
    console.error('Proxy API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Proxy Error' }, { status: 500 });
  }
}

// Support OPTIONS for CORS preflight if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
