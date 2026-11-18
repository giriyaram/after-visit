import 'server-only';
import {createNexconnServer, type NexconnServer} from './nexconn-server';

// The app's Nexconn client, built once from the environment. The App Secret
// is read here and nowhere else in the app.
const globalForChat = globalThis as unknown as {nexconnServer?: NexconnServer};

function build(): NexconnServer {
  const appKey = process.env.NEXT_PUBLIC_NEXCONN_APP_KEY;
  const appSecret = process.env.NEXCONN_APP_SECRET;
  const primary = process.env.NEXCONN_API_BASE_URL;
  const backup = process.env.NEXCONN_API_BASE_URL_BACKUP;
  if (!appKey || !appSecret || !primary) {
    throw new Error(
      'NEXT_PUBLIC_NEXCONN_APP_KEY, NEXCONN_APP_SECRET and NEXCONN_API_BASE_URL must be set. See .env.example.',
    );
  }
  return createNexconnServer({
    appKey,
    appSecret,
    hosts: backup ? [primary, backup] : [primary],
  });
}

export const nexconn: NexconnServer = globalForChat.nexconnServer ?? build();
if (process.env.NODE_ENV !== 'production') globalForChat.nexconnServer = nexconn;
