import requests, re, datetime

TOKEN = "kKDRGwoEAacMpr9ulEhtSJcMBvs/fmgOykBUJVrCUbQ="
URL = "https://localhost:8443"
CONTAINER_ID = 113   # ID du container que tu as créé

headers = {"ph-auth-token": TOKEN, "Content-Type": "application/json"}

log_file = "access_nginx_ddos_1000.log"

regex = re.compile(
    r'(?P<src_ip>\d+\.\d+\.\d+\.\d+) - - \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<request>\S+) [^"]+" (?P<status>\d+) (?P<bytes>\d+) "-" "(?P<ua>[^"]+)"'
)

def parse_time_to_epoch(timestr: str) -> int:
    # exemple: 13/Sep/2025:20:07:25 +0100
    dt = datetime.datetime.strptime(timestr, "%d/%b/%Y:%H:%M:%S %z")
    return int(dt.timestamp())

with open(log_file) as f:
    for i, line in enumerate(f, 1):
        m = regex.search(line)
        if not m:
            continue

        src_ip = m.group("src_ip")
        logtime = m.group("time")
        epoch_time = parse_time_to_epoch(logtime)

        cef = {
            "src_ip_cef": src_ip,                # ton champ personnalisé
            "sourceAddress": src_ip,             # champ CEF standard
            "requestMethod": m.group("method"),
            "request": m.group("request"),
            "httpStatus": m.group("status"),
            "bytesSent": m.group("bytes"),
            "userAgent": m.group("ua"),
            "raw_log": line.strip(),
            "source": "/var/log/nginx/access.log",
            "sourcetype": "nginx_access",
            "host": "localhost",
            "index": "ddos_logs",
            "splunk_server": "customer.lgosnga1.pop.starlinkisp.net",
            "_indextime": epoch_time,            # EXACTEMENT basé sur le log
            "startTime": str(epoch_time),
            "time": datetime.datetime.utcfromtimestamp(epoch_time).isoformat() + "Z"
        }

        artifact = {
            "container_id": CONTAINER_ID,
            "label": "events",
            "name": f"ddos_logs",
            "cef": cef
        }

        r = requests.post(f"{URL}/rest/artifact", headers=headers, json=artifact, verify=False)
        print(i, r.status_code, r.text)
