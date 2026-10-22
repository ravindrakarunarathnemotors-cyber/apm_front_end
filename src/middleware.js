// import { NextResponse } from 'next/server';
// export function middleware(request) {
//   const response = NextResponse.next();
//   if (request.nextUrl.pathname === '/') {
//     return NextResponse.redirect(new URL('/dashboard', request.url));
//   }
//   return response;
// }

// // See "Matching Paths" below to learn more
// export const config = {
//   matcher: '/'
// };
// export { default } from 'next-auth/middleware';



import { NextResponse } from 'next/server';

export function middleware(request) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // 1. Static/Internal bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') || 
    pathname.includes('.') // Matches favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  // 2. CLIENT PUBLIC DOMAIN LOGIC
  if (host.includes('billing-portal.tekorasuit.com')) {
    // Only allow paths starting with /client/
    if (pathname.startsWith('/client/')) {
      return NextResponse.next();
    }

    // Premium 404 for all other paths on this subdomain
    const premiumHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 - Not Found</title>
          <style>
            body {
              display: flex; align-items: center; justify-content: center;
              height: 100vh; margin: 0;
              background: radial-gradient(circle at top left, #e0e7ff, #f3e8ff);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
            }
            .card {
              text-align: center; padding: 3rem; width: 90%; max-width: 450px;
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
              border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.3);
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
              animation: slideUp 0.6s ease-out;
            }
            h1 {
              font-size: 6rem; margin: 0; font-weight: 900;
              background: linear-gradient(135deg, #6366f1, #a855f7);
              -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            h2 { font-size: 1.5rem; margin: 10px 0; }
            p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
            .btn {
              text-decoration: none; background: #1e293b; color: white;
              padding: 12px 28px; border-radius: 10px; font-weight: 600;
              transition: all 0.2s ease; display: inline-block;
            }
            .btn:hover { transform: translateY(-2px); background: #000; }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The requested page is not available on this domain.</p>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(premiumHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // 3. ADMIN DOMAIN LOGIC
  if (host.includes('saas.tekorasuit.com')) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};