'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

export const useMicrophone = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [permission, setPermission] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setError('Media Devices API not available in this browser.');
      return false;
    }
    if (permission) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission(true);
      return true;
    } catch (err) {
      setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      setPermission(false);
      return false;
    }
  }, [permission]);

  useEffect(() => {
    getPermission(); // Check for permission on mount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [getPermission]);

  const startRecording = async () => {
    const hasPermission = await getPermission();
    if (!hasPermission || !streamRef.current) return;

    setIsRecording(true);
    setError(null);
    audioChunksRef.current = [];
    
    const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/webm',
    ];
    const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    
    if (!supportedMimeType) {
        setError('No supported audio format found for recording.');
        setIsRecording(false);
        return;
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: supportedMimeType });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
    } catch (e) {
      setError('Could not start recording. Please check your microphone.');
      setIsRecording(false);
    }
  };

  const stopRecording = (): Promise<{ audioBlob: Blob, audioDataUri: string }> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        setIsRecording(false);
        // Resolve with empty values if not recording
        const emptyBlob = new Blob([]);
        resolve({ audioBlob: emptyBlob, audioDataUri: ''});
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          resolve({ audioBlob, audioDataUri: base64Audio });
          audioChunksRef.current = [];
          setIsRecording(false);
        };
        reader.onerror = (error) => {
            reject(error);
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        reject(event);
      }

      mediaRecorderRef.current.stop();
    });
  };

  return { isRecording, startRecording, stopRecording, permission, error };
};
