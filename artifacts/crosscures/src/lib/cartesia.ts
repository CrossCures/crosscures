const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY || '';
const CARTESIA_VERSION = import.meta.env.VITE_CARTESIA_VERSION || '2026-03-01';
const CARTESIA_TTS_MODEL = import.meta.env.VITE_CARTESIA_TTS_MODEL || 'sonic-3';
const CARTESIA_VOICE_ID = import.meta.env.VITE_CARTESIA_VOICE_ID || '694f9389-aac1-45b6-b726-9d9369183238';

async function fetchSpeechBuffer(text: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': CARTESIA_API_KEY,
      'Cartesia-Version': CARTESIA_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: CARTESIA_TTS_MODEL,
      transcript: text,
      voice: { mode: 'id', id: CARTESIA_VOICE_ID },
      output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Cartesia TTS error: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

function prepareForSpeech(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function speakText(text: string): Promise<void> {
  if (!CARTESIA_API_KEY) return;
  const cleaned = prepareForSpeech(text);
  if (!cleaned) return;

  let rawBuffer: ArrayBuffer;
  try {
    rawBuffer = await fetchSpeechBuffer(cleaned);
  } catch (e) {
    console.error('[TTS] synthesis failed:', e);
    return;
  }

  const blob = new Blob([rawBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve) => {
    const audio = new Audio(url);
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.addEventListener('ended', finish);
    audio.addEventListener('error', finish);

    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setTimeout(finish, (audio.duration + 1) * 1000);
      }
    });

    setTimeout(finish, 300_000);
    audio.play().catch(finish);
  });
}

export function startLiveTranscription({
  onInterim,
  onFinal,
  onError,
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (err: string) => void;
}): () => void {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SR) {
    onError?.('SpeechRecognition is not supported in this browser. Please use Chrome or Edge.');
    return () => {};
  }

  const recognition: any = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
        onFinal(finalTranscript.trim());
      } else {
        interim += result[0].transcript;
      }
    }
    onInterim((finalTranscript + interim).trim());
  };

  recognition.onerror = (event: any) => {
    if (event.error !== 'no-speech') {
      onError?.(event.error);
    }
  };

  recognition.start();
  return () => { recognition.stop(); };
}
