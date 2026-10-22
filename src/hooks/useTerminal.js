// src/hooks/useTerminal.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export function useTerminal(serverId) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const isConnecting = useRef(false);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const isInitializedRef = useRef(false);
  const commandBufferRef = useRef('');

  // Initialize xterm terminal
  const initializeTerminal = useCallback((container, options = {}) => {
    if (!container) {
      console.error('Container element is required');
      return null;
    }

    // Clean up existing terminal
    if (terminalRef.current) {
      try {
        terminalRef.current.dispose();
      } catch (e) {
        console.warn('Error disposing terminal:', e);
      }
      terminalRef.current = null;
      fitAddonRef.current = null;
    }

    const defaultOptions = {
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace, "Courier New", Courier',
      theme: {
        background: '#1a1a1a',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#1a1a1a',
        selection: 'rgba(0, 255, 0, 0.3)',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff6b6b',
        brightGreen: '#6bff6b',
        brightYellow: '#ffff6b',
        brightBlue: '#6b6bff',
        brightMagenta: '#ff6bff',
        brightCyan: '#6bffff',
        brightWhite: '#ffffff'
      },
      convertEol: true,
      scrollback: 1000,
      tabStopWidth: 4,
      rows: 30,
      cols: 80,
      ...options
    };

    const term = new Terminal(defaultOptions);
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(container);
    
    // Small delay to ensure the terminal is properly rendered
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('Error fitting terminal:', e);
      }
    }, 50);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;
    isInitializedRef.current = true;

    // Handle resize events
    term.onResize(({ rows, cols }) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('ssh-resize', { rows, cols });
      }
    });

    return term;
  }, [isConnected]);

  // Get terminal instance
  const getTerminal = useCallback(() => {
    return terminalRef.current;
  }, []);

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
        return true;
      } catch (e) {
        console.warn('Error fitting terminal:', e);
        return false;
      }
    }
    return false;
  }, []);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
  }, []);

  // Write data to terminal
  const writeToTerminal = useCallback((data) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  }, []);

  // Setup socket event handlers
  const setupSocketHandlers = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsLoading(true);
      setError(null);
      
      if (!isConnecting.current && serverId) {
        isConnecting.current = true;
        socketRef.current.emit('ssh-connect', { serverId });
      }
    });

    socketRef.current.on('ssh-connected', (message) => {
      setIsConnected(true);
      setIsLoading(false);
      isConnecting.current = false;
      
      // Write initial message to terminal
      if (terminalRef.current) {
        terminalRef.current.write('\r\n' + message + '\r\n');
      }
    });

    socketRef.current.on('ssh-data', (data) => {
      // Write data directly to terminal
      if (terminalRef.current) {
        terminalRef.current.write(data);
      }
    });

    socketRef.current.on('ssh-error', (errorMessage) => {
      console.error('SSH Error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      setIsConnected(false);
      isConnecting.current = false;
      
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[31m[Error] ' + errorMessage + '\x1b[0m\r\n');
      }
    });

    socketRef.current.on('ssh-disconnected', (message) => {
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[33m[Disconnected] ' + message + '\x1b[0m\r\n');
      }
      setIsConnected(false);
      setIsLoading(false);
      isConnecting.current = false;
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setIsLoading(false);
      isConnecting.current = false;
      
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[31m[Connection Lost]\x1b[0m\r\n');
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to terminal server');
      setIsLoading(false);
      isConnecting.current = false;
    });

    socketRef.current.on('reconnect_attempt', (attempt) => {
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[33m[Reconnecting... Attempt ' + attempt + ']\x1b[0m\r\n');
      }
    });

    socketRef.current.on('reconnect', () => {
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[32m[Reconnected]\x1b[0m\r\n');
      }
    });

    socketRef.current.on('reconnect_failed', () => {
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[31m[Reconnection Failed]\x1b[0m\r\n');
      }
      setIsConnected(false);
      setIsLoading(false);
      isConnecting.current = false;
    });

  }, [serverId]);

  // Connect to server
  const connectToServer = useCallback(() => {
    if (!serverId) {
      setIsLoading(false);
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

        const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'https://billingapi.sparkglobalsolutions.net' ;

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    });

    setupSocketHandlers();
  }, [serverId, setupSocketHandlers]);

  // Send command - raw data
  const sendCommand = useCallback((command) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('ssh-command', command);
      return true;
    } else {
      setError('Not connected to server');
      return false;
    }
  }, [isConnected]);

  // Send command with automatic newline if needed
  const sendCommandWithEnter = useCallback((command) => {
    if (socketRef.current && isConnected) {
      // Send the raw command without modification
      socketRef.current.emit('ssh-command', command);
      return true;
    } else {
      setError('Not connected to server');
      return false;
    }
  }, [isConnected]);

  // Send a full command with enter (for the input box)
  const sendFullCommand = useCallback((command) => {
    if (socketRef.current && isConnected) {
      // For interactive apps like nano, we want to send the command as-is
      // without adding extra newlines
      socketRef.current.emit('ssh-command', command);
      return true;
    } else {
      setError('Not connected to server');
      return false;
    }
  }, [isConnected]);

  // Resize terminal
  const resizeTerminal = useCallback((rows, cols) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('ssh-resize', { rows, cols });
    }
  }, [isConnected]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsLoading(false);
    isConnecting.current = false;
    
    if (terminalRef.current) {
      terminalRef.current.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
    }
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connectToServer();
    }, 500);
  }, [disconnect, connectToServer]);

  // Handle special keys for interactive applications
  const sendSpecialKey = useCallback((key) => {
    if (socketRef.current && isConnected) {
      // Send special key sequences
      const keyMap = {
        'ctrl-c': '\x03',
        'ctrl-d': '\x04',
        'ctrl-x': '\x18',
        'ctrl-o': '\x0f',
        'ctrl-w': '\x17',
        'ctrl-z': '\x1a',
        'esc': '\x1b',
        'tab': '\x09',
        'up': '\x1b[A',
        'down': '\x1b[B',
        'right': '\x1b[C',
        'left': '\x1b[D',
        'enter': '\r',
        'backspace': '\x7f',
        'delete': '\x1b[3~',
      };
      
      const sequence = keyMap[key] || key;
      socketRef.current.emit('ssh-command', sequence);
      return true;
    }
    return false;
  }, [isConnected]);

  // Send raw keyboard input (for interactive mode)
  const sendRawInput = useCallback((data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('ssh-command', data);
      return true;
    } else {
      return false;
    }
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (terminalRef.current) {
        try {
          terminalRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        terminalRef.current = null;
      }
      isConnecting.current = false;
      isInitializedRef.current = false;
    };
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    initializeTerminal,
    getTerminal,
    fitTerminal,
    clearTerminal,
    writeToTerminal,
    sendCommand,
    sendCommandWithEnter,
    sendFullCommand,
    sendSpecialKey,
    sendRawInput,
    resizeTerminal,
    disconnect,
    reconnect,
    connectToServer,
    isInitialized: isInitializedRef.current
  };
}

export default useTerminal;