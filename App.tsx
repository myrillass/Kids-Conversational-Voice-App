
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AppStatus, CharacterType, UserProfile, Transcription } from './types';
import { decode, decodeAudioData, createPcmBlob } from './services/audioUtils';

const CHARACTERS = [
  { 
    id: 'Luna' as CharacterType, 
    name: 'Luna', 
    fullName: 'Luna si Burung Hantu',
    emoji: '🦉', 
    color: 'bg-purple-400', 
    theme: 'purple', 
    thinkingIcon: '✨', 
    thinkingMsg: 'Luna sedang merenungkan ide di balik awan...',
    bgAccent: 'rgba(167, 139, 250, 0.1)',
    pattern: '✨',
    primary: 'purple-600',
    secondary: 'purple-100'
  },
  { 
    id: 'Cica' as CharacterType, 
    name: 'Cica', 
    fullName: 'Cica si Kucing',
    emoji: '🐱', 
    color: 'bg-orange-400', 
    theme: 'orange', 
    thinkingIcon: '🎾', 
    thinkingMsg: 'Cica sedang mengejar ide yang lari-lari...',
    bgAccent: 'rgba(251, 146, 60, 0.1)',
    pattern: '🐾',
    primary: 'orange-600',
    secondary: 'orange-100'
  },
  { 
    id: '