const mqtt = require('mqtt/dist/mqtt');
import uuid from 'react-native-uuid';

const MQTT_BROKER_URLS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://mqtt.eclipseprojects.io:443/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
const SESSION_ID = String(uuid.v4());
const SESSION_TOPIC = `notesync/${SESSION_ID}`;

let client: any = null;
let activeBrokerUrl = '';
const subscribers = new Set<(note: Record<string, unknown>) => void>();

type NotePayload = {
  id?: number | string;
  title: string;
  body: string;
  tags: string[];
  updated_at?: string;
};

function createClient(brokerUrl: string): any {
  let hasConnectedOnce = false;

  const nextClient = mqtt.connect(brokerUrl, {
    clean: true,
    clientId: `rn-note-${String(uuid.v4()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
    connectTimeout: 15_000,
    reconnectPeriod: 3_000,
  });

  nextClient.on('connect', () => {
    hasConnectedOnce = true;

    nextClient.subscribe(SESSION_TOPIC, { qos: 0 }, (error: Error | null) => {
      if (error) {
        console.warn('MQTT subscribe warning:', error.message);
      }
    });
  });

  nextClient.on('message', (topic: string, payload: Buffer) => {
    if (topic !== SESSION_TOPIC) {
      return;
    }

    try {
      const parsed = JSON.parse(payload.toString());
      subscribers.forEach(callback => callback(parsed));
    } catch (error) {
      console.error('Invalid MQTT message payload:', error);
    }
  });

  nextClient.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });

  nextClient.on('error', (error: Error) => {
    if (hasConnectedOnce) {
      console.warn('MQTT connection warning:', error.message);
    }
  });

  return nextClient;
}

async function connectWithBrokerFailover(): Promise<any> {
  let lastError: Error | null = null;
  const attemptedErrors: string[] = [];

  for (const brokerUrl of MQTT_BROKER_URLS) {
    const candidateClient = createClient(brokerUrl);

    try {
      await new Promise<void>((resolve, reject) => {
        let mostRecentError: Error | null = null;

        const timeout = setTimeout(() => {
          const reason = mostRecentError?.message ?? 'Timed out while connecting';
          reject(new Error(`${brokerUrl} -> ${reason}`));
        }, 12_000);

        const handleConnect = () => {
          clearTimeout(timeout);
          candidateClient.off('error', handleError);
          resolve();
        };

        const handleError = (error: Error) => {
          mostRecentError = error;
          // Keep waiting for reconnects until timeout instead of failing immediately.
        };

        candidateClient.once('connect', handleConnect);
        candidateClient.on('error', handleError);
      });

      activeBrokerUrl = brokerUrl;
      return candidateClient;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attemptedErrors.push(lastError.message);
      candidateClient.end(true);
    }
  }

  throw new Error(
    `No broker connection could be established. Attempts: ${attemptedErrors.join(' | ') || lastError?.message || 'unknown'}`,
  );
}

async function ensureClient(): Promise<any> {
  if (client && client.connected) {
    return client;
  }

  client = await connectWithBrokerFailover();
  return client;
}

export async function connectSync(): Promise<string> {
  await ensureClient();
  return SESSION_TOPIC;
}

export async function publishNote(note: NotePayload): Promise<void> {
  if (!note || typeof note !== 'object') {
    throw new Error('A valid note object is required to sync.');
  }

  if (!String(note.title ?? '').trim()) {
    throw new Error('Note title is required before sync.');
  }

  if (!String(note.body ?? '').trim()) {
    throw new Error('Note body is required before sync.');
  }

  await connectSync();

  return new Promise((resolve, reject) => {
    client.publish(SESSION_TOPIC, JSON.stringify(note), { qos: 0 }, (error: Error | undefined) => {
      if (error) {
        reject(new Error(`Failed to publish note: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

export function subscribeToNotes(callback: (note: Record<string, unknown>) => void): () => void {
  if (typeof callback !== 'function') {
    throw new Error('subscribeToNotes requires a callback function.');
  }

  subscribers.add(callback);

  connectSync().catch(error => {
     // Keep startup silent; sync publish path surfaces actionable errors to the UI.
     console.warn('Sync subscription deferred:', error instanceof Error ? error.message : String(error));
  });

  return () => {
    subscribers.delete(callback);
  };
}

export function disconnectSync(): void {
  if (!client) {
    return;
  }

  client.end(true, () => {
    console.log(`MQTT disconnected (${activeBrokerUrl || 'unknown broker'})`);
  });

  client = null;
  activeBrokerUrl = '';
  subscribers.clear();
}
