import { getReaderSpeechIndex, type ReaderSpeechQueueItem } from "@kjv/shared";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

export type TtsPlaybackState = "idle" | "playing" | "paused";

type UseMobileReaderTtsOptions = {
  autoScroll: boolean;
  language: "en" | "ko";
  onSpeakingVerse: (verseId: string | null, autoScroll: boolean) => void;
  repeat: boolean;
  speed: number;
  volume: number;
  voiceIdentifier?: string;
};

type QueueCompleteCallback = () => void | Promise<void>;

export function useMobileReaderTts({
  autoScroll,
  language,
  onSpeakingVerse,
  repeat,
  speed,
  volume,
  voiceIdentifier,
}: UseMobileReaderTtsOptions) {
  const [ttsPlaybackState, setTtsPlaybackState] = useState<TtsPlaybackState>("idle");
  const [ttsStatus, setTtsStatus] = useState("대기");
  const [ttsQueueLabel, setTtsQueueLabel] = useState("대기");
  const [speakingVerseId, setSpeakingVerseId] = useState<string | null>(null);
  const speechQueueRef = useRef<ReaderSpeechQueueItem[]>([]);
  const speechIndexRef = useRef(0);
  const speechCancelRef = useRef(false);
  const queueCompleteRef = useRef<QueueCompleteCallback | null>(null);
  const playbackRequestRef = useRef(0);
  const queueLabelRef = useRef("대기");
  const settingsRef = useRef({ autoScroll, language, repeat, speed, volume, voiceIdentifier });
  const speakQueueAtIndexRef = useRef<(index: number) => void>(() => undefined);

  useEffect(() => {
    settingsRef.current = { autoScroll, language, repeat, speed, volume, voiceIdentifier };
  }, [autoScroll, language, repeat, speed, volume, voiceIdentifier]);

  const speakQueueAtIndex = useCallback((index: number) => {
    const queue = speechQueueRef.current;
    const item = queue[index];
    if (!item?.text.trim()) return;

    const settings = settingsRef.current;
    const playbackRequestId = playbackRequestRef.current;
    speechIndexRef.current = index;
    setSpeakingVerseId(item.id ?? null);
    onSpeakingVerse(item.id ?? null, settings.autoScroll);
    setTtsPlaybackState("playing");
    setTtsStatus(`${item.label} 재생 중`);
    Speech.speak(item.text, {
      language: settings.language === "ko" ? "ko-KR" : "en-US",
      onDone: () => {
        if (speechCancelRef.current || playbackRequestId !== playbackRequestRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex < speechQueueRef.current.length) {
          speakQueueAtIndexRef.current(nextIndex);
          return;
        }
        if (settingsRef.current.repeat && speechQueueRef.current.length) {
          speakQueueAtIndexRef.current(0);
          return;
        }
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus(`${queueLabelRef.current} 완료`);
        const completeQueue = queueCompleteRef.current;
        queueCompleteRef.current = null;
        if (completeQueue) void Promise.resolve(completeQueue()).catch(() => undefined);
      },
      onError: () => {
        if (speechCancelRef.current || playbackRequestId !== playbackRequestRef.current) return;
        queueCompleteRef.current = null;
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus("TTS 재생 오류");
      },
      onStart: () => {
        if (speechCancelRef.current || playbackRequestId !== playbackRequestRef.current) return;
        setTtsPlaybackState("playing");
        setTtsStatus(`${item.label} 재생 중`);
      },
      onStopped: () => {
        if (speechCancelRef.current || playbackRequestId !== playbackRequestRef.current) return;
        queueCompleteRef.current = null;
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus("정지");
      },
      rate: settings.speed,
      volume: settings.volume,
      voice: settings.voiceIdentifier || undefined,
    });
  }, [onSpeakingVerse]);

  useEffect(() => {
    speakQueueAtIndexRef.current = speakQueueAtIndex;
  }, [speakQueueAtIndex]);

  useEffect(() => () => {
    playbackRequestRef.current += 1;
    speechCancelRef.current = true;
    queueCompleteRef.current = null;
    void Speech.stop();
  }, []);

  const playSpeechQueue = useCallback((
    items: ReaderSpeechQueueItem[],
    startIndex = 0,
    label = "재생 목록",
    onComplete?: QueueCompleteCallback,
  ) => {
    const queue = items.filter((item) => item.text.trim());
    if (!queue.length) return;

    const requestId = ++playbackRequestRef.current;
    speechCancelRef.current = true;
    void Speech.stop().finally(() => {
      if (requestId !== playbackRequestRef.current) return;
      speechCancelRef.current = false;
      speechQueueRef.current = queue;
      queueCompleteRef.current = onComplete ?? null;
      queueLabelRef.current = `${label} · ${queue.length}개`;
      setTtsQueueLabel(queueLabelRef.current);
      speakQueueAtIndexRef.current(Math.min(Math.max(startIndex, 0), queue.length - 1));
    });
  }, []);

  const pauseOrResumeSpeech = useCallback(async () => {
    try {
      if (ttsPlaybackState === "paused") {
        await Speech.resume();
        setTtsPlaybackState("playing");
        setTtsStatus("재개");
        return;
      }
      await Speech.pause();
      setTtsPlaybackState("paused");
      setTtsStatus("일시정지");
    } catch {
      setTtsStatus("이 플랫폼에서는 일시정지를 지원하지 않습니다.");
    }
  }, [ttsPlaybackState]);

  const stopSpeech = useCallback(async () => {
    const requestId = ++playbackRequestRef.current;
    speechCancelRef.current = true;
    queueCompleteRef.current = null;
    await Speech.stop();
    if (requestId !== playbackRequestRef.current) return;
    speechCancelRef.current = false;
    setSpeakingVerseId(null);
    setTtsPlaybackState("idle");
    setTtsStatus("정지");
  }, []);

  const moveSpeech = useCallback(async (direction: -1 | 1) => {
    const nextIndex = getReaderSpeechIndex(speechQueueRef.current.length, speechIndexRef.current, direction);
    if (nextIndex < 0) return;
    const requestId = ++playbackRequestRef.current;
    speechCancelRef.current = true;
    await Speech.stop();
    if (requestId !== playbackRequestRef.current) return;
    speechCancelRef.current = false;
    speakQueueAtIndexRef.current(nextIndex);
  }, []);

  return {
    moveSpeech,
    pauseOrResumeSpeech,
    playSpeechQueue,
    setTtsStatus,
    speakingVerseId,
    stopSpeech,
    ttsPlaybackState,
    ttsQueueLabel,
    ttsStatus,
  };
}
