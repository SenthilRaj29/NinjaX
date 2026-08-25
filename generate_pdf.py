import subprocess
import time
import json
import base64
import urllib.request
import os
import sys

def main():
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    ]
    
    executable = None
    for p in chrome_paths:
        if os.path.exists(p):
            executable = p
            break
            
    if not executable:
        print("No Chromium browser found.")
        sys.exit(1)
        
    html_file = os.path.abspath("documentation.html")
    pdf_file = os.path.abspath("NinjaX_Chase_Documentation.pdf")
    user_data = os.path.abspath("chrome_temp_profile")
    
    port = 9222
    cmd = [
        executable,
        "--headless",
        "--disable-gpu",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data}",
        f"file:///{html_file.replace('\\', '/')}"
    ]
    
    proc = subprocess.Popen(cmd)
    try:
        # Wait for debugging port to be active
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
                    data = json.loads(resp.read().decode())
                    if data and len(data) > 0:
                        ws_url = data[0].get("webSocketDebuggerUrl")
                        break
            except Exception:
                time.sleep(0.3)
                
        if not ws_url:
            print("Failed to get WebSocket debugger URL.")
            return

        # Python built-in simple websocket client or HTTP CDP
        # We can use simple socket connection to send JSON-RPC command
        import socket
        
        # Parse WS URL ws://127.0.0.1:9222/devtools/page/...
        path = ws_url.split(f":{port}")[1]
        
        sock = socket.create_connection(("127.0.0.1", port), timeout=10)
        
        # Simple WS handshake
        key = base64.b64encode(os.urandom(16)).decode('utf-8')
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: 127.0.0.1:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        sock.sendall(handshake.encode('utf-8'))
        
        # Read handshake response
        response = sock.recv(4096)
        if b"101 Switching Protocols" not in response:
            print("WebSocket handshake failed")
            return
            
        def send_ws_msg(msg_dict):
            payload = json.dumps(msg_dict).encode('utf-8')
            length = len(payload)
            frame = bytearray([0x81]) # text frame
            if length <= 125:
                frame.append(0x80 | length)
            elif length <= 65535:
                frame.append(0x80 | 126)
                frame.extend(length.to_bytes(2, 'big'))
            else:
                frame.append(0x80 | 127)
                frame.extend(length.to_bytes(8, 'big'))
            mask = os.urandom(4)
            frame.extend(mask)
            masked_payload = bytearray(payload[i] ^ mask[i % 4] for i in range(length))
            frame.extend(masked_payload)
            sock.sendall(frame)

        def recv_ws_msg():
            buf = bytearray()
            while True:
                chunk = sock.recv(65536)
                if not chunk:
                    break
                buf.extend(chunk)
                
                # Check if we have complete frame
                if len(buf) >= 2:
                    b1 = buf[0]
                    b2 = buf[1]
                    payload_len = b2 & 0x7F
                    offset = 2
                    if payload_len == 126:
                        if len(buf) < 4: continue
                        payload_len = int.from_bytes(buf[2:4], 'big')
                        offset = 4
                    elif payload_len == 127:
                        if len(buf) < 10: continue
                        payload_len = int.from_bytes(buf[2:10], 'big')
                        offset = 10
                    
                    if len(buf) >= offset + payload_len:
                        data = buf[offset:offset+payload_len]
                        try:
                            return json.loads(data.decode('utf-8'))
                        except Exception:
                            pass
            return None

        # Request Page.printToPDF
        print("Requesting Page.printToPDF via CDP...")
        send_ws_msg({
            "id": 1,
            "method": "Page.printToPDF",
            "params": {
                "printBackground": True,
                "preferCSSPageSize": True,
                "displayHeaderFooter": False
            }
        })
        
        # Read responses until id == 1
        pdf_b64 = None
        for _ in range(10):
            res = recv_ws_msg()
            if res and res.get("id") == 1:
                pdf_b64 = res.get("result", {}).get("data")
                break
                
        if pdf_b64:
            pdf_bytes = base64.b64decode(pdf_b64)
            with open(pdf_file, "wb") as f:
                f.write(pdf_bytes)
            print(f"Successfully generated PDF: {pdf_file} ({len(pdf_bytes)} bytes)")
        else:
            print("Failed to receive PDF data from browser CDP.")
            
    finally:
        proc.kill()

if __name__ == "__main__":
    main()
