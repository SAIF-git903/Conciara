import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://13.51.169.186:3009';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}`;

  try {
    const contentType = request.headers.get('content-type') || '';

    // Forward multipart/form-data (file uploads) as-is so the backend receives raw multipart body
    if (contentType.toLowerCase().includes('multipart/form-data')) {
      const body = await request.arrayBuffer();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: body,
      });

      const data = await response.text();
      const responseContentType = response.headers.get('content-type') || 'application/json';

      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': responseContentType,
        },
      });
    }

    // JSON or other body
    const body = await request.text();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/json',
      },
      body: body,
    });

    const data = await response.text();
    const responseContentType = response.headers.get('content-type') || 'application/json';

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType,
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}`;

  try {
    const body = await request.text();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });

    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

