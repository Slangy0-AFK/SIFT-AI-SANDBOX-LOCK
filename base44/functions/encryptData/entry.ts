import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data, key } = await req.json();

    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY && action !== 'generate_key') {
      return Response.json({ error: 'ENCRYPTION_KEY secret not configured' }, { status: 500 });
    }

    if (action === 'generate_key') {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const newKey = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      return Response.json({
        success: true,
        message: 'Generate a new encryption key and store it in ENCRYPTION_KEY secret',
        key: newKey,
      });
    }

    if (action === 'encrypt') {
      if (!data) {
        return Response.json({ error: 'data is required' }, { status: 400 });
      }
      
      const CryptoJS = await import('npm:crypto-js@4.2.0');
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
      
      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Data encrypted by ${user.email}`,
        environment: 'production',
      });

      return Response.json({
        success: true,
        encrypted,
        algorithm: 'AES-256',
      });
    }

    if (action === 'decrypt') {
      if (!data) {
        return Response.json({ error: 'data is required' }, { status: 400 });
      }

      const CryptoJS = await import('npm:crypto-js@4.2.0');
      const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
      const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      return Response.json({
        success: true,
        decrypted,
      });
    }

    if (action === 'hash') {
      if (!data) {
        return Response.json({ error: 'data is required' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const keyData = encoder.encode(ENCRYPTION_KEY);
      const messageData = encoder.encode(data);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const hash = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return Response.json({
        success: true,
        hash,
        algorithm: 'HMAC-SHA256',
      });
    }

    return Response.json({ error: 'Invalid action. Use: encrypt, decrypt, hash, or generate_key' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});