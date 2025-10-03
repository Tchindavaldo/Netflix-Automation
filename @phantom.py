@phantom.playbook_block()
def code_1(action=None, success=None, container=None, results=None,
handle=None, filtered_artifacts=None, filtered_results=None, custom_function=None, loop_state_json=None, **kwargs):
    phantom.debug("code_1() called")

    ################################################################################
    ## Custom Code Start
    ################################################################################

    import subprocess
    import time
    import json
    from collections import defaultdict
    from datetime import datetime
    import ipaddress

    # Liste des IP à ne jamais bloquer
    whitelist_ips = ["127.0.0.1", "localhost", "192.168.8.102"]

    # Cache global (clé = IP, valeur = liste de timestamps)
    #ip_hits = defaultdict(list)
    
    #  Charger le cache global depuis Phantom (persistant)
    stored_data = phantom.get_data("ip_hits_cache") or "{}"
    ip_hits = defaultdict(list, json.loads(stored_data))



    # Paramètres de détection
    TIME_WINDOW = 5   # secondes
    THRESHOLD = 10    # nombre de requêtes max

    # Fonction utilitaire pour convertir la date Splunk/CEF en timestamp
    def parse_cef_time(cef_time):
        try:
            # Cas 1: timestamp en ms (ex: 1725433562000)
            if str(cef_time).isdigit():
                return int(cef_time) 
            # Cas 2: format ISO8601 ou similaire
            return int(datetime.fromisoformat(cef_time).timestamp())
        except Exception:
            return int(time.time())
        

        #  Assure-toi que la chaîne DDOS_BLOCK existe
    try:
        subprocess.run(["sudo", "iptables", "-L", "DDOS_BLOCK"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError:
        phantom.debug("Chaîne DDOS_BLOCK inexistante, création...")
        subprocess.run(["sudo", "iptables", "-N", "DDOS_BLOCK"], check=True)
        subprocess.run(["sudo", "iptables", "-I", "INPUT", "-j", "DDOS_BLOCK"], check=True)

    
    try:
        subprocess.run(["sudo", "ip6tables", "-L", "DDOS_BLOCK"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError:
        phantom.debug("Chaîne DDOS_BLOCK IPv6 inexistante, création...")
        subprocess.run(["sudo", "ip6tables", "-N", "DDOS_BLOCK"], check=True)
        subprocess.run(["sudo", "ip6tables", "-I", "INPUT", "-j", "DDOS_BLOCK"], check=True)


    #  Récupération des artifacts
    #artifacts = phantom.get_artifacts(container=container, artifact_label="*")
    artifacts = phantom.get_artifacts(container=container, artifact_label="*")
    if not artifacts:
        phantom.debug("Aucun artifact trouvé.")
        return

    for art in artifacts:
        cef = art.get("cef", {})
        #phantom.debug(f"CEF artifact brut: {cef}")


        src_ip = cef.get("src_ip_cef") 
        cef_time = cef.get("_indextime")

        if not src_ip or not cef_time:
            continue
            
        # Normalisation IP
        try:
            ip_obj = ipaddress.ip_address(src_ip)
            src_ip = str(ip_obj)
        except ValueError:
            phantom.debug(f"IP invalide ignorée : {src_ip}")
            continue

        # Conversion en timestamp
        event_time = parse_cef_time(cef_time)

        # Ajout du timestamp pour cette IP
        ip_hits[src_ip].append(event_time)

        # Nettoyage: ne garder que les hits dans la fenêtre
        
        ip_hits[src_ip] = [t for t in ip_hits[src_ip] if event_time - t <= TIME_WINDOW]

        phantom.debug(f"Hits pour {src_ip} dans {TIME_WINDOW}s: {ip_hits[src_ip]}")


        # Vérification du seuil
        if len(ip_hits[src_ip]) >= THRESHOLD and src_ip not in whitelist_ips:
            phantom.debug(f"⚠ IP suspecte {src_ip}, {len(ip_hits[src_ip])} reqs en {TIME_WINDOW}s → blocage")
            # Déterminer si c'est IPv4 ou IPv6 pour bloquer
            if ":" in src_ip:  # IPv6
                cmd_check = ["sudo", "ip6tables", "-C", "DDOS_BLOCK", "-s", src_ip, "-j", "DROP"]
                cmd_add   = ["sudo", "ip6tables", "-A", "DDOS_BLOCK", "-s", src_ip, "-j", "DROP"]
            else:  # IPv4
                cmd_check = ["sudo", "iptables", "-C", "DDOS_BLOCK", "-s", src_ip, "-j", "DROP"]
                cmd_add   = ["sudo", "iptables", "-A", "DDOS_BLOCK", "-s", src_ip, "-j", "DROP"]

            
            try:
                subprocess.run(cmd_check, check=True)
                phantom.debug(f"IP {src_ip} déjà bloquée.")
            except subprocess.CalledProcessError:
                subprocess.run(cmd_add, check=True)
                phantom.debug(f"IP {src_ip} bloquée.")
                email_params = [{        
                    "to": "tchindatchenetsuvaldoblair@gmail.com",
                    "subject": f"IP suspecte détectée : {src_ip}",
                    "body": f"L'IP {src_ip} a dépassé {len(ip_hits[src_ip])} requêtes en {TIME_WINDOW}s"
                }]
                phantom.act("send email", parameters= email_params, assets=["smtp_gmail"])
                
                
    #  Sauvegarder l’état mis à jour dans Phantom
    phantom.save_data(json.dumps(ip_hits), "ip_hits_cache")

    ################################################################################
    ## Custom Code End
    ################################################################################

    return