#!/usr/bin/env python3
"""Simple TCP proxy: listens on 0.0.0.0:9223, forwards to 127.0.0.1:9222.
Handles both HTTP and WebSocket (CDP) traffic transparently."""

import socket
import threading
import sys

LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 9223
TARGET_HOST = "127.0.0.1"
TARGET_PORT = 9222
BUFFER_SIZE = 65536

def forward(src, dst, name):
    try:
        while True:
            data = src.recv(BUFFER_SIZE)
            if not data:
                break
            dst.sendall(data)
    except (OSError, BrokenPipeError):
        pass
    finally:
        try: src.close()
        except: pass
        try: dst.close()
        except: pass

def handle_client(client_sock):
    try:
        target_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        target_sock.connect((TARGET_HOST, TARGET_PORT))
        
        t1 = threading.Thread(target=forward, args=(client_sock, target_sock, "c→t"), daemon=True)
        t2 = threading.Thread(target=forward, args=(target_sock, client_sock, "t→c"), daemon=True)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
    except Exception as e:
        print(f"Connection error: {e}", file=sys.stderr, flush=True)
        try: client_sock.close()
        except: pass

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen(16)
    print(f"CDP proxy listening on {LISTEN_HOST}:{LISTEN_PORT} → {TARGET_HOST}:{TARGET_PORT}", flush=True)
    
    while True:
        client_sock, addr = server.accept()
        threading.Thread(target=handle_client, args=(client_sock,), daemon=True).start()

if __name__ == "__main__":
    main()
